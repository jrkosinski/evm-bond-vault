const { expect } = require("chai");
const { ethers } = require("hardhat");
const constants = require("../util/constants");
const deploy = require("../util/deploy");
const { expectRevert, expectEvent } = require("../util/testUtils");
const { grantRole } = require("../util/securityHelper"); 

describe(constants.VAULT_CONTRACT_ID + ": Pausable", function () {
    let token, vault, baseToken;        //contracts
    let owner, addr1, addr2, addr3; 	//accounts

    beforeEach(async function () {
        [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

        //contract
        [token, vault, baseToken] = await deploy.deployAll(false);
        
        await baseToken.mint(addr1.address, 1_000_000);
        await baseToken.mint(vault.address, 1_000_000);
    });

    describe("Initial State", function () {
        it("initial value", async function () {
            expect(await vault.paused()).to.equal(false);
        });
    });

    describe("Permissions", function () {
        it("admin can pause", async function () {
            await vault.pause();
            expect(await vault.paused()).to.equal(true);
        });

        it("admin can unpause", async function () {
            await vault.pause();
            expect(await vault.paused()).to.equal(true);

            await vault.unpause();
            expect(await vault.paused()).to.equal(false);
        });

        it("non-admin cannot pause", async function () {
            await expectRevert(
                () => vault.connect(addr1).pause(),
                constants.errorMessages.CUSTOM_ACCESS_CONTROL(
                    constants.roles.PAUSER,
                    addr1.address
                )
            );
        });

        it("non-admin cannot unpause", async function () {
            await vault.pause();
            await expectRevert(
                () => vault.connect(addr1).unpause(),
                constants.errorMessages.CUSTOM_ACCESS_CONTROL(
                    constants.roles.PAUSER,
                    addr1.address
                )
            );
        });

        it("cannot pause when paused", async function () {
            await vault.pause();
            await expectRevert(
                () => vault.pause(),
                constants.errorMessages.PAUSED
            );
        });

        it("cannot unpause when not paused", async function () {
            await expectRevert(
                () => vault.unpause(),
                constants.errorMessages.NOT_PAUSED
            );
        });
    });

    describe("Paused Behavior", function () {
        this.beforeEach(async function () {
            await vault.pause();
        });

        it("cannot deposit when paused", async function () {

            //unpause to approve, then repause 
            await vault.unpause();
            await baseToken.connect(addr1).approve(vault.address, 1);
            await vault.pause();

            await expectRevert(
                () => vault.connect(addr1).deposit(1),
                constants.errorMessages.PAUSED
            );
        });

        it("cannot depositFor when paused", async function () {
            
            //unpause to approve, then repause 
            await vault.unpause();
            await baseToken.connect(addr1).approve(vault.address, 1);
            await vault.pause();

            await expectRevert(
                () => vault.connect(addr1).depositFor(1, addr2.address),
                constants.errorMessages.PAUSED
            );
        });

        it("cannot withdraw when paused", async function () {
            const amount = constants.DEFAULT_MIN_DEPOSIT;
            
            //unpause to deposit/approve, then repause 
            await vault.unpause();
            
            //deposit 
            await baseToken.connect(addr1).approve(vault.address, amount);
            await vault.connect(addr1).deposit(amount); 
            
            await vault.progressToNextPhase(constants.exchangeRates.PARITY); //locked phase 
            await vault.progressToNextPhase(constants.exchangeRates.PARITY); //withdraw phase 

            //approve for withdrawal 
            await token.connect(addr1).approve(vault.address, amount);
            
            await vault.pause();
            
            await expectRevert(
                () => vault.connect(addr1).withdraw(amount),
                constants.errorMessages.PAUSED
            );
        });

        it("cannot move to next phase when paused", async function () {
            await expectRevert(
                () => vault.progressToNextPhase(constants.exchangeRates.PARITY),
                constants.errorMessages.PAUSED
            );
        });

        it("cannot set whitelist when paused", async function () {
            const whitelist = await deploy.deployWhitelist(await vault.securityManager()); 
            
            await expectRevert(
                () => vault.setWhitelist(whitelist.address),
                constants.errorMessages.PAUSED
            );
        });
    });

    describe("Events", function () {
        it("pausing emits Paused", async function () {
            await expectEvent(
                () => vault.pause(),
                "Paused", [owner.address]
            );
        });

        it("unpausing emits Unpaused", async function () {
            await vault.pause();
            await expectEvent(
                () => vault.unpause(),
                "Unpaused", [owner.address]
            );
        });
    });
});