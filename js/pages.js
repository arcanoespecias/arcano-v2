// ===================== PAGES MODULE =====================
// All page renderers: Dashboard, Compras, Productos, Blends, Ventas, Tienda, Usuarios, Ajustes.

// =====================================================
//  STOREFRONT (Public)
// =====================================================
var storeCategory = 'todos';

function renderStorefront() {
  renderStoreProducts();
  setupStoreNav();
  updateCartUI();
}

function setupStoreNav() {
  document.querySelectorAll('#store-nav .store-nav-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('#store-nav .store-nav-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      storeCategory = btn.getAttribute('data-cat');
      renderStoreProducts();
    });
  });
}

function renderStoreProducts() {
  var db = getDB();
  var products = [];
  var container = document.getElementById('store-products');
  var empty = document.getElementById('store-empty');

  // Get sellable especias (with precioVenta > 0 and stock > 0)
  var especias = (db.productos || []).filter(function(p) {
    return p.tipo === 'especia' && p.precioVenta > 0 && p.stock > 0;
  });
  especias.forEach(function(p) {
    // Filter by storeCategory
    if (storeCategory !== 'todos' && storeCategory !== 'blends') {
      if ((p.categoria || '') !== storeCategory) return;
    }
    products.push({
      id: p.id, nombre: p.nombre, tipo: p.categoria || 'Especia',
      desc: (p.usoPrincipal || p.notas || ''), precio: p.precioVenta,
      stock: p.stock, unidad: p.unidad, blend: false,
      origen: p.origen || '', perfil: p.perfil || ''
    });
  });

  // Get blends with stock > 0 (only when "todos" or "blends" selected)
  if (storeCategory === 'todos' || storeCategory === 'blends') {
    var blends = (db.blends || []).filter(function(b) {
      return b.stock > 0 && b.precioVenta > 0;
    });
    blends.forEach(function(b) {
      // Calculate effective stock (min of blend, frascos, etiqueta)
      var etiq = b.etiquetaId ? (db.productos || []).find(function(p) { return p.id === b.etiquetaId; }) : null;
      var etiqStk = etiq ? etiq.stock : 0;
      var frascosStk = (db.productos || []).filter(function(p) { return p.tipo === 'frasco'; });
      var maxFrasco = frascosStk.length > 0 ? Math.max.apply(null, frascosStk.map(function(f) { return f.stock; })) : 0;
      var stockEfectivo = Math.min(b.stock || 0, maxFrasco, etiqStk);
      if (stockEfectivo <= 0) return; // Don't show if can't fulfill

      products.push({
        id: b.id, nombre: b.nombre + ' (' + (b.formato || 'polvo') + ')', tipo: 'Blend',
        desc: b.descripcion || '', precio: b.precioVenta,
        stock: stockEfectivo, unidad: 'unidad', blend: true,
        origen: '', perfil: ''
      });
    });
  }

  if (products.length === 0) {
    container.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  var html = '';
  products.forEach(function(p) {
    html += '<div class="product-card">' +
      '<div class="product-card-type">' + esc(p.tipo) + (p.origen ? ' &mdash; ' + esc(p.origen) : '') + '</div>' +
      '<div class="product-card-name">' + esc(p.nombre) + '</div>' +
      (p.perfil ? '<div class="product-card-meta">' + esc(p.perfil) + '</div>' : '') +
      (p.desc ? '<div class="product-card-desc">' + esc(p.desc) + '</div>' : '<div class="product-card-desc" style="opacity:.3">Sin descripción</div>') +
      '<div class="product-card-footer">' +
        '<div><div class="product-card-price">' + fmt(p.precio) + '</div>' +
        '<div class="product-card-stock">' + p.stock + ' ' + esc(p.unidad) + ' disponibles</div></div>' +
        '<button class="btn-add-cart" onclick="addToCart(' + (p.blend ? 'true' : 'false') + ',' + p.id + ',\'' + esc(p.nombre).replace(/'/g,"\\'") + '\',' + p.precio + ',\'' + esc(p.unidad) + '\',' + p.stock + ')">+ Agregar</button>' +
      '</div></div>';
  });
  container.innerHTML = html;
}

function addToCart(isBlend, id, nombre, precio, unidad, stock) {
  if (isBlend) {
    mostrarSelectorFrasco(id, 'carrito', nombre, precio, stock);
    return;
  }
  var existing = cart.find(function(c) { return c.isBlend === isBlend && c.id === id; });
  if (existing) {
    if (existing.qty >= stock) { toast('No hay más stock disponible', 'err'); return; }
    existing.qty++;
  } else {
    cart.push({ isBlend: isBlend, id: id, nombre: nombre, precio: precio, unidad: unidad, qty: 1, maxStock: stock });
  }
  updateCartUI();
  toast(nombre + ' agregado al carrito');
}

// Reusable frasco selector for blends
function mostrarSelectorFrasco(blendId, contexto, nombre, precio, stock) {
  var db = getDB();
  var blend = db.blends.find(function(b) { return b.id === blendId; });
  if (!blend) return;
  nombre = nombre || blend.nombre;
  precio = precio || blend.precioVenta;
  stock = stock || blend.stock;

  var frascos = (db.productos || []).filter(function(p) { return p.tipo === 'frasco' && p.stock > 0; });
  if (frascos.length === 0) {
    toast('No hay frascos disponibles en stock', 'err');
    return;
  }

  var etiqueta = blend.etiquetaId ? db.productos.find(function(p) { return p.id === blend.etiquetaId; }) : null;
  var etiquetaStock = etiqueta ? etiqueta.stock : 9999;

  var html = '<p class="text-sm text-muted mb-12">Elegí el frasco para <strong class="text-gold">' + esc(nombre) + '</strong> (' + esc(blend.formato || 'polvo') + ')</p>';
  html += '<div class="card mb-16">';
  frascos.forEach(function(f) {
    var disponible = Math.min(stock, f.stock, etiquetaStock);
    var disabled = disponible <= 0 ? ' style="opacity:.4;pointer-events:none"' : '';
    html += '<div class="mov-row" style="cursor:pointer"' + disabled + ' onclick="confirmarFrasco(' + blendId + ',' + f.id + ',\'' + contexto + '\',' + precio + ',' + stock + ')">' +
      '<div><span class="fw7">' + esc(f.nombre) + '</span>' +
      '<div class="text-xs text-muted">Frasco: ' + f.stock + ' | Etiqueta: ' + etiquetaStock + '</div></div>' +
      '<span class="text-gold fw7">' + fmt(precio) + '</span></div>';
  });
  html += '</div>';
  html += '<button class="btn btn-ghost btn-full" onclick="closeModal()">Cancelar</button>';
  openModal('Elegir Frasco', html);
}

function confirmarFrasco(blendId, frascoId, contexto, precio, stock) {
  var db = getDB();
  var blend = db.blends.find(function(b) { return b.id === blendId; });
  var frasco = db.productos.find(function(p) { return p.id === frascoId; });
  var etiqueta = blend && blend.etiquetaId ? db.productos.find(function(p) { return p.id === blend.etiquetaId; }) : null;
  if (!blend || !frasco) return;

  var etiquetaStock = etiqueta ? etiqueta.stock : 9999;
  var disponible = Math.min(blend.stock, frasco.stock, etiquetaStock);
  if (disponible <= 0) { toast('Sin stock disponible', 'err'); return; }

  var nombre = blend.nombre + ' (' + frasco.nombre + ')';

  if (contexto === 'carrito') {
    // Check if same blend+frasco already in cart
    var existing = cart.find(function(c) { return c.isBlend && c.id === blendId && c.frascoId === frascoId; });
    if (existing) {
      if (existing.qty >= disponible) { toast('Stock máximo alcanzado', 'err'); return; }
      existing.qty++;
    } else {
      cart.push({ isBlend: true, id: blendId, nombre: nombre, precio: precio, unidad: 'unidad', qty: 1, maxStock: disponible, frascoId: frascoId, frascoNombre: frasco.nombre, etiquetaId: blend.etiquetaId || 0 });
    }
    closeModal();
    updateCartUI();
    toast(nombre + ' agregado al carrito');
  } else if (contexto === 'venta') {
    agregarBlendAVenta(blendId, frascoId, nombre, precio, disponible);
    closeModal();
  }
}

function updateCartUI() {
  var countEl = document.getElementById('cart-count');
  var total = 0;
  var count = 0;
  cart.forEach(function(c) { total += c.precio * c.qty; count += c.qty; });

  if (count > 0) {
    countEl.style.display = 'flex';
    countEl.textContent = count;
  } else {
    countEl.style.display = 'none';
  }

  var itemsEl = document.getElementById('cart-items');
  var footerEl = document.getElementById('cart-footer');

  if (cart.length === 0) {
    itemsEl.innerHTML = '<div class="cart-empty">Tu carrito está vacío</div>';
    footerEl.style.display = 'none';
    return;
  }

  footerEl.style.display = 'block';
  document.getElementById('cart-total-val').textContent = fmt(total);

  var html = '';
  cart.forEach(function(c, i) {
    html += '<div class="cart-item">' +
      '<div class="cart-item-info"><div class="cart-item-name">' + esc(c.nombre) + '</div>' +
      '<div class="cart-item-price">' + fmt(c.precio) + ' / ' + esc(c.unidad) + '</div></div>' +
      '<div class="cart-item-qty">' +
        '<button onclick="cartQty(' + i + ',-1)">-</button>' +
        '<span>' + c.qty + '</span>' +
        '<button onclick="cartQty(' + i + ',1)">+</button>' +
      '</div></div>';
  });
  itemsEl.innerHTML = html;
}

function cartQty(idx, delta) {
  if (!cart[idx]) return;
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  else if (cart[idx].qty > cart[idx].maxStock) { cart[idx].qty = cart[idx].maxStock; toast('Stock máximo alcanzado', 'err'); }
  updateCartUI();
}

function toggleCart() {
  document.getElementById('cart-overlay').classList.toggle('open');
  document.getElementById('cart-drawer').classList.toggle('open');
}

function showCheckout() {
  if (cart.length === 0) return;

  var total = 0;
  cart.forEach(function(c) { total += c.precio * c.qty; });

  var itemsHtml = '';
  cart.forEach(function(c) {
    itemsHtml += '<div class="mov-row"><span>' + esc(c.nombre) + ' x' + c.qty + '</span><span class="text-gold">' + fmt(c.precio * c.qty) + '</span></div>';
  });

  var body = itemsHtml +
    '<hr class="divider">' +
    '<div class="cost-row total"><span>Total</span><span>' + fmt(total) + '</span></div>' +
    '<hr class="divider">' +
    '<div class="fr">' +
      '<div><label>Nombre</label><input id="chk-nombre" placeholder="Tu nombre" required></div>' +
      '<div><label>Teléfono</label><input id="chk-tel" placeholder="300 123 4567"></div>' +
    '</div>' +
    '<div class="fr1" style="display:grid;gap:12px;margin-bottom:12px">' +
      '<div><label>Dirección de envío</label><textarea id="chk-dir" placeholder="Dirección de entrega" rows="2"></textarea></div>' +
      '<div><label>Notas</label><input id="chk-notas" placeholder="Instrucciones especiales"></div>' +
    '</div>' +
    '<div id="checkout-alert" class="alert alert-err"></div>' +
    '<button class="btn btn-gold btn-full" onclick="submitOrder()">Confirmar Pedido</button>';

  openModal('Finalizar Compra', body);
  toggleCart();
}

function submitOrder() {
  var nombre = document.getElementById('chk-nombre').value.trim();
  var tel = document.getElementById('chk-tel').value.trim();
  var dir = document.getElementById('chk-dir').value.trim();
  var notas = document.getElementById('chk-notas').value.trim();
  var alertEl = document.getElementById('checkout-alert');

  if (!nombre) {
    alertEl.textContent = 'Ingresa tu nombre';
    alertEl.className = 'alert alert-err show';
    return;
  }

  var db = getDB();
  var items = [];
  var total = 0;

  cart.forEach(function(c) {
    var sub = c.precio * c.qty;
    total += sub;
    var item = {
      tipo: c.isBlend ? 'blend' : 'especia',
      id: c.id,
      nombre: c.nombre,
      cantidad: c.qty,
      unidad: c.unidad,
      precioUnitario: c.precio,
      subtotal: sub
    };
    if (c.isBlend && c.frascoId) {
      item.frascoId = c.frascoId;
      item.frascoNombre = c.frascoNombre || '';
      item.etiquetaId = c.etiquetaId || 0;
    }
    items.push(item);
  });

  var venta = {
    id: nextId(),
    fecha: new Date().toISOString(),
    clienteNombre: nombre,
    clienteTelefono: tel,
    clienteDireccion: dir,
    items: items,
    total: total,
    estado: 'pendiente',
    tipo: 'tienda', // marks as storefront order
    creadoPor: null,
    creadoEn: new Date().toISOString()
  };

  db.ventas.push(venta);

  // Update stock
  items.forEach(function(it) {
    if (it.tipo === 'especia') {
      var prod = db.productos.find(function(p) { return p.id === it.id; });
      if (prod) {
        prod.stock = Math.max(0, prod.stock - it.cantidad);
        prod.actualizadoEn = new Date().toISOString();
        addMovimiento('venta', 'ventas', venta.id, it.nombre, -it.cantidad, 'Pedido de tienda');
      }
    } else if (it.tipo === 'blend') {
      var blend = db.blends.find(function(b) { return b.id === it.id; });
      if (blend) {
        blend.stock = Math.max(0, blend.stock - it.cantidad);
        blend.actualizadoEn = new Date().toISOString();
        addMovimiento('venta', 'ventas', venta.id, it.nombre, -it.cantidad, 'Pedido de tienda');
      }
      // Deduct frasco stock
      if (it.frascoId) {
        var frasco = db.productos.find(function(p) { return p.id === it.frascoId; });
        if (frasco) {
          frasco.stock = Math.max(0, frasco.stock - it.cantidad);
          frasco.actualizadoEn = new Date().toISOString();
          addMovimiento('venta', 'ventas', venta.id, it.frascoNombre || 'Frasco', -it.cantidad, 'Frasco para ' + it.nombre);
        }
      }
      // Deduct etiqueta stock
      if (it.etiquetaId) {
        var etiqueta = db.productos.find(function(p) { return p.id === it.etiquetaId; });
        if (etiqueta) {
          etiqueta.stock = Math.max(0, etiqueta.stock - it.cantidad);
          etiqueta.actualizadoEn = new Date().toISOString();
          addMovimiento('venta', 'ventas', venta.id, etiqueta.nombre || 'Etiqueta', -it.cantidad, 'Etiqueta para ' + it.nombre);
        }
      }
    }
  });

  saveDB();
  cart = [];
  closeModal();
  renderStoreProducts();
  updateCartUI();
  toast('Pedido realizado con éxito');
}

// =====================================================
//  DASHBOARD
// =====================================================
function renderDashboard() {
  if (!currentUser || currentUser.rol !== 'admin') return;
  var db = getDB();
  var el = document.getElementById('page-dashboard');
  var productos = db.productos || [];
  var compras = db.compras || [];
  var blends = db.blends || [];
  var ventas = db.ventas || [];
  var movimientos = db.movimientos || [];

  // Stats
  var especias = productos.filter(function(p) { return p.tipo === 'especia'; });
  var totalVentas = ventas.filter(function(v) { return v.estado !== 'cancelada'; }).reduce(function(s, v) { return s + (v.total || 0); }, 0);
  var totalCompras = compras.filter(function(c) { return c.estado === 'recibida'; }).reduce(function(s, c) { return s + (c.total || 0); }, 0);
  var ventasPendientes = ventas.filter(function(v) { return v.estado === 'pendiente'; }).length;
  var frascos = productos.filter(function(p) { return p.tipo === 'frasco'; });
  var etiquetas = productos.filter(function(p) { return p.tipo === 'etiqueta'; });
  var lowStock = productos.filter(function(p) { return p.stock <= (p.stockMin || 0) && p.tipo !== 'especia'; });
  var lowStockEspecias = especias.filter(function(p) { return p.stock <= p.stockMin; });
  if (lowStockEspecias.length > 0) lowStock = lowStockEspecias.concat(lowStock);

  var html = '<h1 class="page-title">Dashboard</h1>';

  // KPI cards
  html += '<div class="g4 mb-20">';
  html += statCard('Ventas Totales', fmt(totalVentas), ventas.length + ' transacciones');
  html += statCard('Compras', fmt(totalCompras), compras.length + ' órdenes');
  html += statCard('Productos', especias.length + ' especias', productos.length + ' total items');
  html += statCard('Blends', blends.length + ' mezclas', 'Activos');
  html += '</div>';

  // Alerts
  if (lowStock.length > 0 || ventasPendientes > 0) {
    html += '<div class="section-title mb-12">Alertas</div>';
    if (ventasPendientes > 0) {
      html += '<div class="card mb-12" style="border-color:var(--yellow)">' +
        '<div class="flex items-center gap-8"><span style="font-size:1.2rem">\u26A0</span>' +
        '<div><div class="fw7 text-gold">' + ventasPendientes + ' ventas pendientes</div>' +
        '<div class="text-xs text-muted">Requieren atención</div></div>' +
        '<button class="btn btn-gold btn-sm" style="margin-left:auto" onclick="navigateTo(\'ventas\')">Ver Ventas</button></div></div>';
    }
    if (lowStock.length > 0) {
      html += '<div class="card mb-20" style="border-color:var(--red)">' +
        '<div class="flex items-center gap-8"><span style="font-size:1.2rem">\u26A0</span>' +
        '<div><div class="fw7 text-red">' + lowStock.length + ' items con stock bajo</div>' +
        '<div class="text-xs text-muted">' + lowStock.slice(0, 5).map(function(p) { return p.nombre + ' (' + p.tipo + ')'; }).join(', ') + (lowStock.length > 5 ? '...' : '') + '</div></div>' +
        '<button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="navigateTo(\'productos\')">Ver Stock</button></div></div>';
    }
  }

  // Recent sales
  html += '<div class="section-title mb-12">Ventas Recientes</div>';
  var recentVentas = ventas.slice().sort(function(a, b) { return new Date(b.creadoEn) - new Date(a.creadoEn); }).slice(0, 5);
  if (recentVentas.length === 0) {
    html += '<div class="card"><div class="empty"><div class="empty-icon">\u2193</div><p>No hay ventas registradas</p></div></div>';
  } else {
    html += '<div class="card"><div class="tw"><table><tr><th>Fecha</th><th>Cliente</th><th>Total</th><th>Estado</th></tr>';
    recentVentas.forEach(function(v) {
      var estadoBadge = v.estado === 'completada' ? 'bg' : (v.estado === 'pendiente' ? 'by' : 'br');
      html += '<tr><td>' + fmtDateTime(v.fecha || v.creadoEn) + '</td>' +
        '<td>' + esc(v.clienteNombre || (v.tipo === 'tienda' ? 'Tienda' : 'Mostrador')) + '</td>' +
        '<td class="text-gold fw7">' + fmt(v.total) + '</td>' +
        '<td><span class="badge ' + estadoBadge + '">' + esc(v.estado) + '</span></td></tr>';
    });
    html += '</table></div></div>';
  }

  // Recent movements
  html += '<div class="section-title mt-16 mb-12">Movimientos Recientes</div>';
  var recentMovs = movimientos.slice().sort(function(a, b) { return new Date(b.fecha) - new Date(a.fecha); }).slice(0, 8);
  if (recentMovs.length === 0) {
    html += '<div class="card"><div class="empty"><div class="empty-icon">\u21C4</div><p>No hay movimientos</p></div></div>';
  } else {
    html += '<div class="card">';
    recentMovs.forEach(function(m) {
      var cls = m.cantidad >= 0 ? 'mov-in' : 'mov-out';
      var sign = m.cantidad >= 0 ? '+' : '';
      html += '<div class="mov-row"><span class="' + cls + '">' + sign + m.cantidad + '</span>' +
        '<span>' + esc(m.producto) + '</span><span class="text-xs text-muted">' + esc(m.detalle) + '</span>' +
        '<span class="mov-date">' + fmtDateTime(m.fecha) + '</span></div>';
    });
    html += '</div>';
  }

  el.innerHTML = html;
}

function statCard(label, value, sub) {
  return '<div class="stat"><div class="stat-label">' + esc(label) + '</div><div class="stat-value">' + esc(value) + '</div>' +
    (sub ? '<div class="stat-sub">' + esc(sub) + '</div>' : '') + '</div>';
}

// =====================================================
//  COMPRAS
// =====================================================
var comprasFilter = 'todos';

function renderCompras() {
  var db = getDB();
  var el = document.getElementById('page-compras');
  var compras = db.compras || [];

  var html = '<h1 class="page-title">Compras</h1>';
  html += '<div class="actions-row"><button class="btn btn-gold" onclick="modalNuevaCompra()">+ Nueva Compra</button></div>';

  // Tabs
  html += '<div class="tabs mb-16">';
  ['todos', 'pendiente', 'recibida', 'cancelada'].forEach(function(f) {
    html += '<button class="tab' + (comprasFilter === f ? ' active' : '') + '" onclick="comprasFilter=\'' + f + '\';renderCompras()">' +
      (f === 'todos' ? 'Todas' : f.charAt(0).toUpperCase() + f.slice(1)) + '</button>';
  });
  html += '</div>';

  var filtered = comprasFilter === 'todos' ? compras : compras.filter(function(c) { return c.estado === comprasFilter; });
  filtered = filtered.slice().sort(function(a, b) { return new Date(b.fecha || b.creadoEn) - new Date(a.fecha || a.creadoEn); });

  if (filtered.length === 0) {
    html += '<div class="empty"><div class="empty-icon">\u2191</div><p>No hay compras registradas</p></div>';
  } else {
    html += '<div class="card"><div class="tw"><table>' +
      '<tr><th>Fecha</th><th>Proveedor</th><th>Items</th><th>Total</th><th>Estado</th><th></th></tr>';
    filtered.forEach(function(c) {
      var estadoBadge = c.estado === 'recibida' ? 'bg' : (c.estado === 'pendiente' ? 'by' : 'br');
      html += '<tr><td>' + fmtDate(c.fecha) + '</td>' +
        '<td>' + esc(c.proveedor) + '</td>' +
        '<td>' + (c.items || []).length + '</td>' +
        '<td class="text-gold fw7">' + fmt(c.total) + '</td>' +
        '<td><span class="badge ' + estadoBadge + '">' + esc(c.estado) + '</span></td>' +
        '<td class="tr"><button class="btn btn-ghost btn-sm" onclick="modalVerCompra(' + c.id + ')">Ver</button></td></tr>';
    });
    html += '</table></div></div>';
  }

  el.innerHTML = html;
}

function modalNuevaCompra() {
  var body =
    '<div class="fr"><div><label>Fecha</label><input type="date" id="cmp-fecha" value="' + new Date().toISOString().split('T')[0] + '"></div>' +
    '<div><label>Proveedor</label><input id="cmp-proveedor" placeholder="Nombre del proveedor"></div></div>' +
    '<div class="fr1" style="margin-bottom:12px"><label>Notas</label><input id="cmp-notas" placeholder="Notas opcionales"></div>' +
    '<h3>Items</h3>' +
    '<div id="cmp-items-container"></div>' +
    '<button class="btn btn-ghost btn-sm mb-12" onclick="addCompraItemRow()">+ Agregar Item</button>' +
    '<hr class="divider">' +
    '<div class="cost-box mb-16"><div class="cost-row total"><span>Total</span><span id="cmp-total">$0</span></div></div>' +
    '<div id="cmp-alert" class="alert alert-err"></div>' +
    '<button class="btn btn-gold btn-full" onclick="guardarCompra()">Guardar Compra</button>';

  openModal('Nueva Compra', body);
  addCompraItemRow();
}

function addCompraItemRow() {
  var container = document.getElementById('cmp-items-container');
  if (!container) return;
  var row = document.createElement('div');
  row.className = 'ing-row';
  row.innerHTML =
    '<select onchange="cmpItemChanged(this)" style="font-size:.82rem">' +
      '<option value="">Seleccionar producto</option>' +
      (getDB().productos || []).map(function(p) {
        return '<option value="' + p.id + '">' + esc(p.nombre) + ' (' + esc(p.tipo) + ')</option>';
      }).join('') +
    '</select>' +
    '<input type="number" placeholder="Cant" min="0.01" step="any" onchange="cmpItemChanged(this)" style="font-size:.82rem">' +
    '<input type="number" placeholder="Precio unit" min="0" step="any" onchange="cmpItemChanged(this)" style="font-size:.82rem">' +
    '<div class="ing-cost" style="min-width:70px">$0</div>' +
    '<button class="btn btn-ghost btn-sm" onclick="this.parentElement.remove();calcCompraTotal()" style="padding:5px 8px;font-size:.9rem">x</button>';
  container.appendChild(row);
}

function cmpItemChanged(el) {
  var row = el.closest('.ing-row');
  var select = row.querySelector('select');
  var qtyInput = row.querySelectorAll('input')[0];
  var priceInput = row.querySelectorAll('input')[1];
  var costEl = row.querySelector('.ing-cost');
  var qty = parseFloat(qtyInput.value) || 0;
  var price = parseFloat(priceInput.value) || 0;
  costEl.textContent = fmt(qty * price);
  calcCompraTotal();
}

function calcCompraTotal() {
  var rows = document.querySelectorAll('#cmp-items-container .ing-row');
  var total = 0;
  rows.forEach(function(row) {
    var qty = parseFloat(row.querySelectorAll('input')[0].value) || 0;
    var price = parseFloat(row.querySelectorAll('input')[1].value) || 0;
    total += qty * price;
  });
  var el = document.getElementById('cmp-total');
  if (el) el.textContent = fmt(total);
}

function guardarCompra() {
  var fecha = document.getElementById('cmp-fecha').value;
  var proveedor = document.getElementById('cmp-proveedor').value.trim();
  var notas = document.getElementById('cmp-notas').value.trim();
  var alertEl = document.getElementById('cmp-alert');

  if (!fecha || !proveedor) {
    alertEl.textContent = 'Fecha y proveedor son obligatorios';
    alertEl.className = 'alert alert-err show';
    return;
  }

  var rows = document.querySelectorAll('#cmp-items-container .ing-row');
  var items = [];
  var total = 0;

  rows.forEach(function(row) {
    var select = row.querySelector('select');
    var productId = parseInt(select.value);
    var qty = parseFloat(row.querySelectorAll('input')[0].value) || 0;
    var price = parseFloat(row.querySelectorAll('input')[1].value) || 0;
    if (productId && qty > 0) {
      var prod = (getDB().productos || []).find(function(p) { return p.id === productId; });
      var sub = qty * price;
      total += sub;
      items.push({ productoId: productId, nombre: prod ? prod.nombre : 'Desconocido', cantidad: qty, unidad: prod ? prod.unidad : 'unidad', precioUnitario: price, subtotal: sub });
    }
  });

  if (items.length === 0) {
    alertEl.textContent = 'Agrega al menos un item';
    alertEl.className = 'alert alert-err show';
    return;
  }

  var db = getDB();
  var compra = {
    id: nextId(),
    fecha: fecha,
    proveedor: proveedor,
    items: items,
    total: total,
    notas: notas,
    estado: 'pendiente',
    creadoPor: currentUser ? currentUser.id : null,
    creadoEn: new Date().toISOString()
  };
  db.compras.push(compra);
  saveDB();
  closeModal();
  renderCompras();
  toast('Compra registrada');
}

function modalVerCompra(id) {
  var db = getDB();
  var c = (db.compras || []).find(function(x) { return x.id === id; });
  if (!c) return;

  var estadoBadge = c.estado === 'recibida' ? 'bg' : (c.estado === 'pendiente' ? 'by' : 'br');
  var itemsHtml = (c.items || []).map(function(it) {
    return '<div class="mov-row"><span>' + esc(it.nombre) + ' x' + it.cantidad + ' ' + esc(it.unidad) + '</span><span class="text-gold">' + fmt(it.subtotal) + '</span></div>';
  }).join('');

  var body =
    '<div class="fr"><div><label>Fecha</label><div style="padding:9px 0">' + fmtDate(c.fecha) + '</div></div>' +
    '<div><label>Proveedor</label><div style="padding:9px 0">' + esc(c.proveedor) + '</div></div></div>' +
    '<div class="fr"><div><label>Estado</label><div style="padding:9px 0"><span class="badge ' + estadoBadge + '">' + esc(c.estado) + '</span></div></div>' +
    '<div><label>Total</label><div style="padding:9px 0" class="text-gold fw7">' + fmt(c.total) + '</div></div></div>' +
    (c.notas ? '<div class="mb-12"><label>Notas</label><div style="padding:9px 0">' + esc(c.notas) + '</div></div>' : '') +
    '<hr class="divider"><h3>Items</h3>' + itemsHtml +
    '<hr class="divider"><div class="cost-box mb-16"><div class="cost-row total"><span>Total</span><span>' + fmt(c.total) + '</span></div></div>';

  if (c.estado === 'pendiente') {
    body += '<div class="flex gap-8">' +
      '<button class="btn btn-green" onclick="cambiarEstadoCompra(' + c.id + ',\'recibida\')">Marcar Recibida</button>' +
      '<button class="btn btn-red" onclick="cambiarEstadoCompra(' + c.id + ',\'cancelada\')">Cancelar</button></div>';
  }

  openModal('Compra #' + c.id, body);
}

function cambiarEstadoCompra(id, nuevoEstado) {
  var db = getDB();
  var compra = db.compras.find(function(c) { return c.id === id; });
  if (!compra) return;

  compra.estado = nuevoEstado;

  // If received, update stock
  if (nuevoEstado === 'recibida') {
    (compra.items || []).forEach(function(it) {
      var prod = db.productos.find(function(p) { return p.id === it.productoId; });
      if (prod) {
        prod.stock += it.cantidad;
        prod.actualizadoEn = new Date().toISOString();
        addMovimiento('compra', 'compras', compra.id, it.nombre, it.cantidad, 'Compra de ' + compra.proveedor);
      }
    });
  }

  saveDB();
  closeModal();
  renderCompras();
  toast('Compra actualizada');
}

// =====================================================
//  PRODUCTOS
// =====================================================
var productosFilter = 'todos';
var productosSearch = '';

function renderProductos() {
  var db = getDB();
  var el = document.getElementById('page-productos');
  var productos = db.productos || [];

  var html = '<h1 class="page-title">Productos</h1>';
  html += '<div class="actions-row"><button class="btn btn-gold" onclick="modalNuevoProducto()">+ Nuevo Producto</button>' +
    '<div class="search-wrap"><input id="prod-search" placeholder="Buscar..." value="' + esc(productosSearch) + '" oninput="productosSearch=this.value;renderProductos()"></div></div>';

  // Tabs
  html += '<div class="tabs mb-16">';
  var types = [{ val: 'todos', label: 'Todos' }].concat(PRODUCT_TYPES);
  types.forEach(function(t) {
    html += '<button class="tab' + (productosFilter === t.val ? ' active' : '') + '" onclick="productosFilter=\'' + t.val + '\';renderProductos()">' + esc(t.label) + '</button>';
  });
  html += '</div>';

  // Filter
  var filtered = productos;
  if (productosFilter !== 'todos') filtered = filtered.filter(function(p) { return p.tipo === productosFilter; });
  if (productosSearch) {
    var q = productosSearch.toLowerCase();
    filtered = filtered.filter(function(p) { return p.nombre.toLowerCase().indexOf(q) !== -1 || (p.proveedor || '').toLowerCase().indexOf(q) !== -1; });
  }

  if (filtered.length === 0) {
    html += '<div class="empty"><div class="empty-icon">\u25CF</div><p>No hay productos</p></div>';
  } else {
    html += '<div class="card"><div class="tw"><table>' +
      '<tr><th>Nombre</th><th>Tipo</th><th>Categoría</th><th>Stock</th><th>Costo</th><th>Venta</th><th>Proveedor</th><th></th></tr>';
    filtered.forEach(function(p) {
      var stockClass = p.stock <= p.stockMin ? 'stock-low' : 'stock-ok';
      html += '<tr><td class="fw7">' + esc(p.nombre) + '</td>' +
        '<td><span class="badge ba">' + esc(p.tipo) + '</span></td>' +
        '<td class="text-sm text-muted">' + esc(p.categoria || '-') + '</td>' +
        '<td class="' + stockClass + '">' + p.stock + ' ' + esc(p.unidad) + '</td>' +
        '<td>' + fmt(p.precioCosto) + '</td>' +
        '<td class="text-gold">' + (p.precioVenta ? fmt(p.precioVenta) : '-') + '</td>' +
        '<td class="text-muted text-sm">' + esc(p.proveedor || '-') + '</td>' +
        '<td class="tr"><button class="btn btn-ghost btn-sm" onclick="modalEditarProducto(' + p.id + ')">Editar</button></td></tr>';
    });
    html += '</table></div></div>';
  }

  el.innerHTML = html;
}

function productoFormHTML(p) {
  var isEdit = !!p;
  p = p || {};
  return '<div class="fr">' +
    '<div><label>Nombre</label><input id="prod-nombre" value="' + esc(p.nombre || '') + '" placeholder="Nombre del producto"></div>' +
    '<div><label>Tipo</label><select id="prod-tipo">' + optHtml(PRODUCT_TYPES, p.tipo || 'especia') + '</select></div></div>' +
    '<div class="fr3">' +
      '<div><label>Unidad</label><select id="prod-unidad">' + unitOptions(p.unidad || 'gr') + '</select></div>' +
      '<div><label>Precio Costo</label><input type="number" id="prod-costo" value="' + (p.precioCosto || '') + '" min="0" step="any" placeholder="0"></div>' +
      '<div><label>Precio Venta</label><input type="number" id="prod-venta" value="' + (p.precioVenta || '') + '" min="0" step="any" placeholder="0 (solo especias)"></div></div>' +
    '<div class="fr">' +
      '<div><label>Stock Actual</label><input type="number" id="prod-stock" value="' + (p.stock || 0) + '" min="0" step="any"></div>' +
      '<div><label>Stock Mínimo</label><input type="number" id="prod-stockmin" value="' + (p.stockMin || 0) + '" min="0" step="any"></div></div>' +
    '<div class="fr1" style="margin-bottom:12px"><label>Proveedor</label><input id="prod-proveedor" value="' + esc(p.proveedor || '') + '" placeholder="Nombre del proveedor"></div>' +
    '<div class="fr1" style="margin-bottom:12px"><label>Notas</label><textarea id="prod-notas" rows="2">' + esc(p.notas || '') + '</textarea></div>' +
    '<div id="prod-alert" class="alert alert-err"></div>' +
    '<button class="btn btn-gold btn-full" onclick="guardarProducto(' + (p.id || 0) + ')">' + (isEdit ? 'Actualizar' : 'Crear') + ' Producto</button>';
}

function modalNuevoProducto() {
  openModal('Nuevo Producto', productoFormHTML(null));
}

function modalEditarProducto(id) {
  var db = getDB();
  var p = db.productos.find(function(x) { return x.id === id; });
  if (!p) return;
  openModal('Editar Producto', productoFormHTML(p));
}

function guardarProducto(existingId) {
  var nombre = document.getElementById('prod-nombre').value.trim();
  var tipo = document.getElementById('prod-tipo').value;
  var unidad = document.getElementById('prod-unidad').value;
  var costo = parseFloat(document.getElementById('prod-costo').value) || 0;
  var venta = parseFloat(document.getElementById('prod-venta').value) || 0;
  var stock = parseFloat(document.getElementById('prod-stock').value) || 0;
  var stockMin = parseFloat(document.getElementById('prod-stockmin').value) || 0;
  var proveedor = document.getElementById('prod-proveedor').value.trim();
  var notas = document.getElementById('prod-notas').value.trim();
  var alertEl = document.getElementById('prod-alert');

  if (!nombre) {
    alertEl.textContent = 'El nombre es obligatorio';
    alertEl.className = 'alert alert-err show';
    return;
  }

  var db = getDB();
  var now = new Date().toISOString();

  if (existingId) {
    var prod = db.productos.find(function(p) { return p.id === existingId; });
    if (prod) {
      var oldStock = prod.stock;
      prod.nombre = nombre; prod.tipo = tipo; prod.unidad = unidad;
      prod.precioCosto = costo; prod.precioVenta = venta;
      prod.stock = stock; prod.stockMin = stockMin;
      prod.proveedor = proveedor; prod.notas = notas;
      prod.actualizadoEn = now;
      if (stock !== oldStock) {
        addMovimiento('ajuste', 'productos', prod.id, nombre, stock - oldStock, 'Ajuste manual de stock');
      }
    }
  } else {
    db.productos.push({
      id: nextId(), nombre: nombre, tipo: tipo, unidad: unidad,
      precioCosto: costo, precioVenta: venta, stock: stock, stockMin: stockMin,
      proveedor: proveedor, notas: notas,
      creadoEn: now, actualizadoEn: now
    });
  }

  saveDB();
  closeModal();
  renderProductos();
  toast(existingId ? 'Producto actualizado' : 'Producto creado');
}

// =====================================================
//  BLENDS
// =====================================================
function renderBlends() {
  var db = getDB();
  var el = document.getElementById('page-blends');
  var blends = db.blends || [];

  var html = '<h1 class="page-title">Blends</h1>';
  html += '<div class="actions-row"><button class="btn btn-gold" onclick="modalNuevoBlend()">+ Nuevo Blend</button></div>';

  if (blends.length === 0) {
    html += '<div class="empty"><div class="empty-icon">\u2726</div><p>No hay blends creados</p><p class="text-xs mt-12">Los blends son mezclas de especias con una receta definida</p></div>';
  } else {
    blends.forEach(function(b) {
      // Calculate cost from recipe
      var costo = calcBlendCost(b);
      b.costoUnitario = costo;
      var profit = b.precioVenta - costo;
      var profitClass = profit >= 0 ? 'profit' : 'loss';
      var estadoBadge = b.stock > 0 ? 'bg' : 'by';

      // Calculate effective stock considering frascos and etiquetas
      var etiquetaProd = b.etiquetaId ? (db.productos || []).find(function(p) { return p.id === b.etiquetaId; }) : null;
      var etiquetaStk = etiquetaProd ? etiquetaProd.stock : 9999;
      var frascosDisp = (db.productos || []).filter(function(p) { return p.tipo === 'frasco' && p.stock > 0; });
      var maxFrascoStock = frascosDisp.length > 0 ? Math.max.apply(null, frascosDisp.map(function(f) { return f.stock; })) : 0;
      var stockEfectivo = Math.min(b.stock || 0, maxFrascoStock, etiquetaStk);

      html += '<div class="blend-card"><div class="blend-header" onclick="this.nextElementSibling.classList.toggle(\'open\')">' +
        '<div><div class="blend-name">' + esc(b.nombre) + '</div>' +
        '<div class="text-xs text-muted mt-12">' + esc(b.descripcion || 'Sin descripción') + ' &bull; <span class="badge ba">' + esc(b.formato || 'polvo') + '</span>' +
        (etiquetaProd ? ' &bull; Etiqueta: ' + etiquetaProd.stock : ' &bull; <span class="text-red">Sin etiqueta</span>') +
        '</div></div>' +
        '<div class="flex items-center gap-12">' +
          '<span class="badge ' + estadoBadge + '">' + b.stock + ' und</span>' +
          (stockEfectivo < b.stock ? '<span class="text-xs text-yellow" title="Limitado por frascos/etiquetas">Vendible: ' + stockEfectivo + '</span>' : '') +
          '<span class="text-gold fw7">' + fmt(b.precioVenta) + '</span></div></div>' +
        '<div class="blend-body"><div class="blend-inner">' +
          '<h3>Receta (' + (b.receta || []).length + ' ingredientes)</h3>';

      if (b.receta && b.receta.length > 0) {
        html += '<div class="card mb-16">';
        b.receta.forEach(function(r) {
          var prod = (db.productos || []).find(function(p) { return p.id === r.productoId; });
          var stockInfo = prod ? (prod.stock + ' ' + prod.unidad) : '?';
          html += '<div class="mov-row"><span class="text-gold">' + r.cantidad + ' ' + esc(r.unidad) + '</span>' +
            '<span>' + esc(r.nombre) + '</span>' +
            '<span class="text-xs text-muted">(disponible: ' + stockInfo + ')</span></div>';
        });
        html += '</div>';
      }

      // Show packaging availability
      var etiqProd2 = b.etiquetaId ? (db.productos || []).find(function(p) { return p.id === b.etiquetaId; }) : null;
      if (etiqProd2 || frascosDisp.length > 0) {
        html += '<div class="card mb-16"><h3>Empaquetado</h3>';
        if (etiqProd2) {
          var etiqCls = etiqProd2.stock <= (etiqProd2.stockMin || 0) ? 'text-red' : 'text-green';
          html += '<div class="mov-row"><span>Etiqueta</span><span class="' + etiqCls + '">' + esc(etiqProd2.nombre) + ': ' + etiqProd2.stock + ' und</span></div>';
        } else {
          html += '<div class="mov-row"><span>Etiqueta</span><span class="text-red">Sin asignar</span></div>';
        }
        frascosDisp.forEach(function(f) {
          var fCls = f.stock <= (f.stockMin || 0) ? 'text-red' : '';
          html += '<div class="mov-row"><span>Frasco</span><span class="' + fCls + '">' + esc(f.nombre) + ': ' + f.stock + ' und</span></div>';
        });
        html += '</div>';
      }

      html += '<div class="cost-box mb-16">' +
        '<div class="cost-row"><span>Costo unitario (especias)</span><span>' + fmt(costo) + '</span></div>' +
        '<div class="cost-row"><span>Precio venta</span><span>' + fmt(b.precioVenta) + '</span></div>' +
        '<div class="cost-row ' + profitClass + '"><span>Ganancia</span><span>' + fmt(profit) + '</span></div></div>' +
        '<div class="flex gap-8">' +
          '<button class="btn btn-gold btn-sm" onclick="modalEditarBlend(' + b.id + ')">Editar</button>' +
          '<button class="btn btn-green btn-sm" onclick="modalProducirBlend(' + b.id + ')">Producir</button>' +
          '<button class="btn btn-red btn-sm" onclick="eliminarBlend(' + b.id + ')">Eliminar</button></div>' +
        '</div></div></div>';
    });
  }

  el.innerHTML = html;
}

function calcBlendCost(blend) {
  if (!blend || !blend.receta) return 0;
  var db = getDB();
  var costo = 0;
  blend.receta.forEach(function(r) {
    var prod = (db.productos || []).find(function(p) { return p.id === r.productoId; });
    if (prod) {
      // Convert to same unit for cost calc (simplified: assumes recipe unit matches product unit)
      var unitCost = prod.precioCosto / 1; // cost per base unit
      // If product is in kg and recipe in gr, convert
      var factor = 1;
      if (prod.unidad === 'kg' && r.unidad === 'gr') factor = 0.001;
      else if (prod.unidad === 'L' && r.unidad === 'ml') factor = 0.001;
      costo += r.cantidad * unitCost * factor;
    }
  });
  return Math.round(costo);
}

function modalNuevoBlend() {
  var body = blendFormHTML(null);
  openModal('Nuevo Blend', body);
  addBlendRecetaRow();
}

function modalEditarBlend(id) {
  var db = getDB();
  var b = db.blends.find(function(x) { return x.id === id; });
  if (!b) return;
  var body = blendFormHTML(b);
  openModal('Editar Blend', body);
  // Load existing recipe
  (b.receta || []).forEach(function(r) {
    addBlendRecetaRow(r);
  });
}

function blendFormHTML(b) {
  b = b || {};
  var db = getDB();
  var etiquetas = (db.productos || []).filter(function(p) { return p.tipo === 'etiqueta'; });
  return '<div class="fr1" style="margin-bottom:12px"><label>Nombre</label><input id="bl-nombre" value="' + esc(b.nombre || '') + '" placeholder="Nombre del blend"></div>' +
    '<div class="fr1" style="margin-bottom:12px"><label>Descripción</label><textarea id="bl-desc" rows="2">' + esc(b.descripcion || '') + '</textarea></div>' +
    '<div class="fr"><div><label>Formato</label><select id="bl-formato">' + optHtml(BLEND_FORMATOS, b.formato || 'polvo') + '</select></div>' +
    '<div><label>Etiqueta</label><select id="bl-etiqueta"><option value="0">Sin etiqueta</option>' +
    etiquetas.map(function(e) { return '<option value="' + e.id + '"' + ((b.etiquetaId || 0) === e.id ? ' selected' : '') + '>' + esc(e.nombre) + ' (stock: ' + e.stock + ')</option>'; }).join('') +
    '</select></div></div>' +
    '<h3>Receta (especias)</h3><div id="bl-receta-container"></div>' +
    '<button class="btn btn-ghost btn-sm mb-12" onclick="addBlendRecetaRow()">+ Ingrediente</button>' +
    '<hr class="divider">' +
    '<div class="fr"><div><label>Precio Venta</label><input type="number" id="bl-precio" value="' + (b.precioVenta || '') + '" min="0" step="any"></div>' +
    '<div style="display:flex;align-items:flex-end;padding-bottom:2px"><div class="cost-box" style="width:100%"><div class="cost-row"><span>Costo estimado</span><span id="bl-costo-est">$0</span></div></div></div></div>' +
    '<div id="bl-alert" class="alert alert-err"></div>' +
    '<button class="btn btn-gold btn-full" onclick="guardarBlend(' + (b.id || 0) + ')">' + (b.id ? 'Actualizar' : 'Crear') + ' Blend</button>';
}

function addBlendRecetaRow(data) {
  var container = document.getElementById('bl-receta-container');
  if (!container) return;
  data = data || {};
  var row = document.createElement('div');
  row.className = 'ing-row';
  row.innerHTML =
    '<select onchange="calcBlendCostEst()" style="font-size:.82rem">' +
      '<option value="">Especia</option>' +
      (getDB().productos || []).filter(function(p) { return p.tipo === 'especia'; }).map(function(p) {
        return '<option value="' + p.id + '"' + (data.productoId === p.id ? ' selected' : '') + '>' + esc(p.nombre) + '</option>';
      }).join('') +
    '</select>' +
    '<input type="number" placeholder="Cant" min="0.01" step="any" value="' + (data.cantidad || '') + '" onchange="calcBlendCostEst()" style="font-size:.82rem">' +
    '<select onchange="calcBlendCostEst()" style="font-size:.82rem">' + unitOptions(data.unidad || 'gr') + '</select>' +
    '<button class="btn btn-ghost btn-sm" onclick="this.parentElement.remove();calcBlendCostEst()" style="padding:5px 8px;font-size:.9rem">x</button>';
  container.appendChild(row);
}

function calcBlendCostEst() {
  var rows = document.querySelectorAll('#bl-receta-container .ing-row');
  var costo = 0;
  var db = getDB();
  rows.forEach(function(row) {
    var select = row.querySelector('select');
    var qtyInput = row.querySelectorAll('input')[0];
    var unitSelect = row.querySelectorAll('select')[1];
    var productId = parseInt(select.value);
    var qty = parseFloat(qtyInput.value) || 0;
    var unit = unitSelect ? unitSelect.value : 'gr';

    var prod = db.productos.find(function(p) { return p.id === productId; });
    if (prod) {
      var factor = 1;
      if (prod.unidad === 'kg' && unit === 'gr') factor = 0.001;
      else if (prod.unidad === 'L' && unit === 'ml') factor = 0.001;
      costo += qty * prod.precioCosto * factor;
    }
  });
  var el = document.getElementById('bl-costo-est');
  if (el) el.textContent = fmt(Math.round(costo));
}

function guardarBlend(existingId) {
  var nombre = document.getElementById('bl-nombre').value.trim();
  var desc = document.getElementById('bl-desc').value.trim();
  var formato = document.getElementById('bl-formato').value;
  var etiquetaId = parseInt(document.getElementById('bl-etiqueta').value) || 0;
  var precio = parseFloat(document.getElementById('bl-precio').value) || 0;
  var alertEl = document.getElementById('bl-alert');

  if (!nombre) {
    alertEl.textContent = 'El nombre es obligatorio';
    alertEl.className = 'alert alert-err show';
    return;
  }

  var db = getDB();
  var rows = document.querySelectorAll('#bl-receta-container .ing-row');
  var receta = [];
  rows.forEach(function(row) {
    var select = row.querySelector('select');
    var qtyInput = row.querySelectorAll('input')[0];
    var unitSelect = row.querySelectorAll('select')[1];
    var productId = parseInt(select.value);
    var qty = parseFloat(qtyInput.value) || 0;
    var unit = unitSelect ? unitSelect.value : 'gr';
    if (productId && qty > 0) {
      var prod = db.productos.find(function(p) { return p.id === productId; });
      receta.push({ productoId: productId, nombre: prod ? prod.nombre : '?', cantidad: qty, unidad: unit });
    }
  });

  var now = new Date().toISOString();

  if (existingId) {
    var blend = db.blends.find(function(b) { return b.id === existingId; });
    if (blend) {
      blend.nombre = nombre; blend.descripcion = desc; blend.receta = receta;
      blend.formato = formato; blend.etiquetaId = etiquetaId;
      blend.precioVenta = precio; blend.costoUnitario = calcBlendCost({ receta: receta });
      blend.actualizadoEn = now;
    }
  } else {
    db.blends.push({
      id: nextId(), nombre: nombre, descripcion: desc, formato: formato, etiquetaId: etiquetaId,
      receta: receta, costoUnitario: calcBlendCost({ receta: receta }), precioVenta: precio,
      stock: 0, creadoEn: now, actualizadoEn: now
    });
  }

  saveDB();
  closeModal();
  renderBlends();
  toast(existingId ? 'Blend actualizado' : 'Blend creado');
}

function modalProducirBlend(id) {
  var db = getDB();
  var b = db.blends.find(function(x) { return x.id === id; });
  if (!b) return;

  // Check if there's enough stock for all ingredients
  var canProduce = true;
  var stockInfo = '';
  (b.receta || []).forEach(function(r) {
    var prod = db.productos.find(function(p) { return p.id === r.productoId; });
    if (!prod || prod.stock < r.cantidad) {
      canProduce = false;
      stockInfo += '<div class="mov-row"><span class="text-red">' + esc(r.nombre) + ': necesita ' + r.cantidad + ', disponible ' + (prod ? prod.stock : 0) + '</span></div>';
    }
  });

  var body = '<div class="mb-12"><label>Blend</label><div style="padding:9px 0" class="fw7 text-gold">' + esc(b.nombre) + '</div></div>';

  if (!canProduce) {
    body += '<div class="alert alert-err show mb-12">Stock insuficiente para producir</div>' + stockInfo;
    body += '<hr class="divider"><button class="btn btn-ghost btn-full" onclick="closeModal()">Cerrar</button>';
  } else {
    body += '<div class="card mb-16"><h3>Ingredientes necesarios</h3>';
    (b.receta || []).forEach(function(r) {
      var prod = db.productos.find(function(p) { return p.id === r.productoId; });
      body += '<div class="mov-row"><span>' + r.cantidad + ' ' + esc(r.unidad) + '</span><span>' + esc(r.nombre) + '</span>' +
        '<span class="text-xs text-muted">(stock: ' + (prod ? prod.stock : 0) + ')</span></div>';
    });
    body += '</div>';
    body += '<div class="fr" style="margin-bottom:12px"><div><label>Cantidad a producir</label><input type="number" id="bl-prod-cant" value="1" min="1"></div></div>';
    body += '<button class="btn btn-gold btn-full" onclick="ejecutarProduccion(' + b.id + ')">Producir</button>';
  }

  openModal('Producir Blend', body);
}

function ejecutarProduccion(blendId) {
  var cant = parseInt(document.getElementById('bl-prod-cant').value) || 1;
  if (cant < 1) return;

  var db = getDB();
  var b = db.blends.find(function(x) { return x.id === blendId; });
  if (!b) return;

  // Check stock for multiplied recipe
  (b.receta || []).forEach(function(r) {
    var needed = r.cantidad * cant;
    var prod = db.productos.find(function(p) { return p.id === r.productoId; });
    if (!prod || prod.stock < needed) {
      toast('Stock insuficiente de ' + r.nombre, 'err');
      return;
    }
  });

  // Deduct stock from ingredients
  (b.receta || []).forEach(function(r) {
    var needed = r.cantidad * cant;
    var prod = db.productos.find(function(p) { return p.id === r.productoId; });
    if (prod) {
      prod.stock -= needed;
      prod.actualizadoEn = new Date().toISOString();
      addMovimiento('blend', 'blends', b.id, r.nombre, -needed, 'Producción: ' + b.nombre + ' x' + cant);
    }
  });

  b.stock += cant;
  b.actualizadoEn = new Date().toISOString();
  saveDB();
  closeModal();
  renderBlends();
  toast(cant + ' unidad(es) de ' + b.nombre + ' producida(s)');
}

function eliminarBlend(id) {
  if (!confirm('Eliminar este blend?')) return;
  var db = getDB();
  db.blends = db.blends.filter(function(b) { return b.id !== id; });
  saveDB();
  renderBlends();
  toast('Blend eliminado');
}

// =====================================================
//  VENTAS (Admin/Operator POS)
// =====================================================
var ventasFilter = 'todos';
var ventaActual = null; // Current sale being built

function renderVentas() {
  var db = getDB();
  var el = document.getElementById('page-ventas');
  var ventas = db.ventas || [];

  var html = '<h1 class="page-title">Ventas</h1>';
  html += '<div class="actions-row">' +
    '<button class="btn btn-gold" onclick="iniciarNuevaVenta()">+ Nueva Venta</button>' +
    '<button class="btn btn-ghost" onclick="toggleTiendaOrders()" id="btn-tienda-ordenes">Pedidos de Tienda</button></div>';

  // Show active sale if exists
  if (ventaActual) {
    html += renderVentaActiva();
  }

  // Tabs
  html += '<div class="tabs mb-16">';
  ['todos', 'pendiente', 'completada', 'cancelada'].forEach(function(f) {
    html += '<button class="tab' + (ventasFilter === f ? ' active' : '') + '" onclick="ventasFilter=\'' + f + '\';renderVentas()">' +
      (f === 'todos' ? 'Todas' : f.charAt(0).toUpperCase() + f.slice(1)) + '</button>';
  });
  html += '</div>';

  // Filter: admin sees all, operator sees their own
  var filtered = ventas;
  if (currentUser && currentUser.rol !== 'admin') {
    filtered = filtered.filter(function(v) { return v.creadoPor === currentUser.id; });
  }
  if (ventasFilter !== 'todos') filtered = filtered.filter(function(v) { return v.estado === ventasFilter; });
  filtered = filtered.slice().sort(function(a, b) { return new Date(b.creadoEn) - new Date(a.creadoEn); });

  if (filtered.length === 0) {
    html += '<div class="empty"><div class="empty-icon">\u2193</div><p>No hay ventas</p></div>';
  } else {
    html += '<div class="card"><div class="tw"><table>' +
      '<tr><th>Fecha</th><th>Cliente</th><th>Items</th><th>Total</th><th>Estado</th><th>Tipo</th><th></th></tr>';
    filtered.forEach(function(v) {
      var estadoBadge = v.estado === 'completada' ? 'bg' : (v.estado === 'pendiente' ? 'by' : 'br');
      var tipo = v.tipo === 'tienda' ? '<span class="badge bb">Tienda</span>' : '<span class="badge ba">Mostrador</span>';
      html += '<tr><td>' + fmtDateTime(v.fecha || v.creadoEn) + '</td>' +
        '<td>' + esc(v.clienteNombre || '-') + '</td>' +
        '<td>' + (v.items || []).length + '</td>' +
        '<td class="text-gold fw7">' + fmt(v.total) + '</td>' +
        '<td><span class="badge ' + estadoBadge + '">' + esc(v.estado) + '</span></td>' +
        '<td>' + tipo + '</td>' +
        '<td class="tr"><button class="btn btn-ghost btn-sm" onclick="modalVerVenta(' + v.id + ')">Ver</button></td></tr>';
    });
    html += '</table></div></div>';
  }

  el.innerHTML = html;
}

function renderVentaActiva() {
  var items = ventaActual.items || [];
  var total = items.reduce(function(s, i) { return s + i.subtotal; }, 0);

  var html = '<div class="card card-gold mb-20">' +
    '<div class="flex justify-between items-center mb-12"><div class="section-title" style="margin:0">Venta en Curso</div>' +
    '<button class="btn btn-ghost btn-sm" onclick="cancelarVentaActual()">Cancelar</button></div>';

  if (items.length === 0) {
    html += '<p class="text-muted text-sm">Agrega productos al lado derecho</p>';
  } else {
    html += '<div class="tw"><table><tr><th>Producto</th><th>Cant</th><th>Precio</th><th>Sub</th><th></th></tr>';
    items.forEach(function(it, i) {
      html += '<tr><td>' + esc(it.nombre) + (it.frascoNombre ? '<div class="text-xs text-muted">' + esc(it.frascoNombre) + '</div>' : '') + '</td><td>' + it.cantidad + '</td>' +
        '<td>' + fmt(it.precioUnitario) + '</td><td class="text-gold">' + fmt(it.subtotal) + '</td>' +
        '<td><button class="btn btn-ghost btn-sm" onclick="removeVentaItem(' + i + ')" style="padding:3px 6px;font-size:.8rem">x</button></td></tr>';
    });
    html += '</table></div>';
  }

  html += '<hr class="divider"><div class="cost-box">' +
    '<div class="cost-row total"><span>Total</span><span>' + fmt(total) + '</span></div></div>';

  html += '<div class="fr mt-12">' +
    '<div><label>Cliente</label><input id="va-cliente" value="' + esc(ventaActual.clienteNombre || '') + '" placeholder="Nombre (opcional)"></div>' +
    '<div><label>Teléfono</label><input id="va-tel" value="' + esc(ventaActual.clienteTelefono || '') + '" placeholder="Teléfono (opcional)"></div></div>';

  html += '<div class="flex gap-8 mt-12">' +
    '<button class="btn btn-gold" onclick="completarVenta()" style="flex:1">Completar Venta</button></div>';

  html += '</div>';
  return html;
}

function iniciarNuevaVenta() {
  var db = getDB();
  // Build modal with product picker
  var especias = db.productos.filter(function(p) { return p.tipo === 'especia' && p.precioVenta > 0 && p.stock > 0; });
  var blends = db.blends.filter(function(b) { return b.stock > 0 && b.precioVenta > 0; });

  var body = '<h3>Especias</h3><div class="mb-16">';
  if (especias.length === 0) {
    body += '<p class="text-muted text-sm">No hay especias disponibles para venta</p>';
  } else {
    especias.forEach(function(p) {
      body += '<div class="mov-row" style="cursor:pointer" onclick="agregarAVenta(\'especia\',' + p.id + ')">' +
        '<span class="fw7">' + esc(p.nombre) + '</span>' +
        '<span class="text-xs text-muted">' + p.stock + ' ' + esc(p.unidad) + '</span>' +
        '<span class="text-gold">' + fmt(p.precioVenta) + '</span></div>';
    });
  }
  body += '</div><h3>Blends</h3>';
  if (blends.length === 0) {
    body += '<p class="text-muted text-sm">No hay blends disponibles</p>';
  } else {
    blends.forEach(function(b) {
      body += '<div class="mov-row" style="cursor:pointer" onclick="agregarAVenta(\'blend\',' + b.id + ')">' +
        '<span class="fw7">' + esc(b.nombre) + '</span>' +
        '<span class="text-xs text-muted">' + b.stock + ' und</span>' +
        '<span class="text-gold">' + fmt(b.precioVenta) + '</span></div>';
    });
  }

  openModal('Agregar a Venta', body);
}

function agregarAVenta(tipo, id) {
  var db = getDB();

  if (tipo === 'especia') {
    var prod = db.productos.find(function(p) { return p.id === id; });
    if (!prod) return;
    var item = { tipo: 'especia', id: prod.id, nombre: prod.nombre, cantidad: 1, unidad: prod.unidad, precioUnitario: prod.precioVenta, subtotal: prod.precioVenta, maxStock: prod.stock };
    if (!ventaActual) { ventaActual = { items: [], clienteNombre: '', clienteTelefono: '' }; }
    var existing = ventaActual.items.find(function(i) { return i.tipo === tipo && i.id === id; });
    if (existing) {
      if (existing.cantidad >= existing.maxStock) { toast('Stock máximo', 'err'); return; }
      existing.cantidad++;
      existing.subtotal = existing.cantidad * existing.precioUnitario;
    } else {
      ventaActual.items.push(item);
    }
    closeModal();
    renderVentas();
  } else {
    // Blend: show frasco picker
    mostrarSelectorFrasco(id, 'venta');
  }
}

function agregarBlendAVenta(blendId, frascoId, nombre, precio, disponible) {
  if (!ventaActual) { ventaActual = { items: [], clienteNombre: '', clienteTelefono: '' }; }
  // Check if same blend+frasco already in sale
  var existing = ventaActual.items.find(function(i) { return i.tipo === 'blend' && i.id === blendId && i.frascoId === frascoId; });
  if (existing) {
    if (existing.cantidad >= disponible) { toast('Stock máximo', 'err'); return; }
    existing.cantidad++;
    existing.subtotal = existing.cantidad * existing.precioUnitario;
  } else {
    ventaActual.items.push({
      tipo: 'blend', id: blendId, nombre: nombre, cantidad: 1, unidad: 'unidad',
      precioUnitario: precio, subtotal: precio, maxStock: disponible,
      frascoId: frascoId, frascoNombre: (db_productos_find(frascoId) || {}).nombre || 'Frasco',
      etiquetaId: (db_blends_find(blendId) || {}).etiquetaId || 0
    });
  }
  renderVentas();
}

function db_productos_find(id) { return (getDB().productos || []).find(function(p) { return p.id === id; }); }
function db_blends_find(id) { return (getDB().blends || []).find(function(b) { return b.id === id; }); }

function removeVentaItem(idx) {
  if (!ventaActual) return;
  ventaActual.items.splice(idx, 1);
  if (ventaActual.items.length === 0) ventaActual = null;
  renderVentas();
}

function cancelarVentaActual() {
  if (ventaActual && ventaActual.items.length > 0 && !confirm('Cancelar venta en curso?')) return;
  ventaActual = null;
  renderVentas();
}

function completarVenta() {
  if (!ventaActual || ventaActual.items.length === 0) { toast('No hay items en la venta', 'err'); return; }

  // Read client info from DOM
  var clienteEl = document.getElementById('va-cliente');
  var telEl = document.getElementById('va-tel');
  if (clienteEl) ventaActual.clienteNombre = clienteEl.value.trim();
  if (telEl) ventaActual.clienteTelefono = telEl.value.trim();

  var db = getDB();
  var total = ventaActual.items.reduce(function(s, i) { return s + i.subtotal; }, 0);

  var venta = {
    id: nextId(),
    fecha: new Date().toISOString(),
    clienteNombre: ventaActual.clienteNombre || 'Mostrador',
    clienteTelefono: ventaActual.clienteTelefono || '',
    items: ventaActual.items,
    total: total,
    estado: 'completada',
    tipo: 'mostrador',
    creadoPor: currentUser ? currentUser.id : null,
    creadoEn: new Date().toISOString()
  };

  db.ventas.push(venta);

  // Update stock
  ventaActual.items.forEach(function(it) {
    if (it.tipo === 'especia') {
      var prod = db.productos.find(function(p) { return p.id === it.id; });
      if (prod) {
        prod.stock = Math.max(0, prod.stock - it.cantidad);
        prod.actualizadoEn = new Date().toISOString();
        addMovimiento('venta', 'ventas', venta.id, it.nombre, -it.cantidad, 'Venta mostrador');
      }
    } else if (it.tipo === 'blend') {
      var blend = db.blends.find(function(b) { return b.id === it.id; });
      if (blend) {
        blend.stock = Math.max(0, blend.stock - it.cantidad);
        blend.actualizadoEn = new Date().toISOString();
        addMovimiento('venta', 'ventas', venta.id, it.nombre, -it.cantidad, 'Venta mostrador');
      }
      // Deduct frasco
      if (it.frascoId) {
        var frasco = db.productos.find(function(p) { return p.id === it.frascoId; });
        if (frasco) {
          frasco.stock = Math.max(0, frasco.stock - it.cantidad);
          frasco.actualizadoEn = new Date().toISOString();
          addMovimiento('venta', 'ventas', venta.id, it.frascoNombre || 'Frasco', -it.cantidad, 'Frasco para ' + it.nombre);
        }
      }
      // Deduct etiqueta
      if (it.etiquetaId) {
        var etiqueta = db.productos.find(function(p) { return p.id === it.etiquetaId; });
        if (etiqueta) {
          etiqueta.stock = Math.max(0, etiqueta.stock - it.cantidad);
          etiqueta.actualizadoEn = new Date().toISOString();
          addMovimiento('venta', 'ventas', venta.id, etiqueta.nombre || 'Etiqueta', -it.cantidad, 'Etiqueta para ' + it.nombre);
        }
      }
    }
  });

  saveDB();
  ventaActual = null;
  renderVentas();
  toast('Venta completada');
}

function modalVerVenta(id) {
  var db = getDB();
  var v = db.ventas.find(function(x) { return x.id === id; });
  if (!v) return;

  var estadoBadge = v.estado === 'completada' ? 'bg' : (v.estado === 'pendiente' ? 'by' : 'br');
  var tipo = v.tipo === 'tienda' ? 'Pedido de Tienda' : 'Venta de Mostrador';

  var body =
    '<div class="fr"><div><label>Fecha</label><div style="padding:9px 0">' + fmtDateTime(v.fecha || v.creadoEn) + '</div></div>' +
    '<div><label>Tipo</label><div style="padding:9px 0"><span class="badge ba">' + esc(tipo) + '</span></div></div></div>' +
    '<div class="fr"><div><label>Cliente</label><div style="padding:9px 0">' + esc(v.clienteNombre || '-') + '</div></div>' +
    '<div><label>Teléfono</label><div style="padding:9px 0">' + esc(v.clienteTelefono || '-') + '</div></div></div>' +
    '<div class="fr"><div><label>Estado</label><div style="padding:9px 0"><span class="badge ' + estadoBadge + '">' + esc(v.estado) + '</span></div></div>' +
    '<div><label>Total</label><div style="padding:9px 0" class="text-gold fw7">' + fmt(v.total) + '</div></div></div>' +
    (v.clienteDireccion ? '<div class="mb-12"><label>Dirección</label><div style="padding:9px 0">' + esc(v.clienteDireccion) + '</div></div>' : '') +
    '<hr class="divider"><h3>Items</h3>';

  (v.items || []).forEach(function(it) {
    body += '<div class="mov-row"><span>' + esc(it.nombre) + (it.frascoNombre ? ' <span class="text-xs text-muted">(' + esc(it.frascoNombre) + ')</span>' : '') + ' x' + it.cantidad + '</span><span class="text-gold">' + fmt(it.subtotal) + '</span></div>';
  });

  body += '<hr class="divider"><div class="cost-box mb-16"><div class="cost-row total"><span>Total</span><span>' + fmt(v.total) + '</span></div></div>';

  if (v.estado === 'pendiente') {
    body += '<div class="flex gap-8">' +
      '<button class="btn btn-green" onclick="cambiarEstadoVenta(' + v.id + ',\'completada\')">Completar</button>' +
      '<button class="btn btn-red" onclick="cambiarEstadoVenta(' + v.id + ',\'cancelada\')">Cancelar</button></div>';
  }

  openModal('Venta #' + v.id, body);
}

function cambiarEstadoVenta(id, nuevoEstado) {
  var db = getDB();
  var venta = db.ventas.find(function(v) { return v.id === id; });
  if (!venta) return;

  var estadoAnterior = venta.estado;
  venta.estado = nuevoEstado;

  // If cancelled and was completed/tienda, restore stock
  if (nuevoEstado === 'cancelada' && (estadoAnterior === 'completada' || estadoAnterior === 'pendiente')) {
    (venta.items || []).forEach(function(it) {
      if (it.tipo === 'especia') {
        var prod = db.productos.find(function(p) { return p.id === it.id; });
        if (prod) { prod.stock += it.cantidad; prod.actualizadoEn = new Date().toISOString(); }
      } else if (it.tipo === 'blend') {
        var blend = db.blends.find(function(b) { return b.id === it.id; });
        if (blend) { blend.stock += it.cantidad; blend.actualizadoEn = new Date().toISOString(); }
        // Restore frasco
        if (it.frascoId) {
          var frasco = db.productos.find(function(p) { return p.id === it.frascoId; });
          if (frasco) { frasco.stock += it.cantidad; frasco.actualizadoEn = new Date().toISOString(); }
        }
        // Restore etiqueta
        if (it.etiquetaId) {
          var etiqueta = db.productos.find(function(p) { return p.id === it.etiquetaId; });
          if (etiqueta) { etiqueta.stock += it.cantidad; etiqueta.actualizadoEn = new Date().toISOString(); }
        }
      }
    });
    addMovimiento('ajuste', 'ventas', venta.id, 'Devolución', 0, 'Venta #' + id + ' cancelada - stock restaurado');
  }

  saveDB();
  closeModal();
  renderVentas();
  toast('Venta actualizada');
}

function toggleTiendaOrders() {
  ventasFilter = 'pendiente';
  renderVentas();
}

// =====================================================
//  USUARIOS (Admin only)
// =====================================================
function renderUsuarios() {
  if (!currentUser || currentUser.rol !== 'admin') return;
  var db = getDB();
  var el = document.getElementById('page-usuarios');
  var usuarios = db.usuarios || [];

  var html = '<h1 class="page-title">Usuarios</h1>';
  html += '<div class="actions-row"><button class="btn btn-gold" onclick="modalNuevoUsuario()">+ Nuevo Usuario</button></div>';

  html += '<div class="g3">';
  usuarios.forEach(function(u) {
    var roleLabel = u.rol === 'admin' ? 'Admin' : (u.rol === 'operador' ? 'Operador' : 'Vendedor');
    var roleBadge = u.rol === 'admin' ? 'ba' : (u.rol === 'operador' ? 'bg' : 'by');
    html += '<div class="card">' +
      '<div class="flex justify-between items-center mb-12"><div class="user-avatar" style="width:42px;height:42px;font-size:1.2rem">' + esc(u.nombre.charAt(0)) + '</div>' +
      '<span class="badge ' + roleBadge + '">' + roleLabel + '</span></div>' +
      '<div class="fw7 mb-8" style="font-size:1rem">' + esc(u.nombre) + '</div>' +
      '<div class="text-xs text-muted mb-12">PIN: ' + esc(u.pin) + ' &bull; ' + (u.activo ? '<span class="text-green">Activo</span>' : '<span class="text-red">Inactivo</span>') + '</div>' +
      '<div class="flex gap-8">' +
        '<button class="btn btn-ghost btn-sm" onclick="modalEditarUsuario(' + u.id + ')">Editar</button>' +
        (u.rol !== 'admin' ? '<button class="btn btn-red btn-sm" onclick="toggleUsuarioActivo(' + u.id + ')">' + (u.activo ? 'Desactivar' : 'Activar') + '</button>' : '') +
      '</div></div>';
  });
  html += '</div>';

  el.innerHTML = html;
}

function usuarioFormHTML(u) {
  u = u || {};
  return '<div class="fr">' +
    '<div><label>Nombre</label><input id="usr-nombre" value="' + esc(u.nombre || '') + '" placeholder="Nombre"></div>' +
    '<div><label>PIN (4 dígitos)</label><input id="usr-pin" value="' + esc(u.pin || '') + '" maxlength="4" placeholder="1234"></div></div>' +
    '<div class="fr1" style="margin-bottom:12px"><label>Rol</label><select id="usr-rol">' + optHtml(ROLES, u.rol || 'operador') + '</select></div>' +
    (u.id ? '<div class="fr1" style="margin-bottom:12px"><label>Estado</label><select id="usr-activo"><option value="1"' + (u.activo !== false ? ' selected' : '') + '>Activo</option><option value="0"' + (u.activo === false ? ' selected' : '') + '>Inactivo</option></select></div>' : '') +
    '<div id="usr-alert" class="alert alert-err"></div>' +
    '<button class="btn btn-gold btn-full" onclick="guardarUsuario(' + (u.id || 0) + ')">' + (u.id ? 'Actualizar' : 'Crear') + ' Usuario</button>';
}

function modalNuevoUsuario() {
  openModal('Nuevo Usuario', usuarioFormHTML(null));
}

function modalEditarUsuario(id) {
  var db = getDB();
  var u = db.usuarios.find(function(x) { return x.id === id; });
  if (!u) return;
  openModal('Editar Usuario', usuarioFormHTML(u));
}

function guardarUsuario(existingId) {
  var nombre = document.getElementById('usr-nombre').value.trim();
  var pin = document.getElementById('usr-pin').value.trim();
  var rol = document.getElementById('usr-rol').value;
  var alertEl = document.getElementById('usr-alert');

  if (!nombre || !pin) {
    alertEl.textContent = 'Nombre y PIN son obligatorios';
    alertEl.className = 'alert alert-err show';
    return;
  }
  if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    alertEl.textContent = 'El PIN debe ser exactamente 4 dígitos';
    alertEl.className = 'alert alert-err show';
    return;
  }

  var db = getDB();

  if (existingId) {
    var usr = db.usuarios.find(function(u) { return u.id === existingId; });
    if (usr) {
      usr.nombre = nombre; usr.pin = pin; usr.rol = rol;
      var activoEl = document.getElementById('usr-activo');
      if (activoEl) usr.activo = activoEl.value === '1';
    }
  } else {
    db.usuarios.push({
      id: nextId(), nombre: nombre, pin: pin, rol: rol,
      activo: true, creadoEn: new Date().toISOString()
    });
  }

  saveDB();
  closeModal();
  renderUsuarios();
  toast(existingId ? 'Usuario actualizado' : 'Usuario creado');
}

function toggleUsuarioActivo(id) {
  var db = getDB();
  var usr = db.usuarios.find(function(u) { return u.id === id; });
  if (!usr) return;
  usr.activo = !usr.activo;
  saveDB();
  renderUsuarios();
  toast(usr.nombre + (usr.activo ? ' activado' : ' desactivado'));
}

// =====================================================
//  AJUSTES
// =====================================================
function renderAjustes() {
  var el = document.getElementById('page-ajustes');
  var db = getDB();

  var html = '<h1 class="page-title">Ajustes</h1>';

  // Sync status
  html += '<div class="section-title mb-12">Sincronización Firebase</div>';
  html += '<div class="card mb-20">' +
    '<div class="flex items-center gap-12 mb-12"><span id="ajustes-conn-badge" class="badge ' + (fbIsConnected() ? 'bg' : 'br') + '">' + (fbIsConnected() ? 'Conectado' : 'Desconectado') + '</span>' +
    '<span class="text-sm text-muted">Firebase Realtime Database</span></div>' +
    '<div class="flex gap-8">' +
      '<button class="btn btn-ghost btn-sm" onclick="fbForceReload()">Forzar Sincronización</button>' +
      '<button class="btn btn-red btn-sm" onclick="fbClearRemote()">Borrar Datos Remotos</button></div></div>';

  // Import / Export
  html += '<div class="section-title mb-12">Importar / Exportar Excel</div>';
  html += '<div class="card mb-20">';
  html += '<div class="mb-12"><label style="margin-bottom:8px">Importar catálogo desde Excel</label>' +
    '<div class="text-xs text-muted mb-8">Columnas esperadas: Blend (nombre), Categoría, Origen, Uso Principal, Perfil. Los productos se crean como tipo "especia" con precio $0. Luego editás los precios y stock.</div>' +
    '<input type="file" id="import-excel-input" accept=".xlsx,.xls,.csv" style="display:none" onchange="handleExcelImport(this)">' +
    '<button class="btn btn-gold btn-sm" onclick="document.getElementById(\'import-excel-input\').click()">Seleccionar Archivo Excel</button></div>';
  html += '<hr class="divider">';
  html += '<div class="flex gap-8" style="flex-wrap:wrap">';
  html += '<button class="btn btn-ghost btn-sm" onclick="exportarExcel(\'productos\')">Exportar Productos</button>';
  html += '<button class="btn btn-ghost btn-sm" onclick="exportarExcel(\'blends\')">Exportar Blends</button>';
  html += '<button class="btn btn-ghost btn-sm" onclick="exportarExcel(\'ventas\')">Exportar Ventas</button>';
  html += '<button class="btn btn-ghost btn-sm" onclick="exportarExcel(\'stock\')">Exportar Stock</button>';
  html += '<button class="btn btn-ghost btn-sm" onclick="exportarExcel(\'todo\')">Exportar Todo</button>';
  html += '</div></div>';

  // Data summary
  html += '<div class="section-title mb-12">Resumen de Datos</div>';
  html += '<div class="card mb-20">';
  var collections = [
    { name: 'Productos', count: (db.productos || []).length },
    { name: 'Compras', count: (db.compras || []).length },
    { name: 'Blends', count: (db.blends || []).length },
    { name: 'Ventas', count: (db.ventas || []).length },
    { name: 'Usuarios', count: (db.usuarios || []).length },
    { name: 'Movimientos', count: (db.movimientos || []).length }
  ];
  collections.forEach(function(c) {
    html += '<div class="mov-row"><span>' + esc(c.name) + '</span><span class="text-gold fw7">' + c.count + ' registros</span></div>';
  });
  html += '</div>';

  // Danger zone
  if (currentUser && currentUser.rol === 'admin') {
    html += '<div class="section-title mb-12">Zona de Peligro</div>';
    html += '<div class="card" style="border-color:var(--red)">' +
      '<div class="text-sm mb-12">Estas acciones no se pueden deshacer</div>' +
      '<div class="flex gap-8">' +
        '<button class="btn btn-red btn-sm" onclick="resetearMovimientos()">Limpiar Movimientos</button>' +
        '<button class="btn btn-red btn-sm" onclick="resetearTodo()">Resetear Todo</button></div></div>';
  }

  el.innerHTML = html;
}

// =====================================================
//  EXCEL IMPORT
// =====================================================
function handleExcelImport(input) {
  var file = input.files[0];
  if (!file) return;

  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var data = new Uint8Array(e.target.result);
      var workbook = XLSX.read(data, { type: 'array' });
      var firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      var rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

      if (rows.length === 0) {
        toast('El archivo está vacío', 'err');
        return;
      }

      // Detect column mapping
      var headers = Object.keys(rows[0]);
      var colMap = detectColumnMap(headers);

      if (!colMap.nombre) {
        toast('No se encontró columna de nombre (Blend/Nombre/Producto)', 'err');
        return;
      }

      // Show preview before importing
      showImportPreview(rows, colMap);

    } catch(err) {
      toast('Error al leer el archivo: ' + err.message, 'err');
      console.error('[Import]', err);
    }
  };
  reader.readAsArrayBuffer(file);
  input.value = ''; // Reset so same file can be re-selected
}

