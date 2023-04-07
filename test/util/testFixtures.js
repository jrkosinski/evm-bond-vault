const { ethers } = require("hardhat");
const constants = require("./constants");
const { ExchangeRate } = require("./exchangeRate");
const { Ledger } = require("./ledger");

async function convertAmount(amount, fullAmountFunction) {
    if (amount == 'all')
        amount = await fullAmountFunction();
    else if (amount == 'half')
        amount = (await fullAmountFunction()) / 2;
    else if (amount == 'quarter')
        amount = (await fullAmountFunction()) / 4;
    else if (amount == 'tenth')
        amount = (await fullAmountFunction()) / 10;
    return amount;
}

class TestVault {
    constructor(vaultContract, vaultToken, baseToken) {
        this.vault = vaultContract;
        this.users = [];
        this.vaultToken = vaultToken;
        this.baseToken = baseToken;
        this.initialBaseTokenBalance = 0;
        this.initialVaultTokenBalance = 0;
        this._deposits = [];
        this._exchangeRate = { vaultToken: 1, baseToken: 1 };
        this._phase = constants.vaultPhase.DEPOSIT;
        this._useLedger = true;
        this.directWithdraw = false;
        this._depositsTotal = 0; 
        this._withdrawalsTotal = 0; 
    }

    get address() { return this.vault.address; }
    get user() { return this.users[0]; }
    get user0() { return this.users[0]; }
    get user1() { return this.users[1]; }
    get user2() { return this.users[2]; };
    get expectedBaseTokenBalance() {
        return Math.floor(this.initialBaseTokenBalance + this._depositsTotal - this._withdrawalsTotal);
    }
    get sumOfDeposits() {
        return this._deposits.reduce((partialSum, a) => partialSum + a, 0);
    }
    async sumOfProfits() {
        let sum = 0; 
        for(let u of this.users) {
            sum += await u.realizedProfit(); 
        }
        return sum;
    }

    addUser(user) {
        this.users.push(new TestVaultUser(this, user));
    }

    addUsers(usersArray) {
        usersArray.forEach(u => {
            this.addUser(u);
        });
    }

    async init() {
        this.initialBaseTokenBalance = parseInt(await this.baseToken.balanceOf(this.vault.address));
        this.initialVaultTokenBalance = parseInt(await this.vaultToken.balanceOf(this.vault.address));

        this.users.forEach(async (u, n) => {
            await u.init();
        });
    }

    async usersDeposit(amountsArray) {
        for (let n = 0; n < amountsArray.length; n++) {
            await this.users[n].deposit(amountsArray[n]);
        }
    }

    async usersWithdrawAll() {
        for (let u of this.users) {
            await u.withdrawAll();
        }
    }

    async vaultTokenBalance() {
        return parseInt(await this.vaultToken.balanceOf(this.vault.address));
    }

    async baseTokenBalance() {
        return parseInt(await this.baseToken.balanceOf(this.vault.address));
    }

    currentExchangeRate() {
        return this._exchangeRate;
    }

    convertToBaseToken(vaultTokenAmount) {
        return (vaultTokenAmount * this._exchangeRate.baseToken) / this._exchangeRate.vaultToken;
    }

    convertToVaultToken(baseTokenAmount) {
        return (baseTokenAmount * this._exchangeRate.vaultToken) / this._exchangeRate.baseToken;
    }

    async jumpToNextWithdrawPhase(exchangeRate) {
        const currentPhase = await this.vault.currentPhase();
        let count = 1;
        switch (currentPhase) {
            case constants.vaultPhase.DEPOSIT: {
                count = 2;
                break;
            }
            case constants.vaultPhase.LOCKED: {
                count = 1;
                break;
            }
            case constants.vaultPhase.WITHDRAW: {
                count = 3;
                break;
            }
        }

        for (let n = 0; n < count; n++) {
            await this.nextPhase(exchangeRate);
        }
        this._exchangeRate = exchangeRate;
    }

    async nextPhase(exchangeRate) {
        if (!exchangeRate)
            exchangeRate = this._exchangeRate;
        else
            this._exchangeRate = exchangeRate;

        await this.vault.progressToNextPhase({
            vaultToken: exchangeRate.vaultToken.toString(),
            baseToken: exchangeRate.baseToken.toString()
        });

        this._phase++;
        if (this._phase > 2)
            this._phase = 0;

        if (this._phase == constants.vaultPhase.DEPOSIT) {
            for (let u of this.users) {
                if (this._useLedger)
                    u._ledger.addRecord();
            }
        }
    }

    async jumpFullRoundsToWithdrawal(exchangeRatesArray) {
        for (let n = 0; n < exchangeRatesArray.length; n++) {
            await this.jumpToNextWithdrawPhase(exchangeRatesArray[n]);
        }
    }

    async jumpToNextDeposit(exchangeRate) {
        let count = 1;
        if (this._phase == constants.vaultPhase.LOCKED)
            count = 2;
        else if (this._phase == constants.vaultPhase.DEPOSIT)
            count = 3;

        for (let n = 0; n < count; n++) {
            await this.nextPhase(exchangeRate);
        }
    }

