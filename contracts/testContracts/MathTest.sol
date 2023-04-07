// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "../CarefulMath.sol"; 

//USED IN TESTS ONLY; SHOULD NOT BE DEPLOYED TO MAINNET
contract MathTest {
    constructor() { }
    
    function mulDiv(uint256 x, uint256 y, uint256 denominator) public pure returns (uint256 result) {
        return CarefulMath.mulDiv(x, y, denominator); 
    }
    
    function vaultToBaseTokenAtRate(
        uint256 value, 
        ExchangeRate memory rateAtoB
    ) public pure returns (uint256) {
        return CarefulMath.vaultToBaseTokenAtRate(value, rateAtoB); 
    }
    
    function baseToVaultTokenAtRate(
        uint256 value, 
        ExchangeRate memory rateAtoB
    ) public pure returns (uint256) {
        return CarefulMath.baseToVaultTokenAtRate(value, rateAtoB); 
    }
}