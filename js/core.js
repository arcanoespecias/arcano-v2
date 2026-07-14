// ===================== CORE MODULE =====================
// Auth (PIN), routing, toast, modal, seed data, PWA.

var currentUser = null;
var currentPage = 'dashboard';
var cart = []; // Storefront cart

// ============ TOAST ============
var _toastTimer = null;
function toast(msg, type) {
  var el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  if (type === 'err') {
    el.style.background = 'var(--red)';
    el.style.color = '#fff';
  } else {
    el.style.background = 'linear-gradient(135deg, var(--gold), var(--gold2))';
    el.style.color = '#1a0e00';
  }
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function() { el.style.display = 'none'; }, 3000);
}

// ============ MODAL ============
function openModal(title, bodyHTML) {
  var overlay = document.getElementById('modal-overlay');
  var body = document.getElementById('modal-body');
  body.innerHTML = '<div class="modal-header"><div class="modal-title">' + title + '</div><button class="modal-close" onclick="closeModal()">&times;</button></div>' + bodyHTML;
  overlay.classList.add('open');
}
function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

// ============ SEED DATA ============
function migrateData() {
  // Patch old-format users (missing activo field)
  var db = getDB();
  var changed = false;
  (db.usuarios || []).forEach(function(u) {
    if (u.activo === undefined) { u.activo = true; changed = true; }
    if (!u.rol) { u.rol = 'admin'; changed = true; }
    if (!u.creadoEn) { u.creadoEn = new Date().toISOString(); changed = true; }
  });
  // Migrate old product types: envase → frasco, packaging/bolsa → removed
  if (db.productos) {
    var before = db.productos.length;
    db.productos = db.productos.filter(function(p) {
      if (p.tipo === 'envase') { p.tipo = 'frasco'; changed = true; }
      if (p.tipo === 'packaging' || p.tipo === 'bolsa') { changed = true; return false; }
      return true;
    });
  }
  // Migrate old blends: add formato and etiquetaId if missing
  (db.blends || []).forEach(function(b) {
    if (!b.formato) { b.formato = 'polvo'; changed = true; }
    if (!b.etiquetaId) { changed = true; } // will be set by admin
  });
  // Ensure all collections exist
  if (!db.productos) db.productos = [];
  if (!db.compras) db.compras = [];
  if (!db.blends) db.blends = [];
  if (!db.ventas) db.ventas = [];
  if (!db.movimientos) db.movimientos = [];
  if (changed) { saveDB(); console.log('[Migrate] Datos viejos migrados'); }
}

