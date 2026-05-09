-- ============================================================
-- Inventory Management System - Database Schema
-- Run this file in MySQL to set up the database
-- ============================================================

CREATE DATABASE IF NOT EXISTS inventory_db;
USE inventory_db;

-- ---------------------------------------------------------------
-- Table: manufacturers
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS manufacturers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(200) NOT NULL,
  phone VARCHAR(30),
  address TEXT,
  contact_person VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------
-- Table: categories
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------
-- Table: products
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  sku VARCHAR(100) UNIQUE NOT NULL,
  category_id INT,
  manufacturer_id INT,
  description TEXT,
  unit VARCHAR(50) DEFAULT 'units',
  quantity INT NOT NULL DEFAULT 0,
  low_stock_threshold INT NOT NULL DEFAULT 10,
  price DECIMAL(10, 2) DEFAULT 0.00,
  location VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------
-- Table: stock_transactions (audit trail)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  type ENUM('IN', 'OUT', 'ADJUSTMENT') NOT NULL,
  quantity INT NOT NULL,
  reason VARCHAR(255),
  performed_by VARCHAR(100) DEFAULT 'System',
  transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------
-- Table: alerts
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  manufacturer_id INT,
  alert_type ENUM('LOW_STOCK', 'OUT_OF_STOCK') NOT NULL,
  quantity_at_alert INT NOT NULL,
  threshold INT NOT NULL,
  status ENUM('SENT', 'PENDING', 'FAILED') DEFAULT 'PENDING',
  message TEXT,
  email_sent_to VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------
-- Seed Data
-- ---------------------------------------------------------------
INSERT INTO categories (name, description) VALUES
  ('Electronics', 'Electronic components and devices'),
  ('Raw Materials', 'Raw production materials'),
  ('Packaging', 'Packaging and shipping supplies'),
  ('Spare Parts', 'Machine and equipment spare parts'),
  ('Consumables', 'Day-to-day consumable items');

INSERT INTO manufacturers (name, email, phone, address, contact_person) VALUES
  ('TechSupply Co.', 'orders@techsupply.com', '+91-9876543210', '12 Industrial Area, Bengaluru', 'Ravi Sharma'),
  ('RawMat Industries', 'supply@rawmat.in', '+91-9123456780', '45 MIDC, Pune', 'Priya Nair'),
  ('PackagePro Ltd.', 'info@packagepro.com', '+91-9988776655', '78 Export Zone, Chennai', 'Arjun Mehta'),
  ('SpareXpress', 'parts@sparexpress.in', '+91-9876001234', '23 Auto Nagar, Hyderabad', 'Deepa Rao');

INSERT INTO products (name, sku, category_id, manufacturer_id, quantity, low_stock_threshold, price, unit, location) VALUES
  ('Arduino Uno R3', 'ARD-UNO-001', 1, 1, 45, 15, 350.00, 'pieces', 'Shelf A1'),
  ('Resistor Pack 10K', 'RES-10K-100', 1, 1, 8, 20, 50.00, 'packs', 'Shelf A2'),
  ('Copper Wire 1mm', 'COP-1MM-500', 2, 2, 5, 10, 120.00, 'rolls', 'Rack B1'),
  ('Cardboard Box Large', 'BOX-LRG-001', 3, 3, 200, 50, 25.00, 'pieces', 'Store Room'),
  ('Bearing 6205', 'BRG-6205-001', 4, 4, 3, 8, 180.00, 'pieces', 'Shelf C3'),
  ('Safety Gloves (M)', 'GLV-MED-001', 5, 3, 60, 20, 95.00, 'pairs', 'Cabinet D1'),
  ('Soldering Iron 25W', 'SOL-25W-001', 1, 1, 12, 5, 450.00, 'pieces', 'Shelf A3'),
  ('Aluminium Sheet 2mm', 'ALU-2MM-001', 2, 2, 0, 5, 800.00, 'sheets', 'Rack B3'),
  ('Bubble Wrap Roll', 'BWR-001-001', 3, 3, 18, 10, 350.00, 'rolls', 'Store Room'),
  ('Motor Bearing 6004', 'BRG-6004-001', 4, 4, 7, 10, 220.00, 'pieces', 'Shelf C4');
