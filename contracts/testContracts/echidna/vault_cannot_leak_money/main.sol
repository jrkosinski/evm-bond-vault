// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "../../../VaultToken.sol";
import "../../../Vault.sol";
import "../../../SecurityManager.sol";
import "../../MockStableCoin.sol";
import "../EchidnaVault.sol";

/**
 * baseToken mint to users:         Y
 * baseToken transfers enabled:     Y
 * grantRoles exposed:              -
 * progressPhase exposed:           Y
 * whitelist:                       -
 * whitelist on/off exposed:        -
 * whitelist add/remove exposed:    -
 */
contract vault_cannot_leak_money is EchidnaVault {
    uint256 public mintPerUser = 100_000_000_000; 
    
    constructor() EchidnaVault(0) { 
        _mintToUsers(mintPerUser);
        _enableProgressPhase();
        _disableManageRoles(); 
    }
    
    function user1Deposit(uint256 amount) public {
        _userDeposit(user1, amount); 
    }
    
    function user2Deposit(uint256 amount) public {
        _userDeposit(user2, amount); 
    }
    
    function user3Deposit(uint256 amount) public {
        _userDeposit(user3, amount); 
    }
    
    function _userDeposit(address user, uint256 amount) internal {
        baseToken.approve(address(vault), amount); 
        vault.depositFor(amount, user); 
    }
    
    function getTotalBaseTokenOwned() internal view returns (uint256) {
        return baseToken.balanceOf(user1) + 
            baseToken.balanceOf(user2) + 
            baseToken.balanceOf(user3) + 
            baseToken.balanceOf(user0) + 
            baseToken.balanceOf(userDeadbeef) + 
            baseToken.balanceOf(address(vault));
    }
    
    function getTotalVaultTokenOwned() internal view returns (uint256) {
        return vaultToken.balanceOf(user1) + 
            vaultToken.balanceOf(user2) + 
            vaultToken.balanceOf(user3) + 
            vaultToken.balanceOf(address(vault)); 
    }
    
    function echidna_base_token_totals_consistent() public view returns (bool) {
        uint256 totalBaseToken = getTotalBaseTokenOwned(); 
        
        return baseToken.totalSupply() == totalBaseToken && totalBaseToken == (mintPerUser * 3);
    }
    
    function echidna_vault_token_totals_consistent() public view returns (bool) {
        uint256 totalVaultToken = getTotalVaultTokenOwned(); 
        
        return vaultToken.totalSupply() == totalVaultToken;
    }
    
    function echidna_total_money_supply_consistent() public view returns (bool) {
        uint256 totalVaultToken = getTotalVaultTokenOwned(); 
        uint256 totalBaseToken = getTotalBaseTokenOwned(); 
        
        return totalVaultToken <= totalBaseToken;
    }
}
