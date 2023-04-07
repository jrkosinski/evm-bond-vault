const { expect } = require("chai");
const { ethers } = require("hardhat");
const constants = require("../util/constants");
const deploy = require("../util/deploy");
const { expectRevert, expectEvent } = require("../util/testUtils");

describe(constants.VAULT_CONTRACT_ID + ": Constructor", function () {
    let vaultToken, baseToken, whitelist;        //contracts
    let owner, addr1, addr2, addr3; 	        //accounts

    beforeEach(async function () {
        [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

        //contract
        let v;
        [vaultToken, v, baseToken] = await deploy.deployAll(false);
        whitelist = await deploy.deployWhitelist(await v.securityManager()); 
    });

    describe("Security Manager", function () {

        it("can't pass zero address for security manager", async function () {
            const vaultToken = await deploy.deployToken();
            await expectRevert(
                () => deploy.deployVault(
                    baseToken.address,
                    vaultToken.address,
                    0,
                    false,
                    constants.ZERO_ADDRESS),
                constants.errorMessages.ZERO_ADDRESS
            );
        });

        it("can't pass bogus security manager", async function () {
            const vaultToken = await deploy.deployToken();
            await expectRevert(
                () => deploy.deployVault(
                    baseToken.address,
                    vaultToken.address,
                    0,
                    false,
                    baseToken.address),
                constants.errorMessages.LOWLEVEL_DELEGATE_CALL
            );
        });
    });

    describe("Tokens", function () {
        it("can't pass zero address for base token", async function () {
            await expectRevert(
                () => deploy.deployVault(constants.ZERO_ADDRESS),
                'Base Token 0 address'
            );
        });

        it("can't pass zero address for vault token", async function () {
            await expectRevert(
                () => deploy.deployVault(baseToken.address, constants.ZERO_ADDRESS),
                'Vault Token 0 address'
            );
        });

        it("can't pass non-contract for base token", async function () {
            //const expectedError = constants.errorMessages.VAULT_INVALID_TOKEN_CONTRACT(addr1.address); 
            await expectRevert(
                () => deploy.deployVault(addr1.address),
                'BaseToken invalid contract'
            );
        });

        it("can't pass non-contract vault token", async function () {
            //const expectedError = constants.errorMessages.VAULT_INVALID_TOKEN_CONTRACT(addr1.address); 
            await expectRevert(
                () => deploy.deployVault(baseToken.address, addr1.address),
                'VaultToken invalid contract'
            );
        });

        it("can't pass non-ERC20 for base token", async function () {
            await expectRevert(
                () => deploy.deployVault(whitelist.address),
                constants.errorMessages.VAULT_NOT_ERC20
            );
        });

        it("can't pass non-ERC20 vault token", async function () {
            await expectRevert(
                () => deploy.deployVault(baseToken.address, whitelist.address),
                constants.errorMessages.VAULT_NOT_ERC20
            );
        });

        it("can't pass an already-used vault token", async function () {
            const testToken = await deploy.deployTestToken(); 
            await testToken.setVaultAddress(testToken.address); 
            
            await expectRevert(
                () => deploy.deployVault(baseToken.address, testToken.address),
                'Vault Token already in use'
            );
        });
    });
});