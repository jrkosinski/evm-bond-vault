// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "../inc/ERC20.sol";

//USED IN TESTS ONLY; SHOULD NOT BE DEPLOYED TO MAINNET
contract MockStableCoin is Context, ERC20 {
    uint8 private numDecimals;
    bool private transferEnabled = true; 
    bool private transferFromEnabled = true;
    
    constructor(uint256 initialSupply, uint8 _decimals) ERC20("USD StableCoin", "USDC") {
        numDecimals = _decimals;
        transferEnabled = true;
        transferFromEnabled = true;
        
        if (initialSupply > 0) {
            _mint(_msgSender(), initialSupply); 
        }
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    
    function decimals() public view virtual override returns (uint8) {
        return numDecimals;
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
}