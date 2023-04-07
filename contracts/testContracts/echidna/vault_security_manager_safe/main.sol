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
 * whitelist on/off exposed:        -
 * whitelist add/remove exposed:    -
 */
contract vault_security_manager_safe is EchidnaVault {
    bool makeTestFail = false; 
    
    constructor() EchidnaVault(100_000_000_000) { 
        _addWhitelist();
        
        if (makeTestFail)
            _enableManageRoles(); 
        else {
            securityManager.setManageRolesEnabled(false);
        }
    }
    
    function echidna_vault_token_security_manager_address_unchanged() public view returns (bool) {
        return origSecMgrAddr == address(vaultToken.securityManager()); 
    }
    
    function echidna_vault_security_manager_address_unchanged() public view returns (bool) {
        return origSecMgrAddr == address(vault.securityManager()); 
    }
}

/**
 * baseToken mint to users:         -
 * baseToken transfers enabled:     Y
 * grantRoles exposed:              -
 * progressPhase exposed:           -
 * whitelist:                       Y
 * whitelist on/off exposed:        -
 * whitelist add/remove exposed:    -
 */
contract vault_security_manager_safe_with_proxies is EchidnaVaultWithProxies {
    bool makeTestFail = false; 
    
    constructor() EchidnaVaultWithProxies(100_000_000_000) { 
        _addWhitelist();
        
        if (makeTestFail)
            _enableManageRoles(); 
        else {
            securityManager.setManageRolesEnabled(false);
        }
    }
    
    function echidna_vault_token_security_manager_address_unchanged() public view returns (bool) {
        return origSecMgrAddr == address(vaultToken.securityManager()); 
    }
    
    function echidna_vault_security_manager_address_unchanged() public view returns (bool) {
        return origSecMgrAddr == address(vault.securityManager()); 
    }
}