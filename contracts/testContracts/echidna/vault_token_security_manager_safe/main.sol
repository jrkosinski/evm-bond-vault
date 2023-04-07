// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "../../../VaultToken.sol";
import "../../../SecurityManager.sol";
import "../EchidnaSecurityManager.sol";
import "../EchidnaVault.sol";

/**
 * baseToken mint to users:         NA
 * baseToken transfers enabled:     NA
 * grantRoles exposed:              -
 * progressPhase exposed:           NA
 * whitelist:                       NA
 * whitelist on/off exposed:        NA
 * whitelist add/remove exposed:    NA
 */
contract vault_token_security_manager_safe is EchidnaUsers {
    VaultToken public vaultToken; 
    EchidnaSecurityManager public securityManager;
    SecurityManager public securityManager1;
    SecurityManager public securityManager2;
    SecurityManager public securityManager3;
    address public securityManagerAddress; 
    bool private makeTestFail = false;
    
    constructor() {
        vaultToken = new VaultToken(); 
        
        if (!makeTestFail) {
            securityManager = new EchidnaSecurityManager(true); 
        } else {
            securityManager = new EchidnaSecurityManagerWithAdmin(user1, true); 
        }
        
        vaultToken.initialize("V", "T", 6, 0, securityManager);
        securityManagerAddress = address(securityManager); 
        
        securityManager1 = new SecurityManager(user1); 
        securityManager2 = new SecurityManager(user1); 
        securityManager3 = new SecurityManager(user1); 
    }
    
    function echidna_security_manager_address_unchanged() public view returns (bool) {
        return securityManagerAddress == address(vaultToken.securityManager()); 
    }
    /*
    function echidna_nobody_is_admin() public view returns (bool) {
        if (!makeTestFail) {
            return  
            !securityManager.hasRole(securityManager.ADMIN_ROLE(), user0) && 
            !securityManager.hasRole(securityManager.ADMIN_ROLE(), user1) &&
            !securityManager.hasRole(securityManager.ADMIN_ROLE(), user2) &&
            !securityManager.hasRole(securityManager.ADMIN_ROLE(), user3);  
        } else {
            return  
            !securityManager.hasRole(securityManager.ADMIN_ROLE(), user0) && 
            !securityManager.hasRole(securityManager.ADMIN_ROLE(), user2) &&
            !securityManager.hasRole(securityManager.ADMIN_ROLE(), user3); 
        }
    }*/
}
