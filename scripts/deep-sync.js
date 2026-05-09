const { ethers } = require('ethers');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'backend/.env' });

async function main() {
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8546');
  const abi = [
    'function getIdentity(address) external view returns (bytes32, uint8, address, uint256, uint256, uint256, bool)',
    'function activeVerifiers(uint256) public view returns (address)',
    'function activePointer() public view returns (uint256)',
    'function getVerifierList() external view returns (address[])'
  ];
  const contract = new ethers.Contract('0x5FbDB2315678afecb367f032d93F642f64180aa3', abi, provider);

  const db = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'Suhani@0410',
    database: 'blockchain_db'
  });

  // 1. Wipe DB to start fresh
  console.log("Cleaning database...");
  await db.execute("TRUNCATE TABLE Documents");
  await db.execute("UPDATE lastprocessedblocks SET blockNumber = 0");

  // 2. Identify ALL active verifiers
  const verifiers = await contract.getVerifierList();
  console.log("Registered Verifiers:", verifiers);
  
  // 3. Scan the last 50 blocks for ANY user who has a pending status on-chain
  console.log("Scanning on-chain state for all users...");
  const accounts = [
    '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
    '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
    '0x976EA74026E726554dB657fA54763abd0C3a0aa9',
    '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955',
    '0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f',
    '0xa0Ee7A142d267C1f36714E4a8F75612F20a79720',
    '0x71bB9D852f0f290af4A40CbE05F5160F9ee7DD71'
  ];

  const statusMap = ["none", "pending", "verified", "revoked", "rejected"];

  for (const acc of accounts) {
    const id = await contract.getIdentity(acc);
    const statusNum = Number(id[1]);
    
    // ONLY sync PENDING ones to the backlog
    if (statusNum === 1) { 
      console.log(`Syncing PENDING task: User ${acc} -> Verifier ${id[2]}`);
      await db.execute(
        'INSERT INTO Documents (userAddress, status, assignedVerifier, cidHash, cid, uploadedAt) VALUES (?, ?, ?, ?, ?, ?)',
        [acc.toLowerCase(), 'pending', id[2].toLowerCase(), id[0], 'blockchain-sync', new Date()]
      );
    }
  }

  console.log("Full Deep Sync Complete.");
  await db.end();
}

main();
