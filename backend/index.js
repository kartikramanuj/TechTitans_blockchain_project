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

// ✅ 1. CORS MUST BE FIRST
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// ✅ 2. Handle preflight (Express 5 fix: use (.*) instead of *)
app.options('(.*)', cors());

// ✅ 3. Body parser
app.use(express.json());

// ✅ 4. Health Routes (AFTER CORS)
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
