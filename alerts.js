const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/alerts — all alerts
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT a.*, p.name AS product_name, p.sku, m.name AS manufacturer_name, m.email AS manufacturer_email
      FROM alerts a
      LEFT JOIN products p ON a.product_id = p.id
      LEFT JOIN manufacturers m ON a.manufacturer_id = m.id
      ORDER BY a.created_at DESC
      LIMIT 100
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/alerts/recent — last 10 alerts
router.get('/recent', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT a.*, p.name AS product_name, p.sku, m.name AS manufacturer_name
      FROM alerts a
      LEFT JOIN products p ON a.product_id = p.id
      LEFT JOIN manufacturers m ON a.manufacturer_id = m.id
      ORDER BY a.created_at DESC
      LIMIT 10
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/alerts/transactions — stock transaction log
router.get('/transactions', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT t.*, p.name AS product_name, p.sku
      FROM stock_transactions t
      LEFT JOIN products p ON t.product_id = p.id
      ORDER BY t.transaction_date DESC
      LIMIT 100
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/categories
router.get('/categories', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM categories ORDER BY name');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;