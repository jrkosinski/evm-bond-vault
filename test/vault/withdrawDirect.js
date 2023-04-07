const { expect } = require("chai");
const { ethers } = require("hardhat");
const constants = require("../util/constants");
const deploy = require("../util/deploy");
const { expectRevert, expectEvent } = require("../util/testUtils");
const { grantRole } = require("../util/securityHelper"); 

describe(constants.VAULT_CONTRACT_ID + ": Direct Transfer Withdraw", function () {
    let vaultToken, vault, baseToken;       //contracts
    let owner, depositor, addr2; 	        //accounts
    
    beforeEach(async function () {
        [owner, depositor, addr2, ...addrs] = await ethers.getSigners();

        //contracts
        [vaultToken, vault, baseToken] = await deploy.deployAll(false);

        //give users some baseToken
        await baseToken.mint(depositor.address, 1_000_000_000);

        //add a bunch of vaultToken to the vault 
        vaultToken.mint(vault.address, 1_000_000_000);
        baseToken.mint(vault.address, 1_000_000_000);
    });

    async function depositToVault(amount) {
        await baseToken.connect(depositor).approve(vault.address, amount);
        await vault.connect(depositor).deposit(amount);
    }

    async function withdrawFromVault(depositor, amount) {
        await vaultToken.connect(depositor).transfer(vault.address, amount);
    }

    describe("Withdraw Direct", function () {
        it("successful withdraw", async function () {
            const depositAmount = constants.DEFAULT_MIN_DEPOSIT;

            //deposit 
            await depositToVault(depositAmount);

            //get all balances before 
            const depositor_baseToken_1 = parseInt(await baseToken.balanceOf(depositor.address));
            const vault_baseToken_1 = parseInt(await baseToken.balanceOf(vault.address));
            const vault_vaultToken_1 = parseInt(await vaultToken.balanceOf(vault.address));
            const depositor_vaultToken_1 = parseInt(await vaultToken.balanceOf(depositor.address));

            await vault.progressToNextPhase(constants.exchangeRates.PARITY); //locked
            await vault.progressToNextPhase(constants.exchangeRates.PARITY); //withdraw

            //withdraw
            const withdrawAmount = depositAmount;
            await withdrawFromVault(depositor, withdrawAmount); 

            //get all balances after 
            const depositor_baseToken_2 = parseInt(await baseToken.balanceOf(depositor.address));
            const vault_baseToken_2 = parseInt(await baseToken.balanceOf(vault.address));
            const vault_vaultToken_2 = parseInt(await vaultToken.balanceOf(vault.address));
            const depositor_vaultToken_2 = parseInt(await vaultToken.balanceOf(depositor.address));

            expect(depositor_baseToken_2).to.equal(depositor_baseToken_1 + withdrawAmount);
            expect(depositor_vaultToken_2).to.equal(depositor_vaultToken_1 - withdrawAmount);
            expect(vault_baseToken_2).to.equal(vault_baseToken_1 - withdrawAmount);
            expect(vault_vaultToken_2).to.equal(vault_vaultToken_1 + withdrawAmount);
        });

        it("withdraw by delegate", async function () {
            const depositAmount = constants.DEFAULT_MIN_DEPOSIT;
            const withdrawAmount = depositAmount;
            const spender = addr2; 

            //deposit 
            await depositToVault(depositAmount);

            //get all balances before 
            const depositor_baseToken_1 = parseInt(await baseToken.balanceOf(depositor.address));
            const vault_baseToken_1 = parseInt(await baseToken.balanceOf(vault.address));
            const vault_vaultToken_1 = parseInt(await vaultToken.balanceOf(vault.address));
            const depositor_vaultToken_1 = parseInt(await vaultToken.balanceOf(depositor.address));
            const spender_vaultToken_1 = parseInt(await vaultToken.balanceOf(spender.address));
            const spender_baseToken_1 = parseInt(await baseToken.balanceOf(spender.address));

            await vault.progressToNextPhase(constants.exchangeRates.PARITY); //locked
            await vault.progressToNextPhase(constants.exchangeRates.PARITY); //withdraw

            //approve a delegate as a spender 
            await vaultToken.connect(depositor).approve(spender.address, withdrawAmount); 

            //withdraw
            await vaultToken.connect(spender).transferFrom(depositor.address, vault.address, withdrawAmount); 

            //get all balances after 
            const depositor_baseToken_2 = parseInt(await baseToken.balanceOf(depositor.address));
            const vault_baseToken_2 = parseInt(await baseToken.balanceOf(vault.address));
            const vault_vaultToken_2 = parseInt(await vaultToken.balanceOf(vault.address));
            const depositor_vaultToken_2 = parseInt(await vaultToken.balanceOf(depositor.address));
            const spender_vaultToken_2 = parseInt(await vaultToken.balanceOf(spender.address));
            const spender_baseToken_2 = parseInt(await baseToken.balanceOf(spender.address));

            //depositor lost VT and gained BT 
            expect(depositor_baseToken_2).to.equal(depositor_baseToken_1 + withdrawAmount);
            expect(depositor_vaultToken_2).to.equal(depositor_vaultToken_1 - withdrawAmount);
            
            //vault lost BT and gained VT 
            expect(vault_baseToken_2).to.equal(vault_baseToken_1 - withdrawAmount);
            expect(vault_vaultToken_2).to.equal(vault_vaultToken_1 + withdrawAmount);
            
            //spender lost and gained nothing 
            expect(spender_baseToken_1).to.equal(spender_baseToken_2);
            expect(spender_vaultToken_1).to.equal(spender_vaultToken_2);
        });

        it("can't withdraw if vault doesn't have enough base token", async function () {

            const depositAmount = (await baseToken.balanceOf(depositor.address));
            const withdrawAmount = (await baseToken.balanceOf(vault.address));
            await vaultToken.mint(depositor.address, withdrawAmount);

            //deposit first 
            await depositToVault(depositAmount);

            //mint some extra vaultToken to user
            await vaultToken.mint(depositor.address, 100);

            await vault.progressToNextPhase(constants.exchangeRates.PARITY); //locked
            await vault.progressToNextPhase({ vaultToken: 1, baseToken: 4 }); //withdraw

            await expectRevert(
                () => withdrawFromVault(depositor, withdrawAmount),
                constants.errorMessages.TRANSFER_EXCEEDS_BALANCE
            );
        });

        it("can withdraw zero amount", async function () {

            const depositAmount = (await baseToken.balanceOf(depositor.address));
            const withdrawAmount = 0;

            //deposit first 
            await depositToVault(depositAmount);

            await vault.progressToNextPhase(constants.exchangeRates.PARITY); //locked
            await vault.progressToNextPhase({ vaultToken: 1, baseToken: 4 }); //withdraw

            await expect(vaultToken.connect(depositor).transfer(vault.address, withdrawAmount)).to.not.be.reverted;
        });

        it("can't withdraw more than balance", async function () {
            const depositAmount = constants.DEFAULT_MIN_DEPOSIT;

            //deposit first 
            await depositToVault(depositAmount);

            const withdrawAmount = (await vaultToken.balanceOf(depositor.address)) + 1;

            await vault.progressToNextPhase(constants.exchangeRates.PARITY); //locked
            await vault.progressToNextPhase({ vaultToken: 1, baseToken: 4 }); //withdraw

            await expectRevert(
                () => withdrawFromVault(depositor, withdrawAmount),
                constants.errorMessages.TRANSFER_EXCEEDS_BALANCE
            );
        });

        it("withdraw with base token transfer failure", async function () {
            const depositAmount = constants.DEFAULT_MIN_DEPOSIT;

            //deposit first 
            await depositToVault(depositAmount);

            const withdrawAmount = (await vaultToken.balanceOf(depositor.address));

            await vault.progressToNextPhase(constants.exchangeRates.PARITY); //locked
            await vault.progressToNextPhase({ vaultToken: 1, baseToken: 1 }); //withdraw
            
            await baseToken.setTransferEnabled(false);

            await expectRevert(
                () => withdrawFromVault(depositor, withdrawAmount),
                constants.errorMessages.VAULT_TOKEN_TRANSFER_FAILED
            );
        });
    });

    describe("Security", function () {
        it("only vaultToken can call withdrawDirect directly", async () => {
            await expectRevert(
                () => vault.withdrawDirect(1, owner.address),
                constants.errorMessages.VAULT_TOKEN_ONLY
            );
            
            const testAddr = addr2;
            
            await grantRole(vault, constants.roles.ADMIN, testAddr.address);
            await expectRevert(
                () => vault.withdrawDirect(1, testAddr.address),
                constants.errorMessages.VAULT_TOKEN_ONLY
            );

            await grantRole(vault, constants.roles.PAUSER, testAddr.address);
            await expectRevert(
                () => vault.withdrawDirect(1, testAddr.address),
                constants.errorMessages.VAULT_TOKEN_ONLY
            );

            await grantRole(vault, constants.roles.LIFECYCLE_MANAGER, testAddr.address);
            await expectRevert(
                () => vault.withdrawDirect(1, testAddr.address),
                constants.errorMessages.VAULT_TOKEN_ONLY
            );

            await grantRole(vault, constants.roles.WHITELIST_MANAGER, testAddr.address);
            await expectRevert(
                () => vault.withdrawDirect(1, testAddr.address),
                constants.errorMessages.VAULT_TOKEN_ONLY
            ); 
        });

        it("only vault can call withdrawDirect directly", async () => {
            await expectRevert(
                () => vaultToken.transferFromInternal(owner.address, owner.address, 1),
                constants.errorMessages.VAULT_ONLY
            );

            const testAddr = addr2;

            await grantRole(vault, constants.roles.ADMIN, testAddr.address);
            await expectRevert(
                () => vaultToken.transferFromInternal(testAddr.address, owner.address, 1),
                constants.errorMessages.VAULT_ONLY
            );

            await grantRole(vault, constants.roles.PAUSER, testAddr.address);
            await expectRevert(
                () => vaultToken.transferFromInternal(testAddr.address, owner.address, 1),
                constants.errorMessages.VAULT_ONLY
            );

            await grantRole(vault, constants.roles.LIFECYCLE_MANAGER, testAddr.address);
            await expectRevert(
                () => vaultToken.transferFromInternal(testAddr.address, owner.address, 1),
                constants.errorMessages.VAULT_ONLY
            );

            await grantRole(vault, constants.roles.WHITELIST_MANAGER, testAddr.address);
            await expectRevert(
                () => vaultToken.transferFromInternal(testAddr.address, owner.address, 1),
                constants.errorMessages.VAULT_ONLY
            );
        });
    });

    describe("Constraints", function () {
        it("can't transfer directly when paused", async () => {
            const depositAmount = constants.DEFAULT_MIN_DEPOSIT;

            //deposit 
            await depositToVault(depositAmount);
            
            //go to correct phase (withdraw) 
            await vault.progressToNextPhase([1, 1]);
            await vault.progressToNextPhase([1, 1]); 
            
            //pause 
            await vault.pause(); 
            
            await expectRevert(
                () => vaultToken.connect(depositor).transfer(vault.address, depositAmount),
                constants.errorMessages.PAUSED
            );
        });

        it("can't transfer directly when not in phase", async () => {
            const depositAmount = constants.DEFAULT_MIN_DEPOSIT;

            //deposit 
            await depositToVault(depositAmount);
            
            await vault.progressToNextPhase([1, 1]); 
            await expectRevert(
                () => vaultToken.connect(depositor).transfer(vault.address, depositAmount),
                constants.errorMessages.VAULT_OUT_OF_PHASE
            );
        });

        it("can't transferFrom directly when not in phase", async () => {
            const depositAmount = constants.DEFAULT_MIN_DEPOSIT;

            //deposit 
            await vaultToken.mint(addr2.address, depositAmount);

            await vault.progressToNextPhase([1, 1]);
            await vaultToken.connect(addr2).approve(depositor.address,depositAmount); 
            await expectRevert(
                () => vaultToken.connect(depositor).transferFrom(addr2.address, vault.address, depositAmount),
                constants.errorMessages.VAULT_OUT_OF_PHASE
            );
        });
    });

    describe.skip("Events", function () {
        //TODO: (MED) why no event?
        it.skip("Withdraw event fires on withdraw", async () => {
            const amountIn = constants.DEFAULT_MIN_DEPOSIT;;
            const expectedAmountOut = amountIn + (amountIn / 10);  //10% 

            //deposit first
            await depositToVault(amountIn);

            await vault.progressToNextPhase(constants.exchangeRates.PARITY); //locked
            await vault.progressToNextPhase(constants.exchangeRates.PARITY); //withdraw

            await expectEvent(() => 
                vaultToken.connect(depositor).transfer(vault.address, amountIn),
                "Withdraw", [depositor.address, amountIn, expectedAmountOut]
            );
        });
    });
});