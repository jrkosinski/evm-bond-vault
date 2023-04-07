const { ethers } = require("hardhat");
const constants = require("./constants");
const { ExchangeRate } = require("./exchangeRate");
const Table = require('cli-table');

class Ledger {

    constructor(percentGain) {
        this.records = [];
        this.totalDeposit = 0;
        this.totalWithdrawal = 0;

        //add first record 
        this.records.push(new LedgerRecord(0, percentGain));
    }

    get lastRecord() {
        return this.records.length > 0 ? this.records[this.records.length - 1] : null;
    }

    get firstRecord() {
        return this.records.length > 0 ? this.records[0] : null;
    }

    get percentGain() {
        return this.lastRecord ? this.lastRecord.percentGain : 0;
    }

    get lastResult() {
        return this.lastRecord ? this.lastRecord.result : 0;
    }

    get totalProfit() {
        const profit = (this.totalWithdrawal) + this.lastResult - this.totalDeposit;
        //console.log(`(${this.totalWithdrawal} + (${this.lastResult})) - ${this.totalDeposit} = ${profit}`)
        return profit;
    }

    get totalProfitPct() {
        return (this.totalProfit / this.totalDeposit * 100);
    }

    get totalResult() {
        return this.lastRecord ? this.lastRecord.result : 0;
    }

    get initialPrincipal() {
        return this.firstRecord ? this.firstRecord.principal : 0;
    }

    deposit(amount) {
        this.totalDeposit += amount;
        this.lastRecord.deposit(amount);
    }

    withdraw(amount) {
        this.totalWithdrawal += amount;
        this.lastRecord.withdraw(amount);
    }

    addRecord(percentGain = null, deposit = 0, withdrawal = 0) {

        if (percentGain == null) {
            percentGain = this.lastRecord ? this.lastRecord.percentGain : 0;
        }

        if (deposit > 0)
            this.totalDeposit += deposit;
        if (withdrawal > 0)
            this.totalWithdrawal += withdrawal;

        const principal = this.lastResult;

        //remove 0-principal records 
        if (this.firstRecord.principal == 0) {
            this.records.shift();
        }

        this.records.push(new LedgerRecord(principal, percentGain, deposit, withdrawal));
    }

    print() {
        const table = new Table({
            head: ["deposit", "principal", "balance", "profit", "withdraw"]
            , colWidths: [20, 20, 20, 20, 20]
        });

        for (let r of this.records) {
            r.printRow(table);
        }

        console.log(table.toString());
    }
}

class LedgerRecord {
    get profitAmount() { return this._profitAmount; }
    get principal() { return this._principal; }
    get result() { return this._result; }
    get resultBeforeWithdrawal() { return this._resultBeforeWithdrawal; }
    get percentGain() { return this._percentGain; }
    get deposit() { return this._deposit; }
    get withdrawal() { return this._withdrawal; }

    constructor(principal, percentGain, deposit = 0, withdrawal = 0) {
        if (deposit < 0)
            throw ("deposit cannot be < 0");
        if (withdrawal < 0)
            throw ("withdrawal cannot be < 0");

        this._principal = principal + deposit;
        this._percentGain = percentGain;
        this._deposit = deposit;
        this._withdrawal = withdrawal;
        this._recalculate();
    }

    withdraw(amount) {
        if (amount < 0)
            throw ("withdrawal cannot be < 0");

        this._withdrawal += amount;
        this._recalculate();
    }

    deposit(amount) {
        if (amount < 0)
            throw ("deposit cannot be < 0");

        this._deposit += amount;
        this._principal = this._principal + amount;
        this._recalculate();
    }

    setPercentGain(percentGain) {
        this._percentGain = percentGain;
        this._recalculate();
    }

    _recalculate() {
        this._profitAmount = this._principal * this._percentGain / 100;
        this._resultBeforeWithdrawal = (this._principal + this._profitAmount);

        if (this._withdrawal > this._resultBeforeWithdrawal) {
            const diff = Math.abs(this._resultBeforeWithdrawal - this._withdrawal);
            if (diff >= 10)
                throw (`withdrawal amount ${this._withdrawal} exceeds balance ${this._resultBeforeWithdrawal}`);

            this._withdrawal = this._resultBeforeWithdrawal;
        }

        this._result = this._resultBeforeWithdrawal - this._withdrawal;
    }

    printRow(table) {
        table.push(
            [
                Math.floor(this._deposit),
                Math.floor(this._principal),
                Math.floor(this._result),
                Math.floor(this._profitAmount),
                Math.floor(this._withdrawal)
            ]
        );
    }
}

module.exports = {
    Ledger, LedgerRecord
}