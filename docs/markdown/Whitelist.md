## Sūrya's Description Report

### Files Description Table


|  File Name  |  SHA-1 Hash  |
|-------------|--------------|
| ./contracts/Whitelist.sol | 5899ed131cd5293c15dd01dc244b302dabad8a84 |


### Contracts Description Table


|  Contract  |         Type        |       Bases      |                  |                 |
|:----------:|:-------------------:|:----------------:|:----------------:|:---------------:|
|     └      |  **Function Name**  |  **Visibility**  |  **Mutability**  |  **Modifiers**  |
||||||
| **Whitelist** | Implementation | IWhitelist, ManagedSecurity |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | isWhitelisted | External ❗️ |   |NO❗️ |
| └ | addRemoveWhitelist | External ❗️ | 🛑  | onlyRole |
| └ | addRemoveWhitelistBulk | External ❗️ | 🛑  | onlyRole |
| └ | setWhitelistOnOff | External ❗️ | 🛑  | onlyRole |
| └ | _addRemoveWhitelist | Internal 🔒 | 🛑  | |


### Legend

|  Symbol  |  Meaning  |
|:--------:|-----------|
|    🛑    | Function can modify state |
|    💵    | Function is payable |
