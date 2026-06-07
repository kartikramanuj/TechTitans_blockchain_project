require('dotenv').config();
const express = require('express');
const { sequelize, ensureDatabaseExists } = require('./config/database');
const { listenToEvents } = require('./utils/blockchainListener');
const { startReconciliationService } = require('./utils/reconciliation');

const authRoutes = require('./routes/auth');
const kycRoutes = require('./routes/kyc');

const app = express();
const PORT = process.env.PORT || 5001;

// BULLETPROOF MANUAL CORS (Works with Express 5 & Vercel)
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

// Request Logger (For debugging Railway)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Body parser
app.use(express.json());

// Health Routes
app.get('/', (req, res) => res.json({ status: 'OK', message: 'Backend is live 🚀' }));
app.get('/health', (req, res) => res.json({ status: 'UP', database: 'connected' }));
app.get('/railway-test', (req, res) => {
  res.json({
    success: true,
    message: 'LATEST CODE IS RUNNING'
  });
});

// API Routes
// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/kyc', kycRoutes);

// Generic /api route (for testing)
app.get('/api', (req, res) => res.json({ 
  message: 'API is working 🚀',
  timestamp: new Date().toISOString()
}));

// Global 404 Handler (Crucial for debugging Railway)
app.use((req, res) => {
  console.error(`[404] Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ 
    error: 'Route not found', 
    method: req.method, 
    path: req.url,
    hint: 'Check if the route is registered in index.js and the path is correct.'
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(`[Error] ${err.stack}`);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

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
