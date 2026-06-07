const hre = require("hardhat");

async function main() {
  const IDENTITY_CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const identity = await hre.ethers.getContractAt("IdentityVerifier", IDENTITY_CONTRACT_ADDRESS);

  console.log("Checking active verifiers...");
  try {
    let i = 0;
    while (true) {
      const verifier = await identity.activeVerifiers(i);
      console.log(`Active Verifier [${i}]: ${verifier}`);
      i++;
    }
  } catch (e) {
    console.log("End of active verifiers list.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
