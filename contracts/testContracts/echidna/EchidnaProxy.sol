// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "../../VaultToken.sol";
import "../../Vault.sol";
import "../../SecurityManager.sol";
import "../../deployment/Proxy.sol";
import "./EchidnaSecurityManager.sol";
import "./EchidnaBaseToken.sol";

contract EchidnaVaultProxy is ERC1967Proxy {
    constructor(
        Vault vault, 
        IERC20 baseToken, 
        IVaultToken vaultToken, 
        uint256 minDeposit, 
        ISecurityManager securityManager
    ) ERC1967Proxy(
        address(vault), 
        abi.encodeWithSelector(
            bytes4(keccak256("initialize(address,address,uint256,address)")), 
            address(baseToken), address(vaultToken), minDeposit, address(securityManager)
        )
    ) { }
    
    function getImplementation() external view returns(address) {
        return ERC1967Upgrade._getImplementation();
    }
}

contract EchidnaVaultTokenProxy is ERC1967Proxy {
    constructor(
        VaultToken vaultToken,
        string memory name, 
        string memory symbol, 
        uint8 decimals, 
        uint256 initialSupply, 
        ISecurityManager securityManager
    ) ERC1967Proxy(
        address(vaultToken), 
        abi.encodeWithSelector(
            bytes4(keccak256("initialize(string,string,uint8,uint256,address)")), 
            name, symbol, decimals, initialSupply, address(securityManager)
        )
    ) { }
    
    function getImplementation() external view returns(address) {
        return ERC1967Upgrade._getImplementation();
    }
}