// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "../../../VaultToken.sol";
import "../../../Vault.sol";
import "../../../SecurityManager.sol";
import "../../MockStableCoin.sol";
import "../EchidnaVault.sol";

/**
 * baseToken mint to users:         -
 * baseToken transfers enabled:     Y
 * grantRoles exposed:              -
 * progressPhase exposed:           -
 * whitelist:                       Y
 * whitelist on/off exposed:        Y
 * whitelist add/remove exposed:    Y
 */
contract whitelist_address_safe is EchidnaVault {
    bool makeTestFail = false;
    
    constructor() EchidnaVault(100_000_000_000) { 
        _addWhitelist();
        _enableAddRemoveWhitelist();
        _enableToggleWhitelist();
        _disableManageRoles();
        
        if (makeTestFail) {
            _enableManageRoles();
            securityManager.grantRole(securityManager.ADMIN_ROLE(), user1); 
            securityManager.grantRole(securityManager.WHITELIST_MANAGER_ROLE(), user1); 
        }
    }
    
    function echidna_vault_whitelist_address_unchanged() public view returns (bool) {
        return address(whitelist) == address(vault.whitelist()); 
    }
}

/**
 * baseToken mint to users:         -
 * baseToken transfers enabled:     Y
 * grantRoles exposed:              -
 * progressPhase exposed:           -
 * whitelist:                       Y
 * whitelist on/off exposed:        Y
 * whitelist add/remove exposed:    Y
 */
contract whitelist_address_safe_with_proxies is EchidnaVaultWithProxies {
    bool makeTestFail = false;
    
    constructor() EchidnaVaultWithProxies(100_000_000_000) {
        _addWhitelist();
        _enableAddRemoveWhitelist();
        _enableToggleWhitelist();
        _disableManageRoles();
        
        if (makeTestFail) {
            _enableManageRoles();
            securityManager.grantRole(securityManager.ADMIN_ROLE(), user1); 
            securityManager.grantRole(securityManager.WHITELIST_MANAGER_ROLE(), user1); 
        }
    }
    
    function echidna_vault_whitelist_address_unchanged() public view returns (bool) {
        return address(whitelist) == address(vault.whitelist()); 
    }
}
