const { expect } = require("chai");
const { ethers } = require("hardhat");
const constants = require("../util/constants");
const deploy = require("../util/deploy");
const { expectEvent, expectRevert } = require("../util/testUtils");

describe(constants.TOKEN_CONTRACT_ID + ": BEP20 Standard Adherence", function () {
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

    describe("BEP20 Compliance", function () {
        it("supported properties", async function () {
            expect(await token.name()).to.equal(constants.TOKEN_NAME);
            expect(await token.symbol()).to.equal(constants.TOKEN_SYMBOL);
            expect(await token.decimals()).to.equal(constants.DEFAULT_TOKEN_DECIMALS); 
        });

        it("getOwner method", async function () {
            expect(await token.getOwner()).to.equal(owner.address);
        });

        //skipped because user transfer is disabled 
        it.skip("transfer zero amount to non-vault address is allowed", async function () {
            await expect(token.transfer(addr1.address, 0)).to.not.be.reverted;
        });

        it("transfer zero amount to vault is allowed", async function () {
            await expect(token.transfer(vault.address, 0)).to.not.be.reverted;
        });

        //skipped because user transfer is disabled 
        it.skip("transferFrom zero amount to non-vault address is allowed", async function () {
            await token.approve(addr1.address, 10);
            await expect(token.connect(addr1).transferFrom(owner.address, addr2.address, 0)).to.not.be.reverted;
        });

        it("transferFrom zero amount to vault is allowed", async function () {
            await token.approve(addr1.address, 10);
            await expect(token.connect(addr1).transferFrom(owner.address, vault.address, 0)).to.not.be.reverted;
        });

        it("transfer to vault must emit Transfer event", async function () {
            await expectEvent(
                () => token.transfer(vault.address, 0),
                "Transfer",
                [owner.address, vault.address, 0]
            );
        });

        //skipped because user transfer is disabled 
        it.skip("transfer to non-vault address must emit Transfer event", async function () {
            await expectEvent(
                () => token.transfer(addr1.address, 0),
                "Transfer",
                [owner.address, addr1.address, 0]
            );
        });

        it("transferFrom to vault address must emit Transfer event", async function () {
            await token.approve(addr1.address, 10);
            await expectEvent(
                () => token.connect(addr1).transferFrom(owner.address, vault.address, 0),
                "Transfer",
                [owner.address, vault.address, 0]
            );
        });

        //skipped because user transfer is disabled 
        it.skip("transferFrom to non-vault address must emit Transfer event", async function () {
            await token.approve(addr1.address, 10); 
            await expectEvent(
                () => token.connect(addr1).transferFrom(owner.address, addr2.address, 0),
                "Transfer",
                [owner.address, addr2.address, 0]
            );
        });
    });

    describe("BEP20 Owner", function () {
        it("admin can change owner", async function () {
            expect(await token.getOwner()).to.equal(owner.address);

            await token.assignBep20Owner(addr1.address);
            expect(await token.getOwner()).to.equal(addr1.address);

            await token.assignBep20Owner(addr2.address);
            expect(await token.getOwner()).to.equal(addr2.address);
        });

        it("cannot assign zero address", async function () {
            await expectRevert(
                () => token.assignBep20Owner(constants.ZERO_ADDRESS),
                constants.errorMessages.ZERO_ADDRESS
            )
        });
    });
});