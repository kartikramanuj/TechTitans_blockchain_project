require('dotenv').config();
const Document = require('./models/Document');
const { sequelize } = require('./config/database');

async function dump() {
  try {
    const docs = await Document.findAll();
    console.log(JSON.stringify(docs, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

dump();
