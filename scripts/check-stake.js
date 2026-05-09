const hre = require("hardhat");

async function main() {
  const IDENTITY_CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const identity = await hre.ethers.getContractAt("IdentityVerifier", IDENTITY_CONTRACT_ADDRESS);
  const verifier = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  
  const stake = await identity.stake(verifier);
  const VERIFIER_ROLE = await identity.VERIFIER_ROLE();
  const hasRole = await identity.hasRole(VERIFIER_ROLE, verifier);
  
  console.log(`Verifier: ${verifier}`);
  console.log(`Contract VERIFIER_ROLE: ${VERIFIER_ROLE}`);
  console.log(`Stake: ${hre.ethers.formatEther(stake)} ETH`);
  console.log(`Has VERIFIER_ROLE: ${hasRole}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
