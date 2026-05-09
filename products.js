const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { checkAndAlert } = require('../middleware/alertService');

// GET /api/products — list all products with full details
router.get('/', async (req, res) => {
  try {
    const { search, category, status } = req.query;
    let query = `
      SELECT p.*, c.name AS category_name, m.name AS manufacturer_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ' AND (p.name LIKE ? OR p.sku LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category) {
      query += ' AND p.category_id = ?';
      params.push(category);
    }
    if (status === 'low') {
      query += ' AND p.quantity <= p.low_stock_threshold AND p.quantity > 0';
    } else if (status === 'out') {
      query += ' AND p.quantity = 0';
    } else if (status === 'ok') {
      query += ' AND p.quantity > p.low_stock_threshold';
    }

    query += ' ORDER BY p.updated_at DESC';

    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/products/stats — dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const [[totals]] = await db.query(`
      SELECT
        COUNT(*) AS total_products,
        SUM(quantity) AS total_stock,
        SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END) AS out_of_stock,
        SUM(CASE WHEN quantity > 0 AND quantity <= low_stock_threshold THEN 1 ELSE 0 END) AS low_stock,
        SUM(CASE WHEN quantity > low_stock_threshold THEN 1 ELSE 0 END) AS healthy_stock
      FROM products
    `);
    const [[alertCount]] = await db.query(
      "SELECT COUNT(*) AS pending FROM alerts WHERE status='PENDING'"
    );
    res.json({ success: true, data: { ...totals, pending_alerts: alertCount.pending } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/products/:id — single product
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, c.name AS category_name, m.name AS manufacturer_name,
              m.email AS manufacturer_email, m.phone AS manufacturer_phone
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
       WHERE p.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Product not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/products — create product
router.post('/', async (req, res) => {
  try {
    const { name, sku, category_id, manufacturer_id, description, unit, quantity, low_stock_threshold, price, location } = req.body;
    if (!name || !sku) return res.status(400).json({ success: false, error: 'Name and SKU are required' });

    const [result] = await db.query(
      `INSERT INTO products (name, sku, category_id, manufacturer_id, description, unit, quantity, low_stock_threshold, price, location)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, sku, category_id || null, manufacturer_id || null, description || null, unit || 'units',
       quantity || 0, low_stock_threshold || 10, price || 0, location || null]
    );

    // Log transaction
    if (quantity > 0) {
      await db.query(
        'INSERT INTO stock_transactions (product_id, type, quantity, reason, performed_by) VALUES (?, ?, ?, ?, ?)',
        [result.insertId, 'IN', quantity, 'Initial stock entry', 'System']
      );
    }

    // Check alert
    await checkAndAlert(result.insertId);

    const [newProduct] = await db.query('SELECT * FROM products WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'Product created successfully', data: newProduct[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, error: 'SKU already exists' });
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/products/:id — update product details
router.put('/:id', async (req, res) => {
  try {
    const { name, sku, category_id, manufacturer_id, description, unit, low_stock_threshold, price, location } = req.body;
    await db.query(
      `UPDATE products SET name=?, sku=?, category_id=?, manufacturer_id=?, description=?,
       unit=?, low_stock_threshold=?, price=?, location=? WHERE id=?`,
      [name, sku, category_id || null, manufacturer_id || null, description || null,
       unit || 'units', low_stock_threshold || 10, price || 0, location || null, req.params.id]
    );
    res.json({ success: true, message: 'Product updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/products/:id/stock — update stock level (triggers alerts)
router.patch('/:id/stock', async (req, res) => {
  try {
    const { type, quantity, reason, performed_by } = req.body;
    if (!type || !quantity) return res.status(400).json({ success: false, error: 'type and quantity are required' });
    if (!['IN', 'OUT', 'ADJUSTMENT'].includes(type)) {
      return res.status(400).json({ success: false, error: 'type must be IN, OUT, or ADJUSTMENT' });
    }

    const [rows] = await db.query('SELECT * FROM products WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Product not found' });

    let newQty;
    if (type === 'IN') newQty = rows[0].quantity + parseInt(quantity);
    else if (type === 'OUT') newQty = Math.max(0, rows[0].quantity - parseInt(quantity));
    else newQty = parseInt(quantity); // ADJUSTMENT sets absolute value

    if (newQty < 0) return res.status(400).json({ success: false, error: 'Stock cannot go below 0' });

    await db.query('UPDATE products SET quantity=? WHERE id=?', [newQty, req.params.id]);

    // Log the transaction
    await db.query(
      'INSERT INTO stock_transactions (product_id, type, quantity, reason, performed_by) VALUES (?, ?, ?, ?, ?)',
      [req.params.id, type, quantity, reason || 'Manual update', performed_by || 'Staff']
    );

    // Check and trigger alert
    await checkAndAlert(req.params.id);

    res.json({ success: true, message: 'Stock updated', data: { previous: rows[0].quantity, current: newQty, change: newQty - rows[0].quantity } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id FROM products WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Product not found' });
    await db.query('DELETE FROM products WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