function detectColumnMap(headers) {
  var map = { nombre: null, categoria: null, origen: null, uso: null, perfil: null, precioCosto: null, precioVenta: null, stock: null, unidad: null };

  headers.forEach(function(h) {
    var hl = h.toLowerCase().trim();
    if (['blend', 'nombre', 'producto', 'name', 'especia', 'item'].indexOf(hl) !== -1) map.nombre = h;
    else if (['categoría', 'categoria', 'category', 'tipo', 'type'].indexOf(hl) !== -1) map.categoria = h;
    else if (['origen', 'origin', 'país', 'pais', 'procedencia'].indexOf(hl) !== -1) map.origen = h;
    else if (['uso principal', 'uso', 'use', 'aplicación', 'aplicacion'].indexOf(hl) !== -1) map.uso = h;
    else if (['perfil', 'profile', 'sabor', 'flavor'].indexOf(hl) !== -1) map.perfil = h;
    else if (['precio costo', 'costo', 'precio_compra', 'cost', 'precio de costo'].indexOf(hl) !== -1) map.precioCosto = h;
    else if (['precio venta', 'venta', 'precio', 'price', 'precio de venta'].indexOf(hl) !== -1) map.precioVenta = h;
    else if (['stock', 'cantidad', 'inventario', 'inventory', 'existencia'].indexOf(hl) !== -1) map.stock = h;
    else if (['unidad', 'unit', 'medida', 'um'].indexOf(hl) !== -1) map.unidad = h;
  });

  return map;
}

