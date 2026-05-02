const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');

// Secure Login with Signature Verification
router.post('/login', (req, res) => {
  const { address, role, signature, message } = req.body;

  if (!address || !role || !signature || !message) {
    return res.status(400).json({ error: 'Address, role, signature, and message are required' });
  }

  try {
    // 1. Verify the signature matches the address
    const recoveredAddress = ethers.verifyMessage(message, signature);
    
    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({ error: 'Invalid signature. Authentication failed.' });
    }

    // 2. Ensure the message is valid (prevents replay attacks if nonce added, but at minimum check content)
    if (!message.includes("Login to SecureID")) {
      return res.status(400).json({ error: 'Invalid authentication message.' });
    }

    // 3. Issue the token
    const token = jwt.sign({ address: address.toLowerCase(), role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: 'Authentication processing error.' });
  }
});

module.exports = router;
