const { expect } = require("chai");
const { ethers } = require("hardhat");
const constants = require("../util/constants");
const deploy = require("../util/deploy");
const testFlags = require("../testFlags");
const { exchangeRatesAreEqual, getProxyImplSize } = require("../util/testUtils");

describe(constants.VAULT_CONTRACT_ID + ": Initial Conditions", function () {
    let token, vault;	//contracts
    let owner, addr1, addr2; 	//accounts

    beforeEach(async function () {
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

        //contracts
        [token, vault] = await deploy.deployAll(false);
    });

    describe("Initial State", function () {

        it("token addresses", async function () {
            expect(await vault.vaultToken()).to.equal(token.address);
            expect(await vault.baseToken()).to.not.equal(constants.ZERO_ADDRESS);
            expect(await vault.baseToken()).to.not.equal(await vault.vaultToken());
        });

        it("token decimals", async function () {
            const vaultToken = await ethers.getContractAt(constants.TOKEN_CONTRACT_ID, await vault.vaultToken());
            const baseToken = await ethers.getContractAt(constants.TOKEN_CONTRACT_ID, await vault.baseToken());

            expect(await vaultToken.decimals()).to.equal(await baseToken.decimals());
        });

        it("exchange rate", async function () {
            expect(exchangeRatesAreEqual(
                await vault.currentExchangeRate(),
                constants.exchangeRates.PARITY
            )).to.be.true;
        });

        it("phase", async function () {
            expect(await vault.currentPhase()).to.equal(constants.vaultPhase.DEPOSIT);
        });

        it("minimum deposit", async function () {
            expect(await vault.minimumDeposit()).to.equal(constants.DEFAULT_MIN_DEPOSIT);
        });

        it("version", async function () {
            const version = await vault.version()
            expect(version.length).to.equal(2);
            expect(version[0]).to.equal(testFlags.upgradeVault ? 2 : 1);
        });

        it("contract size", async function () {
            const sizer = await deploy.deployContractSizer();
            const size = await sizer.getContractSize(vault.address);
            console.log(`Vault contract size is: ${size}`);
            expect(size).is.lessThan(24000);

            const implSize = await getProxyImplSize(sizer, vault.address);
            console.log(`Vault implementation size is: ${implSize}`);
            expect(implSize).is.lessThan(24000);
        });
    });
});