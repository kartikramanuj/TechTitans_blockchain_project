const { ethers } = require('ethers');
const mysql = require('mysql2/promise');

async function main() {
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8546');
  const abi = [
    'function getIdentity(address) external view returns (bytes32, uint8, address, uint256, uint256, uint256, bool)',
    'function getVerifierList() external view returns (address[])',
    'function hasRole(bytes32, address) public view returns (bool)',
    'function VERIFIER_ROLE() public view returns (bytes32)'
  ];
  const contract = new ethers.Contract('0x5FbDB2315678afecb367f032d93F642f64180aa3', abi, provider);

  const db = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'Suhani@0410',
    database: 'blockchain_db'
  });

  console.log("--- STARTING MASTER SYNCHRONIZATION ---");

  // 1. Wipe DB
  await db.execute("TRUNCATE TABLE Documents");
  await db.execute("UPDATE lastprocessedblocks SET blockNumber = 0");

  // 2. Derive first 20 Hardhat addresses
  const mnemonic = "test test test test test test test test test test test junk";
  const master = ethers.HDNodeWallet.fromPhrase(mnemonic);
  const statusMap = ["none", "pending", "verified", "revoked", "rejected"];

  console.log("Scanning accounts for on-chain state...");

  for (let i = 0; i < 20; i++) {
    const wallet = master.deriveChild(44).deriveChild(60).deriveChild(0).deriveChild(0).deriveChild(i);
    const address = wallet.address;

    try {
      const id = await contract.getIdentity(address);
      const statusNum = Number(id[1]);
      
      if (statusNum !== 0) {
        console.log(`[FOUND] User: ${address} | Status: ${statusMap[statusNum]} | Verifier: ${id[2]}`);
        
        await db.execute(
          'INSERT INTO Documents (userAddress, status, assignedVerifier, cidHash, cid, uploadedAt) VALUES (?, ?, ?, ?, ?, ?)',
          [
            address.toLowerCase(), 
            statusMap[statusNum], 
            id[2] === ethers.ZeroAddress ? null : id[2].toLowerCase(), 
            id[0], 
            'blockchain-sync', 
            new Date()
          ]
        );
      }
    } catch (e) {
      // console.error(`Error checking ${address}:`, e.message);
    }
  }

  // Also check the specific account provided by user which is not in the first 20
  const specialAcc = '0x71bB9D852f0f290af4A40CbE05F5160F9ee7DD71';
  try {
    const id = await contract.getIdentity(specialAcc);
    if (Number(id[1]) !== 0) {
       console.log(`[FOUND] User: ${specialAcc} | Status: ${statusMap[Number(id[1])]} | Verifier: ${id[2]}`);
       await db.execute(
          'INSERT INTO Documents (userAddress, status, assignedVerifier, cidHash, cid, uploadedAt) VALUES (?, ?, ?, ?, ?, ?)',
          [specialAcc.toLowerCase(), statusMap[Number(id[1])], id[2] === ethers.ZeroAddress ? null : id[2].toLowerCase(), id[0], 'blockchain-sync', new Date()]
        );
    }
  } catch(e){}

  console.log("--- SYNC COMPLETE ---");
  await db.end();
}

main().catch(console.error);
