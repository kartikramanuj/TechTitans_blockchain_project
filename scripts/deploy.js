const hre = require("hardhat");

async function main() {
  // 1. Deploy IdentityVerifier Contract
  const IdentityVerifier = await hre.ethers.getContractFactory("IdentityVerifier");
  console.log("Deploying IdentityVerifier contract...");
  const identity = await IdentityVerifier.deploy();
  await identity.waitForDeployment();
  const identityAddress = await identity.getAddress();
  console.log("IdentityVerifier Smart Contract deployed to:", identityAddress);

  // 2. Deploy KYCGatedAuction Contract
  const KYCGatedAuction = await hre.ethers.getContractFactory("KYCGatedAuction");
  console.log("Deploying KYCGatedAuction contract...");
  const auction = await KYCGatedAuction.deploy(identityAddress);
  await auction.waitForDeployment();
  const auctionAddress = await auction.getAddress();
  console.log("KYCGatedAuction Smart Contract deployed to:", auctionAddress);

  console.log("\n--- Deployment Summary ---");
  console.log("IdentityVerifier Address:", identityAddress);
  console.log("KYCGatedAuction Address:", auctionAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});