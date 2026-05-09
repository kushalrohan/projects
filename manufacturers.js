const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/manufacturers
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT m.*, COUNT(p.id) AS product_count
      FROM manufacturers m
      LEFT JOIN products p ON p.manufacturer_id = m.id
      GROUP BY m.id
      ORDER BY m.name
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/manufacturers/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM manufacturers WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Manufacturer not found' });
    const [products] = await db.query('SELECT * FROM products WHERE manufacturer_id=?', [req.params.id]);
    res.json({ success: true, data: { ...rows[0], products } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/manufacturers
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, address, contact_person } = req.body;
    if (!name || !email) return res.status(400).json({ success: false, error: 'Name and email are required' });
    const [result] = await db.query(
      'INSERT INTO manufacturers (name, email, phone, address, contact_person) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone || null, address || null, contact_person || null]
    );
    const [newMfr] = await db.query('SELECT * FROM manufacturers WHERE id=?', [result.insertId]);
    res.status(201).json({ success: true, message: 'Manufacturer created', data: newMfr[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/manufacturers/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, email, phone, address, contact_person } = req.body;
    await db.query(
      'UPDATE manufacturers SET name=?, email=?, phone=?, address=?, contact_person=? WHERE id=?',
      [name, email, phone || null, address || null, contact_person || null, req.params.id]
    );
    res.json({ success: true, message: 'Manufacturer updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/manufacturers/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM manufacturers WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Manufacturer deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;