// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "./IVaultToken.sol";
import "./ISecurityManager.sol";

/**
 * @title IVault 
 * 
 * An abstract representation of the Vault from the perspective of the Vault's associated VaultToken contract. 
 * 
 * The VaultToken does not need most of the Vault's methods and properties; only a small subset. The ones 
 * exposed here are the ones needed by the VaultToken. 
 * 
 * @author John R. Kosinski 
 */
interface IVault {
    
    /**
     * Returns the address of the VaultToken instance that is associated with this Vault. 
     * 
     * @return The address as IVaultToken 
     */
    function vaultToken() external view returns (IVaultToken); 
    
    /**
     * Returns the address of the ISecurityManager instance that is associated with this Vault. 
     */
    function securityManager() external view returns (ISecurityManager);
    
    /**
     * Assumes that Vault Token has already been transferred to the Vault, and in return transfers
     * the appropriate amount of Base Token back to the sender, according to current exchange rate.
     * 
     * @param vaultTokenAmount The amount of Vault Token transferred to the Vault by `sender`. 
     * @param sender The sender of the Vault Token, who will be the recipient of Base Token from the Vault. 
     */
    function withdrawDirect(uint256 vaultTokenAmount, address sender) external;
    
    /**
     * This can only be called by an authorized user as part of the sweep-into-vault system (implemented 
     * off-chain) that allows for automatic zap-in of different currencies, and direct deposit. It essentially 
     * is a deposit by the vault sweep-in, on behalf of the `forAddress` user. 
     * 
     * @param baseTokenAmount The quantity of the base token to deposit. 
     * @param forAddress The address that will receive the VaultToken in return for the deposit. 
     */
    function depositFor(uint256 baseTokenAmount, address forAddress) external;
}