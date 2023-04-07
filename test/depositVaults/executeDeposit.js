const { expect } = require("chai");
const { ethers } = require("hardhat");
const constants = require("../util/constants");
const deploy = require("../util/deploy");
const { expectEvent, expectRevert } = require("../util/testUtils");

describe(constants.TOKEN_CONTRACT_ID + ": Execute Deposit", function () {
    let vaultToken, vault, baseToken, depositVault;	    //contracts
    let owner, recipient, addr2, addr3; 	        //accounts
    let dummyTxId = "0xc7c8a64567d80015956578d4da93de2aa1a0148a570c5d3ef8146c693f7db302"; 
    let minDeposit = 0; 

    beforeEach(async function () {
        [owner, recipient, addr2, addr3, ...addrs] = await ethers.getSigners();

        //contract
        [vaultToken, vault, baseToken, whitelist, securityManager] = await deploy.deployAll(true);
        
        //create deposit vault 
        depositVault = await deploy.deployDepositVault(
            vault.address, 
            baseToken.address
        );
        
        minDeposit = parseInt(await vault.minimumDeposit()); 
        
        //add users to whitelist 
        await whitelist.addRemoveWhitelist(owner.address, true);
        await whitelist.addRemoveWhitelist(recipient.address, true);
        await whitelist.addRemoveWhitelist(depositVault.address, true);
        
        //mint base token to deposit vault 
        await baseToken.mint(depositVault.address, parseInt(await vault.minimumDeposit()) * 2);
        
        //grant permission to the deposit Vault and caller
        await securityManager.grantRole(constants.roles.DEPOSIT_MANAGER, depositVault.address);
        await securityManager.grantRole(constants.roles.DEPOSIT_MANAGER, owner.address); 
    });

    describe("FinalizeDeposit Constraints", function () {
        
     //{ TokenTransferFailed } - if either`baseToken`.transferFrom or`vaultToken`.transfer returns false.
     // { NotWhitelisted } - if caller or `forAddress` is not whitelisted(if the Vault has whitelisting)
     
        it("can finalizeDeposit less than balance", async function () {
            const vaultBalance = parseInt(await baseToken.balanceOf(vault.address));
            const depositVaultBalance = parseInt(await baseToken.balanceOf(depositVault.address)); 
            
            expect(parseInt(await baseToken.balanceOf(recipient.address))).to.equal(0);
            expect(depositVaultBalance).to.be.greaterThan(0); 
            expect(vaultBalance).to.equal(0);
            expect(parseInt(await vaultToken.balanceOf(recipient.address))).to.equal(0); 
            
            const depositAmount = minDeposit; 
            
            //deposit on behalf of recipient 
            await depositVault.finalizeDeposit(depositAmount, dummyTxId, recipient.address); 

            expect(parseInt(await baseToken.balanceOf(depositVault.address))).to.equal(depositVaultBalance - depositAmount);
            expect(parseInt(await baseToken.balanceOf(vault.address))).to.equal(vaultBalance + depositAmount);
            expect(parseInt(await vaultToken.balanceOf(recipient.address))).to.equal(depositAmount); 
        });
        
        it("can finalizeDeposit exact amount of balance", async function () {
            const vaultBalance = parseInt(await baseToken.balanceOf(vault.address));
            const depositVaultBalance = parseInt(await baseToken.balanceOf(depositVault.address));

            expect(parseInt(await baseToken.balanceOf(recipient.address))).to.equal(0);
            expect(depositVaultBalance).to.be.greaterThan(0);
            expect(vaultBalance).to.equal(0);
            expect(parseInt(await vaultToken.balanceOf(recipient.address))).to.equal(0); 

            const depositAmount = depositVaultBalance;

            //deposit on behalf of recipient 
            await depositVault.finalizeDeposit(depositAmount, dummyTxId, recipient.address);

            expect(parseInt(await baseToken.balanceOf(depositVault.address))).to.equal(depositVaultBalance - depositAmount);
            expect(parseInt(await baseToken.balanceOf(vault.address))).to.equal(vaultBalance + depositAmount);
            expect(parseInt(await vaultToken.balanceOf(recipient.address))).to.equal(depositAmount); 
        });
        
        it("cannot finalizeDeposit zero amount", async function () {
            await expectRevert(
                () => depositVault.finalizeDeposit(0, dummyTxId, recipient.address), 
               constants.errorMessages.ZERO_AMOUNT_ARGUMENT 
            ); 
        });
        
        it("cannot finalizeDeposit if depositVault is not authorized", async function () {
            await securityManager.revokeRole(constants.roles.DEPOSIT_MANAGER, depositVault.address); 
            expect(await securityManager.hasRole(constants.roles.DEPOSIT_MANAGER, depositVault.address)).to.equal(false); 
            
            await expectRevert(
                () => depositVault.finalizeDeposit(1_000_000_000, dummyTxId, recipient.address),
                constants.errorMessages.CUSTOM_ACCESS_CONTROL(
                    constants.roles.DEPOSIT_MANAGER, depositVault.address
                )
            ); 
        });

        it("cannot finalizeDeposit if caller is not authorized", async function () {
            await securityManager.revokeRole(constants.roles.DEPOSIT_MANAGER, owner.address);
            expect(await securityManager.hasRole(constants.roles.DEPOSIT_MANAGER, owner.address)).to.equal(false);

            await expectRevert(
                () => depositVault.finalizeDeposit(1_000_000_000, dummyTxId, recipient.address),
                constants.errorMessages.CUSTOM_ACCESS_CONTROL(
                    constants.roles.DEPOSIT_MANAGER, owner.address
                )
            );
        });
        
        it("cannot finalizeDeposit more than balance", async function () {
            const depositAmount = parseInt(await baseToken.balanceOf(depositVault.address)) + 1;
            await expectRevert(
                () => depositVault.finalizeDeposit(depositAmount, dummyTxId, recipient.address),
                constants.errorMessages.INSUFFICIENT_AMOUNT
            ); 
        });

        it("cannot finalizeDeposit out of phase", async function () {
            await vault.progressToNextPhase([1, 1]);
            const depositAmount = minDeposit; 

            await expectRevert(
                () => depositVault.finalizeDeposit(depositAmount, dummyTxId, recipient.address),
                constants.errorMessages.VAULT_OUT_OF_PHASE
            ); 
        });

        it("cannot finalizeDeposit less than minimum deposit", async function () {
            expect(parseInt(await vault.minimumDeposit())).to.be.greaterThan(1); 
            
            await expectRevert(
                () => depositVault.finalizeDeposit(1, dummyTxId, recipient.address),
                constants.errorMessages.VAULT_DEPOSIT_BELOW_MINIMUM
            ); 
        });

        it("cannot finalizeDeposit when vault is paused", async function () {
            
            //pause vault 
            await vault.pause();    
            expect(await vault.paused()).to.be.true; 
            
            await expectRevert(
                () => depositVault.finalizeDeposit(minDeposit, dummyTxId, recipient.address),
                constants.errorMessages.PAUSED
            );
        });

        it("cannot finalizeDeposit when designated recipient is not whitelisted", async function () {

            //remove recipient from whitelist 
            await whitelist.addRemoveWhitelist(recipient.address, false);

            expect(await whitelist.isWhitelisted(recipient.address)).to.be.false;
            expect(await whitelist.isWhitelisted(depositVault.address)).to.be.true;

            await expectRevert(
                () => depositVault.finalizeDeposit(minDeposit, dummyTxId, recipient.address),
                constants.errorMessages.VAULT_NOT_WHITELISTED(recipient.address)
            );
        });

        it("cannot finalizeDeposit when depositVault is not whitelisted", async function () {
            
            //remove depositVault from whitelist 
            await whitelist.addRemoveWhitelist(depositVault.address, false);

            expect(await whitelist.isWhitelisted(recipient.address)).to.be.true;
            expect(await whitelist.isWhitelisted(depositVault.address)).to.be.false;

            await expectRevert(
                () => depositVault.finalizeDeposit(minDeposit, dummyTxId, recipient.address),
                constants.errorMessages.VAULT_NOT_WHITELISTED(depositVault.address)
            );
        });
    });
    
    describe("Events", function () {

        it("finalizeDeposit emits DepositExecuted event", async function () {

            const depositAmount = minDeposit;

            expectEvent(async () => 
                await depositVault.finalizeDeposit(depositAmount, dummyTxId, recipient.address),
                "DepositExecuted", [dummyTxId, recipient.address, depositAmount]);
        });
    }); 
});