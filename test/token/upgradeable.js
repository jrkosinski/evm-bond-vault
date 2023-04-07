const { expect } = require("chai");
const { ethers } = require("hardhat");
const constants = require("../util/constants");
const deploy = require("../util/deploy");
const { expectRevert, expectEvent } = require("../util/testUtils");
const testFlags = require("../testFlags"); 
const { grantRole, renounceRole, hasRole } = require("../util/securityHelper"); 

if (!testFlags.upgradeToken) {
    describe(constants.TOKEN_CONTRACT_ID + ": Upgrade Token", function () {
        let token, vault, baseToken, whitelist, securityManager;    //contracts
        let owner, addr1, addr2, addr3;                             //accounts

        beforeEach(async function () {
            [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

            //contract
            [token, vault, baseToken, whitelist, securityManager] = await deploy.deployAll(false);

            //set vault to withdraw phase 
            await vault.progressToNextPhase([1, 1]);
            await vault.progressToNextPhase([1, 1]);

            await baseToken.mint(vault.address, 1000000000); 
        });

        async function verifyVersion(token, expectedVersionMajor, expectedVersionMinor = 0) {
            const version = await token.version();
            expect(version[0]).to.equal(expectedVersionMajor);
            expect(version[1]).to.equal(expectedVersionMinor);
        }

        describe("Upgrade to V2", function () {
            it("upgrade version", async function () {
                const versionBefore = await token.version();

                //upgrade to v2
                await deploy.upgradeToken(token.address);
                const versionAfter = await token.version();

                expect(versionBefore[0]).to.equal(1);
                expect(versionAfter[0]).to.equal(2);
            });

            it("initial state after upgrade", async function () {
                //upgrade to v2
                token = await deploy.upgradeToken(token.address);

                expect(await token.name()).to.equal(constants.TOKEN_NAME);
                expect(await token.securityManager()).to.equal(securityManager.address);
                expect(await token.symbol()).to.equal(constants.TOKEN_SYMBOL);
                expect(await token.decimals()).to.equal(constants.DEFAULT_TOKEN_DECIMALS);
                expect(await token.extraCount()).to.equal(0);
            });

            it("transfers mint +1", async function () {
                //upgrade to v2
                token = await deploy.upgradeToken(token.address);

                const selfBalanceBefore = parseInt(await token.balanceOf(token.address)); 
                
                token.mint(owner.address, 200); 
                token.transfer(vault.address, 20); 

                const selfBalanceAfter = parseInt(await token.balanceOf(token.address)); 
                expect(selfBalanceAfter).to.equal(selfBalanceBefore + 1); 
                
                expect(await token.extraCount()).to.equal(1);
            });

            it("token balances persist after upgrade ", async function () {
                
                //mint tokens to addresses 
                const balances = [1000, 100_000_000, 300_000_000_000]; 
                const users = [addr1, addr2, addr3]; 
                
                for(let n=0; n<balances.length; n++) {
                    await token.mint(users[n].address, balances[n]);
                }
                
                //verify balances
                for (let n = 0; n < balances.length; n++) {
                    expect(await token.balanceOf(users[n].address)).to.equal(balances[n]); 
                }
                
                //upgrade to v2
                token = await deploy.upgradeToken(token.address);

                //verify balances
                for (let n = 0; n < balances.length; n++) {
                    expect(await token.balanceOf(users[n].address)).to.equal(balances[n]);
                }
            });
        });

        describe("Security", function () {
            it("only upgrader can upgrade", async function () {
                //renounce UPGRADER role
                await renounceRole(token, constants.roles.UPGRADER, owner.address);
                expect(await hasRole(token, constants.roles.UPGRADER, owner.address)).to.be.false;

                //cannot upgrade 
                await expectRevert(
                    () => deploy.upgradeToken(token.address),
                    constants.errorMessages.CUSTOM_ACCESS_CONTROL(
                        constants.roles.UPGRADER, 
                        owner.address
                    )
                );
                
                //restore UPGRADER role 
                await grantRole(token, constants.roles.UPGRADER, owner.address); 
                
                //now can upgrade 
                await deploy.upgradeToken(token.address); 
                await verifyVersion(token, 2); 
            });

            it("initializer cannot be called after initialization", async function () {
                const secManAddr = await vault.securityManager();
                await expectRevert(
                    () => token.initialize("X", "Y", 12, 0, secManAddr),
                    constants.errorMessages.CONTRACT_ALREADY_INITIALIZED
                );
            });
        });
    });
}