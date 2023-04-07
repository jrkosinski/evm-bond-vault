// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "../../inc/ERC20.sol";
import "./EchidnaVault.sol";

//USED IN TESTS ONLY; SHOULD NOT BE DEPLOYED TO MAINNET
contract EchidnaBaseToken is ERC20, EchidnaUsers {
    address private owner; 
    address public vaultAddress; 
    uint8 public numDecimals;
    bool public transfersEnabled = true;
    
    constructor(uint256 initialSupply, uint8 _decimals) ERC20("USD StableCoin", "USDC") {
        owner = msg.sender;
        numDecimals = _decimals;
        if (initialSupply > 0) {
            _mint(_msgSender(), initialSupply); 
        }
    }
    
    function mint(address to, uint256 amount) external {
        if (msg.sender != owner) 
            revert("only owner"); 
        _mint(to, amount);
    }
    
    function setVaultAddress(address vault) external {
        if (msg.sender != owner) 
            revert("only owner"); 
        vaultAddress =vault;
    }
    
    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        if (!transfersEnabled) 
            return false; 
            
        if (to == user1 || to == user2 || to == user3) {
            return super.transfer(to, amount); 
        }
        return false;
    }
    
    function transferFrom(address from, address to, uint256 amount) public virtual override returns (bool) {
        if (!transfersEnabled) 
            return false; 
            
        if (to == user1 || to == user2 || to == user3 || to == vaultAddress) {
            return super.transferFrom(from, to, amount); 
        }
        return false;
    }
    
    function decimals() public view virtual override returns (uint8) {
        return numDecimals;
    }
    
    function _disableTransfers() internal {
        transfersEnabled = false;
    }
}