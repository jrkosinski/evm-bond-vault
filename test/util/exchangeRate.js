
function deriveWholeNumberRate(value) {
    let b = value;
    while (Math.floor(b) != b) {
        b = b * 10;
    }
    const a = deriveRateForAFromB(b);
    //console.log(b);
    return [a, b];
}

function deriveRateForAFromB(rateForB) {
    const len = Math.floor(rateForB).toString().length;
    let output = "1".padEnd(len, '0');
    return parseInt(output);
}

class ExchangeRate {

    constructor(a, b) {
        this.vaultToken = a;
        this.baseToken = b;
        this.useIntegerMath = false;
    }

    vaultToBaseToken(a) {
        if (this.useIntegerMath) {
            return Math.floor(Math.floor(a) * Math.floor(this.baseToken) / Math.floor(this.vaultToken));
        } else {
            return (a * this.baseToken / this.vaultToken);
        }
    }

    baseToVaultToken(b) {
        if (this.useIntegerMath) {
            return Math.floor(Math.floor(b) * Math.floor(this.vaultToken) / Math.floor(this.baseToken));
        } else {
            return (b * this.vaultToken / this.baseToken);
        }
    }

    static increaseByPercent(exchangeRate, percentIncrease) {
        const rate = deriveWholeNumberRate(exchangeRate.baseToken + (exchangeRate.baseToken * (percentIncrease / 100)));
        return new ExchangeRate(rate[0], rate[1]);
    }

    static copy(exchangeRate) {
        return new ExchangeRate(exchangeRate.vaultToken, exchangeRate.baseToken);
    }
}

module.exports = {
    ExchangeRate
}