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
 * whitelist on/off exposed:        -
 * whitelist add/remove exposed:    -
 */
contract vault_address_safe is EchidnaVault {
    
    constructor() EchidnaVault(100_000_000_000) { 
        _addWhitelist();
        _enableProgressPhase();
        _enableManageRoles(); 
        _mintToUsers(100_000_000);
    }
    
    function echidna_vault_address_unchanged() public view returns (bool) {
        return address(vault) == address(vaultToken.vaultAddress()); 
    }
}

/**
 * baseToken mint to users:         Y
 * baseToken transfers enabled:     Y
 * grantRoles exposed:              Y
 * progressPhase exposed:           Y
 * whitelist:                       Y
 * whitelist on/off exposed:        -
 * whitelist add/remove exposed:    -
 */
contract vault_address_safe_with_proxies is EchidnaVaultWithProxies {
    
    constructor() EchidnaVaultWithProxies(100_000_000_000) { 
        _addWhitelist();
        _enableProgressPhase();
        _enableManageRoles(); 
        _mintToUsers(100_000_000);
    }
    
    function echidna_vault_address_unchanged() public view returns (bool) {
        return address(vault) == address(vaultToken.vaultAddress()); 
    }
}
