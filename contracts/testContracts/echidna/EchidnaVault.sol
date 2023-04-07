// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "../../VaultToken.sol";
import "../../Vault.sol";
import "../../SecurityManager.sol";
import "../../Whitelist.sol";
import "./EchidnaSecurityManager.sol";
import "./EchidnaBaseToken.sol";
import "./EchidnaProxy.sol";

// OPTIONS
// - mint to users 
// - expose progress next phase 
// - allow granting/revoking roles 
// - allow turning whitelist on/off 
// - baseToken allow transfer 
// - allow whitelist add/remove 

contract EchidnaUsers {
    address constant user0 = address(0); 
    address constant user1 = address(0x10000); 
    address constant user2 = address(0x20000); 
    address constant user3 = address(0x30000); 
    address constant userDeadbeef = address(0xDeaDBeef);
}

contract EchidnaVault is EchidnaUsers {
    //internal contracts 
    VaultToken public vaultToken; 
    EchidnaBaseToken public baseToken; 
    Vault public vault; 
    Whitelist public whitelist;
    EchidnaSecurityManagerWithAdmin public securityManager;
    
    //extra security managers 
    SecurityManager public securityManager1;
    SecurityManager public securityManager2;
    SecurityManager public securityManager3;
    address public origSecMgrAddr; 
    
    //options 
    bool public progressPhaseEnabled = false;
    bool public toggleWhitelistEnabled = false;
    bool public addRemoveWhitelistEnabled = false;
    
    constructor(uint256 initialBaseTokenAmount) {
        uint8 decimals = 6; 
        
        //create contracts 
        vaultToken = new VaultToken(); 
        vault = new Vault();
        baseToken = new EchidnaBaseToken(0, decimals); 
        securityManager = new EchidnaSecurityManagerWithAdmin(address(this), true); 
        
        string memory tokenName = "V";
        string memory tokenSym = "T"; 
        uint256 supply = 0; 
        
        //initialize vault & token 
        vaultToken.initialize(tokenName, tokenSym, decimals, supply, securityManager);
        vault.initialize(baseToken, IVaultToken(address(vaultToken)), 0, securityManager); 
        origSecMgrAddr = address(securityManager); 
        
        //associate token w/vault 
        vaultToken.setVaultAddress(address(vault)); 
        baseToken.setVaultAddress(address(vault)); 
        securityManager.grantMinterRoleToVault(address(vault)); 
        securityManager.grantDepositManagerRole(address(this)); 
        
        //mint some base token 
        baseToken.mint(address(vault), initialBaseTokenAmount); 
        
        //create some other security managers 
        securityManager1 = new SecurityManager(user1); 
        securityManager2 = new SecurityManager(user2); 
        securityManager3 = new SecurityManager(user3); 
    }
    
    function progressPhase() public {
        if (progressPhaseEnabled) {
            ExchangeRate memory rate; 
            rate.vaultToken = 1;
            rate.baseToken = 1; 
            
            vault.progressToNextPhase(rate); 
            if (vault.currentPhase() == VaultPhase.Locked) 
                vault.progressToNextPhase(rate); 
        }
    }
    
    function grantRole_admin(address account) public {
        securityManager.grantRole_admin(account); 
    }
    function grantRole_pauser(address account) public {
        securityManager.grantRole_pauser(account); 
    }
    function grantRole_upgrader(address account) public {
        securityManager.grantRole_upgrader(account); 
    }
    function grantRole_generalManager(address account) public {
        securityManager.grantRole_generalManager(account); 
    }
    function grantRole_lifecycleManager(address account) public {
        securityManager.grantRole_lifecycleManager(account); 
    }
    function grantRole_whitelistManager(address account) public {
        securityManager.grantRole_whitelistManager(account); 
    }
    function grantRole_depositManager(address account) public {
        securityManager.grantRole_depositManager(account); 
    }
    function grantRole_minter(address account) public {
        securityManager.grantRole_minter(account); 
    }
    function grantRole_burner(address account) public {
        securityManager.grantRole_burner(account); 
    }
    
    function revokeRole_admin(address account) public {
        securityManager.revokeRole_admin(account); 
    }
    function revokeRole_pauser(address account) public {
        securityManager.revokeRole_pauser(account); 
    }
    function revokeRole_upgrader(address account) public {
        securityManager.revokeRole_upgrader(account); 
    }
    function revokeRole_generalManager(address account) public {
        securityManager.revokeRole_generalManager(account); 
    }
    function revokeRole_lifecycleManager(address account) public {
        securityManager.revokeRole_lifecycleManager(account); 
    }
    function revokeRole_whitelistManager(address account) public {
        securityManager.revokeRole_whitelistManager(account); 
    }
    function revokeRole_depositManager(address account) public {
        securityManager.revokeRole_depositManager(account); 
    }
    function revokeRole_minter(address account) public {
        securityManager.revokeRole_minter(account); 
    }
    function revokeRole_burner(address account) public {
        securityManager.revokeRole_burner(account); 
    }
    
    function toggleWhitelist() public {
        if (toggleWhitelistEnabled) {
            if (address(whitelist) != address(0)) {
                whitelist.setWhitelistOnOff(!whitelist.whitelistOn()); 
            }
        }
    }
    
    function _mintToUsers(uint256 amount) internal {
        baseToken.mint(user1, amount); 
        baseToken.mint(user2, amount); 
        baseToken.mint(user3, amount); 
    }
    
    function _enableProgressPhase() internal {
        progressPhaseEnabled = true;
    }
    
    function _enableManageRoles() internal {
        securityManager.setManageRolesEnabled(true);
    }
    
    function _disableManageRoles() internal {
        securityManager.setManageRolesEnabled(false);
    }
    
    function _enableToggleWhitelist() internal {
        toggleWhitelistEnabled = true;
    }
    
    function _enableAddRemoveWhitelist() internal {
        addRemoveWhitelistEnabled = true;
    }
    
    function _addWhitelist() internal {
        whitelist = new Whitelist(securityManager); 
        securityManager.grantRole(keccak256("WHITELIST_MANAGER_ROLE"), address(this));
        vault.setWhitelist(whitelist); 
    }
    
    function _disableGrantRole(bytes32 role) internal {
        securityManager.disableGrantRole(role);
    }
}

