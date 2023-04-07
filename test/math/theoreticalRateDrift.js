const { BN } = require("bn.js");
const { expect } = require("chai");
const deploy = require("../util/deploy");
const constants = require("../util/constants");
const mathUtils = require("../util/mathUtils");
const { ExchangeRate } = require("../util/exchangeRate");

const SIMPLE_TOLERANCE = 0.0001;
const COMPOUND_TOLERANCE = 0.0001;
const INITIAL_PRINCIPAL = 1000000000;
const STEADY_YIELD_PERCENT = 1;
const NUM_ROUNDS = 200;

class MockVault {
    constructor() {
        this.exchangeRate = new ExchangeRate(1, 1);
        this.useWholeNumberDivision = false;
        this.mathContract = null;
    }

    async deposit(baseTokenAmount) {
        return this.useWholeNumberDivision ?
            await this.mathContract.baseToVaultTokenAtRate(baseTokenAmount, {
                vaultToken: this.exchangeRate.vaultToken.toString(),
                baseToken: this.exchangeRate.baseToken.toString()
            }) :
            this.exchangeRate.baseToVaultToken(baseTokenAmount);
    }

    async withdraw(vaultTokenAmount) {
        return this.useWholeNumberDivision ?
            await this.mathContract.vaultToBaseTokenAtRate(vaultTokenAmount, {
                vaultToken: this.exchangeRate.vaultToken.toString(),
                baseToken: this.exchangeRate.baseToken.toString()
            }) :
            this.exchangeRate.vaultToBaseToken(vaultTokenAmount);
    }
}


describe("Tracking Exchange Rate Drift", function () {
    let math, vault;   //contracts

    beforeEach(async function () {
        math = await deploy.deployMathTestContract();
        vault = new MockVault();
        vault.mathContract = math;
    });

    function isPercentGain(before, after, percent) {
        const gain = after - before;
        const pct = gain / before * 100;
        //console.log(`diff is ${Math.abs(percent - pct)}`);
        expect(pct).to.be.approximately(percent, SIMPLE_TOLERANCE);
    }

    async function execRound(principal, expectedGainPct) {
        const vaultTokenAmount = await vault.deposit(principal);

        vault.exchangeRate = ExchangeRate.increaseByPercent(vault.exchangeRate, 1);

        //console.log(`rate is ${vault.exchangeRate.a}:${vault.exchangeRate.b}`);
        const amountReceived = await vault.withdraw(vaultTokenAmount);
        //console.log(`amountReceived is ${amountReceived.toString()}`);

        return amountReceived;
    }

    async function runTestSimple(
        initialPrincipal,
        expectedGainPct = 1,
        wholeNumberDivision = false) {
        let principal = initialPrincipal;
        vault.useWholeNumberDivision = wholeNumberDivision;

        for (let n = 0; n < NUM_ROUNDS; n++) {
            //console.log("round", n);
            const amountReceived = await execRound(principal, expectedGainPct);

            expect(isPercentGain(principal, amountReceived, expectedGainPct));

            //amount received is new principal 
            principal = amountReceived;
        }
    }

    async function runTestCompound(
        initialPrincipal,
        expectedGainPct = 1,
        wholeNumberDivision = false) {
        let principal = initialPrincipal;
        vault.useWholeNumberDivision = wholeNumberDivision;

        for (let n = 0; n < NUM_ROUNDS; n++) {
            //console.log("round", n);
            const amountReceived = await execRound(principal, expectedGainPct, wholeNumberDivision);

            expect(isPercentGain(principal, amountReceived, expectedGainPct));
            principal = amountReceived;

            //compare yield over time to the expected compound yield 
            const expectedCompound = mathUtils.compoundRepeat(initialPrincipal, 100, (n + 1));
            const expectedProfit = expectedCompound - initialPrincipal;
            //console.log(`expected comounded profit: ${expectedProfit}`);

            const actualProfit = principal - initialPrincipal;
            //console.log(`actual total: ${actualProfit}`);

            const profitDiff = Math.abs(expectedProfit - actualProfit);
            const diffPercent = mathUtils.xIsWhatPercentOfy(profitDiff, actualProfit);

            //console.log(`compound diff: ${profitDiff}`); 
            //console.log(`diff percent:${diffPercent}`)
            expect(diffPercent).to.be.lessThan(COMPOUND_TOLERANCE);

            //console.log();
        }
    }

    describe("With Floating-Point Division", function () {
        /**
         * After many rounds of increasing the exchange rate by 1%, check the following things: 
         * - is the yield from single round to round what is expected within a small % tolerance (does it drift over time)
         */
        it("many rounds tracking simple yield", async () => {
            await runTestSimple(INITIAL_PRINCIPAL, STEADY_YIELD_PERCENT);
        });

        /**
         * After many rounds of increasing the exchange rate by 1%, check the following things: 
         * - if anyone has let their investment compound for n rounds, is their actual compounded yield what is expected 
         * within a small % tolerance (does it drift over time)
         * - is the yield from single round to round what is expected within a small % tolerance (does it drift over time)
         */
        it("many rounds tracking compound yield", async () => {
            await runTestCompound(INITIAL_PRINCIPAL, STEADY_YIELD_PERCENT);
        });
    });

    describe("With Whole-Number Division", function () {
        /**
         * After many rounds of increasing the exchange rate by 1%, check the following things: 
         * - is the yield from single round to round what is expected within a small % tolerance (does it drift over time)
         */
        it("many rounds tracking simple yield", async () => {
            await runTestSimple(INITIAL_PRINCIPAL, STEADY_YIELD_PERCENT, true);
        });

        /**
         * After many rounds of increasing the exchange rate by 1%, check the following things: 
         * - if anyone has let their investment compound for n rounds, is their actual compounded yield what is expected 
         * within a small % tolerance (does it drift over time)
         * - is the yield from single round to round what is expected within a small % tolerance (does it drift over time)
         */
        it("many rounds tracking compound yield", async () => {
            await runTestCompound(INITIAL_PRINCIPAL, STEADY_YIELD_PERCENT, true);
        });
    });
});