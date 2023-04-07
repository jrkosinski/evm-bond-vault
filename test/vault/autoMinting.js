const { expect } = require("chai");
const { ethers } = require("hardhat");
const constants = require("../util/constants");
const deploy = require("../util/deploy");
const { expectRevert, expectEvent } = require("../util/testUtils");

describe(constants.VAULT_CONTRACT_ID + ": Automatic Minting", function () {
    let vaultToken, vault, baseToken;        //contracts
    let owner, addr1, addr2, addr3; 	    //accounts
    const initialBalance = 1000; 
    let initialTotalSupply = 0; 

    beforeEach(async function () {
        [owner, depositor, addr2, addr3, ...addrs] = await ethers.getSigners();

        //contract
        [vaultToken, vault, baseToken] = await deploy.deployAll(false);
        await vaultToken.mint(vault.address, initialBalance); 
        initialTotalSupply = parseInt(await vaultToken.totalSupply());
        
        await baseToken.mint(depositor.address, initialTotalSupply * 2);
    });

    describe("Initial State", function () {
        it("initial vault balance", async function () {
            expect(await vaultToken.balanceOf(vault.address)).to.equal(initialBalance); 
        });

        it("initial supply", async function () {
            expect(initialTotalSupply).to.equal(1_000_000_000_000 + initialBalance);
        });
    });

    describe("Use of Automatic Minting", function () {
        it("use less than supply in vault", async function () {
            const depositAmount = initialBalance / 2; 
            
            //exchange ST for some VT 
            await baseToken.connect(depositor).approve(vault.address, depositAmount); 
            await vault.connect(depositor).deposit(depositAmount);

            //total supply has stayed the same (no minting)
            expect(await vaultToken.totalSupply()).to.equal(initialTotalSupply);
            
            //balance in vault has decreased 
            expect(await vaultToken.balanceOf(vault.address)).to.equal(initialBalance - depositAmount);
        });

        it("use amount equal to supply in vault", async function () {
            const depositAmount = initialBalance;

            //exchange ST for some VT 
            await baseToken.connect(depositor).approve(vault.address, depositAmount);
            await vault.connect(depositor).deposit(depositAmount);

            //total supply has stayed the same (no minting)
            expect(await vaultToken.totalSupply()).to.equal(initialTotalSupply);

            //balance in vault has decreased 
            expect(await vaultToken.balanceOf(vault.address)).to.equal(initialBalance - depositAmount);
        });

        it("use more than supply in vault", async function () {
            const depositAmount = initialBalance * 3;

            //exchange ST for some VT 
            await baseToken.connect(depositor).approve(vault.address, depositAmount);
            await vault.connect(depositor).deposit(depositAmount);

            //total supply has stayed the same (no minting)
            expect(await vaultToken.totalSupply()).to.equal(initialTotalSupply + (initialBalance*2));

            //balance in vault has decreased 
            expect(await vaultToken.balanceOf(vault.address)).to.equal(0);
        });

        it("use one less than supply in vault", async function () {
            const depositAmount = initialBalance -1;

            //exchange ST for some VT 
            await baseToken.connect(depositor).approve(vault.address, depositAmount);
            await vault.connect(depositor).deposit(depositAmount);

            //total supply has stayed the same (no minting)
            expect(await vaultToken.totalSupply()).to.equal(initialTotalSupply);

            //balance in vault has decreased 
            expect(await vaultToken.balanceOf(vault.address)).to.equal(1);
        });

        it("use one more than supply in vault", async function () {
            const depositAmount = initialBalance +1;

            //exchange ST for some VT 
            await baseToken.connect(depositor).approve(vault.address, depositAmount);
            await vault.connect(depositor).deposit(depositAmount);

            //total supply has stayed the same (no minting)
            expect(await vaultToken.totalSupply()).to.equal(initialTotalSupply + 1);

            //balance in vault has decreased 
            expect(await vaultToken.balanceOf(vault.address)).to.equal(0);
        });
    });
});