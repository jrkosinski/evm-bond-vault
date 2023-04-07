const { expect } = require("chai");
const { ethers } = require("hardhat");
const constants = require("../util/constants");
const deploy = require("../util/deploy");
const { expectRevert, expectEvent } = require("../util/testUtils");

describe(constants.VAULT_CONTRACT_ID + ": Edge Cases", function () {
    let vault, vaultToken, baseToken, whitelist, securityManager;     //contracts
    let owner, depositor, addr2, addr3;                                     //accounts

    beforeEach(async function () {
        [owner, depositor, addr2, addr3, ...addrs] = await ethers.getSigners();
    });

    describe("Base Token Transfer Returns False", function () {

        beforeEach(async function () {
            //contracts
            baseToken = await deploy.deployStableCoin(); 
            vault = await deploy.deployVault(baseToken.address);
            vaultToken = await deploy.getVaultToken(vault); 
            
            await baseToken.mint(vault.address, 1_000_000_000);
            await baseToken.mint(depositor.address, 1_000_000_000);
        });

        it("stabletoken rejects transfer during deposit", async function () {
            const amount = constants.DEFAULT_MIN_DEPOSIT;

            await baseToken.connect(depositor).approve(vault.address, amount);
            baseToken.setTransferFromEnabled(false);

            //deposit 
            await expectRevert(
               () => vault.connect(depositor).deposit(amount),
                constants.errorMessages.VAULT_TOKEN_TRANSFER_FAILED
            );
        });

        it("stabletoken rejects transfer during withdraw", async function () {
            const amount = constants.DEFAULT_MIN_DEPOSIT;

            //deposit 
            await baseToken.connect(depositor).approve(vault.address, amount);
            await vault.connect(depositor).deposit(amount);

            //next phase 
            await vault.progressToNextPhase(constants.exchangeRates.PARITY);
            await vault.progressToNextPhase(constants.exchangeRates.PARITY);

            await vaultToken.connect(depositor).approve(vault.address, amount);
            baseToken.setTransferEnabled(false);

            //withdraw
            await expectRevert(
                () => vault.connect(depositor).withdraw(amount),
                constants.errorMessages.VAULT_TOKEN_TRANSFER_FAILED
            );
        });
    });

    describe("Vault Token Transfer Returns False", function () {

        beforeEach(async function () {
            //contracts
            [vaultToken, vault, baseToken] = await deploy.deployVaultWithTestToken();
            await baseToken.mint(vault.address, 1_000_000_000);
            await baseToken.mint(depositor.address, 1_000_000_000);
        });

        it("vault token rejects transfer during deposit", async function () {
            const amount = constants.DEFAULT_MIN_DEPOSIT;

            await baseToken.connect(depositor).approve(vault.address, amount);
            vaultToken.setTransferEnabled(false);

            //deposit 
            await expectRevert(
                () => vault.connect(depositor).deposit(amount),
                constants.errorMessages.VAULT_TOKEN_TRANSFER_FAILED
            );
        });

        it("vault token rejects transfer during withdraw", async function () {
            const amount = constants.DEFAULT_MIN_DEPOSIT;

            //deposit 
            await baseToken.connect(depositor).approve(vault.address, amount);
            await vault.connect(depositor).deposit(amount);

            //next phase 
            await vault.progressToNextPhase(constants.exchangeRates.PARITY);
            await vault.progressToNextPhase(constants.exchangeRates.PARITY);

            await vaultToken.connect(depositor).approve(vault.address, amount);
            vaultToken.setTransferFromEnabled(false);

            //withdraw
            await expectRevert(
                () => vault.connect(depositor).withdraw(amount),
                constants.errorMessages.VAULT_TOKEN_TRANSFER_FAILED
            );
        });
    });

    describe("Weird Transfers", function () {

        beforeEach(async function () {
            //contracts
            [vaultToken, vault, baseToken, whitelist, securityManager] = await deploy.deployAll(false);
            await baseToken.mint(vault.address, 1_000_000_000);
            await baseToken.mint(depositor.address, 1_000_000_000);
        });

        it("deposit to vault on behalf of vault", async function () {
            const depositAmount = 1000; 
            const approveAmount = depositAmount * 3;
            
            expect(await vault.currentPhase()).to.equal(constants.vaultPhase.DEPOSIT); 
            
            //depositor can call depositFor 
            await securityManager.grantRole(constants.roles.DEPOSIT_MANAGER, depositor.address); 

            //approve more than necessary 
            await baseToken.connect(depositor).approve(vault.address, approveAmount);
            
            //out-of-phase error, because the deposit triggers a withdraw 
            await expectRevert(
                () => vault.connect(depositor).depositFor(depositAmount, vault.address), 
                constants.errorMessages.VAULT_OUT_OF_PHASE
            ); 
        });

        it("deposit to vault on behalf of vault token", async function () {
            const depositAmount = 1000;
            const approveAmount = depositAmount * 3;

            expect(await vault.currentPhase()).to.equal(constants.vaultPhase.DEPOSIT);

            //depositor can call depositFor 
            await securityManager.grantRole(constants.roles.DEPOSIT_MANAGER, depositor.address);
            
            const depositor_baseToken_1 = parseInt(await baseToken.balanceOf(depositor.address)); 
            const vaultToken_vaultToken_1 = parseInt(await vaultToken.balanceOf(vaultToken.address)); 

            //approve more than necessary 
            await baseToken.connect(depositor).approve(vault.address, approveAmount);

            //out-of-phase error, because the deposit triggers a withdraw 
            await vault.connect(depositor).depositFor(depositAmount, vaultToken.address);
            expect(await baseToken.allowance(depositor.address, vault.address)).to.equal(approveAmount - depositAmount); 
            
            console.log();
            expect(await baseToken.balanceOf(depositor.address)).to.equal(depositor_baseToken_1 - depositAmount); 
            expect(await vaultToken.balanceOf(vaultToken.address)).to.equal(vaultToken_vaultToken_1 + depositAmount); 
        });
    });
});