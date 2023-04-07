// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "../../../VaultToken.sol";
import "../../../SecurityManager.sol";
import "../EchidnaSecurityManager.sol";
import "../EchidnaProxy.sol";
import "../EchidnaVault.sol";

/**
 * baseToken mint to users:         -
 * baseToken transfers enabled:     Y
 * grantRoles exposed:              -
 * progressPhase exposed:           -
 * whitelist:                       -
 * whitelist on/off exposed:        NA
 * whitelist add/remove exposed:    NA
 */
contract vault_token_not_upgraded is EchidnaVaultWithProxies {
    bool makeTestFail = false;
    
    constructor() EchidnaVaultWithProxies(100_000_000) {
        if (!makeTestFail) 
            securityManager.disableGrantRole(securityManager.UPGRADER_ROLE()); 
    }
    
    function echidna_vault_token_address_unchanged() external view returns (bool) {
        return (vaultTokenProxy.getImplementation() == address(vaultToken)); 
    }
}
