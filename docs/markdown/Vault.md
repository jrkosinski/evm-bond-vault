## Sūrya's Description Report

### Files Description Table


|  File Name  |  SHA-1 Hash  |
|-------------|--------------|
| ./contracts/Vault.sol | 87425afda5733bf211a0cc7845631ea8c2a72aeb |


### Contracts Description Table


|  Contract  |         Type        |       Bases      |                  |                 |
|:----------:|:-------------------:|:----------------:|:----------------:|:---------------:|
|     └      |  **Function Name**  |  **Visibility**  |  **Mutability**  |  **Modifiers**  |
||||||
| **Vault** | Implementation | Initializable, PausableUpgradeable, ReentrancyGuardUpgradeable, ManagedSecurity, UUPSUpgradeable |||
| └ | version | External ❗️ |   |NO❗️ |
| └ | initialize | External ❗️ | 🛑  | initializer |
| └ | deposit | External ❗️ | 🛑  | onlyInPhase whenNotPaused |
| └ | depositFor | External ❗️ | 🛑  | onlyInPhase whenNotPaused onlyRole |
| └ | withdraw | External ❗️ | 🛑  | onlyInPhase whenNotPaused |
| └ | withdrawDirect | External ❗️ | 🛑  | vaultTokenOnly onlyInPhase whenNotPaused |
| └ | pause | External ❗️ | 🛑  | onlyRole |
| └ | unpause | External ❗️ | 🛑  | onlyRole |
| └ | progressToNextPhase | External ❗️ | 🛑  | onlyRole whenNotPaused |
| └ | setWhitelist | External ❗️ | 🛑  | onlyRole whenNotPaused |
| └ | setMinimumDeposit | External ❗️ | 🛑  | onlyRole |
| └ | adminWithdraw | External ❗️ | 🛑  | nonReentrant onlyRole |
| └ | _sendVaultToken | Internal 🔒 | 🛑  | |
| └ | _isERC20Contract | Internal 🔒 |   | |
| └ | _withdraw | Internal 🔒 | 🛑  | nonReentrant |
| └ | _deposit | Internal 🔒 | 🛑  | nonReentrant |
| └ | _authorizeUpgrade | Internal 🔒 | 🛑  | onlyRole |
| └ | _msgSender | Internal 🔒 |   | |


### Legend

|  Symbol  |  Meaning  |
|:--------:|-----------|
|    🛑    | Function can modify state |
|    💵    | Function is payable |
