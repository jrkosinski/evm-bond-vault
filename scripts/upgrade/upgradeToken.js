const { ethers, upgrades } = require("hardhat");
const constants = require("../constants");
const deployer = require("../deployer");
const utils = require("../lib/utils");
const Runner = require("../lib/runner");
const showGraphic = require("../lib/showGraphic");

Runner.run(async (provider) => {
    showGraphic();

    const token = await ethers.getContractAt(constants.TOKEN_CONTRACT_ID, constants[constants.NETWORK].VAULT_TOKEN_ADDRESS);

    console.log("token address:", token.address);
    console.log("token implementation address:", await provider.getStorageAt(token.address, "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"));

    //console.log("upgrading token...");
    //await utils.upgradeProxy("TokenV2", token.address);
    //console.log("...done");
});
