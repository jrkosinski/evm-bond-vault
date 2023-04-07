const { expect } = require("chai");
const { ethers } = require("hardhat");
const constants = require("../util/constants");
const deploy = require("../util/deploy");
const { expectEvent, expectRevert } = require("../util/testUtils");

describe(constants.TOKEN_CONTRACT_ID + ": Burning", function () {
    let token;				            //contracts
    let owner, addr1, addr2, addr3; 	//accounts

    beforeEach(async function () {
        [owner, addr1, addr2, addr3,...addrs] = await ethers.getSigners();

        //contract
        token = await deploy.deployToken();

        await token.mint(owner.address, 10000);
        await token.mint(addr1.address, 10000);
        await token.mint(addr2.address, 10000);
        await token.mint(addr3.address, 10000); 
    });

    describe("Initial State", function () {
        it("initial balances", async function () {
            expect(await token.balanceOf(addr1.address)).to.equal(10000);
            expect(await token.balanceOf(addr2.address)).to.equal(10000);
            expect(await token.balanceOf(addr3.address)).to.equal(10000);
        });
    });

    describe("Burning from Specific Addresses", function () {
        it("owner can burn own tokens", async function () {
            const burnQuantity = 1000; 
            const initialBalance = parseInt(await token.balanceOf(owner.address)); 
            const initialSupply = parseInt(await token.totalSupply()); 
            
            await token.burn(burnQuantity); 

            expect(await token.balanceOf(owner.address)).to.equal(initialBalance - burnQuantity); 
            expect(await token.totalSupply()).to.equal(initialSupply - burnQuantity); 
        });

        it("owner can't burn more than total owned by self", async function () {
            const initialBalance = parseInt(await token.balanceOf(owner.address));
            const burnQuantity = initialBalance + 1;

            await expectRevert(
                () => token.burn(burnQuantity),
                constants.errorMessages.BURN_EXCEEDED
            );
        });

        it("burn by non-authorized user is not allowed", async function () {
            await expectRevert(
                () => token.connect(addr1).burn(1),
                constants.errorMessages.CUSTOM_ACCESS_CONTROL(
                    constants.roles.TOKEN_BURNER, 
                    addr1.address
                )
            );
        });

        it("burning doesn't clear allowance", async function () {
            //create allowance 
            await token.approve(addr1.address, 100);
            expect(await token.allowance(owner.address, addr1.address)).to.equal(100);

            //burn 
            await token.burn(100);

            //allowance is now zero 
            expect(await token.allowance(owner.address, addr1.address)).to.equal(100);
        });

        it("burning doesn't clear partial allowance", async function () {
            //create allowance 
            await token.approve(addr1.address, 100);
            expect(await token.allowance(owner.address, addr1.address)).to.equal(100);

            //burn 
            await token.burn(50);

            //allowance is now zero 
            expect(await token.allowance(owner.address, addr1.address)).to.equal(100);
        }); 
    });

    describe("Burning Events", function () {
        it("burning emits Transfer", async function () {
            await expectEvent(
                () => token.burn(11),
                "Transfer",
                [owner.address, constants.ZERO_ADDRESS, 11]
            );
        });
    });
});