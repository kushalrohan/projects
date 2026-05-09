const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Sends a low-stock alert email to the manufacturer
 */
async function sendLowStockAlert({ product, manufacturer, alertType }) {
  const subject = alertType === 'OUT_OF_STOCK'
    ? `🚨 OUT OF STOCK: ${product.name} [SKU: ${product.sku}]`
    : `⚠️ LOW STOCK ALERT: ${product.name} [SKU: ${product.sku}]`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
      <div style="background: ${alertType === 'OUT_OF_STOCK' ? '#c0392b' : '#e67e22'}; padding: 24px; color: white;">
        <h2 style="margin: 0; font-size: 22px;">
          ${alertType === 'OUT_OF_STOCK' ? '🚨 OUT OF STOCK' : '⚠️ LOW STOCK ALERT'}
        </h2>
        <p style="margin: 8px 0 0; opacity: 0.9;">Warehouse Inventory Management System</p>
      </div>

      <div style="padding: 24px;">
        <p>Dear <strong>${manufacturer.contact_person || manufacturer.name}</strong>,</p>
        <p>This is an automated alert from your warehouse management system. The following product requires immediate attention:</p>

        <table style="width: 100%; border-collapse: collapse; margin: 16px 0; border-radius: 6px; overflow: hidden;">
          <tr style="background: #f8f9fa;">
            <td style="padding: 12px; font-weight: bold; color: #555; width: 40%;">Product Name</td>
            <td style="padding: 12px; font-weight: bold; color: #222;">${product.name}</td>
          </tr>
          <tr>
            <td style="padding: 12px; font-weight: bold; color: #555;">SKU</td>
            <td style="padding: 12px; color: #222;">${product.sku}</td>
          </tr>
          <tr style="background: #f8f9fa;">
            <td style="padding: 12px; font-weight: bold; color: #555;">Current Stock</td>
            <td style="padding: 12px; color: ${alertType === 'OUT_OF_STOCK' ? '#c0392b' : '#e67e22'}; font-weight: bold; font-size: 18px;">
              ${product.quantity} ${product.unit || 'units'}
            </td>
          </tr>
          <tr>
            <td style="padding: 12px; font-weight: bold; color: #555;">Minimum Threshold</td>
            <td style="padding: 12px; color: #222;">${product.low_stock_threshold} ${product.unit || 'units'}</td>
          </tr>
          <tr style="background: #f8f9fa;">
            <td style="padding: 12px; font-weight: bold; color: #555;">Warehouse Location</td>
            <td style="padding: 12px; color: #222;">${product.location || 'N/A'}</td>
          </tr>
        </table>

        <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 16px; margin: 16px 0;">
          <strong>Action Required:</strong> Please arrange for immediate replenishment of this product to avoid production disruption.
        </div>

        <p style="color: #777; font-size: 13px;">This is an automated message from the Warehouse Inventory Management System. Please do not reply to this email.</p>
      </div>

      <div style="background: #f8f9fa; padding: 16px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee;">
        © Warehouse Inventory Management System · Alert generated at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
      </div>
    </div>
  `;

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'Warehouse Alerts <noreply@warehouse.com>',
    to: manufacturer.email,
    subject,
    html
  });

  return info;
}

module.exports = { sendLowStockAlert };
