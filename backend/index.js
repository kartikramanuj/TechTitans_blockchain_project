require('dotenv').config();
const express = require('express');
const { sequelize, ensureDatabaseExists } = require('./config/database');
const { listenToEvents } = require('./utils/blockchainListener');
const { startReconciliationService } = require('./utils/reconciliation');

const authRoutes = require('./routes/auth');
const kycRoutes = require('./routes/kyc');

const app = express();
const PORT = process.env.PORT || 5001;

// ✅ 1. BULLETPROOF MANUAL CORS (Works with Express 5 & Vercel)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Allow any origin that is hitting us (Standard for dynamic Vercel subdomains)
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle Preflight (OPTIONS)
  if (req.method === 'OPTIONS') {
    console.log(`[CORS] Preflight handled for: ${origin}`);
    return res.status(204).send();
  }
  
  next();
});

// ✅ 2. Request Logger (For debugging Railway)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ✅ 3. Body parser
app.use(express.json());

// ✅ 4. Health Routes
app.get('/', (req, res) => res.json({ status: 'OK', message: 'Backend is live 🚀' }));
app.get('/health', (req, res) => res.json({ status: 'UP', database: 'connected' }));
app.get('/api', (req, res) => res.json({ message: 'API is working 🚀' }));

// ✅ 5. API Routes
app.use('/api/auth', authRoutes);
app.use('/api/kyc', kycRoutes);

// Database + Server Start
async function startServer() {
  try {
    await ensureDatabaseExists();
    await sequelize.authenticate();
    console.log('Database connected successfully.');

    await sequelize.sync({ alter: true });
    console.log('Database synchronized.');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Backend server running on http://127.0.0.1:${PORT}`);
      listenToEvents();
      startReconciliationService();
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

startServer();