function seedIfEmpty() {
  var db = getDB();
  // Check specifically for an admin user
  var hasAdmin = (db.usuarios || []).some(function(u) { return u.rol === 'admin'; });
  if (hasAdmin) return false;

  // Create default admin user
  db.usuarios.push({
    id: nextId(),
    nombre: 'Admin',
    pin: '1234',
    rol: 'admin',
    activo: true,
    creadoEn: new Date().toISOString()
  });

  // Sample products
  var especias = [
    { nombre: 'Cúrcuma', tipo: 'especia', unidad: 'gr', precioCosto: 45, precioVenta: 80, stock: 500, stockMin: 100, proveedor: 'Especias del Oriente', notas: 'Polvo fino' },
    { nombre: 'Comino', tipo: 'especia', unidad: 'gr', precioCosto: 55, precioVenta: 100, stock: 400, stockMin: 80, proveedor: 'Especias del Oriente', notas: 'Entero' },
    { nombre: 'Pimienta Negra', tipo: 'especia', unidad: 'gr', precioCosto: 70, precioVenta: 130, stock: 300, stockMin: 60, proveedor: 'Especias del Oriente', notas: '' },
    { nombre: 'Canela', tipo: 'especia', unidad: 'gr', precioCosto: 90, precioVenta: 160, stock: 200, stockMin: 50, proveedor: 'Especias del Oriente', notas: 'Rama' },
    { nombre: 'Azafrán', tipo: 'especia', unidad: 'gr', precioCosto: 800, precioVenta: 1500, stock: 30, stockMin: 10, proveedor: 'Importaciones Premium', notas: 'Hebras' },
    { nombre: 'Chile Ahumado', tipo: 'especia', unidad: 'gr', precioCosto: 60, precioVenta: 110, stock: 350, stockMin: 70, proveedor: 'Especias del Oriente', notas: 'Polvo' }
  ];
  especias.forEach(function(e) {
    e.id = nextId();
    e.creadoEn = new Date().toISOString();
    e.actualizadoEn = e.creadoEn;
    db.productos.push(e);
  });

  // Sample supplies (frascos y etiquetas)
  var insumos = [
    { nombre: 'Frasco Grande 100gr', tipo: 'frasco', unidad: 'unidad', precioCosto: 350, precioVenta: 0, stock: 200, stockMin: 50, proveedor: 'Envases Colombia', notas: 'Vidrio ámbar' },
    { nombre: 'Frasco Pequeño 50gr', tipo: 'frasco', unidad: 'unidad', precioCosto: 250, precioVenta: 0, stock: 300, stockMin: 50, proveedor: 'Envases Colombia', notas: 'Vidrio ámbar' },
    { nombre: 'Etiqueta Curry Arcano', tipo: 'etiqueta', unidad: 'unidad', precioCosto: 100, precioVenta: 0, stock: 500, stockMin: 100, proveedor: 'Imprenta Nacional', notas: 'Etiqueta para Curry Arcano' }
  ];
  insumos.forEach(function(e) {
    e.id = nextId();
    e.creadoEn = new Date().toISOString();
    e.actualizadoEn = e.creadoEn;
    db.productos.push(e);
  });

  // Sample blend
  var etiquetaSeedId = 0;
  db.blends.push({
    id: nextId(),
    nombre: 'Curry Arcano',
    descripcion: 'Mezcla especial de la casa con toque ahumado',
    formato: 'polvo',
    etiquetaId: 0, // Will be set after creating etiqueta
    receta: [
      { productoId: 1, nombre: 'Cúrcuma', cantidad: 30, unidad: 'gr' },
      { productoId: 2, nombre: 'Comino', cantidad: 20, unidad: 'gr' },
      { productoId: 3, nombre: 'Pimienta Negra', cantidad: 10, unidad: 'gr' },
      { productoId: 6, nombre: 'Chile Ahumado', cantidad: 15, unidad: 'gr' }
    ],
    costoUnitario: 0,
    precioVenta: 5500,
    stock: 0,
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString()
  });
  // Link etiqueta to blend (etiqueta is the last product created)
  var lastEtiqueta = db.productos.slice().reverse().find(function(p) { return p.tipo === 'etiqueta'; });
  if (lastEtiqueta) {
    db.blends[db.blends.length - 1].etiquetaId = lastEtiqueta.id;
  }

  saveDB();
  console.log('[Seed] Datos iniciales creados - Admin PIN: 1234');
  return true;
}

// ============ AUTH ============
function initPin() {
  var saved = sessionStorage.getItem('arcano_user');
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      var db = getDB();
      var match = db.usuarios.find(function(u) { return u.id === currentUser.id; });
      if (match && match.activo) {
        currentUser = match;
        enterApp();
        return;
      }
    } catch(e) {}
    sessionStorage.removeItem('arcano_user');
    currentUser = null;
  }
  // No saved session -> show storefront
  showStorefront();
}

function showStorefront() {
  document.getElementById('storefront').style.display = 'block';
  document.getElementById('admin-app').style.display = 'none';
  document.getElementById('pin-screen').style.display = 'none';
  renderStorefront();
}

function showLogin() {
  var db = getDB();
  var users = (db.usuarios || []).filter(function(u) { return (u.activo !== false) && u.rol !== 'vendedor'; });
  if (users.length === 0) {
    toast('No hay usuarios registrados', 'err');
    return;
  }

  var html = '<div class="pin-logo">ARCANO</div><div class="pin-sub">Selecciona usuario</div><div class="user-list">';
  users.forEach(function(u) {
    var roleLabel = u.rol === 'admin' ? 'Admin' : 'Operador';
    html += '<button class="user-btn" onclick="startPinEntry(' + u.id + ')">' +
      '<div class="user-avatar">' + u.nombre.charAt(0) + '</div>' +
      '<div><div>' + esc(u.nombre) + '</div><div style="font-size:.7rem;color:var(--muted)">' + roleLabel + '</div></div></button>';
  });
  html += '</div>';
  html += '<button class="btn btn-ghost btn-sm mt-16" onclick="showStorefront()" style="margin-top:16px">Volver a la tienda</button>';

  document.getElementById('pin-screen').style.display = 'flex';
  document.getElementById('admin-app').style.display = 'none';
  document.getElementById('storefront').style.display = 'none';
  document.getElementById('pin-content').innerHTML = html;
}

