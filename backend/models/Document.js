const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  userAddress: { type: String, required: true, lowercase: true },
  cid: { type: String, required: true },
  cidHash: { type: String, required: true },
  assignedVerifier: { type: String, lowercase: true }, // Added field
  status: { 
    type: String, 
    enum: ['pending', 'verified', 'rejected'], 
    default: 'pending' 
  },
  uploadedAt: { type: Date, default: Date.now },
  verifiedBy: { type: String, lowercase: true },
  verifiedAt: { type: Date }
});

module.exports = mongoose.model('Document', DocumentSchema);
