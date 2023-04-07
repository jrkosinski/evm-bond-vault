const { expect } = require("chai");
const { ethers } = require("hardhat");
const constants = require("../util/constants");
const deploy = require("../util/deploy");
const utils = require("../../scripts/lib/utils");
const { grantRole } = require("../util/securityHelper");
const { expectRevert, expectEvent } = require("../util/testUtils");
const testFlags = require("../testFlags");

describe(constants.SECURITY_CONTRACT_ID + ": Security Manager Basics", function () {
    let vault, vaultToken, baseToken, securityManager;  //contracts
    let admin, addr1, addr2; 	                        //accounts

    beforeEach(async function () {
        [admin, addr1, addr2, ...addrs] = await ethers.getSigners();

        //contract
        [vaultToken, vault, baseToken, whitelist, securityManager] = await deploy.deployAll(true);
    });

    describe("Restrictions", function () {
        
        this.beforeEach(async function() {
            await grantRole(vault, constants.roles.GENERAL_MANAGER, admin.address);
            await grantRole(vault, constants.roles.LIFECYCLE_MANAGER, admin.address);
            await grantRole(vault, constants.roles.TOKEN_BURNER, admin.address);
            await grantRole(vault, constants.roles.TOKEN_MINTER, admin.address);
            await grantRole(vault, constants.roles.UPGRADER, admin.address); 
        }); 
        
        it("cannot set zero address to vault security manager", async function () {
            await expectRevert(
                () => vault.setSecurityManager(constants.ZERO_ADDRESS), 
                constants.errorMessages.ZERO_ADDRESS
            )
        });

        it("cannot set zero address to vault token security manager", async function () {
            await expectRevert(
                () => vaultToken.setSecurityManager(constants.ZERO_ADDRESS),
                constants.errorMessages.ZERO_ADDRESS
            )
        });

        it("cannot set zero address to whitelist security manager", async function () {
            await expectRevert(
                () => whitelist.setSecurityManager(constants.ZERO_ADDRESS),
                constants.errorMessages.ZERO_ADDRESS
            )
        });

        it("cannot set bogus address", async function () {
            await expectRevert(
                () => vault.setSecurityManager(vault.address),
                "Transaction reverted: function selector was not recognized and there's no fallback function"
            ); 
        });

        it("admin cannot renounce admin role", async function () {

            //admin has admin role
            expect(await securityManager.hasRole(constants.roles.ADMIN, admin.address)).to.be.true;

            //try to renounce
            await securityManager.renounceRole(constants.roles.ADMIN, admin.address);
            
            //role not renounced (should fail silently)
            expect(await securityManager.hasRole(constants.roles.ADMIN, admin.address)).to.be.true;
        });

        it("admin can renounce non-admin role", async function () {

            //admin has role
            expect(await securityManager.hasRole(constants.roles.GENERAL_MANAGER, admin.address)).to.be.true;
            expect(await securityManager.hasRole(constants.roles.LIFECYCLE_MANAGER, admin.address)).to.be.true;

            //try to renounce
            await securityManager.renounceRole(constants.roles.GENERAL_MANAGER, admin.address);
            await securityManager.renounceRole(constants.roles.LIFECYCLE_MANAGER, admin.address);

            //role is renounced
            expect(await securityManager.hasRole(constants.roles.GENERAL_MANAGER, admin.address)).to.be.false;
            expect(await securityManager.hasRole(constants.roles.LIFECYCLE_MANAGER, admin.address)).to.be.false;
        });

        it("admin can revoke their own non-admin role", async function () {

            //admin has admin role
            expect(await securityManager.hasRole(constants.roles.GENERAL_MANAGER, admin.address)).to.be.true;
            expect(await securityManager.hasRole(constants.roles.LIFECYCLE_MANAGER, admin.address)).to.be.true;

            //try to renounce
            await securityManager.revokeRole(constants.roles.GENERAL_MANAGER, admin.address);
            await securityManager.revokeRole(constants.roles.LIFECYCLE_MANAGER, admin.address);

            //role is renounced
            expect(await securityManager.hasRole(constants.roles.GENERAL_MANAGER, admin.address)).to.be.false;
            expect(await securityManager.hasRole(constants.roles.LIFECYCLE_MANAGER, admin.address)).to.be.false;
        });

        it("admin cannot revoke their own admin role", async function () {

            //admin has admin role
            expect(await securityManager.hasRole(constants.roles.ADMIN, admin.address)).to.be.true;

            //try to renounce
            await securityManager.revokeRole(constants.roles.ADMIN, admin.address);

            //role not renounced (should fail silently)
            expect(await securityManager.hasRole(constants.roles.ADMIN, admin.address)).to.be.true;
        });

        it("admin role can be revoked by another admin", async function () {

            //grant admin to another 
            await securityManager.grantRole(constants.roles.ADMIN, addr1.address); 
            
            //now both users are admin 
            expect(await securityManager.hasRole(constants.roles.ADMIN, admin.address)).to.be.true;
            expect(await securityManager.hasRole(constants.roles.ADMIN, addr1.address)).to.be.true;
            
            //2 admins enter, 1 admin leaves
            await securityManager.connect(addr1).revokeRole(constants.roles.ADMIN, admin.address);
            
            //only one admin remains
            expect(await securityManager.hasRole(constants.roles.ADMIN, admin.address)).to.be.false;
            expect(await securityManager.hasRole(constants.roles.ADMIN, addr1.address)).to.be.true;
        });

        it("admin role can be transferred in two steps", async function () {
            
            const a = admin; 
            const b = addr1; 
            
            //beginning state: a is admin, b is not 
            expect(await securityManager.hasRole(constants.roles.ADMIN, a.address)).to.be.true;
            expect(await securityManager.hasRole(constants.roles.ADMIN, b.address)).to.be.false;
            
            //transfer in two steps 
            await securityManager.grantRole(constants.roles.ADMIN, b.address); 
            await securityManager.connect(b).revokeRole(constants.roles.ADMIN, a.address); 

            //beginning state: b is admin, a is not 
            expect(await securityManager.hasRole(constants.roles.ADMIN, a.address)).to.be.false;
            expect(await securityManager.hasRole(constants.roles.ADMIN, b.address)).to.be.true;

        });
        
        it("cannot renounce another address's role", async function() {
            await securityManager.grantRole(constants.roles.TOKEN_BURNER, addr1.address);
            await securityManager.grantRole(constants.roles.TOKEN_BURNER, addr2.address);

            expect(await securityManager.hasRole(constants.roles.TOKEN_BURNER, addr1.address)).to.be.true;
            expect(await securityManager.hasRole(constants.roles.TOKEN_BURNER, addr2.address)).to.be.true;

            await expectRevert(
                () => securityManager.connect(addr1).renounceRole(constants.roles.TOKEN_BURNER, addr2.address),
                constants.errorMessages.ACCESS_CONTROL_RENOUNCE
            ); 

            await expectRevert(
                () => securityManager.connect(addr2).renounceRole(constants.roles.TOKEN_BURNER, addr1.address),
                constants.errorMessages.ACCESS_CONTROL_RENOUNCE
            ); 

            await expect(securityManager.connect(addr1).renounceRole(constants.roles.TOKEN_BURNER, addr1.address)).to.not.be.reverted;
            await expect(securityManager.connect(addr2).renounceRole(constants.roles.TOKEN_BURNER, addr2.address)).to.not.be.reverted;
        })
    });

    describe("Shared Security", function () {
        let vaultToken2, vault2; 
        
        beforeEach(async function () {
            vaultToken2 = deploy.deployVault
        });
        
        it("security manager is shared between vault and vault token", async function () {
            expect(await vault.securityManager()).to.equal(await vaultToken.securityManager());
        });
        
        it("security roles are shared between vault and vault token", async function () {
            
            //admin can set security manager of both vault and token
            await expect(vault.setSecurityManager(securityManager.address)).to.not.be.reverted;
            await expect(vaultToken.setSecurityManager(securityManager.address)).to.not.be.reverted;
            
            //lose admin role 
            await securityManager.grantRole(constants.roles.ADMIN, addr1.address); 
            await securityManager.connect(addr1).revokeRole(constants.roles.ADMIN, admin.address); 
            
            //now can no longer 
            await expectRevert(
                () => vault.setSecurityManager(securityManager.address), 
                constants.errorMessages.CUSTOM_ACCESS_CONTROL(
                    constants.roles.ADMIN,
                    admin.address
                )
            );
            await expectRevert(
                () => vaultToken.setSecurityManager(securityManager.address),
                constants.errorMessages.CUSTOM_ACCESS_CONTROL(
                    constants.roles.ADMIN,
                    admin.address
                )
            ); 
        });

        it("can't pre-approve yourself and set new securityManager", async function () {
            const attacker = addr1; 
            const newSecMan = await deploy.deploySecurityManager(attacker); 
            
            //non-admin can't do it
            await expectRevert(
                () => vault.connect(attacker).setSecurityManager(newSecMan.address),
                constants.errorMessages.CUSTOM_ACCESS_CONTROL(constants.roles.ADMIN, attacker.address)
            ); 
            
            //but actual admin can set it 
            await expect(vault.setSecurityManager(newSecMan.address)).to.not.be.reverted;

            //and now non-admin can too 
            await expect(vault.connect(attacker).setSecurityManager(newSecMan.address)).to.not.be.reverted;
        });
    });
    
    describe("Construction", function() {
        it("can grant admin to self", async function() {
            const secMan = await deploy.deploySecurityManager();
            expect(await secMan.hasRole(constants.roles.ADMIN, admin.address)).to.be.true;
            expect(await secMan.hasRole(constants.roles.ADMIN, addr1.address)).to.be.false;
        }); 

        it("can grant admin to another", async function () {
            const secMan = await deploy.deploySecurityManager(addr1);
            expect(await secMan.hasRole(constants.roles.ADMIN, admin.address)).to.be.false;
            expect(await secMan.hasRole(constants.roles.ADMIN, addr1.address)).to.be.true;
        }); 
    });

    if (!testFlags.upgradeVault) { 
        describe("Deployer can Deploy on Behalf of Admin", function () {
            it("deploy vault token", async function () {
                const trueAdmin = addr1; 
                
                const secMan = await deploy.deploySecurityManager(trueAdmin);

                await expect(deploy.deployToken(secMan.address)).to.not.be.reverted;
            });
            
            it("deploy vault token and vault", async function () {
                const trueAdmin = addr1;

                const secMan = await deploy.deploySecurityManager(trueAdmin);

                const vt = await deploy.deployToken(secMan.address);

                //deploy vault 
                const vault = await utils.deployContractUpgradeableSilent(constants.VAULT_CONTRACT_ID, [
                    baseToken.address,
                    vt.address,
                    0,
                    secMan.address
                ]);
            });
        });
    }
    
    describe("Events", function () {
        it('rolegranted event fires on grantRole', async () => {
            expectEvent(async () => await securityManager.grantRole(constants.roles.GENERAL_MANAGER, addr1.address),
                "RoleGranted", [constants.roles.GENERAL_MANAGER, addr1.address, admin.address]);
        });

        it('roleRevoked event fires on revokeRole', async () => {
            await (grantRole(vault, constants.roles.GENERAL_MANAGER, addr1.address));

            expectEvent(async () => await securityManager.revokeRole(constants.roles.GENERAL_MANAGER, addr1.address),
                "RoleRevoked", [constants.roles.GENERAL_MANAGER, addr1.address, admin.address]);
        });

        it('roleRevoked event fires on renounceRole', async () => {
            await (grantRole(vault, constants.roles.GENERAL_MANAGER, addr1.address));

            expectEvent(async () => await securityManager.renounceRole(constants.roles.GENERAL_MANAGER, addr1.address),
                "RoleRevoked", [constants.roles.GENERAL_MANAGER, addr1.address, admin.address]);
        });
    });
});