const { expect } = require("chai");
const { ethers } = require("hardhat");
const constants = require("../util/constants");
const deploy = require("../util/deploy");
const { expectRevert, expectEvent } = require("../util/testUtils");

describe(constants.VAULT_CONTRACT_ID + ": Withdraw", function () {
    let vaultToken, vault, baseToken;   //contracts
    let owner, depositor, addr2; 	            //accounts

    beforeEach(async function () {
        [owner, depositor, addr2, ...addrs] = await ethers.getSigners();

        //contracts
        [vaultToken, vault, baseToken] = await deploy.deployAll(false);

        //give users some baseToken
        await baseToken.mint(depositor.address, 1_000_000_000);

        //add a bunch of vaultToken to the vault 
        vaultToken.mint(vault.address, 1_000_000_000);
        baseToken.mint(vault.address, 1_000_000_000);
    });

    async function depositToVault(amount) {
        await baseToken.connect(depositor).approve(vault.address, amount);
        await vault.connect(depositor).deposit(amount);
    }

    describe("Withdraw", function () {
        it("successful withdraw", async function () {
            const depositAmount = constants.DEFAULT_MIN_DEPOSIT;

            //deposit 
            await depositToVault(depositAmount);

            //get all balances before 
            const depositor_baseToken_1 = parseInt(await baseToken.balanceOf(depositor.address));
            const vault_baseToken_1 = parseInt(await baseToken.balanceOf(vault.address));
            const vault_vaultToken_1 = parseInt(await vaultToken.balanceOf(vault.address));
            const depositor_vaultToken_1 = parseInt(await vaultToken.balanceOf(depositor.address));

            await vault.progressToNextPhase(constants.exchangeRates.PARITY); //locked
            await vault.progressToNextPhase(constants.exchangeRates.PARITY); //withdraw

            //withdraw
            const withdrawAmount = depositAmount;
            await vaultToken.connect(depositor).approve(vault.address, withdrawAmount);
            await vault.connect(depositor).withdraw(withdrawAmount);

            //get all balances after 
            const depositor_baseToken_2 = parseInt(await baseToken.balanceOf(depositor.address));
            const vault_baseToken_2 = parseInt(await baseToken.balanceOf(vault.address));
            const vault_vaultToken_2 = parseInt(await vaultToken.balanceOf(vault.address));
            const depositor_vaultToken_2 = parseInt(await vaultToken.balanceOf(depositor.address));

            expect(depositor_baseToken_2).to.equal(depositor_baseToken_1 + withdrawAmount);
            expect(depositor_vaultToken_2).to.equal(depositor_vaultToken_1 - withdrawAmount);
            expect(vault_baseToken_2).to.equal(vault_baseToken_1 - withdrawAmount);
            expect(vault_vaultToken_2).to.equal(vault_vaultToken_1 + withdrawAmount);
        });

        it("can't withdraw without approving vault first", async function () {
            const amount = constants.DEFAULT_MIN_DEPOSIT;

            //deposit 
            await depositToVault(amount);

            await vault.progressToNextPhase(constants.exchangeRates.PARITY); //locked
            await vault.progressToNextPhase(constants.exchangeRates.PARITY); //withdraw

            await expectRevert(
                () => vault.connect(depositor).withdraw(amount),
                constants.errorMessages.INSUFFICIENT_ALLOWANCE
            );
        });

        it("can't withdraw if vault doesn't have enough base token", async function () {

            const depositAmount = (await baseToken.balanceOf(depositor.address));
            const withdrawAmount = (await baseToken.balanceOf(vault.address));
            await vaultToken.mint(depositor.address, withdrawAmount);

            //deposit first 
            await depositToVault(depositAmount);

            //mint some extra vaultToken to user
            await vaultToken.mint(depositor.address, 100);

            await vault.progressToNextPhase(constants.exchangeRates.PARITY); //locked
            await vault.progressToNextPhase({ vaultToken: 1, baseToken: 4 }); //withdraw

            //approve 
            await vaultToken.connect(depositor).approve(vault.address, withdrawAmount);

            await expectRevert(
                () => vault.connect(depositor).withdraw(withdrawAmount),
                constants.errorMessages.TRANSFER_EXCEEDS_BALANCE
            );
        });

        it("can't withdraw zero amount", async function () {

            const depositAmount = (await baseToken.balanceOf(depositor.address));
            const withdrawAmount = 0;

            //deposit first 
            await depositToVault(depositAmount);

            await vault.progressToNextPhase(constants.exchangeRates.PARITY); //locked
            await vault.progressToNextPhase({ vaultToken: 1, baseToken: 4 }); //withdraw

            await expectRevert(
                () => vault.connect(depositor).withdraw(withdrawAmount),
                constants.errorMessages.ZERO_AMOUNT_ARGUMENT
            );
        });

        it("can't withdraw more than balance", async function () {
            const depositAmount = constants.DEFAULT_MIN_DEPOSIT;

            //deposit first 
            await depositToVault(depositAmount);

            const withdrawAmount = (await vaultToken.balanceOf(depositor.address)) + 1;

            await vault.progressToNextPhase(constants.exchangeRates.PARITY); //locked
            await vault.progressToNextPhase({ vaultToken: 1, baseToken: 4 }); //withdraw

            await vaultToken.connect(depositor).approve(vault.address, withdrawAmount);

            await expectRevert(
                () => vault.connect(depositor).withdraw(withdrawAmount),
                constants.errorMessages.TRANSFER_EXCEEDS_BALANCE
            );
        });

        describe("Allowances", function () {
            it("withdrawing removes allowance", async function () {
                const amount = constants.DEFAULT_MIN_DEPOSIT;
                await depositToVault(amount);

                await vault.progressToNextPhase(constants.exchangeRates.PARITY); //locked
                await vault.progressToNextPhase(constants.exchangeRates.PARITY); //withdraw

                //deposit 
                await vaultToken.connect(depositor).approve(vault.address, amount);

                //get allowance before 
                const allowanceBefore = parseInt(await vaultToken.allowance(depositor.address, vault.address));
                expect(allowanceBefore).to.equal(amount)

                await vault.connect(depositor).withdraw(amount);

                //get allowance after 
                const allowanceAfter = parseInt(await vaultToken.allowance(depositor.address, vault.address));
                expect(allowanceAfter).to.equal(0);
            });

            it("withdrawing reduces allowance", async function () {
                const amount = constants.DEFAULT_MIN_DEPOSIT * 2;
                await depositToVault(amount);

                await vault.progressToNextPhase(constants.exchangeRates.PARITY); //locked
                await vault.progressToNextPhase(constants.exchangeRates.PARITY); //withdraw

                //deposit 
                await vaultToken.connect(depositor).approve(vault.address, amount);

                //get allowance before 
                const allowanceBefore = parseInt(await vaultToken.allowance(depositor.address, vault.address));
                expect(allowanceBefore).to.equal(amount)

                await vault.connect(depositor).withdraw(amount / 2);

                //get allowance after 
                const allowanceAfter = parseInt(await vaultToken.allowance(depositor.address, vault.address));
                expect(allowanceAfter).to.equal(amount / 2);
            });

            it("cannot withdrawing more than allowance", async function () {
                const amount = constants.DEFAULT_MIN_DEPOSIT;
                await depositToVault(amount);

                await vault.progressToNextPhase(constants.exchangeRates.PARITY); //locked
                await vault.progressToNextPhase(constants.exchangeRates.PARITY); //withdraw

                //approve  
                await vaultToken.connect(depositor).approve(vault.address, amount);

                await expectRevert(
                    () => vault.connect(depositor).withdraw(amount + 1),
                    constants.errorMessages.INSUFFICIENT_ALLOWANCE
                );
            });
        }); 
    });

    describe("Events", function () {
        it("Withdraw event fires on withdraw", async () => {
            const amountIn = constants.DEFAULT_MIN_DEPOSIT;;
            const expectedAmountOut = amountIn + (amountIn / 10);  //10% 

            //deposit first
            await depositToVault(amountIn);

            //approve
            await vaultToken.connect(depositor).approve(vault.address, amountIn);

            await vault.progressToNextPhase(constants.exchangeRates.TEN_PERCENT); //locked
            await vault.progressToNextPhase(constants.exchangeRates.TEN_PERCENT); //withdraw

            await expectEvent(() => vault.connect(depositor).withdraw(amountIn),
                "Withdraw", [depositor.address, amountIn, expectedAmountOut]);
        });
    });
});