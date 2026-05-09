const jwt = require('jsonwebtoken');
require('dotenv').config({ path: 'backend/.env' });
const axios = require('axios');

async function test() {
  const verifierAddress = '0x71bB9D852f0f290af4A40CbE05F5160F9ee7DD71';
  const token = jwt.sign({ address: verifierAddress, role: 'admin' }, process.env.JWT_SECRET);
  
  try {
    const res = await axios.get('http://localhost:5001/api/kyc/tasks', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Tasks Found:', res.data.length);
    console.log(JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.error('Error:', e.response?.data || e.message);
  }
}
test();
