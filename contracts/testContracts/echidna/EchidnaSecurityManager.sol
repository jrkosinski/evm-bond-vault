// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "../../inc/AccessControl.sol"; 
import "../../ISecurityManager.sol"; 

contract EchidnaSecurityRoles {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE"); 
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE"); 
    bytes32 public constant DEPOSIT_MANAGER_ROLE = keccak256("DEPOSIT_MANAGER_ROLE"); 
    bytes32 public constant GENERAL_MANAGER_ROLE = keccak256("GENERAL_MANAGER_ROLE"); 
    bytes32 public constant LIFECYCLE_MANAGER_ROLE = keccak256("LIFECYCLE_MANAGER_ROLE"); 
    bytes32 public constant WHITELIST_MANAGER_ROLE = keccak256("WHITELIST_MANAGER_ROLE"); 
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE"); 
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE"); 
}

//USED IN TESTS ONLY; SHOULD NOT BE DEPLOYED TO MAINNET
contract EchidnaSecurityManager is AccessControl, EchidnaSecurityRoles, ISecurityManager  {
    bool public manageRolesEnabled; //allows authorized to grant, revoke, renounce roles 
    mapping(bytes32 => bool) grantRoleDisabled; 
    
    constructor(bool _manageRolesEnabled) {
        manageRolesEnabled = _manageRolesEnabled;
    }
    
    function hasRole(bytes32 role, address account) public view virtual override(AccessControl, ISecurityManager) returns (bool) {
        return super.hasRole(role, account);
    }
    
    function renounceRole(bytes32 role) public virtual  {
        if (manageRolesEnabled && role != ADMIN_ROLE) {
            super.renounceRole(role, msg.sender);
        }
    }
    
    function revokeRole(bytes32 role, address account) public virtual override onlyRole(ADMIN_ROLE) {
        if (manageRolesEnabled && (account != msg.sender || role != ADMIN_ROLE)) {
            super.revokeRole(role, account);
        }
    }
    
    function grantRole(bytes32 role, address account) public virtual override onlyRole(ADMIN_ROLE) {
        if (manageRolesEnabled) {
            _grantRole(role, account); 
        }
    }
    
    function disableGrantRole(bytes32 role) public onlyRole(ADMIN_ROLE) {
        grantRoleDisabled[role] = true;
    }
    
    function grantRole_admin(address account) public virtual onlyRole(ADMIN_ROLE) {grantRole(ADMIN_ROLE, account); }
    function revokeRole_admin(address account) public virtual onlyRole(ADMIN_ROLE) {revokeRole(ADMIN_ROLE, account); }
    function renounceRole_admin() public virtual {renounceRole(ADMIN_ROLE); }
    
    function grantRole_burner(address account) public virtual onlyRole(ADMIN_ROLE) {grantRole(BURNER_ROLE, account); }
    function revokeRole_burner(address account) public virtual onlyRole(ADMIN_ROLE) {revokeRole(BURNER_ROLE, account); }
    function renounceRole_burner() public virtual {renounceRole(BURNER_ROLE); }
    
    function grantRole_minter(address account) public virtual onlyRole(ADMIN_ROLE) {grantRole(MINTER_ROLE, account); }
    function revokeRole_minter(address account) public virtual onlyRole(ADMIN_ROLE) {revokeRole(MINTER_ROLE, account); }
    function renounceRole_minter() public virtual {renounceRole(MINTER_ROLE); }
    
    function grantRole_lifecycleManager(address account) public virtual onlyRole(ADMIN_ROLE) {grantRole(LIFECYCLE_MANAGER_ROLE, account); }
    function revokeRole_lifecycleManager(address account) public virtual onlyRole(ADMIN_ROLE) {revokeRole(LIFECYCLE_MANAGER_ROLE, account); }
    function renounceRole_lifecycleManager() public virtual {renounceRole(LIFECYCLE_MANAGER_ROLE); }
    
    function grantRole_whitelistManager(address account) public virtual onlyRole(ADMIN_ROLE) {grantRole(WHITELIST_MANAGER_ROLE, account); }
    function revokeRole_whitelistManager(address account) public virtual onlyRole(ADMIN_ROLE) {revokeRole(WHITELIST_MANAGER_ROLE, account); }
    function renounceRole_whitelistManager() public virtual {renounceRole(WHITELIST_MANAGER_ROLE); }
    
    function grantRole_generalManager(address account) public virtual onlyRole(ADMIN_ROLE) {grantRole(GENERAL_MANAGER_ROLE, account); }
    function revokeRole_generalManager(address account) public virtual onlyRole(ADMIN_ROLE) {revokeRole(GENERAL_MANAGER_ROLE, account); }
    function renounceRole_generalManager() public virtual {renounceRole(GENERAL_MANAGER_ROLE); }
    
    function grantRole_depositManager(address account) public virtual onlyRole(ADMIN_ROLE) {grantRole(DEPOSIT_MANAGER_ROLE, account); }
    function revokeRole_depositManager(address account) public virtual onlyRole(ADMIN_ROLE) {revokeRole(DEPOSIT_MANAGER_ROLE, account); }
    function renounceRole_depositManager() public virtual {renounceRole(DEPOSIT_MANAGER_ROLE); }
    
    function grantRole_upgrader(address account) public virtual onlyRole(ADMIN_ROLE) {grantRole(UPGRADER_ROLE, account); }
    function revokeRole_upgrader(address account) public virtual onlyRole(ADMIN_ROLE) {revokeRole(UPGRADER_ROLE, account); }
    function renounceRole_upgrader() public virtual {renounceRole(UPGRADER_ROLE); }
    
    function grantRole_pauser(address account) public virtual onlyRole(ADMIN_ROLE) {grantRole(PAUSER_ROLE, account); }
    function revokeRole_pauser(address account) public virtual onlyRole(ADMIN_ROLE) {revokeRole(PAUSER_ROLE, account); }
    function renounceRole_pauser() public virtual {renounceRole(PAUSER_ROLE); }
    
    function setManageRolesEnabled(bool value) public virtual onlyRole(ADMIN_ROLE) {
        manageRolesEnabled = value;
    }
    
    function grantMinterRoleToVault(address vaultAddress) public {
        if (!hasRole(ADMIN_ROLE, msg.sender)) 
            revert("only admin"); 
        _grantRole(MINTER_ROLE, vaultAddress); 
    }
    
    function grantDepositManagerRole(address addr) public {
        if (!hasRole(ADMIN_ROLE, msg.sender)) 
            revert("only admin"); 
        _grantRole(DEPOSIT_MANAGER_ROLE, addr); 
    }
}

contract EchidnaSecurityManagerWithAdmin is EchidnaSecurityManager {
    constructor(address admin, bool _manageRolesEnabled) EchidnaSecurityManager(_manageRolesEnabled) {
        _grantRole(ADMIN_ROLE, admin); 
    }
}
