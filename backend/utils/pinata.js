const axios = require('axios');

async function unpinFromPinata(cid) {
  if (!process.env.PINATA_API_KEY || process.env.PINATA_API_KEY === 'your_pinata_api_key') {
    console.log(`[Pinata] Mock unpinning ${cid} (API keys not configured)`);
    return true;
  }
  
  if (cid.startsWith('QmDummy') || cid.startsWith('QmFallback')) {
    console.log(`[Pinata] Mock unpinning ${cid} (Dummy CID)`);
    return true;
  }

  try {
    await axios.delete(`https://api.pinata.cloud/pinning/unpin/${cid}`, {
      headers: {
        'pinata_api_key': process.env.PINATA_API_KEY,
        'pinata_secret_api_key': process.env.PINATA_SECRET_API_KEY
      }
    });
    console.log(`[Pinata] Successfully unpinned ${cid}`);
    return true;
  } catch (error) {
    console.error(`[Pinata] Failed to unpin ${cid}:`, error.response?.data || error.message);
    return false;
  }
}

module.exports = { unpinFromPinata };
