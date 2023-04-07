const { expect } = require("chai");
const { ethers } = require("hardhat");
const constants = require("../util/constants");
const deploy = require("../util/deploy");
const { expectRevert, expectEvent } = require("../util/testUtils");

describe(constants.VAULT_CONTRACT_ID + ": Admin Withdraw", function () {
    let vault, baseToken;               //contracts
    let owner, addr1, addr2, addr3;     //accounts
    const mintAmount = 1_000_000_000; 

    beforeEach(async function () {
        [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

        //contract
        [vaultToken, vault, baseToken] = await deploy.deployAll(false);
        await baseToken.mint(vault.address, mintAmount); 
    });

    describe("Vault Admin Withdraw Behavior", function () {

        it("can withdraw full amount", async function () {
            expect(parseInt(await baseToken.balanceOf(vault.address))).to.be.greaterThan(0); 
            const initialBalance = parseInt(await baseToken.balanceOf(owner.address)); 
            
            //withdraw 
            await vault.adminWithdraw(mintAmount); 

            expect(parseInt(await baseToken.balanceOf(vault.address))).to.equal(0);
            expect(parseInt(await baseToken.balanceOf(owner.address))).to.equal(initialBalance + mintAmount); 
        });

        it("can withdraw partial amount", async function () {
            expect(parseInt(await baseToken.balanceOf(vault.address))).to.equal(mintAmount);
            const initialBalance = parseInt(await baseToken.balanceOf(owner.address));
            const withdrawAmount = mintAmount / 10; 

            //withdraw 
            await vault.adminWithdraw(withdrawAmount);

            expect(parseInt(await baseToken.balanceOf(vault.address))).to.equal(mintAmount - withdrawAmount);
            expect(parseInt(await baseToken.balanceOf(owner.address))).to.equal(initialBalance + withdrawAmount); 
        });

        it("cannot withdraw if no balance", async function () {
            
            //get balance to zero 
            await vault.adminWithdraw(mintAmount);
            expect(parseInt(await baseToken.balanceOf(vault.address))).to.equal(0);
            
            //try to withdraw again 
            await expectRevert(
                () => vault.adminWithdraw(1),
                constants.errorMessages.TRANSFER_EXCEEDS_BALANCE
            ); 
        });

        it("cannot withdraw more than balance", async function () {
            await expectRevert(
                () => vault.adminWithdraw(mintAmount + 1),
                constants.errorMessages.TRANSFER_EXCEEDS_BALANCE
            ); 
        });
    });
});