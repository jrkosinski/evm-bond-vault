const { expect } = require("chai");
const { ethers } = require("hardhat");
const constants = require("../util/constants");
const deploy = require("../util/deploy");
const { expectRevert, expectEvent } = require("../util/testUtils");
const { grantRole, getSecurityManager } = require("../util/securityHelper"); 

describe(constants.VAULT_CONTRACT_ID + ": Deposit", function () {
    let vaultToken, vault, baseToken;       //contracts
    let owner, depositor, recipient; 	//accounts

    beforeEach(async function () {
        [owner, depositor, recipient, ...addrs] = await ethers.getSigners();

        //contracts
        [vaultToken, vault, baseToken] = await deploy.deployAll(false);

        //give users 1000 baseToken each 
        await baseToken.mint(depositor.address, 1000);

        //add a bunch of vaultToken to the vault 
        vaultToken.mint(vault.address, 1000000000);
    });

    describe("Deposit", function () {
        it("successful deposit", async function () {
            const amount = constants.DEFAULT_MIN_DEPOSIT;

            //get all balances before 
            const depositor_baseToken_1 = parseInt(await baseToken.balanceOf(depositor.address));
            const vault_baseToken_1 = parseInt(await baseToken.balanceOf(vault.address));
            const vault_vaultToken_1 = parseInt(await vaultToken.balanceOf(vault.address));
            const depositor_vaultToken_1 = parseInt(await vaultToken.balanceOf(depositor.address));

            //deposit 
            await baseToken.connect(depositor).approve(vault.address, amount);
            await vault.connect(depositor).deposit(amount);

            //get all balances after 
            const depositor_baseToken_2 = parseInt(await baseToken.balanceOf(depositor.address));
            const vault_baseToken_2 = parseInt(await baseToken.balanceOf(vault.address));
            const vault_vaultToken_2 = parseInt(await vaultToken.balanceOf(vault.address));
            const depositor_vaultToken_2 = parseInt(await vaultToken.balanceOf(depositor.address));

            //depositor lost [amount] base token
            expect(depositor_baseToken_2).to.equal(depositor_baseToken_1 - amount);

            //vault gained [amount] base token
            expect(vault_baseToken_2).to.equal(vault_baseToken_1 + amount);

            //vault lost [amount] vault token
            expect(vault_vaultToken_2).to.equal(vault_vaultToken_1 - amount);

            //depositor gained [amount] vault token
            expect(depositor_vaultToken_2).to.equal(depositor_vaultToken_1 + amount);
        });

        it("can't deposit when vault is not in correct phase", async function () {
            const amount = constants.DEFAULT_MIN_DEPOSIT;

            //set vault into locked phase 
            await vault.progressToNextPhase({ vaultToken: 1, baseToken: 1 });

            await expectRevert(
                () => vault.connect(depositor).deposit(amount),
                constants.errorMessages.VAULT_OUT_OF_PHASE
            );
        });

        it("can't deposit without approving vault first", async function () {
            const amount = constants.DEFAULT_MIN_DEPOSIT;

            await expectRevert(
                () => vault.connect(depositor).deposit(amount),
                constants.errorMessages.INSUFFICIENT_ALLOWANCE
            );
        });

        it("can deposit even if vault doesn't have enough vault token to cover", async function () {
            const supplyBefore = parseInt(await vaultToken.totalSupply());

            //make sure depositor has enough base token 
            await baseToken.mint(depositor.address, supplyBefore + 1);

            //give depositor alot of base token 
            const vaultBalanceBefore = parseInt(await vaultToken.balanceOf(vault.address));
            await baseToken.mint(depositor.address, vaultBalanceBefore * 2);

            //now try to deposit more than the vault can afford
            const depositAmount = vaultBalanceBefore + 1;
            await baseToken.connect(depositor).approve(vault.address, depositAmount);

            //deposit 
            await vault.connect(depositor).deposit(depositAmount);

            //vault will mint more to cover the deposit 
            expect(await vaultToken.totalSupply()).to.equal(supplyBefore + (depositAmount - vaultBalanceBefore));
        });

        it("cannot deposit zero amount", async function () {

            //deposit 
            await expectRevert(
                () => vault.connect(depositor).deposit(0),
                constants.errorMessages.ZERO_AMOUNT_ARGUMENT
            );
        });

        describe("Minimum Deposit", function () {
            it("cannot deposit below preset minimum", async function () {
                const minimum = parseInt(await vault.minimumDeposit());

                await baseToken.connect(depositor).approve(vault.address, minimum * 3);

                //cannot deposit 1
                await expectRevert(
                    () => vault.connect(depositor).deposit(1),
                    constants.errorMessages.VAULT_DEPOSIT_BELOW_MINIMUM
                );

                //cannot deposit 1/2 of minimum
                await expectRevert(
                    () => vault.connect(depositor).deposit(minimum / 2),
                    constants.errorMessages.VAULT_DEPOSIT_BELOW_MINIMUM
                );

                //cannot deposit 1 less than minimum 
                await expectRevert(
                    () => vault.connect(depositor).deposit(minimum - 1),
                    constants.errorMessages.VAULT_DEPOSIT_BELOW_MINIMUM
                );

                //can deposit mimimum 
                await expect(vault.connect(depositor).deposit(minimum)).to.not.be.reverted;

                //can deposit mimimum +1
                await expect(vault.connect(depositor).deposit(minimum + 1)).to.not.be.reverted;
            });

            it("can change the minimum", async function () {
                const minimum = parseInt(await vault.minimumDeposit());
                const newMinimum = minimum + 1;

                await baseToken.connect(depositor).approve(vault.address, minimum * 2);

                //set new minimum 
                await vault.setMinimumDeposit(newMinimum);

                //cannot deposit 1 less than minimum 
                await expectRevert(
                    () => vault.connect(depositor).deposit(newMinimum - 1),
                    constants.errorMessages.VAULT_DEPOSIT_BELOW_MINIMUM
                );

                //can deposit mimimum 
                await expect(vault.connect(depositor).deposit(newMinimum)).to.not.be.reverted;
            });

            it("minimum can be zero", async function () {
                await vault.setMinimumDeposit(0);

                await baseToken.connect(depositor).approve(vault.address, 1_000_000);

                //can deposit min +1 
                await expect(vault.connect(depositor).deposit(1)).to.not.be.reverted;

                //still can't deposit 0
                await expectRevert(
                    () => vault.connect(depositor).deposit(0),
                    constants.errorMessages.ZERO_AMOUNT_ARGUMENT
                );
            });
        });

        describe("Allowances", function() {
            it("depositing removes allowance", async function () {
                const amount = constants.DEFAULT_MIN_DEPOSIT;

                //deposit 
                await baseToken.connect(depositor).approve(vault.address, amount);
                
                //get allowance before 
                const allowanceBefore = parseInt(await baseToken.allowance(depositor.address, vault.address));
                expect(allowanceBefore).to.equal(amount)
                
                await vault.connect(depositor).deposit(amount);

                //get allowance after 
                const allowanceAfter = parseInt(await baseToken.allowance(depositor.address, vault.address));
                expect(allowanceAfter).to.equal(0);
            });
            
            it("depositing reduces allowance", async function () {
                const amount = constants.DEFAULT_MIN_DEPOSIT * 2;

                //deposit 
                await baseToken.connect(depositor).approve(vault.address, amount);

                //get allowance before 
                const allowanceBefore = parseInt(await baseToken.allowance(depositor.address, vault.address));
                expect(allowanceBefore).to.equal(amount)

                await vault.connect(depositor).deposit(amount/2);

                //get allowance after 
                const allowanceAfter = parseInt(await baseToken.allowance(depositor.address, vault.address));
                expect(allowanceAfter).to.equal(amount/2);
            });

            it("cannot deposit more than allowance", async function () {
                const amount = constants.DEFAULT_MIN_DEPOSIT;

                //approve  
                await baseToken.connect(depositor).approve(vault.address, amount);

                
                await expectRevert(
                    () => vault.connect(depositor).deposit(amount +1),
                    constants.errorMessages.INSUFFICIENT_ALLOWANCE
                ); 
            }); 
        });

        describe("Events", function () {
            it("Deposit event fires on deposit", async () => {
                await vault.progressToNextPhase(constants.exchangeRates.ONE_PERCENT); //locked
                await vault.progressToNextPhase(constants.exchangeRates.ONE_PERCENT); //withdraw
                await vault.progressToNextPhase(constants.exchangeRates.TEN_PERCENT); //deposit

                const amountIn = 100;
                const expectedAmountOut = amountIn - (amountIn / 10);

                await baseToken.connect(depositor).approve(vault.address, amountIn);

                await expectEvent(() => vault.connect(depositor).deposit(amountIn),
                    "Deposit", [depositor.address, depositor.address, amountIn, expectedAmountOut]);
            });
        });
    });

    describe("DepositFor", function () {
        
        beforeEach(async function () {
            //depositFor requires role 
            const securityManager = await getSecurityManager(vaultToken);
            await securityManager.grantRole(constants.roles.DEPOSIT_MANAGER, depositor.address); 
        })

        it("successful deposit", async function () {
            const amount = constants.DEFAULT_MIN_DEPOSIT;
            
            //get all balances before 
            const depositor_baseToken_1 = parseInt(await baseToken.balanceOf(depositor.address));
            const vault_baseToken_1 = parseInt(await baseToken.balanceOf(vault.address));
            const vault_vaultToken_1 = parseInt(await vaultToken.balanceOf(vault.address));
            const depositor_vaultToken_1 = parseInt(await vaultToken.balanceOf(depositor.address));
            const recipient_vaultToken_1 = parseInt(await vaultToken.balanceOf(recipient.address));

            //deposit 
            await baseToken.connect(depositor).approve(vault.address, amount);
            await vault.connect(depositor).depositFor(amount, recipient.address);

            //get all balances after 
            const depositor_baseToken_2 = parseInt(await baseToken.balanceOf(depositor.address));
            const vault_baseToken_2 = parseInt(await baseToken.balanceOf(vault.address));
            const vault_vaultToken_2 = parseInt(await vaultToken.balanceOf(vault.address));
            const depositor_vaultToken_2 = parseInt(await vaultToken.balanceOf(depositor.address));
            const recipient_vaultToken_2 = parseInt(await vaultToken.balanceOf(recipient.address));

            //depositor lost [amount] base token
            expect(depositor_baseToken_2).to.equal(depositor_baseToken_1 - amount);

            //vault gained [amount] base token
            expect(vault_baseToken_2).to.equal(vault_baseToken_1 + amount);

            //vault lost [amount] vault token
            expect(vault_vaultToken_2).to.equal(vault_vaultToken_1 - amount);

            //depositor gained [amount] vault token
            expect(recipient_vaultToken_2).to.equal(recipient_vaultToken_1 + amount);
            
            //depositor's vaultToken is unchanged 
            expect(depositor_vaultToken_1).to.equal(depositor_vaultToken_2); 
        });

        it("can't deposit when vault is not in correct phase", async function () {
            const amount = constants.DEFAULT_MIN_DEPOSIT;

            //set vault into locked phase 
            await vault.progressToNextPhase({ vaultToken: 1, baseToken: 1 });

            await expectRevert(
                () => vault.connect(depositor).depositFor(amount, recipient.address),
                constants.errorMessages.VAULT_OUT_OF_PHASE
            );
        });

        it("can deposit even if vault doesn't have enough vault token to cover", async function () {
            const supplyBefore = parseInt(await vaultToken.totalSupply());

            //make sure depositor has enough base token 
            await baseToken.mint(depositor.address, supplyBefore + 1);

            //give depositor alot of base token 
            const vaultBalanceBefore = parseInt(await vaultToken.balanceOf(vault.address));
            await baseToken.mint(depositor.address, vaultBalanceBefore * 2);

            //now try to deposit more than the vault can afford
            const depositAmount = vaultBalanceBefore + 1;
            await baseToken.connect(depositor).approve(vault.address, depositAmount);

            //deposit 
            await vault.connect(depositor).depositFor(depositAmount, recipient.address);

            //vault will mint more to cover the deposit 
            expect(await vaultToken.totalSupply()).to.equal(supplyBefore + (depositAmount - vaultBalanceBefore));
        });

        it("cannot deposit zero amount", async function () {

            //deposit 
            await expectRevert(
                () => vault.connect(depositor).depositFor(0, recipient.address),
                constants.errorMessages.ZERO_AMOUNT_ARGUMENT
            );
        });

        it("cannot deposit on behalf of vault", async function () {
            await baseToken.connect(depositor).approve(vault.address, 100);
            await expectRevert(
                () => vault.connect(depositor).depositFor(100, vault.address), 
                constants.errorMessages.VAULT_OUT_OF_PHASE
            ); 
        });

        describe("Minimum Deposit", function () {
            it("cannot deposit below preset minimum", async function () {
                const minimum = parseInt(await vault.minimumDeposit());

                await baseToken.connect(depositor).approve(vault.address, minimum * 3);

                //cannot deposit 1
                await expectRevert(
                    () => vault.connect(depositor).depositFor(1, recipient.address),
                    constants.errorMessages.VAULT_DEPOSIT_BELOW_MINIMUM
                );

                //cannot deposit 1/2 of minimum
                await expectRevert(
                    () => vault.connect(depositor).depositFor(minimum / 2, recipient.address),
                    constants.errorMessages.VAULT_DEPOSIT_BELOW_MINIMUM
                );

                //cannot deposit 1 less than minimum 
                await expectRevert(
                    () => vault.connect(depositor).depositFor(minimum - 1, recipient.address),
                    constants.errorMessages.VAULT_DEPOSIT_BELOW_MINIMUM
                );

                //can deposit mimimum 
                await expect(vault.connect(depositor).depositFor(minimum, recipient.address)).to.not.be.reverted;

                //can deposit mimimum +1
                await expect(vault.connect(depositor).depositFor(minimum + 1, recipient.address)).to.not.be.reverted;
            });

            it("can change the minimum", async function () {
                const minimum = parseInt(await vault.minimumDeposit());
                const newMinimum = minimum + 1;

                await baseToken.connect(depositor).approve(vault.address, minimum * 2);

                //set new minimum 
                await vault.setMinimumDeposit(newMinimum);

                //cannot deposit 1 less than minimum 
                await expectRevert(
                    () => vault.connect(depositor).depositFor(newMinimum - 1, recipient.address),
                    constants.errorMessages.VAULT_DEPOSIT_BELOW_MINIMUM
                );

                //can deposit mimimum 
                await expect(vault.connect(depositor).deposit(newMinimum)).to.not.be.reverted;
            });

            it("minimum can be zero", async function () {
                await vault.setMinimumDeposit(0);

                await baseToken.connect(depositor).approve(vault.address, 1_000_000);

                //can deposit min +1 
                await expect(vault.connect(depositor).depositFor(1, recipient.address)).to.not.be.reverted;

                //still can't deposit 0
                await expectRevert(
                    () => vault.connect(depositor).depositFor(0, recipient.address),
                    constants.errorMessages.ZERO_AMOUNT_ARGUMENT
                );
            });
        });

        describe("Events", function () {
            it("Deposit event fires on depositFor", async () => {

                await vault.progressToNextPhase(constants.exchangeRates.ONE_PERCENT); //locked
                await vault.progressToNextPhase(constants.exchangeRates.ONE_PERCENT); //withdraw
                await vault.progressToNextPhase(constants.exchangeRates.TEN_PERCENT); //deposit

                const amountIn = 100;
                const expectedAmountOut = amountIn - (amountIn / 10);

                await baseToken.connect(depositor).approve(vault.address, amountIn);

                await expectEvent(() => vault.connect(depositor).depositFor(amountIn, recipient.address),
                    "Deposit", [recipient.address, depositor.address, amountIn, expectedAmountOut]);
            });
        });
    });
});