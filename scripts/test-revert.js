const { ethers } = require('ethers');

async function main() {
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8546');
  const pkey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Account #0 (Deployer/Admin)
  const wallet = new ethers.Wallet(pkey, provider);
  
  const IDENTITY_CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
  const abi = [
    'function verifyIdentity(address, bytes32) external',
    'function getIdentity(address) external view returns (bytes32, uint8, address, uint256, uint256, uint256, bool)'
  ];
  
  const contract = new ethers.Contract(IDENTITY_CONTRACT_ADDRESS, abi, wallet);
  
  const user = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
  
  try {
    const id = await contract.getIdentity(user);
    console.log(`Verifying user ${user}...`);
    console.log(`Stored Hash: ${id[0]}`);
    console.log(`Assigned Verifier: ${id[2]}`);
    console.log(`My Address: ${wallet.address}`);
    
    // Attempting to verify
    const tx = await contract.verifyIdentity(user, id[0]);
    console.log(`Transaction sent: ${tx.hash}`);
    await tx.wait();
    console.log("Success!");
  } catch (err) {
    console.error("FAILED with error:");
    if (err.data) console.error(`Data: ${err.data}`);
    console.error(err.message);
  }
}

main();
