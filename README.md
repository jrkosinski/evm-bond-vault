# EVM On-Chain Bond Vault 

* [unit tests](tree/main/test)
* [contracts](tree/main/contracts)
* [docs](tree/main/docs)

# Setup
* clone this repository 
* npm install 
* create or modify hardhat.config.js file with required data
* to run automated tests: run "npx hardhat test" from root directory

# Abstract
This is an on-chain (Ethereum, Polygon, Binance...) investment instrument that tracks the yield of short-term US Treasury Bonds and other fixed-income assets. As the vaults are backed by the underlying bonds, it can be described as an on-chain ETF for short-term US Treasury Bonds. 

Investors deposit a designated stabletoken into a Vault, and receive in return a proprietary Vault Token. Until maturity of the underlying bond, the investment is locked, and users may neither deposit nor withdraw. After maturity, anyone with Vault Token may withdraw by returning the Vault Token to the Vault, and receiving in return the original designated Base Token (stabletoken) at the current exchange rate. While the Vault is locked, the exchange rate will have been adjusted to simulate a yield that tracks that of the underlying Treasury instrument, minus fees and slippage; thus giving the user an appropriate return for their investment. 

Each Vault operates with exactly one designated Base Token. 
Each Vault operates with exactly one designated Vault Token, the latter of which is created expressly for that purpose. 
Each Vault Token operates only with its one assigned Vault, and no other Vaults. 

Each specific bond instrument (example: 4-week US T-Bill) is represented by its own dedicated Vault and Vault Token. Vaults and Vault Tokens from one Vault are not interchangeable with those of another Vault. There is currently no secondary market for Vault Token, although there may be one in the future, or one may arise spontaneously. 


# Introduction

## Terms: 

**Admin**
This is shorthand for some account (on the fund side) which has rights to call some specific admin function on a contract. (Example: an address with the “admin” may call the grantRole function on the Vault, whereas any account without that role explicitly assigned cannot). (Not to be confused with "ADMIN", the specific role that exists and can grant and revoke security roles)

**Burner Role (security role)**
A security role associated with both the Vault Token and the Vault; an address with this role can burn tokens (only tokens belonging to that address). 

**Deposit**
An action in which User deposits Stable Base Token (e.g. USDC) into Vault and receives Vault Token in return. 

**Deposit Phase**
The first Vault Phase, in which deposits of Stable Base Token are accepted. Those funds will be locked during Locked Phase. Withdraw is disallowed during this time.  

**Exchange Rate**
In documentation and in the code, Exchange Rate almost always refers to the rate of exchange from Vault Token to Stable Base Token (and is expressed as a pair of whole integers, in terms of how many ST you get in return for 1 unit of VT). 

**Lifecycle Manager Role (security role) (short: LMR)**
A security role associated with the Vault; an address with this role can call functions which change the Vault’s lifecycle phase (e.g., change from Deposit to Locked phase).  

**Locked Phase** 
The second Vault Phase, in which any User-deposited funds are locked for a predetermined time period until the underlying asset’s maturity. During this period, both Deposit and Withdrawal are disallowed. 

**Minter Role (security role)**
A security role associated with both the Vault Token and the Vault; an address with this role can mint new tokens. 

**Pause**
To set a contract into a state in which functions which can normally be executed cannot be executed. May affect all, some, or none of the contract functions; it depends on the implementation. In this implementation, most or all of a contract’s public methods become uncallable during Pause. 

**Pauser Role (security role)**
A security role associated with both the Vault Token and the Vault; an address with this role can pause and unpause the contract. 

**Rollover**
At the end of a round, any unwithdrawn Stable Base Token left in the contract by Users will be reinvested automatically. This includes the calculation of any profit on the position (i.e., any accrued profit will be reinvested, as if the user had withdrawn their ST and re-deposited it for more VT). 

**Round**
One sequence or progression of Vault Phase from Deposit, to Locked, to Withdraw, is called a Round. After Withdraw Phase, the next Deposit Phase begins the next Round. Rounds are numbered starting at 0. 
Round 0: Deposit -> Locked -> Withdraw 
Round 1: Deposit -> Locked -> Withdraw
Round 2: Deposit -> Locked -> Withdraw 

**Stable Base Token (short: ST)** 
Any token that a Vault accepts as deposit for Vault Token, and is locked in the Vault during Locked Phase. This token is tied to a Vault and can’t be changed after Vault creation. Stable Base Token can be any valid ERC20 token, such as USDC. 

**Unpause**
To resume normal functioning after Pausing a contract. Methods that were uncallable now become callable again. 

