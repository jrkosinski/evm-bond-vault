const { BN } = require("bn.js");
const { expect } = require("chai");
const deploy = require("../util/deploy");
const constants = require("../util/constants");


describe("Math Functions", function () {
    let math;   //contracts

    beforeEach(async function () {
        math = await deploy.deployMathTestContract();
    });

    describe("Exchange Rates", function () {
        describe("With Equivalent Decimals", function () {
            it("1 to 1", async () => {
                const rate = constants.exchangeRates.PARITY;
                expect(await math.vaultToBaseTokenAtRate(331, rate)).to.equal(331);
                expect(await math.vaultToBaseTokenAtRate(1, rate)).to.equal(1);
                expect(await math.vaultToBaseTokenAtRate(4586909684958, rate)).to.equal(4586909684958);
            });

            describe("2 to 1", function () {
                it("a to b", async () => {
                    const rate = { vaultToken: 2, baseToken: 1 };
                    expect(await math.vaultToBaseTokenAtRate(331, rate)).to.equal(165);
                    expect(await math.vaultToBaseTokenAtRate(1, rate)).to.equal(0);
                });

                it("b to a", async () => {
                    const rate = { vaultToken: 2, baseToken: 1 };
                    expect(await math.baseToVaultTokenAtRate(165, rate)).to.equal(330);
                    expect(await math.baseToVaultTokenAtRate(1, rate)).to.equal(2);
                });
            });

            describe("1 usd == 0.0007745 eth", function () {
                it("a to b", async () => {
                    const rate = { vaultToken: 10_000_000, baseToken: "774500000000000" };
                    expect(await math.vaultToBaseTokenAtRate(4345, rate)).to.equal("336520250000");
                });

                it("b to a", async () => {
                    const rate = { vaultToken: 10_000_000, baseToken: "774500000000000" };
                    expect(await math.baseToVaultTokenAtRate("336520250000", rate)).to.equal(4345);
                });
            });
        });
    });
});