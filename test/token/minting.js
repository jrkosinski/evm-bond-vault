const { expect } = require("chai");
const { ethers } = require("hardhat");
const constants = require("../util/constants");
const deploy = require("../util/deploy");
const { expectEvent, expectRevert } = require("../util/testUtils");

describe(constants.TOKEN_CONTRACT_ID + ": Minting", function () {
    let token;				    //contracts
    let owner, addr1, addr2; 	//accounts

    beforeEach(async function () {
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

        //contract
        token = await deploy.deployToken();
    });

    describe("Basic Minting", function () {
        it("owner can mint to self", async function () {
            const quantity = 25000; 
            const initialBalance = parseInt(await token.balanceOf(owner.address)); 
            const initialSupply = parseInt(await token.totalSupply()); 
            await token.mint(owner.address, quantity); 
            
            //user balance and total supply have both increased 
            expect(await token.balanceOf(owner.address)).to.equal(initialBalance + quantity);
            expect(await token.totalSupply()).to.equal(initialSupply + quantity); 
        });

        it("owner can mint to another address", async function () {
            const quantity = 25000;
            const initialBalance = parseInt(await token.balanceOf(addr1.address));
            const initialSupply = parseInt(await token.totalSupply()); 
            await token.mint(addr1.address, quantity);

            //user balance and total supply have both increased 
            expect(await token.balanceOf(addr1.address)).to.equal(initialBalance + quantity); 
            expect(await token.totalSupply()).to.equal(initialSupply + quantity); 
        });

        it("cannot mint to zero address", async function () {
            await expectRevert(
                () => token.mint(constants.ZERO_ADDRESS, 1)
            );
        });
    });
    
    describe("Minting Permissions", function() {
        it("owner can mint", async function () {
            await expect(
                token.mint(addr1.address, 10)
            ).to.not.be.reverted;
        });

        it("non-admin cannot mint", async function () {
            //lack of permissions should result in revert 
            await expectRevert(
                () => token.connect(addr1).mint(addr2.address, 10),
                constants.errorMessages.CUSTOM_ACCESS_CONTROL(constants.roles.TOKEN_MINTER, addr1.address)
            );
            await expectRevert(
                () => token.connect(addr2).mint(owner.address, 10),
                constants.errorMessages.CUSTOM_ACCESS_CONTROL(constants.roles.TOKEN_MINTER, addr2.address)
            );
        });
    });

    describe("Minting Events", function () {
        it("minting emits transfer", async function () {
            await expectEvent(
                () => token.mint(addr1.address, 11),
                "Transfer", 
                [constants.ZERO_ADDRESS, addr1.address, 11]
            ); 
        });
    });
});