const { ethers } = require('ethers');
const Document = require('../models/Document');
const IdentityVerifierABI = require('../abi/IdentityVerifier.json');

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8546";
const IDENTITY_CONTRACT_ADDRESS = process.env.IDENTITY_CONTRACT_ADDRESS;

async function runReconciliation() {
  console.log("--- Starting State Reconciliation ---");
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(IDENTITY_CONTRACT_ADDRESS, IdentityVerifierABI, provider);

    // 1. Fetch all documents from DB that aren't verified yet
    const dbDocs = await Document.findAll({
      where: {
        status: ['pending', 'rejected'] // Focus on syncing state for active/rejected requests
      }
    });

    for (const doc of dbDocs) {
      try {
        // 2. Query blockchain for source of truth
        const onChainData = await contract.getIdentity(doc.userAddress);
        
        // onChainData order: [identityHash, status, assignedVerifier, timestamp, deadline, reward, settled]
        const onChainStatusNum = Number(onChainData[1]);
        const onChainVerifier = onChainData[2];
        
        // Status mapping: { None: 0, Pending: 1, Verified: 2, Revoked: 3, Rejected: 4 }
        const statusMap = ["none", "pending", "verified", "revoked", "rejected"];
        const actualStatus = statusMap[onChainStatusNum];

        // 3. Compare and Fix
        let needsUpdate = false;
        const updates = {};

        if (doc.status !== actualStatus && actualStatus !== "none") {
          console.log(`[Mismatch] User ${doc.userAddress}: DB(${doc.status}) vs Chain(${actualStatus})`);
          updates.status = actualStatus;
          needsUpdate = true;
        }

        if (doc.assignedVerifier?.toLowerCase() !== onChainVerifier.toLowerCase() && onChainVerifier !== ethers.ZeroAddress) {
          console.log(`[Mismatch] User ${doc.userAddress}: Verifier update needed.`);
          updates.assignedVerifier = onChainVerifier.toLowerCase();
          needsUpdate = true;
        }

        if (needsUpdate) {
          await doc.update(updates);
          console.log(`[Fixed] State synchronized for ${doc.userAddress}`);
        }
      } catch (err) {
        console.error(`Error reconciling user ${doc.userAddress}:`, err.message);
      }
    }
    console.log("--- Reconciliation Complete ---");
  } catch (error) {
    console.error("Critical Reconciliation Error:", error);
  }
}

// Run every 10 minutes
function startReconciliationService() {
  runReconciliation(); // Run immediately on start
  setInterval(runReconciliation, 10 * 60 * 1000); 
}

module.exports = { startReconciliationService };
