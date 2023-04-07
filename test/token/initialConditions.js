const { expect } = require("chai");
const { ethers } = require("hardhat");
const constants = require("../util/constants");
const deploy = require("../util/deploy");
const testFlags = require("../testFlags");
const { getProxyImplSize } = require("../util/testUtils"); 

describe(constants.TOKEN_CONTRACT_ID + ": Initial Conditions", function () {
    let token;				    //contracts
    let owner, addr1, addr2; 	//accounts

    beforeEach(async function () {
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

        //contract
        token = await deploy.deployToken();
    });

    describe("Initial State", function () {
        it("initial balances", async function () {
            expect(await token.totalSupply()).to.equal(constants.INITIAL_SUPPLY);

            expect(await token.balanceOf(owner.address)).to.equal(await token.totalSupply());
            expect(await token.balanceOf(addr1.address)).to.equal(0);
            expect(await token.balanceOf(addr2.address)).to.equal(0);
        });

        it("security", async function () {
            expect(await token.paused()).to.equal(false);
        });

        it("metadata", async function () {
            expect(await token.name()).to.equal(constants.TOKEN_NAME);
            expect(await token.symbol()).to.equal(constants.TOKEN_SYMBOL);
            expect(await token.decimals()).to.equal(constants.DEFAULT_TOKEN_DECIMALS);
        });

        it("version", async function () {
            const version = await token.version()
            expect(version.length).to.equal(2);
            expect(version[0]).to.equal(testFlags.upgradeToken ? 2 : 1);
        });

        it("vault address", async function () {
            expect(await token.vaultAddress()).to.equal(constants.ZERO_ADDRESS); 
        });

        it("contract size", async function () {
            const sizer = await deploy.deployContractSizer();
            let size = await sizer.getContractSize(token.address);
            console.log(`VaultToken contract size is: ${size}`);
            expect(size).is.lessThan(24000);
            
            const implSize = await getProxyImplSize(sizer, token.address);
            console.log(`VaultToken implementation size is: ${implSize}`);
            expect(implSize).is.lessThan(24000);
        });
    });
});