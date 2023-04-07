const constants = require("./constants");
const { ethers } = require("hardhat");
const utils = require("../../scripts/lib/utils");
const testFlags = require("../testFlags");
const { grantRole } = require("./securityHelper"); 

async function deployToken(securityManagerAddress = null) {
    if (!securityManagerAddress) {
        const securityManager = await deploySecurityManager();
        securityManagerAddress = securityManager.address;
    }
        
    const token = await utils.deployContractUpgradeableSilent(
        constants.TOKEN_CONTRACT_ID,
        [
            constants.TOKEN_NAME,
            constants.TOKEN_SYMBOL,
            constants.DEFAULT_TOKEN_DECIMALS,
            constants.INITIAL_SUPPLY, 
            securityManagerAddress
        ]
    );

    //upgrade if flag is set 
    if (testFlags.upgradeToken) {
        await upgradeToken(token.address);
    }
    
    return token;
}

async function deployStableCoin(initialMint = 100000, decimals = 0) {
    if (decimals <= 0) 
        decimals = constants.DEFAULT_TOKEN_DECIMALS; 
    return await utils.deployContractSilent(constants.STABLECOIN_CONTRACT_ID, [initialMint, decimals]);
}

async function deployMathTestContract() {
    return await utils.deployContractSilent("MathTest");
}

async function deployWhitelist(securityMgrAddr) {
    return await utils.deployContractSilent(constants.WHITELIST_CONTRACT_ID, [securityMgrAddr]);
}

async function deploySecurityManager(adminAccount) {
    if (!adminAccount) {
        const [admin] = await ethers.getSigners();
        adminAccount = admin;
    }
    const security = await utils.deployContractSilent(constants.SECURITY_CONTRACT_ID, [adminAccount.address]);
    
    //grant all roles to admin 
    await Promise.all([
        security.connect(adminAccount).grantRole(constants.roles.TOKEN_BURNER, adminAccount.address),
        security.connect(adminAccount).grantRole(constants.roles.TOKEN_MINTER, adminAccount.address),
        security.connect(adminAccount).grantRole(constants.roles.LIFECYCLE_MANAGER, adminAccount.address),
        security.connect(adminAccount).grantRole(constants.roles.WHITELIST_MANAGER, adminAccount.address),
        security.connect(adminAccount).grantRole(constants.roles.GENERAL_MANAGER, adminAccount.address),
        security.connect(adminAccount).grantRole(constants.roles.PAUSER, adminAccount.address),
        security.connect(adminAccount).grantRole(constants.roles.UPGRADER, adminAccount.address)
    ]); 
    
    return security;
}

async function deployVault(
    baseTokenAddress,
    vaultTokenAddress = null,
    minimumDeposit = constants.DEFAULT_MIN_DEPOSIT, 
    associateVaultToken = true,
    securityManagerAddress = null
) {
    //deploy security manager 
    if (!securityManagerAddress) {
        const securityManager = await deploySecurityManager(); 
        securityManagerAddress = securityManager.address;
    }
    
    //deploy vault token 
    let vaultToken;
    if (vaultTokenAddress)
        vaultToken = await ethers.getContractAt(constants.TOKEN_CONTRACT_ID, vaultTokenAddress);
    else
        vaultToken = await deployToken(securityManagerAddress); 
    
    //deploy vault 
    const vault = await utils.deployContractUpgradeableSilent(constants.VAULT_CONTRACT_ID, [
        baseTokenAddress,
        vaultToken.address,
        minimumDeposit, 
        securityManagerAddress
    ]);

    //give vault all the permissions to token 
    await setInitialVaultTokenRoles(vault, vaultToken);

    //associate vault with token 
    if (associateVaultToken) 
        await vaultToken.setVaultAddress(vault.address);
    
    //upgrade if flag is set 
    if (testFlags.upgradeVault) {
        await upgradeVault("VaultV2", vault.address); 
    }
    
    return vault; 
}

async function deployDepositVault(
    vaultAddress,
    baseTokenAddress
) {
    return await utils.deployContractSilent(constants.DEPOSIT_VAULT_CONTRACT_ID, [
        vaultAddress, 
        baseTokenAddress
    ]);
}

async function setInitialVaultTokenRoles(vault, vaultToken) {
    grantRole(vaultToken, constants.roles.TOKEN_MINTER, vault.address);
    //grantRole(vaultToken, constants.roles.TOKEN_BURNER, vault.address);
}

async function deployAll(withWhitelist = true) {
    const baseToken = await deployStableCoin();
    const vault = await deployVault(baseToken.address);
    const vaultToken = await getVaultToken(vault);
    const securityManager = await getSecurityManager(vault);

    let whitelist = null;
    if (withWhitelist) {
        whitelist = await deployWhitelist(securityManager.address);
        vault.setWhitelist(whitelist.address); 
    }
    
    return [
        vaultToken, vault, baseToken, whitelist, securityManager
    ];
}

async function deployTestToken() {
    return await utils.deployContractSilent("TestVaultToken");
}

async function deployVaultWithTestToken() {
    const baseToken = await deployStableCoin();
    const vaultToken = await deployTestToken();

    //deploy security manager 
    const securityManager = await deploySecurityManager(); 

    //deploy vault 
    const vault = await utils.deployContractUpgradeableSilent(constants.VAULT_CONTRACT_ID, [
        baseToken.address,
        vaultToken.address,
        constants.DEFAULT_MIN_DEPOSIT, 
        securityManager.address
    ]);

    //give vault all the permissions to token 
    await setInitialVaultTokenRoles(vault, vaultToken);

    return [
        vaultToken, vault, baseToken
    ];
}

async function deployContractSizer() {
    return await utils.deployContractSilent("ContractSizer", []);
}

async function upgradeVault(implContractName, address) {
    return await utils.upgradeProxy(implContractName, address); 
}

async function downgradeVault(address) {
    return await utils.upgradeProxy(constants.VAULT_CONTRACT_ID, address);
}

async function upgradeToken(address) {
    return await utils.upgradeProxy("VaultTokenV2", address);
}

async function downgradeToken(address) {
    return await utils.upgradeProxy(constants.TOKEN_CONTRACT_ID, address);
}

async function getVaultToken(vaultContract) {
    return await ethers.getContractAt(constants.TOKEN_CONTRACT_ID, await vaultContract.vaultToken()); 
}

async function getBaseToken(vaultContract) {
    return await ethers.getContractAt(constants.TOKEN_CONTRACT_ID, await vaultContract.baseToken());
}

async function getWhitelist(vaultContract) {
    return await ethers.getContractAt(constants.WHITELIST_CONTRACT_ID, await vaultContract.whitelist());
}

async function getSecurityManager(vaultContract) {
    return await ethers.getContractAt(constants.SECURITY_CONTRACT_ID, await vaultContract.securityManager());
}

module.exports = {
    deployToken,
    deployVault,
    deployDepositVault,
    deployStableCoin,
    deployMathTestContract,
    deployTestToken,
    deployWhitelist,
    deploySecurityManager,
    deployAll,
    deployVaultWithTestToken,
    deployContractSizer,
    
    getVaultToken, 
    getBaseToken, 
    getWhitelist,
    getSecurityManager,
    
    upgradeVault, 
    upgradeToken, 
    downgradeVault, 
    downgradeToken
};