const hre = require("hardhat");

async function main() {
  const IDENTITY_CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const [admin] = await hre.ethers.getSigners();
  
  const IdentityVerifier = await hre.ethers.getContractAt("IdentityVerifier", IDENTITY_CONTRACT_ADDRESS);
  
  console.log("Registering admin (Account #0) as a verifier...");
  const tx = await IdentityVerifier.addVerifier(admin.address, { value: hre.ethers.parseEther("0.01") });
  await tx.wait();
  
  console.log("Verifier registered successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
