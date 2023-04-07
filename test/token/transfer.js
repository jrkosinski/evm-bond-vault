const { expect } = require("chai");
const { ethers } = require("hardhat");
const constants = require("../util/constants");
const deploy = require("../util/deploy");
const { expectEvent, expectRevert } = require("../util/testUtils");

describe(constants.TOKEN_CONTRACT_ID + ": ERC20 Transfer", function () {
    let token, vault, baseToken;	    //contracts
    let owner, addr1, addr2, addr3;	    //accounts
    let quantityMinted;
    const userMintQuantity = 10000;

    beforeEach(async function () {
        [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

        //contract
        [token, vault, baseToken] = await deploy.deployAll(false);

        await token.mint(addr1.address, userMintQuantity);
        await token.mint(addr2.address, userMintQuantity);
        await token.mint(addr3.address, userMintQuantity);

        //to test that transfers do not affect total supply
        quantityMinted = parseInt(await token.totalSupply());

        //set vault to withdraw phase 
        await vault.progressToNextPhase([1, 1]);
        await vault.progressToNextPhase([1, 1]);

        await baseToken.mint(vault.address, 1000000000);
    });

    describe("Initial State", function () {
        it("Initial balances", async function () {
            expect(await token.balanceOf(addr1.address)).to.equal(userMintQuantity);
            expect(await token.balanceOf(addr2.address)).to.equal(userMintQuantity);
            expect(await token.balanceOf(addr3.address)).to.equal(userMintQuantity);
        });
    });

    describe("Simple Transfer", function () {
        it("anyone can transfer tokens to the vault", async function () {
            const amount = 1000;
            await token.connect(addr1).transfer(vault.address, amount);

            //check that transfer was credited and debited
            expect(await token.balanceOf(addr1.address)).to.equal(userMintQuantity - amount);
            expect(await token.balanceOf(vault.address)).to.equal(amount);
            expect(await token.totalSupply()).to.equal(quantityMinted);
        });

        it("cannot transfer more than balance", async function () {
            await expectRevert(
                () => token.connect(addr1).transfer(vault.address, userMintQuantity + 1),
                constants.errorMessages.TRANSFER_EXCEEDS_BALANCE
            );
        });

        //NOTE: can't test this with transfer disabled 
        it.skip("cannot transfer to zero address", async function () {
            await expectRevert(
                () => token.transfer(constants.ZERO_ADDRESS, 1),
                constants.errorMessages.ZERO_ADDRESS
            );
        });

        it("cannot transfer to any non-vault address", async function () {
            await expectRevert(
                () => token.transfer(addr1.address, 1),
                constants.errorMessages.TOKEN_TRANSFER_DISABLED
            );
        });
    });
    
    describe("Transfer Disabled", function() {
        it("user to user transfer fails", async function() {
            await expectRevert(
                () => token.connect(addr1).transfer(addr2.address, 1), 
                constants.errorMessages.VAULT_TOKEN_TRANSFER_DISABLED(addr1.address, addr2.address, 1)
            ); 
        }); 

        it("user to user transferFrom fails", async function () {
            await token.connect(addr2).approve(addr1.address, 1); 
            await expectRevert(
                () => token.connect(addr1).transferFrom(addr2.address, addr3.address, 1),
                constants.errorMessages.VAULT_TOKEN_TRANSFER_DISABLED(addr2.address, addr3.address, 1)
            ); 
        }); 
    });

    //cannot send to unassociated vault 
    //cannot send to the wrong vault 

    describe("Approve and Transfer", function () {
        describe("Approve Single", function () {
            it("anyone can approve vault as spender", async function () {
                await token.connect(addr1).approve(vault.address, 1);
                expect(await token.allowance(addr1.address, vault.address)).to.equal(1);
            });

            //skipped because token xfer disabled
            it.skip("anyone can approve and transfer to non-vault address", async function () {
                const amount = 100;

                //addr2 is spender for addr1
                await token.connect(addr1).approve(addr2.address, amount);
                expect(await token.allowance(addr1.address, addr2.address)).to.equal(amount);

                //addr2 transfer from addr1 to addr2
                await token.connect(addr2).transferFrom(addr1.address, addr2.address, amount);

                //check that transfer was credited and debited
                expect(await token.balanceOf(addr1.address)).to.equal(userMintQuantity - amount);
                expect(await token.balanceOf(addr2.address)).to.equal(userMintQuantity + amount);

                //check that allowance is cleared 
                expect(await token.allowance(addr1.address, addr2.address)).to.equal(0);
            });

            it("anyone can approve and transfer to vault", async function () {
                const amount = 100;

                //addr2 is spender for addr1
                await token.connect(addr1).approve(addr2.address, amount);
                expect(await token.allowance(addr1.address, addr2.address)).to.equal(amount);

                //addr2 transfer from addr1 to vault
                await token.connect(addr2).transferFrom(addr1.address, vault.address, amount);

                //check that transfer was credited and debited
                expect(await token.balanceOf(addr1.address)).to.equal(userMintQuantity - amount);
                expect(await token.balanceOf(vault.address)).to.equal(amount);

                //check that allowance is cleared 
                expect(await token.allowance(addr1.address, addr2.address)).to.equal(0);
            });

            it("approve and transfer: vault takes the correct amount", async function () {
                const transferAmount = 100;
                const approveAmount = transferAmount * 2;

                //addr2 is spender for addr1
                await token.connect(addr1).approve(addr2.address, approveAmount);
                expect(await token.allowance(addr1.address, addr2.address)).to.equal(approveAmount);

                //addr2 transfer from addr1 to vault
                await token.connect(addr2).transferFrom(addr1.address, vault.address, transferAmount);

                //check that transfer was credited and debited
                expect(await token.balanceOf(addr1.address)).to.equal(userMintQuantity - transferAmount);
                expect(await token.balanceOf(vault.address)).to.equal(transferAmount);

                //check that allowance is cleared 
                expect(await token.allowance(addr1.address, addr2.address)).to.equal(approveAmount - transferAmount);
            });

            //skipped because token xfer disabled
            it.skip("anyone can approve and transfer to a third non-vault address", async function () {
                const amount = 100;
                await token.connect(addr1).approve(addr2.address, amount);
                expect(await token.allowance(addr1.address, addr2.address)).to.equal(amount);

                await token.connect(addr2).transferFrom(addr1.address, addr3.address, amount);

                //check that transfer was credited and debited
                expect(await token.balanceOf(addr1.address)).to.equal(userMintQuantity - amount);
                expect(await token.balanceOf(addr2.address)).to.equal(userMintQuantity);
                expect(await token.balanceOf(addr3.address)).to.equal(userMintQuantity + amount);

                //check that allowance is cleared 
                expect(await token.allowance(addr1.address, addr2.address)).to.equal(0);
            });

            //skipped because token xfer disabled
            it.skip("anyone cannot approve and double transfer", async function () {
                const amount = 100;
                await token.connect(addr1).approve(addr2.address, amount);

                //transfer from owner to addr2, using addr1 as middleman after approval
                await token.connect(addr2).transferFrom(addr1.address, addr3.address, amount);

                //try to transfer another one
                await expectRevert(
                    () => token.connect(addr2).transferFrom(addr1.address, addr3.address, 1),
                    constants.errorMessages.INSUFFICIENT_ALLOWANCE
                );

                expect(await token.balanceOf(addr1.address)).to.equal(userMintQuantity - amount);
                expect(await token.balanceOf(addr2.address)).to.equal(userMintQuantity);
                expect(await token.balanceOf(addr3.address)).to.equal(userMintQuantity + amount);
            });

            it("anyone cannot approve and double transfer to vault", async function () {
                const amount = 100;
                await token.connect(addr1).approve(addr2.address, amount);

                //transfer from owner to vault, using addr1 as middleman after approval
                await token.connect(addr2).transferFrom(addr1.address, vault.address, amount);

                //try to transfer another one
                await expectRevert(
                    () => token.connect(addr2).transferFrom(addr1.address, vault.address, 1),
                    constants.errorMessages.INSUFFICIENT_ALLOWANCE
                );

                expect(await token.balanceOf(addr1.address)).to.equal(userMintQuantity - amount);
                expect(await token.balanceOf(addr2.address)).to.equal(userMintQuantity);
                expect(await token.balanceOf(vault.address)).to.equal(amount);
            });

            //skipped because token xfer disabled
            it.skip("spender can spend partial allowance", async function () {
                const allowance = 100;
                const amount1 = 80;
                const amount2 = 20;
                await token.connect(addr1).approve(addr2.address, allowance);
                expect(await token.allowance(addr1.address, addr2.address)).to.equal(allowance);

                await token.connect(addr2).transferFrom(addr1.address, addr3.address, amount1);
                expect(await token.allowance(addr1.address, addr2.address)).to.equal(allowance - amount1);

                //check that transfer was credited and debited
                expect(await token.balanceOf(addr1.address)).to.equal(userMintQuantity - amount1);
                expect(await token.balanceOf(addr2.address)).to.equal(userMintQuantity);
                expect(await token.balanceOf(addr3.address)).to.equal(userMintQuantity + amount1);

                await token.connect(addr2).transferFrom(addr1.address, addr3.address, amount2);
                expect(await token.allowance(addr1.address, addr2.address)).to.equal(0);

                //check that transfer was credited and debited
                expect(await token.balanceOf(addr1.address)).to.equal(userMintQuantity - allowance);
                expect(await token.balanceOf(addr2.address)).to.equal(userMintQuantity);
                expect(await token.balanceOf(addr3.address)).to.equal(userMintQuantity + allowance);

                //check that allowance is cleared   
                expect(await token.allowance(addr1.address, addr2.address)).to.equal(0);
            });

            it("spender can spend partial allowance transferring to vault", async function () {
                const allowance = 100;
                const amount1 = 80;
                const amount2 = 20;
                await token.connect(addr1).approve(addr2.address, allowance);
                expect(await token.allowance(addr1.address, addr2.address)).to.equal(allowance);

                await token.connect(addr2).transferFrom(addr1.address, vault.address, amount1);
                expect(await token.allowance(addr1.address, addr2.address)).to.equal(allowance - amount1);

                //check that transfer was credited and debited
                expect(await token.balanceOf(addr1.address)).to.equal(userMintQuantity - amount1);
                expect(await token.balanceOf(addr2.address)).to.equal(userMintQuantity);
                expect(await token.balanceOf(vault.address)).to.equal(amount1);

                await token.connect(addr2).transferFrom(addr1.address, vault.address, amount2);
                expect(await token.allowance(addr1.address, addr2.address)).to.equal(0);

                //check that transfer was credited and debited
                expect(await token.balanceOf(addr1.address)).to.equal(userMintQuantity - allowance);
                expect(await token.balanceOf(addr2.address)).to.equal(userMintQuantity);
                expect(await token.balanceOf(vault.address)).to.equal(allowance);

                //check that allowance is cleared 
                expect(await token.allowance(addr1.address, addr2.address)).to.equal(0);
            });

            it("spending cannot exceed allowance", async function () {
                const allowance = 100;
                await token.connect(addr1).approve(addr2.address, allowance);
                expect(await token.allowance(addr1.address, addr2.address)).to.equal(allowance);

                await expectRevert(
                    () => token.connect(addr2).transferFrom(addr1.address, vault.address, allowance + 1),
                    constants.errorMessages.INSUFFICIENT_ALLOWANCE
                );
            });

            it("cannot transfer without approval", async function () {
                expect(await token.allowance(addr1.address, addr2.address)).to.equal(0);

                await expectRevert(
                    () => token.connect(addr2).transferFrom(addr1.address, vault.address, 1),
                    constants.errorMessages.INSUFFICIENT_ALLOWANCE
                );
            });

            it("cannot approve to zero address", async function () {
                await expectRevert(
                    () => token.approve(constants.ZERO_ADDRESS, 1)
                );
            });

            it("approval resets allowance", async function () {

                //allowance is zero 
                expect(await token.allowance(owner.address, addr1.address)).to.equal(0);

                const quantities = [1000, 100, 10000, 0];

                //approve a quantity 
                for (let q of quantities) {
                    await token.approve(addr1.address, q);
                    expect(await token.allowance(owner.address, addr1.address)).to.equal(q);
                }
            });

            //skipped because token xfer disabled
            it.skip("transfer to non-vault address decreases allowance", async function () {
                const initialAllowance = 1000;
                const transferAmount = 300;

                //no allowance 
                expect(await token.allowance(owner.address, addr1.address)).to.equal(0);

                //create allowance 
                await token.approve(addr1.address, initialAllowance);
                expect(await token.allowance(owner.address, addr1.address)).to.equal(initialAllowance);

                //transfer part of allowance 
                await token.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount);
                expect(await token.allowance(owner.address, addr1.address)).to.equal(initialAllowance - transferAmount);
            });

            it("transfer to vault decreases allowance", async function () {
                const initialAllowance = 1000;
                const transferAmount = 300;

                //no allowance 
                expect(await token.allowance(owner.address, addr1.address)).to.equal(0);

                //create allowance 
                await token.approve(addr1.address, initialAllowance);
                expect(await token.allowance(owner.address, addr1.address)).to.equal(initialAllowance);

                //transfer part of allowance 
                await token.connect(addr1).transferFrom(owner.address, vault.address, transferAmount);
                expect(await token.allowance(owner.address, addr1.address)).to.equal(initialAllowance - transferAmount);
            });

            it("increase/decrease allowance", async function () {

                //allowance is zero 
                expect(await token.allowance(owner.address, addr1.address)).to.equal(0);

                const quantities = [1000, 100, 10000, 0];

                //approve a quantity 
                let prevQ = 0;
                for (let q of quantities) {
                    if (q > prevQ) {
                        await token.increaseAllowance(addr1.address, q - prevQ);
                        expect(await token.allowance(owner.address, addr1.address)).to.equal(q);
                    }
                    else {
                        await token.decreaseAllowance(addr1.address, prevQ - q);
                        expect(await token.allowance(owner.address, addr1.address)).to.equal(q);
                    }
                    prevQ = q;
                }
            });

            it("cannot transferFrom to any non-vault address", async function () {
                await token.connect(addr1).approve(owner.address, 1);
                await expectRevert(
                    () => token.transferFrom(addr1.address, addr2.address, 1),
                    constants.errorMessages.TOKEN_TRANSFER_DISABLED
                );
            });

            it("transfer from one's own account", async function () {
                //TODO: (MED) this test case 
            });
        });
    });
    
    describe("VaultNotSet Constraint", function() {
        let token2; 
        
        beforeEach(async function() {
            token2 = await deploy.deployToken(); 
        }); 
        
        it("can't call transfer if vault address is not set", async function() {
            expectRevert(
                () => token2.transfer(addr1.address, 1),
                constants.errorMessages.VAULT_NOT_SET
            )
        });

        it("can't call transferFrom if vault address is not set", async function () {
            await token2.approve(owner.address, 1); 
            
            expectRevert(
                () => token2.transferFrom(addr1.address, addr2.address, 1),
                constants.errorMessages.VAULT_NOT_SET
            )
        });
    }); 

    describe("Events", function () {

        it("approve event fires on approve", async () => {
            await expectEvent(() => token.connect(addr1).approve(addr2.address, 10),
                "Approval", [addr1.address, addr2.address, 10]);
        });
        
        //skipped because token xfer disabled
        it.skip("transfer event fires on transfer to non-vault address", async () => {
            await expectEvent(() => token.connect(addr1).transfer(addr2.address, 100),
                "Transfer", [addr1.address, addr2.address, 100]);
        });

        it("Transfer event fires on transfer to vault", async () => {
            await expectEvent(() => token.connect(addr1).transfer(vault.address, 100),
                "Transfer", [addr1.address, vault.address, 100]);
        });

        //TODO: (MED) why no event
        it.skip("Deposit event fires on transfer to vault", async () => {
            await expectEvent(() => token.connect(addr1).transfer(vault.address, 100),
                "Deposit", [addr1.address, addr1.address, 100, 100]);
        });

        //skipped because token xfer disabled
        it.skip("transfer event fires on transferFrom to non-vault address", async () => {
            await token.connect(addr1).approve(addr2.address, 100);
            await expectEvent(() => token.connect(addr2).transferFrom(addr1.address, addr3.address, 100),
                "Transfer", [addr1.address, addr3.address, 100]);
        });
        
        it("transfer event fires on transferFrom to vault", async () => {
            await token.connect(addr1).approve(addr2.address, 100);
            await expectEvent(() => token.connect(addr2).transferFrom(addr1.address, vault.address, 100),
                "Transfer", [addr1.address, vault.address, 100]);
        });

        it("approve event fires on increaseAllowance", async () => {
            await token.connect(addr1).approve(addr2.address, 100);
            await expectEvent(() => token.connect(addr1).increaseAllowance(addr2.address, 150),
                "Approval", [addr1.address, addr2.address, 250]);
        });

        it("approve event fires on decreaseAllowance", async () => {
            await token.connect(addr1).approve(addr2.address, 100);
            await expectEvent(() => token.connect(addr1).decreaseAllowance(addr2.address, 25),
                "Approval", [addr1.address, addr2.address, 75]);
        });
        
        //TODO: (MED) Deposit event fires on transfer to vault
        //TODO: (MED) Deposit event fires on direct deposit to vault
        //TODO: (MED) Withdraw event fires on transferFrom to vault
    });
});