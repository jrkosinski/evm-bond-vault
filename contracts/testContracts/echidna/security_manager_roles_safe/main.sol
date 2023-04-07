// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "../EchidnaSecurityManager.sol";
import "../EchidnaVault.sol";

/**
 * baseToken mint to users:         NA
 * baseToken transfers enabled:     -
 * grantRoles exposed:              -
 * progressPhase exposed:           NA
 * whitelist:                       NA
 * whitelist on/off exposed:        NA
 * whitelist add/remove exposed:    NA
 */
contract security_manager_roles_safe is EchidnaUsers, EchidnaSecurityRoles {
    EchidnaSecurityManager public securityManager; 
    bool private makeTestFail = false; 
    
    constructor() {
        if (!makeTestFail) {
            securityManager = new EchidnaSecurityManager(true); //no admin 
        } else {
            securityManager = new EchidnaSecurityManagerWithAdmin(user1, true); //user1 is admin 
        }
    }
    
    function _roleNotGranted(bytes32 role) internal view returns (bool) {
        if (!makeTestFail) {
            return  
            !securityManager.hasRole(role, user1)  && 
            !securityManager.hasRole(role, user2) &&
            !securityManager.hasRole(role, user3);  
        } else {
            return  
            !securityManager.hasRole(role, user2) &&
            !securityManager.hasRole(role, user3);  
        }
    }
    
    function echidna_admin_role_not_granted() public view returns (bool) {
        return _roleNotGranted(securityManager.ADMIN_ROLE()); 
    }
    
    function echidna_upgrader_role_not_granted() public view returns (bool) {
        return _roleNotGranted(UPGRADER_ROLE); 
    }
    
    function echidna_pauser_role_not_granted() public view returns (bool) {
        return _roleNotGranted(PAUSER_ROLE); 
    }
    
    function echidna_lcm_role_not_granted() public view returns (bool) {
        return _roleNotGranted(LIFECYCLE_MANAGER_ROLE); 
    }
    
    function echidna_dpm_role_not_granted() public view returns (bool) {
        return _roleNotGranted(DEPOSIT_MANAGER_ROLE); 
    }
    
    function echidna_wlm_role_not_granted() public view returns (bool) {
        return _roleNotGranted(WHITELIST_MANAGER_ROLE); 
    }
    
    function echidna_minter_role_not_granted() public view returns (bool) {
        return _roleNotGranted(MINTER_ROLE); 
    }
}

/**
 * baseToken mint to users:         Y
 * baseToken transfers enabled:     -
 * grantRoles exposed:              Y
 * progressPhase exposed:           Y
 * whitelist:                       Y
 * whitelist on/off exposed:        Y
 * whitelist add/remove exposed:    Y
 */
contract security_manager_roles_safe_with_proxies is EchidnaVaultWithProxies, EchidnaSecurityRoles {
    bool private makeTestFail = false; 
    
    constructor() EchidnaVaultWithProxies(100_000_000_000) { 
        _addWhitelist();
        _enableAddRemoveWhitelist();
        _enableToggleWhitelist();
        _enableProgressPhase(); 
        _mintToUsers(100_000_000_000);
        
        if (makeTestFail) {
            _enableManageRoles(); 
        }
        else {
            securityManager.setManageRolesEnabled(false);
        }
    }
    
    function _roleNotGranted(bytes32 role) internal view returns (bool) {
        if (!makeTestFail) {
            return  
            !securityManager.hasRole(role, user1)  && 
            !securityManager.hasRole(role, user2) &&
            !securityManager.hasRole(role, user3);  
        } else {
            return  
            !securityManager.hasRole(role, user2) &&
            !securityManager.hasRole(role, user3);  
        }
    }
    
    function echidna_admin_role_not_granted() public view returns (bool) {
        return _roleNotGranted(securityManager.ADMIN_ROLE()); 
    }
    
    function echidna_upgrader_role_not_granted() public view returns (bool) {
        return _roleNotGranted(UPGRADER_ROLE); 
    }
    
    function echidna_pauser_role_not_granted() public view returns (bool) {
        return _roleNotGranted(PAUSER_ROLE); 
    }
    
    function echidna_lcm_role_not_granted() public view returns (bool) {
        return _roleNotGranted(LIFECYCLE_MANAGER_ROLE); 
    }
    
    function echidna_dpm_role_not_granted() public view returns (bool) {
        return _roleNotGranted(DEPOSIT_MANAGER_ROLE); 
    }
    
    function echidna_wlm_role_not_granted() public view returns (bool) {
        return _roleNotGranted(WHITELIST_MANAGER_ROLE); 
    }
    
    function echidna_minter_role_not_granted() public view returns (bool) {
        return _roleNotGranted(MINTER_ROLE); 
    }
    
    function echidna_manage_roles_disabled() public view returns (bool) {
        return securityManager.manageRolesEnabled() == false;
    }
}
