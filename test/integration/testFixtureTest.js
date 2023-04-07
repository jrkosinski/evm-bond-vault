const { expect } = require("chai");
const { ethers } = require("hardhat");
const constants = require("../util/constants");
const exchangeRates = constants.exchangeRates;
const deploy = require("../util/deploy");
const { xPercentOfy } = require("../util/mathUtils");
const { TestVault, TestVaultUser } = require("../util/testFixtures");

describe("Test Fixtures", function () {
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

    describe("Test Fixture", function () {
        it("unrealized profit", async function () {
            const principal = 1_000_000;

            //create test fixture
            const testVault = new TestVault(vault, vaultToken, baseToken);
            testVault.addUser(addr1);
            await testVault.init();

            //deposit principal 
            await testVault.usersDeposit([principal]);

            //user 0 is going to withdraw all excess profit amount each withdraw round (1%),
            //      leaving only the principal remaining for the next round.

            //round 1: 1%
            await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_PERCENT);
            expect(await testVault.user.unrealizedProfit()).to.equal(xPercentOfy(principal, 1));

            //round 2: 1% compounded 2 
            await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_COMP_2);
            expect(await testVault.user.unrealizedProfit()).to.approximately(xPercentOfy(principal, 2.01), 0.0000001);

            //round 3: 1% compounded 3 
            await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_COMP_3);
            expect(await testVault.user.unrealizedProfit()).to.approximately(xPercentOfy(principal, 3.0301), 0.0000001);

            //round 4: 1% compounded 4 times 
            await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_COMP_4);
            expect(await testVault.user.unrealizedProfit()).to.approximately(xPercentOfy(principal, 4.060401), 0.0000001);

            //round 5: 1% compounded 5 times 
            await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_COMP_5);
            expect(await testVault.user.unrealizedProfit()).to.approximately(xPercentOfy(principal, 5.101005), 0.0000001);

            //round 6: 1% compounded 6 times 
            await testVault.jumpToNextWithdrawPhase(exchangeRates.ONE_COMP_6);
            expect(await testVault.user.unrealizedProfit()).to.approximately(xPercentOfy(principal, 6.1520151), 0.0000001);
        });
    });


    describe("Ledger Expected Results", function () {
        it("first ledger record", async function () {
            const principal = 1_000_000;

            //create test fixture
            const testVault = new TestVault(vault, vaultToken, baseToken);
            testVault.addUser(addr1);
            await testVault.init();

            //deposit principal 
            await testVault.user.deposit(principal);

            const expected = testVault.user.expectedResults;

            expect(expected.initialPrincipal).to.equal(principal);
            expect(expected.totalDeposit).to.equal(principal);
        });

        it("1-record ledger percent profit", async function () {
            const principal = 1_000_000;

            //create test fixture
            const testVault = new TestVault(vault, vaultToken, baseToken);
            testVault.addUser(addr1);
            await testVault.init();

            //deposit principal 
            await testVault.user.deposit(principal);

            await testVault.jumpFullRoundsToWithdrawal([
                constants.exchangeRates.ONE_PERCENT
            ]);

            //await testVault.user.withdrawAll(); 

            const expected = testVault.user.expectedResults;

            expect(expected.initialPrincipal).to.equal(principal);
            expect(expected.totalDeposit).to.equal(principal);
            expect(expected.totalWithdrawal).to.equal(0);
            expect(expected.percentGain).to.equal(1);
            expect(expected.totalProfit).to.equal(principal / 100);
        });

        it("3-record ledger compounded profit", async function () {
            const principal = 1_000_000;

            //create test fixture
            const testVault = new TestVault(vault, vaultToken, baseToken);
            testVault.addUser(addr1);
            await testVault.init();

            //deposit principal 
            await testVault.user.deposit(principal);

            await testVault.jumpFullRoundsToWithdrawal([
                constants.exchangeRates.ONE_PERCENT
            ]);

            await testVault.jumpFullRoundsToWithdrawal([
                constants.exchangeRates.ONE_COMP_2
            ]);

            await testVault.jumpFullRoundsToWithdrawal([
                constants.exchangeRates.ONE_COMP_3
            ]);

            const expected = testVault.user.expectedResults;

            expect(expected.records.length).to.equal(3);
            expect(expected.initialPrincipal).to.equal(principal);
            expect(expected.totalDeposit).to.equal(principal);
            expect(expected.totalWithdrawal).to.equal(0);
            expect(expected.percentGain).to.equal(1);
            expect(expected.totalProfit).to.equal(30301);
            expect(expected.totalResult).to.equal(expected.initialPrincipal + expected.totalProfit);
        });

        it("3-record ledger with additional deposit", async function () {
            const principal = 1_000_000;

            await baseToken.mint(addr1.address, mintAmount * 2);

            //create test fixture
            const testVault = new TestVault(vault, vaultToken, baseToken);
            testVault.addUser(addr1);
            await testVault.init();

            //deposit principal 
            await testVault.user.deposit(principal);

            await testVault.jumpFullRoundsToWithdrawal([
                constants.exchangeRates.ONE_PERCENT
            ]);

            await testVault.jumpToNextDeposit();
            await testVault.user.deposit(principal * 0.7);

            await testVault.jumpFullRoundsToWithdrawal([
                constants.exchangeRates.ONE_COMP_2
            ]);

            await testVault.jumpToNextDeposit();
            await testVault.user.deposit(principal * 0.2);

            await testVault.jumpFullRoundsToWithdrawal([
                constants.exchangeRates.ONE_COMP_3
            ]);

            const expected = testVault.user.expectedResults;

            expect(expected.records.length).to.equal(3);
            expect(expected.initialPrincipal).to.equal(principal);
            expect(expected.totalDeposit).to.equal(principal + principal * 0.7 + principal * 0.2);
            expect(expected.totalWithdrawal).to.equal(0);
            expect(expected.percentGain).to.equal(1);
            expect(expected.totalProfit).to.be.approximately(46371, 1);
        });

        it("3-record ledger with withdrawal", async function () {
            const principal = 1_000_000;

            //create test fixture
            const testVault = new TestVault(vault, vaultToken, baseToken);
            testVault.addUser(addr1);
            await testVault.init();

            //deposit principal 
            await testVault.user.deposit(principal);

            await testVault.jumpFullRoundsToWithdrawal([
                constants.exchangeRates.ONE_PERCENT
            ]);

            await testVault.user.withdraw(testVault.convertToVaultToken(100000));

            await testVault.jumpFullRoundsToWithdrawal([
                constants.exchangeRates.ONE_COMP_2
            ]);

            await testVault.user.withdraw(testVault.convertToVaultToken(50000));

            await testVault.jumpFullRoundsToWithdrawal([
                constants.exchangeRates.ONE_COMP_3
            ]);

            const expected = testVault.user.expectedResults;

            expect(expected.records.length).to.equal(3);
            expect(expected.initialPrincipal).to.equal(principal);
            expect(expected.totalDeposit).to.equal(principal);
            expect(expected.totalWithdrawal).to.be.approximately(150000, 3);
            expect(expected.percentGain).to.equal(1);
            expect(expected.totalProfit).to.be.approximately(27791, 1);
            expect(expected.totalResult).to.be.approximately(877792, 1);
        });

        it("4-record ledger with withdrawal and deposit", async function () {
            const principal = 1_000_000;

            await baseToken.mint(addr1.address, mintAmount * 2);

            //create test fixture
            const testVault = new TestVault(vault, vaultToken, baseToken);
            testVault.addUser(addr1);
            await testVault.init();

            //deposit principal 
            await testVault.user.deposit(principal);

            await testVault.jumpFullRoundsToWithdrawal([
                constants.exchangeRates.ONE_PERCENT
            ]);

            await testVault.user.withdraw(testVault.convertToVaultToken(100000));

            await testVault.jumpFullRoundsToWithdrawal([
                constants.exchangeRates.ONE_COMP_2
            ]);

            await testVault.jumpToNextDeposit();
            await testVault.user.deposit(250000);

            await testVault.jumpFullRoundsToWithdrawal([
                constants.exchangeRates.ONE_COMP_3
            ]);

            await testVault.jumpFullRoundsToWithdrawal([
                constants.exchangeRates.ONE_COMP_4
            ]);

            const expected = testVault.user.expectedResults;

            expect(expected.records.length).to.equal(4);
            expect(expected.initialPrincipal).to.equal(principal);
            expect(expected.totalDeposit).to.equal(principal + 250000);
            expect(expected.totalWithdrawal).to.be.approximately(100000, 3);
            expect(expected.percentGain).to.equal(1);
            expect(expected.totalProfit).to.be.approximately(42599, 3);
            expect(expected.totalResult).to.be.approximately(1192599, 3);
        });

        it("double withdraw", async function () {
            const principal = 1_000_000;

            await baseToken.mint(addr1.address, principal);

            //create test fixture
            const testVault = new TestVault(vault, vaultToken, baseToken);
            testVault.addUser(addr1);
            await testVault.init();

            await testVault.jumpFullRoundsToWithdrawal([
                constants.exchangeRates.ONE_PERCENT,
                constants.exchangeRates.onePercentCompounding[1],
                constants.exchangeRates.onePercentCompounding[2],
                constants.exchangeRates.onePercentCompounding[3],
                constants.exchangeRates.onePercentCompounding[4],
                constants.exchangeRates.onePercentCompounding[5],
                constants.exchangeRates.onePercentCompounding[6]
            ]);

            await testVault.nextPhase(); //round 7 (0-based)
            await testVault.user.deposit(489050);

            await testVault.jumpFullRoundsToWithdrawal([
                constants.exchangeRates.onePercentCompounding[7],
                constants.exchangeRates.onePercentCompounding[8]
            ]);

            await testVault.user.withdraw(332034);
            //await testVault.user.withdraw(166844);
            await testVault.user.withdraw(parseInt(await vaultToken.balanceOf(addr1.address)));

            const expectedResults = testVault.user.expectedResults;
            const expectedProfit = expectedResults.totalProfit;

            expect(expectedProfit).to.be.approximately(9829, 3);
        });
    });
});