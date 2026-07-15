// ===================== ARCANO ERP — CORE =====================

// ---------- 1. Global State ----------
var currentUser = null;
var currentPage = 'dashboard';
var cart = [];

// ---------- 2. Toast Notification ----------
function toast(msg, type) {
  var el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.style.background = (type === 'err')
    ? '#c0392b'
    : 'linear-gradient(135deg, #c8952e, #e8c547)';
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(function() { el.classList.remove('show'); }, 3000);
}

// ---------- 3. Modal ----------
function openModal(title, bodyHTML) {
  var body = document.getElementById('modal-body');
  if (!body) return;
  body.innerHTML =
    '<div class="modal-header"><h3>' + esc(title) + '</h3>' +
    '<button class="btn-icon" onclick="closeModal()">&times;</button></div>' +
    '<div class="modal-content">' + bodyHTML + '</div>';
  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal() {
  var ov = document.getElementById('modal-overlay');
  if (ov) ov.classList.remove('open');
}

// ---------- 4. Escape HTML ----------
function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------- 5. Select Options Helper ----------
function optHtml(items, selected) {
  if (!items) return '';
  return items.map(function(item) {
    var val, label;
    if (typeof item === 'string') { val = item; label = item; }
    else { val = item.val; label = item.label; }
    var sel = (val === selected) ? ' selected' : '';
    return '<option value="' + esc(val) + '"' + sel + '>' + esc(label) + '</option>';
  }).join('');
}

// ---------- 6. Migration ----------
function migrateData() {
  var db = getDB();
  var changed = false;

  // Patch users missing activo, rol, creadoEn
  db.usuarios.forEach(function(u) {
    if (u.activo === undefined) { u.activo = true; changed = true; }
    if (!u.rol) { u.rol = 'operador'; changed = true; }
    if (!u.creadoEn) { u.creadoEn = new Date().toISOString(); changed = true; }
  });

  // Filter out bolsa/packaging, rename envase -> frasco
  var before = db.productos.length;
  db.productos = db.productos.filter(function(p) {
    return p.tipo !== 'bolsa' && p.tipo !== 'packaging';
  });
  if (db.productos.length !== before) changed = true;
  db.productos.forEach(function(p) {
    if (p.tipo === 'envase') { p.tipo = 'frasco'; changed = true; }
  });

  // Blends: add formato/gramosPorUnidad, migrate old cantidad -> porcentaje
  db.blends.forEach(function(b) {
    if (!b.formato) { b.formato = 'polvo'; changed = true; }
    if (!b.gramosPorUnidad) { b.gramosPorUnidad = 100; changed = true; }
    if (b.receta && b.receta.length > 0 && b.receta[0].porcentaje === undefined) {
      var totalCant = b.receta.reduce(function(a, r) { return a + (r.cantidad || 0); }, 0);
      if (totalCant > 0) {
        b.receta.forEach(function(r) {
          r.porcentaje = Math.round((r.cantidad / totalCant) * 100);
          delete r.cantidad;
        });
        changed = true;
      }
    }
  });

  if (changed) saveDB();
}

// ---------- 7. Seed Data ----------
function seedIfEmpty() {
  var db = getDB();
  var hasAdmin = db.usuarios.some(function(u) { return u.rol === 'admin'; });
  if (hasAdmin) return;

  // Admin user
  db.usuarios.push({
    id: nextId(), nombre: 'Admin', pin: '1234',
    rol: 'admin', activo: true, creadoEn: new Date().toISOString()
  });

  // 6 especias
  var especias = [
    { nombre: 'Curcuma',    costoPor1000gr: 45000,  stock: 400, stockMin: 100, categoria: 'Gastronomia',    precioVenta: 55,   proveedor: 'Especias del Oriente' },
    { nombre: 'Comino',     costoPor1000gr: 55000,  stock: 350, stockMin: 100, categoria: 'Gastronomia',    precioVenta: 65,   proveedor: 'Especias del Oriente' },
    { nombre: 'Pimienta Negra', costoPor1000gr: 70000, stock: 300, stockMin: 80, categoria: 'Gastronomia', precioVenta: 80, proveedor: 'Especias del Oriente' },
    { nombre: 'Canela',     costoPor1000gr: 90000,  stock: 250, stockMin: 60,  categoria: 'Infusion',       precioVenta: 100,  proveedor: 'Especias del Oriente' },
    { nombre: 'Azafran',    costoPor1000gr: 800000, stock: 200, stockMin: 50,  categoria: 'Cocteleria',     precioVenta: 900,  proveedor: 'Especias del Oriente' },
    { nombre: 'Chile Ahumado', costoPor1000gr: 60000, stock: 500, stockMin: 120, categoria: 'Gastronomia', precioVenta: 75, proveedor: 'Especias del Oriente' }
  ];
  especias.forEach(function(e) {
    db.productos.push({
      id: nextId(), nombre: e.nombre, tipo: 'especia',
      unidad: 'gr', stock: e.stock, stockMin: e.stockMin,
      costoPor1000gr: e.costoPor1000gr,
      precioCosto: Math.round(e.costoPor1000gr / 1000),
      precioVenta: e.precioVenta,
      categoria: e.categoria, proveedor: e.proveedor
    });
  });

  // 2 frascos
  db.productos.push({
    id: nextId(), nombre: 'Frasco Grande 100gr', tipo: 'frasco',
    unidad: 'unidad', stock: 200, stockMin: 50,
    precioCosto: 350, precioVenta: 0, proveedor: ''
  });
  db.productos.push({
    id: nextId(), nombre: 'Frasco Pequeno 50gr', tipo: 'frasco',
    unidad: 'unidad', stock: 300, stockMin: 50,
    precioCosto: 250, precioVenta: 0, proveedor: ''
  });

  // 2 etiquetas
  var etqCurryId = nextId();
  db.productos.push({
    id: etqCurryId, nombre: 'Etiqueta Curry Arcano', tipo: 'etiqueta',
    unidad: 'unidad', stock: 500, stockMin: 100,
    precioCosto: 100, precioVenta: 0, proveedor: ''
  });
  db.productos.push({
    id: nextId(), nombre: 'Etiqueta Mezcla Ahumada', tipo: 'etiqueta',
    unidad: 'unidad', stock: 500, stockMin: 100,
    precioCosto: 100, precioVenta: 0, proveedor: ''
  });

  // 1 sample blend
  var receta = [
    { productoId: 1, nombre: 'Curcuma',         porcentaje: 35 },
    { productoId: 2, nombre: 'Comino',           porcentaje: 20 },
    { productoId: 3, nombre: 'Pimienta Negra',   porcentaje: 15 },
    { productoId: 6, nombre: 'Chile Ahumado',    porcentaje: 30 }
  ];
  db.blends.push({
    id: nextId(), nombre: 'Curry Arcano', formato: 'polvo',
    gramosPorUnidad: 100, precioVenta: 5500,
    costoUnitario: 0, etiquetaId: etqCurryId, receta: receta
  });

  saveDB();
  console.log('[Seed] Datos iniciales creados');
}

// ---------- 8. Auth System ----------
function initApp() {
  hideBootLoader();
  var saved = sessionStorage.getItem('arcano_user');
  if (saved) {
    try {
      var user = JSON.parse(saved);
      var db = getDB();
      var found = db.usuarios.find(function(u) { return u.id === user.id; });
      if (found && found.activo) {
        currentUser = found;
        enterApp();
        return;
      }
    } catch(e) {}
  }
  showStorefront();
}

function showStorefront() {
  var sf = document.getElementById('storefront');
  var aa = document.getElementById('admin-app');
  var ps = document.getElementById('pin-screen');
  if (sf) sf.style.display = 'block';
  if (aa) aa.style.display = 'none';
  if (ps) ps.style.display = 'none';
  if (typeof renderStorefront === 'function') renderStorefront();
}

function hideBootLoader() {
  var loader = document.getElementById('boot-loader');
  if (loader) loader.style.display = 'none';
}

function showLogin() {
  hideBootLoader();
  var db = getDB();
  var users = db.usuarios.filter(function(u) {
    return u.rol !== 'vendedor' && u.activo !== false;
  });
  var ps = document.getElementById('pin-screen');
  if (!ps) return;
  var html = '<div class="pin-users">';
  users.forEach(function(u) {
    var badgeClass = u.rol === 'admin' ? 'badge bg' : 'badge bo';
    html += '<button class="pin-user-btn" onclick="startPinEntry(' + u.id + ')">' +
      '<div class="avatar">' + esc(u.nombre.charAt(0).toUpperCase()) + '</div>' +
      '<div><strong>' + esc(u.nombre) + '</strong><br>' +
      '<span class="' + badgeClass + '">' + esc(u.rol) + '</span></div></button>';
  });
  html += '</div><button class="btn btn-link mt-2" onclick="showStorefront()">Volver a la tienda</button>';
  ps.innerHTML = html;
  ps.style.display = 'flex';
  document.getElementById('storefront').style.display = 'none';
  document.getElementById('admin-app').style.display = 'none';
}

function startPinEntry(userId) {
  window._pinTarget = userId;
  window._pinVal = '';
  var ps = document.getElementById('pin-screen');
  if (!ps) return;
  var html = '<div class="pin-card">' +
    '<p class="pin-label">Ingrese su PIN</p>' +
    '<div class="pin-dots" id="pin-dots">' +
      '<span class="dot"></span><span class="dot"></span>' +
      '<span class="dot"></span><span class="dot"></span>' +
    '</div>' +
    '<p class="pin-error" id="pin-error"></p>' +
    '<div class="numpad">';
  for (var i = 1; i <= 9; i++) {
    html += '<button class="numpad-btn" onclick="pinDigit(\'' + i + '\')">' + i + '</button>';
  }
  html += '<button class="numpad-btn numpad-blank" onclick="pinBack()">&#9003;</button>' +
    '<button class="numpad-btn" onclick="pinDigit(\'0\')">0</button>' +
    '<button class="numpad-btn numpad-cancel" onclick="pinEntryCancel()">X</button>';
  html += '</div></div>';
  ps.innerHTML = html;
  ps.style.display = 'flex';
  updatePinDots();
}

function updatePinDots() {
  var dots = document.querySelectorAll('#pin-dots .dot');
  var len = (window._pinVal || '').length;
  for (var i = 0; i < dots.length; i++) {
    dots[i].classList.toggle('filled', i < len);
  }
}

function pinDigit(d) {
  if (!window._pinVal) window._pinVal = '';
  if (window._pinVal.length >= 4) return;
  window._pinVal += d;
  updatePinDots();
  if (window._pinVal.length === 4) {
    verifyPin(window._pinTarget, window._pinVal);
  }
}

function pinBack() {
  if (!window._pinVal) return;
  window._pinVal = window._pinVal.slice(0, -1);
  updatePinDots();
}

function pinEntryCancel() {
  showLogin();
}

function verifyPin(userId, pin) {
  var db = getDB();
  var user = db.usuarios.find(function(u) { return u.id === userId; });
  if (user && user.pin === pin) {
    currentUser = user;
    sessionStorage.setItem('arcano_user', JSON.stringify(user));
    enterApp();
  } else {
    var errEl = document.getElementById('pin-error');
    if (errEl) errEl.textContent = 'PIN incorrecto';
    window._pinVal = '';
    updatePinDots();
  }
}

function handleLogout() {
  if (!confirm('Cerrar sesion?')) return;
  currentUser = null;
  sessionStorage.removeItem('arcano_user');
  cart = [];
  showStorefront();
}

// ---------- 9. Navigation ----------
var NAV_ITEMS = {
  admin: [
    { id: 'dashboard',  label: 'Dashboard'  },
    { id: 'compras',    label: 'Compras'    },
    { id: 'blends',     label: 'Blends'     },
    { id: 'produccion', label: 'Produccion' },
    { id: 'ventas',     label: 'Ventas'     },
    { id: 'usuarios',   label: 'Usuarios'   },
    { id: 'ajustes',    label: 'Ajustes'    }
  ],
  operador: [
    { id: 'ventas',   label: 'Ventas'   },
    { id: 'blends',   label: 'Blends'  },
    { id: 'ajustes',  label: 'Ajustes'  }
  ]
};

function enterApp() {
  hideBootLoader();
  var ps = document.getElementById('pin-screen');
  var sf = document.getElementById('storefront');
  var aa = document.getElementById('admin-app');
  if (ps) ps.style.display = 'none';
  if (sf) sf.style.display = 'none';
  if (aa) aa.style.display = 'flex';
  buildNav();
  updateUserChip();
  var startPage = (currentUser && currentUser.rol === 'operador') ? 'ventas' : 'dashboard';
  navigateTo(startPage);
}

function buildNav() {
  var nav = document.getElementById('app-nav');
  if (!nav || !currentUser) return;
  var items = NAV_ITEMS[currentUser.rol] || [];
  var html = '';
  items.forEach(function(item) {
    var cls = (item.id === currentPage) ? ' nav-btn active' : ' nav-btn';
    html += '<button class="' + cls + '" data-page="' + item.id + '" onclick="navigateTo(\'' + item.id + '\')">' + esc(item.label) + '</button>';
  });
  nav.innerHTML = html;
}

function navigateTo(page) {
  currentPage = page;
  var nav = document.getElementById('app-nav');
  if (nav) {
    var btns = nav.querySelectorAll('.nav-btn');
    btns.forEach(function(b) {
      b.classList.toggle('active', b.getAttribute('data-page') === page);
    });
  }
  var pages = document.querySelectorAll('.page');
  pages.forEach(function(p) { p.style.display = 'none'; });
  var target = document.getElementById('page-' + page);
  if (target) target.style.display = 'block';
  renderPage(page);
}

function refreshPage() {
  renderPage(currentPage);
}

function updateUserChip() {
  var chip = document.getElementById('user-chip');
  if (!chip || !currentUser) return;
  var badgeClass = currentUser.rol === 'admin' ? 'badge bg' : 'badge bo';
  chip.innerHTML = esc(currentUser.nombre) +
    ' <span class="' + badgeClass + '">' + esc(currentUser.rol) + '</span>' +
    ' <button class="btn-icon" onclick="handleLogout()" title="Salir">&#x2190;</button>';
}

function renderPage(page) {
  switch (page) {
    case 'dashboard':  if (typeof renderDashboard  === 'function') renderDashboard();  break;
    case 'compras':    if (typeof renderCompras    === 'function') renderCompras();    break;
    case 'productos':  if (typeof renderProductos  === 'function') renderProductos();  break;
    case 'blends':     if (typeof renderBlends     === 'function') renderBlends();     break;
    case 'produccion': if (typeof renderProduccion === 'function') renderProduccion(); break;
    case 'ventas':     if (typeof renderVentas     === 'function') renderVentas();     break;
    case 'usuarios':   if (typeof renderUsuarios   === 'function') renderUsuarios();   break;
    case 'ajustes':    if (typeof renderAjustes    === 'function') renderAjustes();    break;
  }
}

// ---------- 10. PWA ----------
var deferredPrompt = null;
window.addEventListener('beforeinstallprompt', function(e) {
  e.preventDefault();
  deferredPrompt = e;
  var banner = document.getElementById('pwa-banner');
  if (banner) banner.style.display = 'flex';
});

function installPWA() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(function() {
    deferredPrompt = null;
    var banner = document.getElementById('pwa-banner');
    if (banner) banner.style.display = 'none';
  });
}

function dismissPWA() {
  var banner = document.getElementById('pwa-banner');
  if (banner) banner.style.display = 'none';
}

// ---------- 11. BOOT SEQUENCE (IIFE) ----------
(function() {
  var statusEl = document.getElementById('boot-status');
  if (statusEl) statusEl.textContent = 'Conectando...';

  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js?v=1').catch(function() {});
    }
  } catch(e) {}

  try { initFirebase(); } catch(e) {}

  var booted = false;
  setTimeout(function() {
    if (!booted) { console.warn('[Boot] Timeout'); initApp(); booted = true; }
  }, 6000);

  try {
    startSync(function() {
      if (!booted) { initApp(); booted = true; }
    });
  } catch(e) {
    if (!booted) { initApp(); booted = true; }
  }
})();