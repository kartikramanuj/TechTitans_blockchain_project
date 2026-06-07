const hre = require("hardhat");

async function main() {
  const IDENTITY_CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const targetAdmin = "0x71bB9D852f0f290af4A40CbE05F5160F9ee7DD71";
  
  // Get the deployer (Account #0) who is the current admin
  const [deployer] = await hre.ethers.getSigners();
  const identity = await hre.ethers.getContractAt("IdentityVerifier", IDENTITY_CONTRACT_ADDRESS, deployer);

  console.log(`Setting up ${targetAdmin} as main admin...`);

  // 1. Add as Admin
  console.log("Granting Admin role...");
  const tx1 = await identity.addAdmin(targetAdmin);
  await tx1.wait();
  console.log("Admin role granted.");

  // 2. Add as Verifier
  console.log("Granting Verifier role...");
  const tx2 = await identity.addVerifier(targetAdmin);
  await tx2.wait();
  console.log("Verifier role granted.");

  // 3. To activate as a verifier (with stake), we need to send ETH from that account.
  // Since we are on Hardhat, we can impersonate the account if it's not one of the default ones,
  // or simply use it if it is one of the 20 default accounts.
  // Account #11 is 0x71bE... but not 0x71bB...
  
  // We will fund the account first to ensure it has ETH
  console.log("Funding account with 1 ETH...");
  await deployer.sendTransaction({
    to: targetAdmin,
    value: hre.ethers.parseEther("1.0")
  });

  // Impersonate the account to activate it
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [targetAdmin],
  });

  const impersonatedSigner = await hre.ethers.getSigner(targetAdmin);
  const identityAsTarget = identity.connect(impersonatedSigner);

  console.log("Activating verifier with stake from target account...");
  const tx3 = await identityAsTarget.activateVerifier({ value: hre.ethers.parseEther("0.0005") });
  await tx3.wait();
  console.log("Verifier activated with 0.0005 ETH stake.");

  await hre.network.provider.request({
    method: "hardhat_stopImpersonatingAccount",
    params: [targetAdmin],
  });

  console.log("\nSetup Complete for:", targetAdmin);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