function startPinEntry(userId) {
  var db = getDB();
  var user = db.usuarios.find(function(u) { return u.id === userId; });
  if (!user) return;

  var pinVal = '';
  var html = '<div class="pin-logo">ARCANO</div>' +
    '<div class="pin-sub">' + esc(user.nombre) + ' &mdash; Ingresa tu PIN</div>' +
    '<div class="pin-display mb-16">';
  for (var i = 0; i < 4; i++) html += '<div class="pin-dot" id="pd-' + i + '"></div>';
  html += '</div><div class="pin-pad">';
  for (var n = 1; n <= 9; n++) html += '<button class="pin-digit" onclick="pinDigit(\'' + n + '\')">' + n + '</button>';
  html += '<button class="pin-digit pin-back" onclick="pinBack()">&larr;</button>';
  html += '<button class="pin-digit" onclick="pinDigit(\'0\')">0</button>';
  html += '<button class="pin-digit pin-back" onclick="pinEntryCancel()">X</button>';
  html += '</div>';

  document.getElementById('pin-content').innerHTML = html;
  window._pinTarget = userId;
  window._pinVal = '';
}

function pinDigit(d) {
  window._pinVal = (window._pinVal || '') + d;
  var len = window._pinVal.length;
  for (var i = 0; i < 4; i++) {
    var dot = document.getElementById('pd-' + i);
    if (dot) dot.className = 'pin-dot' + (i < len ? ' filled' : '');
  }
  if (len === 4) {
    setTimeout(function() { verifyPin(window._pinTarget, window._pinVal); }, 200);
  }
}

function pinBack() {
  window._pinVal = (window._pinVal || '').slice(0, -1);
  var len = window._pinVal.length;
  for (var i = 0; i < 4; i++) {
    var dot = document.getElementById('pd-' + i);
    if (dot) dot.className = 'pin-dot' + (i < len ? ' filled' : '');
  }
}

function pinEntryCancel() {
  showLogin();
}

function verifyPin(userId, pin) {
  var db = getDB();
  var user = db.usuarios.find(function(u) { return u.id === userId; });
  if (!user) { toast('Usuario no encontrado', 'err'); showLogin(); return; }

  if (user.pin === pin) {
    currentUser = user;
    sessionStorage.setItem('arcano_user', JSON.stringify(user));
    toast('Bienvenido, ' + user.nombre);
    enterApp();
  } else {
    toast('PIN incorrecto', 'err');
    window._pinVal = '';
    for (var i = 0; i < 4; i++) {
      var dot = document.getElementById('pd-' + i);
      if (dot) dot.className = 'pin-dot';
    }
  }
}

function handleLogout() {
  if (!confirm('Cerrar sesión?')) return;
  currentUser = null;
  sessionStorage.removeItem('arcano_user');
  showStorefront();
}

// ============ ENTER APP ============
function enterApp() {
  document.getElementById('pin-screen').style.display = 'none';
  document.getElementById('storefront').style.display = 'none';
  document.getElementById('admin-app').style.display = 'block';

  buildNav();
  updateUserChip();

  // Navigate based on role
  if (currentUser.rol === 'admin') {
    navigateTo('dashboard');
  } else if (currentUser.rol === 'operador') {
    navigateTo('ventas');
  } else {
    showStorefront();
  }
}

