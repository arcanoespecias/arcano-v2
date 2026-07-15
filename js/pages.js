// ===================== ARCANO ERP — PAGES (PART 1) =====================
// Storefront, Dashboard, Compras, Productos

// ---------- Helpers ----------
function jsEsc(s) {
  return esc(s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// ==================== 1. STOREFRONT ====================

var storeCategory = 'todos';

function renderStorefront() {
  // Build category list from active especias
  var db = getDB();
  var categories = ['todos', 'blends'];
  db.productos.forEach(function(p) {
    if (p.tipo === 'especia' && p.precioVenta > 0 && p.stock > 0 && p.categoria) {
      var found = false;
      categories.forEach(function(c) { if (c === p.categoria) found = true; });
      if (!found) categories.push(p.categoria);
    }
  });

  // Update category nav in the static HTML
  var storeNav = document.getElementById('store-nav');
  if (storeNav) {
    var navHtml = '';
    categories.forEach(function(cat) {
      var label = cat === 'todos' ? 'Todos' : cat === 'blends' ? 'Blends' : cat;
      var cls = (cat === storeCategory) ? ' store-nav-btn active' : ' store-nav-btn';
      navHtml += '<button class="' + cls + '" data-cat="' + esc(cat) + '">' + esc(label) + '</button>';
    });
    storeNav.innerHTML = navHtml;
    setupStoreNav();
  }

  renderStoreProducts();
  updateCartUI();
}

function setupStoreNav() {
  var btns = document.querySelectorAll('.store-nav-btn');
  btns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      storeCategory = btn.getAttribute('data-cat');
      btns.forEach(function(b) { b.classList.toggle('active', b === btn); });
      renderStoreProducts();
    });
  });
}

function renderStoreProducts() {
  var container = document.getElementById('store-products');
  var emptyEl = document.getElementById('store-empty');
  if (!container) return;

  var db = getDB();
  var html = '';
  var hasProducts = false;

  // --- Especias ---
  db.productos.forEach(function(p) {
    if (p.tipo !== 'especia') return;
    if (p.precioVenta <= 0 || p.stock <= 0) return;
    if (storeCategory !== 'todos' && storeCategory !== p.categoria) return;

    hasProducts = true;
    html += '<div class="product-card">' +
      '<div class="product-card-type">Especia</div>' +
      '<div class="product-card-name">' + esc(p.nombre) + '</div>' +
      '<div class="product-card-desc">' + esc(p.categoria || '') + '</div>' +
      '<div class="product-card-footer">' +
        '<div>' +
          '<div class="product-card-price">' + fmt(p.precioVenta) + '/gr</div>' +
          '<div class="product-card-stock">' + p.stock + ' gr disponibles</div>' +
        '</div>' +
        '<button class="btn-add-cart" onclick="addToCart(false,' + p.id + ',\'' + jsEsc(p.nombre) + '\',' + p.precioVenta + ',\'' + esc(p.unidad) + '\',' + p.stock + ')">Agregar</button>' +
      '</div>' +
      '</div>';
  });

  // --- Blends ---
  if (storeCategory === 'todos' || storeCategory === 'blends') {
    db.blends.forEach(function(b) {
      if (b.precioVenta <= 0 || (b.stock || 0) <= 0) return;

      var maxFrascoStock = 0;
      db.productos.forEach(function(p) {
        if (p.tipo === 'frasco' && p.stock > 0 && p.stock > maxFrascoStock) {
          maxFrascoStock = p.stock;
        }
      });

      var etiquetaStock = 999999;
      if (b.etiquetaId) {
        db.productos.forEach(function(p) {
          if (p.id === b.etiquetaId) etiquetaStock = p.stock;
        });
      }

      var efectivo = Math.min(b.stock || 0, maxFrascoStock, etiquetaStock);
      if (efectivo <= 0) return;

      hasProducts = true;
      html += '<div class="product-card">' +
        '<div class="product-card-type" style="color:#e55">Blend</div>' +
        '<div class="product-card-name">' + esc(b.nombre) + '</div>' +
        '<div class="product-card-desc">' + esc(b.formato || 'polvo') + ' - ' + (b.gramosPorUnidad || 100) + 'gr</div>' +
        '<div class="product-card-footer">' +
          '<div>' +
            '<div class="product-card-price">' + fmt(b.precioVenta) + '/und</div>' +
            '<div class="product-card-stock">' + efectivo + ' unidades</div>' +
          '</div>' +
          '<button class="btn-add-cart" onclick="mostrarSelectorFrasco(' + b.id + ',\'carrito\',\'' + jsEsc(b.nombre) + '\',' + b.precioVenta + ',' + efectivo + ')">Agregar</button>' +
        '</div>' +
        '</div>';
    });
  }

  container.innerHTML = html;
  if (emptyEl) emptyEl.style.display = hasProducts ? 'none' : 'block';
}

function addToCart(isBlend, id, nombre, precio, unidad, stock) {
  var existingIdx = -1;
  cart.forEach(function(item, idx) {
    if (!item.isBlend && !isBlend && item.id === id) {
      existingIdx = idx;
    }
  });

  if (existingIdx >= 0) {
    if (cart[existingIdx].qty < cart[existingIdx].maxStock) {
      cart[existingIdx].qty++;
    } else {
      toast('Stock maximo alcanzado', 'err');
      return;
    }
  } else {
    cart.push({
      isBlend: false,
      id: id,
      nombre: nombre,
      precio: precio,
      unidad: unidad,
      qty: 1,
      maxStock: stock
    });
  }

  updateCartUI();
  toast(nombre + ' agregado al carrito');
}

function mostrarSelectorFrasco(blendId, contexto, nombre, precio, stock) {
  var db = getDB();
  var frascos = [];
  db.productos.forEach(function(p) {
    if (p.tipo === 'frasco' && p.stock > 0) frascos.push(p);
  });

  if (frascos.length === 0) {
    toast('No hay frascos disponibles', 'err');
    return;
  }

  var html = '<p class="mb-2">Seleccione un frasco para <strong>' + esc(nombre) + '</strong></p>' +
    '<p>Precio: ' + fmt(precio) + ' / unidad</p><div class="frasco-list">';

  frascos.forEach(function(f) {
    var disponible = Math.min(stock, f.stock);
    if (disponible <= 0) return;
    html += '<div class="frasco-option">' +
      '<div><strong>' + esc(f.nombre) + '</strong><br>Disponible: ' + disponible + ' unidades</div>' +
      '<button class="btn btn-primary btn-sm" onclick="confirmarFrasco(' + blendId + ',' + f.id + ',\'' + jsEsc(contexto) + '\',' + precio + ',' + stock + ')">Seleccionar</button>' +
      '</div>';
  });

  html += '</div>';
  openModal('Seleccionar Frasco', html);
}

function confirmarFrasco(blendId, frascoId, contexto, precio, stock) {
  var db = getDB();
  var blend = null;
  db.blends.forEach(function(b) { if (b.id === blendId) blend = b; });
  if (!blend) return;

  var frasco = null;
  db.productos.forEach(function(p) { if (p.id === frascoId) frasco = p; });
  if (!frasco) return;

  var etiquetaStock = 999999;
  if (blend.etiquetaId) {
    db.productos.forEach(function(p) {
      if (p.id === blend.etiquetaId) etiquetaStock = p.stock;
    });
  }

  var disponible = Math.min(blend.stock, frasco.stock, etiquetaStock);
  if (disponible <= 0) {
    toast('No hay stock suficiente', 'err');
    closeModal();
    return;
  }

  if (contexto === 'carrito') {
    var existingIdx = -1;
    cart.forEach(function(item, idx) {
      if (item.isBlend && item.id === blendId && item.frascoId === frascoId) {
        existingIdx = idx;
      }
    });

    if (existingIdx >= 0) {
      if (cart[existingIdx].qty < cart[existingIdx].maxStock) {
        cart[existingIdx].qty++;
      } else {
        toast('Stock maximo alcanzado', 'err');
        closeModal();
        return;
      }
    } else {
      cart.push({
        isBlend: true,
        id: blendId,
        nombre: blend.nombre,
        precio: precio,
        unidad: 'unidad',
        qty: 1,
        maxStock: disponible,
        frascoId: frascoId,
        frascoNombre: frasco.nombre,
        etiquetaId: blend.etiquetaId || null
      });
    }

    updateCartUI();
    toast(blend.nombre + ' agregado al carrito');
  } else if (contexto === 'venta') {
    if (typeof agregarBlendAVenta === 'function') {
      agregarBlendAVenta(blendId, frascoId, blend.nombre, precio, disponible);
    }
    closeModal();
    return;
  }

  closeModal();
}

function updateCartUI() {
  var countEl = document.getElementById('cart-count');
  var total = 0;
  cart.forEach(function(item) { total += item.qty; });
  if (countEl) {
    countEl.textContent = total;
    countEl.style.display = total > 0 ? 'inline' : 'none';
  }
}

function cartQty(idx, delta) {
  if (!cart[idx]) return;
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) {
    cart.splice(idx, 1);
  } else if (cart[idx].qty > cart[idx].maxStock) {
    cart[idx].qty = cart[idx].maxStock;
    toast('Stock maximo alcanzado', 'err');
  }
  updateCartUI();
  renderCartDrawer();
}

function toggleCart() {
  var overlay = document.getElementById('cart-overlay');
  var drawer = document.getElementById('cart-drawer');
  if (!overlay || !drawer) return;

  var isOpen = drawer.classList.contains('open');
  if (isOpen) {
    drawer.classList.remove('open');
    overlay.classList.remove('open');
  } else {
    // Populate drawer content
    renderCartDrawer();
    drawer.classList.add('open');
    overlay.classList.add('open');
  }
}

function renderCartDrawer() {
  var itemsEl = document.getElementById('cart-items');
  var footerEl = document.getElementById('cart-footer');
  if (!itemsEl) return;

  if (cart.length === 0) {
    itemsEl.innerHTML = '<p style="padding:24px;text-align:center;color:var(--muted)">El carrito esta vacio</p>';
    if (footerEl) footerEl.style.display = 'none';
    return;
  }

  var html = '';
  var total = 0;
  cart.forEach(function(item, idx) {
    var subtotal = item.precio * item.qty;
    total += subtotal;
    html += '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">' +
      '<div style="flex:1">' +
        '<div style="font-weight:700;font-size:.88rem">' + esc(item.nombre) + '</div>' +
        '<div style="font-size:.75rem;color:var(--muted)">' + fmt(item.precio) + ' x ' + item.qty + ' = ' + fmt(subtotal) + '</div>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:6px">' +
        '<button class="btn-icon" onclick="cartQty(' + idx + ',-1)" style="width:28px;height:28px;font-size:1rem">-</button>' +
        '<span style="min-width:20px;text-align:center;font-weight:700">' + item.qty + '</span>' +
        '<button class="btn-icon" onclick="cartQty(' + idx + ',1)" style="width:28px;height:28px;font-size:1rem">+</button>' +
        '<button class="btn-icon" onclick="cart.splice(' + idx + ',1);updateCartUI();toggleCart()" style="width:28px;height:28px;font-size:1rem;color:var(--red)">&times;</button>' +
      '</div></div>';
  });

  itemsEl.innerHTML = html;
  if (footerEl) {
    footerEl.style.display = 'block';
    var totalEl = document.getElementById('cart-total-val');
    if (totalEl) totalEl.textContent = fmt(total);
  }
}

function showCheckout() {
  var html = '<div class="cart-detail">';
  var total = 0;

  if (cart.length === 0) {
    html += '<p class="empty-msg">El carrito esta vacio</p>';
  } else {
    html += '<div class="cart-items">';
    cart.forEach(function(item, idx) {
      var subtotal = item.precio * item.qty;
      total += subtotal;
      html += '<div class="cart-item">' +
        '<div class="cart-item-info">' +
        '<strong>' + esc(item.nombre) + '</strong>' +
        (item.isBlend && item.frascoNombre ? ' <span class="text-sm text-muted">(' + esc(item.frascoNombre) + ')</span>' : '') +
        '<br><span class="text-sm">' + fmt(item.precio) + ' x ' + item.qty + ' = ' + fmt(subtotal) + '</span>' +
        '</div>' +
        '<div class="cart-item-actions">' +
        '<button class="btn-icon" onclick="cartQty(' + idx + ',-1)">-</button>' +
        '<span class="cart-qty-num">' + item.qty + '</span>' +
        '<button class="btn-icon" onclick="cartQty(' + idx + ',1)">+</button>' +
        '<button class="btn-icon text-danger" onclick="cart.splice(' + idx + ',1);updateCartUI();showCheckout()">&times;</button>' +
        '</div></div>';
    });
    html += '</div>';
  }

  html += '<div class="cart-total"><strong>Total:</strong> ' + fmt(total) + '</div>';
  if (cart.length > 0) {
    html += '<button class="btn btn-primary btn-block" onclick="submitOrder()">Confirmar Pedido</button>';
  }
  html += '</div>';

  openModal('Carrito', html);
}

