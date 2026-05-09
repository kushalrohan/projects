// ── API Base ─────────────────────────────────────────────
const API = 'http://localhost:3000/api';

// ── Navigation ───────────────────────────────────────────
const pageMeta = {
  dashboard:     { title: 'Dashboard', sub: 'Overview of warehouse inventory' },
  products:      { title: 'Products', sub: 'All products and stock levels' },
  manufacturers: { title: 'Manufacturers', sub: 'Supplier and manufacturer directory' },
  alerts:        { title: 'Alerts', sub: 'Low stock & out-of-stock notifications' },
  transactions:  { title: 'Transactions', sub: 'Stock movement audit trail' },
};

function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  document.getElementById('page-' + page).classList.add('active');
  document.querySelector(`[data-page="${page}"]`).classList.add('active');

  document.getElementById('page-title').textContent = pageMeta[page].title;
  document.getElementById('page-sub').textContent = pageMeta[page].sub;

  const actionBtn = document.getElementById('main-action-btn');
  if (page === 'products') {
    actionBtn.style.display = '';
    actionBtn.textContent = '+ Add Product';
    actionBtn.onclick = openAddProductModal;
  } else if (page === 'manufacturers') {
    actionBtn.style.display = '';
    actionBtn.textContent = '+ Add Manufacturer';
    actionBtn.onclick = openAddManufacturerModal;
  } else {
    actionBtn.style.display = 'none';
  }

  if (page === 'dashboard') loadDashboard();
  if (page === 'products') loadProducts();
  if (page === 'manufacturers') loadManufacturers();
  if (page === 'alerts') loadAlerts();
  if (page === 'transactions') loadTransactions();
}

// ── Toast ─────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show ${type}`;
  setTimeout(() => { t.className = 'toast'; }, 3200);
}

// ── API Helper ────────────────────────────────────────────
async function api(method, path, body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'API error');
  return data;
}

// ── Dashboard ─────────────────────────────────────────────
async function loadDashboard() {
  try {
    const { data: stats } = await api('GET', '/products/stats');
    document.getElementById('stat-total').textContent = stats.total_products;
    document.getElementById('stat-stock').textContent = stats.total_stock;
    document.getElementById('stat-low').textContent = stats.low_stock;
    document.getElementById('stat-out').textContent = stats.out_of_stock;
    updateAlertBadge(parseInt(stats.low_stock) + parseInt(stats.out_of_stock));
  } catch (e) { console.error(e); }

  // Recent alerts
  try {
    const { data: alerts } = await api('GET', '/alerts/recent');
    const el = document.getElementById('dashboard-alerts');
    if (!alerts.length) {
      el.innerHTML = '<div class="empty">No alerts. All stock levels healthy ✓</div>'; return;
    }
    el.innerHTML = alerts.map(a => `
      <div class="alert-item">
        <div class="alert-item-left">
          <div class="alert-product">${a.product_name}</div>
          <div class="alert-sku">${a.sku}</div>
          <div class="alert-mfr">→ ${a.manufacturer_name || 'No manufacturer'}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <span class="pill ${a.alert_type === 'OUT_OF_STOCK' ? 'pill-out' : 'pill-low'}">
            ${a.alert_type === 'OUT_OF_STOCK' ? '🚨 OUT' : '⚠ LOW'}
          </span>
          <div style="font-size:10px;color:var(--text3);margin-top:4px;font-family:var(--mono)">
            ${fmtDate(a.created_at)}
          </div>
        </div>
      </div>`).join('');
  } catch (e) { console.error(e); }

  // Low stock products
  try {
    const { data: products } = await api('GET', '/products?status=low');
    const outProducts = await api('GET', '/products?status=out');
    const combined = [...(outProducts.data || []), ...(products.data || [])].slice(0, 8);
    const el = document.getElementById('dashboard-low-stock');
    if (!combined.length) {
      el.innerHTML = '<div class="empty">All products have adequate stock ✓</div>'; return;
    }
    el.innerHTML = combined.map(p => {
      const cls = p.quantity === 0 ? 'out' : 'low';
      return `
        <div class="alert-item">
          <div class="alert-item-left">
            <div class="alert-product">${p.name}</div>
            <div class="alert-sku">${p.sku} · ${p.location || 'No location'}</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div class="qty ${cls}">${p.quantity}</div>
            <div style="font-size:10px;color:var(--text3);margin-top:2px">/ ${p.low_stock_threshold} min</div>
          </div>
        </div>`;
    }).join('');
  } catch (e) { console.error(e); }
}

