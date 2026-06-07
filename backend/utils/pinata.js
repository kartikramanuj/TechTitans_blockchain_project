const axios = require('axios');

async function unpinFromPinata(cid) {
  const PINATA_JWT = process.env.PINATA_JWT;
  const PINATA_API_KEY = process.env.PINATA_API_KEY;
  const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY;

  if (!PINATA_JWT && (!PINATA_API_KEY || PINATA_API_KEY === 'your_pinata_api_key')) {
    console.log(`[Pinata] Mock unpinning ${cid} (No authentication configured)`);
    return true;
  }
  
  if (cid.startsWith('QmDummy') || cid.startsWith('QmFallback') || cid === 'blockchain-sync') {
    console.log(`[Pinata] Mock unpinning ${cid} (Special CID)`);
    return true;
  }

  try {
    const headers = {};
    if (PINATA_JWT) {
      headers['Authorization'] = `Bearer ${PINATA_JWT}`;
    } else {
      headers['pinata_api_key'] = PINATA_API_KEY;
      headers['pinata_secret_api_key'] = PINATA_SECRET_API_KEY;
    }

    await axios.delete(`https://api.pinata.cloud/pinning/unpin/${cid}`, { headers });
    console.log(`[Pinata] Successfully unpinned ${cid}`);
    return true;
  } catch (error) {
    console.error(`[Pinata] Failed to unpin ${cid}:`, error.response?.data || error.message);
    return false;
  }
}

module.exports = { unpinFromPinata };