function submitOrder() {
  if (!cart || cart.length === 0) {
    toast('El carrito esta vacio', 'err');
    return;
  }

  var db = getDB();
  var total = 0;
  var items = [];

  cart.forEach(function(ci) {
    var subtotal = ci.precio * ci.qty;
    total += subtotal;
    items.push({
      isBlend: ci.isBlend,
      id: ci.id,
      nombre: ci.nombre,
      precio: ci.precio,
      unidad: ci.unidad,
      qty: ci.qty,
      frascoId: ci.frascoId || null,
      frascoNombre: ci.frascoNombre || '',
      etiquetaId: ci.etiquetaId || null,
      subtotal: subtotal
    });
  });

  var venta = {
    id: nextId(),
    estado: 'pendiente',
    tipo: 'tienda',
    creadoPor: null,
    fecha: new Date().toISOString(),
    cliente: 'Tienda Online',
    items: items,
    total: total,
    notas: ''
  };
  db.ventas.push(venta);

  // Process stock deductions
  cart.forEach(function(ci) {
    if (!ci.isBlend) {
      // Especia: deduct stock from product
      db.productos.forEach(function(p) {
        if (p.id === ci.id) {
          p.stock -= ci.qty;
          addMovimiento('venta', p.id, p.nombre, -ci.qty, 'Venta tienda #' + venta.id);
        }
      });
    } else {
      // Blend: deduct blend stock
      db.blends.forEach(function(b) {
        if (b.id === ci.id) {
          b.stock -= ci.qty;
          addMovimiento('venta', b.id, b.nombre, -ci.qty, 'Venta tienda blend #' + venta.id);
        }
      });
      // Deduct frasco stock
      if (ci.frascoId) {
        db.productos.forEach(function(p) {
          if (p.id === ci.frascoId) {
            p.stock -= ci.qty;
            addMovimiento('venta', p.id, p.nombre, -ci.qty, 'Frasco para venta #' + venta.id);
          }
        });
      }
      // Deduct etiqueta stock
      if (ci.etiquetaId) {
        db.productos.forEach(function(p) {
          if (p.id === ci.etiquetaId) {
            p.stock -= ci.qty;
            addMovimiento('venta', p.id, p.nombre, -ci.qty, 'Etiqueta para venta #' + venta.id);
          }
        });
      }
    }
  });

  cart = [];
  saveDB();
  // Close drawer if open
  var drawer = document.getElementById('cart-drawer');
  var overlay = document.getElementById('cart-overlay');
  if (drawer) drawer.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
  toast('Pedido #' + venta.id + ' creado exitosamente');
  renderStorefront();
}

// ==================== 2. DASHBOARD ====================

function statCard(label, value, sub) {
  return '<div class="stat-card">' +
    '<div class="stat-value">' + value + '</div>' +
    '<div class="stat-label">' + esc(label) + '</div>' +
    (sub ? '<div class="stat-sub">' + esc(sub) + '</div>' : '') +
    '</div>';
}

function renderDashboard() {
  var el = document.getElementById('page-dashboard');
  if (!el) return;

  var db = getDB();

  // KPI 1: Ventas Totales (non-cancelled)
  var ventasTotal = 0;
  db.ventas.forEach(function(v) {
    if (v.estado !== 'cancelada') ventasTotal += (v.total || 0);
  });

  // KPI 2: Compras (recibidas)
  var comprasTotal = 0;
  db.compras.forEach(function(c) {
    if (c.estado === 'recibida') comprasTotal += (c.total || 0);
  });

  // KPI 3: Especias count + total items
  var especiaCount = 0;
  var totalItems = 0;
  db.productos.forEach(function(p) {
    if (p.tipo === 'especia') especiaCount++;
    totalItems++;
  });

  // KPI 4: Blends count
  var blendCount = db.blends.length;

  // Alerts
  var pendientes = 0;
  db.ventas.forEach(function(v) { if (v.estado === 'pendiente') pendientes++; });

  var lowStock = [];
  db.productos.forEach(function(p) {
    if (p.tipo === 'especia' && p.stock <= (p.stockMin || 0)) {
      lowStock.push(p);
    }
  });

  // Build HTML
  var html = '<div class="g4">' +
    statCard('Ventas Totales', fmt(ventasTotal), 'Ingreso total') +
    statCard('Compras', fmt(comprasTotal), 'Recibidas') +
    statCard('Especias', String(especiaCount), totalItems + ' productos total') +
    statCard('Blends', String(blendCount), 'Mezclas activas') +
    '</div>';

  // Alerts section
  html += '<div class="alerts-section">';
  if (pendientes > 0) {
    html += '<div class="alert-card"><div><strong>' + pendientes + ' ventas pendientes</strong></div>' +
      '<button class="btn btn-primary btn-sm" onclick="navigateTo(\'ventas\')">Ver Ventas</button></div>';
  }
  if (lowStock.length > 0) {
    html += '<div class="alert-card alert-warn"><div><strong>' + lowStock.length + ' productos con stock bajo</strong></div>' +
      '<button class="btn btn-warn btn-sm" onclick="navigateTo(\'productos\')">Ver Stock</button></div>';
  }
  if (pendientes === 0 && lowStock.length === 0) {
    html += '<div class="alert-card"><div>Todo al dia</div></div>';
  }
  html += '</div>';

  // Recent ventas table (latest 5)
  var sortedVentas = db.ventas.slice().sort(function(a, b) {
    return new Date(b.fecha) - new Date(a.fecha);
  });
  var recentVentas = sortedVentas.slice(0, 5);

  html += '<h3 class="section-title">Ventas Recientes</h3>';
  if (recentVentas.length === 0) {
    html += '<p class="empty-msg">No hay ventas registradas</p>';
  } else {
    html += '<div class="table-wrap"><table><thead><tr>' +
      '<th>Fecha</th><th>Cliente</th><th>Total</th><th>Estado</th>' +
      '</tr></thead><tbody>';
    recentVentas.forEach(function(v) {
      var badgeCls = v.estado === 'completada' ? 'badge bg' : v.estado === 'cancelada' ? 'badge br' : 'badge by';
      html += '<tr>' +
        '<td>' + fmtDateTime(v.fecha) + '</td>' +
        '<td>' + esc(v.cliente || 'Tienda') + '</td>' +
        '<td>' + fmt(v.total) + '</td>' +
        '<td><span class="' + badgeCls + '">' + esc(v.estado) + '</span></td>' +
        '</tr>';
    });
    html += '</tbody></table></div>';
  }

  // Recent movimientos (latest 8)
  var sortedMovs = db.movimientos.slice().sort(function(a, b) {
    return new Date(b.fecha) - new Date(a.fecha);
  });
  var recentMovs = sortedMovs.slice(0, 8);

  html += '<h3 class="section-title">Movimientos Recientes</h3>';
  if (recentMovs.length === 0) {
    html += '<p class="empty-msg">No hay movimientos registrados</p>';
  } else {
    html += '<div class="mov-list">';
    recentMovs.forEach(function(m) {
      var sign = m.cantidad > 0 ? '+' : '';
      var cls = m.cantidad > 0 ? 'mov-in' : 'mov-out';
      html += '<div class="mov-row ' + cls + '">' +
        '<span class="mov-qty">' + sign + m.cantidad + '</span>' +
        '<span class="mov-name">' + esc(m.producto) + '</span>' +
        '<span class="mov-det">' + esc(m.detalle) + '</span>' +
        '<span class="mov-date">' + fmtDateTime(m.fecha) + '</span>' +
        '</div>';
    });
    html += '</div>';
  }

  el.innerHTML = html;
}

// ==================== 3. COMPRAS ====================

var comprasFilter = 'todos';

function renderCompras() {
  var el = document.getElementById('page-compras');
  if (!el) return;

  var db = getDB();

  // Filter
  var filtered = db.compras;
  if (comprasFilter !== 'todos') {
    filtered = db.compras.filter(function(c) { return c.estado === comprasFilter; });
  }

  // Sort by date desc
  filtered = filtered.slice().sort(function(a, b) {
    return new Date(b.fecha) - new Date(a.fecha);
  });

  var html = '<div class="page-header">' +
    '<h2>Compras</h2>' +
    '<button class="btn btn-primary" onclick="modalNuevaCompra()">+ Nueva Compra</button>' +
    '</div>';

  // Tabs
  html += '<div class="tabs">';
  var tabs = [
    { val: 'todos', label: 'Todas' },
    { val: 'pendiente', label: 'Pendiente' },
    { val: 'recibida', label: 'Recibida' },
    { val: 'cancelada', label: 'Cancelada' }
  ];
  tabs.forEach(function(t) {
    var cls = (t.val === comprasFilter) ? ' tab-btn active' : ' tab-btn';
    html += '<button class="' + cls + '" onclick="comprasFilter=\'' + t.val + '\';renderCompras()">' + esc(t.label) + '</button>';
  });
  html += '</div>';

  // Table
  if (filtered.length === 0) {
    html += '<p class="empty-msg">No hay compras</p>';
  } else {
    html += '<div class="table-wrap"><table><thead><tr>' +
      '<th>Fecha</th><th>Proveedor</th><th>Items</th><th>Total</th><th>Estado</th><th></th>' +
      '</tr></thead><tbody>';
    filtered.forEach(function(c) {
      var badgeCls = c.estado === 'recibida' ? 'badge bg' : c.estado === 'cancelada' ? 'badge br' : 'badge by';
      var itemCount = (c.items || []).length;
      html += '<tr>' +
        '<td>' + fmtDate(c.fecha) + '</td>' +
        '<td>' + esc(c.proveedor || '-') + '</td>' +
        '<td>' + itemCount + '</td>' +
        '<td>' + fmt(c.total) + '</td>' +
        '<td><span class="' + badgeCls + '">' + esc(c.estado) + '</span></td>' +
        '<td><button class="btn btn-sm" onclick="modalVerCompra(' + c.id + ')">Ver</button></td>' +
        '</tr>';
    });
    html += '</tbody></table></div>';
  }

  el.innerHTML = html;
}

function modalNuevaCompra() {
  var today = new Date().toISOString().split('T')[0];
  var html = '<div class="form-stack">' +
    '<div class="form-group"><label>Fecha</label>' +
    '<input type="date" id="cmp-fecha" value="' + today + '"></div>' +
    '<div class="form-group"><label>Proveedor</label>' +
    '<input type="text" id="cmp-proveedor" placeholder="Nombre del proveedor"></div>' +
    '<div class="form-group"><label>Notas</label>' +
    '<input type="text" id="cmp-notas" placeholder="Notas opcionales"></div>' +
    '<div class="form-group"><label>Productos</label>' +
    '<div id="compra-items"></div>' +
    '<button class="btn btn-sm btn-outline" onclick="addCompraItemRow()">+ Agregar Item</button></div>' +
    '<div class="form-group"><label><input type="checkbox" id="cmp-recibida"> Marcar como recibida</label></div>' +
    '<p><strong>Total:</strong> <span id="compra-total">$0</span></p>' +
    '<button class="btn btn-primary" onclick="guardarCompra()">Guardar Compra</button>' +
    '</div>';

  openModal('Nueva Compra', html);
  addCompraItemRow();
}

function addCompraItemRow() {
  var container = document.getElementById('compra-items');
  if (!container) return;

  var db = getDB();
  var opts = '<option value="">-- Producto --</option>';
  db.productos.forEach(function(p) {
    var tipoLabel = p.tipo === 'especia' ? 'Especia' : p.tipo === 'frasco' ? 'Frasco' : 'Etiqueta';
    opts += '<option value="' + p.id + '">' + esc(p.nombre) + ' (' + tipoLabel + ')</option>';
  });

  var row = document.createElement('div');
  row.className = 'compra-item-row';
  row.innerHTML = '<select onchange="cmpItemChanged(this)">' + opts + '</select>' +
    '<input type="number" min="0" step="any" placeholder="Cant." onchange="cmpItemChanged(this)" oninput="cmpItemChanged(this)">' +
    '<input type="number" min="0" step="any" placeholder="$ Unitario" onchange="cmpItemChanged(this)" oninput="cmpItemChanged(this)">' +
    '<span class="subtotal-display">$0</span>' +
    '<button class="btn-icon" onclick="this.parentElement.remove();calcCompraTotal()">&times;</button>';

  container.appendChild(row);
}

