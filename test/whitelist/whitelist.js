const { expect } = require("chai");
const { ethers } = require("hardhat");
const constants = require("../util/constants");
const deploy = require("../util/deploy");
const { expectRevert, expectEvent, expectNoEvent } = require("../util/testUtils");
const { grantRole } = require("../util/securityHelper"); 

describe(constants.WHITELIST_CONTRACT_ID + ": Whitelist", function () {
    let vaultToken, vault, baseToken, whitelist, securityManagerAddr;                                //contracts
    let owner, whitelistManager, whitelisted, nonWhitelisted, depositManager, addr1, addr2; 	//accounts
    
    async function mintAll(token, amount) {
        await token.mint(owner.address, amount);
        await token.mint(whitelistManager.address, amount);
        await token.mint(whitelisted.address, amount);
        await token.mint(nonWhitelisted.address, amount);
        await token.mint(depositManager.address, amount);
        await token.mint(addr1.address, amount);
        await token.mint(addr2.address, amount); 
    }

    beforeEach(async function () {
        [owner, whitelistManager, whitelisted, nonWhitelisted, depositManager, addr1, addr2, ...addrs] = await ethers.getSigners();

        //contracts
        [vaultToken, vault, baseToken] = await deploy.deployAll(false);
        whitelist = await deploy.deployWhitelist(await vault.securityManager()); 
        securityManagerAddr = await vault.securityManager(); 
        
        //everyone gets base token and vault token 
        await mintAll(baseToken, 1_000_000_000);
        await mintAll(vaultToken, 1_000_000_000); 

        await baseToken.mint(vault.address, 1_000_000_000);
        
        //assign role to deposit manager 
        await grantRole(vault, constants.roles.WHITELIST_MANAGER, whitelistManager.address);
        await grantRole(vault, constants.roles.DEPOSIT_MANAGER, depositManager.address); 
    });

    describe("Initial State", function () {

        it("initial state of Vault", async function () {
            expect(await vault.whitelist()).to.equal(constants.ZERO_ADDRESS); 
        });

        describe("Initial State of Whitelist", function () {
            it("initial state of whitelist", async function () {
                expect(await whitelist.whitelistOn()).to.equal(true); 
                expect(await whitelist.securityManager()).to.equal(securityManagerAddr);
            });
            
            it("nobody is whitelisted", async function () {
                expect(await whitelist.isWhitelisted(owner.address)).to.equal(false);
                expect(await whitelist.isWhitelisted(whitelistManager.address)).to.equal(false);
                expect(await whitelist.isWhitelisted(whitelisted.address)).to.equal(false);
                expect(await whitelist.isWhitelisted(nonWhitelisted.address)).to.equal(false);
                expect(await whitelist.isWhitelisted(addr1.address)).to.equal(false);
                expect(await whitelist.isWhitelisted(addr2.address)).to.equal(false);
            });

            it("contract size", async function () {
                const sizer = await deploy.deployContractSizer();
                const size = await sizer.getContractSize(whitelist.address);
                console.log(`Whitelist contract size is: ${size}`);
                expect(size).is.lessThan(24000);
            });
        });
    });

    describe("Security", function () {
        beforeEach(async function () {
            await grantRole(vault, constants.roles.WHITELIST_MANAGER, whitelistManager.address); 
        });

        async function assertMaySetWhitelist(user, shouldBeAllowed = true) {
            if (shouldBeAllowed) {
                await expect(vault.connect(user).setWhitelist(user.address)).to.not.be.reverted;
                expect(await vault.whitelist()).to.equal(user.address); 
                await vault.connect(user).setWhitelist(constants.ZERO_ADDRESS);
                expect(await vault.whitelist()).to.equal(constants.ZERO_ADDRESS); 
            } else {
                await expect(vault.connect(user).setWhitelist(constants.ZERO_ADDRESS)).to.be.reverted;
            }
        }

        async function assertMaySetWhitelistOnOff(user, shouldBeAllowed = true) {
            if (shouldBeAllowed) {
                await expect(whitelist.connect(user).setWhitelistOnOff(false)).to.not.be.reverted;
                expect(await whitelist.whitelistOn()).to.equal(false);
                await whitelist.connect(user).setWhitelistOnOff(true);
                expect(await whitelist.whitelistOn()).to.equal(true);
            } else {
                await expect(whitelist.connect(user).setWhitelistOnOff(false)).to.be.reverted;
            }
        }

        async function assertMayAddRemoveWhitelist(user, shouldBeAllowed = true) {
            if (shouldBeAllowed) {
                expect(await whitelist.isWhitelisted(addr1.address)).to.equal(false);
                await expect(whitelist.connect(user).addRemoveWhitelist(addr1.address, true)).to.not.be.reverted;
                expect(await whitelist.isWhitelisted(addr1.address)).to.equal(true);
                await whitelist.connect(user).addRemoveWhitelist(addr1.address, false)
                expect(await whitelist.isWhitelisted(addr1.address)).to.equal(false);
            } else {
                await expect(whitelist.connect(user).addRemoveWhitelist(addr1.address, true)).to.be.reverted;
            }
        }
        
        describe("Security of Vault", function () {
            it("only admin or whitelist manager may set whitelist", async function () {
                await assertMaySetWhitelist(owner, true);
                await assertMaySetWhitelist(whitelistManager, true);
                await assertMaySetWhitelist(whitelisted, false);
                await assertMaySetWhitelist(nonWhitelisted, false);
                await assertMaySetWhitelist(addr1, false);
                await assertMaySetWhitelist(addr2, false); 
            });
        });
        
        describe("Security of Whitelist", function () {
            it("only owner may set whitelist on/off", async function () {
                await assertMaySetWhitelistOnOff(owner, true);
                await assertMaySetWhitelistOnOff(whitelisted, false);
                await assertMaySetWhitelistOnOff(nonWhitelisted, false);
                await assertMaySetWhitelistOnOff(addr1, false);
                await assertMaySetWhitelistOnOff(addr2, false); 
            });

            it("only owner may add/remove addresses to/from whitelist", async function () {
                await assertMayAddRemoveWhitelist(owner, true);
                await assertMayAddRemoveWhitelist(whitelisted, false);
                await assertMayAddRemoveWhitelist(nonWhitelisted, false);
                await assertMayAddRemoveWhitelist(addr1, false);
                await assertMayAddRemoveWhitelist(addr2, false); 
            });
        });
    });
    
    it("Whitelist Constructor", function () {
        it("can't pass zero address for security manager", async function () {
            await expectRevert(
                () => deploy.deployWhitelist(constants.ZERO_ADDRESS),
                constants.errorMessages.ZERO_ADDRESS
            );
        });

        it("can't pass bogus security manager", async function () {
            const vaultToken = await deploy.deployToken();
            await expectRevert(
                () => deploy.deployWhitelist(vaultToken.address),
                constants.errorMessages.LOWLEVEL_DELEGATE_CALL
            );
        });
    });

    async function assertCanDeposit(user, shouldBeAllowed = true) {
        while ((await vault.currentPhase()) != constants.vaultPhase.DEPOSIT) {
            await vault.progressToNextPhase(constants.exchangeRates.ONE_COMP_2);
        }

        await baseToken.connect(user).approve(vault.address, 100);
        if (shouldBeAllowed) {
            await expect(vault.connect(user).deposit(100)).to.not.be.reverted;
        } else {
            const expectedError = constants.errorMessages.VAULT_NOT_WHITELISTED(user.address);
            await expectRevert(
                () => vault.connect(user).deposit(100),
                expectedError
            );
        }
    }

    async function assertCanDepositFor(user, recipient, shouldBeAllowed = true) {
        while ((await vault.currentPhase()) != constants.vaultPhase.DEPOSIT) {
            await vault.progressToNextPhase(constants.exchangeRates.ONE_COMP_2);
        }
        
        const amount = 100;
        await baseToken.connect(user).approve(vault.address, amount);
        
        if (shouldBeAllowed) {
            await expect(vault.connect(user).depositFor(amount, recipient.address)).to.not.be.reverted;
        } else {
            const expectedError = "NotWhitelisted";
            await expectRevert(
                () => vault.connect(user).depositFor(amount, recipient.address),
                expectedError
            );
        }
    }

    async function assertCanWithdraw(user, shouldBeAllowed = true) {
        while ((await vault.currentPhase()) != constants.vaultPhase.WITHDRAW) {
            await vault.progressToNextPhase(constants.exchangeRates.ONE_COMP_2);
        }

        await vaultToken.connect(user).approve(vault.address, 100);
        if (shouldBeAllowed) {
            await expect(vault.connect(user).withdraw(100)).to.not.be.reverted;
        } else {
            const expectedError = constants.errorMessages.VAULT_NOT_WHITELISTED(user.address);
            await expectRevert(
                () => vault.connect(user).withdraw(100),
                expectedError
            );
        }
    }
    
    describe("Whitelisting", function () {
        beforeEach(async function () {
            await grantRole(vault, constants.roles.WHITELIST_MANAGER, whitelistManager.address);
            await vault.setWhitelist(whitelist.address); 
            await whitelist.setWhitelistOnOff(true);
        });

        it("whitelisted users can deposit to vault", async function () {
            assertCanDeposit(whitelisted);
            assertCanDepositFor(depositManager, whitelisted); 
        });

        it("whitelisted users can withdraw from vault", async function () {
            assertCanDeposit(whitelisted);
            assertCanDepositFor(depositManager, whitelisted); 
            assertCanWithdraw(whitelisted); 
        });

        it("non-whitelisted users cannot deposit to vault", async function () {
            assertCanDeposit(nonWhitelisted, false);
            assertCanDepositFor(depositManager, nonWhitelisted, false);
        });

        it("non-whitelisted users cannot withdraw from vault", async function () {
            assertCanDeposit(nonWhitelisted, false);
            assertCanWithdraw(nonWhitelisted, false); 
        });

        it("cannot whitelist zero address", async function () {
            await expectRevert(
                () => whitelist.addRemoveWhitelist(constants.ZERO_ADDRESS, true),
                constants.errorMessages.ZERO_ADDRESS
            );
        });
    });
    
    describe("Whitelist on/off, set/not set", function () {
        beforeEach(async function () {
            await vault.setWhitelist(whitelist.address);
            await whitelist.addRemoveWhitelist(whitelisted.address, true);
            await whitelist.addRemoveWhitelist(depositManager.address, true); 
        });
        
        it("non-whitelisted are rejected if whitelist is on, and set", async function () {
            await assertCanDeposit(nonWhitelisted, false);
            await assertCanDepositFor(depositManager, nonWhitelisted, false);
            await assertCanWithdraw(nonWhitelisted, false);
        });

        it("whitelisted are accepted if whitelist is on, and set", async function () {
            await assertCanDeposit(whitelisted, true);
            await assertCanDepositFor(depositManager, whitelisted, true);
            await assertCanWithdraw(whitelisted, true);
        });

        it("all are accepted if whitelist is on, but not set", async function () {
            await vault.setWhitelist(constants.ZERO_ADDRESS); 

            await assertCanDeposit(nonWhitelisted, true);
            await assertCanDepositFor(depositManager, nonWhitelisted, true);
            await assertCanWithdraw(nonWhitelisted, true);

            await assertCanDeposit(whitelisted, true);
            await assertCanDepositFor(depositManager, whitelisted, true);
            await assertCanWithdraw(whitelisted, true);
        });

        it("all are accepted if whitelist is set, but turned off", async function () {
            await whitelist.setWhitelistOnOff(false);

            await assertCanDeposit(nonWhitelisted, true);
            await assertCanDepositFor(depositManager, nonWhitelisted, true);
            await assertCanWithdraw(nonWhitelisted, true);

            await assertCanDeposit(whitelisted, true);
            await assertCanDepositFor(depositManager, whitelisted, true);
            await assertCanWithdraw(whitelisted, true);
        });
        
        describe("DepositFor special handling", async function() {
            beforeEach(async function () {
                await vault.setWhitelist(whitelist.address);
                await whitelist.setWhitelistOnOff(true);
            });
            
            it("depositor is whitelisted, but recipient is not", async function () {
                const recipient = nonWhitelisted;
                await whitelist.addRemoveWhitelist(depositManager.address, true);

                //preconditions
                expect(await whitelist.isWhitelisted(depositManager.address)).to.be.true;
                expect(await whitelist.isWhitelisted(recipient.address)).to.be.false;

                //should fail 
                await assertCanDepositFor(depositManager, nonWhitelisted, false);
            }); 

            it("depositor is not whitelisted, but recipient is", async function () {
                const recipient = whitelisted;
                await whitelist.addRemoveWhitelist(depositManager.address, false);

                //preconditions
                expect(await whitelist.isWhitelisted(depositManager.address)).to.be.false;
                expect(await whitelist.isWhitelisted(recipient.address)).to.be.true;

                //should fail 
                await assertCanDepositFor(depositManager, recipient, false);
            });

            it("neither depositor nor recipient is whitelisted", async function () {
                const recipient = nonWhitelisted;
                await whitelist.addRemoveWhitelist(depositManager.address, false);

                //preconditions
                expect(await whitelist.isWhitelisted(depositManager.address)).to.be.false;
                expect(await whitelist.isWhitelisted(recipient.address)).to.be.false;

                //should fail 
                await assertCanDepositFor(depositManager, recipient, false);
            });

            it("both depositor and recipient are whitelisted", async function () {
                const recipient = whitelisted;
                await whitelist.addRemoveWhitelist(depositManager.address, true);

                //preconditions
                expect(await whitelist.isWhitelisted(depositManager.address)).to.be.true;
                expect(await whitelist.isWhitelisted(recipient.address)).to.be.true;
                
                //should succeed
                await assertCanDepositFor(depositManager, recipient, true);
            }); 
        }); 
    });
    
    describe("Adding and Removing Addresses", function () {
        it("add single addresses", async function () {
            //expect not whitelisted
            expect(await whitelist.isWhitelisted(addr1.address)).to.be.false;
            expect(await whitelist.isWhitelisted(addr2.address)).to.be.false; 
            
            //add to whitelist 
            await whitelist.addRemoveWhitelist(addr1.address, true);
            await whitelist.addRemoveWhitelist(addr2.address, true); 

            //expect whitelisted 
            expect(await whitelist.isWhitelisted(addr1.address)).to.be.true;
            expect(await whitelist.isWhitelisted(addr2.address)).to.be.true; 
        });

        it("remove single addresses", async function () {
            //add to whitelist
            await whitelist.addRemoveWhitelist(addr1.address, true);
            await whitelist.addRemoveWhitelist(addr2.address, true);

            //expect whitelisted 
            expect(await whitelist.isWhitelisted(addr1.address)).to.be.true;
            expect(await whitelist.isWhitelisted(addr2.address)).to.be.true;
            
            //remove from whitelist 
            await whitelist.addRemoveWhitelist(addr1.address, false);
            await whitelist.addRemoveWhitelist(addr2.address, false);

            //expect not whitelisted
            expect(await whitelist.isWhitelisted(addr1.address)).to.be.false;
            expect(await whitelist.isWhitelisted(addr2.address)).to.be.false; 
        });

        it("add multiple addresses", async function () {
            const addresses = addrs.map(a => a.address); 
            
            //add an array 
            await whitelist.addRemoveWhitelistBulk(addresses, true); 
            
            //check that each one is added 
            for (let n = 0; n < addresses.length; n++) {
                expect(await whitelist.isWhitelisted(addresses[n])).to.be.true; 
            }
        });

        it("remove multiple addresses", async function () {
            const addresses = addrs.map(a => a.address); 
            
            //add an array 
            await whitelist.addRemoveWhitelistBulk(addresses, true);
            
            //choose a subset to remove 
            const toRemove = addresses.slice(3, 10); 
            
            //remove them
            await whitelist.addRemoveWhitelistBulk(toRemove, false);

            //check that each one is removed 
            for (let n = 0; n < addresses.length; n++) {
                expect(await whitelist.isWhitelisted(addresses[n])).to.equal(n < 3 || n >= 10); 
            }

            //remove the rest
            await whitelist.addRemoveWhitelistBulk(addresses, false);

            //check that each one is removed 
            for (let n = 0; n < addresses.length; n++) {
                expect(await whitelist.isWhitelisted(addresses[n])).to.be.false;
            }
        });
    }); 

    describe("Events", function () {
        it("WhitelistOnOffChanged event fires when whitelistOn changes", async () => {
            const on = await whitelist.whitelistOn();
            
            await expectEvent(() => whitelist.setWhitelistOnOff(!on),
                "WhitelistOnOffChanged", [owner.address, !on]);

            await expectEvent(() => whitelist.setWhitelistOnOff(on),
                "WhitelistOnOffChanged", [owner.address, on]);
        });

        it("WhitelistOnOffChanged doesn't fire when whitelistOn doesn't change", async () => {
            const on = await whitelist.whitelistOn();

            await expectNoEvent(() => whitelist.setWhitelistOnOff(on),
                "WhitelistOnOffChanged");
        });

        it("WhitelistAddedRemoved fires when a new address is added", async () => {
            await whitelist.addRemoveWhitelist(addr1.address, false); 

            await expectEvent(() => whitelist.addRemoveWhitelist(addr1.address, true),
                "WhitelistAddedRemoved", [owner.address, addr1.address, true]);
        });

        it("WhitelistAddedRemoved fires when an address is removed", async () => {
            await whitelist.addRemoveWhitelist(addr1.address, true);

            await expectEvent(() => whitelist.addRemoveWhitelist(addr1.address, false),
                "WhitelistAddedRemoved", [owner.address, addr1.address, false]);
        });

        it("WhitelistAddedRemoved doesn't fire when address already added", async () => {
            await whitelist.addRemoveWhitelist(addr1.address, true); 
            
            await expectNoEvent(() => whitelist.addRemoveWhitelist(addr1.address, true),
                "WhitelistAddedRemoved");
        });

        it("WhitelistAddedRemoved doesn't fire when address already removed", async () => {
            await whitelist.addRemoveWhitelist(addr1.address, false); 
            
            await expectNoEvent(() => whitelist.addRemoveWhitelist(addr1.address, false),
                "WhitelistAddedRemoved");
        });
    });
});