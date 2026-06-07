const hre = require("hardhat");

async function main() {
  const IDENTITY_CONTRACT_ADDRESS = process.env.IDENTITY_CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const [admin] = await hre.ethers.getSigners();
  
  const IdentityVerifier = await hre.ethers.getContractAt("IdentityVerifier", IDENTITY_CONTRACT_ADDRESS);
  
  console.log("Registering admin (Account #0) as a verifier...");
  // Step 1: Grant Role
  const tx1 = await IdentityVerifier.addVerifier(admin.address);
  await tx1.wait();
  console.log("Verifier role granted.");

  // Step 2: Self-activate
  console.log("Activating verifier with stake...");
  const tx2 = await IdentityVerifier.activateVerifier({ value: hre.ethers.parseEther("0.0005") });
  await tx2.wait();

  
  console.log("Verifier registered and activated successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