**User** 
The public; user of the application and investor in the product. 

**Vault (short: Vault)** 
The system’s main contract which locks User funds (accepts Deposits) and allows for Withdrawal during Withdraw Phase. 

**Vault Phase (short: Phase)** 
There are three phases: Deposit, Locked, and Withdraw (in that order). Certain actions can be performed only during certain phases (e.g. Deposit can only be performed during Deposit Phase) 
Deposit -> Locked -> Withdraw

**Vault Token (short: VT)** 
An ERC20 token that is tied specifically to one particular Vault instance. It is received by User in return for depositing Stable Base Token, and can be returned to the Vault later in return for same. 

**Whitelist**
A separate contract, associated with the Vault, which holds the list of users that are allowed to deposit and withdraw. The whitelist can be enabled and disabled by authorized admins. 

**Whitelist Manager Role (security role) (short: WMR)**
A security role associated with the Vault; an address with this role can call functions to manage the whitelist. At the time of this writing that consists of setting the Vault's associated whitelist. 

**Withdraw**
An action in which User exchanges their Vault Token to the Vault in exchange for the Stable Base Token which is their initial deposit, or their profit, or initial deposit and profit. 

**Withdraw Phase**
The final Vault Phase, in which Users are allowed to withdraw their previously locked Stable Base Token, in addition to any yield accrued, in the form of Stable Base Token. Users exchange their Vault Token for Stable Base Token during this time. 

**Yield** 
Expressed as a % or a number of basis points, at the end of a Round it defines the extra amount of Stable Base Token that can be withdrawn per Vault Token. 


## Vault Lifetime

The Vault allows for specific times in which a user may: 
1. Deposit: exchange Base Token for Vault Token at a given rate of exchange 
2. Withdraw: exchange Vault Token for Base Token at a given rate of exchange 

During the times in which Deposit is allowed, Withdraw is not. During times in which Withdraw is allowed, Deposit is not. In between those times, the Vault is Locked, and neither Withdraw nor Deposit is allowed. One progression from Deposit period to Locked period, to Withdraw period, is termed as a full Round. 

During Deposit Phase, a user deposits Base Token and receives Vault Token at the current rate of exchange for that time. After Locked period, the user may Withdraw at a different rate of exchange. If the rate of exchange is higher, then the user who initially deposited will have made a profit in terms of Base Token. It is by manipulating the rate of exchange between phases that the yield of the underlying asset is tracked. 

### Lifetime: Deposit Phase

In and only in Deposit Phase, the deposit function of the Vault is allowed to be called by public users. Deposit Phase is set directly on the Vault by any caller with the Lifecycle Manager Role (LMR). 

Deposit Phase allows users to lock up their VT in return for ST. Once the deposit is made, it is locked in, and cannot be returned again until the Withdraw Phase. 

The next phase after Deposit is Locked Phase. 

Depositing: In a two-step operation, users must approve (standard ERC20 approve) an amount of their ST for spending by Vault. In the second step, they call the Vault’s deposit function, passing in an amount of ST. On receiving their ST, the Vault will transfer VT to the caller directly. 


### Lifetime: Locked Phase

In Locked Phase, neither Deposit nor Withdrawal is allowed. The purpose of this phase is to disallow activity that affects balances, until the maturity of the underlying asset. Locked Phase is set directly on the Vault by a caller who has the LMR role, and ended by setting a different phase. 

The next phase after Locked is Withdraw Phase. 


### Lifetime: Withdraw Phase

Withdraw Phase should begin when the underlying asset reaches maturity, and allows users the option of either exchanging their VT for ST from the Vault, or leaving it in the Vault where it will by default be rolled over to the next round. Withdraw Phase is set by the Oracle, and ended by calling the Oracle, setting a different phase. 

Users can call the Withdraw function to return VT back to the Vault, and receive ST in the same operation. 

The next phase after Withdraw is Deposit; once that transition is made, the current Round completes, and the next one begins. 

Withdrawing: In a two-step operation, users must approve (standard ERC20 approve) an amount of their VT for spending by Vault. In the second step, they call the Vault’s deposit function, passing in an amount of VT. On receiving their VT, the Vault will transfer ST to the caller directly according to the exchange rate set in the Oracle. 


## Rounds

The progression from Deposit Phase, to Locked Phase, to Withdraw Phase, is considered to be one Round. The move from Withdraw -> Deposit ends the round. The first Round is numbered as 0. Rounds are recorded in the contract for accounting purposes (the contract must do some accounting work in order to allow for the Rollover feature). 

