const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ── API Routes ──────────────────────────────────────────────
app.use('/api/products', require('./routes/products'));
app.use('/api/manufacturers', require('./routes/manufacturers'));
app.use('/api/alerts', require('./routes/alerts'));

// Categories shortcut route
app.get('/api/categories', async (req, res) => {
  const db = require('./config/db');
  const [rows] = await db.query('SELECT * FROM categories ORDER BY name');
  res.json({ success: true, data: rows });
});

// ── Health check ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Inventory API is running', timestamp: new Date() });
});

// ── Serve frontend for all other routes ────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ── Start server ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Inventory Management Server running on http://localhost:${PORT}`);
  console.log(`📦 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🖥️  Frontend: http://localhost:${PORT}\n`);
});