function cmpItemChanged(el) {
  var row = el.parentElement;
  if (!row) return;

  var inputs = row.querySelectorAll('input');
  var cantidad = Number(inputs[0].value) || 0;
  var precioUnit = Number(inputs[1].value) || 0;
  var subtotal = cantidad * precioUnit;

  var subtotalSpan = row.querySelector('.subtotal-display');
  if (subtotalSpan) subtotalSpan.textContent = fmt(subtotal);

  calcCompraTotal();
}

function calcCompraTotal() {
  var container = document.getElementById('compra-items');
  if (!container) return;

  var total = 0;
  container.querySelectorAll('.compra-item-row').forEach(function(row) {
    var inputs = row.querySelectorAll('input');
    var cantidad = Number(inputs[0].value) || 0;
    var precioUnit = Number(inputs[1].value) || 0;
    total += cantidad * precioUnit;
  });

  var totalEl = document.getElementById('compra-total');
  if (totalEl) totalEl.textContent = fmt(total);
}

function guardarCompra() {
  var fecha = document.getElementById('cmp-fecha').value;
  var proveedor = (document.getElementById('cmp-proveedor').value || '').trim();
  var notas = (document.getElementById('cmp-notas').value || '').trim();
  var esRecibida = document.getElementById('cmp-recibida').checked;

  var container = document.getElementById('compra-items');
  var rows = container.querySelectorAll('.compra-item-row');
  var items = [];
  var total = 0;

  var db = getDB();

  rows.forEach(function(row) {
    var select = row.querySelector('select');
    var inputs = row.querySelectorAll('input');
    var productId = Number(select.value);
    var cantidad = Number(inputs[0].value) || 0;
    var precioUnit = Number(inputs[1].value) || 0;

    if (productId && cantidad > 0) {
      var producto = null;
      db.productos.forEach(function(p) { if (p.id === productId) producto = p; });
      if (!producto) return;

      var subtotal = cantidad * precioUnit;
      total += subtotal;
      items.push({
        productoId: productId,
        productoNombre: producto.nombre,
        cantidad: cantidad,
        precioUnitario: precioUnit,
        subtotal: subtotal
      });
    }
  });

  if (items.length === 0) {
    toast('Agregue al menos un producto valido', 'err');
    return;
  }

  var compra = {
    id: nextId(),
    fecha: fecha || new Date().toISOString(),
    proveedor: proveedor,
    notas: notas,
    estado: esRecibida ? 'recibida' : 'pendiente',
    items: items,
    total: total,
    creadoPor: currentUser ? currentUser.id : null,
    creadoEn: new Date().toISOString()
  };

  db.compras.push(compra);

  // If received, add stock to each product
  if (esRecibida) {
    items.forEach(function(item) {
      db.productos.forEach(function(p) {
        if (p.id === item.productoId) {
          p.stock += item.cantidad;
          addMovimiento('compra', p.id, p.nombre, item.cantidad, 'Compra #' + compra.id + ' recibida');
        }
      });
    });
  }

  saveDB();
  closeModal();
  toast('Compra #' + compra.id + ' registrada');
  renderCompras();
}

function modalVerCompra(id) {
  var db = getDB();
  var compra = null;
  db.compras.forEach(function(c) { if (c.id === id) compra = c; });
  if (!compra) return;

  var badgeCls = compra.estado === 'recibida' ? 'badge bg' : compra.estado === 'cancelada' ? 'badge br' : 'badge by';

  var html = '<div class="compra-detail">';
  html += '<p><strong>Fecha:</strong> ' + fmtDate(compra.fecha) + '</p>';
  html += '<p><strong>Proveedor:</strong> ' + esc(compra.proveedor || '-') + '</p>';
  html += '<p><strong>Estado:</strong> <span class="' + badgeCls + '">' + esc(compra.estado) + '</span></p>';
  if (compra.notas) {
    html += '<p><strong>Notas:</strong> ' + esc(compra.notas) + '</p>';
  }

  html += '<div class="table-wrap mt-2"><table><thead><tr>' +
    '<th>Producto</th><th>Cant.</th><th>P. Unit.</th><th>Subtotal</th>' +
    '</tr></thead><tbody>';
  (compra.items || []).forEach(function(item) {
    html += '<tr>' +
      '<td>' + esc(item.productoNombre) + '</td>' +
      '<td>' + item.cantidad + '</td>' +
      '<td>' + fmt(item.precioUnitario) + '</td>' +
      '<td>' + fmt(item.subtotal) + '</td>' +
      '</tr>';
  });
  html += '</tbody></table></div>';
  html += '<p class="total-line"><strong>Total:</strong> ' + fmt(compra.total) + '</p>';

  // Estado change buttons
  html += '<div class="btn-row mt-2">';
  if (compra.estado === 'pendiente') {
    html += '<button class="btn btn-primary" onclick="cambiarEstadoCompra(' + id + ',\'recibida\')">Marcar Recibida</button> ';
    html += '<button class="btn btn-danger" onclick="cambiarEstadoCompra(' + id + ',\'cancelada\')">Cancelar</button>';
  } else if (compra.estado === 'recibida') {
    html += '<button class="btn btn-danger" onclick="cambiarEstadoCompra(' + id + ',\'cancelada\')">Cancelar</button>';
  } else if (compra.estado === 'cancelada') {
    html += '<button class="btn btn-primary" onclick="cambiarEstadoCompra(' + id + ',\'pendiente\')">Reactivar</button>';
  }
  html += '</div>';

  html += '</div>';
  openModal('Compra #' + compra.id, html);
}

function cambiarEstadoCompra(id, nuevoEstado) {
  var db = getDB();
  var compra = null;
  db.compras.forEach(function(c) { if (c.id === id) compra = c; });
  if (!compra) return;

  var oldEstado = compra.estado;
  if (oldEstado === nuevoEstado) return;

  // Changing TO recibida: add stock to products
  if (nuevoEstado === 'recibida' && oldEstado !== 'recibida') {
    (compra.items || []).forEach(function(item) {
      db.productos.forEach(function(p) {
        if (p.id === item.productoId) {
          p.stock += item.cantidad;
          addMovimiento('compra', p.id, p.nombre, item.cantidad, 'Compra #' + compra.id + ' recibida');
        }
      });
    });
  }

  // Changing FROM recibida to something else: reverse stock addition
  if (oldEstado === 'recibida' && nuevoEstado !== 'recibida') {
    (compra.items || []).forEach(function(item) {
      db.productos.forEach(function(p) {
        if (p.id === item.productoId) {
          p.stock -= item.cantidad;
          addMovimiento('ajuste', p.id, p.nombre, -item.cantidad, 'Reversion compra #' + compra.id);
        }
      });
    });
  }

  compra.estado = nuevoEstado;
  saveDB();
  closeModal();
  toast('Estado actualizado a ' + nuevoEstado);
  renderCompras();
}

// ==================== 4. PRODUCTOS ====================

var productosFilter = 'todos';

function renderProductos() {
  var el = document.getElementById('page-productos');
  if (!el) return;

  var db = getDB();

  // Filter
  var filtered = db.productos;
  if (productosFilter !== 'todos') {
    filtered = db.productos.filter(function(p) { return p.tipo === productosFilter; });
  }

  var html = '<div class="page-header">' +
    '<h2>Productos</h2>' +
    '<button class="btn btn-primary" onclick="openModal(\'Nuevo Producto\', productoFormHTML(null))">+ Nuevo Producto</button>' +
    '</div>';

  // Tabs
  html += '<div class="tabs">';
  var tabs = [
    { val: 'todos', label: 'Todos' },
    { val: 'especia', label: 'Especia' },
    { val: 'frasco', label: 'Frasco' },
    { val: 'etiqueta', label: 'Etiqueta' }
  ];
  tabs.forEach(function(t) {
    var cls = (t.val === productosFilter) ? ' tab-btn active' : ' tab-btn';
    html += '<button class="' + cls + '" onclick="productosFilter=\'' + t.val + '\';renderProductos()">' + esc(t.label) + '</button>';
  });
  html += '</div>';

  // Products list
  if (filtered.length === 0) {
    html += '<p class="empty-msg">No hay productos</p>';
  } else {
    html += '<div class="mov-list">';
    filtered.forEach(function(p) {
      var badgeCls = p.tipo === 'especia' ? 'ba' : p.tipo === 'frasco' ? 'bg' : 'by';
      var badgeLabel = p.tipo === 'especia' ? 'Especia' : p.tipo === 'frasco' ? 'Frasco' : 'Etiqueta';

      html += '<div class="mov-row">';
      html += '<div class="mov-info">' +
        '<strong>' + esc(p.nombre) + '</strong> ' +
        '<span class="badge ' + badgeCls + '">' + badgeLabel + '</span>';

      if (p.tipo === 'especia') {
        html += '<br>Costo: ' + fmt(p.costoPor1000gr) + '/1000gr';
        html += ' | Stock: ' + p.stock + ' gr';
        html += ' | Min: ' + (p.stockMin || 0) + ' gr';
        if (p.precioVenta) html += ' | Venta: ' + fmt(p.precioVenta) + '/gr';
      } else {
        html += '<br>Costo: ' + fmt(p.precioCosto) + '/unidad';
        html += ' | Stock: ' + p.stock + ' unidades';
        html += ' | Min: ' + (p.stockMin || 0);
      }

      html += '</div>';
      html += '<div class="mov-actions">' +
        '<button class="btn btn-sm" onclick="editarProducto(' + p.id + ')">Editar</button> ' +
        '<button class="btn btn-sm btn-danger" onclick="eliminarProducto(' + p.id + ')">Eliminar</button>' +
        '</div>';
      html += '</div>';
    });
    html += '</div>';
  }

  el.innerHTML = html;
}

function productoFormHTML(producto) {
  var nombre = producto ? producto.nombre || '' : '';
  var tipo = producto ? producto.tipo || 'especia' : 'especia';
  var costoPor1000gr = producto ? producto.costoPor1000gr || '' : '';
  var precioVenta = producto ? producto.precioVenta || '' : '';
  var categoria = producto ? producto.categoria || '' : '';
  var precioCosto = producto ? producto.precioCosto || '' : '';
  var stock = producto ? producto.stock || '' : '';
  var stockMin = producto ? producto.stockMin || '' : '';
  var proveedor = producto ? producto.proveedor || '' : '';
  var notas = producto ? producto.notas || '' : '';

  var isEspecia = tipo === 'especia';
  var especiaDisplay = isEspecia ? 'block' : 'none';
  var insumoDisplay = isEspecia ? 'none' : 'block';

  var html = '<div class="form-stack">';

  // Nombre
  html += '<div class="form-group"><label>Nombre *</label>' +
    '<input type="text" id="pf-nombre" value="' + esc(nombre) + '" required></div>';

  // Tipo
  html += '<div class="form-group"><label>Tipo</label>' +
    '<select id="pf-tipo" onchange="updateProductoFormFields()">' +
    optHtml(PRODUCT_TYPES, tipo) + '</select></div>';

  // --- Especia-specific fields ---
  html += '<div id="pf-especia-fields" style="display:' + especiaDisplay + '">' +
    '<div class="form-group"><label>Costo por 1000gr ($)</label>' +
    '<input type="number" id="pf-costoPor1000gr" value="' + costoPor1000gr + '" placeholder="Ej: 45000" min="0"></div>' +
    '<div class="form-group"><label>Precio venta por gr ($)</label>' +
    '<input type="number" id="pf-precioVenta" value="' + precioVenta + '" min="0"></div>' +
    '<div class="form-group"><label>Categoria</label>' +
    '<input type="text" id="pf-categoria" value="' + esc(categoria) + '" placeholder="Gastronomia, Infusion, Cocteleria"></div>' +
    '<div class="form-group"><label>Stock (gr)</label>' +
    '<input type="number" name="pf-stock" value="' + stock + '" min="0"></div>' +
    '<div class="form-group"><label>Stock minimo (gr)</label>' +
    '<input type="number" name="pf-stock-min" value="' + stockMin + '" min="0"></div>' +
    '</div>';

  // --- Frasco / Etiqueta fields ---
  html += '<div id="pf-insumo-fields" style="display:' + insumoDisplay + '">' +
    '<div class="form-group"><label>Precio costo por unidad ($)</label>' +
    '<input type="number" id="pf-precioCosto" value="' + precioCosto + '" min="0"></div>' +
    '<div class="form-group"><label>Stock (unidades)</label>' +
    '<input type="number" name="pf-stock" value="' + stock + '" min="0"></div>' +
    '<div class="form-group"><label>Stock minimo</label>' +
    '<input type="number" name="pf-stock-min" value="' + stockMin + '" min="0"></div>' +
    '</div>';

  // --- Common fields ---
  html += '<div class="form-group"><label>Proveedor</label>' +
    '<input type="text" id="pf-proveedor" value="' + esc(proveedor) + '"></div>';
  html += '<div class="form-group"><label>Notas</label>' +
    '<textarea id="pf-notas">' + esc(notas) + '</textarea></div>';

  // Alert div
  html += '<div id="pf-alert" class="alert-msg" style="display:none"></div>';

  // Save button
  var editId = producto ? producto.id : null;
  html += '<button class="btn btn-primary" onclick="guardarProducto(' + editId + ')">Guardar</button>';

  html += '</div>';
  return html;
}

