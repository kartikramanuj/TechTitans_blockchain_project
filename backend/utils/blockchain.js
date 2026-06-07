const { ethers } = require('ethers');
require('dotenv').config();

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.VERIFIER_PRIVATE_KEY, provider);

const ABI = [
  "function verifyIdentity(address user, bytes32 identityHash) external",
  "function isVerified(address user) public view returns (bool)"
];

const contract = new ethers.Contract(process.env.IDENTITY_CONTRACT_ADDRESS, ABI, wallet);

/**
 * Calls the smart contract to verify an identity on-chain
 */
async function verifyOnChain(userAddress, cidHash) {
  try {
    console.log(`Sending on-chain verification for ${userAddress}...`);
    const tx = await contract.verifyIdentity(userAddress, cidHash);
    const receipt = await tx.wait();
    console.log(`On-chain verification successful! Hash: ${receipt.hash}`);
    return receipt.hash;
  } catch (error) {
    console.error("Smart contract call failed:", error);
    throw error;
  }
}

module.exports = { verifyOnChain };
