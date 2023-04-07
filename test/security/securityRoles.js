const { expect } = require("chai");
const { ethers } = require("hardhat");
const constants = require("../util/constants");
const deploy = require("../util/deploy");
const utils = require("../../scripts/lib/utils");
const { grantRole, renounceRole, hasRole, revokeRole } = require("../util/securityHelper");
const { expectRevert, expectEvent } = require("../util/testUtils");

describe(constants.SECURITY_CONTRACT_ID + ": Security Permissions", function () {
    let vault, vaultToken, baseToken, securityManager, whitelist, depositVault;  //contracts
    let admin, pauser, minter, burner, upgrader, generalManager, lifecycleManager, 
        whitelistManager, depositManager, addr1, addr2; 
    let nonAdminRoles, allRoles = []; 
    let minDeposit = 0;

    beforeEach(async function () {
        [admin, pauser, minter, burner, upgrader, generalManager, 
            lifecycleManager, whitelistManager, depositManager, addr1, addr2, ...addrs] = await ethers.getSigners();

        //contract
        [vaultToken, vault, baseToken, whitelist, securityManager] = await deploy.deployAll(true);
        
        depositVault = await deploy.deployDepositVault(
            vault.address, 
            baseToken.address
        ); 

        nonAdminRoles = [
            pauser, minter, burner, upgrader,
            generalManager, lifecycleManager,
            whitelistManager, depositManager
        ];
        allRoles = [admin, ...nonAdminRoles]; 
        
        minDeposit = parseInt(await vault.minimumDeposit()); 
        
        //mint base token 
        await baseToken.mint(vault.address, minDeposit); 
        for (let u of allRoles) {
            await baseToken.mint(u.address, minDeposit); 
        }
        await baseToken.mint(addr1.address, minDeposit);
        await baseToken.mint(addr2.address, minDeposit);
        await baseToken.mint(depositVault.address, minDeposit); 
        
        //mint vault token 
        for (let u of allRoles) {
            await vaultToken.mint(u.address, minDeposit);
        }
        await vaultToken.mint(addr1.address, minDeposit);
        await vaultToken.mint(addr2.address, minDeposit); 
        
        //assign roles 
        await securityManager.grantRole(constants.roles.ADMIN, admin.address);
        await securityManager.grantRole(constants.roles.TOKEN_MINTER, minter.address); 
        await securityManager.grantRole(constants.roles.TOKEN_BURNER, burner.address);
        await securityManager.grantRole(constants.roles.PAUSER, pauser.address);
        await securityManager.grantRole(constants.roles.LIFECYCLE_MANAGER, lifecycleManager.address);
        await securityManager.grantRole(constants.roles.DEPOSIT_MANAGER, depositManager.address);
        await securityManager.grantRole(constants.roles.GENERAL_MANAGER, generalManager.address);
        await securityManager.grantRole(constants.roles.WHITELIST_MANAGER, whitelistManager.address);
        await securityManager.grantRole(constants.roles.UPGRADER, upgrader.address);
        await securityManager.grantRole(constants.roles.DEPOSIT_MANAGER, depositVault.address); 
        
        //turn off whitelist 
        await whitelist.setWhitelistOnOff(false); 
    });


    async function assertCan(func) {
        await expect(
            func()
        ).to.not.be.reverted;
    }

    async function assertCannot(func, expectedError) {
        await expectRevert(
            () => func(),
            expectedError
        );
    }

    async function assertGrantRolePermission(account, expectAllowed = true) {
        const func = async () => { await grantRole(securityManager, constants.roles.GENERAL_MANAGER, addr1.address, account); }
        if (expectAllowed)
            await assertCan(func);
        else
            await assertCannot(
                func,
                constants.errorMessages.ACCESS_CONTROL
            );
    }

    async function assertRevokeRolePermission(account, expectAllowed = true) {
        const role = constants.roles.GENERAL_MANAGER; 
        await grantRole(securityManager, role, account.address);
        const func = async () => { await revokeRole(securityManager, role, addr1.address, account); }
        if (expectAllowed)
            await assertCan(func);
        else
            await assertCannot(
                func,
                constants.errorMessages.ACCESS_CONTROL
            );
    }

    async function assertMintPermission(account, expectAllowed = true) {
        const func = async () => { await vaultToken.connect(account).mint(addr1.address, 1); }
        if (expectAllowed)
            await assertCan(func);
        else
            await assertCannot(
                func,
                constants.errorMessages.CUSTOM_ACCESS_CONTROL(
                    constants.roles.TOKEN_MINTER, account.address
                )
            );
    }

    async function assertBurnPermission(account, expectAllowed = true) {
        const func = async () => { await vaultToken.connect(account).burn(1); }
        if (expectAllowed)
            await assertCan(func);
        else
            await assertCannot(
                func,
                constants.errorMessages.CUSTOM_ACCESS_CONTROL(
                    constants.roles.TOKEN_BURNER, account.address
                )
            );
    }

    async function assertPausePermission(contract, account, expectAllowed = true) {
        const func = async () => { await contract.connect(account).pause(); }
        if (expectAllowed)
            await assertCan(func);
        else
            await assertCannot(
                func,
                constants.errorMessages.CUSTOM_ACCESS_CONTROL(
                    constants.roles.PAUSER, account.address
                )
            );
    }

    async function assertUnpausePermission(contract, account, expectAllowed = true) {
        if (!await contract.paused())
            await contract.pause();
        const func = async () => { await contract.connect(account).unpause(); }
        if (expectAllowed)
            await assertCan(func);
        else
            await assertCannot(
                func,
                constants.errorMessages.CUSTOM_ACCESS_CONTROL(
                    constants.roles.PAUSER, account.address
                )
            );
    }

    async function assertSetBep20OwnerPermission(account, expectAllowed = true) {
        const func = async () => { await vaultToken.connect(account).assignBep20Owner(addr1.address); }
        if (expectAllowed)
            await assertCan(func);
        else
            await assertCannot(
                func,
                constants.errorMessages.CUSTOM_ACCESS_CONTROL(
                    constants.roles.GENERAL_MANAGER, account.address
                )
            );
    }

    async function assertSetVaultAddressPermission(account, expectAllowed = true) {
        const token2 = await deploy.deployToken(securityManager.address); 
        const vault = await utils.deployContractSilent(constants.VAULT_CONTRACT_ID); 
        vault.initialize(token2.address, token2.address, 0, securityManager.address); 
        
        const func = async () => { await token2.connect(account).setVaultAddress(vault.address); }
        if (expectAllowed)
            await assertCan(func);
        else
            await assertCannot(
                func,
                constants.errorMessages.CUSTOM_ACCESS_CONTROL(
                    constants.roles.ADMIN, account.address
                )
            );
    }

    async function assertSetSecurityManagerPermission(contract, account, expectAllowed = true) {
        const func = async () => { await contract.connect(account).setSecurityManager(await contract.securityManager()); }
        if (expectAllowed)
            await assertCan(func);
        else
            await assertCannot(
                func,
                constants.errorMessages.CUSTOM_ACCESS_CONTROL(
                    constants.roles.ADMIN, account.address
                )
            );
    }

    async function assertVaultAdminWithdrawPermission(account, expectAllowed = true) {
        const func = async () => { await vault.connect(account).adminWithdraw(1); }
        if (expectAllowed)
            await assertCan(func);
        else
            await assertCannot(
                func,
                constants.errorMessages.CUSTOM_ACCESS_CONTROL(
                    constants.roles.ADMIN, account.address
                )
            );
    }

    async function assertDepositVaultAdminWithdrawPermission(account, expectAllowed = true) {
        const func = async () => { await vault.connect(account).adminWithdraw(1); }
        if (expectAllowed)
            await assertCan(func);
        else
            await assertCannot(
                func,
                constants.errorMessages.CUSTOM_ACCESS_CONTROL(
                    constants.roles.ADMIN, account.address
                )
            );
    }

    async function assertSetMinimumDepositPermission(account, expectAllowed = true) {
        const func = async () => { await vault.connect(account).setMinimumDeposit(0); }
        if (expectAllowed)
            await assertCan(func);
        else
            await assertCannot(
                func,
                constants.errorMessages.CUSTOM_ACCESS_CONTROL(
                    constants.roles.GENERAL_MANAGER, account.address
                )
            );
    }

    async function assertProgressPhasePermission(account, expectAllowed = true) {
        const func = async () => {
            await vault.connect(account).progressToNextPhase(
                constants.exchangeRates.DEFAULT
            );
        }
        if (expectAllowed)
            await assertCan(func);
        else
            await assertCannot(
                func,
                constants.errorMessages.CUSTOM_ACCESS_CONTROL(
                    constants.roles.LIFECYCLE_MANAGER,
                    account.address
                )
            );
    }
    
    async function assertSetWhitelistPermission(account, expectAllowed = true) {
        const func = async () => {
            await vault.connect(account).setWhitelist(whitelist.address);
        }
        if (expectAllowed)
            await assertCan(func);
        else
            await assertCannot(
                func,
                constants.errorMessages.CUSTOM_ACCESS_CONTROL(
                    constants.roles.WHITELIST_MANAGER,
                    account.address
                )
            );
    }

    async function assertAddRemoveWhitelistPermission(account, expectAllowed = true) {
        const func = async () => {
            await whitelist.connect(account).addRemoveWhitelist(addr1.address, true);
        }
        if (expectAllowed)
            await assertCan(func);
        else
            await assertCannot(
                func,
                constants.errorMessages.CUSTOM_ACCESS_CONTROL(
                    constants.roles.WHITELIST_MANAGER,
                    account.address
                )
            );
    }

    async function assertAddRemoveWhitelistBulkPermission(account, expectAllowed = true) {
        const func = async () => {
            await whitelist.connect(account).addRemoveWhitelistBulk([addr1.address], true);
        }
        if (expectAllowed)
            await assertCan(func);
        else
            await assertCannot(
                func,
                constants.errorMessages.CUSTOM_ACCESS_CONTROL(
                    constants.roles.WHITELIST_MANAGER,
                    account.address
                )
            );
    }

    async function assertTurnWhitelistOnOffPermission(account, expectAllowed = true) {
        const func = async () => {
            await whitelist.connect(account).setWhitelistOnOff(true);
        }
        if (expectAllowed)
            await assertCan(func);
        else
            await assertCannot(
                func,
                constants.errorMessages.CUSTOM_ACCESS_CONTROL(
                    constants.roles.WHITELIST_MANAGER,
                    account.address
                )
            );
    }
    
    async function assertDepositForPermission(account, expectAllowed = true) {
        const amount = minDeposit; 
        await baseToken.connect(account).approve(vault.address, 1_000_000_000);
        const func = async () => {
            await vault.connect(account).depositFor(amount, addr1.address);
        }
        if (expectAllowed)
            await assertCan(func);
        else
            await assertCannot(
                func,
                constants.errorMessages.CUSTOM_ACCESS_CONTROL(
                    constants.roles.DEPOSIT_MANAGER,
                    account.address
                )
            );
    }
    
    async function assertFinalizeDepositPermission(account, expectAllowed = true) {
        const amount = minDeposit;
        const func = async () => {
            await depositVault.connect(account).finalizeDeposit(
                amount, 
                "0xc7c8a64567d80015956578d4da93de2aa1a0148a570c5d3ef8146c693f7db302", 
                addr1.address
            );
        }
        if (expectAllowed)
            await assertCan(func);
        else
            await assertCannot(
                func,
                constants.errorMessages.CUSTOM_ACCESS_CONTROL(
                    constants.roles.DEPOSIT_MANAGER,
                    account.address
                )
            );
    }
    
    async function assertUpgradeVaultPermission(account, expectAllowed = true) {
        const v2 = await utils.deployContractSilent("VaultV2");

        const func1 = async () => {
            await vault.connect(account).upgradeTo(v2.address);
        };
        const func2 = async () => {
            await vault.connect(account).upgradeToAndCall(v2.address, utils.encodeFunctionSignature("aCallableMethod"));
        };
        if (expectAllowed) {
            await assertCan(func1);
            await assertCan(func2);
        }
        else {
            await assertCannot(
                func1,
                constants.errorMessages.CUSTOM_ACCESS_CONTROL(
                    constants.roles.UPGRADER,
                    account.address
                )
            );
            await assertCannot(
                func2,
                constants.errorMessages.CUSTOM_ACCESS_CONTROL(
                    constants.roles.UPGRADER,
                    account.address
                )
            );
        }
    }

    async function assertUpgradeVaultTokenPermission(account, expectAllowed = true) {
        const v2 = await utils.deployContractSilent("VaultTokenV2");
        const func1 = async () => {
            await vaultToken.connect(account).upgradeTo(v2.address);
        }
        const func2 = async () => {
            await vaultToken.connect(account).upgradeToAndCall(v2.address, utils.encodeFunctionSignature("aCallableMethod"));
        };
        if (expectAllowed) {
            await assertCan(func1);
            await assertCan(func2);
        }
        else {
            await assertCannot(
                func1,
                constants.errorMessages.CUSTOM_ACCESS_CONTROL(
                    constants.roles.UPGRADER,
                    account.address
                )
            );
            await assertCannot(
                func2,
                constants.errorMessages.CUSTOM_ACCESS_CONTROL(
                    constants.roles.UPGRADER,
                    account.address
                )
            );
        }
    }
    
    async function assertAdminPermissions(account, expectAllowed = true) {
        await assertGrantRolePermission(account, expectAllowed);
        await assertRevokeRolePermission(account, expectAllowed);
        await assertSetSecurityManagerPermission(vault, account, expectAllowed);
        await assertSetSecurityManagerPermission(vaultToken, account, expectAllowed);
        await assertVaultAdminWithdrawPermission(account, expectAllowed);
        await assertDepositVaultAdminWithdrawPermission(account, expectAllowed);
        await assertSetVaultAddressPermission(account, expectAllowed);
    }

    async function assertMinterPermissions(account, expectAllowed = true) {
        await assertMintPermission(account, expectAllowed);
    }

    async function assertBurnerPermissions(account, expectAllowed = true) {
        await assertBurnPermission(account, expectAllowed);
    }

    async function assertPauserPermissions(account, expectAllowed = true) {
        await assertPausePermission(vaultToken, account, expectAllowed);
        await assertUnpausePermission(vaultToken, account, expectAllowed);
        await assertPausePermission(vault, account, expectAllowed);
        await assertUnpausePermission(vault, account, expectAllowed); 
    }

    async function assertDepositManagerPermissions(account, expectAllowed = true) {
        await assertDepositForPermission(account, expectAllowed);
        await assertFinalizeDepositPermission(account, expectAllowed); 
    }

    async function assertGeneralManagerPermissions(account, expectAllowed = true) {
        await assertSetMinimumDepositPermission(account, expectAllowed);
        await assertSetBep20OwnerPermission(account, expectAllowed);
    }

    async function assertWhitelistManagerPermissions(account, expectAllowed = true) {
        await assertSetWhitelistPermission(account, expectAllowed);
        await assertAddRemoveWhitelistPermission(account, expectAllowed);
        await assertAddRemoveWhitelistBulkPermission(account, expectAllowed);
        await assertTurnWhitelistOnOffPermission(account, expectAllowed);
    }

    async function assertLifecycleManagerPermissions(account, expectAllowed = true) {
        await assertProgressPhasePermission(account, expectAllowed);
    }

    async function assertUpgraderPermissions(account, expectAllowed = true) {
        await assertUpgradeVaultPermission(account, expectAllowed);
        await assertUpgradeVaultTokenPermission(account, expectAllowed);
    }
    
    async function hasExpectedRoles(account, allowedRoles) {
        const roles = {}; 
        roles[constants.roles.ADMIN] = false;
        roles[constants.roles.ADMIN] = false;
        roles[constants.roles.TOKEN_BURNER] = false;
        roles[constants.roles.TOKEN_MINTER] = false;
        roles[constants.roles.PAUSER] = false;
        roles[constants.roles.UPGRADER] = false;
        roles[constants.roles.GENERAL_MANAGER] = false;
        roles[constants.roles.WHITELIST_MANAGER] = false;
        //roles[constants.roles.DEPOSIT_MANAGER] = false;
        roles[constants.roles.LIFECYCLE_MANAGER] = false;
        
        for (let r of allowedRoles) {
            roles[r] = true;
        }; 
        
        for(let r in roles) {
            if ((await securityManager.hasRole(r, account.address)) != roles[r]) {
                console.log(`security role ${r} expected ${roles[r]}`); 
                return false;
            }
        }
        
        return true;
    }
    
    async function assertRoleCanBeGranted(account, role) {
        expect(await securityManager.hasRole(role, account.address)).to.be.false;
        await securityManager.grantRole(role, account.address); 
        expect(await securityManager.hasRole(role, account.address)).to.be.true;
    }

    async function assertRoleCanBeRevoked(account, role) {
        expect(await securityManager.hasRole(role, account.address)).to.be.true;
        await securityManager.revokeRole(role, account.address);
        expect(await securityManager.hasRole(role, account.address)).to.be.false;
    }

    async function assertRoleCanBeRenounced(account, role) {
        await securityManager.grantRole(role, account.address); 
        expect(await securityManager.hasRole(role, account.address)).to.be.true;
        await securityManager.connect(account).renounceRole(role, account.address);
        expect(await securityManager.hasRole(role, account.address)).to.be.false;
    }
    

    describe("Admin Role", function () {
        let primaryUser, roleTested;

        beforeEach(async function () {
            roleTested = constants.roles.ADMIN;
            primaryUser = addr2;
            
            await securityManager.grantRole(roleTested, primaryUser.address); 
        });

        it("has correct roles", async function () {
            expect(await hasExpectedRoles(primaryUser, [roleTested])).to.be.true;
        });

        it("role can be granted", async function () {
            await assertRoleCanBeGranted(addr1, roleTested);
            await assertAdminPermissions(addr1);
        });

        it("role can be revoked", async function () {
            await assertRoleCanBeRevoked(primaryUser, roleTested);
            await assertAdminPermissions(primaryUser, false);
        });

        it("admin has admin permissions", async function () {
            await assertAdminPermissions(primaryUser, true);
        });

        it("admin does not have minter permissions", async function () {
            await assertMinterPermissions(primaryUser, false);
        });

        it("admin does not have burner permissions", async function () {
            await assertBurnerPermissions(primaryUser, false);
        });

        it("admin does not have pauser permissions", async function () {
            await assertPauserPermissions(primaryUser, false);
        });

        it("admin does not have general manager permissions", async function () {
            await assertGeneralManagerPermissions(primaryUser, false);
        });

        it("admin does not have lifecycle manager permissions", async function () {
            await assertLifecycleManagerPermissions(primaryUser, false);
        });

        it("admin does not have deposit manager permissions", async function () {
            await assertDepositManagerPermissions(primaryUser, false);
        });

        it("admin does not have whitelist manager permissions", async function () {
            await assertWhitelistManagerPermissions(primaryUser, false);
        });

        it("admin does not have upgrader permissions", async function () {
            await assertUpgraderPermissions(primaryUser, false);
        });
    });
    
    describe("Minter Role", function () {
        let primaryUser, roleTested; 

        beforeEach(async function () {
            roleTested = constants.roles.TOKEN_MINTER; 
            primaryUser = minter;
        });
        
        it("has correct roles", async function () {
            expect(await hasExpectedRoles(primaryUser, [roleTested])).to.be.true;
        });

        it("role can be granted", async function () {
            await assertRoleCanBeGranted(addr1, roleTested);
            await assertMinterPermissions(addr1);
        });

        it("role can be revoked", async function () {
            await assertRoleCanBeRevoked(primaryUser, roleTested);
            await assertMinterPermissions(primaryUser, false);
        });

        it("role can be renounced", async function () {
            await assertRoleCanBeRenounced(addr1, roleTested);
            await assertMinterPermissions(addr1, false);
        });

        it("minter does not have admin permissions", async function () {
            await assertAdminPermissions(primaryUser, false);
        });

        it("minter has minter permissions", async function () {
            await assertMinterPermissions(primaryUser, true);
        });

        it("minter does not have burner permissions", async function () {
            await assertBurnerPermissions(primaryUser, false);
        });

        it("minter does not have pauser permissions", async function () {
            await assertPauserPermissions(primaryUser, false);
        });

        it("minter does not have general manager permissions", async function () {
            await assertGeneralManagerPermissions(primaryUser, false);
        });

        it("minter does not have lifecycle manager permissions", async function () {
            await assertLifecycleManagerPermissions(primaryUser, false);
        });

        it("minter does not have deposit manager permissions", async function () {
            await assertDepositManagerPermissions(primaryUser, false);
        });

        it("minter does not have whitelist manager permissions", async function () {
            await assertWhitelistManagerPermissions(primaryUser, false);
        });

        it("minter does not have upgrader permissions", async function () {
            await assertUpgraderPermissions(primaryUser, false);
        });
    });

    describe("Burner Role", function () {
        let primaryUser, roleTested;

        beforeEach(async function () {
            roleTested = constants.roles.TOKEN_BURNER;
            primaryUser = burner;
        });

        it("has correct roles", async function () {
            expect(await hasExpectedRoles(primaryUser, [roleTested])).to.be.true;
        });

        it("role can be granted", async function () {
            await assertRoleCanBeGranted(addr1, roleTested);
            await assertBurnerPermissions(addr1);
        });

        it("role can be revoked", async function () {
            await assertRoleCanBeRevoked(primaryUser, roleTested);
            await assertBurnerPermissions(primaryUser, false);
        });

        it("role can be renounced", async function () {
            await assertRoleCanBeRenounced(addr1, roleTested);
            await assertBurnerPermissions(addr1, false);
        });

        it("burner does not have admin permissions", async function () {
            await assertAdminPermissions(primaryUser, false);
        });

        it("burner does not have minter permissions", async function () {
            await assertMinterPermissions(primaryUser, false);
        });

        it("burner has burner permissions", async function () {
            await assertBurnerPermissions(primaryUser, true);
        });

        it("burner does not have pauser permissions", async function () {
            await assertPauserPermissions(primaryUser, false);
        });

        it("burner does not have general manager permissions", async function () {
            await assertGeneralManagerPermissions(primaryUser, false);
        });

        it("burner does not have lifecycle manager permissions", async function () {
            await assertLifecycleManagerPermissions(primaryUser, false);
        });

        it("burner does not have deposit manager permissions", async function () {
            await assertDepositManagerPermissions(primaryUser, false);
        });

        it("burner does not have whitelist manager permissions", async function () {
            await assertWhitelistManagerPermissions(primaryUser, false);
        });

        it("burner does not have upgrader permissions", async function () {
            await assertUpgraderPermissions(primaryUser, false);
        });
    });

    describe("Pauser Role", function () {
        let primaryUser, roleTested;

        beforeEach(async function () {
            roleTested = constants.roles.PAUSER;
            primaryUser = pauser;
        });

        it("has correct roles", async function () {
            expect(await hasExpectedRoles(primaryUser, [roleTested])).to.be.true;
        });

        it("role can be granted", async function () {
            await assertRoleCanBeGranted(addr1, roleTested);
            await assertPauserPermissions(addr1);
        });

        it("role can be revoked", async function () {
            await assertRoleCanBeRevoked(primaryUser, roleTested);
            await assertPauserPermissions(primaryUser, false);
        });

        it("role can be renounced", async function () {
            await assertRoleCanBeRenounced(addr1, roleTested);
            await assertPauserPermissions(addr1, false);
        });

        it("pauser has pauser permissions", async function () {
            await assertPauserPermissions(primaryUser, true);
        });

        it("pauser does not have admin permissions", async function () {
            await assertAdminPermissions(primaryUser, false);
        });

        it("pauser does not have minter permissions", async function () {
            await assertMinterPermissions(primaryUser, false);
        });

        it("pauser does not have burner permissions", async function () {
            await assertBurnerPermissions(primaryUser, false);
        });

        it("pauser does not have general manager permissions", async function () {
            await assertGeneralManagerPermissions(primaryUser, false);
        });

        it("pauser does not have lifecycle manager permissions", async function () {
            await assertLifecycleManagerPermissions(primaryUser, false);
        });

        it("pauser does not have deposit manager permissions", async function () {
            await assertDepositManagerPermissions(primaryUser, false);
        });

        it("pauser does not have whitelist manager permissions", async function () {
            await assertWhitelistManagerPermissions(primaryUser, false);
        });

        it("pauser does not have upgrader permissions", async function () {
            await assertUpgraderPermissions(primaryUser, false);
        });
    });
    
    describe("Lifecycle Manager Role", function () {
        let primaryUser, roleTested;

        beforeEach(async function () {
            roleTested = constants.roles.LIFECYCLE_MANAGER;
            primaryUser = lifecycleManager;
        });
        
        it("has correct roles" , async function() {
            expect(await hasExpectedRoles(primaryUser, [roleTested])).to.be.true; 
        }); 
        
        it("role can be granted", async function () {
            await assertRoleCanBeGranted(addr1, roleTested); 
            await assertLifecycleManagerPermissions(addr1); 
        }); 
        
        it("role can be revoked", async function () {
            await assertRoleCanBeRevoked(primaryUser, roleTested);
            await assertLifecycleManagerPermissions(primaryUser, false); 
        });

        it("role can be renounced", async function () {
            await assertRoleCanBeRenounced(addr1, roleTested);
            await assertLifecycleManagerPermissions(addr1, false);
        });
        
        it("lifecycle manager has lifecycle manager permissions", async function() {
            await assertLifecycleManagerPermissions(primaryUser, true); 
        });

        it("lifecycle manager does not have admin permissions", async function () {
            await assertAdminPermissions(primaryUser, false);
        });

        it("lifecycle manager does not have minter permissions", async function () {
            await assertMinterPermissions(primaryUser, false);
        });

        it("lifecycle manager does not have burner permissions", async function () {
            await assertBurnerPermissions(primaryUser, false);
        });

        it("lifecycle manager does not have pauser permissions", async function () {
            await assertPauserPermissions(primaryUser, false);
        });

        it("lifecycle manager does not have general manager permissions", async function () {
            await assertGeneralManagerPermissions(primaryUser, false);
        });

        it("lifecycle manager does not have deposit manager permissions", async function () {
            await assertDepositManagerPermissions(primaryUser, false);
        });

        it("lifecycle manager does not have whitelist manager permissions", async function () {
            await assertWhitelistManagerPermissions(primaryUser, false);
        });

        it("lifecycle manager does not have upgrader permissions", async function () {
            await assertUpgraderPermissions(primaryUser, false);
        });
    });

    describe("General Manager Role", function () {
        let primaryUser, roleTested;

        beforeEach(async function () {
            roleTested = constants.roles.GENERAL_MANAGER;
            primaryUser = generalManager;
        });
        
        it("has correct roles", async function () {
            expect(await hasExpectedRoles(primaryUser, [roleTested])).to.be.true;
        });

        it("role can be granted", async function () {
            await assertRoleCanBeGranted(addr1, roleTested);
            await assertGeneralManagerPermissions(addr1); 
        });

        it("role can be revoked", async function () {
            await assertRoleCanBeRevoked(primaryUser, roleTested);
            await assertGeneralManagerPermissions(primaryUser, false); 
        });

        it("role can be renounced", async function () {
            await assertRoleCanBeRenounced(addr1, roleTested);
            await assertGeneralManagerPermissions(addr1, false);
        });

        it("general manager has general manager permissions", async function () {
            await assertGeneralManagerPermissions(primaryUser, true);
        });

        it("general manager does not have lifecycle manager permissions", async function () {
            await assertLifecycleManagerPermissions(primaryUser, false);
        });

        it("general manager does not have admin permissions", async function () {
            await assertAdminPermissions(primaryUser, false);
        });

        it("general manager does not have minter permissions", async function () {
            await assertMinterPermissions(primaryUser, false);
        });

        it("general manager does not have burner permissions", async function () {
            await assertBurnerPermissions(primaryUser, false);
        });

        it("general manager does not have pauser permissions", async function () {
            await assertPauserPermissions(primaryUser, false);
        });

        it("general manager does not have deposit manager permissions", async function () {
            await assertDepositManagerPermissions(primaryUser, false);
        });

        it("general manager does not have whitelist manager permissions", async function () {
            await assertWhitelistManagerPermissions(primaryUser, false);
        });

        it("general manager does not have upgrader permissions", async function () {
            await assertUpgraderPermissions(primaryUser, false);
        });
    });

    describe("Whitelist Manager Role", function () {
        let primaryUser, roleTested;

        beforeEach(async function () {
            roleTested = constants.roles.WHITELIST_MANAGER;
            primaryUser = whitelistManager;
        });

        it("has correct roles", async function () {
            expect(await hasExpectedRoles(primaryUser, [roleTested])).to.be.true;
        });

        it("role can be granted", async function () {
            await assertRoleCanBeGranted(addr1, roleTested);
            await assertWhitelistManagerPermissions(addr1);
        });

        it("role can be revoked", async function () {
            await assertRoleCanBeRevoked(primaryUser, roleTested);
            await assertWhitelistManagerPermissions(primaryUser, false);
        });

        it("role can be renounced", async function () {
            await assertRoleCanBeRenounced(addr1, roleTested);
            await assertWhitelistManagerPermissions(addr1, false);
        });

        it("whitelist manager has whitelist manager permissions", async function () {
            await assertWhitelistManagerPermissions(primaryUser, true);
        });

        it("whitelist manager does not have lifecycle manager permissions", async function () {
            await assertLifecycleManagerPermissions(primaryUser, false);
        });

        it("whitelist manager does not have admin permissions", async function () {
            await assertAdminPermissions(primaryUser, false);
        });

        it("whitelist manager does not have minter permissions", async function () {
            await assertMinterPermissions(primaryUser, false);
        });

        it("whitelist manager does not have burner permissions", async function () {
            await assertBurnerPermissions(primaryUser, false);
        });

        it("whitelist manager does not have pauser permissions", async function () {
            await assertPauserPermissions(primaryUser, false);
        });

        it("whitelist manager does not have general manager permissions", async function () {
            await assertGeneralManagerPermissions(primaryUser, false);
        });

        it("whitelist manager does not have deposit manager permissions", async function () {
            await assertDepositManagerPermissions(primaryUser, false);
        });

        it("whitelist manager does not have upgrader permissions", async function () {
            await assertUpgraderPermissions(primaryUser, false);
        });
    });

    describe("Deposit Manager Role", function () {
        let primaryUser, roleTested;

        beforeEach(async function () {
            roleTested = constants.roles.DEPOSIT_MANAGER;
            primaryUser = depositManager;
        });

        it("has correct roles", async function () {
            expect(await hasExpectedRoles(primaryUser, [roleTested])).to.be.true;
        });

        it("role can be granted", async function () {
            await assertRoleCanBeGranted(addr1, roleTested);
            await assertDepositManagerPermissions(addr1);
        });

        it("role can be revoked", async function () {
            await assertRoleCanBeRevoked(primaryUser, roleTested);
            await assertDepositManagerPermissions(primaryUser, false);
        });

        it("role can be renounced", async function () {
            await assertRoleCanBeRenounced(addr1, roleTested);
            await assertDepositManagerPermissions(addr1, false);
        });

        it("deposit manager has deposit manager permissions", async function () {
            await assertDepositManagerPermissions(primaryUser, true);
        });

        it("deposit manager does not have admin permissions", async function () {
            await assertAdminPermissions(primaryUser, false);
        });

        it("deposit manager does not have whitelist manager permissions", async function () {
            await assertWhitelistManagerPermissions(primaryUser, false);
        });

        it("deposit manager does not have lifecycle manager permissions", async function () {
            await assertLifecycleManagerPermissions(primaryUser, false);
        });

        it("deposit manager does not have minter permissions", async function () {
            await assertMinterPermissions(primaryUser, false);
        });

        it("deposit manager does not have burner permissions", async function () {
            await assertBurnerPermissions(primaryUser, false);
        });

        it("deposit manager does not have pauser permissions", async function () {
            await assertPauserPermissions(primaryUser, false);
        });

        it("deposit manager does not have general manager permissions", async function () {
            await assertGeneralManagerPermissions(primaryUser, false);
        });

        it  ("deposit manager does not have upgrader permissions", async function () {
            await assertUpgraderPermissions(primaryUser, false);
        });
    });

    describe("Upgrader Role", function () {
        let primaryUser, roleTested;

        beforeEach(async function () {
            roleTested = constants.roles.UPGRADER;
            primaryUser = upgrader;
        });

        it("has correct roles", async function () {
            expect(await hasExpectedRoles(primaryUser, [roleTested])).to.be.true;
        });

        it("role can be granted", async function () {
            await assertRoleCanBeGranted(addr1, roleTested);
            await assertUpgraderPermissions(addr1);
        });

        it("role can be revoked", async function () {
            await assertRoleCanBeRevoked(primaryUser, roleTested);
            await assertUpgraderPermissions(primaryUser, false);
        });

        it("role can be renounced", async function () {
            await assertRoleCanBeRenounced(addr1, roleTested);
            await assertUpgraderPermissions(addr1, false);
        });

        it("upgrader has upgrader permissions", async function () {
            await assertUpgraderPermissions(primaryUser, true);
        });

        it("upgrader does not have deposit manager permissions", async function () {
            await assertDepositManagerPermissions(primaryUser, false);
        });

        it("upgrader does not have admin permissions", async function () {
            await assertAdminPermissions(primaryUser, false);
        });

        it("upgrader does not have whitelist manager permissions", async function () {
            await assertWhitelistManagerPermissions(primaryUser, false);
        });

        it("upgrader does not have lifecycle manager permissions", async function () {
            await assertLifecycleManagerPermissions(primaryUser, false);
        });

        it("upgrader does not have minter permissions", async function () {
            await assertMinterPermissions(primaryUser, false);
        });

        it("upgrader does not have burner permissions", async function () {
            await assertBurnerPermissions(primaryUser, false);
        });

        it("upgrader does not have pauser permissions", async function () {
            await assertPauserPermissions(primaryUser, false);
        });

        it("upgrader does not have general manager permissions", async function () {
            await assertGeneralManagerPermissions(primaryUser, false);
        });
    });
}); 