contract EchidnaVaultWithProxies is EchidnaVault {
    VaultToken public anotherToken; 
    Vault public anotherVault; 
    EchidnaVaultProxy vaultProxy;
    EchidnaVaultTokenProxy vaultTokenProxy;
    
    constructor(uint256 initialBaseTokenAmount) EchidnaVault(initialBaseTokenAmount) {
        uint8 decimals = 6; 
        
        //create contracts 
        vaultToken = new VaultToken(); 
        anotherToken = new VaultToken(); 
        vault = new Vault();
        anotherVault = new Vault();
        baseToken = new EchidnaBaseToken(0, decimals); 
        securityManager = new EchidnaSecurityManagerWithAdmin(address(this), true); 
        
        string memory tokenName = "V";
        string memory tokenSym = "T"; 
        uint256 initialSupply = 0; 
        
        //initialize vault token & vault token proxy
        vaultToken.initialize(tokenName, tokenSym, decimals, initialSupply, securityManager);
        anotherToken.initialize(tokenName, tokenSym, decimals, initialSupply, securityManager); 
        
        //proxy 
        //bytes4 tokenInitSig = bytes4(keccak256("initialize(string,string,uint8,uint256,address)"));
        //bytes memory tokenInitCall = abi.encodeWithSelector(tokenInitSig, tokenName, tokenSym, decimals, initialSupply, securityManager);         
        vaultTokenProxy = new EchidnaVaultTokenProxy(vaultToken, tokenName, tokenSym, decimals, initialSupply, securityManager);
        
        //initialize vault & vault proxy
        vault.initialize(baseToken, IVaultToken(address(vaultToken)), 0, securityManager); 
        anotherVault.initialize(baseToken, IVaultToken(address(anotherToken)), 0, securityManager); 
        origSecMgrAddr = address(securityManager); 
        
        //proxy
        //bytes4 vaultInitSig = bytes4(keccak256("initialize(address,address,uint256,address)"));
        //bytes memory vaultInitCall = abi.encodeWithSelector(vaultInitSig, address(baseToken), address(vaultToken), 0, address(securityManager)); 
        vaultProxy = new EchidnaVaultProxy(vault, baseToken, IVaultToken(address(vaultToken)), 0, securityManager);
        
        //associate token w/vault 
        vaultToken.setVaultAddress(address(vault)); 
        baseToken.setVaultAddress(address(vault)); 
        securityManager.grantMinterRoleToVault(address(vault)); 
        
        //mint some base token 
        baseToken.mint(address(vault), initialBaseTokenAmount); 
        
        //create some other security managers 
        securityManager1 = new SecurityManager(user1); 
        securityManager2 = new SecurityManager(user2); 
        securityManager3 = new SecurityManager(user3); 
    }
}