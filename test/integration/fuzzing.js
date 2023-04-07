const { expect } = require("chai");
const { ethers } = require("hardhat");
const constants = require("../util/constants");
const mathUtils = require("../util/mathUtils");
const deploy = require("../util/deploy");
const { TestVault } = require("../util/testFixtures");
const { BigNumber } = require("ethers");

const NUM_TEST_EPOCHS = 5;
const NUM_TEST_ROUNDS_PER_EPOCH = 12;
const NUM_TEST_USERS = 10;

describe("Integration Fuzzing", function () {
    let vaultToken, vault, baseToken;               //contracts
    let owner, addr1, addr2, addr3, testAddresses; 	//accounts
    const mintAmount = 1_000_000_000_000; 

    beforeEach(async function () {
        [owner, addr1, addr2, addr3, ...testAddresses] = await ethers.getSigners();
    });

    describe("RandomWalk Test", function () {
        it("5 epochs, 10 users, 12 rounds, steady rate of 1%", async function () {
            
            for (let n = 0; n < NUM_TEST_EPOCHS; n++) {
                [vaultToken, vault, baseToken] = await deploy.deployAll(false);

                await baseToken.mint(vault.address, BigNumber.from("1000000000000"))

                console.log("randomwalk epoch", n);

                //mint basetoken to each user
                for (let n = 0; n < NUM_TEST_USERS; n++) {
                    baseToken.mint(testAddresses[n].address, mintAmount);
                }

                //INITIALIZE: create test fixture, add N users 
                const testVault = new TestVault(vault, vaultToken, baseToken);
                for (let n = 0; n < NUM_TEST_USERS; n++) {
                    testVault.addUser(testAddresses[n]);
                }
                await testVault.init();

                const exchangeRates = constants.exchangeRates.onePercentCompounding;

                //EXECUTE ROUNDS 
                for (let n = 0; n < NUM_TEST_ROUNDS_PER_EPOCH; n++) {
                    if (n > 0)
                        await testVault.nextPhase();

                    //now we are in deposit phase 
                    for (let u of testVault.users) {

                        //decide first to do something or not (50% chance)
                        if (mathUtils.randomBool()) {
                            const baseTokenBalance = await u.baseTokenBalance();

                            //50% chance of depositing if baseTokenAmount > 0
                            if (baseTokenBalance > 0) {
                                if (mathUtils.randomBool()) {
                                    if (baseTokenBalance >= constants.DEFAULT_MIN_DEPOSIT)
                                    {
                                        const depositAmount = mathUtils.randomInt(constants.DEFAULT_MIN_DEPOSIT, baseTokenBalance);

                                        //console.log(`round ${n}: depositing ${depositAmount}`)
                                        await u.deposit(depositAmount);
                                    }
                                }
                            }
                        }
                    }

                    //move to locked phase 
                    await testVault.nextPhase(exchangeRates[n + 1]);

                    //now move to withdraw phase 
                    await testVault.nextPhase();
                    for (let u of testVault.users) {

                        //decide first to do something or not (50% chance)
                        if (mathUtils.randomBool()) {
                            const vaultTokenBalance = await u.vaultTokenBalance();

                            //50% chance of depositing if baseTokenAmount > 0
                            if (vaultTokenBalance > 0) {
                                if (mathUtils.randomBool()) {
                                    const withdrawAmount = mathUtils.randomInt(1, vaultTokenBalance);
                                    //console.log(`round ${n}: withdrawing ${Math.floor(testVault.convertToBaseToken(withdrawAmount))}`)
                                    await u.withdraw(withdrawAmount);
                                }
                            }
                        }
                    }
                }

                //TEST: check new token balances for each user 
                for (let u of testVault.users) {
                    const vaultTokenBalance = await u.vaultTokenBalance();
                    const baseTokenBalance = await u.baseTokenBalance();

                    //expect(vaultTokenBalance).to.equal(u.depositAmount());
                    //expect(baseTokenBalance).to.equal(mintAmount - u.depositAmount());

                    console.log("profit before withdrawal: ", u.expectedResults.totalProfit);
                    console.log("simple profit:", u.expectedResults.lastRecord.profitAmount);

                    u.expectedResults.print();

                    if (vaultTokenBalance > 0) {
                        console.log(`withdrawing all: ${Math.floor(testVault.convertToBaseToken(vaultTokenBalance))}`);
                        await u.withdrawAll();
                    }
                    console.log("profit after withdrawal: ", u.expectedResults.totalProfit);
                    console.log("simple profit:", u.expectedResults.lastRecord.profitAmount);

                    const expectedResults = u.expectedResults;
                    const expectedProfit = expectedResults.totalProfit;

                    expect(await u.vaultTokenBalance()).to.equal(0);

                    const realizedProfit = await u.realizedProfit();

                    expect(realizedProfit).to.be.approximately(expectedProfit, 10);
                    expect(realizedProfit).to.be.greaterThanOrEqual(-10); //TODO: (LOW) why is this sometimes negative?
                }

                //test vault balance
                const actualBal = await testVault.baseTokenBalance();;
                const expected = testVault.expectedBaseTokenBalance;
                const diff = Math.abs(actualBal - expected);

                expect(diff).to.be.lessThan(50); 
            }
        });

        it("5 epochs, 10 users, 12 rounds, steady rate of 1%, with direct withdraw", async function () {
            for (let n = 0; n < NUM_TEST_EPOCHS; n++) {
                [vaultToken, vault, baseToken] = await deploy.deployAll(false);

                await baseToken.mint(vault.address, BigNumber.from("1000000000000"))

                console.log("randomwalk epoch", n);

                //mint basetoken to each user
                for (let n = 0; n < NUM_TEST_USERS; n++) {
                    baseToken.mint(testAddresses[n].address, mintAmount);
                }

                //INITIALIZE: create test fixture, add N users 
                const testVault = new TestVault(vault, vaultToken, baseToken);
                testVault.directWithdraw = true; 
                
                for (let n = 0; n < NUM_TEST_USERS; n++) {
                    testVault.addUser(testAddresses[n]);
                }
                await testVault.init();

                const exchangeRates = constants.exchangeRates.onePercentCompounding;

                //EXECUTE ROUNDS 
                for (let n = 0; n < NUM_TEST_ROUNDS_PER_EPOCH; n++) {
                    if (n > 0)
                        await testVault.nextPhase();

                    //now we are in deposit phase 
                    for (let u of testVault.users) {

                        //decide first to do something or not (50% chance)
                        if (mathUtils.randomBool()) {
                            const baseTokenBalance = await u.baseTokenBalance();

                            //50% chance of depositing if baseTokenAmount > 0
                            if (baseTokenBalance > 0) {
                                if (mathUtils.randomBool()) {
                                    if (baseTokenBalance >= constants.DEFAULT_MIN_DEPOSIT) {
                                        const depositAmount = mathUtils.randomInt(constants.DEFAULT_MIN_DEPOSIT, baseTokenBalance);

                                        //console.log(`round ${n}: depositing ${depositAmount}`)
                                        await u.deposit(depositAmount);
                                    }
                                }
                            }
                        }
                    }

                    //move to locked phase 
                    await testVault.nextPhase(exchangeRates[n + 1]);

                    //now move to withdraw phase 
                    await testVault.nextPhase();
                    for (let u of testVault.users) {

                        //decide first to do something or not (50% chance)
                        if (mathUtils.randomBool()) {
                            const vaultTokenBalance = await u.vaultTokenBalance();

                            //50% chance of depositing if baseTokenAmount > 0
                            if (vaultTokenBalance > 0) {
                                if (mathUtils.randomBool()) {
                                    const withdrawAmount = mathUtils.randomInt(1, vaultTokenBalance);
                                    //console.log(`round ${n}: withdrawing ${Math.floor(testVault.convertToBaseToken(withdrawAmount))}`)
                                    await u.withdraw(withdrawAmount);
                                }
                            }
                        }
                    }
                }

                //TEST: check new token balances for each user 
                for (let u of testVault.users) {
                    const vaultTokenBalance = await u.vaultTokenBalance();
                    const baseTokenBalance = await u.baseTokenBalance();

                    //expect(vaultTokenBalance).to.equal(u.depositAmount());
                    //expect(baseTokenBalance).to.equal(mintAmount - u.depositAmount());

                    console.log("profit before withdrawal: ", u.expectedResults.totalProfit);
                    console.log("simple profit:", u.expectedResults.lastRecord.profitAmount);

                    u.expectedResults.print();

                    if (vaultTokenBalance > 0) {
                        console.log(`withdrawing all: ${Math.floor(testVault.convertToBaseToken(vaultTokenBalance))}`);
                        await u.withdrawAll();
                    }
                    console.log("profit after withdrawal: ", u.expectedResults.totalProfit);
                    console.log("simple profit:", u.expectedResults.lastRecord.profitAmount);

                    const expectedResults = u.expectedResults;
                    const expectedProfit = expectedResults.totalProfit;

                    expect(await u.vaultTokenBalance()).to.equal(0);

                    const realizedProfit = await u.realizedProfit();

                    expect(realizedProfit).to.be.approximately(expectedProfit, 10);
                    expect(realizedProfit).to.be.greaterThanOrEqual(-10); //TODO: (LOW) why is this sometimes negative?
                }

                //test vault balance
                const actualBal = await testVault.baseTokenBalance(); ;
                const expected = testVault.expectedBaseTokenBalance;
                const diff = Math.abs(actualBal - expected);
                
                expect(diff).to.be.lessThan(50); 
            }
        }).timeout(40000000);
    });
});