    async deposit(user, amount) {
        await this.baseToken.connect(user).approve(this.vault.address, amount);
        await this.vault.connect(user).deposit(amount);
        this._deposits.push(amount);
        this._depositsTotal += amount; 
    }
    
    async withdrawDirect(user, amount) {
        await this.vaultToken.connect(user).transfer(this.address, amount);
        this._withdrawalsTotal += this.convertToBaseToken(amount); 
    }

    async withdrawNormal(user, amount) {
        await this.vaultToken.connect(user).approve(this.address, amount);
        await this.vault.connect(user).withdraw(amount);
        this._withdrawalsTotal += this.convertToBaseToken(amount); 
    }

    disableLedger() {
        this._useLedger = false;
    }
}

class TestVaultUser {
    constructor(vault, user) {
        this.vault = vault;
        this.user = user;
        this._depositAmount = 0;
        this._lockedAmount = 0;
        this._initialVaultTokenBalance = 0;
        this._initialBaseTokenBalance = 0;
        this._ledger = new Ledger(1);  //TODO: (MED) this should not be hard-coded 
    }

    get depositAmount() { return this._depositAmount; }
    get lockedAmount() { return this._lockedAmount; }
    get address() { return this.user.address; }
    get initialBaseTokenBalance() { return this._initialBaseTokenBalance; }
    get initialVaultTokenBalance() { return this._initialVaultTokenBalance; }
    get expectedResults() { return this._ledger; }

    async init() {
        this._initialBaseTokenBalance = parseInt(await this.baseTokenBalance());
        this._initialVaultTokenBalance = parseInt(await this.vaultTokenBalance());
    }

    async netWorthAt(exchangeRate) {
        const vaultTokenBal = await this.vaultTokenBalance();
        const baseTokenBal = await this.baseTokenBalance();

        return baseTokenBal + ExchangeRate.copy(exchangeRate).vaultToBaseToken(vaultTokenBal);
    }

    async vaultTokenBalance() {
        return parseInt(await this.vault.vaultToken.balanceOf(this.user.address));
    }

    async baseTokenBalance() {
        return parseInt(await this.vault.baseToken.balanceOf(this.user.address));
    }

    async deposit(amount) {
        amount = await convertAmount(amount, () => this.baseTokenBalance());

        //await this.vault.baseToken.connect(this.user).approve(this.vault.address, amount);
        //await this.vault.vault.connect(this.user).deposit(amount);
        //this.vault._deposits.push(amount);
        await this.vault.deposit(this.user, amount); 

        this._lockedAmount += amount;
        this._depositAmount += amount;

        if (this.vault._useLedger)
            this._ledger.deposit(amount);
    }

    //use deposit('all') instead 
    async depositAll() {
        await this.deposit('all');
    }

    async withdraw(amount) {
        amount = await convertAmount(amount, () => this.vaultTokenBalance());
        amount = Math.floor(amount);

        if (this.vault.directWithdraw) {
            //await this.vault.vaultToken.connect(this.user).transfer(this.vault.address, amount);
            await this.vault.withdrawDirect(this.user, amount); 
        }
        else {
            //await this.vault.vaultToken.connect(this.user).approve(this.vault.address, amount);
            //await this.vault.vault.connect(this.user).withdraw(amount);
            await this.vault.withdrawNormal(this.user, amount); 
        }

        this._lockedAmount -= this.vault.convertToBaseToken(amount);
        //console.log('locked: ' + this._lockedAmount); 
        if (this._lockedAmount < 0)
            this._lockedAmount = 0;

        if (this.vault._useLedger)
            this._ledger.withdraw(this.vault.convertToBaseToken(amount));
    }

    async withdrawPercent(percent) {
        const myBalance = await this.vaultTokenBalance();
        await this.withdraw(Math.floor(myBalance * (percent / 100)));
    }

    //use withdraw('all') instead 
    async withdrawAll() {
        await this.withdraw('all');
        this._lockedAmount = 0;
    }

    async realizedProfit() {
        const currentBalance = await this.baseTokenBalance();
        return currentBalance - this._initialBaseTokenBalance;
    }

    async realizedProfitPct() {
        const rawProfit = await this.realizedProfit();
        return (rawProfit / this._initialBaseTokenBalance) * 100;
    }

    async unrealizedProfit() {
        return (this.vault.convertToBaseToken(await this.vaultTokenBalance()) - this._initialBaseTokenBalance)
    }

    async unrealizedProfitPct() {
        const rawProfit = await this.unrealizedProfit();
        return (rawProfit / this._initialBaseTokenBalance) * 100;
    }

    async totalProfit() {
        return await this.unrealizedProfit() + await this.realizedProfit();
    }

    async transferVaultTokenTo(recipAddress, amount) {
        amount = await convertAmount(amount, () => this.vaultTokenBalance());
        await this.vault.vaultToken.connect(this.user).transfer(recipAddress, amount);
    }

    async transferBaseTokenTo(recipAddress, amount) {
        amount = await convertAmount(amount, () => this.baseTokenBalance());
        await this.vault.baseToken.connect(this.user).transfer(recipAddress, amount);
    }
}


module.exports = {
    TestVault,
    TestVaultUser
}