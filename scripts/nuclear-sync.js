const { ethers } = require('ethers');
const mysql = require('mysql2/promise');

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

  // 1. Delete 0x7099... from DB as requested
  console.log("Removing 0x7099... from database...");
  await db.execute("DELETE FROM Documents WHERE userAddress = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8'");

  // 2. Scan first 20 Hardhat accounts
  console.log("Scanning first 20 Hardhat accounts for PENDING requests...");
  const mnemonic = "test test test test test test test test test test test junk";
  const master = ethers.HDNodeWallet.fromPhrase(mnemonic);

  for (let i = 0; i < 20; i++) {
    const wallet = master.derivePath(`m/44'/60/0/0/${i}`);
    const address = wallet.address;
    
    // Skip 0x7099 as requested (it's index 1)
    if (address.toLowerCase() === '0x70997970c51812dc3a010c7d01b50e0d17dc79c8'.toLowerCase()) continue;

    try {
      const id = await contract.getIdentity(address);
      const statusNum = Number(id[1]);
      
      if (statusNum === 1) { // Pending
        console.log(`Found PENDING: User ${address} | Verifier ${id[2]}`);
        
        // Sync to DB
        await db.execute(
          'INSERT INTO Documents (userAddress, status, assignedVerifier, cidHash, cid, uploadedAt) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE status="pending", assignedVerifier=?',
          [address.toLowerCase(), 'pending', id[2].toLowerCase(), id[0], 'blockchain-sync', new Date(), id[2].toLowerCase()]
        );
      }
    } catch (e) {
      // Skip
    }
  }

  console.log("Wipe and Sync complete.");
  await db.end();
}

main().catch(console.error);
