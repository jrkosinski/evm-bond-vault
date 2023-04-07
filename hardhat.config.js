require("@nomiclabs/hardhat-waffle");
require('@openzeppelin/hardhat-upgrades');
require("solidity-coverage");
require('hardhat-contract-sizer');
require("hardhat-gas-reporter");

const SEPOLIA_API_KEY = "...";
const GOERLI_API_KEY = "...";
const ETH_MAINNET_API_KEY = "...";
const POLYGON_API_KEY = "...";
const PRIVATE_KEY = "..."; 

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
    solidity: "0.8.16",
    networks: {
        eth: {
            url: "https://eth-rpc.gateway.pokt.network",
            accounts: [`${PRIVATE_KEY}`]
        },
        bsc: {
            url: "https://bsc-dataseed.binance.org/",
            accounts: [`${PRIVATE_KEY}`]
        },
        tron: {
            url: "http://grpc.shasta.trongrid.io:50051",
            accounts: [`${PRIVATE_KEY}`]
        }, 
        goerli: {
            url: `https://eth-goerli.g.alchemy.com/v2/${GOERLI_API_KEY}`,
            accounts: [`${PRIVATE_KEY}`]
        },
        sepolia: {
            url: `https://sepolia.infura.io/v3/${SEPOLIA_API_KEY}`,
            accounts: [`${PRIVATE_KEY}`]
        },
        mainnet: {
            url: `https://eth-mainnet.g.alchemy.com/v2/${ETH_MAINNET_API_KEY}`,
            accounts: [`${PRIVATE_KEY}`]
        },
        polygon: {
            url: `https://polygon-mainnet.g.alchemy.com/v2/${POLYGON_API_KEY}`,
            accounts: [`${PRIVATE_KEY}`]
        },
        bsc_testnet: {
            url: 'https://data-seed-prebsc-1-s3.binance.org:8545',
            accounts: [`${PRIVATE_KEY}`]
        }
    },
    gasReporter: {
        enabled: true
    }
};