function updateProductoFormFields() {
  var tipoEl = document.getElementById('pf-tipo');
  if (!tipoEl) return;
  var val = tipoEl.value;

  var especiaFields = document.getElementById('pf-especia-fields');
  var insumoFields = document.getElementById('pf-insumo-fields');

  if (val === 'especia') {
    if (especiaFields) especiaFields.style.display = 'block';
    if (insumoFields) insumoFields.style.display = 'none';
  } else {
    if (especiaFields) especiaFields.style.display = 'none';
    if (insumoFields) insumoFields.style.display = 'block';
  }
}

function guardarProducto(existingId) {
  var nombre = (document.getElementById('pf-nombre').value || '').trim();
  if (!nombre) {
    var alertEl = document.getElementById('pf-alert');
    if (alertEl) { alertEl.textContent = 'El nombre es obligatorio'; alertEl.style.display = 'block'; }
    return;
  }

  var tipo = document.getElementById('pf-tipo').value;
  var db = getDB();

  var data = {
    nombre: nombre,
    tipo: tipo,
    proveedor: (document.getElementById('pf-proveedor').value || '').trim(),
    notas: (document.getElementById('pf-notas').value || '').trim(),
    actualizadoEn: new Date().toISOString()
  };

  if (tipo === 'especia') {
    var costo = Number(document.getElementById('pf-costoPor1000gr').value) || 0;
    if (costo <= 0) {
      var alertEl = document.getElementById('pf-alert');
      if (alertEl) { alertEl.textContent = 'El costo por 1000gr debe ser mayor a 0'; alertEl.style.display = 'block'; }
      return;
    }
    data.costoPor1000gr = costo;
    data.precioVenta = Number(document.getElementById('pf-precioVenta').value) || 0;
    data.precioCosto = Math.round(costo / 1000);
    data.categoria = (document.getElementById('pf-categoria').value || '').trim();
    data.unidad = 'gr';

    var secE = document.getElementById('pf-especia-fields');
    if (secE) {
      var siE = secE.querySelector('[name="pf-stock"]');
      var smiE = secE.querySelector('[name="pf-stock-min"]');
      data.stock = siE ? Number(siE.value) || 0 : 0;
      data.stockMin = smiE ? Number(smiE.value) || 0 : 0;
    }
  } else {
    data.precioCosto = Number(document.getElementById('pf-precioCosto').value) || 0;
    data.precioVenta = 0;
    data.unidad = 'unidad';

    var secI = document.getElementById('pf-insumo-fields');
    if (secI) {
      var siI = secI.querySelector('[name="pf-stock"]');
      var smiI = secI.querySelector('[name="pf-stock-min"]');
      data.stock = siI ? Number(siI.value) || 0 : 0;
      data.stockMin = smiI ? Number(smiI.value) || 0 : 0;
    }
  }

  if (existingId) {
    // Update existing product
    var found = false;
    db.productos.forEach(function(p) {
      if (p.id === existingId) {
        var keys = Object.keys(data);
        keys.forEach(function(key) { p[key] = data[key]; });
        found = true;
      }
    });
    if (!found) {
      toast('Producto no encontrado', 'err');
      return;
    }
  } else {
    // Create new product
    data.id = nextId();
    data.creadoEn = new Date().toISOString();
    db.productos.push(data);
  }

  saveDB();
  closeModal();
  toast(existingId ? 'Producto actualizado' : 'Producto creado');
  renderProductos();
}

function editarProducto(id) {
  var db = getDB();
  var producto = null;
  db.productos.forEach(function(p) { if (p.id === id) producto = p; });
  if (!producto) return;
  openModal('Editar Producto', productoFormHTML(producto));
}

function eliminarProducto(id) {
  if (!confirm('¿Eliminar este producto?')) return;
  var db = getDB();
  db.productos = db.productos.filter(function(p) { return p.id !== id; });
  saveDB();
  toast('Producto eliminado');
  renderProductos();
}

// === END PART 1 ===// ===================== ARCANO ERP — PAGES (PART 2) =====================
// Blends + Produccion + Ventas + Usuarios + Ajustes
// ES5 ONLY: var, function(){}, .forEach(), NO arrow/let/const/template/destructuring

// =====================================================================
//  5. BLENDS
// =====================================================================

function calcBlendCostFromReceta(receta, gramosPorUnidad) {
  var db = getDB();
  var total = 0;
  if (!receta || !receta.length) return 0;
  receta.forEach(function(ing) {
    var spice = db.productos.find(function(p) { return p.id === ing.productoId; });
    if (spice) {
      var gramos = (ing.porcentaje / 100) * gramosPorUnidad;
      total += gramos * (spice.costoPor1000gr / 1000);
    }
  });
  return total;
}

var blendsFilter = 'todos';

function renderBlends() {
  var el = document.getElementById('page-blends');
  if (!el) return;
  var db = getDB();
  var blends = db.blends || [];

  var html = '<div class="flex justify-between items-center mb-16">' +
    '<h2 class="page-title mb-0">Blends</h2>' +
    '<button class="btn btn-gold btn-sm" onclick="openModal(\'Nuevo Blend\', blendFormHTML(null))">+ Nuevo Blend</button>' +
    '</div>';

  if (!blends.length) {
    html += '<div class="empty"><div class="empty-icon">&#9878;</div><p>No hay blends creados</p></div>';
    el.innerHTML = html;
    return;
  }

  blends.forEach(function(blend) {
    var costoUnitario = calcBlendCostFromReceta(blend.receta, blend.gramosPorUnidad || 100);
    var ganancia = (blend.precioVenta || 0) - costoUnitario;
    var gananciaClass = ganancia >= 0 ? 'profit' : 'loss';

    var formatoLabel = '';
    BLEND_FORMATOS.forEach(function(f) {
      if (f.val === blend.formato) formatoLabel = f.label;
    });

    var recetaHtml = '';
    if (blend.receta && blend.receta.length) {
      blend.receta.forEach(function(ing) {
        recetaHtml += '<span class="badge ba">' + esc(ing.nombre || '?') + ' ' + Number(ing.porcentaje) + '%</span> ';
      });
    } else {
      recetaHtml = '<span class="text-muted">Sin receta</span>';
    }

    html += '<div class="card">' +
      '<div class="flex justify-between items-center mb-8">' +
        '<strong class="text-gold" style="font-size:1.05rem">' + esc(blend.nombre) + '</strong>' +
        '<span class="badge ba">' + esc(formatoLabel) + '</span>' +
      '</div>' +
      '<div class="g2 mb-8">' +
        '<div><span class="text-muted text-xs">Gramos/unidad</span><br>' + Number(blend.gramosPorUnidad || 100) + ' gr</div>' +
        '<div><span class="text-muted text-xs">Stock</span><br>' + Number(blend.stock || 0) + ' unidades</div>' +
      '</div>' +
      '<div class="mb-8"><span class="text-muted text-xs">Receta</span><br>' + recetaHtml + '</div>' +
      '<div class="cost-box mb-8">' +
        '<div class="cost-row"><span>Costo por unidad</span><span>' + fmt(costoUnitario) + '</span></div>' +
        '<div class="cost-row"><span>Precio venta</span><span>' + fmt(blend.precioVenta) + '</span></div>' +
        '<div class="cost-row total"><span>Ganancia por unidad</span><span class="' + gananciaClass + '">' + fmt(ganancia) + '</span></div>' +
      '</div>' +
      '<div class="actions-row">' +
        '<button class="btn btn-sm" onclick="editarBlend(' + blend.id + ')">Editar</button>' +
        '<button class="btn btn-sm" onclick="modalProducir(' + blend.id + ')">Producir</button>' +
        '<button class="btn btn-sm btn-danger" onclick="eliminarBlend(' + blend.id + ')">Eliminar</button>' +
      '</div>' +
    '</div>';
  });

  el.innerHTML = html;
}

function blendFormHTML(blend) {
  var db = getDB();
  var especias = db.productos.filter(function(p) { return p.tipo === 'especia'; });
  var etiquetas = db.productos.filter(function(p) { return p.tipo === 'etiqueta'; });

  var isEdit = !!blend;
  var nombre = blend ? esc(blend.nombre) : '';
  var descripcion = blend ? esc(blend.descripcion || '') : '';
  var formato = blend ? (blend.formato || 'polvo') : 'polvo';
  var gramos = blend ? (blend.gramosPorUnidad || 100) : 100;
  var etiquetaId = blend ? (blend.etiquetaId || '') : '';
  var precioVenta = blend ? (blend.precioVenta || 0) : 0;

  var html = '<div class="fr1 mb-12">' +
    '<div><label>Nombre</label><input type="text" id="bl-nombre" value="' + nombre + '" placeholder="Nombre del blend"></div>' +
    '<div><label>Descripcion</label><textarea id="bl-desc" placeholder="Descripcion opcional">' + descripcion + '</textarea></div>' +
    '</div>' +
    '<div class="g2 mb-12">' +
      '<div><label>Formato</label><select id="bl-formato">' + optHtml(BLEND_FORMATOS, formato) + '</select></div>' +
      '<div><label>Gramos por unidad</label><input type="number" id="bl-gramos" value="' + gramos + '" min="1" step="1"></div>' +
    '</div>' +
    '<div class="g2 mb-12">' +
      '<div><label>Etiqueta</label><select id="bl-etiqueta"><option value="">-- Sin etiqueta --</option>';
  etiquetas.forEach(function(et) {
    var sel = (etiquetaId === et.id) ? ' selected' : '';
    html += '<option value="' + et.id + '"' + sel + '>' + esc(et.nombre) + '</option>';
  });
  html += '</select></div>' +
      '<div><label>Precio venta</label><input type="number" id="bl-precio" value="' + precioVenta + '" min="0" step="50"></div>' +
    '</div>';

  html += '<hr class="divider mb-12">' +
    '<div class="flex justify-between items-center mb-8">' +
      '<span class="section-title mb-0">Receta</span>' +
      '<button class="btn btn-sm btn-ghost" onclick="addIngredienteRow(null)">+ Agregar Ingrediente</button>' +
    '</div>' +
    '<div id="bl-receta-container"></div>';

  html += '<div class="cost-box mb-12 mt-8">' +
    '<div class="cost-row"><span>Costo estimado por unidad</span><span id="bl-costo-est">' + fmt(0) + '</span></div>' +
    '<div class="cost-row"><span>Ganancia estimada</span><span id="bl-ganancia-est" class="profit">' + fmt(0) + '</span></div>' +
    '<div class="cost-row"><span>Total porcentaje</span><span id="bl-pct-total" class="text-red">0%</span></div>' +
  '</div>';

  html += '<div class="alert alert-err mb-12" id="bl-alert"></div>';

  html += '<button class="btn btn-gold btn-full" onclick="guardarBlend(' + (isEdit ? blend.id : 'null') + ')">Guardar</button>';

  // Pre-populate recipe rows if editing
  if (blend && blend.receta && blend.receta.length) {
    setTimeout(function() {
      blend.receta.forEach(function(ing) {
        addIngredienteRow(ing);
      });
    }, 30);
  }

  return html;
}

