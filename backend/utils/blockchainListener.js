const { ethers } = require('ethers');
const Document = require('../models/Document');
const LastProcessedBlock = require('../config/LastProcessedBlock');
const IdentityVerifierABI = require('../abi/IdentityVerifier.json');
const { unpinFromPinata } = require('./pinata');

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8546";
const IDENTITY_CONTRACT_ADDRESS = process.env.IDENTITY_CONTRACT_ADDRESS;

async function listenToEvents() {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(IDENTITY_CONTRACT_ADDRESS, IdentityVerifierABI.abi, provider);

    // 1. Get the last processed block from DB
    let lastBlockRecord = await LastProcessedBlock.findOne();
    if (!lastBlockRecord) {
      const currentBlock = await provider.getBlockNumber();
      lastBlockRecord = await LastProcessedBlock.create({ blockNumber: currentBlock });
    }

    const startBlock = lastBlockRecord.blockNumber + 1;
    const latestBlock = await provider.getBlockNumber();
    const endBlock = Math.min(startBlock + 9, latestBlock); // Limit to 10 blocks for Alchemy Free Tier
    
    console.log(`Scanning for missed events from block ${startBlock} to ${endBlock}...`);

    // 2. Function to process an event
    const processSubmitted = async (user, cidHash, verifier) => {
      console.log(`Processing IdentitySubmitted | User: ${user}`);
      const doc = await Document.findOne({ where: { userAddress: user.toLowerCase(), status: 'pending' } });
      if (doc) {
        await doc.update({ assignedVerifier: verifier.toLowerCase(), cidHash: cidHash.toString() });
      }
    };

    const processVerified = async (user, verifier) => {
      console.log(`Processing IdentityVerified | User: ${user}`);
      const doc = await Document.findOne({ where: { userAddress: user.toLowerCase() } });
      if (doc && doc.cid) {
        await unpinFromPinata(doc.cid);
        await doc.update({ 
          status: 'verified', 
          verifiedBy: verifier.toLowerCase(), 
          verifiedAt: new Date(),
          cid: null // Remove CID for security
        });
      }
    };

    const processRejected = async (user, verifier) => {
      console.log(`Processing IdentityRejected | User: ${user}`);
      const doc = await Document.findOne({ where: { userAddress: user.toLowerCase() } });
      if (doc && doc.cid) {
        await unpinFromPinata(doc.cid);
        await doc.update({ 
          status: 'rejected', 
          verifiedBy: verifier.toLowerCase(), 
          verifiedAt: new Date(),
          cid: null // Remove CID for security
        });
      }
    };

    // 3. Scan missed events (only if there are blocks to scan)
    if (startBlock <= endBlock) {
      const filterSubmitted = contract.filters.IdentitySubmitted();
      const filterVerified = contract.filters.IdentityVerified();
      const filterRejected = contract.filters.IdentityRejected();

      const missedSubmitted = await contract.queryFilter(filterSubmitted, startBlock, endBlock);
      for (const event of missedSubmitted) await processSubmitted(...event.args);

      const missedVerified = await contract.queryFilter(filterVerified, startBlock, endBlock);
      for (const event of missedVerified) await processVerified(...event.args);

      const missedRejected = await contract.queryFilter(filterRejected, startBlock, endBlock);
      for (const event of missedRejected) await processRejected(...event.args);
    }

    // 4. Update last processed block
    await lastBlockRecord.update({ blockNumber: endBlock });

    // 5. Start Real-time Listening
    console.log(`Real-time listening enabled on ${IDENTITY_CONTRACT_ADDRESS}...`);

    contract.on("IdentitySubmitted", async (user, cidHash, verifier, event) => {
      await processSubmitted(user, cidHash, verifier);
      await lastBlockRecord.update({ blockNumber: event.log.blockNumber });
    });

    contract.on("IdentityVerified", async (user, verifier, event) => {
      await processVerified(user, verifier);
      await lastBlockRecord.update({ blockNumber: event.log.blockNumber });
    });

    contract.on("IdentityRejected", async (user, verifier, event) => {
      await processRejected(user, verifier);
      await lastBlockRecord.update({ blockNumber: event.log.blockNumber });
    });

  } catch (error) {
    console.error("Blockchain listener error:", error);
  }
}

module.exports = { listenToEvents };