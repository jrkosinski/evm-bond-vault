// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "../Vault.sol"; 

//USED IN TESTS ONLY; SHOULD NOT BE DEPLOYED TO MAINNET
contract VaultV2 is Vault {
    uint256 private _pauseCount; 
    
    /**
     * Returns a hard-coded version number pair (major + minor). 
     * 
     * @return (major, minor)
     */
    function version() external pure virtual override returns (uint8, uint8) {
        return (2, 0);
    }
    
    function pause() external override onlyRole(PAUSER_ROLE) {
        _pause();
        _pauseCount++; 
    }
    
    function pauseCount() external virtual view returns(uint256) {
        return _pauseCount;
    }
    
    function setExchangeRate(ExchangeRate calldata rate) virtual external {
        currentExchangeRate = rate;
    }
    
    function aCallableMethod() public pure {
        
    }
}