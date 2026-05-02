require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize, ensureDatabaseExists } = require('./config/database');
const { listenToEvents } = require('./utils/blockchainListener');
const { startReconciliationService } = require('./utils/reconciliation');

const authRoutes = require('./routes/auth');
const kycRoutes = require('./routes/kyc');

const app = express();
const PORT = process.env.PORT || 5001;

// Health Check Routes
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Backend is live 🚀'
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    database: 'connected'
  });
});

app.get('/api', (req, res) => {
  res.json({
    message: 'API is working 🚀'
  });
});

// Hardened CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.PRODUCTION_DOMAIN // e.g., https://secureid.app
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    if(!origin) return callback(null, true);
    if(allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS policy: This origin is not allowed access.'), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/kyc', kycRoutes);

// MySQL Connection and Sync
async function startServer() {
  try {
    await ensureDatabaseExists();
    await sequelize.authenticate();
    console.log('Database connected successfully.');
    
    await sequelize.sync({ alter: true });
    console.log('Database synchronized.');

    app.listen(PORT, () => {
      console.log(`Backend server running on port ${PORT}`);
      listenToEvents();
      startReconciliationService();
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

startServer();
