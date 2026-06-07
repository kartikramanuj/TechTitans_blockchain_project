const hre = require("hardhat");
async function main() {
  const network = await hre.ethers.provider.getNetwork();
  console.log("ACTUAL_CHAIN_ID:", network.chainId.toString());
}
main().catch(console.error);