function addIngredienteRow(data) {
  var container = document.getElementById('bl-receta-container');
  if (!container) return;

  var db = getDB();
  var especias = db.productos.filter(function(p) { return p.tipo === 'especia'; });

  var row = document.createElement('div');
  row.className = 'ing-row';

  var selectId = 'ing-sel-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
  var pctId = 'ing-pct-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
  var costId = 'ing-cost-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);

  var selectHtml = '<select id="' + selectId + '" onchange="recalcBlendCost()"><option value="">-- Especia --</option>';
  especias.forEach(function(sp) {
    var sel = (data && data.productoId === sp.id) ? ' selected' : '';
    selectHtml += '<option value="' + sp.id + '" data-costo="' + (sp.costoPor1000gr || 0) + '"' + sel + '>' + esc(sp.nombre) + ' (' + fmt(sp.costoPor1000gr) + '/kg)</option>';
  });
  selectHtml += '</select>';

  row.innerHTML = selectHtml +
    '<input type="number" id="' + pctId + '" value="' + (data ? Number(data.porcentaje) : '') + '" placeholder="%" min="0" max="100" step="0.1" onchange="recalcBlendCost()" oninput="recalcBlendCost()">' +
    '<span class="ing-cost" id="' + costId + '">-</span>' +
    '<button class="btn btn-sm btn-danger" onclick="this.parentNode.remove();recalcBlendCost()" title="Quitar">&times;</button>';

  container.appendChild(row);
  recalcBlendCost();
}

function recalcBlendCost() {
  var container = document.getElementById('bl-receta-container');
  if (!container) return;

  var gramosInput = document.getElementById('bl-gramos');
  var gramosPorUnidad = gramosInput ? Number(gramosInput.value) || 100 : 100;
  var precioInput = document.getElementById('bl-precio');
  var precioVenta = precioInput ? Number(precioInput.value) || 0 : 0;

  var db = getDB();
  var rows = container.querySelectorAll('.ing-row');
  var totalCost = 0;
  var totalPct = 0;

  rows.forEach(function(row) {
    var sel = row.querySelector('select');
    var pctInput = row.querySelector('input[type="number"]');
    var costSpan = row.querySelector('.ing-cost');
    if (!sel || !pctInput || !costSpan) return;

    var productId = Number(sel.value);
    var pct = Number(pctInput.value) || 0;
    var opt = sel.options[sel.selectedIndex];
    var costoPorKg = opt ? Number(opt.getAttribute('data-costo')) || 0 : 0;

    if (productId && pct > 0) {
      var gramos = (pct / 100) * gramosPorUnidad;
      var cost = gramos * (costoPorKg / 1000);
      totalCost += cost;
      totalPct += pct;
      costSpan.textContent = fmt(cost);
    } else {
      costSpan.textContent = '-';
    }
  });

  var costoEst = document.getElementById('bl-costo-est');
  var gananciaEst = document.getElementById('bl-ganancia-est');
  var pctTotal = document.getElementById('bl-pct-total');

  if (costoEst) costoEst.textContent = fmt(totalCost);
  if (gananciaEst) {
    var ganancia = precioVenta - totalCost;
    gananciaEst.textContent = fmt(ganancia);
    gananciaEst.className = ganancia >= 0 ? 'ing-cost profit' : 'ing-cost loss';
  }
  if (pctTotal) {
    var pctVal = Math.round(totalPct * 10) / 10;
    pctTotal.textContent = pctVal.toFixed(1) + '%';
    pctTotal.className = (totalPct >= 99 && totalPct <= 101) ? 'ing-cost text-green' : 'ing-cost text-red';
  }
}

function guardarBlend(existingId) {
  var nombre = (document.getElementById('bl-nombre') || {}).value || '';
  nombre = nombre.trim();
  if (!nombre) {
    var alertEl = document.getElementById('bl-alert');
    if (alertEl) { alertEl.textContent = 'El nombre es obligatorio'; alertEl.classList.add('show'); }
    return;
  }

  var container = document.getElementById('bl-receta-container');
  if (!container || !container.querySelectorAll('.ing-row').length) {
    var alertEl2 = document.getElementById('bl-alert');
    if (alertEl2) { alertEl2.textContent = 'Agrega al menos un ingrediente'; alertEl2.classList.add('show'); }
    return;
  }

  // Gather receta
  var receta = [];
  var totalPct = 0;
  var rows = container.querySelectorAll('.ing-row');
  rows.forEach(function(row) {
    var sel = row.querySelector('select');
    var pctInput = row.querySelector('input[type="number"]');
    if (!sel || !pctInput) return;
    var productId = Number(sel.value);
    var pct = Number(pctInput.value) || 0;
    if (productId && pct > 0) {
      var db = getDB();
      var spice = db.productos.find(function(p) { return p.id === productId; });
      receta.push({
        productoId: productId,
        nombre: spice ? spice.nombre : '?',
        porcentaje: pct
      });
      totalPct += pct;
    }
  });

  if (receta.length === 0) {
    var alertEl3 = document.getElementById('bl-alert');
    if (alertEl3) { alertEl3.textContent = 'Agrega al menos un ingrediente con porcentaje'; alertEl3.classList.add('show'); }
    return;
  }

  if (totalPct < 99 || totalPct > 101) {
    var alertEl4 = document.getElementById('bl-alert');
    if (alertEl4) { alertEl4.textContent = 'El total de porcentajes debe ser 100% (actual: ' + totalPct.toFixed(1) + '%)'; alertEl4.classList.add('show'); }
    return;
  }

  // Normalize to exactly 100%
  if (totalPct !== 100 && receta.length > 0) {
    var diff = 100 - totalPct;
    receta[0].porcentaje = Math.round((receta[0].porcentaje + diff) * 10) / 10;
  }

  var formato = (document.getElementById('bl-formato') || {}).value || 'polvo';
  var gramosPorUnidad = Number((document.getElementById('bl-gramos') || {}).value) || 100;
  var etiquetaId = Number((document.getElementById('bl-etiqueta') || {}).value) || 0;
  if (!etiquetaId) etiquetaId = null;
  var precioVenta = Number((document.getElementById('bl-precio') || {}).value) || 0;
  var descripcion = (document.getElementById('bl-desc') || {}).value || '';

  var costoUnitario = calcBlendCostFromReceta(receta, gramosPorUnidad);

  var db = getDB();
  if (existingId) {
    var blend = db.blends.find(function(b) { return b.id === existingId; });
    if (blend) {
      blend.nombre = nombre;
      blend.descripcion = descripcion;
      blend.formato = formato;
      blend.gramosPorUnidad = gramosPorUnidad;
      blend.etiquetaId = etiquetaId;
      blend.precioVenta = precioVenta;
      blend.receta = receta;
      blend.costoUnitario = costoUnitario;
    }
  } else {
    db.blends.push({
      id: nextId(),
      nombre: nombre,
      descripcion: descripcion,
      formato: formato,
      gramosPorUnidad: gramosPorUnidad,
      etiquetaId: etiquetaId,
      precioVenta: precioVenta,
      costoUnitario: costoUnitario,
      stock: 0,
      receta: receta,
      creadoEn: new Date().toISOString()
    });
  }

  saveDB();
  closeModal();
  refreshPage();
  toast(existingId ? 'Blend actualizado' : 'Blend creado');
}

function editarBlend(id) {
  var db = getDB();
  var blend = db.blends.find(function(b) { return b.id === id; });
  if (!blend) return;
  openModal('Editar Blend', blendFormHTML(blend));
}

function eliminarBlend(id) {
  if (!confirm('Eliminar este blend?')) return;
  var db = getDB();
  db.blends = db.blends.filter(function(b) { return b.id !== id; });
  saveDB();
  refreshPage();
  toast('Blend eliminado');
}

// =====================================================================
//  6. PRODUCCION
// =====================================================================

function renderProduccion() {
  var el = document.getElementById('page-produccion');
  if (!el) return;

  var html = '<h2 class="page-title">Produccion</h2>' +
    '<p class="text-muted mb-16">Producir blends a partir de especias.</p>';

  var db = getDB();
  var blends = db.blends || [];

  if (!blends.length) {
    html += '<div class="empty"><div class="empty-icon">&#9878;</div><p>No hay blends definidos</p></div>';
    el.innerHTML = html;
    return;
  }

  blends.forEach(function(blend) {
    var costoUnitario = calcBlendCostFromReceta(blend.receta, blend.gramosPorUnidad || 100);
    var formatoLabel = '';
    BLEND_FORMATOS.forEach(function(f) {
      if (f.val === blend.formato) formatoLabel = f.label;
    });

    var recetaPreview = '';
    if (blend.receta && blend.receta.length) {
      var parts = [];
      blend.receta.forEach(function(ing) {
        parts.push(esc(ing.nombre || '?') + ' ' + Number(ing.porcentaje) + '%');
      });
      recetaPreview = parts.join(' | ');
    } else {
      recetaPreview = 'Sin receta';
    }

    html += '<div class="card">' +
      '<div class="flex justify-between items-center mb-8">' +
        '<strong class="text-gold">' + esc(blend.nombre) + '</strong>' +
        '<span class="badge ba">' + esc(formatoLabel) + '</span>' +
      '</div>' +
      '<div class="text-xs text-muted mb-8">' + recetaPreview + '</div>' +
      '<div class="g3 mb-8">' +
        '<div><span class="text-muted text-xs">Gramos/unidad</span><br>' + Number(blend.gramosPorUnidad || 100) + ' gr</div>' +
        '<div><span class="text-muted text-xs">Stock actual</span><br>' + Number(blend.stock || 0) + ' uds</div>' +
        '<div><span class="text-muted text-xs">Costo/unidad</span><br>' + fmt(costoUnitario) + '</div>' +
      '</div>' +
      '<button class="btn btn-gold btn-sm" onclick="modalProducir(' + blend.id + ')">Producir</button>' +
    '</div>';
  });

  el.innerHTML = html;
}

function modalProducir(id) {
  var db = getDB();
  var blend = db.blends.find(function(b) { return b.id === id; });
  if (!blend) return;

  var gramosPorUnidad = blend.gramosPorUnidad || 100;
  var receta = blend.receta || [];

  // Check if any ingredient is missing or has insufficient stock for 1 unit
  var hasError = false;
  var errorMsg = '';

  var rowsHtml = '';
  receta.forEach(function(ing) {
    var spice = db.productos.find(function(p) { return p.id === ing.productoId; });
    if (!spice) {
      hasError = true;
      errorMsg = 'Especia no encontrada: ' + (ing.nombre || ing.productoId);
      return;
    }
    var gramos = (ing.porcentaje / 100) * gramosPorUnidad;
    var stock = spice.stock || 0;
    if (stock < gramos) {
      hasError = true;
    }
    rowsHtml += '<div class="cost-row">' +
      '<span>' + esc(spice.nombre) + ' (' + Number(ing.porcentaje) + '% = ' + gramos.toFixed(1) + 'gr)</span>' +
      '<span>Stock: ' + Number(stock).toFixed(0) + ' gr</span>' +
    '</div>';
  });

  if (hasError) {
    errorMsg = errorMsg || 'Algunos ingredientes no tienen stock suficiente para producir ni siquiera 1 unidad.';
    rowsHtml += '<div class="alert alert-err show mt-8">' + esc(errorMsg) + '</div>';
  }

  var bodyHtml = '<div class="mb-12">' +
    '<strong class="text-gold">' + esc(blend.nombre) + '</strong>' +
    '<span class="text-muted text-xs" style="margin-left:8px">' + gramosPorUnidad + ' gr/unidad</span>' +
    '</div>' +
    '<div class="cost-box mb-12">' +
      '<div class="section-title mb-8">Ingredientes por unidad</div>' +
      rowsHtml +
    '</div>' +
    '<div class="mb-12">' +
      '<label>Cantidad a producir</label>' +
      '<input type="number" id="prod-cantidad" value="1" min="1" step="1" onchange="recalcProduccion(' + id + ')" oninput="recalcProduccion(' + id + ')">' +
    '</div>' +
    '<div class="cost-box mb-12">' +
      '<div class="cost-row"><span>Total costo especias</span><span id="prod-costo-total">' + fmt(0) + '</span></div>' +
    '</div>' +
    '<div id="prod-detail" class="mb-12"></div>' +
    '<div class="alert alert-err mb-12" id="prod-alert"></div>' +
    '<button class="btn btn-gold btn-full" onclick="ejecutarProduccion(' + id + ')"' + (hasError ? ' disabled' : '') + '>Producir</button>';

  openModal('Producir: ' + blend.nombre, bodyHtml);

  // Initial cost calc
  setTimeout(function() { recalcProduccion(id); }, 30);
}

