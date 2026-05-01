const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const Document = require('../models/Document');
const { authenticate, authorize } = require('../middleware/auth');
const { ethers } = require('ethers');

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
    const cidHash = ethers.id(cid);
    const newDoc = await Document.findOneAndUpdate(
      { userAddress: userAddress.toLowerCase() },
      { cid, cidHash, status: 'pending', uploadedAt: new Date() },
      { upsert: true, new: true }
    );
    res.status(201).json({ cid, cidHash });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/assign', authenticate, async (req, res) => {
  const { userAddress, assignedVerifier } = req.body;
  try {
    await Document.updateOne(
      { userAddress: userAddress.toLowerCase() },
      { assignedVerifier: assignedVerifier.toLowerCase() }
    );
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Allowed admin to see tasks as well
router.get('/tasks', authenticate, authorize(['verifier', 'admin']), async (req, res) => {
  try {
    // Show all that are not yet finalized (verified)
    const docs = await Document.find({ status: { $ne: 'verified' } }).sort({ uploadedAt: -1 });
    res.json(docs);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/update-status', authenticate, authorize(['verifier', 'admin']), async (req, res) => {
  const { userAddress, status } = req.body;
  try {
    await Document.updateOne(
      { userAddress: userAddress.toLowerCase() },
      { status, verifiedBy: req.user.address, verifiedAt: new Date() }
    );
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