function showImportPreview(rows, colMap) {
  var previewRows = rows.slice(0, 8);
  var html = '<p class="text-sm text-muted mb-12">Se encontraron <strong class="text-gold">' + rows.length + '</strong> filas. Columnas detectadas:' +
    '<br>Nombre: <strong>' + esc(colMap.nombre || '-') + '</strong>' +
    (colMap.categoria ? ' | Categoría: <strong>' + esc(colMap.categoria) + '</strong>' : '') +
    (colMap.origen ? ' | Origen: <strong>' + esc(colMap.origen) + '</strong>' : '') +
    (colMap.uso ? ' | Uso: <strong>' + esc(colMap.uso) + '</strong>' : '') +
    (colMap.perfil ? ' | Perfil: <strong>' + esc(colMap.perfil) + '</strong>' : '') +
    (colMap.precioCosto ? ' | Costo: <strong>' + esc(colMap.precioCosto) + '</strong>' : '') +
    (colMap.precioVenta ? ' | Venta: <strong>' + esc(colMap.precioVenta) + '</strong>' : '') +
    (colMap.stock ? ' | Stock: <strong>' + esc(colMap.stock) + '</strong>' : '') +
    '</p>';

  html += '<div class="tw mb-16"><table><tr><th>Nombre</th><th>Categoría</th><th>Origen</th><th>Uso</th><th>Perfil</th></tr>';
  previewRows.forEach(function(r) {
    html += '<tr><td>' + esc(r[colMap.nombre] || '') + '</td>' +
      '<td>' + esc(r[colMap.categoria] || '') + '</td>' +
      '<td>' + esc(r[colMap.origen] || '') + '</td>' +
      '<td>' + esc(r[colMap.uso] || '') + '</td>' +
      '<td>' + esc(r[colMap.perfil] || '') + '</td></tr>';
  });
  if (rows.length > 8) html += '<tr><td colspan="5" class="text-muted text-center">... y ' + (rows.length - 8) + ' más</td></tr>';
  html += '</table></div>';

  html += '<div class="fr1" style="margin-bottom:12px"><label>Tipo de producto</label>' +
    '<select id="import-tipo">' + optHtml(PRODUCT_TYPES, 'especia') + '</select></div>';

  html += '<div class="fr"><label>Si el producto ya existe (por nombre):</label></div>';
  html += '<div class="fr mb-12"><label></label>' +
    '<select id="import-dupes"><option value="skip">Ignorar duplicados</option>' +
    '<option value="update">Actualizar existentes</option>' +
    '<option value="overwrite">Reemplazar todo</option></select></div>';

  html += '<div id="import-alert" class="alert alert-err"></div>';
  html += '<button class="btn btn-gold btn-full" onclick="executeImport()">Importar ' + rows.length + ' Productos</button>';

  // Store for later use
  window._importRows = rows;
  window._importColMap = colMap;

  openModal('Vista Previa de Importación', html);
}