function recalcProduccion(id) {
  var db = getDB();
  var blend = db.blends.find(function(b) { return b.id === id; });
  if (!blend) return;

  var cantidadInput = document.getElementById('prod-cantidad');
  var cantidad = cantidadInput ? Number(cantidadInput.value) || 0 : 0;
  var gramosPorUnidad = blend.gramosPorUnidad || 100;

  var totalCost = 0;
  var detailHtml = '';
  var allOk = true;

  (blend.receta || []).forEach(function(ing) {
    var spice = db.productos.find(function(p) { return p.id === ing.productoId; });
    if (!spice) return;
    var needed = (ing.porcentaje / 100) * gramosPorUnidad * cantidad;
    var available = spice.stock || 0;
    var ok = available >= needed;
    if (!ok) allOk = false;
    var cost = needed * (spice.costoPor1000gr / 1000);
    totalCost += cost;
    detailHtml += '<div class="cost-row">' +
      '<span>' + esc(spice.nombre) + ': ' + needed.toFixed(1) + 'gr' + (ok ? '' : ' <span class="text-red">(falta ' + (needed - available).toFixed(1) + 'gr)</span>') + '</span>' +
      '<span>' + fmt(cost) + '</span>' +
    '</div>';
  });

  var costoEl = document.getElementById('prod-costo-total');
  if (costoEl) costoEl.textContent = fmt(totalCost);

  var detailEl = document.getElementById('prod-detail');
  if (detailEl) {
    detailEl.innerHTML = cantidad > 0
      ? '<div class="section-title mb-8">Detalle por ingrediente</div><div class="cost-box">' + detailHtml + '</div>'
      : '';
  }

  // Enable/disable button
  var btn = document.querySelector('#modal-body .btn-gold.btn-full');
  if (btn) btn.disabled = !allOk || cantidad < 1;
}

function ejecutarProduccion(id) {
  var db = getDB();
  var blend = db.blends.find(function(b) { return b.id === id; });
  if (!blend) return;

  var cantidadInput = document.getElementById('prod-cantidad');
  var cantidad = Number(cantidadInput.value) || 0;
  if (cantidad < 1) {
    toast('Cantidad invalida', 'err');
    return;
  }

  var gramosPorUnidad = blend.gramosPorUnidad || 100;
  var receta = blend.receta || [];
  var allOk = true;

  // Validate stock
  receta.forEach(function(ing) {
    var spice = db.productos.find(function(p) { return p.id === ing.productoId; });
    if (!spice) { allOk = false; return; }
    var needed = (ing.porcentaje / 100) * gramosPorUnidad * cantidad;
    if ((spice.stock || 0) < needed) allOk = false;
  });

  if (!allOk) {
    var alertEl = document.getElementById('prod-alert');
    if (alertEl) { alertEl.textContent = 'Stock insuficiente para producir ' + cantidad + ' unidades'; alertEl.classList.add('show'); }
    return;
  }

  // Deduct stock and record movimientos
  receta.forEach(function(ing) {
    var spice = db.productos.find(function(p) { return p.id === ing.productoId; });
    if (!spice) return;
    var needed = (ing.porcentaje / 100) * gramosPorUnidad * cantidad;
    spice.stock = (spice.stock || 0) - needed;
    spice.stock = Math.round(spice.stock * 100) / 100;
    addMovimiento('produccion', spice.id, spice.nombre, -needed,
      'Produccion: ' + blend.nombre + ' x' + cantidad + ' (' + needed.toFixed(1) + 'gr)');
  });

  // Add blend stock
  blend.stock = (blend.stock || 0) + cantidad;

  saveDB();
  closeModal();
  refreshPage();
  toast('Producidas ' + cantidad + ' unidades de ' + blend.nombre);
}

// =====================================================================
//  7. VENTAS (POS)
// =====================================================================

var ventasFilter = 'todos';
var ventaActual = null;

function dbFindProduct(id) {
  return (getDB().productos || []).find(function(p) { return p.id === id; });
}

function dbFindBlend(id) {
  return (getDB().blends || []).find(function(b) { return b.id === id; });
}

function renderVentas() {
  var el = document.getElementById('page-ventas');
  if (!el) return;
  var db = getDB();
  var ventas = (db.ventas || []).slice().reverse();

  var html = '<h2 class="page-title">Ventas</h2>' +
    '<div class="actions-row">' +
      '<button class="btn btn-gold btn-sm" onclick="iniciarNuevaVenta()">+ Nueva Venta</button>' +
      '<button class="btn btn-sm" onclick="toggleTiendaOrders()">Pedidos de Tienda</button>' +
    '</div>';

  // Active venta
  if (ventaActual) {
    html += renderVentaActiva();
  }

  // Tabs
  var tabs = [
    { val: 'todos', label: 'Todas' },
    { val: 'pendiente', label: 'Pendiente' },
    { val: 'completada', label: 'Completada' },
    { val: 'cancelada', label: 'Cancelada' }
  ];

  html += '<div class="tabs mb-12">';
  tabs.forEach(function(t) {
    var cls = (ventasFilter === t.val) ? 'tab active' : 'tab';
    html += '<button class="' + cls + '" onclick="ventasFilter=\'' + t.val + '\';refreshPage()">' + esc(t.label) + '</button>';
  });
  html += '</div>';

  // Filter ventas
  var filtered = ventas;
  if (ventasFilter !== 'todos') {
    filtered = ventas.filter(function(v) { return v.estado === ventasFilter; });
  }

  if (!filtered.length) {
    html += '<div class="empty"><p>No hay ventas ' + (ventasFilter === 'todos' ? '' : ventasFilter) + 's</p></div>';
    el.innerHTML = html;
    return;
  }

  html += '<div class="tw"><table>' +
    '<thead><tr>' +
      '<th>Fecha</th><th>Items</th><th>Total</th><th>Estado</th><th>Acciones</th>' +
    '</tr></thead><tbody>';

  filtered.forEach(function(v) {
    var estadoClass = 'ba';
    if (v.estado === 'completada') estadoClass = 'bg';
    if (v.estado === 'cancelada') estadoClass = 'br';
    if (v.estado === 'pendiente') estadoClass = 'by';

    var total = 0;
    (v.items || []).forEach(function(item) {
      total += (item.subtotal || 0);
    });

    html += '<tr>' +
      '<td class="text-xs">' + fmtDateTime(v.fecha) + '</td>' +
      '<td>' + (v.items || []).length + '</td>' +
      '<td class="fw7">' + fmt(total) + '</td>' +
      '<td><span class="badge ' + estadoClass + '">' + esc(v.estado || '') + '</span></td>' +
      '<td><button class="btn btn-sm" onclick="modalVerVenta(' + v.id + ')">Ver</button></td>' +
    '</tr>';
  });

  html += '</tbody></table></div>';
  el.innerHTML = html;
}

function renderVentaActiva() {
  if (!ventaActual) return '';

  var total = 0;
  var itemsHtml = '';
  (ventaActual.items || []).forEach(function(item, idx) {
    total += item.subtotal || 0;
    itemsHtml += '<div class="mov-row">' +
      '<div style="flex:1">' +
        '<strong>' + esc(item.nombre) + '</strong>' +
        '<span class="text-muted text-xs" style="margin-left:6px">' + fmt(item.precio) + ' x ' + item.cantidad + '</span>' +
      '</div>' +
      '<span class="fw7">' + fmt(item.subtotal) + '</span>' +
      '<button class="btn-icon" onclick="removeVentaItem(' + idx + ')" title="Quitar">&times;</button>' +
    '</div>';
  });

  return '<div class="card-gold mb-16">' +
    '<div class="flex justify-between items-center mb-8">' +
      '<span class="section-title mb-0">Venta activa</span>' +
      '<button class="btn btn-sm btn-ghost" onclick="cancelarVentaActual()">Cancelar</button>' +
    '</div>' +
    itemsHtml +
    '<hr class="divider">' +
    '<div class="flex justify-between items-center">' +
      '<span class="fw7">Total: ' + fmt(total) + '</span>' +
      '<button class="btn btn-gold btn-sm" onclick="completarVenta()">Completar</button>' +
    '</div>' +
  '</div>';
}

function iniciarNuevaVenta() {
  ventaActual = { items: [] };

  var db = getDB();
  var especias = db.productos.filter(function(p) {
    return p.tipo === 'especia' && p.precioVenta > 0 && (p.stock || 0) > 0;
  });
  var blends = db.blends.filter(function(b) {
    return (b.stock || 0) > 0;
  });

  var html = '<div class="section-title mb-12">Especias</div>';
  if (!especias.length) {
    html += '<p class="text-muted mb-12">No hay especias disponibles</p>';
  } else {
    especias.forEach(function(sp) {
      html += '<button class="btn btn-ghost btn-sm mb-8" style="width:100%;text-align:left" onclick="agregarAVenta(\'especia\',' + sp.id + ')">' +
        esc(sp.nombre) + ' <span class="text-muted text-xs">' + fmt(sp.precioVenta) + ' | Stock: ' + Number(sp.stock || 0) + ' ' + esc(sp.unidad || 'gr') + '</span></button>';
    });
  }

  html += '<hr class="divider"><div class="section-title mb-12">Blends</div>';
  if (!blends.length) {
    html += '<p class="text-muted mb-12">No hay blends con stock</p>';
  } else {
    blends.forEach(function(bl) {
      html += '<button class="btn btn-ghost btn-sm mb-8" style="width:100%;text-align:left" onclick="agregarAVenta(\'blend\',' + bl.id + ')">' +
        esc(bl.nombre) + ' <span class="text-muted text-xs">' + fmt(bl.precioVenta) + ' | Stock: ' + Number(bl.stock || 0) + ' uds</span></button>';
    });
  }

  html += '<hr class="divider">' +
    '<button class="btn btn-gold btn-full mt-8" onclick="closeModal()">Cerrar (Venta en curso)</button>';

  openModal('Agregar productos', html);
  refreshPage();
}

function agregarAVenta(tipo, id) {
  if (!ventaActual) ventaActual = { items: [] };

  if (tipo === 'especia') {
    var product = dbFindProduct(id);
    if (!product) return;
    // Check if already added, increase qty
    var existing = ventaActual.items.find(function(item) {
      return item.tipo === 'especia' && item.productoId === id;
    });
    if (existing) {
      existing.cantidad += 1;
      existing.subtotal = existing.cantidad * existing.precio;
    } else {
      ventaActual.items.push({
        tipo: 'especia',
        productoId: id,
        nombre: product.nombre,
        precio: product.precioVenta || 0,
        cantidad: 1,
        subtotal: product.precioVenta || 0
      });
    }
    toast(product.nombre + ' agregado');
    closeModal();
    iniciarNuevaVenta();
    refreshPage();
  } else if (tipo === 'blend') {
    // This calls mostrarSelectorFrasco from part 1
    if (typeof mostrarSelectorFrasco === 'function') {
      mostrarSelectorFrasco(id, 'venta');
    } else {
      // Fallback: add blend without frasco
      var bl = dbFindBlend(id);
      if (!bl) return;
      agregarBlendAVenta(id, null, bl.nombre, bl.precioVenta, bl.stock);
    }
  }
}

function agregarBlendAVenta(blendId, frascoId, nombre, precio, disponible) {
  if (!ventaActual) ventaActual = { items: [] };

  var existing = ventaActual.items.find(function(item) {
    return item.tipo === 'blend' && item.blendId === blendId && item.frascoId === frascoId;
  });
  if (existing) {
    existing.cantidad += 1;
    existing.subtotal = existing.cantidad * existing.precio;
  } else {
    var frascoCost = 0;
    var frascoNombre = '';
    if (frascoId) {
      var frasco = dbFindProduct(frascoId);
      if (frasco) {
        frascoCost = frasco.precioCosto || 0;
        frascoNombre = frasco.nombre;
      }
    }
    ventaActual.items.push({
      tipo: 'blend',
      blendId: blendId,
      frascoId: frascoId,
      nombre: nombre,
      precio: precio,
      frascoCost: frascoCost,
      frascoNombre: frascoNombre,
      cantidad: 1,
      subtotal: precio
    });
  }
  toast(nombre + ' agregado');
  closeModal();
  iniciarNuevaVenta();
  refreshPage();
}

function removeVentaItem(idx) {
  if (!ventaActual || !ventaActual.items) return;
  ventaActual.items.splice(idx, 1);
  if (ventaActual.items.length === 0) {
    ventaActual = null;
  }
  refreshPage();
}

