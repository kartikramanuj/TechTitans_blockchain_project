const { ethers } = require('ethers');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'backend/.env' });

async function main() {
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8546');
  const abi = [
    'function getIdentity(address) external view returns (bytes32, uint8, address, uint256, uint256, uint256, bool)'
  ];
  const contract = new ethers.Contract('0x5FbDB2315678afecb367f032d93F642f64180aa3', abi, provider);

  const db = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'Suhani@0410',
    database: 'blockchain_db'
  });

  console.log("--- FINAL FORCE SYNC ---");
  await db.execute("TRUNCATE TABLE Documents");

  const mnemonic = "test test test test test test test test test test test junk";
  const master = ethers.HDNodeWallet.fromPhrase(mnemonic);
  const statusMap = ["none", "pending", "verified", "revoked", "rejected"];

  const users = [
    '0x71bB9D852f0f290af4A40CbE05F5160F9ee7DD71',
    '0x6cE3EB9D3ae528E8A7Df3C8B4C9ec2b083182ba8',
    '0x1B1C447994279393a53916C95f99A39d391068E0',
    '0x3dD3CC9A906Fe2760f75badc5F45A5D6c3D8a63B',
    '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
  ];

  for (const user of users) {
    const id = await contract.getIdentity(user);
    if (Number(id[1]) === 1) {
       console.log(`[SYNC] Found Pending: ${user} -> Assigned: ${id[2]}`);
       await db.execute(
         'INSERT INTO Documents (userAddress, status, assignedVerifier, cidHash, cid, uploadedAt) VALUES (?, ?, ?, ?, ?, ?)',
         [user.toLowerCase(), 'pending', id[2].toLowerCase(), id[0], 'blockchain-sync', new Date()]
       );
    }
  }

  console.log("--- FORCE SYNC COMPLETE ---");
  await db.end();
}

main();
