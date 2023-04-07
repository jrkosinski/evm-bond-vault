const { expect } = require("chai");
const { ethers } = require("hardhat");
const constants = require("../util/constants");
const deploy = require("../util/deploy");

describe(constants.TOKEN_CONTRACT_ID + ": Introspection (ERC-165)", function () {
    let token;				    //contracts
    let owner, addr1; 		    //accounts

    beforeEach(async function () {
        [owner, addr1, ...addrs] = await ethers.getSigners();

        //contract
        token = await deploy.deployToken();
    });

    describe("Supports Interfaces", function () {
        it("supports correct interfaces: IERC20", async function () {
            expect(await token.supportsInterface(constants.interfaceIds.IERC20)).to.equal(true);
        });

        it("supports correct interfaces: IERC165", async function () {
            expect(await token.supportsInterface(constants.interfaceIds.IERC165)).to.equal(true);
        });

        it("doesn't support incorrect interfaces", async function () {
            expect(await token.supportsInterface("0x00000000")).to.equal(false);
            expect(await token.supportsInterface(constants.interfaceIds.IERC721)).to.equal(false);
            expect(await token.supportsInterface(constants.interfaceIds.IERC721)).to.equal(false);
            expect(await token.supportsInterface(constants.interfaceIds.IERC20Metadata)).to.equal(false);
        });
    });
});