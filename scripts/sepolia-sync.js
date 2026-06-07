const { ethers } = require('ethers');
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config({ path: 'backend/.env' });

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const abi = [
    'function getIdentity(address) external view returns (bytes32, uint8, address, uint256, uint256, uint256, bool)',
    'function getVerifierList() external view returns (address[])'
  ];
  const contract = new ethers.Contract(process.env.IDENTITY_CONTRACT_ADDRESS, abi, provider);

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

  console.log("--- STARTING SEPOLIA MASTER SYNCHRONIZATION ---");

  await sequelize.sync();
  await Document.destroy({ where: {}, truncate: true });
  
  // Set block number to current latest to avoid processing 10 million blocks
  const latestBlock = await provider.getBlockNumber();
  await LastProcessedBlock.upsert({ id: 1, blockNumber: latestBlock });
  console.log(`Synced listener to Sepolia block: ${latestBlock}`);

  const statusMap = ["none", "pending", "verified", "revoked", "rejected"];

  const accounts = [
    '0x71bB9D852f0f290af4A40CbE05F5160F9ee7DD71',
    '0x6cE3EB9D3ae528E8A7Df3C8B4C9ec2b083182ba8',
    '0x1B1C447994279393a53916C95f99A39d391068E0',
    '0x3dD3CC9A906Fe2760f75badc5F45A5D6c3D8a63B',
    '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    '0x47fb55d2db51a0c819c7a8c43da7e3d8f6f24367',
    '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
  ];

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
    } catch (e) {
      console.error(`Error checking ${address}:`, e.message);
    }
  }

  console.log("--- SEPOLIA SYNC COMPLETE ---");
  await sequelize.close();
}

main().catch(console.error);
