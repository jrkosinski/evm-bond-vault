const { expect } = require("chai");
const { ethers } = require("hardhat");
const constants = require("../util/constants");
const deploy = require("../util/deploy");
const { expectRevert, expectEvent } = require("../util/testUtils");

describe(constants.TOKEN_CONTRACT_ID + ": Pausable", function () {
    let token, vault, baseToken;	    //contracts
    let owner, addr1, addr2, addr3; 	//accounts

    beforeEach(async function () {
        [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

        //contract
        [token, vault, baseToken] = await deploy.deployAll(false);

        await token.mint(owner.address, 10000);
        await token.mint(addr1.address, 10000);
        await token.mint(addr2.address, 10000);
        
        //get vault to withdraw phase
        await vault.progressToNextPhase([1, 1]);
        await vault.progressToNextPhase([1, 1]);
    });

    describe("Initial State", function () {
        it("initial value", async function () {
            expect(await token.paused()).to.equal(false);
        });
    });

    describe("Permissions", function () {
        it("admin can pause", async function () {
            await token.pause();
            expect(await token.paused()).to.equal(true);
        });

        it("admin can unpause", async function () {
            await token.pause();
            expect(await token.paused()).to.equal(true);

            await token.unpause();
            expect(await token.paused()).to.equal(false);
        });

        it("non-admin cannot pause", async function () {
            await expectRevert(
                () => token.connect(addr1).pause(),
                constants.errorMessages.CUSTOM_ACCESS_CONTROL(constants.roles.PAUSER, addr1.address)
            );
        });

        it("non-admin cannot unpause", async function () {
            await token.pause();
            await expectRevert(
                () => token.connect(addr1).unpause(),
                constants.errorMessages.CUSTOM_ACCESS_CONTROL(constants.roles.PAUSER, addr1.address)
            );
        });

        it("cannot pause when paused", async function () {
            await token.pause();
            await expectRevert(
                () => token.pause(),
                constants.errorMessages.PAUSED
            );
        });

        it("cannot unpause when not paused", async function () {
            await expectRevert(
                () => token.unpause(),
                constants.errorMessages.NOT_PAUSED
            );
        });
    });

    describe("Paused Behavior", function () {
        this.beforeEach(async function () {
            await token.pause();
        });

        it("cannot mint when paused", async function () {
            await expectRevert(
                () => token.mint(addr1.address, 1),
                constants.errorMessages.PAUSED
            );
        });

        it("cannot transfer when paused", async function () {
            await expectRevert(
                () => token.transfer(vault.address, 1),
                constants.errorMessages.TRANSFER_WHEN_PAUSED
            );
        });

        it("cannot approve when paused", async function () {
            await expectRevert(
                () => token.approve(addr1.address, 1),
                constants.errorMessages.PAUSED
            );
        });

        it("cannot transferFrom when paused", async function () {

            //unpause to approve, then repause 
            await token.unpause();
            await token.connect(addr1).approve(addr3.address, 1);
            await token.pause();

            await expectRevert(
                () => token.connect(addr3).transferFrom(addr1.address, addr2.address, 1),
                constants.errorMessages.TRANSFER_WHEN_PAUSED
            );
        });

        it("cannot burn when paused", async function () {
            await expectRevert(
                () => token.burn(1),
                constants.errorMessages.PAUSED
            );
        });
    });

    describe("Events", function () {
        it("pausing emits Paused", async function () {
            await expectEvent(
                () => token.pause(),
                "Paused", [owner.address]
            );
        });

        it("unpausing emits Unpaused", async function () {
            await token.pause();
            await expectEvent(
                () => token.unpause(),
                "Unpaused", [owner.address]
            );
        });
    });
});