function executeImport() {
  var rows = window._importRows;
  var colMap = window._importColMap;
  var tipo = document.getElementById('import-tipo').value;
  var dupeAction = document.getElementById('import-dupes').value;
  var alertEl = document.getElementById('import-alert');

  if (!rows || rows.length === 0) return;

  var db = getDB();
  var now = new Date().toISOString();
  var imported = 0, updated = 0, skipped = 0;

  // If overwrite, clear existing products of this type
  if (dupeAction === 'overwrite') {
    var before = db.productos.length;
    db.productos = db.productos.filter(function(p) { return p.tipo !== tipo; });
    toast('Eliminados ' + (before - db.productos.length) + ' productos de tipo ' + tipo);
  }

  rows.forEach(function(r) {
    var nombre = String(r[colMap.nombre] || '').trim();
    if (!nombre) return;

    var existing = db.productos.find(function(p) {
      return p.nombre.toLowerCase() === nombre.toLowerCase() && p.tipo === tipo;
    });

    if (existing) {
      if (dupeAction === 'skip') { skipped++; return; }
      // Update existing
      if (colMap.categoria) existing.categoria = String(r[colMap.categoria] || '').trim();
      if (colMap.origen) existing.origen = String(r[colMap.origen] || '').trim();
      if (colMap.uso) existing.usoPrincipal = String(r[colMap.uso] || '').trim();
      if (colMap.perfil) existing.perfil = String(r[colMap.perfil] || '').trim();
      if (colMap.precioCosto) existing.precioCosto = parseFloat(r[colMap.precioCosto]) || existing.precioCosto;
      if (colMap.precioVenta) existing.precioVenta = parseFloat(r[colMap.precioVenta]) || existing.precioVenta;
      if (colMap.stock) existing.stock = parseFloat(r[colMap.stock]) || existing.stock;
      if (colMap.unidad) existing.unidad = String(r[colMap.unidad] || '').trim();
      existing.actualizadoEn = now;
      updated++;
    } else {
      var notas = [];
      if (colMap.uso) notas.push('Uso: ' + String(r[colMap.uso] || '').trim());
      if (colMap.perfil) notas.push('Perfil: ' + String(r[colMap.perfil] || '').trim());

      var prod = {
        id: nextId(),
        nombre: nombre,
        tipo: tipo,
        unidad: colMap.unidad ? String(r[colMap.unidad] || 'gr').trim() : 'gr',
        precioCosto: colMap.precioCosto ? (parseFloat(r[colMap.precioCosto]) || 0) : 0,
        precioVenta: colMap.precioVenta ? (parseFloat(r[colMap.precioVenta]) || 0) : 0,
        stock: colMap.stock ? (parseFloat(r[colMap.stock]) || 0) : 0,
        stockMin: 0,
        proveedor: '',
        notas: notas.join(' | '),
        categoria: colMap.categoria ? String(r[colMap.categoria] || '').trim() : '',
        origen: colMap.origen ? String(r[colMap.origen] || '').trim() : '',
        usoPrincipal: colMap.uso ? String(r[colMap.uso] || '').trim() : '',
        perfil: colMap.perfil ? String(r[colMap.perfil] || '').trim() : '',
        creadoEn: now,
        actualizadoEn: now
      };
      db.productos.push(prod);
      imported++;
    }
  });

  saveDB();
  closeModal();
  renderAjustes();
  toast('Importados: ' + imported + ' | Actualizados: ' + updated + ' | Ignorados: ' + skipped);
}

