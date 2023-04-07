// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "./inc/Initializable.sol";
import "./inc/UUPSUpgradeable.sol";
import "./inc/ERC20Upgradeable.sol";
import "./inc/IERC165Upgradeable.sol";
import "./inc/PausableUpgradeable.sol";

import "./IVault.sol";
import "./ISecurityManager.sol";
import "./ManagedSecurity.sol";

//import "hardhat/console.sol";

/**
 * @title VaultToken
 * 
 * @dev An ERC20-compliant token which is tied to a specific Vault, and can be minted from that vault 
 * in exchange for a specified base token, or can be exchanged at that Vault for the specified base 
 * token. 
 * 
 * Is Pausable, Burnable (by admin only), mintable (by admin only). 
 * 
 * Transfer between holders is disabled. Transfers (for now) are allowed only from Vault to holder, or 
 * holder to Vault. In other words, holders can only transfer to the Vault, and the Vault only transfers
 * to holders. 
 *  
 * It implements IVaultToken. 
 * 
 * @author John R. Kosinski
 */
contract VaultToken is 
        Initializable,
        IERC165Upgradeable, 
        ERC20Upgradeable, 
        PausableUpgradeable, 
        ManagedSecurity, 
        UUPSUpgradeable
{            
    address public vaultAddress; 
            
    //ERC20
    uint8 internal _decimals;
    
    //BEP20
    address public bep20TokenOwner;
    
    //errors
    error VaultNotSet();
    error VaultAlreadySet();    
    error VaultOnly(); 
    error InvalidVaultAddress(); 
    error TokenTransferFailed();
    error TransferNotAllowed(address from, address to, uint256 amount); 
    
    //modifiers 
    //Only the associated Vault may be the caller, if {vaultAddress} is non-zero
    modifier onlyVault() {
        if (vaultAddress != address(0)) {
            if (vaultAddress != _msgSender()) 
                revert VaultOnly(); 
        }
        _; 
    }
    
    //{vaultAddress} must be non-zero (already set) when the method is called
    modifier vaultMustBeSet() {
        if (vaultAddress == address(0)) {
            revert VaultNotSet(); 
        }
        _; 
    }
    
    /**
     * Returns a hard-coded version number pair (major + minor). 
     * 
     * @return (major, minor)
     */
    function version() external virtual pure returns (uint8, uint8) {
        return (1, 0);
    }
    
    /**
     * Initializer. Can be directed to mint initial supply to the caller, and will grant all security roles 
     * available to the caller. 
     * 
     * Reverts: 
     * - {ZeroAddressArgument} if `_securityManager` address is 0x0
     * - 'Address: low-level delegate call failed' (if `_securityManager` is not legit)
     * - 'Initializable: contract is already initialized' - if already previously initialized 
     * 
     * @param tokenName Longer token name. 
     * @param tokenSymbol Short token symbol. 
     * @param tokenDecimals Number of decimals of quantity precision. 
     * @param initialSupply If 0, this will be ignored; otherwise this quantity will be minted to the 
     * caller of the constructor.
     * @param _securityManager Contract which will manage secure access for this contract. 
     */
    function initialize(
        string memory tokenName, 
        string memory tokenSymbol, 
        uint8 tokenDecimals,
        uint256 initialSupply, 
        ISecurityManager _securityManager) external initializer {
            
        __ERC20_init(tokenName, tokenSymbol); 
        __Pausable_init(); 
        __UUPSUpgradeable_init();
        
        //TODO: (LOW) this should not be allowed to be zero 
        _decimals = tokenDecimals;
        
        //security manager
        _setSecurityManager(_securityManager); 
        
        //mint initial supply if specified 
        if (initialSupply > 0) {
            _mint(_msgSender(), initialSupply); 
        }
        
        //bep-20 token owner 
        bep20TokenOwner = _msgSender();
    }
    
    /**
     * Gets the number of decimals of precision after the point. 
     * Example: If the decimals for the token are == 3, then 1 sub-unit of that token is worth 
     * 0.001 of 1 token. 
     * If the decimals for the token are == 6, then 1 sub-unit of that token is worth 
     * 0.000001 of 1 token. 
     * 
     * Typically, tokens have 18 decimals, following ETH's example. 
     * 
     * @return uint8 The number of decimals of precision for 1 subunit of this token.
     */
    function decimals() public override view returns (uint8) {
        return _decimals;
    }
    
    /**
     * For adherence to the BEP20 standard. 
     */
    function getOwner() external view returns (address) {
        return bep20TokenOwner;
    }
    
    /**
     * Assigns the owner that will be returned by the {getOwner} function. 
     * 
     * @param owner The address to assign as owner for BEP-20 getOwner. 
     * 
     * Reverts: 
     * - {UnauthorizedAccess}: if caller is not authorized with the appropriate role
     * - {ZeroAddressArgument}: if address passed is 0x0
     */
    function assignBep20Owner(address owner) external onlyRole(GENERAL_MANAGER_ROLE) {
        if (owner == address(0)) 
            revert ZeroAddressArgument(); 
        
        bep20TokenOwner = owner;
    }
    
    /**
     * Creates `amount` tokens and assigns them to `account`, increasing
     * the total supply.
     * 
     * Emits: 
     * - {Transfer} event with `from` set to the zero address.
     * 
     * Reverts: 
     * - {UnauthorizedAccess}: if caller is not authorized with the appropriate role
     * - 'Pausable: paused' - if contract is paused 
     * - 'ERC20: mint to zero address' - if `to` is zero
     *
     * Creates tokens out of thin air. Authorized address may mint to any user. 
     * 
     * @param to Address to which to give the newly minted value.
     * @param amount The number of units of the token to mint. 
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) whenNotPaused {
        _mint(to, amount);
    }
    
    /**
     * Destroys `amount` tokens from the sender's account, reducing the total supply.
     *
     * Emits:
     * - {Transfer} event with `to` set to the zero address.
     * 
     * Reverts: 
     * - {UnauthorizedAccess}: if caller is not authorized with the appropriate role
     * - 'Pausable: paused' - if contract is paused 
     * - 'ERC20: burn amount exceeds balance' - if balance is less than `amount`
     * 
     * @param amount The amount to burn. 
     */
    function burn(uint256 amount) external onlyRole(BURNER_ROLE) whenNotPaused {
        _burn(_msgSender(), amount); 
    }
    
    /**
     * Triggers stopped state, rendering many functions uncallable. 
     * 
     * Emits:
     * - {Paused} event.
     * 
     * Reverts: 
     * - {UnauthorizedAccess} if caller does not have the appropriate security role
     * - 'Pausable: paused' - if contract is paused 
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    /**
     * Returns to the normal state after having been paused.
     * 
     * Emits:
     * - {Unpaused} event.
     *
     * Reverts: 
     * - {UnauthorizedAccess} if caller does not have the appropriate security role
     * - 'Pausable: paused' - if contract is paused 
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
    
    /**
     * Sets `amount` as the allowance of `spender` over the `owner` s tokens.
     *
     * Emits: 
     * - {Approval} event.
     *
     * Reverts: 
     * - 'Pausable: paused' - if contract is paused 
     * 'ERC20: approve to the zero address' - if `spender` is 0x0
     * 
     * @param spender The address to be authorized to spend the caller's tokens.
     * @param amount The max number that the authorized spender is allowed to spend.
     * @return bool True if successful. 
     */
    function approve(address spender, uint256 amount) public virtual override(ERC20Upgradeable)
        whenNotPaused 
        returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }
    
    /**
     * @dev See {IERC20-transfer}.
     * 
     * If the `to` address is equal to {vaultAddress}, there is special handling. In that case, 
     * The caller should receive the Vault's base token in return for the transfer. The transfer 
     * is treated as a withdrawal of BaseToken from the Vault. 
     * 
     * Emits: 
     * - {ERC20-Transfer}
     * 
     * Reverts: 
     * - 'Pausable: paused' - if contract is paused 
     * - {VaultNotSet} - if vaultAddress has not been set (associated Vault is required)
     * - {TokenTransferFailed} - if any of the underlying ERC20 token transfers return false (unlikely to actually happen)
     * - {TransferNotAllowed} - if transfer doesn't involve the Vault (while u2u transfer is blocked)
     * - {ActionOutOfPhase} - if this transfer will trigger a withdrawal (i.e. it is a transfer TO the Vault), 
     *      but the Vault Phase is not Withdraw. 
     * - 'ERC20: transfer to the zero address' - if `to` is 0x0
     * - 'ERC20: transfer amount exceeds balance'
     *      - if caller's balance of VaultToken is < `amount`
     *      - or if this trigger's a withdrawal, and Vault's balance of BaseToken is insufficient to send
     * 
     * @param to The recipient of the transfer 
     * @param amount The amount to transfer
     */
    function transfer(address to, uint256 amount) 
        public virtual override(ERC20Upgradeable) 
        whenNotPaused
        vaultMustBeSet
        returns (bool) 
    {
        //if the transfer is going to the Vault, it's a special case 
        if (to == vaultAddress) {
            //if 'to' is the vault, then it's going to transfer => withdrawDirect 
            if (!super.transfer(to, amount)) {
                revert TokenTransferFailed(); // this line can't easily be tested 
            }
            
            IVault(vaultAddress).withdrawDirect(amount, _msgSender());
        } 
        else if (_msgSender() == vaultAddress) {
            //if 'from' is the vault, then it's going to do a normal transfer
            if (!super.transfer(to, amount)) {
                revert TokenTransferFailed();  // this line can't easily be tested 
            }
        }
        else {
            //other transfers not allowed
            revert TransferNotAllowed(_msgSender(), to, amount); 
        }
            
        return true;
    }
    
    /**
     * @dev See {IERC20-transferFrom}.
     * 
     * If the `to` address is equal to {vaultAddress}, there is special handling. In that case, 
     * The `from` address should receive the Vault's base token in return for the transfer. The transfer 
     * is treated as a withdrawal of BaseToken from the Vault. 
     *
     * Emits an {Approval} event indicating the updated allowance. This is not
     * required by the EIP. See the note at the beginning of {ERC20}.
     *
     * NOTE: Does not update the allowance if the current allowance
     * is the maximum `uint256`.
     * 
     * Emits: 
     * - {ERC20-Transfer}
     * - {ERC20-Approval}
     * 
     * Reverts: 
     * - 'Pausable: paused' - if contract is paused 
     * - {VaultNotSet} - if vaultAddress has not been set (associated Vault is required)
     * - {TokenTransferFailed} - if any of the underlying ERC20 token transfers return false (unlikely to actually happen)
     * - {TransferNotAllowed} - if transfer doesn't involve the Vault (while u2u transfer is blocked)
     * - {ActionOutOfPhase} - if this transfer will trigger a withdrawal (i.e. it is a transfer TO the Vault), 
     *      but the Vault Phase is not Withdraw. 
     * - 'ERC20: transfer to the zero address' - if `to` is 0x0
     * - 'ERC20: transfer from the zero address' - if `from` is 0x0
     * - 'ERC20: transfer amount exceeds balance'
     *      - if caller's balance of VaultToken is < `amount`
     *      - or if this trigger's a withdrawal, and Vault's balance of BaseToken is insufficient to send
     * 
     * @param from The actual owner (not spender) of the tokens being transferred 
     * @param to The recipient of the transfer 
     * @param amount The amount to transfer
     */
    function transferFrom( address from, address to, uint256 amount) 
        public virtual override(ERC20Upgradeable) 
        whenNotPaused
        vaultMustBeSet
        returns (bool) 
    {
        //if the transfer is going to the Vault, it's a special case 
        if (to == vaultAddress) {
            //if 'to' is the vault, then it's going to transferFrom => withdrawDirect 
            if (!super.transferFrom(from, to, amount)) {
                revert TokenTransferFailed(); // this line can't easily be tested 
            }
            IVault(vaultAddress).withdrawDirect(amount, from); 
        } else if (_msgSender() == vaultAddress) {
            //if 'from' is the vault, then it's going to do a normal transferFrom
            if (!super.transferFrom(from, to, amount)) {
                revert TokenTransferFailed(); // this line can't easily be tested 
            }
        }
        else {
            //other transfers not allowed
            revert TransferNotAllowed(from, to, amount); 
        }
            
        return true;
    }
    
    /**
     * This is just between the Vault and the Vault Token. It's private. Like just between them two. 
     * 
     * The caller of this must be the associated Vault, IF the associated Vault is set. Otherwise, 
     * it just calls { transferFrom }. 
     * 
     * See { transferFrom }
     * 
     * Reverts: 
     * - {VaultOnly} - If the caller is not the associated Vault
     * - {VaultNotSet} - If the associated {vaultAddress} is not set (i.e. is still 0x0 address)
     * - 'Pausable: paused' - if contract is paused 
     * - {TokenTransferFailed} - if any of the underlying ERC20 token transfers return false (unlikely to actually happen)
     * - {TransferNotAllowed} - if transfer doesn't involve the Vault (while u2u transfer is blocked)
     * - {ActionOutOfPhase} - if this transfer will trigger a withdrawal (i.e. it is a transfer TO the Vault), 
     *      but the Vault Phase is not Withdraw. 
     * - 'ERC20: transfer to the zero address' - if `to` is 0x0
     * - 'ERC20: transfer from the zero address' - if `from` is 0x0
     * - 'ERC20: transfer amount exceeds balance'
     *      - if caller's balance of VaultToken is < `amount`
     *      - or if this trigger's a withdrawal, and Vault's balance of BaseToken is insufficient to send
     * 
     * @param from The actual owner (not spender) of the tokens being transferred 
     * @param to The recipient of the transfer 
     * @param amount The amount to transfer
     */
    function transferFromInternal(address from, address to, uint256 amount) 
        external virtual  
        onlyVault 
        vaultMustBeSet
        whenNotPaused
        returns (bool) 
    {
        //call normal transferFrom
        return super.transferFrom(from, to, amount); 
    }
    
    /**
     * Implementation of IERC165; allows to query whether or not given interfaces are 
     * supported by this contract.
     * 
     * See ERC-165 for details. 
     * 
     * @param interfaceId The first four bytes of the keccak256 hash of the interface to query. 
     * @return bool True if the interface is supported by this contract. 
     */
    function supportsInterface(bytes4 interfaceId)
        public
        pure
        override (IERC165Upgradeable)
        returns (bool)
    {
        return 
            interfaceId == type(IERC165Upgradeable).interfaceId || 
            interfaceId == type(IERC20Upgradeable).interfaceId || 
            interfaceId == type(IVaultToken).interfaceId; 
    }
    
    /**
     * Allows authorized user to associate this VaultToken with its vault. 
     * 
     * This is optional, but is used for direct transfer of VaultToken directly to the Vault, bypassing the 
     * Vault's 'withdraw' function. If The vaultAddress is not set, then direct transfer simply won't work. 
     * But nothing else should be affected. 
     * 
     * Reverts: 
     * - {UnauthorizedAccess}: if caller is not authorized with the appropriate role
     * - {VaultAlreadySet} - If the {vaultAddress} has already been previously set.
     * - {InvalidVaultAddress} - If the given address 
     * 
     * @param addr The address of the Vault contract tied to this token. 
     */
    function setVaultAddress(address addr) external onlyRole(ADMIN_ROLE) {
        
        //if vault address is already set, it can't be set again 
        if (vaultAddress != address(0)) {
            revert VaultAlreadySet(); 
        }
        
        //check for validity of vault address 
        if (addr == address(0)) 
            revert InvalidVaultAddress();
        
        IVault vault = IVault(addr); 
        if (address(vault.vaultToken()) != address(this))
            revert InvalidVaultAddress();
         
        vaultAddress = addr;
    }
    
    /**
     * Hook that is called before any transfer of tokens. This includes
     * minting and burning.
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override(ERC20Upgradeable) whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }
    
    /**
     * Authorizes users wtih the UPGRADER role to upgrade the implementation. 
     */
    function _authorizeUpgrade(address) internal virtual override onlyRole(UPGRADER_ROLE) { }
    
    /**
     * See { ContextUpgradeable._msgSender }. 
     * This needs to be overridden for multiple-inheritance reasons. 
     * 
     * @return address 
     */
    function _msgSender() internal override(Context, ContextUpgradeable) view returns(address) {
        return super._msgSender(); 
    }
}