const { ethers } = require('ethers');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'backend/.env' });

async function main() {
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8546');
  const abi = ['function getIdentity(address) external view returns (bytes32, uint8, address, uint256, uint256, uint256, bool)'];
  const contract = new ethers.Contract('0x5FbDB2315678afecb367f032d93F642f64180aa3', abi, provider);

  const db = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'Suhani@0410',
    database: 'blockchain_db'
  });

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

  console.log("Synchronizing Database with Blockchain...");

  for (const acc of accounts) {
    try {
      const id = await contract.getIdentity(acc);
      const statusNum = Number(id[1]);
      const status = statusMap[statusNum];
      const verifier = id[2].toLowerCase();
      const hash = id[0];

      if (statusNum !== 0) {
        // Upsert into DB
        const [rows] = await db.execute('SELECT * FROM Documents WHERE userAddress = ?', [acc.toLowerCase()]);
        
        if (rows.length > 0) {
          console.log(`Updating ${acc}...`);
          await db.execute(
            'UPDATE Documents SET status = ?, assignedVerifier = ?, cidHash = ? WHERE userAddress = ?',
            [status, verifier === ethers.ZeroAddress ? null : verifier, hash, acc.toLowerCase()]
          );
        } else {
          console.log(`Inserting ${acc}...`);
          await db.execute(
            'INSERT INTO Documents (userAddress, status, assignedVerifier, cidHash, cid, uploadedAt) VALUES (?, ?, ?, ?, ?, ?)',
            [acc.toLowerCase(), status, verifier === ethers.ZeroAddress ? null : verifier, hash, 'blockchain-sync', new Date()]
          );
        }
      }
    } catch (e) {
      console.error(`Error syncing ${acc}:`, e.message);
    }
  }

  console.log("Sync Complete.");
  await db.end();
}

main();