function cancelarVentaActual() {
  if (!ventaActual) return;
  if (!confirm('Cancelar venta actual?')) return;
  ventaActual = null;
  refreshPage();
}

function completarVenta() {
  if (!ventaActual || !ventaActual.items || !ventaActual.items.length) {
    toast('No hay items en la venta', 'err');
    return;
  }

  var db = getDB();
  var total = 0;
  ventaActual.items.forEach(function(item) { total += item.subtotal || 0; });

  var venta = {
    id: nextId(),
    items: ventaActual.items,
    total: total,
    estado: 'completada',
    tipo: 'mostrador',
    creadoPor: currentUser ? currentUser.id : null,
    creadoPorNombre: currentUser ? currentUser.nombre : 'Sistema',
    fecha: new Date().toISOString()
  };

  // Process each item
  ventaActual.items.forEach(function(item) {
    if (item.tipo === 'especia') {
      var product = dbFindProduct(item.productoId);
      if (product) {
        product.stock = (product.stock || 0) - item.cantidad;
        product.stock = Math.round(product.stock * 100) / 100;
        addMovimiento('venta', product.id, product.nombre, -item.cantidad,
          'Venta mostrador #' + venta.id);
      }
    } else if (item.tipo === 'blend') {
      var blend = dbFindBlend(item.blendId);
      if (blend) {
        blend.stock = (blend.stock || 0) - item.cantidad;
        addMovimiento('venta', blend.id, blend.nombre, -item.cantidad,
          'Venta mostrador #' + venta.id);
      }
      // Deduct frasco stock
      if (item.frascoId) {
        var frasco = dbFindProduct(item.frascoId);
        if (frasco) {
          frasco.stock = (frasco.stock || 0) - item.cantidad;
          addMovimiento('venta', frasco.id, frasco.nombre, -item.cantidad,
            'Frasco para venta #' + venta.id);
        }
      }
      // Deduct etiqueta stock if blend has one
      if (blend && blend.etiquetaId) {
        var etiqueta = dbFindProduct(blend.etiquetaId);
        if (etiqueta) {
          etiqueta.stock = (etiqueta.stock || 0) - item.cantidad;
          addMovimiento('venta', etiqueta.id, etiqueta.nombre, -item.cantidad,
            'Etiqueta para venta #' + venta.id);
        }
      }
    }
  });

  db.ventas.push(venta);
  saveDB();
  ventaActual = null;
  refreshPage();
  toast('Venta completada: ' + fmt(total));
}

function modalVerVenta(id) {
  var db = getDB();
  var venta = (db.ventas || []).find(function(v) { return v.id === id; });
  if (!venta) return;

  var estadoClass = 'ba';
  if (venta.estado === 'completada') estadoClass = 'bg';
  if (venta.estado === 'cancelada') estadoClass = 'br';
  if (venta.estado === 'pendiente') estadoClass = 'by';

  var itemsHtml = '';
  (venta.items || []).forEach(function(item) {
    itemsHtml += '<div class="mov-row">' +
      '<div style="flex:1">' +
        '<strong>' + esc(item.nombre) + '</strong>' +
        '<span class="text-muted text-xs" style="margin-left:6px">' +
          fmt(item.precio) + ' x ' + item.cantidad +
          (item.frascoNombre ? ' (' + esc(item.frascoNombre) + ')' : '') +
        '</span>' +
      '</div>' +
      '<span class="fw7">' + fmt(item.subtotal) + '</span>' +
    '</div>';
  });

  var tipoLabel = venta.tipo === 'tienda' ? 'Tienda' : 'Mostrador';

  var buttonsHtml = '';
  if (venta.estado === 'pendiente') {
    buttonsHtml += '<button class="btn btn-sm" onclick="cambiarEstadoVenta(' + id + ',\'completada\')">Completar</button>' +
      '<button class="btn btn-sm btn-danger" onclick="cambiarEstadoVenta(' + id + ',\'cancelada\')">Cancelar</button>';
  }

  var bodyHtml = '<div class="mb-12">' +
    '<span class="badge ' + estadoClass + '">' + esc(venta.estado) + '</span>' +
    '<span class="badge ba" style="margin-left:4px">' + esc(tipoLabel) + '</span>' +
    '<span class="text-muted text-xs" style="margin-left:8px">' + fmtDateTime(venta.fecha) + '</span>' +
    '</div>' +
    (venta.creadoPorNombre ? '<div class="text-xs text-muted mb-8">Por: ' + esc(venta.creadoPorNombre) + '</div>' : '') +
    itemsHtml +
    '<hr class="divider">' +
    '<div class="flex justify-between items-center mb-12">' +
      '<span class="fw7">Total: ' + fmt(venta.total || 0) + '</span>' +
    '</div>' +
    '<div class="actions-row">' + buttonsHtml + '</div>';

  openModal('Venta #' + id, bodyHtml);
}

function cambiarEstadoVenta(id, nuevoEstado) {
  var db = getDB();
  var venta = (db.ventas || []).find(function(v) { return v.id === id; });
  if (!venta) return;

  // If completing a tienda order, deduct stock
  if (nuevoEstado === 'completada' && venta.estado === 'pendiente' && venta.tipo === 'tienda') {
    (venta.items || []).forEach(function(item) {
      if (item.tipo === 'especia') {
        var product = dbFindProduct(item.productoId);
        if (product) {
          product.stock = (product.stock || 0) - item.cantidad;
          product.stock = Math.round(product.stock * 100) / 100;
          addMovimiento('venta', product.id, product.nombre, -item.cantidad,
            'Venta tienda #' + venta.id);
        }
      } else if (item.tipo === 'blend') {
        var blend = dbFindBlend(item.blendId);
        if (blend) {
          blend.stock = (blend.stock || 0) - item.cantidad;
          addMovimiento('venta', blend.id, blend.nombre, -item.cantidad,
            'Venta tienda #' + venta.id);
        }
        if (item.frascoId) {
          var frasco = dbFindProduct(item.frascoId);
          if (frasco) {
            frasco.stock = (frasco.stock || 0) - item.cantidad;
            addMovimiento('venta', frasco.id, frasco.nombre, -item.cantidad,
              'Frasco para venta tienda #' + venta.id);
          }
        }
        if (blend && blend.etiquetaId) {
          var etiqueta = dbFindProduct(blend.etiquetaId);
          if (etiqueta) {
            etiqueta.stock = (etiqueta.stock || 0) - item.cantidad;
            addMovimiento('venta', etiqueta.id, etiqueta.nombre, -item.cantidad,
              'Etiqueta para venta tienda #' + venta.id);
          }
        }
      }
    });
  }

  // If cancelling a completed venta, restore stock
  if (nuevoEstado === 'cancelada' && venta.estado === 'completada') {
    (venta.items || []).forEach(function(item) {
      if (item.tipo === 'especia') {
        var product = dbFindProduct(item.productoId);
        if (product) {
          product.stock = (product.stock || 0) + item.cantidad;
          addMovimiento('devolucion', product.id, product.nombre, item.cantidad,
            'Cancelacion venta #' + venta.id);
        }
      } else if (item.tipo === 'blend') {
        var blend = dbFindBlend(item.blendId);
        if (blend) {
          blend.stock = (blend.stock || 0) + item.cantidad;
          addMovimiento('devolucion', blend.id, blend.nombre, item.cantidad,
            'Cancelacion venta #' + venta.id);
        }
        if (item.frascoId) {
          var frasco = dbFindProduct(item.frascoId);
          if (frasco) {
            frasco.stock = (frasco.stock || 0) + item.cantidad;
            addMovimiento('devolucion', frasco.id, frasco.nombre, item.cantidad,
            'Cancelacion venta #' + venta.id);
          }
        }
        if (blend && blend.etiquetaId) {
          var etiqueta = dbFindProduct(blend.etiquetaId);
          if (etiqueta) {
            etiqueta.stock = (etiqueta.stock || 0) + item.cantidad;
            addMovimiento('devolucion', etiqueta.id, etiqueta.nombre, item.cantidad,
              'Cancelacion venta #' + venta.id);
          }
        }
      }
    });
  }

  venta.estado = nuevoEstado;
  saveDB();
  closeModal();
  refreshPage();
  toast('Venta ' + nuevoEstado);
}

function toggleTiendaOrders() {
  ventasFilter = 'tienda';
  var db = getDB();
  var tiendaOrders = (db.ventas || []).filter(function(v) { return v.tipo === 'tienda'; });

  var html = '<div class="section-title mb-12">Pedidos de Tienda</div>';

  if (!tiendaOrders.length) {
    html += '<div class="empty"><p>No hay pedidos de tienda</p></div>';
  } else {
    tiendaOrders.slice().reverse().forEach(function(v) {
      var estadoClass = 'ba';
      if (v.estado === 'completada') estadoClass = 'bg';
      if (v.estado === 'cancelada') estadoClass = 'br';
      if (v.estado === 'pendiente') estadoClass = 'by';

      var itemsPreview = '';
      (v.items || []).forEach(function(item) {
        itemsPreview += esc(item.nombre) + ' x' + item.cantidad + ', ';
      });
      itemsPreview = itemsPreview.replace(/, $/, '');

      html += '<div class="card" style="cursor:pointer" onclick="modalVerVenta(' + v.id + ');ventasFilter=\'todos\'">' +
        '<div class="flex justify-between items-center mb-8">' +
          '<span class="text-xs text-muted">' + fmtDateTime(v.fecha) + '</span>' +
          '<span class="badge ' + estadoClass + '">' + esc(v.estado) + '</span>' +
        '</div>' +
        '<div class="text-sm">' + esc(itemsPreview) + '</div>' +
        '<div class="fw7 text-gold mt-8">' + fmt(v.total || 0) + '</div>' +
      '</div>';
    });
  }

  html += '<hr class="divider mt-12"><button class="btn btn-ghost btn-full mt-12" onclick="ventasFilter=\'todos\';refreshPage()">Volver</button>';

  openModal('Pedidos de Tienda', html);
}

// =====================================================================
//  8. USUARIOS
// =====================================================================

function renderUsuarios() {
  var el = document.getElementById('page-usuarios');
  if (!el) return;

  if (!currentUser || currentUser.rol !== 'admin') {
    el.innerHTML = '<div class="empty"><p>Acceso restringido</p></div>';
    return;
  }

  var db = getDB();
  var usuarios = db.usuarios || [];

  var html = '<div class="flex justify-between items-center mb-16">' +
    '<h2 class="page-title mb-0">Usuarios</h2>' +
    '<button class="btn btn-gold btn-sm" onclick="modalNuevoUsuario(null)">+ Nuevo Usuario</button>' +
    '</div>';

  if (!usuarios.length) {
    html += '<div class="empty"><p>No hay usuarios</p></div>';
    el.innerHTML = html;
    return;
  }

  html += '<div class="tw"><table>' +
    '<thead><tr>' +
      '<th>Nombre</th><th>Rol</th><th>PIN</th><th>Estado</th><th>Acciones</th>' +
    '</tr></thead><tbody>';

  usuarios.forEach(function(u) {
    var rolBadge = 'ba';
    if (u.rol === 'admin') rolBadge = 'bg';
    if (u.rol === 'vendedor') rolBadge = 'bb';

    var estadoBadge = u.activo !== false ? 'bg' : 'br';
    var estadoLabel = u.activo !== false ? 'Activo' : 'Inactivo';
    var pinMasked = u.pin ? u.pin.charAt(0) + '***' : '-';

    html += '<tr>' +
      '<td class="fw7">' + esc(u.nombre) + '</td>' +
      '<td><span class="badge ' + rolBadge + '">' + esc(u.rol || '') + '</span></td>' +
      '<td class="text-muted">' + esc(pinMasked) + '</td>' +
      '<td><span class="badge ' + estadoBadge + '">' + esc(estadoLabel) + '</span></td>' +
      '<td>' +
        '<button class="btn btn-sm" onclick="modalNuevoUsuario(' + u.id + ')">Editar</button> ' +
        '<button class="btn btn-sm btn-ghost" onclick="toggleUsuarioActivo(' + u.id + ')">' +
          (u.activo !== false ? 'Desactivar' : 'Activar') +
        '</button> ' +
        '<button class="btn btn-sm btn-danger" onclick="eliminarUsuario(' + u.id + ')">Eliminar</button>' +
      '</td>' +
    '</tr>';
  });

  html += '</tbody></table></div>';
  el.innerHTML = html;
}