// ============ NAVIGATION ============
var NAV_ITEMS = {
  admin: [
    { id: 'dashboard', label: 'Dashboard', icon: '\u2302' },
    { id: 'compras', label: 'Compras', icon: '\u2191' },
    { id: 'productos', label: 'Productos', icon: '\u25CF' },
    { id: 'blends', label: 'Blends', icon: '\u2726' },
    { id: 'ventas', label: 'Ventas', icon: '\u2193' },
    { id: 'usuarios', label: 'Usuarios', icon: '\u263A' },
    { id: 'ajustes', label: 'Ajustes', icon: '\u2699' }
  ],
  operador: [
    { id: 'ventas', label: 'Ventas', icon: '\u2193' },
    { id: 'productos', label: 'Productos', icon: '\u25CF' },
    { id: 'ajustes', label: 'Ajustes', icon: '\u2699' }
  ]
};

function buildNav() {
  var nav = document.getElementById('app-nav');
  var items = NAV_ITEMS[currentUser.rol] || NAV_ITEMS.operador;
  var html = '';
  items.forEach(function(item) {
    html += '<button class="nav-btn' + (item.id === currentPage ? ' active' : '') + '" onclick="navigateTo(\'' + item.id + '\')">' + item.label + '</button>';
  });
  nav.innerHTML = html;
}

function navigateTo(page) {
  currentPage = page;
  // Update nav active state
  var btns = document.querySelectorAll('#app-nav .nav-btn');
  btns.forEach(function(btn) {
    btn.classList.toggle('active', btn.textContent.toLowerCase().replace(/[^a-z]/g,'') === page.replace(/[^a-z]/g,'') ||
      NAV_ITEMS[currentUser.rol].some(function(n) { return n.id === page && n.label === btn.textContent; }));
  });
  // Actually match by page id stored in onclick
  btns.forEach(function(btn) {
    var match = btn.getAttribute('onclick');
    btn.classList.toggle('active', match && match.indexOf("'" + page + "'") !== -1);
  });

  // Hide all pages
  document.querySelectorAll('#app-main .page').forEach(function(p) { p.classList.remove('active'); });

  // Show target page
  var target = document.getElementById('page-' + page);
  if (target) {
    target.classList.add('active');
    renderPage(page);
  }
}

function refreshCurrentPage() {
  if (currentPage && currentUser) {
    renderPage(currentPage);
  } else if (!currentUser) {
    renderStorefront();
  }
}

function updateUserChip() {
  var chip = document.getElementById('user-chip');
  if (!chip || !currentUser) return;
  var roleLabel = currentUser.rol === 'admin' ? 'Admin' : 'Operador';
  chip.innerHTML = currentUser.nombre + ' <span class="badge ba">' + roleLabel + '</span>';
}

// ============ RENDER PAGE DISPATCHER ============
function renderPage(page) {
  switch(page) {
    case 'dashboard': renderDashboard(); break;
    case 'compras': renderCompras(); break;
    case 'productos': renderProductos(); break;
    case 'blends': renderBlends(); break;
    case 'ventas': renderVentas(); break;
    case 'usuarios': renderUsuarios(); break;
    case 'ajustes': renderAjustes(); break;
  }
}

// ============ ESCAPE HTML ============
function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ============ SELECT OPTIONS HELPER ============
function optHtml(items, selected) {
  return items.map(function(it) {
    var val = typeof it === 'string' ? it : it.val;
    var lbl = typeof it === 'string' ? it : it.label;
    return '<option value="' + esc(val) + '"' + (val === selected ? ' selected' : '') + '>' + esc(lbl) + '</option>';
  }).join('');
}

function unitOptions(sel) {
  return UNITS.map(function(u) {
    return '<option value="' + u + '"' + (u === sel ? ' selected' : '') + '>' + u + '</option>';
  }).join('');
}

// ============ PWA ============
var deferredPrompt = null;
window.addEventListener('beforeinstallprompt', function(e) {
  e.preventDefault();
  deferredPrompt = e;
  var banner = document.getElementById('pwa-banner');
  if (banner) banner.style.display = 'block';
});
function installPWA() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt = null;
    dismissPWA();
  }
}
function dismissPWA() {
  var banner = document.getElementById('pwa-banner');
  if (banner) banner.style.display = 'none';
}

// ============ BOOT ============
(function() {
  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js?v=32').catch(function() {});
  }

  initFirebase();

  startFirebaseSync(function(remoteData) {
    if (remoteData) {
      syncLocalIdCounter(remoteData);
    }
    migrateData();
    var seeded = seedIfEmpty();
    initPin();
  });
})();