Once in Deposit Phase, the only allowed change of Phase is to Locked Phase. From Locked, the only allowed change is to Withdraw. And from Withdraw, the only allowed change is to Deposit. At that change, the Round will be recorded, along with VT -> ST exchange rate for that round. 


## Lifetime Phase Progression
Phase progression follows intentionally rigid rules: 
Lifetime can only progress to the next phase in the process. Deposit->Locked-Withdraw->Deposit. E.g, from Locked phase, it’s only possible to move to Withdraw phase. 
Only authorized users (LMR role) may do anything that changes Vault phases. 
Phase is changed directly on the Vault by authorized users, by calling the progressPhase method. 
The Exchange Rate is set when the progressPhase method is called to change the Phase. The Exchange Rate can only be set at this time, and afterwards cannot be changed. 


## Setting Exchange Rate
The Exchange Rate is set by a caller with the LRM, when the phase is changed. The progressPhase method has a parameter that accepts the Exchange Rate for the upcoming Phase. The Exchange Rate can be changed again when switching to the next Phase. 

The Exchange Rate is defined in terms of: 
```
{ A, B } 
Where A represents any arbitrary amount of VT, 
and B represents the correct relative amount of ST. 
```

Example: 
```
{ A=100, B=99 } 
The rate here is defined such that any arbitrary amount of VT is equal 
to 1% less than that number of ST. In this scenario, VT has depreciated 
1% against ST. 
```

Example: 
```
{ A = 10000, B=1034 }
The rate here is defined such that any arbitrary amount of VT is equal
to 1% more than that number of ST. In this scenario, VT has appreciated 
0.34% against ST. 
```


## Rollover

There is an automatic Rollover feature, such that any ST that the User keeps in the Vault, unwithdrawn during the Withdraw Phase, will be reinvested along with any accrued yield. This allows the user to compound their gains over many Rounds. On top of it, the user may Deposit more during the subsequent Deposit Phase. 

**Basic Premise:**
A user who leaves their deposited stake alone for multiple rounds will earn the same compounded yield as a user who withdraws their entire stake and profit every round, then immediately redeposits it (not including transaction fees of course). 
To clarify, a user who wishes to reap the benefits of compounding is better off leaving their stake alone, as it will be reinvested automatically without the need to incur any transaction fees. 

**Implementation:** 
The implementation is done entirely by changing the Exchange Rate. The Exchange Rate (VT->ST) starts at 1:1. 

Example: 
```
Round 0: Rate: 1:1		
Deposit 100 ST		Receive 100 VT 

Round 1: Rate: 100:101 (1%)
Return 100 VT		Receive 101 ST 
Deposit 101 ST		Receive 100 VT 

Round 2: Rate: 10000:10201 (1.0201%)	
Return 100 VT 		Receive ~102.01 ST	
Deposit ~102.01 ST	Receive 100 VT 

Round 3: Rate: 1000000:1030301 (1.030301%) 
Return 100 VT 		Receive ~103.03 ST 
Gain 3.03+% 
```

The above example represents a 1% interest rate per period compounded 3 times. The final profit was more than 3%. 

If a user was to initially invest 100 ST starting in round 2, however, he’d make only the 1% profit. For that round (Depositing 100 ST in that round would yield ~98.02 VT. In round 3, at round 3’s rate, returning the ~98.02 VT to the vault would yield 101 ST - a 1% gain)

Example: 
```
Round 2: Rate: 10000:10201 (1.0201%)	
Deposit ~100 ST	Receive ~98.02 VT 

Round 3: Rate: 1000000:1030301 (1.030301%) 
Return ~98.02 VT 	Receive 101 ST 
```

The above examples show three things: 
Compounding rates over multiple periods can be affected by setting the Exchange Rate to an ever-compounding value. This also creates the conditions for automatic rollover without any extra logic. 
By setting the Exchange Rate each round to an exponentially higher value, while it affects compounding if held over multiple rounds, it still allows investments held over a single period to retain the linear rate of yield (in the above examples, that steady rate was 1%). 
In order to maintain both a steady rate of yield from period to period and to and allow for compounding, the Exchange Rate must increase exponentially each round. 


## Stable Base Token 

The Stable Base Token is (like the VT) tied to a Vault and cannot be changed once the Vault is created. The difference is that the Stable Base Token has a life of its own outside the Vault (whereas the Vault Token is created at the same time that the Vault is created, and only works with that specific Vault). 

An example of a Stable Base Token is USDC. Since the underlying asset (treasuries) are denominated in USD, it makes sense that the stablecoin would be a USD stablecoin. However, there’s no rule preventing any ERC20 compliant token to be used in its place (as long as it’s specified as such when the Vault is created). 