function modalNuevoUsuario(existingId) {
  var user = null;
  if (existingId) {
    user = (getDB().usuarios || []).find(function(u) { return u.id === existingId; });
  }

  var nombre = user ? esc(user.nombre) : '';
  var pin = '';
  var rol = user ? (user.rol || 'operador') : 'operador';

  var html = '<div class="fr1 mb-12">' +
    '<div><label>Nombre</label><input type="text" id="usr-nombre" value="' + nombre + '" placeholder="Nombre del usuario"></div>' +
    '<div><label>PIN (4 digitos)</label><input type="password" id="usr-pin" value="' + pin + '" maxlength="4" placeholder="' + (user ? 'Dejar vacio para no cambiar' : '4 digitos') + '"></div>' +
    '<div><label>Rol</label><select id="usr-rol">' + optHtml(ROLES, rol) + '</select></div>' +
  '</div>' +
  '<div class="alert alert-err mb-12" id="usr-alert"></div>' +
  '<button class="btn btn-gold btn-full" onclick="guardarUsuario(' + (existingId || 'null') + ')">Guardar</button>';

  openModal(existingId ? 'Editar Usuario' : 'Nuevo Usuario', html);
}

function guardarUsuario(existingId) {
  var nombreInput = document.getElementById('usr-nombre');
  var pinInput = document.getElementById('usr-pin');
  var rolInput = document.getElementById('usr-rol');

  var nombre = (nombreInput ? nombreInput.value : '').trim();
  var pin = pinInput ? pinInput.value : '';
  var rol = rolInput ? rolInput.value : 'operador';

  if (!nombre) {
    var alertEl = document.getElementById('usr-alert');
    if (alertEl) { alertEl.textContent = 'El nombre es obligatorio'; alertEl.classList.add('show'); }
    return;
  }

  if (!existingId && (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin))) {
    var alertEl2 = document.getElementById('usr-alert');
    if (alertEl2) { alertEl2.textContent = 'El PIN debe ser exactamente 4 digitos'; alertEl2.classList.add('show'); }
    return;
  }

  if (existingId && pin && pin.length > 0 && (!/^\d{4}$/.test(pin))) {
    var alertEl3 = document.getElementById('usr-alert');
    if (alertEl3) { alertEl3.textContent = 'El PIN debe ser exactamente 4 digitos'; alertEl3.classList.add('show'); }
    return;
  }

  var db = getDB();

  if (existingId) {
    var user = db.usuarios.find(function(u) { return u.id === existingId; });
    if (user) {
      user.nombre = nombre;
      user.rol = rol;
      if (pin && pin.length === 4) user.pin = pin;
    }
  } else {
    db.usuarios.push({
      id: nextId(),
      nombre: nombre,
      pin: pin,
      rol: rol,
      activo: true,
      creadoEn: new Date().toISOString()
    });
  }

  saveDB();
  closeModal();
  refreshPage();
  toast(existingId ? 'Usuario actualizado' : 'Usuario creado');
}

function toggleUsuarioActivo(id) {
  var db = getDB();
  var user = db.usuarios.find(function(u) { return u.id === id; });
  if (!user) return;
  if (user.id === (currentUser ? currentUser.id : 0)) {
    toast('No puedes desactivarte a ti mismo', 'err');
    return;
  }
  user.activo = !user.activo;
  saveDB();
  refreshPage();
  toast('Usuario ' + (user.activo ? 'activado' : 'desactivado'));
}

function eliminarUsuario(id) {
  if (id === (currentUser ? currentUser.id : 0)) {
    toast('No puedes eliminarte a ti mismo', 'err');
    return;
  }
  if (!confirm('Eliminar este usuario?')) return;
  var db = getDB();
  db.usuarios = db.usuarios.filter(function(u) { return u.id !== id; });
  saveDB();
  refreshPage();
  toast('Usuario eliminado');
}

// =====================================================================
//  9. AJUSTES
// =====================================================================

function renderAjustes() {
  var el = document.getElementById('page-ajustes');
  if (!el) return;

  var isOnline = fbIsOnline();
  var onlineBadge = isOnline ? '<span class="badge bg">Online</span>' : '<span class="badge br">Offline</span>';

  var html = '<h2 class="page-title">Ajustes</h2>' +
    '<div class="card mb-12">' +
      '<div class="section-title mb-8">Datos</div>' +
      '<div class="fr1">' +
        '<button class="btn btn-sm" onclick="exportarExcel()">Exportar a Excel</button>' +
        '<button class="btn btn-sm" onclick="importarExcel()">Importar desde Excel</button>' +
        '<input type="file" id="import-file-input" accept=".xlsx,.xls" style="display:none">' +
      '</div>' +
    '</div>' +
    '<div class="card mb-12">' +
      '<div class="section-title mb-8">Sincronizacion</div>' +
      '<div class="flex items-center gap-8 mb-8">' +
        '<span class="text-muted text-sm">Estado:</span> ' + onlineBadge +
      '</div>' +
      '<button class="btn btn-sm" onclick="fbForceReload()">Sincronizar con Firebase</button>' +
    '</div>' +
    '<div class="card mb-12">' +
      '<div class="section-title mb-8 text-red">Zona peligrosa</div>' +
      '<div class="fr1">' +
        '<button class="btn btn-sm" onclick="limpiarDatos()">Limpiar datos locales</button>' +
        '<button class="btn btn-sm btn-danger" onclick="borrarDatosFirebase()">Borrar datos Firebase</button>' +
      '</div>' +
    '</div>' +
    '<div class="card">' +
      '<div class="text-xs text-muted">Arcano ERP v1.0.0 &mdash; Complice del Sabor</div>' +
    '</div>';

  el.innerHTML = html;
}

function exportarExcel() {
  if (typeof XLSX === 'undefined') {
    toast('Libreria XLSX no disponible', 'err');
    return;
  }

  var db = getDB();
  var wb = XLSX.utils.book_new();

  // Productos sheet
  var productosData = (db.productos || []).map(function(p) {
    return {
      ID: p.id,
      Nombre: p.nombre,
      Tipo: p.tipo,
      Unidad: p.unidad || '',
      Stock: p.stock || 0,
      StockMin: p.stockMin || 0,
      CostoPor1000gr: p.costoPor1000gr || 0,
      PrecioCosto: p.precioCosto || 0,
      PrecioVenta: p.precioVenta || 0,
      Categoria: p.categoria || '',
      Proveedor: p.proveedor || ''
    };
  });
  var wsProductos = XLSX.utils.json_to_sheet(productosData);
  XLSX.utils.book_append_sheet(wb, wsProductos, 'Productos');

  // Blends sheet
  var blendsData = (db.blends || []).map(function(b) {
    var recetaStr = '';
    if (b.receta && b.receta.length) {
      recetaStr = b.receta.map(function(r) {
        return (r.nombre || '') + ':' + r.porcentaje + '%';
      }).join('; ');
    }
    return {
      ID: b.id,
      Nombre: b.nombre,
      Descripcion: b.descripcion || '',
      Formato: b.formato || '',
      GramosPorUnidad: b.gramosPorUnidad || 100,
      PrecioVenta: b.precioVenta || 0,
      CostoUnitario: b.costoUnitario || 0,
      Stock: b.stock || 0,
      Receta: recetaStr,
      EtiquetaID: b.etiquetaId || ''
    };
  });
  var wsBlends = XLSX.utils.json_to_sheet(blendsData);
  XLSX.utils.book_append_sheet(wb, wsBlends, 'Blends');

  // Compras sheet
  var comprasData = (db.compras || []).map(function(c) {
    return {
      ID: c.id,
      ProductoID: c.productoId || '',
      ProductoNombre: c.productoNombre || '',
      Proveedor: c.proveedor || '',
      Cantidad: c.cantidad || 0,
      Unidad: c.unidad || '',
      CostoTotal: c.costoTotal || 0,
      Estado: c.estado || '',
      Fecha: c.fecha || '',
      Notas: c.notas || ''
    };
  });
  var wsCompras = XLSX.utils.json_to_sheet(comprasData);
  XLSX.utils.book_append_sheet(wb, wsCompras, 'Compras');

  // Ventas sheet
  var ventasData = (db.ventas || []).map(function(v) {
    var itemsStr = '';
    if (v.items && v.items.length) {
      itemsStr = v.items.map(function(item) {
        return (item.nombre || '') + ' x' + item.cantidad + ' ' + (item.subtotal || 0);
      }).join('; ');
    }
    return {
      ID: v.id,
      Tipo: v.tipo || 'mostrador',
      Items: itemsStr,
      Total: v.total || 0,
      Estado: v.estado || '',
      CreadoPor: v.creadoPorNombre || '',
      Fecha: v.fecha || ''
    };
  });
  var wsVentas = XLSX.utils.json_to_sheet(ventasData);
  XLSX.utils.book_append_sheet(wb, wsVentas, 'Ventas');

  var fileName = 'arcano_erp_' + new Date().toISOString().slice(0, 10) + '.xlsx';
  XLSX.writeFile(wb, fileName);
  toast('Excel exportado');
}

function importarExcel() {
  var input = document.getElementById('import-file-input');
  if (!input) return;

  input.onchange = function(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function(ev) {
      try {
        if (typeof XLSX === 'undefined') {
          toast('Libreria XLSX no disponible', 'err');
          return;
        }

        var data = new Uint8Array(ev.target.result);
        var workbook = XLSX.read(data, { type: 'array' });

        var db = getDB();
        var added = 0;
        var updated = 0;

        // Import productos
        var wsProductos = workbook.Sheets['Productos'];
        if (wsProductos) {
          var rows = XLSX.utils.sheet_to_json(wsProductos);
          rows.forEach(function(row) {
            var nombre = (row.Nombre || '').trim();
            if (!nombre) return;
            var existing = db.productos.find(function(p) { return p.nombre === nombre; });
            if (existing) {
              if (row.Tipo) existing.tipo = row.Tipo;
              if (row.Unidad) existing.unidad = row.Unidad;
              if (row.Stock !== undefined) existing.stock = Number(row.Stock) || 0;
              if (row.StockMin !== undefined) existing.stockMin = Number(row.StockMin) || 0;
              if (row.CostoPor1000gr !== undefined) existing.costoPor1000gr = Number(row.CostoPor1000gr) || 0;
              if (row.PrecioCosto !== undefined) existing.precioCosto = Number(row.PrecioCosto) || 0;
              if (row.PrecioVenta !== undefined) existing.precioVenta = Number(row.PrecioVenta) || 0;
              if (row.Categoria) existing.categoria = row.Categoria;
              if (row.Proveedor) existing.proveedor = row.Proveedor;
              updated++;
            } else {
              db.productos.push({
                id: nextId(),
                nombre: nombre,
                tipo: row.Tipo || 'especia',
                unidad: row.Unidad || 'gr',
                stock: Number(row.Stock) || 0,
                stockMin: Number(row.StockMin) || 0,
                costoPor1000gr: Number(row.CostoPor1000gr) || 0,
                precioCosto: Number(row.PrecioCosto) || 0,
                precioVenta: Number(row.PrecioVenta) || 0,
                categoria: row.Categoria || '',
                proveedor: row.Proveedor || ''
              });
              added++;
            }
          });
        }

        saveDB();
        refreshPage();
        toast('Importados: ' + added + ' nuevos, ' + updated + ' actualizados');
      } catch(err) {
        toast('Error al importar: ' + (err.message || ''), 'err');
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset input so same file can be re-imported
    input.value = '';
  };

  input.click();
}

function limpiarDatos() {
  if (!confirm('Se borraran todos los datos locales. Esta accion no se puede deshacer. Continuar?')) return;
  if (!confirm('Estas SEGURO? Se perderan todos los productos, ventas, blends, etc.')) return;
  localStorage.removeItem(DB_KEY);
  toast('Datos locales eliminados. Recarga la pagina.');
  setTimeout(function() { location.reload(); }, 1000);
}

function borrarDatosFirebase() {
  if (!confirm('Se borraran TODOS los datos de Firebase. Esta accion afectara a todos los dispositivos. Continuar?')) return;
  if (!confirm('Ultima confirmacion: BORRAR DATOS FIREBASE?')) return;
  try {
    if (typeof fbRef !== 'undefined' && fbRef) {
      fbRef.set(null).then(function() {
        toast('Datos Firebase eliminados');
      }).catch(function(err) {
        toast('Error: ' + (err.message || ''), 'err');
      });
    } else {
      toast('Firebase no disponible', 'err');
    }
  } catch(e) {
    toast('Error: ' + e.message, 'err');
  }
}