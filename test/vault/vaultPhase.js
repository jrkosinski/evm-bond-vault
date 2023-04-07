const { expect } = require("chai");
const { cons } = require("fp-ts/lib/NonEmptyArray2v");
const { ethers } = require("hardhat");
const constants = require("../util/constants");
const deploy = require("../util/deploy");
const { expectRevert, expectEvent, exchangeRatesAreEqual } = require("../util/testUtils");

describe(constants.VAULT_CONTRACT_ID + ": Vault Phase", function () {
    let vaultToken, vault, baseToken;       //contracts
    let owner, depositor;                           //accounts

    beforeEach(async function () {
        [owner, depositor, addr2, ...addrs] = await ethers.getSigners();

        //contracts
        [vaultToken, vault, baseToken] = await deploy.deployAll(false);

        //give users 1000 baseToken each 
        await baseToken.mint(depositor.address, 1000);

        //add a bunch of vaultToken to the vault 
        vaultToken.mint(vault.address, 1000000000);
    });

    describe("Set Vault Phase and Exchange Rate", function () {
        it("owner can change vault phase, exchange rate, and round", async function () {

            const testProgressPhase = async (rate, expectedPhase, expectedRound) => {
                await (vault.progressToNextPhase(rate));

                expect(await vault.currentPhase()).to.equal(expectedPhase);

                expect(exchangeRatesAreEqual(
                    await vault.currentExchangeRate(), rate
                )).to.be.true;
            }

            await testProgressPhase(
                constants.exchangeRates.ONE_PERCENT,
                constants.vaultPhase.LOCKED,
                1
            );

            await testProgressPhase(
                constants.exchangeRates.TWO_PERCENT,
                constants.vaultPhase.WITHDRAW,
                1
            );

            await testProgressPhase(
                constants.exchangeRates.PARITY,
                constants.vaultPhase.DEPOSIT,
                2
            );

            await testProgressPhase(
                constants.exchangeRates.THREE_PERCENT,
                constants.vaultPhase.LOCKED,
                2
            );

            await testProgressPhase(
                constants.exchangeRates.FIVE_PERCENT,
                constants.vaultPhase.WITHDRAW,
                2
            );

            await testProgressPhase(
                constants.exchangeRates.PARITY,
                constants.vaultPhase.DEPOSIT,
                3
            );
        });
    });

    async function depositToVault(amount) {
        await baseToken.connect(depositor).approve(vault.address, amount);
        await vault.connect(depositor).deposit(amount);
    }

    describe("Phase Restrictions", function () {
        it("cannot deposit when locked", async function () {
            const amount = constants.DEFAULT_MIN_DEPOSIT;

            //set vault into locked phase 
            await vault.progressToNextPhase({ vaultToken: 1, baseToken: 1 });

            await expectRevert(
                () => vault.connect(depositor).deposit(amount),
                constants.errorMessages.VAULT_OUT_OF_PHASE
            );
        });

        it("cannot deposit in withdraw phase", async function () {
            const amount = constants.DEFAULT_MIN_DEPOSIT;

            //set vault into locked phase 
            await vault.progressToNextPhase(constants.exchangeRates.PARITY);

            await expectRevert(
                () => vault.connect(depositor).deposit(amount),
                constants.errorMessages.VAULT_OUT_OF_PHASE
            );
        });

        it("cannot withdraw when locked", async function () {
            const amount = constants.DEFAULT_MIN_DEPOSIT;

            //deposit 
            await depositToVault(amount);

            //set vault into locked phase 
            await vault.progressToNextPhase(constants.exchangeRates.PARITY);

            await expectRevert(
                () => vault.connect(depositor).withdraw(amount),
                constants.errorMessages.VAULT_OUT_OF_PHASE
            );
        });

        it("cannot withdraw in deposit phase", async function () {
            const amount = constants.DEFAULT_MIN_DEPOSIT;

            //deposit 
            await depositToVault(amount);

            //set vault into locked phase 
            await vault.progressToNextPhase([1, 1]);

            await expectRevert(
                () => vault.connect(depositor).withdraw(amount),
                constants.errorMessages.VAULT_OUT_OF_PHASE
            );
        });
    });

    describe("Exchange Rate Restrictions", function () {
        it("cannot set exchange rate with 0 as numerator", async function () {
            await expectRevert(
                () => vault.progressToNextPhase({ vaultToken: 0, baseToken: 1 }),
                constants.errorMessages.ZERO_AMOUNT_ARGUMENT
            );
        });

        it("cannot set exchange rate with 0 as denominator", async function () {
            await expectRevert(
                () => vault.progressToNextPhase({ vaultToken: 1, baseToken: 0 }),
                constants.errorMessages.ZERO_AMOUNT_ARGUMENT
            );
        });
    });

    describe("Events", function () {
        it("PhaseChanged event fires when changing vault phase", async () => {
            const exchRate1 = constants.exchangeRates.ONE_COMP_2;
            const exchRate2 = constants.exchangeRates.ONE_COMP_4;

            await expectEvent(() => vault.progressToNextPhase(exchRate1),
                "PhaseChanged", [constants.vaultPhase.LOCKED], (evt) => {
                    expect(evt.args[1].a).to.equal(exchRate1.a);
                    expect(evt.args[1].b).to.equal(exchRate1.b);
                });

            await expectEvent(() => vault.progressToNextPhase(exchRate1),
                "PhaseChanged", [constants.vaultPhase.WITHDRAW], (evt) => {
                    expect(evt.args[1].a).to.equal(exchRate1.a);
                    expect(evt.args[1].b).to.equal(exchRate1.b);
                });

            await expectEvent(() => vault.progressToNextPhase(exchRate2),
                "PhaseChanged", [constants.vaultPhase.DEPOSIT], (evt) => {
                    expect(evt.args[1].a).to.equal(exchRate2.a);
                    expect(evt.args[1].b).to.equal(exchRate2.b);
                });

            await expectEvent(() => vault.progressToNextPhase(exchRate2),
                "PhaseChanged", [constants.vaultPhase.LOCKED], (evt) => {
                    expect(evt.args[1].a).to.equal(exchRate2.a);
                    expect(evt.args[1].b).to.equal(exchRate2.b);
                });
        });
    });
});