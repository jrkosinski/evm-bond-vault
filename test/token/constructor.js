const { expect } = require("chai");
const { ethers } = require("hardhat");
const constants = require("../util/constants");
const deploy = require("../util/deploy");
const { expectRevert, expectEvent } = require("../util/testUtils");

describe(constants.TOKEN_CONTRACT_ID + ": Constructor", function () {
    let securityManager;                //contracts
    let owner, addr1, addr2, addr3; 	//accounts

    beforeEach(async function () {
        [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

        //contract
        securityManager = await deploy.deploySecurityManager(); 
    });

    describe("Token Constructor", function () {
        it("can't pass zero address for security manager", async function () {
            await expectRevert(
                () => deploy.deployToken(constants.ZERO_ADDRESS),
                constants.errorMessages.ZERO_ADDRESS
            );
        });

        it("can't pass bogus security manager", async function () {
            await expectRevert(
                () => deploy.deployToken(owner.address),
                constants.errorMessages.LOWLEVEL_DELEGATE_CALL
            );
        });
    });
});