function updateAlertBadge(n) {
  const badge = document.getElementById('alert-badge');
  badge.textContent = n;
  badge.classList.toggle('show', n > 0);
}

// ── Products ──────────────────────────────────────────────
let searchTimer;
function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadProducts, 350);
}

async function loadProducts() {
  const search = document.getElementById('search-input').value;
  const category = document.getElementById('filter-category').value;
  const status = document.getElementById('filter-status').value;
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (category) params.set('category', category);
  if (status) params.set('status', status);

  const tbody = document.getElementById('products-tbody');
  tbody.innerHTML = '<tr><td colspan="8" class="loading">Loading...</td></tr>';

  try {
    const { data } = await api('GET', `/products?${params}`);
    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty">No products found</td></tr>'; return;
    }
    tbody.innerHTML = data.map(p => {
      let statusCls, statusLabel;
      if (p.quantity === 0) { statusCls = 'pill-out'; statusLabel = '🚨 Out of Stock'; }
      else if (p.quantity <= p.low_stock_threshold) { statusCls = 'pill-low'; statusLabel = '⚠ Low Stock'; }
      else { statusCls = 'pill-ok'; statusLabel = '✓ Healthy'; }
      const qtyCls = p.quantity === 0 ? 'out' : p.quantity <= p.low_stock_threshold ? 'low' : 'ok';
      return `<tr>
        <td>
          <div class="product-name">${p.name}</div>
          <div class="product-sku">${p.sku}</div>
        </td>
        <td>${p.category_name || '—'}</td>
        <td><span class="qty ${qtyCls}">${p.quantity}</span> <span style="font-size:11px;color:var(--text3)">${p.unit}</span></td>
        <td style="color:var(--text3);font-family:var(--mono)">${p.low_stock_threshold}</td>
        <td><span class="pill ${statusCls}">${statusLabel}</span></td>
        <td>${p.manufacturer_name || '—'}</td>
        <td style="color:var(--text3);font-size:12px">${p.location || '—'}</td>
        <td>
          <div class="action-btns">
            <button class="btn-xs" onclick="openStockModal(${p.id}, '${p.name.replace(/'/g, "\\'")}')">Stock</button>
            <button class="btn-xs" onclick="openEditProductModal(${p.id})">Edit</button>
            <button class="btn-xs danger" onclick="deleteProduct(${p.id}, '${p.name.replace(/'/g, "\\'")}')">Del</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  } catch (e) { toast('Failed to load products: ' + e.message, 'error'); }
}

// ── Manufacturers ─────────────────────────────────────────
async function loadManufacturers() {
  const tbody = document.getElementById('manufacturers-tbody');
  try {
    const { data } = await api('GET', '/manufacturers');
    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty">No manufacturers found</td></tr>'; return;
    }
    tbody.innerHTML = data.map(m => `<tr>
      <td><strong>${m.name}</strong></td>
      <td>${m.contact_person || '—'}</td>
      <td style="color:var(--info)">${m.email}</td>
      <td style="font-family:var(--mono);font-size:12px">${m.phone || '—'}</td>
      <td style="font-family:var(--mono)">${m.product_count}</td>
      <td>
        <div class="action-btns">
          <button class="btn-xs" onclick="openEditManufacturerModal(${m.id})">Edit</button>
          <button class="btn-xs danger" onclick="deleteManufacturer(${m.id}, '${m.name.replace(/'/g, "\\'")}')">Del</button>
        </div>
      </td>
    </tr>`).join('');
  } catch (e) { toast('Failed to load manufacturers', 'error'); }
}

// ── Alerts ────────────────────────────────────────────────
async function loadAlerts() {
  const tbody = document.getElementById('alerts-tbody');
  try {
    const { data } = await api('GET', '/alerts');
    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty">No alerts recorded yet</td></tr>'; return;
    }
    tbody.innerHTML = data.map(a => `<tr>
      <td style="font-family:var(--mono);font-size:11px;color:var(--text3)">${fmtDate(a.created_at)}</td>
      <td>
        <div class="product-name">${a.product_name}</div>
        <div class="product-sku">${a.sku}</div>
      </td>
      <td><span class="pill ${a.alert_type === 'OUT_OF_STOCK' ? 'pill-out' : 'pill-low'}">${a.alert_type}</span></td>
      <td style="font-family:var(--mono);color:${a.quantity_at_alert === 0 ? 'var(--danger)' : 'var(--warn)'}">${a.quantity_at_alert}</td>
      <td style="font-family:var(--mono);color:var(--text3)">${a.threshold}</td>
      <td>${a.manufacturer_name || '—'}</td>
      <td style="font-size:12px;color:var(--text2)">${a.email_sent_to || '—'}</td>
      <td><span class="pill pill-${a.status.toLowerCase()}">${a.status}</span></td>
    </tr>`).join('');
  } catch (e) { toast('Failed to load alerts', 'error'); }
}

// ── Transactions ──────────────────────────────────────────
async function loadTransactions() {
  const tbody = document.getElementById('transactions-tbody');
  try {
    const { data } = await api('GET', '/alerts/transactions');
    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty">No transactions recorded yet</td></tr>'; return;
    }
    tbody.innerHTML = data.map(t => {
      const cls = t.type === 'IN' ? 'pill-in' : t.type === 'OUT' ? 'pill-out-t' : 'pill-adj';
      return `<tr>
        <td style="font-family:var(--mono);font-size:11px;color:var(--text3)">${fmtDate(t.transaction_date)}</td>
        <td class="product-name">${t.product_name}</td>
        <td class="product-sku">${t.sku}</td>
        <td><span class="pill ${cls}">${t.type}</span></td>
        <td style="font-family:var(--mono);font-weight:700">${t.quantity}</td>
        <td style="color:var(--text2)">${t.reason || '—'}</td>
        <td style="color:var(--text3)">${t.performed_by || '—'}</td>
      </tr>`;
    }).join('');
  } catch (e) { toast('Failed to load transactions', 'error'); }
}

// ── Modals — Products ─────────────────────────────────────
async function populateDropdowns() {
  const [{ data: cats }, { data: mfrs }] = await Promise.all([
    api('GET', '/categories'),
    api('GET', '/manufacturers')
  ]);

  // Category dropdowns
  ['filter-category', 'prd-category'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const isFilter = id === 'filter-category';
    if (!isFilter) el.innerHTML = '<option value="">Select category...</option>';
    cats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id; opt.textContent = c.name;
      el.appendChild(opt);
    });
  });

  // Manufacturer dropdown in product form
  const mEl = document.getElementById('prd-manufacturer');
  mEl.innerHTML = '<option value="">Select manufacturer...</option>';
  mfrs.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id; opt.textContent = m.name;
    mEl.appendChild(opt);
  });
}

function openAddProductModal() {
  document.getElementById('modal-product-title').textContent = 'Add New Product';
  document.getElementById('product-id').value = '';
  document.getElementById('product-form').reset();
  document.getElementById('prd-threshold').value = 10;
  document.getElementById('prd-unit').value = 'pieces';
  openModal('product-modal');
  populateDropdowns();
}

async function openEditProductModal(id) {
  try {
    const { data: p } = await api('GET', `/products/${id}`);
    document.getElementById('modal-product-title').textContent = 'Edit Product';
    document.getElementById('product-id').value = p.id;
    document.getElementById('prd-name').value = p.name;
    document.getElementById('prd-sku').value = p.sku;
    document.getElementById('prd-quantity').value = p.quantity;
    document.getElementById('prd-threshold').value = p.low_stock_threshold;
    document.getElementById('prd-price').value = p.price;
    document.getElementById('prd-unit').value = p.unit;
    document.getElementById('prd-location').value = p.location || '';
    document.getElementById('prd-desc').value = p.description || '';
    openModal('product-modal');
    await populateDropdowns();
    document.getElementById('prd-category').value = p.category_id || '';
    document.getElementById('prd-manufacturer').value = p.manufacturer_id || '';
  } catch (e) { toast('Failed to load product', 'error'); }
}

async function saveProduct(e) {
  e.preventDefault();
  const id = document.getElementById('product-id').value;
  const body = {
    name: document.getElementById('prd-name').value,
    sku: document.getElementById('prd-sku').value,
    category_id: document.getElementById('prd-category').value || null,
    manufacturer_id: document.getElementById('prd-manufacturer').value || null,
    description: document.getElementById('prd-desc').value,
    unit: document.getElementById('prd-unit').value,
    quantity: parseInt(document.getElementById('prd-quantity').value) || 0,
    low_stock_threshold: parseInt(document.getElementById('prd-threshold').value) || 10,
    price: parseFloat(document.getElementById('prd-price').value) || 0,
    location: document.getElementById('prd-location').value
  };
  try {
    if (id) {
      await api('PUT', `/products/${id}`, body);
      toast('Product updated successfully', 'success');
    } else {
      await api('POST', '/products', body);
      toast('Product created! Stock alert checked.', 'success');
    }
    closeModal('product-modal');
    loadProducts();
    loadDashboard();
  } catch (e) { toast('Error: ' + e.message, 'error'); }
}

async function deleteProduct(id, name) {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  try {
    await api('DELETE', `/products/${id}`);
    toast('Product deleted', 'warn');
    loadProducts();
    loadDashboard();
  } catch (e) { toast('Delete failed: ' + e.message, 'error'); }
}

// ── Stock Modal ───────────────────────────────────────────
function openStockModal(id, name) {
  document.getElementById('stock-product-id').value = id;
  document.getElementById('stock-modal-name').textContent = name;
  document.getElementById('stock-qty').value = '';
  document.getElementById('stock-reason').value = '';
  document.getElementById('stock-by').value = 'Staff';
  document.getElementById('stock-type').value = 'IN';
  openModal('stock-modal');
}

async function saveStock(e) {
  e.preventDefault();
  const id = document.getElementById('stock-product-id').value;
  const body = {
    type: document.getElementById('stock-type').value,
    quantity: parseInt(document.getElementById('stock-qty').value),
    reason: document.getElementById('stock-reason').value,
    performed_by: document.getElementById('stock-by').value
  };
  try {
    const { data } = await api('PATCH', `/products/${id}/stock`, body);
    toast(`Stock updated: ${data.previous} → ${data.current}`, 'success');
    closeModal('stock-modal');
    loadProducts();
    loadDashboard();
  } catch (e) { toast('Stock update failed: ' + e.message, 'error'); }
}

// ── Manufacturers Modal ───────────────────────────────────
function openAddManufacturerModal() {
  document.getElementById('mfr-modal-title').textContent = 'Add Manufacturer';
  document.getElementById('mfr-id').value = '';
  ['mfr-name','mfr-email','mfr-contact','mfr-phone','mfr-address'].forEach(id => {
    document.getElementById(id).value = '';
  });
  openModal('manufacturer-modal');
}

async function openEditManufacturerModal(id) {
  try {
    const { data: m } = await api('GET', `/manufacturers/${id}`);
    document.getElementById('mfr-modal-title').textContent = 'Edit Manufacturer';
    document.getElementById('mfr-id').value = m.id;
    document.getElementById('mfr-name').value = m.name;
    document.getElementById('mfr-email').value = m.email;
    document.getElementById('mfr-contact').value = m.contact_person || '';
    document.getElementById('mfr-phone').value = m.phone || '';
    document.getElementById('mfr-address').value = m.address || '';
    openModal('manufacturer-modal');
  } catch (e) { toast('Failed to load manufacturer', 'error'); }
}

async function saveManufacturer(e) {
  e.preventDefault();
  const id = document.getElementById('mfr-id').value;
  const body = {
    name: document.getElementById('mfr-name').value,
    email: document.getElementById('mfr-email').value,
    contact_person: document.getElementById('mfr-contact').value,
    phone: document.getElementById('mfr-phone').value,
    address: document.getElementById('mfr-address').value
  };
  try {
    if (id) {
      await api('PUT', `/manufacturers/${id}`, body);
      toast('Manufacturer updated', 'success');
    } else {
      await api('POST', '/manufacturers', body);
      toast('Manufacturer added', 'success');
    }
    closeModal('manufacturer-modal');
    loadManufacturers();
  } catch (e) { toast('Error: ' + e.message, 'error'); }
}

async function deleteManufacturer(id, name) {
  if (!confirm(`Delete manufacturer "${name}"?`)) return;
  try {
    await api('DELETE', `/manufacturers/${id}`);
    toast('Manufacturer deleted', 'warn');
    loadManufacturers();
  } catch (e) { toast('Delete failed: ' + e.message, 'error'); }
}

// ── Modal helpers ─────────────────────────────────────────
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// ── Date formatter ────────────────────────────────────────
function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  });
}

// ── Init ──────────────────────────────────────────────────
populateDropdowns();
loadDashboard();
