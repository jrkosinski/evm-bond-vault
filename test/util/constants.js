const ethers = require("hardhat");

module.exports = {

    //token details 
    TOKEN_CONTRACT_ID: "VaultToken",
    TOKEN_NAME: "Patagon Vault Token",
    TOKEN_SYMBOL: "PGV", 
    ZERO_ADDRESS: "0x0000000000000000000000000000000000000000",
    INITIAL_SUPPLY: 1000000000000,
    
    //vault details
    VAULT_CONTRACT_ID: "Vault", 
    DEFAULT_TOKEN_DECIMALS: 18,
    DEFAULT_MIN_DEPOSIT: 100,
    
    //other contracts 
    STABLECOIN_CONTRACT_ID: "MockStableCoin",
    SECURITY_CONTRACT_ID: "SecurityManager", 
    WHITELIST_CONTRACT_ID: "Whitelist",
    DEPOSIT_VAULT_CONTRACT_ID: "DepositVault",
    
    interfaceIds : {
        IERC2981:           "0x2a55205a", 
        IERC165:            "0x01ffc9a7", 
        IAccessControl:     "0x7965db0b", 
        IERC721:            "0x80ac58cd", 
        IERC721Enumerable:  "0x780e9d63", 
        IERC20:             "0x36372b07", 
        IERC20Metadata:     "0xa219a025", 
        IERC777:            "0xe58e113c"
    }, 
    
    vaultPhase : {
        DEPOSIT: 0,
        LOCKED: 1,
        WITHDRAW: 2
    },
    
    IMPLEMENTATION_SLOT: "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc", 
    
    errorMessages: {
        OWNER_ONLY: "Ownable: caller is not the owner", 
        BURN_EXCEEDED: "ERC20: burn amount exceeds balance", 
        INSUFFICIENT_ALLOWANCE: "ERC20: insufficient allowance", 
        TRANSFER_EXCEEDS_BALANCE: "ERC20: transfer amount exceeds balance", 
        INSUFFICIENT_AMOUNT: "ERC20: transfer amount exceeds balance", 
        PAUSED: "Pausable: paused",
        NOT_PAUSED: "Pausable: not paused", 
        TRANSFER_WHEN_PAUSED: "Pausable: paused",
        ACCESS_CONTROL: "AccessControl:",
        LOWLEVEL_DELEGATE_CALL: "Address: low-level delegate call failed", 
        CUSTOM_ACCESS_CONTROL: (arg1, arg2) => `UnauthorizedAccess("${arg1}", "${arg2}")` ,
        ACCESS_CONTROL_RENOUNCE: "AccessControl: can only renounce roles for self",
        CONTRACT_ALREADY_INITIALIZED: "Initializable: contract is already initialized", 
        
        VAULT_OUT_OF_PHASE: "ActionOutOfPhase",
        ZERO_AMOUNT_ARGUMENT: "ZeroAmountArgument",
        VAULT_NOT_WHITELISTED: (arg) => { return `NotWhitelisted("${arg}")` },
        VAULT_INVALID_TOKEN_CONTRACT: (arg) => { return `InvalidTokenContract("${arg}")` },
        VAULT_NOT_ERC20: "Address: low-level delegate call failed",
        VAULT_TOKEN_TRANSFER_FAILED: "TokenTransferFailed",
        VAULT_TOKEN_TRANSFER_DISABLED: (arg1, arg2, arg3) => { 
            return `TransferNotAllowed("${arg1}", "${arg2}", ${arg3})`
        },
        VAULT_DEPOSIT_BELOW_MINIMUM: "DepositBelowMinimum",
        VAULT_ONLY: "VaultOnly",
        VAULT_NOT_SET: "VaultNotSet",
        VAULT_TOKEN_ONLY: "VaultTokenOnly",
        VAULT_ALREADY_SET: "VaultAlreadySet",
        INVALID_VAULT_ADDRESS: "InvalidVaultAddress",
        ZERO_ADDRESS: "ZeroAddressArgument",
    }, 

    roles: {
        ADMIN:              '0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775',
        TOKEN_MINTER:       '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6',
        TOKEN_BURNER:       '0x3c11d16cbaffd01df69ce1c404f6340ee057498f5f00246190ea54220576a848',
        PAUSER:             '0x65d7a28e3265b37a6474929f336521b332c1681b933f6cb9f3376673440d862a',
        LIFECYCLE_MANAGER:  '0xf2880b7971306b3fcdfd682d7b3b009f3a5cd1aa7100af10ce6d293c95391a06',
        WHITELIST_MANAGER:  '0x2a3dab589bcc9747970dd85ac3f222668741ae51f2a1bbb8f8355be28dd8a868',
        UPGRADER:           '0x189ab7a9244df0848122154315af71fe140f3db0fe014031783b0946b8c9d2e3',
        GENERAL_MANAGER:    '0xec43c5192900b4a6be9d57900af22c7a5400501437bc6707808f40380ebd4789',
        DEPOSIT_MANAGER:    '0x337b415e044dc50adfb81e2232d75157e0bd5a9dba2f5a61ebaf36fb524067ef'
    },

    exchangeRates: {
        PARITY: { vaultToken: 1, baseToken: 1 },
        DEFAULT: { vaultToken: 1, baseToken: 1 },
        ONE_PERCENT: { vaultToken: 100, baseToken: 101 },
        TWO_PERCENT: { vaultToken: 100, baseToken: 102 },
        ONE_COMP_2: { vaultToken: 10000, baseToken: 10201 }, //one percent compounded twice 
        ONE_COMP_3: { vaultToken: 1000000, baseToken: 1030301 }, //one percent compounded 3 times 
        ONE_COMP_4: { vaultToken: 100000000, baseToken: 104060401 },   //one percent compounded 4 times 
        ONE_COMP_5: { vaultToken: 100000000, baseToken: 105101005 },  //one percent compounded 5 times 
        ONE_COMP_6: { vaultToken: 1000000000, baseToken: 1061520151 },  //one percent compounded 6 times 
        THREE_PERCENT: { vaultToken: 100, baseToken: 103 },
        FIVE_PERCENT: { vaultToken: 100, baseToken: 105 },
        TEN_PERCENT: { vaultToken: 10, baseToken: 11 },
        NEG_ONE_PERCENT: { vaultToken: 100, baseToken: 99 },

        onePercentCompounding: [
            { vaultToken: 1, baseToken: 1 },
            { vaultToken: 100, baseToken: 101 },
            { vaultToken: 10000, baseToken: 10201 },
            { vaultToken: 1000000, baseToken: 1030301 },
            { vaultToken: 100000000, baseToken: 104060401 },
            { vaultToken: 10000000000, baseToken: 10510100501 },
            { vaultToken: 1000000000000, baseToken: 1061520150601 },
            { vaultToken: 100000000000000, baseToken: 107213535210701 },
            { vaultToken: 10000000000000000, baseToken: 10828567056280802 },
            { vaultToken: 10000000000000000, baseToken: 10936852726843610 },
            { vaultToken: 10000000000000000, baseToken: 11046221254112046 },
            { vaultToken: 10000000000000000, baseToken: 11156683466653166 },
            { vaultToken: 10000000000000000, baseToken: 11268250301319698 },
            { vaultToken: 10000000000000000, baseToken: 11380932804332894 },
            { vaultToken: 10000000000000000, baseToken: 11494742132376222 },
            { vaultToken: 10000000000000000, baseToken: 11609689553699984 }
        ]
    }
};
