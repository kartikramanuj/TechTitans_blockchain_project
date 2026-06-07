const { ethers } = require('ethers');
const Document = require('../models/Document');
const LastProcessedBlock = require('../config/LastProcessedBlock');
const IdentityVerifierABI = require('../abi/IdentityVerifier.json');
const { unpinFromPinata } = require('./pinata');

const RPC_URL = process.env.RPC_URL;
const IDENTITY_CONTRACT_ADDRESS = process.env.IDENTITY_CONTRACT_ADDRESS;

async function listenToEvents() {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(IDENTITY_CONTRACT_ADDRESS, IdentityVerifierABI.abi, provider);

    // 1. Get the last processed block from DB
    let lastBlockRecord = await LastProcessedBlock.findOne();
    if (!lastBlockRecord) {
      const currentBlockHeight = await provider.getBlockNumber();
      lastBlockRecord = await LastProcessedBlock.create({ blockNumber: currentBlockHeight });
    }

    // 2. Define Event Handlers
    const processSubmitted = async (user, verifier, deadline) => {
      console.log(`[Sync] Processing IdentitySubmitted | User: ${user} | Verifier: ${verifier}`);
      try {
        const [doc, created] = await Document.findOrCreate({
          where: { userAddress: user.toLowerCase() },
          defaults: {
            cid: 'blockchain-sync',
            cidHash: 'pending',
            status: 'pending',
            assignedVerifier: verifier.toLowerCase(),
            uploadedAt: new Date()
          }
        });

        const idData = await contract.getIdentity(user);
        const onChainHash = idData[0];

        const updates = { 
          assignedVerifier: verifier.toLowerCase(), 
          cidHash: onChainHash,
          status: 'pending'
        };

        if (!doc.cid) {
          updates.cid = 'blockchain-sync';
        }

        await doc.update(updates);
        
        console.log(`[Sync] Success for ${user} (Created: ${created})`);
      } catch (err) {
        console.error(`[Sync] Error for ${user}:`, err.message);
      }
    };

    const processVerified = async (user, verifier) => {
      console.log(`Processing IdentityVerified | User: ${user}`);
      try {
        const doc = await Document.findOne({ where: { userAddress: user.toLowerCase() } });
        if (doc) {
          if (doc.cid && doc.cid !== 'blockchain-sync') await unpinFromPinata(doc.cid);
          await doc.update({ 
            status: 'verified', 
            verifiedBy: verifier.toLowerCase(), 
            verifiedAt: new Date(),
            cid: null 
          });
        }
      } catch (err) {
        console.error(`Error processing verification for ${user}:`, err);
      }
    };

    const processRejected = async (user, verifier) => {
      console.log(`Processing IdentityRejected | User: ${user}`);
      try {
        const doc = await Document.findOne({ where: { userAddress: user.toLowerCase() } });
        if (doc) {
          if (doc.cid && doc.cid !== 'blockchain-sync') await unpinFromPinata(doc.cid);
          await doc.update({ 
            status: 'rejected', 
            verifiedBy: verifier.toLowerCase(), 
            verifiedAt: new Date(),
            cid: null 
          });
        }
      } catch (err) {
        console.error(`Error processing rejection for ${user}:`, err);
      }
    };

    // 3. Determine Scan Range
    const currentChainBlock = await provider.getBlockNumber();
    let startSyncBlock = lastBlockRecord.blockNumber;
    
    // Jump to current block if desync is too huge (public network safety)
    if (currentChainBlock - startSyncBlock > 1000) {
      console.warn(`[Sync] Large desync detected (${currentChainBlock - startSyncBlock} blocks). Resetting pointer.`);
      startSyncBlock = currentChainBlock - 5; 
    }
    
    // 4. Initial Missed Events Scan
    if (startSyncBlock < currentChainBlock) {
      const from = startSyncBlock + 1;
      const to = currentChainBlock;
      console.log(`[Sync] Scanning missed events from ${from} to ${to}...`);
      
      try {
        const [subs, veds, rejs] = await Promise.all([
          contract.queryFilter(contract.filters.IdentitySubmitted(), from, to),
          contract.queryFilter(contract.filters.IdentityVerified(), from, to),
          contract.queryFilter(contract.filters.IdentityRejected(), from, to)
        ]);

        for (const e of subs) await processSubmitted(e.args[0], e.args[1], e.args[2]);
        for (const e of veds) await processVerified(e.args[0], e.args[1]);
        for (const e of rejs) await processRejected(e.args[0], e.args[1]);
        
        await lastBlockRecord.update({ blockNumber: to });
      } catch (err) {
        console.error("[Sync] Initial scan failed:", err.message);
      }
    }

    // 5. Real-time Polling Interval
    console.log(`Real-time polling enabled on ${IDENTITY_CONTRACT_ADDRESS}...`);

    setInterval(async () => {
      try {
        const latest = await provider.getBlockNumber();
        let last = (await LastProcessedBlock.findOne()).blockNumber;

        // Reset if chain reset detected
        if (latest < last) {
          await lastBlockRecord.update({ blockNumber: latest });
          last = latest;
        }

        if (latest > last) {
          const from = last + 1;
          const to = latest;
          const targetTo = Math.min(to, from + 100); // Smaller batches for polling

          const [subs, veds, rejs] = await Promise.all([
            contract.queryFilter(contract.filters.IdentitySubmitted(), from, targetTo),
            contract.queryFilter(contract.filters.IdentityVerified(), from, targetTo),
            contract.queryFilter(contract.filters.IdentityRejected(), from, targetTo)
          ]);

          for (const e of subs) await processSubmitted(e.args[0], e.args[1], e.args[2]);
          for (const e of veds) await processVerified(e.args[0], e.args[1]);
          for (const e of rejs) await processRejected(e.args[0], e.args[1]);

          await lastBlockRecord.update({ blockNumber: targetTo });
        }
      } catch (err) {
        console.error("Polling error:", err.message);
      }
    }, 15000); 

  } catch (error) {
    console.error("Blockchain listener error:", error);
  }
}

module.exports = { listenToEvents };
