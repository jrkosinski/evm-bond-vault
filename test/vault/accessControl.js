const { expect } = require("chai");
const { ethers } = require("hardhat");
const constants = require("../util/constants");
const deploy = require("../util/deploy");
const { expectRevert, expectEvent } = require("../util/testUtils");
const { grantRole, renounceRole, hasRole, revokeRole } = require("../util/securityHelper"); 

describe(constants.VAULT_CONTRACT_ID + ": Access Control", function () {
    let vault, vaultToken, baseToken;		                                        //contracts
    let admin, lcManager, pauser, generalManager, addr1, addr2; 	//accounts

    beforeEach(async function () {
        [admin, lcManager, pauser, generalManager, addr1, addr2, ...addrs] = await ethers.getSigners();

        //contract
        [vaultToken, vault, baseToken] = await deploy.deployAll(false);

        await baseToken.mint(admin.address, 1_000_000_000); 
        await baseToken.mint(lcManager.address, 1_000_000_000);
        await baseToken.mint(pauser.address, 1_000_000_000);
        await baseToken.mint(generalManager.address, 1_000_000_000); 
        await baseToken.mint(addr1.address, 1_000_000_000);
        await baseToken.mint(addr2.address, 1_000_000_000);
        await baseToken.mint(vault.address, 1_000_000_000);

        await grantRole(vault, constants.roles.LIFECYCLE_MANAGER, lcManager.address);
        await grantRole(vault, constants.roles.PAUSER, pauser.address);
        await grantRole(vault, constants.roles.GENERAL_MANAGER, generalManager.address);
    });

    async function assertCan(func) {
        await expect(
            func()
        ).to.not.be.reverted;
    }

    async function assertCannot(func, expectedError) {
        await expectRevert(
            () => func(),
            expectedError
        );
    }

    async function assertGrantRolePermission(account, role, expectAllowed = true) {
        const func = async () => { await grantRole(vault, role, addr1.address, account); }
        if (expectAllowed)
            await assertCan(func);
        else
            await assertCannot(
                func, 
                constants.errorMessages.ACCESS_CONTROL
            );
    }


    describe("Changing Admin Role", function () {

        it("admin can revoke adminship and grant to another", async function () {
            const newAdmin = addr2;
            const oldAdmin = admin;

            await assertGrantRolePermission(newAdmin, constants.roles.TOKEN_MINTER, false);
            await assertGrantRolePermission(oldAdmin, constants.roles.TOKEN_MINTER, true);

            await grantRole(vault, constants.roles.ADMIN, newAdmin.address, admin);
            expect(await hasRole(vault, constants.roles.ADMIN, oldAdmin.address)).to.be.true;
            expect(await hasRole(vault, constants.roles.ADMIN, newAdmin.address)).to.be.true;

            await revokeRole(vault, constants.roles.ADMIN, oldAdmin.address, newAdmin);

            await assertGrantRolePermission(newAdmin, constants.roles.TOKEN_MINTER, true);
            await assertGrantRolePermission(oldAdmin, constants.roles.TOKEN_MINTER, false);
        });
    });
});