// =====================================================
//  EXCEL EXPORT
// =====================================================
function exportarExcel(tipo) {
  var db = getDB();
  var wb = XLSX.utils.book_new();
  var fecha = new Date().toISOString().split('T')[0];

  if (tipo === 'productos' || tipo === 'todo') {
    var prods = (db.productos || []).map(function(p) {
      return {
        'ID': p.id,
        'Nombre': p.nombre,
        'Tipo': p.tipo,
        'Categoría': p.categoria || '',
        'Origen': p.origen || '',
        'Uso Principal': p.usoPrincipal || '',
        'Perfil': p.perfil || '',
        'Unidad': p.unidad,
        'Precio Costo': p.precioCosto || 0,
        'Precio Venta': p.precioVenta || 0,
        'Stock': p.stock || 0,
        'Stock Mínimo': p.stockMin || 0,
        'Proveedor': p.proveedor || '',
        'Notas': p.notas || ''
      };
    });
    var wsProd = XLSX.utils.json_to_sheet(prods);
    wsProd['!cols'] = [{ wch: 6 }, { wch: 30 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 24 }, { wch: 18 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 20 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsProd, 'Productos');
  }

  if (tipo === 'blends' || tipo === 'todo') {
    var blends = (db.blends || []).map(function(b) {
      var recetaStr = (b.receta || []).map(function(r) { return r.nombre + ' (' + r.cantidad + r.unidad + ')'; }).join(', ');
      return {
        'ID': b.id,
        'Nombre': b.nombre,
        'Descripción': b.descripcion || '',
        'Receta': recetaStr,
        'Costo Unitario': b.costoUnitario || calcBlendCost(b),
        'Precio Venta': b.precioVenta || 0,
        'Stock': b.stock || 0
      };
    });
    var wsBlend = XLSX.utils.json_to_sheet(blends);
    wsBlend['!cols'] = [{ wch: 6 }, { wch: 30 }, { wch: 30 }, { wch: 60 }, { wch: 16 }, { wch: 14 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsBlend, 'Blends');
  }

  if (tipo === 'ventas' || tipo === 'todo') {
    var ventas = (db.ventas || []).map(function(v) {
      var itemsStr = (v.items || []).map(function(i) { return i.nombre + ' x' + i.cantidad + ' (' + fmt(i.subtotal) + ')'; }).join(', ');
      return {
        'ID': v.id,
        'Fecha': fmtDateTime(v.fecha || v.creadoEn),
        'Tipo': v.tipo === 'tienda' ? 'Tienda' : 'Mostrador',
        'Cliente': v.clienteNombre || '',
        'Teléfono': v.clienteTelefono || '',
        'Dirección': v.clienteDireccion || '',
        'Items': itemsStr,
        'Total': v.total || 0,
        'Estado': v.estado || '',
        'Creado Por': v.creadoPor || ''
      };
    });
    var wsVentas = XLSX.utils.json_to_sheet(ventas);
    wsVentas['!cols'] = [{ wch: 6 }, { wch: 18 }, { wch: 12 }, { wch: 20 }, { wch: 16 }, { wch: 24 }, { wch: 60 }, { wch: 14 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsVentas, 'Ventas');
  }

  if (tipo === 'stock' || tipo === 'todo') {
    var stockRows = [];
    (db.productos || []).forEach(function(p) {
      var estado = p.stock <= (p.stockMin || 0) ? 'BAJO' : 'OK';
      stockRows.push({
        'Nombre': p.nombre,
        'Tipo': p.tipo,
        'Categoría': p.categoria || '',
        'Stock Actual': p.stock || 0,
        'Unidad': p.unidad,
        'Stock Mínimo': p.stockMin || 0,
        'Estado': estado,
        'Precio Venta': p.precioVenta || 0,
        'Valor en Stock': (p.stock || 0) * (p.precioCosto || 0)
      });
    });
    (db.blends || []).forEach(function(b) {
      stockRows.push({
        'Nombre': b.nombre,
        'Tipo': 'Blend',
        'Categoría': '',
        'Stock Actual': b.stock || 0,
        'Unidad': 'unidad',
        'Stock Mínimo': 0,
        'Estado': b.stock > 0 ? 'OK' : 'SIN STOCK',
        'Precio Venta': b.precioVenta || 0,
        'Valor en Stock': (b.stock || 0) * (b.costoUnitario || 0)
      });
    });
    var wsStock = XLSX.utils.json_to_sheet(stockRows);
    wsStock['!cols'] = [{ wch: 30 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsStock, 'Stock');
  }

  if (tipo === 'todo') {
    // Also add a summary sheet
    var totalVentas = (db.ventas || []).filter(function(v) { return v.estado !== 'cancelada'; }).reduce(function(s, v) { return s + (v.total || 0); }, 0);
    var totalCompras = (db.compras || []).filter(function(c) { return c.estado === 'recibida'; }).reduce(function(s, c) { return s + (c.total || 0); }, 0);
    var summary = [
      { 'Métrica': 'Total Productos', 'Valor': (db.productos || []).length },
      { 'Métrica': 'Total Blends', 'Valor': (db.blends || []).length },
      { 'Métrica': 'Total Ventas', 'Valor': (db.ventas || []).length },
      { 'Métrica': 'Total Compras', 'Valor': (db.compras || []).length },
      { 'Métrica': 'Ventas ($)', 'Valor': totalVentas },
      { 'Métrica': 'Compras ($)', 'Valor': totalCompras },
      { 'Métrica': 'Fecha Exportación', 'Valor': fecha }
    ];
    var wsSum = XLSX.utils.json_to_sheet(summary);
    wsSum['!cols'] = [{ wch: 24 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsSum, 'Resumen');
  }

  var fileName = 'Arcano_' + tipo + '_' + fecha + '.xlsx';
  XLSX.writeFile(wb, fileName);
  toast('Excel descargado: ' + fileName);
}

function resetearMovimientos() {
  if (!confirm('Borrar todos los movimientos?')) return;
  var db = getDB();
  db.movimientos = [];
  saveDB();
  renderAjustes();
  toast('Movimientos eliminados');
}

function resetearTodo() {
  if (!confirm('ATENCIÓN: Esto borrará TODOS los datos y reiniciará el sistema. Continuar?')) return;
  localStorage.removeItem(DB_KEY);
  _idC = 0;
  currentUser = null;
  sessionStorage.removeItem('arcano_user');
  location.reload();
}