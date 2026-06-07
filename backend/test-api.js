const axios = require('axios');

const API_URL = 'http://127.0.0.1:5000/api';

// Hardhat Account #0 (Admin/Verifier)
const USER_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'; 

async function runTest() {
  try {
    console.log('--- Starting KYC Flow Test ---');

    // 1. LOGIN
    console.log('\n1. Logging in...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      address: USER_ADDRESS,
      role: 'user' // We'll log in as user first
    });
    const userToken = loginRes.data.token;
    console.log('User Token received.');

    // 2. UPLOAD
    console.log('\n2. Uploading document CID...');
    const uploadRes = await axios.post(`${API_URL}/kyc/upload`, {
      cid: 'QmTest123456789ExampleHash',
      userAddress: USER_ADDRESS
    }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    const documentId = uploadRes.data.document._id;
    console.log(`Document uploaded! ID: ${documentId}`);

    // 3. LOGIN AS VERIFIER
    console.log('\n3. Logging in as Verifier...');
    const verifierLoginRes = await axios.post(`${API_URL}/auth/login`, {
      address: USER_ADDRESS,
      role: 'verifier'
    });
    const verifierToken = verifierLoginRes.data.token;

    // 4. GET PENDING DOCUMENTS
    console.log('\n4. Fetching pending documents...');
    const docsRes = await axios.get(`${API_URL}/kyc/documents`, {
      headers: { Authorization: `Bearer ${verifierToken}` }
    });
    console.log(`Found ${docsRes.data.length} pending documents.`);

    // 5. VERIFY DOCUMENT
    console.log('\n5. Verifying document (Calling Blockchain)...');
    const verifyRes = await axios.post(`${API_URL}/kyc/verify`, {
      documentId: documentId,
      action: 'verify'
    }, {
      headers: { Authorization: `Bearer ${verifierToken}` }
    });

    console.log('\n✅ TEST SUCCESSFUL!');
    console.log('Blockchain Result:', verifyRes.data.message);
    console.log('Document Status:', verifyRes.data.document.status);

  } catch (error) {
    console.error('\n❌ TEST FAILED!');
    if (error.response) {
      console.error('Error Details:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

runTest();
