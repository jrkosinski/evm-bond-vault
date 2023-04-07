const { expect } = require("chai");
const { ethers } = require("hardhat");
const constants = require("../util/constants");
const deploy = require("../util/deploy");
const { expectRevert, expectEvent } = require("../util/testUtils");

describe(constants.VAULT_CONTRACT_ID + ": Admin Withdraw", function () {
    let vault, baseToken, vaultToken, whitelist, securityManager, depositVault;     //contracts
    let owner, addr1, addr2, addr3;                                                 //accounts
    const mintAmount = 1_000_000_000;

    beforeEach(async function () {
        [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

        //contract
        [vaultToken, vault, baseToken, whitelist, securityManager] = await deploy.deployAll(false);

        //create deposit vault 
        depositVault = await deploy.deployDepositVault(
            vault.address,
            baseToken.address
        );

        //mint base token to deposit vault 
        await baseToken.mint(vault.address, mintAmount);
        await baseToken.mint(depositVault.address, mintAmount);

        //grant permission to the deposit Vault and caller
        await securityManager.grantRole(constants.roles.DEPOSIT_MANAGER, depositVault.address);
        await securityManager.grantRole(constants.roles.DEPOSIT_MANAGER, owner.address); 
    });

    describe("Deposit Vault Admin Withdraw Behavior", function () {

        it("can withdraw full amount", async function () {
            expect(parseInt(await baseToken.balanceOf(depositVault.address))).to.be.greaterThan(0);
            const initialBalance = parseInt(await baseToken.balanceOf(owner.address));

            //withdraw 
            await depositVault.adminWithdraw(mintAmount);

            expect(parseInt(await baseToken.balanceOf(depositVault.address))).to.equal(0);
            expect(parseInt(await baseToken.balanceOf(owner.address))).to.equal(initialBalance + mintAmount);
        });

        it("can withdraw partial amount", async function () {
            expect(parseInt(await baseToken.balanceOf(depositVault.address))).to.equal(mintAmount);
            const initialBalance = parseInt(await baseToken.balanceOf(owner.address));
            const withdrawAmount = mintAmount / 10;

            //withdraw 
            await depositVault.adminWithdraw(withdrawAmount);

            expect(parseInt(await baseToken.balanceOf(depositVault.address))).to.equal(mintAmount - withdrawAmount);
            expect(parseInt(await baseToken.balanceOf(owner.address))).to.equal(initialBalance + withdrawAmount);
        });

        it("cannot withdraw if no balance", async function () {

            //get balance to zero 
            await depositVault.adminWithdraw(mintAmount);
            expect(parseInt(await baseToken.balanceOf(depositVault.address))).to.equal(0);

            //try to withdraw again 
            await expectRevert(
                () => depositVault.adminWithdraw(1),
                constants.errorMessages.TRANSFER_EXCEEDS_BALANCE
            );
        });

        it("cannot withdraw more than balance", async function () {
            await expectRevert(
                () => depositVault.adminWithdraw(mintAmount + 1),
                constants.errorMessages.TRANSFER_EXCEEDS_BALANCE
            );
        });
    });
});