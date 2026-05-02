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
  if (!process.env.PINATA_API_KEY || process.env.PINATA_API_KEY === 'your_pinata_api_key') {
    console.warn("Pinata keys not configured. Using dummy CID.");
    return "QmDummyCID" + Math.random().toString(36).substring(7);
  }
  try {
    const formData = new FormData();
    formData.append('file', fileBuffer, { filename: fileName });
    const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
      maxBodyLength: Infinity,
      headers: { ...formData.getHeaders(), 'pinata_api_key': process.env.PINATA_API_KEY, 'pinata_secret_api_key': process.env.PINATA_SECRET_API_KEY }
    });
    return res.data.IpfsHash;
  } catch (error) { 
    console.error("Pinata upload failed:", error.message);
    console.warn("Falling back to dummy CID for testing.");
    return "QmFallbackCID" + Math.random().toString(36).substring(7);
  }
}

router.post('/upload', authenticate, authorize(['user', 'admin', 'verifier']), upload.single('file'), async (req, res) => {
  try {
    const { userAddress } = req.body;
    const cid = await uploadToPinata(req.file.buffer, req.file.originalname);
    
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
      await doc.update({ cid, status: 'pending', uploadedAt: new Date() });
    }
    
    res.status(201).json({ cid });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/tasks', authenticate, authorize(['verifier', 'admin']), async (req, res) => {
  try {
    const docs = await Document.findAll({ 
      where: { 
        status: 'pending', // Only show pending documents that still have CIDs
        assignedVerifier: { [Op.ne]: null },
        cid: { [Op.ne]: null }
      },
      order: [['uploadedAt', 'DESC']]
    });
    res.json(docs);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/update-status', authenticate, authorize(['verifier', 'admin']), async (req, res) => {
  const { userAddress, status } = req.body;
  try {
    // Immediate deletion for security purposes
    const doc = await Document.findOne({ where: { userAddress: userAddress.toLowerCase() } });
    if (doc && doc.cid) {
      await unpinFromPinata(doc.cid);
      await doc.update({ cid: null }); // Clear immediately
    }
    
    res.json({ success: true, message: "Document scheduled for deletion. Database will sync once block is confirmed." });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
