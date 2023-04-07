const utils = require("./lib/utils");
const constants = require("./constants");
const { ethers } = require("hardhat");

function getCurrentConfig() {
    return constants[constants.NETWORK]; 
}

function getVaultAddress() {
    return getCurrentConfig().VAULT_ADDRESS;
}

function getBaseTokenAddress() {
    return getCurrentConfig().STABLE_TOKEN_ADDRESS;
}

function getVaultTokenAddress() {
    return getCurrentConfig().VAULT_TOKEN_ADDRESS;
}

function getSecurityManagerAddress() {
    return getCurrentConfig().SECURITY_MANAGER_ADDRESS;
}

function getWhitelistAddress() {
    return getCurrentConfig().WHITELIST_ADDRESS;
}

function getDepositVaultAddress() {
    return getCurrentConfig().DEPOSIT_VAULT_ADDRESS;
}

async function getVault() {
    return await ethers.getContractAt(constants.VAULT_CONTRACT_ID, getVaultAddress()); 
}

async function getBaseToken() {
    return await ethers.getContractAt(constants.STABLECOIN_CONTRACT_ID, getBaseTokenAddress());
}

async function getVaultToken() {
    return await ethers.getContractAt(constants.TOKEN_CONTRACT_ID, getVaultTokenAddress());
}

async function getSecurityManager() {
    return await ethers.getContractAt(constants.SECURITY_CONTRACT_ID, getSecurityManagerAddress());
}

async function getWhitelist() {
    return await ethers.getContractAt(constants.WHITELIST_CONTRACT_ID, getWhitelistAddress());
}

async function getDepositVault() {
    return await ethers.getContractAt(constants.DEPOSIT_VAULT_CONTRACT_ID, getDepositVaultAddress());
}

module.exports = {
    getCurrentConfig, 
    getVaultAddress, 
    getBaseTokenAddress, 
    getVaultTokenAddress, 
    getVaultAddress, 
    getSecurityManagerAddress, 
    getWhitelistAddress,
    getDepositVaultAddress, 
    
    getVault,
    getBaseToken,
    getVaultToken,
    getVault,
    getSecurityManager,
    getWhitelist,
    getDepositVault
}