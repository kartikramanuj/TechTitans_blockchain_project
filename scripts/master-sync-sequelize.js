const { ethers } = require('ethers');
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config({ path: 'backend/.env' });

async function main() {
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8546');
  const abi = [
    'function getIdentity(address) external view returns (bytes32, uint8, address, uint256, uint256, uint256, bool)',
    'function getVerifierList() external view returns (address[])'
  ];
  const contract = new ethers.Contract('0x5FbDB2315678afecb367f032d93F642f64180aa3', abi, provider);

  const sequelize = new Sequelize('blockchain_db', 'root', 'Suhani@0410', {
    host: '127.0.0.1',
    dialect: 'mysql',
    logging: false
  });

  const Document = sequelize.define('Document', {
    userAddress: { type: DataTypes.STRING, primaryKey: true },
    cid: DataTypes.STRING,
    cidHash: DataTypes.STRING,
    status: DataTypes.STRING,
    assignedVerifier: DataTypes.STRING,
    uploadedAt: DataTypes.DATE
  }, { timestamps: false });

  const LastProcessedBlock = sequelize.define('LastProcessedBlock', {
    blockNumber: DataTypes.INTEGER
  }, { timestamps: true });

  console.log("--- STARTING MASTER SYNCHRONIZATION ---");

  await sequelize.sync();
  await Document.destroy({ where: {}, truncate: true });
  await LastProcessedBlock.update({ blockNumber: 0 }, { where: {} });

  const mnemonic = "test test test test test test test test test test test junk";
  const master = ethers.HDNodeWallet.fromPhrase(mnemonic);
  const statusMap = ["none", "pending", "verified", "revoked", "rejected"];

  const accounts = [];
  for (let i = 0; i < 20; i++) {
    accounts.push(master.deriveChild(44).deriveChild(60).deriveChild(0).deriveChild(0).deriveChild(i).address);
  }
  accounts.push('0x71bB9D852f0f290af4A40CbE05F5160F9ee7DD71');

  for (const address of accounts) {
    try {
      const id = await contract.getIdentity(address);
      const statusNum = Number(id[1]);
      
      if (statusNum !== 0) {
        console.log(`[FOUND] User: ${address} | Status: ${statusMap[statusNum]} | Verifier: ${id[2]}`);
        
        await Document.create({
          userAddress: address.toLowerCase(),
          status: statusMap[statusNum],
          assignedVerifier: id[2] === ethers.ZeroAddress ? null : id[2].toLowerCase(),
          cidHash: id[0],
          cid: 'blockchain-sync',
          uploadedAt: new Date()
        });
      }
    } catch (e) {}
  }

  console.log("--- SYNC COMPLETE ---");
  await sequelize.close();
}

main().catch(console.error);
