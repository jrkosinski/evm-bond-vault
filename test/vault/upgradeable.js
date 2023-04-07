const { expect } = require("chai");
const { ethers } = require("hardhat");
const constants = require("../util/constants");
const deploy = require("../util/deploy");
const { expectRevert, expectEvent } = require("../util/testUtils");
const testFlags = require("../testFlags");
const { grantRole, renounceRole, hasRole } = require("../util/securityHelper");

if (!testFlags.upgradeVault) {
    describe(constants.VAULT_CONTRACT_ID + ": Upgrade Vault", function () {
        let token, vault, baseToken, whitelist, securityManager;    //contracts
        let owner, addr1, addr2, addr3; 	                        //accounts

        beforeEach(async function () {
            [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

            //contract
            [token, vault, baseToken, whitelist, securityManager] = await deploy.deployAll(true);
        });

        async function verifyExchangeRate(vault, vaultToken, baseToken) {
            const currentRate = await vault.currentExchangeRate();
            expect(currentRate.vaultToken).to.equal(vaultToken);
            expect(currentRate.baseToken).to.equal(baseToken);
        }

        async function verifyVersion(vault, expectedVersionMajor, expectedVersionMinor = 0) {
            const version = await vault.version();
            expect(version[0]).to.equal(expectedVersionMajor);
            expect(version[1]).to.equal(expectedVersionMinor);
        }

        describe("Upgrade to V2", function () {
            it("upgrade version", async function () {
                const versionBefore = await vault.version();

                //upgrade to v2
                await deploy.upgradeVault("VaultV2", vault.address);
                const versionAfter = await vault.version();

                expect(versionBefore[0]).to.equal(1);
                expect(versionAfter[0]).to.equal(2);
            });

            it("initial state after upgrade", async function () {
                //upgrade to v2
                await deploy.upgradeVault("VaultV2", vault.address);

                expect(await vault.vaultToken()).to.equal(token.address);
                expect(await vault.securityManager()).to.equal(securityManager.address);
                expect(await vault.whitelist()).to.equal(whitelist.address);
                expect(await vault.baseToken()).to.not.equal(constants.ZERO_ADDRESS);
                expect(await vault.baseToken()).to.equal(baseToken.address);
            });

            it("pauseCount: a new property", async function () {
                //upgrade to v2
                vault = await deploy.upgradeVault("VaultV2", vault.address);

                expect(await vault.pauseCount()).to.equal(0);
                
                await vault.pause();
                await vault.unpause();
                await vault.pause();
                await vault.unpause();

                expect(await vault.pauseCount()).to.equal(2);
            });

            it("setExchangeRate: a new method", async function () {
                //upgrade to v2
                vault = await deploy.upgradeVault("VaultV2", vault.address);
                
                await vault.setExchangeRate([9, 10]);
                
                await verifyExchangeRate(vault, 9, 10);
            });

            it("phase and rate persist after upgrade", async function () {
                await vault.progressToNextPhase([12, 13]);
                await verifyExchangeRate(vault, 12, 13);
                
                //upgrade to v2
                vault = await deploy.upgradeVault("VaultV2", vault.address);
                await verifyExchangeRate(vault, 12, 13);

                await vault.setExchangeRate([9, 10]);
                await verifyExchangeRate(vault, 9, 10);
            });
        });

        describe("Upgrade to V3", function () {
            it("upgrade v2 to v3", async function () {

                //upgrade to v2
                vault = await deploy.upgradeVault("VaultV2", vault.address);
                await verifyVersion(vault, 2);

                //upgrade to v3
                vault = await deploy.upgradeVault("VaultV3", vault.address);
                await verifyVersion(vault, 3);
            });

            it("unimplemented function is no longer callable", async function () {

                //upgrade to v2
                vault = await deploy.upgradeVault("VaultV2", vault.address);
                
                //upgrade to v3
                await deploy.upgradeVault("VaultV3", vault.address);

                //setExchangeRate method should be gone now
                await expect(vault.setExchangeRate([1, 1])).to.be.reverted;
            });

            it("new function is callable", async function () {

                //upgrade to v2
                vault = await deploy.upgradeVault("VaultV2", vault.address);

                //upgrade to v3
                vault = await deploy.upgradeVault("VaultV3", vault.address);
                await baseToken.mint(vault.address, 1_000_000);

                expect(await baseToken.balanceOf(vault.address)).to.equal(1_000_000); 
                
                await vault.emptyVault(); 
                expect(await baseToken.balanceOf(vault.address)).to.equal(0); 
            });
        });
        
        describe("Security", function () {
            it("only upgrader can upgrade", async function () {
                
                //renounce UPGRADER role 
                await renounceRole(vault, constants.roles.UPGRADER, owner.address);
                expect(await hasRole(vault, constants.roles.UPGRADER, owner.address)).to.be.false;
                
                //cannot upgrade 
                await expectRevert(
                    () => deploy.upgradeVault("VaultV2", vault.address),
                    constants.errorMessages.CUSTOM_ACCESS_CONTROL(
                        constants.roles.UPGRADER,
                        owner.address
                    )
                );

                //restore UPGRADER role 
                await grantRole(vault, constants.roles.UPGRADER, owner.address);

                //now can upgrade 
                await deploy.upgradeVault("VaultV2", vault.address);
                await verifyVersion(vault, 2); 
            });

            it("initializer cannot be called after initialization", async function () {
                const secManAddr = await vault.securityManager();
                await expectRevert(
                    () => vault.initialize(token.address, baseToken.address, 0, secManAddr),
                    constants.errorMessages.CONTRACT_ALREADY_INITIALIZED
                );
            });
        });
    });
}
