// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "../inc/ERC20.sol";
import "../IVaultToken.sol";

//USED IN TESTS ONLY; SHOULD NOT BE DEPLOYED TO MAINNET
contract TestVaultToken is ERC20 {
    bool private transferEnabled;
    bool private transferFromEnabled;
    address public vaultAddress; 
    
    constructor() ERC20("TEST", "TST") {
        transferEnabled = true;
        transferFromEnabled = true;
    }
    
    function setTransferEnabled(bool value) public {
        transferEnabled = value;
    }
    
    function setTransferFromEnabled(bool value) public {
        transferFromEnabled = value;
    }
    
    function transfer(address to, uint256 amount) public override returns (bool) {
        if (!transferEnabled) 
            return false; 
        
        return super.transfer(to, amount); 
    }
    
    function transferFrom(address owner, address spender, uint256 amount) public override returns (bool) {
        if (!transferFromEnabled) 
            return false; 
        
        return super.transferFrom(owner, spender, amount); 
    }
    
    function transferFromInternal(address owner, address spender, uint256 amount) external returns (bool) {
        if (!transferFromEnabled) 
            return false; 
        
        return super.transferFrom(owner, spender, amount); 
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    
    function setVaultAddress(address addr) external {
        vaultAddress = addr;
    }
    
    function burn(uint256) external pure {}
    function pause() external pure {} 
    function unpause() external pure {}
}