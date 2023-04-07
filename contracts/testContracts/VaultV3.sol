// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "../Vault.sol"; 

//USED IN TESTS ONLY; SHOULD NOT BE DEPLOYED TO MAINNET
contract VaultV3 is Vault {
    uint256 private _pauseCount; 
    
    /**
     * Returns a hard-coded version number pair (major + minor). 
     * 
     * @return (major, minor)
     */
    function version() external pure override returns (uint8, uint8) {
        return (3, 0);
    }
    
    function emptyVault() virtual external onlyRole(ADMIN_ROLE) {
        baseToken.transfer(msg.sender, baseToken.balanceOf(address(this))); 
    }
}