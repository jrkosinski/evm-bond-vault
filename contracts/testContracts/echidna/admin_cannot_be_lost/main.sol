// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "../EchidnaSecurityManager.sol";
import "../EchidnaVault.sol";

/**
 * baseToken mint to users:         NA
 * baseToken transfers enabled:     NA
 * grantRoles exposed:              Y
 * progressPhase exposed:           NA
 * whitelist:                       NA
 * whitelist on/off exposed:        NA
 * whitelist add/remove exposed:    NA
 */
contract admin_cannot_be_lost  {
    EchidnaSecurityManagerWithAdmin public securityManager; 
    
    address constant user0 = address(0); 
    address constant user1 = address(0x10000); 
    address constant user2 = address(0x20000); 
    address constant user3 = address(0x30000); 
    address constant userDeadbeef = address(0xDeaDBeef);
    
    constructor() {
        securityManager = new EchidnaSecurityManagerWithAdmin(user1, true); 
    }
    
    function echidna_someone_is_admin() public view returns (bool) {
        return  securityManager.hasRole(securityManager.ADMIN_ROLE(), user1) ||  
                securityManager.hasRole(securityManager.ADMIN_ROLE(), user2) ||  
                securityManager.hasRole(securityManager.ADMIN_ROLE(), user3) ||  
                securityManager.hasRole(securityManager.ADMIN_ROLE(), user0);  
    }
}
