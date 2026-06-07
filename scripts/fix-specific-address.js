const hre = require("hardhat");

async function main() {
  const targetAddress = "0x028bb43AAeef593FcF6CE04bF4e139B4c9c0b1bd";
  const verifierAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

  console.log(`Attempting to activate verifier on ${targetAddress}...`);
  try {
    const identity = await hre.ethers.getContractAt("IdentityVerifier", targetAddress);
    
    // Check if it's actually a contract
    const code = await hre.ethers.provider.getCode(targetAddress);
    if (code === "0x") {
        console.log("No contract found at this address!");
        return;
    }

    const addTx = await identity.addVerifier(verifierAddress);
    await addTx.wait();
    console.log("Verifier added.");

    const stakeAmount = hre.ethers.parseEther("0.001");
    const activateTx = await identity.activateVerifier({ value: stakeAmount });
    await activateTx.wait();
    console.log("Verifier activated!");
  } catch (e) {
    console.error("Failed:", e.message);
  }
}

main().catch(console.error);
