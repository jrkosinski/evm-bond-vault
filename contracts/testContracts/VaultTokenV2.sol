// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "../VaultToken.sol"; 

//import "hardhat/console.sol";

//USED IN TESTS ONLY; SHOULD NOT BE DEPLOYED TO MAINNET
contract VaultTokenV2 is VaultToken {
    uint256 _extraCount; 
    
    /**
     * Returns a hard-coded version number pair (major + minor). 
     * 
     * @return (major, minor)
     */
    function version() external pure override returns (uint8, uint8) {
        return (2, 0);
    }
    
    function transfer(
        address to,
        uint256 amount
    ) public virtual override returns (bool) {
        super.transfer(to, amount); 
        _mint(address(this), 1); 
        _extraCount++; 
        return true;
    }
    
    function totalSupply() public virtual override(ERC20Upgradeable) view returns (uint256) {
        return super.totalSupply() - _extraCount;
    }
    
    function extraCount() public view returns (uint256) {
        return _extraCount;
    }
    
    function aCallableMethod() public pure {
        
    }
}