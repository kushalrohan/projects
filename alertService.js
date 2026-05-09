const db = require('../config/db');
const { sendLowStockAlert } = require('../config/mailer');

/**
 * Checks a product's stock level and creates/sends alerts if below threshold.
 * Call this after any stock update.
 */
async function checkAndAlert(productId) {
  try {
    const [rows] = await db.query(
      `SELECT p.*, m.name AS mfr_name, m.email AS mfr_email,
              m.phone AS mfr_phone, m.contact_person AS mfr_contact
       FROM products p
       LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
       WHERE p.id = ?`,
      [productId]
    );

    if (!rows.length) return;
    const product = rows[0];

    let alertType = null;
    if (product.quantity === 0) alertType = 'OUT_OF_STOCK';
    else if (product.quantity <= product.low_stock_threshold) alertType = 'LOW_STOCK';

    if (!alertType) return; // Stock is fine

    const manufacturer = {
      id: product.manufacturer_id,
      name: product.mfr_name,
      email: product.mfr_email,
      phone: product.mfr_phone,
      contact_person: product.mfr_contact
    };

    // Log alert in database
    await db.query(
      `INSERT INTO alerts (product_id, manufacturer_id, alert_type, quantity_at_alert, threshold, status, message, email_sent_to)
       VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
      [
        product.id,
        product.manufacturer_id,
        alertType,
        product.quantity,
        product.low_stock_threshold,
        `${alertType} for ${product.name} (SKU: ${product.sku}). Current: ${product.quantity}, Threshold: ${product.low_stock_threshold}`,
        manufacturer.email || null
      ]
    );

    const [alertRows] = await db.query('SELECT LAST_INSERT_ID() as id');
    const alertId = alertRows[0].id;

    // Send email if manufacturer has email
    if (manufacturer.email) {
      try {
        await sendLowStockAlert({ product, manufacturer, alertType });
        await db.query("UPDATE alerts SET status='SENT' WHERE id=?", [alertId]);
        console.log(`📧 Alert email sent to ${manufacturer.email} for product: ${product.name}`);
      } catch (emailErr) {
        await db.query("UPDATE alerts SET status='FAILED' WHERE id=?", [alertId]);
        console.error(`❌ Failed to send email alert:`, emailErr.message);
      }
    } else {
      await db.query("UPDATE alerts SET status='SENT' WHERE id=?", [alertId]);
    }

  } catch (err) {
    console.error('Alert check error:', err.message);
  }
}

module.exports = { checkAndAlert };
