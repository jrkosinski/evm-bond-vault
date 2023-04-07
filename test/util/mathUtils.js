
function compound(principal, interestBpsArray) {
    for(let n=0; n<interestBpsArray.length; n++) {
        principal = principal + Math.floor((principal * interestBpsArray[n])/10_000); 
    }
    return principal;
}

function compoundRepeat(principal, interestBps, count) {
    const interestBpsArray = [];
    for (let n = 0; n < count; n++) {
        interestBpsArray.push(interestBps); 
    }
    return compound(principal, interestBpsArray); 
}

function xPercentOfy(x, y) {
    return y * (x / 100);
}

function xIsWhatPercentOfy(x, y) {
    return x/y * 100;
}

// min and max inclusive
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

function randomBool() {
    return randomInt(1, 2) == 1; 
}

module.exports = {
    compound,
    compoundRepeat,
    xPercentOfy,
    xIsWhatPercentOfy, 
    randomInt,
    randomBool
};