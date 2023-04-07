// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "./inc/IERC20.sol";
import "./inc/ReentrancyGuard.sol";

import "./IVault.sol"; 
import "./ISecurityManager.sol"; 
import "./ManagedSecurity.sol"; 
import "./AddressUtil.sol"; 

/**
 * @title DepositVault 
 * 
 * This contract is part of a process by which users can deposit to a Vault directly, by simple ERC20 
 * transfer. 
 * 
 * The process: 
 * 1. address 0xadd transfers N of baseToken into THIS contract (the deposit vault), in transaction TX
 * 2. that transfer will be scraped from the blockchain by an off-chain process 
 * 3. an authorized caller will call this contract's finalizeDeposit method, passing 
 *      - N (the amount) 
 *      - TX (the original tx id, now the 'deposit id')
 *      - 0xadd (the eventual beneficiary of the deposit)
 * 
 * The call to the finalizeDeposit method finalizes the transfer, finally pushing the token amount intended
 * for the Vault, to the actual Vault. 
 * 
 * @author John R. Kosinski 
 */
contract DepositVault is ManagedSecurity, ReentrancyGuard {
    
    //tokens
    IERC20 public baseToken; 
    
    //vault 
    IVault public vault;
    
    //errors 
    error ZeroAmountArgument(); 
    error InvalidTokenContract(address); 
    error TokenTransferFailed();
    
    //events 
    event DepositExecuted(bytes32 indexed transactionId, address indexed onBehalfOf, uint256 amount); 
    
    /**
     * Creates an instance of a DepositVault, associated with a particular vault, base currency, and under 
     * the security umbrella of a security manager. 
     * 
     * Reverts: 
     * - { ZeroAddressArgument } - If any of the given addresses are zero. 
     * - { InvalidTokenContract } - If the given base token address is not a valid ERC20 contract
     * - 'Address: low-level delegate call failed' (if `_securityManager` is not legit)
     */
    constructor(IVault _vault, IERC20 _baseToken) {
        
        //validate base token address 
        if (address(_baseToken) == address(0)) 
            revert ZeroAddressArgument(); 
        if (!AddressUtil.isERC20Contract(address(_baseToken)))
            revert InvalidTokenContract(address(_baseToken)); 
            
        //validate vault address
        if (address(_vault) == address(0)) 
            revert ZeroAddressArgument(); 
        
        baseToken = _baseToken;
        vault = _vault;
        
        _setSecurityManager(vault.securityManager()); 
    }
    
    /**
     * Causes this contract to transfer the specified amount of its own {baseToken} balance to the 
     * Vault that is associated with this instance in its {vault} property. 
     * 
     * Emits: 
     * - { DepositExecuted } - on successful deposit
     * - { ERC20-Transfer } - on successful ERC20 transfer within the deposit 
     * 
     * Reverts: 
     * - {UnauthorizedAccess} - if caller is not authorized with the appropriate role
     * - {ZeroAmountArgument} - if the amount specified is zero. 
     * - {TokenTransferFailed} - if either `baseToken`.transferFrom or `vaultToken`.transfer returns false.
     * - {ActionOutOfPhase} - if Vault is not in Deposit phase. 
     * - {NotWhitelisted} - if caller or `forAddress` is not whitelisted (if the Vault has whitelisting)
     * - 'Pausable: Paused' -  if Vault contract is paused. 
     * - 'ERC20: transfer amount exceeds balance' - if user has less than the given amount of Base Token
     * 
     * @param amount The amount of {baseToken} to transfer from this contract to the {vault}. 
     * @param transactionId Unique of the transaction, which is emitted in the event, and should be equal to the 
     * transaction id of the corresponding original transfer of the same amount, by `onBehalfOf`, to this contract.
     * @param onBehalfOf The address which originally transferred the same amount into this contract, and 
     * which will receive the appropriate VaultToken amount as a result of this deposit. 
     */
    function finalizeDeposit( 
        uint256 amount, 
        bytes32 transactionId, 
        address onBehalfOf
    ) external onlyRole(DEPOSIT_MANAGER_ROLE) nonReentrant {
        baseToken.approve(address(vault), amount); 
        vault.depositFor(amount, onBehalfOf); 
        emit DepositExecuted(transactionId, onBehalfOf, amount); 
    }
    
    /**
     * Allows admin to withdraw Base Token via ERC20 transfer.
     * 
     * @param amount The amount to withdraw
     * 
     * Reverts:
     * - {UnauthorizedAccess}: if caller is not authorized with the appropriate role
     */
    function adminWithdraw(uint256 amount) external nonReentrant onlyRole(ADMIN_ROLE) {
        baseToken.transfer(msg.sender, amount); 
    }
}
