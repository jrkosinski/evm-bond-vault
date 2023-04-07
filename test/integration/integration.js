const { expect } = require("chai");
const { ethers } = require("hardhat");
const constants = require("../util/constants");
const exchangeRates = constants.exchangeRates;
const deploy = require("../util/deploy");
const { expectRevert, expectEvent } = require("../util/testUtils");
const { compound, compoundRepeat, xPercentOfy } = require("../util/mathUtils");
const { TestVault, TestVaultUser } = require("../util/testFixtures");

describe("Integration", function () {
    let vaultToken, vault, baseToken;   //contracts
    let owner, addr1, addr2, addr3; 	//accounts
    const mintAmount = 1_000_000; 

    beforeEach(async function () {
        [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

        //contract
        [vaultToken, vault, baseToken] = await deploy.deployAll(false);

        await baseToken.mint(addr1.address, mintAmount);
        await baseToken.mint(addr2.address, mintAmount);
        await baseToken.mint(addr3.address, mintAmount); 
        await baseToken.mint(vault.address, mintAmount); 
    });
    
    describe("With Normal Transfer", function () {
        describe("Simple Deposit/Withdraw", function () {
            /**
             * PURPOSE: verify that  multiple users can deposit in one round, and that the balances of VT and ST 
             * for users and vault are correct after deposit. 
             * 
             * SCENARIO: multiple deposit 
             * - DEPOSIT: multiple users deposit USDC into a vault 
             * 
             * TESTS: 
             * - VT/ST balances of users are correct
             * - VT/ST balances of vault are correct 
             */
            it("multiple users deposit", async function () {

                //create test fixture, add 3 users 
                const testVault = new TestVault(vault, vaultToken, baseToken);
                testVault.addUser(addr1);
                testVault.addUser(addr2);
                testVault.addUser(addr3);
                await testVault.init();

                //deposit to vault (each user different amount) 
                const depositAmounts = [1000, 45000, 90000];
                await testVault.usersDeposit(depositAmounts);

                //check new token balances for each user 
                /*testVault.users.forEach(async (u, i) => {
                    expect(await u.vaultTokenBalance()).to.equal(u.depositAmount());
                    expect(await u.baseTokenBalance()).to.equal(mintAmount - u.depositAmount());
                });

                //check vault balance 
                const sum = testVault.sumOfDeposits;
                expect(await testVault.vaultTokenBalance()).to.equal(testVault.initialVaultTokenBalance);
                expect(await testVault.baseTokenBalance()).to.equal(testVault.initialBaseTokenBalance + sum);
                expect(await testVault.baseTokenBalance()).to.equal(testVault.expectedBaseTokenBalance);*/
            });

            /**
             * PURPOSE: verify that multiple users can deposit in one round, and fully withdraw in the next round, 
             * and that the balances of VT and ST for users and vault are correct after the withdraw. 
             * 
             * SCENARIO: multiple deposit + withdraw for gain 
             * - DEPOSIT: multiple users deposit USDC into a vault 
             * - WITHDRAW: users withdraw all deposited ST 
             * 
             * TESTS: 
             * - users' withdrawn amounts of ST are correct 
             * - users end up with correct amount of profit 
             * - balances of VT and ST in vault are correct after deposits/withdrawals
             */
            it("multiple users deposit and withdraw + 10% gain", async function () {

                //create test fixture, add three users 
                const testVault = new TestVault(vault, vaultToken, baseToken);
                testVault.addUser(addr1);
                testVault.addUser(addr2);
                testVault.addUser(addr3);
                await testVault.init();

                //deposit to vault (each user different amount)
                const depositAmounts = [1200, 45010, 33330];
                await testVault.usersDeposit(depositAmounts);

                //set the phase to locked 
                await testVault.nextPhase(exchangeRates.ONE_PERCENT);

                //assert that no one can deposit or withdraw
                await expectRevert(
                    () => testVault.users[0].withdraw(1),
                    constants.errorMessages.VAULT_OUT_OF_PHASE
                );

                //set the phase to withdraw (at 10%)
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_PERCENT);

                //each user withdraws
                await testVault.usersWithdrawAll();

                //make sure that each user gained 10%
                testVault.users.forEach(async (u, i) => {
                    expect(await u.realizedProfitPct()).to.equal(1);
                    expect(await u.vaultTokenBalance()).to.equal(0);
                });

                //make sure that vault balances are correct 
                const sumOfDeposits = testVault.sumOfDeposits;
                const sumOfProfits = await testVault.sumOfProfits();
                expect(await testVault.baseTokenBalance()).to.equal(testVault.initialBaseTokenBalance - sumOfProfits);
                expect(await testVault.vaultTokenBalance()).to.equal(sumOfDeposits);
                
                expect(await testVault.baseTokenBalance()).to.be.approximately(testVault.expectedBaseTokenBalance, 1);
            });

            /**
             * PURPOSE: verify that multiple users can deposit in one round, and partially (50%) withdraw in the next round, 
             * and that the balances of VT and ST for users and vault are correct after the withdraw. 
             * 
             * SCENARIO
             * - DEPOSIT: multiple users deposit USDC into a vault 
             * - WITHDRAW: at the next Withdraw phase, each user withdraws 1/2 their funds 
             * 
             * TESTS: 
             * - users' withdrawn amounts of ST are correct 
             * - users end up with correct amount of profit 
             * - balances of VT and ST in vault are correct after deposits/withdrawals
             */
            it("multiple users deposit and withdraw + 1% gain, take half profits", async function () {

                //initial balance of 0 vault token 
                expect(await vaultToken.balanceOf(addr1.address)).to.equal(0);
                expect(await vaultToken.balanceOf(addr2.address)).to.equal(0);
                expect(await vaultToken.balanceOf(addr3.address)).to.equal(0);

                //create test fixture with 3 users 
                const testVault = new TestVault(vault, vaultToken, baseToken);
                testVault.addUser(addr1);
                testVault.addUser(addr2);
                testVault.addUser(addr3);
                await testVault.init();

                //deposit all (each user different amount) 
                const depositAmounts = [12000, 44000, 32200];
                await testVault.usersDeposit(depositAmounts);

                //check vault balance of base token 
                expect(await testVault.baseTokenBalance()).to.equal(
                    testVault.initialBaseTokenBalance + testVault.sumOfDeposits
                );

                //set the phase to withdraw (rate 1%)
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_PERCENT);

                //each user withdraw 1/2 of all funds deposited
                for (let u of testVault.users) {
                    await u.withdraw(u.depositAmount / 2);
                }

                //make sure that each user gained 1% on their half takings
                testVault.users.forEach(async (u, i) => {
                    expect(await u.baseTokenBalance()).to.equal(
                        u.initialBaseTokenBalance
                        - (u.depositAmount / 2)
                        + ((u.depositAmount / 2) / 100)
                    );
                });

                const sumOfDeposits = testVault.sumOfDeposits;

                //test vault's vault token balance 
                expect(await testVault.vaultTokenBalance()).to.equal(
                    testVault.initialVaultTokenBalance + (sumOfDeposits / 2)
                );
                
                expect(await testVault.baseTokenBalance()).to.equal(testVault.expectedBaseTokenBalance);
            });
        });

        describe("Rollover", function () {

            /**
             * PURPOSE: verify that if a user deposits, withdraws all, then redeposits their entire stake for one more 
             * round (total of 3 rounds), the result will be that their yield compounds over those 3 rounds.  
             * 
             * SCENARIO: a user withdraws entire stake every round, and immediately redeposits it. 
             * - DEPOSIT: user deposits an amount to the vault 
             * - WITHDRAW: user withdraws 100% of stake at end of round
             * - DEPOSIT: user redeposits entire withdrawn amount 
             * - WITHDRAW: user withdraws 100% of stake at end of round
             * - DEPOSIT: user deposits an amount to the vault 
             * - WITHDRAW: finally, user withdraws all and checks profit
             * 
             * TESTS: 
             * - user's realized profits at end of test should be equal to 1% compounded 3 times 
             */
            it("manual rollover compounding", async function () {
                const principal = 1_000_000;

                //create test fixture
                const testVault = new TestVault(vault, vaultToken, baseToken);
                testVault.addUser(addr1);
                await testVault.init();

                await testVault.user.deposit(principal);

                //user 0 is going to manually rollover every round. 

                //round 1 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_PERCENT);
                await testVault.user.withdrawAll();
                await testVault.nextPhase(); //deposit phase 
                await testVault.user.depositAll();

                //round 2 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_COMP_2);
                await testVault.user.withdrawAll();
                await testVault.nextPhase(); //deposit phase 
                await testVault.user.depositAll();

                //round 3 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_COMP_3);
                await testVault.user.withdrawAll();

                //profit should be 1% compounded x3
                expect(await testVault.user.realizedProfit()).to.equal(compoundRepeat(principal, 100, 3) - principal);
                expect(await testVault.user.realizedProfit()).to.be.approximately(testVault.user.expectedResults.totalProfit, 1);
                expect(await testVault.user.vaultTokenBalance()).to.equal(0);

                //test vault balance
                expect(await testVault.baseTokenBalance()).to.be.approximately(testVault.expectedBaseTokenBalance, 1);
            });

            /**
             * PURPOSE: verify that a user who withdraws their entire amount of profit every round, 
             * will end up with the nominal yield NOT compounded. (e.g., if the  yield is 1% every round, 
             * after 3 rounds of profit-taking, the user will be left with a combined total 3% profit)
             * 
             * SCENARIO: 
             * - DEPOSIT: user deposits an amount P to the vault 
             * - WITHDRAW: user withdraws the amount of yield only, so that their remaining stake is again equal to P 
             * - DEPOSIT: user deposits no additional 
             * - WITHDRAW: user withdraws the amount of yield only, so that their remaining stake is again equal to P 
             * - DEPOSIT: user deposits no additional 
             * - WITHDRAW: user withdraws 100% of stake 
             * 
             * TESTS: 
             * - user's realized profits at end of test should be equal to 3% (1% * 3, not compounded)
             */
            it("no rollover (withdraw all profit every round)", async function () {
                const principal = 1_000_000;

                //create test fixture
                const testVault = new TestVault(vault, vaultToken, baseToken);
                testVault.addUser(addr1);
                await testVault.init();

                //deposit principal 
                await testVault.usersDeposit([principal]);

                //user 0 is going to withdraw all excess profit amount each withdraw round (1%),
                //      leaving only the principal remaining for the next round.

                //round 1;  withdraw 1% 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_PERCENT);
                await testVault.user.withdraw(testVault.convertToVaultToken(await testVault.user.unrealizedProfit()));

                //round 2; withdraw 1% 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_COMP_2);
                await testVault.user.withdraw(testVault.convertToVaultToken(await testVault.user.unrealizedProfit()));

                //round 3
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_COMP_3);

                //withdraw 100% 
                await testVault.user.withdrawAll();

                //profit should be just straight 1% 
                expect(await testVault.user.realizedProfit()).approximately(xPercentOfy(3, principal), 1);

                //test vault balance
                expect(await testVault.baseTokenBalance()).to.be.approximately(testVault.expectedBaseTokenBalance, 3);
            });

            /**
             * PURPOSE: verify that a user performing manual rollover per round (compounding) will exceed the profit of a 
             * user who is withdrawing their profits every round. 
             * 
             * SCENARIO: 
             * - DEPOSIT: user 0 and user 1 both deposit the same amount of principal P 
             * - WITHDRAW: user 1 withdraws the yield only, leaving the principal. user 0 withdraws nothing
             * - DEPOSIT: neither user 0 nor user 1 deposits any additional. 
             * - WITHDRAW: user 1 withdraws the yield only, leaving the principal. user 0 withdraws nothing
             * - DEPOSIT: neither user 0 nor user 1 deposits any additional. 
             * - WITHDRAW: both users withdraw 100% 
             * 
             * TESTS: 
             * - user 0's realized profits are compounded (1% compounded x3) 
             * - user 1's realized profits are not compounded (1% x3, total of 3%) 
             * - user 0's profits exceed user 1's 
             */
            it("manual rollover vs. no rollover", async function () {
                const principal = 1_000_000;

                //create test fixture
                const testVault = new TestVault(vault, vaultToken, baseToken);
                testVault.addUser(addr1);
                testVault.addUser(addr2);
                await testVault.init();

                await testVault.usersDeposit([principal, principal]);

                //user 0 is going to manually rollover every round. 
                //user 1 is going to withdraw all excess profit amount each withdraw round (1%),
                //      leaving only the principal remaining for the next round. 
                // (user 0's profits are compounded, so should exceed user 1's profits)

                //round 1 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_PERCENT);
                await testVault.user0.withdrawAll();
                await testVault.user1.withdraw(testVault.convertToVaultToken(10000));
                await testVault.nextPhase(); //deposit 
                await testVault.user0.depositAll();

                //round 2 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_COMP_2);
                await testVault.user0.withdrawAll();
                await testVault.user1.withdraw(testVault.convertToVaultToken(10000));
                await testVault.nextPhase(); //deposit
                await testVault.user0.depositAll();

                //round 3 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_COMP_3);
                await testVault.user0.withdrawAll();
                await testVault.user1.withdrawAll();

                const user0_profit = await testVault.user0.realizedProfit();
                const user1_profit = await testVault.user1.realizedProfit();

                //profit should be 1% compounded for user0, but just straight 1% for user1 
                expect(await user0_profit).to.equal(compoundRepeat(principal, 100, 3) - principal);
                expect(await testVault.user0.vaultTokenBalance()).to.equal(0);

                expect(await user1_profit).approximately(xPercentOfy(3, principal), 1);
                expect(await testVault.user1.vaultTokenBalance()).to.equal(0);

                //user 0 got more profit 
                expect(user0_profit).to.be.greaterThan(user1_profit);

                //test vault balance
                expect(await testVault.baseTokenBalance()).to.be.approximately(testVault.expectedBaseTokenBalance, 1);
            });

            /**
             * PURPOSE: verify that a user depositing into a vault at the beginning of round 1, and withdrawing all at the end 
             * of round 3 without adding or removing anything in between the deposit and withdraw, will receive the yield of 
             * each round compounded. In this case that would be 1% compounded 3x. 
             * 
             * SCENARIO
             * - DEPOSIT: a user deposits into vault 
             * - WITHDRAW: no withdrawal made
             * - DEPOSIT: no deposit made 
             * - WITHDRAW: no withdrawal made
             * - DEPOSIT: no deposit made 
             * - WITHDRAW: withdraw 100% 
             * 
             * TESTS: 
             * - user's realized profits at end of test should be equal to 1% compounded 3 times 
             */
            it("auto-rollover", async function () {
                const principal = 1_000_000;

                //create test fixture
                const testVault = new TestVault(vault, vaultToken, baseToken);
                testVault.addUser(addr1);
                await testVault.init();

                await testVault.user.deposit(principal);

                //user 0 is going to automatically rollover every round. 

                //round 1 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_PERCENT);
                await testVault.nextPhase();

                //round 2 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_COMP_2);
                await testVault.nextPhase();

                //round 3 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_COMP_3);
                await testVault.user.withdrawAll();

                //profit should be 1% compounded 
                expect(await testVault.user.vaultTokenBalance()).to.equal(0);
                expect(await testVault.user.realizedProfit()).to.equal(compoundRepeat(principal, 100, 3) - principal);

                //test vault balance
                expect(await testVault.baseTokenBalance()).to.be.approximately(testVault.expectedBaseTokenBalance, 1);
            });

            /**
             * PURPOSE: verify that a user doing full auto-rollover for 3 rounds will receive exactly the same results as 
             * a user doing full manual rollover during that same period. 
             * 
             * SCENARIO: 
             * - DEPOSIT: user 0 and user 1 both deposit the same amount of principal 
             * - WITHDRAW: user 1: no withdrawal made
             *      user 0: withdraws 100% 
             * - DEPOSIT: user 1: no deposit made by
             *      user 0: deposits 100% 
             * - WITHDRAW: user 1: no withdrawal made
             *      user 0: withdraws 100% 
             * - DEPOSIT: user 1: no deposit made 
             *      user 0: deposits 100% 
             * - WITHDRAW: both users withdraw 100% 
             * 
             * TESTS: 
             * - both user's realized profits at end of test should be equal to 1% compounded 3 times, and should be 
             * equal to one another. 
             */
            it("manual rollover vs. auto-rollover", async function () {
                const principal = 1_000_000;

                //create test fixture
                const testVault = new TestVault(vault, vaultToken, baseToken);
                testVault.addUser(addr1);
                testVault.addUser(addr2);
                await testVault.init();

                await testVault.usersDeposit([principal, principal]);

                //user 0 is going to manually rollover every round. 
                //user 1 is going to automatically rollover every round. 
                //  (their profits should be exactly the same)

                //round 1 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_PERCENT);
                await testVault.user0.withdrawAll();
                await testVault.nextPhase(); //deposit phase 
                await testVault.user0.depositAll();

                //round 2 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_COMP_2);
                await testVault.user0.withdrawAll();
                await testVault.nextPhase(); //deposit phase 
                await testVault.user0.depositAll();

                //round 3 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_COMP_3);
                await testVault.user0.withdrawAll();
                await testVault.user1.withdrawAll();

                const user0_profit = await testVault.user0.realizedProfit();
                const user1_profit = await testVault.user1.realizedProfit();

                //both users have 0 vault token 
                expect(await testVault.user0.vaultTokenBalance()).to.equal(0);
                expect(await testVault.user1.vaultTokenBalance()).to.equal(0);

                //profit should be 1% compounded 
                expect(await user0_profit).to.equal(compoundRepeat(principal, 100, 3) - principal);
                expect(await user1_profit).to.equal(compoundRepeat(principal, 100, 3) - principal);

                //equal profits and base token amounts 
                expect(await user0_profit).to.equal(user1_profit);
                expect(await testVault.user0.baseTokenBalance()).to.equal(await testVault.user1.baseTokenBalance());

                //test vault balance
                expect(await testVault.baseTokenBalance()).to.be.approximately(testVault.expectedBaseTokenBalance, 1);
            });

            /**
             * PURPOSE: verify that compounding gains are affected by additional deposits proportionally and correctly.  
             * 
             * SCENARIO
             * - DEPOSIT: user deposits principal
             * - WITHDRAW: nothing 
             * - DEPOSIT: nothing 
             * - WITHDRAW: nothing 
             * - DEPOSIT: deposit some more (same amount again)
             * - LOCKED
             * - let it roll over for 2 rounds 
             * - WITHDRAW: user withdraws 100%. Should be the original principal, + 10% compounded twice, 
             *      PLUS that amount + the principal again, then again compounded twice 
             * 
             * TESTS: 
             * - realized profit matches expected profit 
             */
            it("auto-rollover with additional deposit", async function () {
                const principal = 500_000;

                //create test fixture
                const testVault = new TestVault(vault, vaultToken, baseToken);
                testVault.addUser(addr1);
                await testVault.init();

                //initial deposit 
                await testVault.user.deposit(principal);

                //user 0 is going to automatically rollover for two rounds, 
                //  then deposit the original principal a second time, 
                //  then automatically rollover 2 more rounds, 
                //  then withdraw all 

                //roll over for 2 rounds 
                await testVault.jumpFullRoundsToWithdrawal([
                    exchangeRates.ONE_PERCENT,
                    exchangeRates.ONE_COMP_2
                ]);

                //add more to the position 
                await testVault.nextPhase();
                await testVault.user.deposit(principal);

                //roll over for 1 more round
                await testVault.jumpFullRoundsToWithdrawal([
                    exchangeRates.ONE_COMP_3
                ]);

                //withdraw all 
                await testVault.user.withdrawAll();

                //profit should be the original investment compounded 4 x 1%, 
                //plus the second investment compounded 2 x 1%
                const expectedProfit =
                    ((compoundRepeat(principal, 100, 3)) - principal) +
                    ((compoundRepeat(principal, 100, 1)) - principal);

                expect(await testVault.user.realizedProfit()).to.equal(expectedProfit);

                //test vault balance
                expect(await testVault.baseTokenBalance()).to.be.approximately(testVault.expectedBaseTokenBalance, 1);
            });

            /**
             * PURPOSE: verify that compounding gains are affected by partial withdrawals proprtionally and correctly. 
             * 
             * SCENARIO
             * - 0: DEPOSIT: user deposits principal
             * - 0: WITHDRAW: nothing 
             * - 1: DEPOSIT: nothing 
             * - 1: WITHDRAW: user1 & user0 both withdraw (10,000)
             * - 2: DEPOSIT: user2 deposits (1,000,000)  
             * - 2: WITHDRAW: nothing
             * - 3: DEPOSIT: nothing
             * - 3: WITHDRAW: user0 withdraws 10,000, user1 withdraws all remaining 
             * - 4: DEPOSIT: nothing 
             * - 4: WITHDRAW: nothing 
             * - 5: DEPOSIT: nothing 
             * - 5: WITHDRAW: nothing 
             * - 6: DEPOSIT: nothing 
             * - 6: WITHDRAW: user0 and user2 withdraw all remaining 
             * 
             * TESTS: 
             * - realized profit for each user matches expected profit 
             */
            it("auto-rollover with partial profits", async function () {
                const principal = 1_000_000;

                //create test fixture
                const testVault = new TestVault(vault, vaultToken, baseToken);
                testVault.addUsers([addr1, addr2, addr3]);
                await testVault.init();

                await testVault.user0.deposit(principal);
                await testVault.user1.deposit(principal);

                //user 0 is going to automatically rollover for two rounds, 
                //  then deposit the original principal a second time, 
                //  then automatically rollover 2 more rounds, 
                //  then withdraw all 

                //roll over for 2 rounds 
                await testVault.jumpFullRoundsToWithdrawal([
                    exchangeRates.ONE_PERCENT,
                    exchangeRates.ONE_COMP_2
                ]);

                //take a little bit out 
                await testVault.user0.withdraw(testVault.convertToVaultToken(10000));
                await testVault.user1.withdraw(testVault.convertToVaultToken(10000));

                await testVault.nextPhase();
                await testVault.user2.deposit(principal);

                //roll over for 2 more rounds 
                await testVault.jumpFullRoundsToWithdrawal([
                    exchangeRates.ONE_COMP_3,
                    exchangeRates.ONE_COMP_4
                ]);

                //take a little bit out 
                await testVault.user0.withdraw(testVault.convertToVaultToken(10000));
                await testVault.user1.withdrawAll();

                //roll over for 2 rounds 
                await testVault.jumpFullRoundsToWithdrawal([
                    exchangeRates.ONE_COMP_5,
                    exchangeRates.ONE_COMP_6
                ]);

                //withdraw all 
                await testVault.user0.withdrawAll();
                await testVault.user2.withdrawAll();

                //profit should be the original investment compounded 4 x 1%, 
                //plus the second investment compounded 2 x 1%
                const expectedProfits = [
                    testVault.user0.expectedResults.totalProfit,
                    testVault.user1.expectedResults.totalProfit,
                    testVault.user2.expectedResults.totalProfit
                ]
                const expectedProfit0 = 6091394848;
                const expectedProfit1 = 4040344847;
                const expectedProfit2 = 4060422444;

                const realizedProfits = await Promise.all([
                    testVault.user0.realizedProfit(),
                    testVault.user1.realizedProfit(),
                    testVault.user2.realizedProfit()
                ]);

                for (let n = 0; n < realizedProfits.length; n++) {
                    expect(realizedProfits[n]).to.be.approximately(expectedProfits[n], 3);
                }

                //test vault balance
                expect(await testVault.baseTokenBalance()).to.be.approximately(testVault.expectedBaseTokenBalance, 3);
            });

            /**
             * PURPOSE: verify that compounding gains are affected by additional deposits and partial withdrawals 
             * proportionally and correctly.  
             * 
             * SCENARIO
             * - DEPOSIT: user deposits principal
             * - LOCKED
             * - let it roll over for 2 rounds 
             * - WITHDRAW: take out half 
             * - let it roll over for 2 more rounds 
             * - DEPOSIT: deposit some more 
             * - WITHDRAW: (10% yield)
             * - user withdraws 100%. Should be the original principal, + 10% compounded twice, 
             *      PLUS that amount - 1/2, then that remaining amount compounded twice 
             * 
             * TESTS: 
             * - realized profit matches expected profit 
             */
            it("auto-rollover with partial profits and added deposit", async function () {
                const principal = 100_000;

                //create test fixture
                const testVault = new TestVault(vault, vaultToken, baseToken);
                testVault.addUser(addr1);
                await testVault.init();

                await testVault.user.deposit(principal);

                //user 0 is going to automatically rollover for two rounds, 
                //  then deposit the original principal a second time, 
                //  then automatically rollover 2 more rounds, 
                //  then withdraw all 

                //roll over for 2 rounds 
                await testVault.jumpFullRoundsToWithdrawal([
                    exchangeRates.ONE_PERCENT,
                    exchangeRates.ONE_COMP_2
                ]);

                //add more to the position 
                await testVault.nextPhase();
                await testVault.user.deposit(principal);

                //roll over for 2 rounds 
                await testVault.jumpFullRoundsToWithdrawal([
                    exchangeRates.ONE_COMP_3,
                    exchangeRates.ONE_COMP_4
                ]);

                //take a little bit out 
                await testVault.user0.withdraw(principal / 2);

                //roll over for 2 rounds 
                await testVault.jumpFullRoundsToWithdrawal([
                    exchangeRates.ONE_COMP_5,
                    exchangeRates.ONE_COMP_6
                ]);

                //withdraw all 
                await testVault.user.withdrawAll();

                //profit should be the original investment compounded 4 x 1%, 
                //plus the second investment compounded 2 x 1%
                const expectedProfit =
                    (compoundRepeat(principal, 100, 6) - principal) +
                    (compoundRepeat(principal, 100, 2) - principal) +
                    (compoundRepeat((principal / 2), 100, 2) - (principal / 2));

                expect(await testVault.user.realizedProfit()).approximately(expectedProfit, 1);
                
                //test vault balance
                expect(await testVault.baseTokenBalance()).to.be.approximately(testVault.expectedBaseTokenBalance, 1);
            });

            /**
             * PURPOSE: verify that users receive compounding interest if they leave their principal and yield alone for 
             * multiple rounds, whereas new users jumping it at any round will receive the base yield only, and will 
             * receive compound interest forward from there. 
             * 
             * Example: 
             * user 1 deposits in round 1; his profits will have compounded 6 times by round 6
             * user 2 deposits in round 3; her profits will be straight 1% for the first round, compounded 3x by round 6
             * user 3 deposits in round 4; his profits will be straight 1% for the first round, compounded 2x by round 6
             */
            it("cascading profit %", async function () {
                const principal = 1_000_000;

                //create test fixture
                const testVault = new TestVault(vault, vaultToken, baseToken);
                testVault.addUsers([addr1, addr2, addr3]);
                await testVault.init();

                //deposit principal 
                await testVault.user0.deposit(principal);

                //user 0 is going to withdraw all excess profit amount each withdraw round (1%),
                //      leaving only the principal remaining for the next round.

                //round 1: 1%
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_PERCENT);
                expect(await testVault.user0.unrealizedProfit()).to.equal(xPercentOfy(principal, 1));
                await testVault.nextPhase();

                await testVault.user1.deposit(principal);

                //round 2: 1% compounded 2 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_COMP_2);
                expect(await testVault.user0.unrealizedProfit()).to.approximately(xPercentOfy(principal, 2.01), 0.0000001);
                expect(await testVault.user1.unrealizedProfit()).to.approximately(xPercentOfy(principal, 1), 0.02);

                //round 3: 1% compounded 3 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_COMP_3);
                expect(await testVault.user0.unrealizedProfit()).to.approximately(xPercentOfy(principal, 3.0301), 0.0000001);
                expect(await testVault.user1.unrealizedProfit()).to.approximately(xPercentOfy(principal, 2.01), 0.1);

                //round 4: 1% compounded 4 times 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_COMP_4);
                expect(await testVault.user0.unrealizedProfit()).to.approximately(xPercentOfy(principal, 4.060401), 0.0000001);
                expect(await testVault.user1.unrealizedProfit()).to.approximately(xPercentOfy(principal, 3.0301), 0.1);
                await testVault.nextPhase();

                await testVault.user2.deposit(principal);

                //round 5: 1% compounded 5 times 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_COMP_5);
                expect(await testVault.user0.unrealizedProfit()).to.approximately(xPercentOfy(principal, 5.101005), 0.0000001);
                expect(await testVault.user1.unrealizedProfit()).to.approximately(xPercentOfy(principal, 4.060401), 0.1);
                expect(await testVault.user2.unrealizedProfit()).to.approximately(xPercentOfy(principal, 1), 0.5);

                //round 6: 1% compounded 6 times 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_COMP_6);
                expect(await testVault.user0.unrealizedProfit()).to.approximately(xPercentOfy(principal, 6.1520151), 0.0000001);
                expect(await testVault.user1.unrealizedProfit()).to.approximately(xPercentOfy(principal, 5.101005), 0.1);
                expect(await testVault.user2.unrealizedProfit()).to.approximately(xPercentOfy(principal, 2.01), 0.5);

                //test vault balance
                expect(await testVault.baseTokenBalance()).to.be.approximately(testVault.expectedBaseTokenBalance, 1);
            });
        });

        describe("Implications of Transferring Tokens", function () {
            //NOTE: not relevant while VaultToken can't be transferred
            it.skip("user can use gifted VT to exchange for just as many ST as original investor could", async function () {
                const principal = 1_000_000;

                //create test fixture
                const testVault = new TestVault(vault, vaultToken, baseToken);
                testVault.disableLedger();
                testVault.addUser(addr1);
                await testVault.init();

                await testVault.user0.deposit(principal);

                //user 0 is going to automatically rollover every round. 
                //after three rounds he will pass on all VT to user 1
                //user 1 will transfer 1/2 of his VT to user2
                //user 1 and user 2 should both receive 1/2 of user 0's principal + 1% compounded x3 

                //round 1 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_PERCENT);
                await testVault.nextPhase();

                //round 2 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_COMP_2);
                await testVault.nextPhase();

                //round 3 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_COMP_3);

                //add user1 and user2 to testVault
                testVault.addUsers([addr2, addr3]);
                await testVault.user1.init();
                await testVault.user2.init();

                //pass all to user1
                await testVault.user.transferVaultTokenTo(
                    testVault.user1.address, 'all'
                );

                //user1 passes 1/2 to user2 
                await testVault.user1.transferVaultTokenTo(
                    testVault.user2.address, 'half'
                );

                //finally, user1 and user2 cash in for ST
                await testVault.user1.withdraw('all');
                await testVault.user2.withdraw('all');

                //profit should be 1% compounded 
                expect(await testVault.user1.baseTokenBalance()).to.equal(
                    testVault.user1.initialBaseTokenBalance + compoundRepeat(principal / 2, 100, 3)
                );
                expect(await testVault.user2.baseTokenBalance()).to.equal(
                    testVault.user1.initialBaseTokenBalance + compoundRepeat(principal / 2, 100, 3)
                );
                
                //check vault balance
                expect(await testVault.baseTokenBalance()).to.be.approximately(testVault.expectedBaseTokenBalance, 1);
            });

            //TRYING TO WITHDRAW FROM WRONG VAULT 
            /**
             * PURPOSE: 
             * SCENARIO: 
             * TESTS: 
             */
            it("cannot use tokens for a different vault", async function () {
                const principal = 1_000_000;

                //create test fixture
                const testVault = new TestVault(vault, vaultToken, baseToken);
                testVault.addUser(addr1);
                await testVault.init();

                //create a whole other vault with the same base token 
                const vault2 = await deploy.deployVault(baseToken.address);

                //deposit to first vault 
                await testVault.user.deposit(principal);

                //let it roll over a few times 
                await testVault.jumpToNextWithdrawPhase(constants.exchangeRates.ONE_PERCENT);
                await testVault.jumpToNextWithdrawPhase(constants.exchangeRates.ONE_COMP_2);

                //exchange VT at the other vault 
                await vaultToken.connect(testVault.user.user).approve(vault2.address, 100);
                await expect(vault2.connect(testVault.user.user).deposit(100)).to.be.reverted;

                //check vault balance
                expect(await testVault.baseTokenBalance()).to.be.approximately(testVault.expectedBaseTokenBalance, 1);
            });
        });

        describe("Exceptional Cases", function () {

            //TODO: (LOW) comment this 
            //TAKING A LOSS 
            /**
             * PURPOSE: 
             * SCENARIO: 
             * TESTS: 
             */
            it("users take a loss as interest rate goes negative", async function () {
                const principal = 500_000;

                //create test fixture
                const testVault = new TestVault(vault, vaultToken, baseToken);
                testVault.addUser(addr1);
                await testVault.init();

                await testVault.user.deposit(principal);

                //user 0 is going to automatically rollover for two rounds, 
                //  then deposit the original principal a second time, 
                //  then automatically rollover 2 more rounds, 
                //  then withdraw all 

                //roll over for 2 rounds 
                await testVault.jumpFullRoundsToWithdrawal([
                    exchangeRates.NEG_ONE_PERCENT,
                    exchangeRates.NEG_ONE_PERCENT
                ]);

                //withdraw all 
                await testVault.user.withdrawAll();

                //realized profit should be -1%
                expect(await testVault.user.realizedProfit()).to.equal(xPercentOfy(1, principal) * -1);
            });

            //WHAT IF INTEREST RATE IS 0 
            /**
             * PURPOSE: 
             * SCENARIO: 
             * TESTS: 
             */
            it("interest rate drops to zero", async function () {
                const principal = 500_000;

                //create test fixture
                const testVault = new TestVault(vault, vaultToken, baseToken);
                testVault.addUser(addr1);
                await testVault.init();

                await testVault.user.deposit(principal);

                //user 0 is going to automatically rollover for two rounds, 
                //  then deposit the original principal a second time, 
                //  then automatically rollover 2 more rounds, 
                //  then withdraw all 

                //roll over for 2 rounds 
                await testVault.jumpFullRoundsToWithdrawal([
                    exchangeRates.PARITY,
                    exchangeRates.PARITY
                ]);

                //add more to the position 
                await testVault.nextPhase();
                await testVault.user.deposit(principal);

                //roll over for 1 more round
                await testVault.jumpFullRoundsToWithdrawal([
                    exchangeRates.PARITY
                ]);

                //withdraw all 
                await testVault.user.withdrawAll();

                //profit should be the original investment compounded 4 x 1%, 
                //plus the second investment compounded 2 x 1%
                const expectedProfit = 0;

                expect(await testVault.user.realizedProfit()).to.equal(expectedProfit);
            });
        });
    });

    describe("With Direct Transfer", function () {
        describe("Simple Deposit/Withdraw", function () {
            /**
             * PURPOSE: verify that  multiple users can deposit in one round, and that the balances of VT and ST 
             * for users and vault are correct after deposit. 
             * 
             * SCENARIO: multiple deposit 
             * - DEPOSIT: multiple users deposit USDC into a vault 
             * 
             * TESTS: 
             * - VT/ST balances of users are correct
             * - VT/ST balances of vault are correct 
             */
            it("multiple users deposit", async function () {

                //create test fixture, add 3 users 
                const testVault = new TestVault(vault, vaultToken, baseToken);
                testVault.directWithdraw = true;
                
                testVault.addUser(addr1);
                testVault.addUser(addr2);
                testVault.addUser(addr3);
                await testVault.init();

                //deposit to vault (each user different amount) 
                const depositAmounts = [1000, 45000, 90000];
                await testVault.usersDeposit(depositAmounts);

                //check new token balances for each user 
                testVault.users.forEach(async (u, i) => {
                    expect(await u.vaultTokenBalance()).to.equal(u.depositAmount());
                    expect(await u.baseTokenBalance()).to.equal(mintAmount - u.depositAmount());
                });

                //check vault balance 
                const sum = testVault.sumOfDeposits;
                expect(await testVault.vaultTokenBalance()).to.equal(testVault.initialVaultTokenBalance);
                expect(await testVault.baseTokenBalance()).to.equal(testVault.initialBaseTokenBalance + sum);

                //test vault balance
                expect(await testVault.baseTokenBalance()).to.be.approximately(testVault.expectedBaseTokenBalance, 3);
            });

            /**
             * PURPOSE: verify that multiple users can deposit in one round, and fully withdraw in the next round, 
             * and that the balances of VT and ST for users and vault are correct after the withdraw. 
             * 
             * SCENARIO: multiple deposit + withdraw for gain 
             * - DEPOSIT: multiple users deposit USDC into a vault 
             * - WITHDRAW: users withdraw all deposited ST 
             * 
             * TESTS: 
             * - users' withdrawn amounts of ST are correct 
             * - users end up with correct amount of profit 
             * - balances of VT and ST in vault are correct after deposits/withdrawals
             */
            it("multiple users deposit and withdraw + 10% gain", async function () {
                
                //create test fixture, add three users 
                const testVault = new TestVault(vault, vaultToken, baseToken);
                testVault.directWithdraw = true;
                
                testVault.addUser(addr1);
                testVault.addUser(addr2);
                testVault.addUser(addr3);
                await testVault.init();

                //deposit to vault (each user different amount)
                const depositAmounts = [1200, 45010, 33330];
                await testVault.usersDeposit(depositAmounts);

                //set the phase to locked 
                await testVault.nextPhase(exchangeRates.ONE_PERCENT);

                //set the phase to withdraw (at 10%)
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_PERCENT);

                //each user withdraws
                await testVault.usersWithdrawAll();

                //make sure that each user gained 10%
                testVault.users.forEach(async (u, i) => {
                    expect(await u.realizedProfitPct()).to.equal(1);
                    expect(await u.vaultTokenBalance()).to.equal(0);
                });

                //make sure that vault balances are correct 
                const sumOfDeposits = testVault.sumOfDeposits;
                const sumOfProfits = await testVault.sumOfProfits();
                expect(await testVault.baseTokenBalance()).to.equal(testVault.initialBaseTokenBalance - sumOfProfits);
                expect(await testVault.vaultTokenBalance()).to.equal(sumOfDeposits);

                //test vault balance
                expect(await testVault.baseTokenBalance()).to.be.approximately(testVault.expectedBaseTokenBalance, 3);
            });

            /**
             * PURPOSE: verify that multiple users can deposit in one round, and partially (50%) withdraw in the next round, 
             * and that the balances of VT and ST for users and vault are correct after the withdraw. 
             * 
             * SCENARIO
             * - DEPOSIT: multiple users deposit USDC into a vault 
             * - WITHDRAW: at the next Withdraw phase, each user withdraws 1/2 their funds 
             * 
             * TESTS: 
             * - users' withdrawn amounts of ST are correct 
             * - users end up with correct amount of profit 
             * - balances of VT and ST in vault are correct after deposits/withdrawals
             */
            it("multiple users deposit and withdraw + 1% gain, take half profits", async function () {

                //initial balance of 0 vault token 
                expect(await vaultToken.balanceOf(addr1.address)).to.equal(0);
                expect(await vaultToken.balanceOf(addr2.address)).to.equal(0);
                expect(await vaultToken.balanceOf(addr3.address)).to.equal(0);

                //create test fixture with 3 users 
                const testVault = new TestVault(vault, vaultToken, baseToken);
                testVault.directWithdraw = true;
                testVault.addUser(addr1);
                testVault.addUser(addr2);
                testVault.addUser(addr3);
                await testVault.init();

                //deposit all (each user different amount) 
                const depositAmounts = [12000, 44000, 32200];
                await testVault.usersDeposit(depositAmounts);

                //check vault balance of base token 
                expect(await testVault.baseTokenBalance()).to.equal(
                    testVault.initialBaseTokenBalance + testVault.sumOfDeposits
                );

                //set the phase to withdraw (rate 1%)
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_PERCENT);

                //each user withdraw 1/2 of all funds deposited
                for (let u of testVault.users) {
                    await u.withdraw(u.depositAmount / 2);
                }

                //make sure that each user gained 1% on their half takings
                testVault.users.forEach(async (u, i) => {
                    expect(await u.baseTokenBalance()).to.equal(
                        u.initialBaseTokenBalance
                        - (u.depositAmount / 2)
                        + ((u.depositAmount / 2) / 100)
                    );
                });

                const sumOfDeposits = testVault.sumOfDeposits;

                //test vault's vault token balance 
                expect(await testVault.vaultTokenBalance()).to.equal(
                    testVault.initialVaultTokenBalance + (sumOfDeposits / 2)
                );

                //test vault balance
                expect(await testVault.baseTokenBalance()).to.be.approximately(testVault.expectedBaseTokenBalance, 3);
            });
        });

        describe("Rollover", function () {

            /**
             * PURPOSE: verify that if a user deposits, withdraws all, then redeposits their entire stake for one more 
             * round (total of 3 rounds), the result will be that their yield compounds over those 3 rounds.  
             * 
             * SCENARIO: a user withdraws entire stake every round, and immediately redeposits it. 
             * - DEPOSIT: user deposits an amount to the vault 
             * - WITHDRAW: user withdraws 100% of stake at end of round
             * - DEPOSIT: user redeposits entire withdrawn amount 
             * - WITHDRAW: user withdraws 100% of stake at end of round
             * - DEPOSIT: user deposits an amount to the vault 
             * - WITHDRAW: finally, user withdraws all and checks profit
             * 
             * TESTS: 
             * - user's realized profits at end of test should be equal to 1% compounded 3 times 
             */
            it("manual rollover compounding", async function () {
                const principal = 1_000_000;

                //create test fixture
                const testVault = new TestVault(vault, vaultToken, baseToken);
                testVault.directWithdraw = true;
                
                testVault.addUser(addr1);
                await testVault.init();

                await testVault.user.deposit(principal);

                //user 0 is going to manually rollover every round. 

                //round 1 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_PERCENT);
                await testVault.user.withdrawAll();
                await testVault.nextPhase(); //deposit phase 
                await testVault.user.depositAll();

                //round 2 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_COMP_2);
                await testVault.user.withdrawAll();
                await testVault.nextPhase(); //deposit phase 
                await testVault.user.depositAll();

                //round 3 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_COMP_3);
                await testVault.user.withdrawAll();

                //profit should be 1% compounded x3
                expect(await testVault.user.realizedProfit()).to.equal(compoundRepeat(principal, 100, 3) - principal);
                expect(await testVault.user.realizedProfit()).to.be.approximately(testVault.user.expectedResults.totalProfit, 1);
                expect(await testVault.user.vaultTokenBalance()).to.equal(0);

                //test vault balance
                expect(await testVault.baseTokenBalance()).to.be.approximately(testVault.expectedBaseTokenBalance, 3);
            });

            /**
             * PURPOSE: verify that a user who withdraws their entire amount of profit every round, 
             * will end up with the nominal yield NOT compounded. (e.g., if the  yield is 1% every round, 
             * after 3 rounds of profit-taking, the user will be left with a combined total 3% profit)
             * 
             * SCENARIO: 
             * - DEPOSIT: user deposits an amount P to the vault 
             * - WITHDRAW: user withdraws the amount of yield only, so that their remaining stake is again equal to P 
             * - DEPOSIT: user deposits no additional 
             * - WITHDRAW: user withdraws the amount of yield only, so that their remaining stake is again equal to P 
             * - DEPOSIT: user deposits no additional 
             * - WITHDRAW: user withdraws 100% of stake 
             * 
             * TESTS: 
             * - user's realized profits at end of test should be equal to 3% (1% * 3, not compounded)
             */
            it("no rollover (withdraw all profit every round)", async function () {
                const principal = 1_000_000;

                //create test fixture
                const testVault = new TestVault(vault, vaultToken, baseToken);
                testVault.directWithdraw = true;

                testVault.addUser(addr1);
                await testVault.init();

                //deposit principal 
                await testVault.usersDeposit([principal]);

                //user 0 is going to withdraw all excess profit amount each withdraw round (1%),
                //      leaving only the principal remaining for the next round.

                //round 1;  withdraw 1% 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_PERCENT);
                await testVault.user.withdraw(testVault.convertToVaultToken(await testVault.user.unrealizedProfit()));

                //round 2; withdraw 1% 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_COMP_2);
                await testVault.user.withdraw(testVault.convertToVaultToken(await testVault.user.unrealizedProfit()));

                //round 3
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_COMP_3);

                //withdraw 100% 
                await testVault.user.withdrawAll();

                //profit should be just straight 1% 
                expect(await testVault.user.realizedProfit()).approximately(xPercentOfy(3, principal), 1);

                //test vault balance
                expect(await testVault.baseTokenBalance()).to.be.approximately(testVault.expectedBaseTokenBalance, 3);
            });

            /**
             * PURPOSE: verify that a user performing manual rollover per round (compounding) will exceed the profit of a 
             * user who is withdrawing their profits every round. 
             * 
             * SCENARIO: 
             * - DEPOSIT: user 0 and user 1 both deposit the same amount of principal P 
             * - WITHDRAW: user 1 withdraws the yield only, leaving the principal. user 0 withdraws nothing
             * - DEPOSIT: neither user 0 nor user 1 deposits any additional. 
             * - WITHDRAW: user 1 withdraws the yield only, leaving the principal. user 0 withdraws nothing
             * - DEPOSIT: neither user 0 nor user 1 deposits any additional. 
             * - WITHDRAW: both users withdraw 100% 
             * 
             * TESTS: 
             * - user 0's realized profits are compounded (1% compounded x3) 
             * - user 1's realized profits are not compounded (1% x3, total of 3%) 
             * - user 0's profits exceed user 1's 
             */
            it("manual rollover vs. no rollover", async function () {
                const principal = 1_000_000;

                //create test fixture
                const testVault = new TestVault(vault, vaultToken, baseToken);
                testVault.directWithdraw = true;

                testVault.addUser(addr1);
                testVault.addUser(addr2);
                await testVault.init();

                await testVault.usersDeposit([principal, principal]);

                //user 0 is going to manually rollover every round. 
                //user 1 is going to withdraw all excess profit amount each withdraw round (1%),
                //      leaving only the principal remaining for the next round. 
                // (user 0's profits are compounded, so should exceed user 1's profits)

                //round 1 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_PERCENT);
                await testVault.user0.withdrawAll();
                await testVault.user1.withdraw(testVault.convertToVaultToken(10000));
                await testVault.nextPhase(); //deposit 
                await testVault.user0.depositAll();

                //round 2 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_COMP_2);
                await testVault.user0.withdrawAll();
                await testVault.user1.withdraw(testVault.convertToVaultToken(10000));
                await testVault.nextPhase(); //deposit
                await testVault.user0.depositAll();

                //round 3 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_COMP_3);
                await testVault.user0.withdrawAll();
                await testVault.user1.withdrawAll();

                const user0_profit = await testVault.user0.realizedProfit();
                const user1_profit = await testVault.user1.realizedProfit();

                //profit should be 1% compounded for user0, but just straight 1% for user1 
                expect(await user0_profit).to.equal(compoundRepeat(principal, 100, 3) - principal);
                expect(await testVault.user0.vaultTokenBalance()).to.equal(0);

                expect(await user1_profit).approximately(xPercentOfy(3, principal), 1);
                expect(await testVault.user1.vaultTokenBalance()).to.equal(0);

                //user 0 got more profit 
                expect(user0_profit).to.be.greaterThan(user1_profit);

                //test vault balance
                expect(await testVault.baseTokenBalance()).to.be.approximately(testVault.expectedBaseTokenBalance, 3);
            });

            /**
             * PURPOSE: verify that a user depositing into a vault at the beginning of round 1, and withdrawing all at the end 
             * of round 3 without adding or removing anything in between the deposit and withdraw, will receive the yield of 
             * each round compounded. In this case that would be 1% compounded 3x. 
             * 
             * SCENARIO
             * - DEPOSIT: a user deposits into vault 
             * - WITHDRAW: no withdrawal made
             * - DEPOSIT: no deposit made 
             * - WITHDRAW: no withdrawal made
             * - DEPOSIT: no deposit made 
             * - WITHDRAW: withdraw 100% 
             * 
             * TESTS: 
             * - user's realized profits at end of test should be equal to 1% compounded 3 times 
             */
            it("auto-rollover", async function () {
                const principal = 1_000_000;

                //create test fixture
                const testVault = new TestVault(vault, vaultToken, baseToken);
                testVault.directWithdraw = true;

                testVault.addUser(addr1);
                await testVault.init();

                await testVault.user.deposit(principal);

                //user 0 is going to automatically rollover every round. 

                //round 1 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_PERCENT);
                await testVault.nextPhase();

                //round 2 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_COMP_2);
                await testVault.nextPhase();

                //round 3 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_COMP_3);
                await testVault.user.withdrawAll();

                //profit should be 1% compounded 
                expect(await testVault.user.vaultTokenBalance()).to.equal(0);
                expect(await testVault.user.realizedProfit()).to.equal(compoundRepeat(principal, 100, 3) - principal);

                //test vault balance
                expect(await testVault.baseTokenBalance()).to.be.approximately(testVault.expectedBaseTokenBalance, 3);
            });

            /**
             * PURPOSE: verify that a user doing full auto-rollover for 3 rounds will receive exactly the same results as 
             * a user doing full manual rollover during that same period. 
             * 
             * SCENARIO: 
             * - DEPOSIT: user 0 and user 1 both deposit the same amount of principal 
             * - WITHDRAW: user 1: no withdrawal made
             *      user 0: withdraws 100% 
             * - DEPOSIT: user 1: no deposit made by
             *      user 0: deposits 100% 
             * - WITHDRAW: user 1: no withdrawal made
             *      user 0: withdraws 100% 
             * - DEPOSIT: user 1: no deposit made 
             *      user 0: deposits 100% 
             * - WITHDRAW: both users withdraw 100% 
             * 
             * TESTS: 
             * - both user's realized profits at end of test should be equal to 1% compounded 3 times, and should be 
             * equal to one another. 
             */
            it("manual rollover vs. auto-rollover", async function () {
                const principal = 1_000_000;

                //create test fixture
                const testVault = new TestVault(vault, vaultToken, baseToken);
                testVault.directWithdraw = true;

                testVault.addUser(addr1);
                testVault.addUser(addr2);
                await testVault.init();

                await testVault.usersDeposit([principal, principal]);

                //user 0 is going to manually rollover every round. 
                //user 1 is going to automatically rollover every round. 
                //  (their profits should be exactly the same)

                //round 1 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_PERCENT);
                await testVault.user0.withdrawAll();
                await testVault.nextPhase(); //deposit phase 
                await testVault.user0.depositAll();

                //round 2 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_COMP_2);
                await testVault.user0.withdrawAll();
                await testVault.nextPhase(); //deposit phase 
                await testVault.user0.depositAll();

                //round 3 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_COMP_3);
                await testVault.user0.withdrawAll();
                await testVault.user1.withdrawAll();

                const user0_profit = await testVault.user0.realizedProfit();
                const user1_profit = await testVault.user1.realizedProfit();

                //both users have 0 vault token 
                expect(await testVault.user0.vaultTokenBalance()).to.equal(0);
                expect(await testVault.user1.vaultTokenBalance()).to.equal(0);

                //profit should be 1% compounded 
                expect(await user0_profit).to.equal(compoundRepeat(principal, 100, 3) - principal);
                expect(await user1_profit).to.equal(compoundRepeat(principal, 100, 3) - principal);

                //equal profits and base token amounts 
                expect(await user0_profit).to.equal(user1_profit);
                expect(await testVault.user0.baseTokenBalance()).to.equal(await testVault.user1.baseTokenBalance());

                //test vault balance
                expect(await testVault.baseTokenBalance()).to.be.approximately(testVault.expectedBaseTokenBalance, 3);
            });

            /**
             * PURPOSE: verify that compounding gains are affected by additional deposits proportionally and correctly.  
             * 
             * SCENARIO
             * - DEPOSIT: user deposits principal
             * - WITHDRAW: nothing 
             * - DEPOSIT: nothing 
             * - WITHDRAW: nothing 
             * - DEPOSIT: deposit some more (same amount again)
             * - LOCKED
             * - let it roll over for 2 rounds 
             * - WITHDRAW: user withdraws 100%. Should be the original principal, + 10% compounded twice, 
             *      PLUS that amount + the principal again, then again compounded twice 
             * 
             * TESTS: 
             * - realized profit matches expected profit 
             */
            it("auto-rollover with additional deposit", async function () {
                const principal = 500_000;

                //create test fixture
                const testVault = new TestVault(vault, vaultToken, baseToken);
                testVault.directWithdraw = true;

                testVault.addUser(addr1);
                await testVault.init();

                //initial deposit 
                await testVault.user.deposit(principal);

                //user 0 is going to automatically rollover for two rounds, 
                //  then deposit the original principal a second time, 
                //  then automatically rollover 2 more rounds, 
                //  then withdraw all 

                //roll over for 2 rounds 
                await testVault.jumpFullRoundsToWithdrawal([
                    exchangeRates.ONE_PERCENT,
                    exchangeRates.ONE_COMP_2
                ]);

                //add more to the position 
                await testVault.nextPhase();
                await testVault.user.deposit(principal);

                //roll over for 1 more round
                await testVault.jumpFullRoundsToWithdrawal([
                    exchangeRates.ONE_COMP_3
                ]);

                //withdraw all 
                await testVault.user.withdrawAll();

                //profit should be the original investment compounded 4 x 1%, 
                //plus the second investment compounded 2 x 1%
                const expectedProfit =
                    ((compoundRepeat(principal, 100, 3)) - principal) +
                    ((compoundRepeat(principal, 100, 1)) - principal);

                expect(await testVault.user.realizedProfit()).to.equal(expectedProfit);

                //test vault balance
                expect(await testVault.baseTokenBalance()).to.be.approximately(testVault.expectedBaseTokenBalance, 3);
            });

            /**
             * PURPOSE: verify that compounding gains are affected by partial withdrawals proprtionally and correctly. 
             * 
             * SCENARIO
             * - 0: DEPOSIT: user deposits principal
             * - 0: WITHDRAW: nothing 
             * - 1: DEPOSIT: nothing 
             * - 1: WITHDRAW: user1 & user0 both withdraw (10,000)
             * - 2: DEPOSIT: user2 deposits (1,000,000)  
             * - 2: WITHDRAW: nothing
             * - 3: DEPOSIT: nothing
             * - 3: WITHDRAW: user0 withdraws 10,000, user1 withdraws all remaining 
             * - 4: DEPOSIT: nothing 
             * - 4: WITHDRAW: nothing 
             * - 5: DEPOSIT: nothing 
             * - 5: WITHDRAW: nothing 
             * - 6: DEPOSIT: nothing 
             * - 6: WITHDRAW: user0 and user2 withdraw all remaining 
             * 
             * TESTS: 
             * - realized profit for each user matches expected profit 
             */
            it("auto-rollover with partial profits", async function () {
                const principal = 1_000_000;

                //create test fixture
                const testVault = new TestVault(vault, vaultToken, baseToken);
                testVault.directWithdraw = true;

                testVault.addUsers([addr1, addr2, addr3]);
                await testVault.init();

                await testVault.user0.deposit(principal);
                await testVault.user1.deposit(principal);

                //user 0 is going to automatically rollover for two rounds, 
                //  then deposit the original principal a second time, 
                //  then automatically rollover 2 more rounds, 
                //  then withdraw all 

                //roll over for 2 rounds 
                await testVault.jumpFullRoundsToWithdrawal([
                    exchangeRates.ONE_PERCENT,
                    exchangeRates.ONE_COMP_2
                ]);

                //take a little bit out 
                await testVault.user0.withdraw(testVault.convertToVaultToken(10000));
                await testVault.user1.withdraw(testVault.convertToVaultToken(10000));

                await testVault.nextPhase();
                await testVault.user2.deposit(principal);

                //roll over for 2 more rounds 
                await testVault.jumpFullRoundsToWithdrawal([
                    exchangeRates.ONE_COMP_3,
                    exchangeRates.ONE_COMP_4
                ]);

                //take a little bit out 
                await testVault.user0.withdraw(testVault.convertToVaultToken(10000));
                await testVault.user1.withdrawAll();

                //roll over for 2 rounds 
                await testVault.jumpFullRoundsToWithdrawal([
                    exchangeRates.ONE_COMP_5,
                    exchangeRates.ONE_COMP_6
                ]);

                //withdraw all 
                await testVault.user0.withdrawAll();
                await testVault.user2.withdrawAll();

                //profit should be the original investment compounded 4 x 1%, 
                //plus the second investment compounded 2 x 1%
                const expectedProfits = [
                    testVault.user0.expectedResults.totalProfit,
                    testVault.user1.expectedResults.totalProfit,
                    testVault.user2.expectedResults.totalProfit
                ]
                const expectedProfit0 = 60913;
                const expectedProfit1 = 40403;
                const expectedProfit2 = 40604;

                const realizedProfits = await Promise.all([
                    testVault.user0.realizedProfit(),
                    testVault.user1.realizedProfit(),
                    testVault.user2.realizedProfit()
                ]);

                for (let n = 0; n < realizedProfits.length; n++) {
                    expect(realizedProfits[n]).to.be.approximately(expectedProfits[n], 3);
                }

                //test vault balance
                expect(await testVault.baseTokenBalance()).to.be.approximately(testVault.expectedBaseTokenBalance, 3);
            });

            /**
             * PURPOSE: verify that compounding gains are affected by additional deposits and partial withdrawals 
             * proportionally and correctly.  
             * 
             * SCENARIO
             * - DEPOSIT: user deposits principal
             * - LOCKED
             * - let it roll over for 2 rounds 
             * - WITHDRAW: take out half 
             * - let it roll over for 2 more rounds 
             * - DEPOSIT: deposit some more 
             * - WITHDRAW: (10% yield)
             * - user withdraws 100%. Should be the original principal, + 10% compounded twice, 
             *      PLUS that amount - 1/2, then that remaining amount compounded twice 
             * 
             * TESTS: 
             * - realized profit matches expected profit 
             */
            it("auto-rollover with partial profits and added deposit", async function () {
                const principal = 100_000;

                //create test fixture
                const testVault = new TestVault(vault, vaultToken, baseToken);
                testVault.directWithdraw = true;

                testVault.addUser(addr1);
                await testVault.init();

                await testVault.user.deposit(principal);

                //user 0 is going to automatically rollover for two rounds, 
                //  then deposit the original principal a second time, 
                //  then automatically rollover 2 more rounds, 
                //  then withdraw all 

                //roll over for 2 rounds 
                await testVault.jumpFullRoundsToWithdrawal([
                    exchangeRates.ONE_PERCENT,
                    exchangeRates.ONE_COMP_2
                ]);

                //add more to the position 
                await testVault.nextPhase();
                await testVault.user.deposit(principal);

                //roll over for 2 rounds 
                await testVault.jumpFullRoundsToWithdrawal([
                    exchangeRates.ONE_COMP_3,
                    exchangeRates.ONE_COMP_4
                ]);

                //take a little bit out 
                await testVault.user0.withdraw(principal / 2);

                //roll over for 2 rounds 
                await testVault.jumpFullRoundsToWithdrawal([
                    exchangeRates.ONE_COMP_5,
                    exchangeRates.ONE_COMP_6
                ]);

                //withdraw all 
                await testVault.user.withdrawAll();

                //profit should be the original investment compounded 4 x 1%, 
                //plus the second investment compounded 2 x 1%
                const expectedProfit =
                    (compoundRepeat(principal, 100, 6) - principal) +
                    (compoundRepeat(principal, 100, 2) - principal) +
                    (compoundRepeat((principal / 2), 100, 2) - (principal / 2));

                expect(await testVault.user.realizedProfit()).approximately(expectedProfit, 1);

                //test vault balance
                expect(await testVault.baseTokenBalance()).to.be.approximately(testVault.expectedBaseTokenBalance, 3);
            });

            /**
             * PURPOSE: verify that users receive compounding interest if they leave their principal and yield alone for 
             * multiple rounds, whereas new users jumping it at any round will receive the base yield only, and will 
             * receive compound interest forward from there. 
             * 
             * Example: 
             * user 1 deposits in round 1; his profits will have compounded 6 times by round 6
             * user 2 deposits in round 3; her profits will be straight 1% for the first round, compounded 3x by round 6
             * user 3 deposits in round 4; his profits will be straight 1% for the first round, compounded 2x by round 6
             */
            it("cascading profit %", async function () {
                const principal = 1_000_000;

                //create test fixture
                const testVault = new TestVault(vault, vaultToken, baseToken);
                testVault.directWithdraw = true;

                testVault.addUsers([addr1, addr2, addr3]);
                await testVault.init();

                //deposit principal 
                await testVault.user0.deposit(principal);

                //user 0 is going to withdraw all excess profit amount each withdraw round (1%),
                //      leaving only the principal remaining for the next round.

                //round 1: 1%
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_PERCENT);
                expect(await testVault.user0.unrealizedProfit()).to.equal(xPercentOfy(principal, 1));
                await testVault.nextPhase();

                await testVault.user1.deposit(principal);

                //round 2: 1% compounded 2 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_COMP_2);
                expect(await testVault.user0.unrealizedProfit()).to.approximately(xPercentOfy(principal, 2.01), 0.0000001);
                expect(await testVault.user1.unrealizedProfit()).to.approximately(xPercentOfy(principal, 1), 0.02);

                //round 3: 1% compounded 3 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_COMP_3);
                expect(await testVault.user0.unrealizedProfit()).to.approximately(xPercentOfy(principal, 3.0301), 0.0000001);
                expect(await testVault.user1.unrealizedProfit()).to.approximately(xPercentOfy(principal, 2.01), 0.1);

                //round 4: 1% compounded 4 times 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_COMP_4);
                expect(await testVault.user0.unrealizedProfit()).to.approximately(xPercentOfy(principal, 4.060401), 0.0000001);
                expect(await testVault.user1.unrealizedProfit()).to.approximately(xPercentOfy(principal, 3.0301), 0.1);
                await testVault.nextPhase();

                await testVault.user2.deposit(principal);

                //round 5: 1% compounded 5 times 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_COMP_5);
                expect(await testVault.user0.unrealizedProfit()).to.approximately(xPercentOfy(principal, 5.101005), 0.0000001);
                expect(await testVault.user1.unrealizedProfit()).to.approximately(xPercentOfy(principal, 4.060401), 0.1);
                expect(await testVault.user2.unrealizedProfit()).to.approximately(xPercentOfy(principal, 1), 0.5);

                //round 6: 1% compounded 6 times 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_COMP_6);
                expect(await testVault.user0.unrealizedProfit()).to.approximately(xPercentOfy(principal, 6.1520151), 0.0000001);
                expect(await testVault.user1.unrealizedProfit()).to.approximately(xPercentOfy(principal, 5.101005), 0.1);
                expect(await testVault.user2.unrealizedProfit()).to.approximately(xPercentOfy(principal, 2.01), 0.5);

                //test vault balance
                expect(await testVault.baseTokenBalance()).to.be.approximately(testVault.expectedBaseTokenBalance, 3);
            });
        });

        describe("Implications of Transferring Tokens", function () {
            
            //NOTE: not relevant while VaultToken can't be transferred
            it.skip("user can use gifted VT to exchange for just as many ST as original investor could", async function () {
                const principal = 1_000_000;

                //create test fixture
                const testVault = new TestVault(vault, vaultToken, baseToken);
                testVault.directWithdraw = true;

                testVault.disableLedger();
                testVault.addUser(addr1);
                await testVault.init();

                await testVault.user0.deposit(principal);

                //user 0 is going to automatically rollover every round. 
                //after three rounds he will pass on all VT to user 1
                //user 1 will transfer 1/2 of his VT to user2
                //user 1 and user 2 should both receive 1/2 of user 0's principal + 1% compounded x3 

                //round 1 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_PERCENT);
                await testVault.nextPhase();

                //round 2 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_COMP_2);
                await testVault.nextPhase();

                //round 3 
                await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_COMP_3);

                //add user1 and user2 to testVault
                testVault.addUsers([addr2, addr3]);
                await testVault.user1.init();
                await testVault.user2.init();

                //pass all to user1
                await testVault.user.transferVaultTokenTo(
                    testVault.user1.address, 'all'
                );

                //user1 passes 1/2 to user2 
                await testVault.user1.transferVaultTokenTo(
                    testVault.user2.address, 'half'
                );

                //finally, user1 and user2 cash in for ST
                await testVault.user1.withdraw('all');
                await testVault.user2.withdraw('all');

                //profit should be 1% compounded 
                expect(await testVault.user1.baseTokenBalance()).to.equal(
                    testVault.user1.initialBaseTokenBalance + compoundRepeat(principal / 2, 100, 3)
                );
                expect(await testVault.user2.baseTokenBalance()).to.equal(
                    testVault.user1.initialBaseTokenBalance + compoundRepeat(principal / 2, 100, 3)
                );
            });

            //TRYING TO WITHDRAW FROM WRONG VAULT 
            /**
             * PURPOSE: 
             * SCENARIO: 
             * TESTS: 
             */
            it("cannot use tokens for a different vault", async function () {
                const principal = 1_000_000;

                //create test fixture
                const testVault = new TestVault(vault, vaultToken, baseToken);
                testVault.directWithdraw = true;

                testVault.addUser(addr1);
                await testVault.init();

                //create a whole other vault with the same base token 
                const vault2 = await deploy.deployVault(baseToken.address);

                //deposit to first vault 
                await testVault.user.deposit(principal);

                //let it roll over a few times 
                await testVault.jumpToNextWithdrawPhase(constants.exchangeRates.ONE_PERCENT);
                await testVault.jumpToNextWithdrawPhase(constants.exchangeRates.ONE_COMP_2);

                //exchange VT at the other vault 
                await vaultToken.connect(testVault.user.user).approve(vault2.address, 100);
                await expect(vault2.connect(testVault.user.user).deposit(100)).to.be.reverted;
            });
        });

        describe("Exceptional Cases", function () {

            //TAKING A LOSS 
            /**
             * PURPOSE: 
             * SCENARIO: 
             * TESTS: 
             */
            it("users take a loss as interest rate goes negative", async function () {
                const principal = 500_000;

                //create test fixture
                const testVault = new TestVault(vault, vaultToken, baseToken);
                testVault.directWithdraw = true;

                testVault.addUser(addr1);
                await testVault.init();

                await testVault.user.deposit(principal);

                //user 0 is going to automatically rollover for two rounds, 
                //  then deposit the original principal a second time, 
                //  then automatically rollover 2 more rounds, 
                //  then withdraw all 

                //roll over for 2 rounds 
                await testVault.jumpFullRoundsToWithdrawal([
                    exchangeRates.NEG_ONE_PERCENT,
                    exchangeRates.NEG_ONE_PERCENT
                ]);

                //withdraw all 
                await testVault.user.withdrawAll();

                //realized profit should be -1%
                expect(await testVault.user.realizedProfit()).to.equal(xPercentOfy(1, principal) * -1);
            });

            //WHAT IF INTEREST RATE IS 0 
            /**
             * PURPOSE: 
             * SCENARIO: 
             * TESTS: 
             */
            it("interest rate drops to zero", async function () {
                const principal = 500_000;

                //create test fixture
                const testVault = new TestVault(vault, vaultToken, baseToken);
                testVault.directWithdraw = true;

                testVault.addUser(addr1);
                await testVault.init();

                await testVault.user.deposit(principal);

                //user 0 is going to automatically rollover for two rounds, 
                //  then deposit the original principal a second time, 
                //  then automatically rollover 2 more rounds, 
                //  then withdraw all 

                //roll over for 2 rounds 
                await testVault.jumpFullRoundsToWithdrawal([
                    exchangeRates.PARITY,
                    exchangeRates.PARITY
                ]);

                //add more to the position 
                await testVault.nextPhase();
                await testVault.user.deposit(principal);

                //roll over for 1 more round
                await testVault.jumpFullRoundsToWithdrawal([
                    exchangeRates.PARITY
                ]);

                //withdraw all 
                await testVault.user.withdrawAll();

                //profit should be the original investment compounded 4 x 1%, 
                //plus the second investment compounded 2 x 1%
                const expectedProfit = 0;

                expect(await testVault.user.realizedProfit()).to.equal(expectedProfit);
            });
        });
    });
});