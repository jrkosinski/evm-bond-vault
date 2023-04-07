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
 * grantRoles exposed:              Y
 * progressPhase exposed:           Y
 * whitelist:                       Y
 * whitelist on/off exposed:        Y
 * whitelist add/remove exposed:    Y
 */
contract security_manager_cannot_be_zero is EchidnaVaultWithProxies {
    
    constructor() EchidnaVaultWithProxies(100_000_000_000) { 
        _addWhitelist();
        _enableManageRoles(); 
        _enableProgressPhase();
        _mintToUsers(100_000_000);
        _enableAddRemoveWhitelist();
        _enableToggleWhitelist();
    }
    
    function setVaultSecurityManager(address addr) public {
        vault.setSecurityManager(ISecurityManager(addr));
    }
    
    function setVaultTokenSecurityManager(address addr) public {
        vaultToken.setSecurityManager(ISecurityManager(addr));
    }
    
    function echidna_vault_security_manager_not_zero() public view returns (bool) {
        return address(vault.securityManager()) != address(0); 
    }
    
    function echidna_vault_token_security_manager_not_zero() public view returns (bool) {
        return address(vaultToken.securityManager()) != address(0); 
    }
    
    function echidna_whitelist_security_manager_not_zero() public view returns (bool) {
        return address(vaultToken.securityManager()) != address(0); 
    }
}