## Vault Token 

In the current iteration of the project, Vault Token is a standard ERC20 token issued by a Vault, and can be exchanged at the Vault, but other than that has no intrinsic use or meaning. On the other hand, Users may freely exchange Vault Tokens among themselves, and a transferred Vault Token may be used by anyone to exchange for ST at the Vault. 

In a future iteration, the Vault Token may be a more complex instrument that is backed by a basket of assets. 


## Security 

Restricted functions in each contract are protected by role-based security. 

An example of a Restricted Function would be the mint function on the Vault Token, or the progressPhase function on the Vault. If these functions were publicly callable, the funds and assets stored in any of the contracts would become public as well. 

Role-based security works like this: 
The creator of a contract becomes the contract’s first and only ADMIN. 
An address that has ADMIN privileges can grant and revoke other security roles. 
There can be multiple ADMINs (there is no limit), but only an ADMIN can grant ADMIN role to another address. 
To transfer adminship, ADMIN A grants adminship to User B. User B (who is now ADMIN) then revokes ADMIN A’s adminship. 
Other roles are defined by each individual contract. A token contract, for example, might have (in addition to ADMIN), a MINTER role. And only addresses with that role may mint. 
Any given role can have any number of addresses that are assigned it. 
Only addresses with the ADMIN role may grant or revoke any role, including non-admin roles. 

Role-based security is designed to offer the best balance between security and flexibility. 

**Other Roles** 
Both the Vault and the Vault Token have their own maintenance roles for different tasks. Note that the default ADMIN is granted all of these roles by default. From there he is free to assign them to other addresses, and deny, self-revoke or keep them for himself. 

**Vault:** 
PAUSER_ROLE: May call pause() and unpause() 
MINTER_ROLE: May call mint() to mint new tokens
BURNER_ROLE: May call burn() to burn tokens (only the caller’s own tokens or approved tokens). 

**VaultToken:** 
PAUSER_ROLE: May call pause() and unpause() 
MINTER_ROLE: May call mint() to mint new tokens
BURNER_ROLE: May call burn() to burn tokens (only the caller’s own tokens or approved tokens). 
LIFECYCLE_MANAGER_ROLE: May call progressPhase to progress the Vault’s lifecycle, as well as set exchange rates. 

Security Permissions Diagram
<put here>


## Upgradeability 
To be determined. 
Token might be upgradeable. 
Vault can be upgradeable. 


## Pausing
Both the Token and the Vault may Pause. Note that the Vault Token may be paused when the Vault is not, and vice versa. Although the Vault Token being paused will certainly affect Vault behavior to an extent. 
TODO: add unit tests for case of Vault Token paused when Vault is not.

**Vault Behavior when Paused:** 
The following Vault functions are uncallable when paused:
Deposit
Withdraw
Mint
Burn
ProgressPhase
Pause

**Vault Token Behavior when Paused:** 
The following Vault Token functions are uncallable when paused: 
Mint 
Burn 
Approve
Transfer 
TransferFrom
Pause

Unpause, once paused, brings everything back to normal. Unpause may only be called by an authorized user (one with the PAUSER role) and only when the contract is paused. 


## Minting
Minting of new Vault Token is given as a right of the Vault itself. In other words, the Vault itself (by default) holds the MINTER role for the Vault Token. The Vault mints Vault Token automatically as needed by users, when users deposit ST. 

Minting may also be done manually, in two ways: 
Method 1: 
Admin of the Vault Token grants MINTER role to anyone 
That newly authorized minter may mint VT manually
Method 2: 
Admin (or anyone with MINTER role) on the Vault calls the Vault’s mint function
This in turn calls the VT’s mint function to mint new supply

There is no premeditated use case for manual minting of VT. It’s essentially meant to be done automatically by the Vault. 


## Burning
Burning of Vault Token supply is given as a right of the Vault itself. In other words, the Vault itself (by default) holds the BURNER role for the Vault Token. There is no automated logic within the contract to burn token supply; if it is to be done, it must be done manually. 

Furthermore: a caller may only burn his/her own tokens. Even the Vault may only burn tokens that belong to the Vault, and the VT Admin may only burn tokens belonging to the VT admin. 

Burning can be done in one of two ways: 
Method 1: 
Admin of the Vault Token grants BURNER role to anyone 
That newly authorized minter may burn VT manually
Method 2: 
Admin (or anyone with MINTER role) on the Vault calls the Vault’s mint function
This in turn calls the VT’s mint function to mint new supply

There is no premeditated use case for manual burning of VT. 


