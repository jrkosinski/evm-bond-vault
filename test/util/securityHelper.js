const { ethers } = require("hardhat"); 
const constants = require("./constants");
const utils = require("../../scripts/lib/utils");

async function getSecurityManager(contract) {
    let secManagerAddr;
    try { 
        secManagerAddr = await contract.securityManager(); 
    }
    catch(e) {
        secManagerAddr = contract.address;
    }
    return await ethers.getContractAt(constants.SECURITY_CONTRACT_ID, secManagerAddr);
}

async function grantRole(contract, roleId, address, caller = null) {
    const secMan = await getSecurityManager(contract);
    if (caller) {
        await secMan.connect(caller).grantRole(roleId, address);
    } else {
        await secMan.grantRole(roleId, address);
    }
}

async function revokeRole(contract, roleId, address, caller = null) {
    const secMan = await getSecurityManager(contract);
    if (caller) {
        await secMan.connect(caller).revokeRole(roleId, address);
    } else {
        await secMan.revokeRole(roleId, address);
    }
}

async function renounceRole(contract, roleId, address, caller = null) {
    const secMan = await getSecurityManager(contract);
    if (caller) {
        await secMan.connect(caller).renounceRole(roleId, address);
    } else {
        await secMan.renounceRole(roleId, address);
    }
}

async function hasRole(contract, roleId, address) {
    const secMan = await getSecurityManager(contract);
    return secMan.hasRole(roleId, address);
}

module.exports = {
    getSecurityManager,
    grantRole,
    renounceRole, 
    revokeRole, 
    hasRole
};