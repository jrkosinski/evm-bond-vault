const { expect } = require("chai");
const { ethers } = require("hardhat");
const constants = require("../util/constants");
const deploy = require("../util/deploy");
const { expectRevert, expectEvent } = require("../util/testUtils");

describe(constants.DEPOSIT_VAULT_CONTRACT_ID + ": Constructor", function () {
    let baseToken, vaultToken, vault, depositVault, securityManager;        //contracts
    let owner, addr1, addr2, addr3; 	                                    //accounts

    beforeEach(async function () {
        [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

        //contracts
        [vaultToken, vault, baseToken] = await deploy.deployAll(false);
        
        //security manager 
        securityManager = await ethers.getContractAt(constants.SECURITY_CONTRACT_ID, (await vault.securityManager()));
    });

    describe("Successful Construction", function () {

        it("initial state of deposit vault", async function () {
            const depositVault = await deploy.deployDepositVault(
                vault.address, 
                baseToken.address
            ); 
            
            expect(await depositVault.vault()).to.equal(vault.address);
            expect(await depositVault.securityManager()).to.equal(securityManager.address);
            expect(await depositVault.baseToken()).to.equal(baseToken.address);
        });
    });

    describe("DepositVault Constructor Constraints", function () {

        it("can't pass zero address for base token", async function () {
            await expectRevert(
                () => deploy.deployDepositVault(vault.address, constants.ZERO_ADDRESS),
                constants.errorMessages.ZERO_ADDRESS
            );
        });

        it("can't pass bogus address for base token", async function () {
            await expectRevert(
                () => deploy.deployDepositVault(vault.address, owner.address),
                constants.errorMessages.VAULT_INVALID_TOKEN_CONTRACT(owner.address)
            );
        });

        it("can't pass zero address for vault", async function () {
            await expectRevert(
                () => deploy.deployDepositVault(constants.ZERO_ADDRESS, baseToken.address),
                constants.errorMessages.ZERO_ADDRESS
            );
        });
    });
});