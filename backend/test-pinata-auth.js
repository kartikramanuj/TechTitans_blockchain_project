require('dotenv').config();
const axios = require('axios');

async function testPinata() {
  const PINATA_JWT = process.env.PINATA_JWT;
  console.log("Testing Pinata with JWT:", PINATA_JWT ? (PINATA_JWT.substring(0, 10) + "...") : "MISSING");
  
  try {
    const res = await axios.get("https://api.pinata.cloud/data/testAuthentication", {
      headers: { 'Authorization': `Bearer ${PINATA_JWT}` }
    });
    console.log("Pinata Auth Success:", res.data);
  } catch (error) {
    console.error("Pinata Auth Failed:", error.response?.data || error.message);
  }
}

testPinata();
