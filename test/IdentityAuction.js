const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Identity and Auction System", function () {
  async function deployFixture() {
    const [owner, verifier, user1, user2] = await ethers.getSigners();

    const IdentityVerifier = await ethers.getContractFactory("IdentityVerifier");
    const identity = await IdentityVerifier.deploy();

    const KYCGatedAuction = await ethers.getContractFactory("KYCGatedAuction");
    const auction = await KYCGatedAuction.deploy(identity.target);

    // Setup verifier
    await identity.addVerifier(verifier.address);
    const MIN_STAKE = ethers.parseEther("0.0005");
    await identity.connect(verifier).activateVerifier({ value: MIN_STAKE });

    return { identity, auction, owner, verifier, user1, user2 };
  }

  describe("Identity Verification", function () {
    it("Should allow a user to submit identity", async function () {
      const { identity, user1 } = await loadFixture(deployFixture);
      const hash = ethers.id("user1-id");
      const FEE = ethers.parseEther("0.0001");

      await expect(identity.connect(user1).submitIdentity(hash, { value: FEE }))
        .to.emit(identity, "IdentitySubmitted");
      
      const id = await identity.getIdentity(user1.address);
      expect(id.identityHash).to.equal(hash);
    });

    it("Should allow verifier to verify identity", async function () {
      const { identity, verifier, user1 } = await loadFixture(deployFixture);
      const hash = ethers.id("user1-id");
      const FEE = ethers.parseEther("0.0001");

      await identity.connect(user1).submitIdentity(hash, { value: FEE });
      
      await expect(identity.connect(verifier).verifyIdentity(user1.address, hash))
        .to.emit(identity, "IdentityVerified");
      
      expect(await identity.isVerified(user1.address)).to.be.true;
    });
  });

  describe("KYC Gated Auction", function () {
    it("Should start an auction", async function () {
      const { auction, owner } = await loadFixture(deployFixture);
      await expect(auction.connect(owner).startAuction())
        .to.emit(auction, "AuctionStarted");
      expect(await auction.auctionActive()).to.be.true;
    });

    it("Should only allow verified users to bid", async function () {
      const { identity, auction, verifier, user1, owner } = await loadFixture(deployFixture);
      
      await auction.connect(owner).startAuction();
      
      const hash = ethers.id("user1-id");
      await identity.connect(user1).submitIdentity(hash, { value: ethers.parseEther("0.0001") });
      
      // User1 not verified yet
      await expect(auction.connect(user1).placeBid({ value: ethers.parseEther("1.0") }))
        .to.be.revertedWith("KYC required");

      // Verify User1
      await identity.connect(verifier).verifyIdentity(user1.address, hash);

      // User1 can now bid
      await expect(auction.connect(user1).placeBid({ value: ethers.parseEther("1.0") }))
        .to.emit(auction, "BidPlaced");
      
      expect(await auction.highestBid()).to.equal(ethers.parseEther("1.0"));
    });
  });

  describe("Rewards and Withdrawals", function () {
    it("Should allow verifier to withdraw rewards", async function () {
      const { identity, verifier, user1 } = await loadFixture(deployFixture);
      const hash = ethers.id("user1-id");
      const FEE = ethers.parseEther("0.0001");

      await identity.connect(user1).submitIdentity(hash, { value: FEE });
      await identity.connect(verifier).verifyIdentity(user1.address, hash);

      const balanceBefore = await ethers.provider.getBalance(verifier.address);
      const tx = await identity.connect(verifier).withdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(verifier.address);
      expect(balanceAfter + gasUsed - balanceBefore).to.equal(FEE);
    });
  });
});
