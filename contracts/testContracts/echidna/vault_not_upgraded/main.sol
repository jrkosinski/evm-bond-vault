// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "../../../VaultToken.sol";
import "../../../SecurityManager.sol";
import "../../../deployment/Proxy.sol";
import "../EchidnaSecurityManager.sol";
import "../EchidnaVault.sol";
import "../EchidnaProxy.sol";

/**
 * baseToken mint to users:         -
 * baseToken transfers enabled:     Y
 * grantRoles exposed:              -
 * progressPhase exposed:           -
 * whitelist:                       Y
 * whitelist on/off exposed:        -
 * whitelist add/remove exposed:    -
 */
contract vault_not_upgraded is EchidnaVaultWithProxies {
    constructor() EchidnaVaultWithProxies(1_000_000_000_000) { 
        _addWhitelist();
    }
    
    function echidna_vault_address_unchanged() external view returns (bool) {
        return (vaultProxy.getImplementation() == address(vault));
    }
    
    function echidna_vault_token_address_unchanged() external view returns (bool) {
        return (vaultTokenProxy.getImplementation() == address(vaultToken));
    }
}