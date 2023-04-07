// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "../../../VaultToken.sol";
import "../../../Vault.sol";
import "../../../SecurityManager.sol";
import "../../MockStableCoin.sol";
import "../EchidnaVault.sol";


/**
 * baseToken mint to users:         Y
 * baseToken transfers enabled:     -
 * grantRoles exposed:              -
 * progressPhase exposed:           Y
 * whitelist:                       Y
 * whitelist on/off exposed:        -
 * whitelist add/remove exposed:    -
 */
contract non_whitelisted_users_blocked is EchidnaVault {
    uint256 public mintPerUser = 100_000_000_000; 
    
    constructor() EchidnaVault(100_000_000_000) { 
        _enableProgressPhase(); 
        _mintToUsers(mintPerUser); 
        _addWhitelist(); 
        _disableGrantRole(securityManager.WHITELIST_MANAGER_ROLE()); 
    }
    
    //function echidna_base_token_amount_unchanged() public view returns (bool) {
    //    return baseToken.balanceOf(user1) + baseToken.balanceOf(user2) + baseToken.balanceOf(user3) == (mintPerUser*3);
    //}
    
    function echidna_user1_no_withdrawals_no_deposits() public view returns (bool) {
        return vaultToken.balanceOf(user1) == 0; 
    }
    
    function echidna_user2_no_withdrawals_no_deposits() public view returns (bool) {
        return vaultToken.balanceOf(user2) == 0; 
    }
    
    function echidna_user3_no_withdrawals_no_deposits() public view returns (bool) {
        return  vaultToken.balanceOf(user3) == 0; 
    }
}


/**
 * baseToken mint to users:         Y
 * baseToken transfers enabled:     -
 * grantRoles exposed:              -
 * progressPhase exposed:           Y
 * whitelist:                       Y
 * whitelist on/off exposed:        -
 * whitelist add/remove exposed:    -
 */
contract non_whitelisted_users_blocked_with_proxies is EchidnaVaultWithProxies {
    uint256 public mintPerUser = 100_000_000_000; 
    
    constructor() EchidnaVaultWithProxies(100_000_000_000) { 
        _enableProgressPhase(); 
        _mintToUsers(mintPerUser);
        _addWhitelist(); 
    }
    
    function echidna_user1_no_withdrawals_no_deposits() public view returns (bool) {
        return vaultToken.balanceOf(user1) == 0; 
    }
    
    function echidna_user2_no_withdrawals_no_deposits() public view returns (bool) {
        return vaultToken.balanceOf(user2) == 0; 
    }
    
    function echidna_user3_no_withdrawals_no_deposits() public view returns (bool) {
        return  vaultToken.balanceOf(user3) == 0; 
    }
}
