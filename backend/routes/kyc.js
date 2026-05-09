const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const Document = require('../models/Document');
const { authenticate, authorize } = require('../middleware/auth');
const { ethers } = require('ethers');
const { Op } = require('sequelize');
const { unpinFromPinata } = require('../utils/pinata');

const upload = multer({ storage: multer.memoryStorage() });

async function uploadToPinata(fileBuffer, fileName) {
  const PINATA_JWT = process.env.PINATA_JWT;
  const PINATA_API_KEY = process.env.PINATA_API_KEY;
  const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY;

  if (!PINATA_JWT && (!PINATA_API_KEY || PINATA_API_KEY === 'your_pinata_api_key')) {
    throw new Error("Pinata authentication not configured. Please check your .env file.");
  }

  try {
    const formData = new FormData();
    formData.append('file', fileBuffer, { filename: fileName });
    
    const headers = { ...formData.getHeaders() };
    if (PINATA_JWT) {
      headers['Authorization'] = `Bearer ${PINATA_JWT}`;
    } else {
      headers['pinata_api_key'] = PINATA_API_KEY;
      headers['pinata_secret_api_key'] = PINATA_SECRET_API_KEY;
    }

    const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
      maxBodyLength: Infinity,
      headers
    });
    return res.data.IpfsHash;
  } catch (error) { 
    console.error("Pinata upload failed:", error.response?.data || error.message);
    throw new Error(`IPFS Upload Failed: ${error.message}`);
  }
}

router.post('/upload', authenticate, authorize(['user', 'admin', 'verifier']), upload.single('file'), async (req, res) => {
  try {
    const { userAddress } = req.body;
    console.log(`[Upload] Start for ${userAddress}`);
    
    if (!req.file) {
      console.error("[Upload] No file provided in request");
      return res.status(400).json({ error: "No file uploaded" });
    }

    const cid = await uploadToPinata(req.file.buffer, req.file.originalname);
    console.log(`[Upload] IPFS Success: ${cid} for ${userAddress}`);
    
    // Create or update the document record with CID. 
    let [doc, created] = await Document.findOrCreate({
      where: { userAddress: userAddress.toLowerCase() },
      defaults: { 
        cid, 
        cidHash: 'pending', 
        status: 'pending', 
        uploadedAt: new Date() 
      }
    });

    if (!created) {
      console.log(`[Upload] Updating existing record for ${userAddress}`);
      await doc.update({ cid, status: 'pending', uploadedAt: new Date() });
    } else {
      console.log(`[Upload] Created new record for ${userAddress}`);
    }
    
    res.status(201).json({ cid });
  } catch (error) { 
    console.error("[Upload] Error:", error.message);
    res.status(500).json({ error: error.message }); 
  }
});

router.get('/tasks', authenticate, authorize(['verifier', 'admin']), async (req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const contract = new ethers.Contract(
      process.env.IDENTITY_CONTRACT_ADDRESS, 
      require('../abi/IdentityVerifier.json').abi, 
      provider
    );

    console.log(`[Tasks] Fetching for ${req.user.address}`);
    
    // Get all pending from DB
    const dbDocs = await Document.findAll({ 
      where: { 
        status: { [Op.or]: ['pending', 'none'] } 
      } 
    });
    
    const verifiedTasks = [];
    for (const doc of dbDocs) {
      try {
        const idData = await contract.getIdentity(doc.userAddress);
        const statusNum = Number(idData[1]);
        const assignedVerifier = idData[2].toLowerCase();

        // If it's still pending on-chain, include it
        if (statusNum === 1) {
          // Update DB if verifier changed
          if (doc.assignedVerifier !== assignedVerifier) {
            await doc.update({ assignedVerifier });
          }
          verifiedTasks.push({
            ...doc.toJSON(),
            assignedVerifier // ensure fresh
          });
        } else if (statusNum >= 2) {
          // It's finalized on-chain (Verified=2, Revoked=3, Rejected=4), clean up DB
          const statusMap = ["none", "pending", "verified", "revoked", "rejected"];
          await doc.update({ status: statusMap[statusNum] || 'verified', cid: null });
          console.log(`[Tasks] Auto-cleaned finalized task for ${doc.userAddress} (Status: ${statusNum})`);
        } else {
          // statusNum is 0 (None). 
          // This happens if the user uploaded but hasn't submitted yet.
          // We keep the CID in the DB but don't return it to verifier yet.
          if (doc.status !== 'pending') {
             await doc.update({ status: 'pending' }); // Ensure it stays in our "workable" set
          }
        }
      } catch (err) {
        console.error(`[Tasks] Skip error for ${doc.userAddress}:`, err.message);
      }
    }

    console.log(`[Tasks] Returning ${verifiedTasks.length} verified live tasks`);
    res.json(verifiedTasks);
  } catch (error) { 
    console.error("[Tasks] Root Error:", error.message);
    res.status(500).json({ error: error.message }); 
  }
});

router.post('/update-status', authenticate, authorize(['verifier', 'admin']), async (req, res) => {
  const { userAddress, status } = req.body;
  try {
    const doc = await Document.findOne({ where: { userAddress: userAddress.toLowerCase() } });
    if (doc) {
      if (doc.cid && doc.cid !== 'blockchain-sync') {
        await unpinFromPinata(doc.cid);
      }
      await doc.update({ 
        cid: null,
        status: status,
        verifiedBy: req.user.address,
        verifiedAt: new Date()
      }); 
    }
    
    res.json({ success: true, message: "Status updated and document secured." });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/activity', async (req, res) => {
  try {
    const activity = await Document.findAll({
      limit: 5,
      order: [['uploadedAt', 'DESC']]
    });
    res.json(activity);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
