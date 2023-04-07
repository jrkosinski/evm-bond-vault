const { ethers, upgrades } = require("hardhat");
const constants = require("./constants");
const deployer = require("./deployer");
const utils = require("./lib/utils");
const Runner = require("./lib/runner");
const showGraphic = require("./lib/showGraphic");

Runner.run(async (provider) => {
    showGraphic();

    const vault = await ethers.getContractAt(constants.VAULT_CONTRACT_ID, constants[constants.NETWORK].VAULT_ADDRESS);
    
    console.log("vault address:", vault.address); 
    console.log("vault implementation address:", await provider.getStorageAt(vault.address, "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc")); 

    //console.log("upgrading vault...");
    //await utils.upgradeProxy("VaultV3", vault.address);
    //console.log("...done");
});
