## Sūrya's Description Report

### Files Description Table


|  File Name  |  SHA-1 Hash  |
|-------------|--------------|
| ./contracts/VaultToken.sol | 279fa89eeccbc101248d7b54ec350a53efc90691 |


### Contracts Description Table


|  Contract  |         Type        |       Bases      |                  |                 |
|:----------:|:-------------------:|:----------------:|:----------------:|:---------------:|
|     └      |  **Function Name**  |  **Visibility**  |  **Mutability**  |  **Modifiers**  |
||||||
| **VaultToken** | Implementation | Initializable, IERC165Upgradeable, ERC20Upgradeable, PausableUpgradeable, ManagedSecurity, UUPSUpgradeable |||
| └ | version | External ❗️ |   |NO❗️ |
| └ | initialize | External ❗️ | 🛑  | initializer |
| └ | decimals | Public ❗️ |   |NO❗️ |
| └ | getOwner | External ❗️ |   |NO❗️ |
| └ | assignBep20Owner | External ❗️ | 🛑  | onlyRole |
| └ | mint | External ❗️ | 🛑  | onlyRole whenNotPaused |
| └ | burn | External ❗️ | 🛑  | onlyRole whenNotPaused |
| └ | pause | External ❗️ | 🛑  | onlyRole |
| └ | unpause | External ❗️ | 🛑  | onlyRole |
| └ | approve | Public ❗️ | 🛑  | whenNotPaused |
| └ | transfer | Public ❗️ | 🛑  | whenNotPaused vaultMustBeSet |
| └ | transferFrom | Public ❗️ | 🛑  | whenNotPaused vaultMustBeSet |
| └ | transferFromInternal | External ❗️ | 🛑  | onlyVault vaultMustBeSet whenNotPaused |
| └ | supportsInterface | Public ❗️ |   |NO❗️ |
| └ | setVaultAddress | External ❗️ | 🛑  | onlyRole |
| └ | _beforeTokenTransfer | Internal 🔒 | 🛑  | whenNotPaused |
| └ | _authorizeUpgrade | Internal 🔒 | 🛑  | onlyRole |
| └ | _msgSender | Internal 🔒 |   | |


### Legend

|  Symbol  |  Meaning  |
|:--------:|-----------|
|    🛑    | Function can modify state |
|    💵    | Function is payable |
