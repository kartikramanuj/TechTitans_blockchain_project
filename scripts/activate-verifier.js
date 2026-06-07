const hre = require("hardhat");

async function main() {
  const IDENTITY_CONTRACT_ADDRESS = "0xCb6ac6401c473F6CD126eFfA8A8d860582CB265c";
  const verifierAddress = "0x71bB9D852f0f290af4A40CbE05F5160F9ee7DD71"; // User's wallet from previous logs or the deployment key?
  // Let's use the deployment key's address since that's the one we have the private key for in the backend.
  // The key 0x928... resolves to 0x71bB9D852f0f290af4A40CbE05F5160F9ee7DD71.

  const identity = await hre.ethers.getContractAt("IdentityVerifier", IDENTITY_CONTRACT_ADDRESS);

  // 1. Add Verifier (Admin only - sender is Account #0 by default)
  console.log("Adding verifier...");
  const addTx = await identity.addVerifier(verifierAddress);
  await addTx.wait();
  console.log("Verifier added.");

  // 2. Activate Verifier (Stake required)
  console.log("Activating verifier with stake...");
  const stakeAmount = hre.ethers.parseEther("0.001");
  const activateTx = await identity.activateVerifier({ value: stakeAmount });
  await activateTx.wait();
  console.log("Verifier activated and staked!");

  const activeCount = await identity.getVerifierList();
  console.log("Registered verifiers:", activeCount.length);
  
  // In Identity.sol, activeVerifiers is a public array. To check length in ethers:
  // We'll just call a view function if available or try to fetch index 0.
  try {
    const firstActive = await identity.activeVerifiers(0);
    console.log("First active verifier:", firstActive);
  } catch (e) {
    console.log("No active verifiers found in array.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
