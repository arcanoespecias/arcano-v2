/* ===================== ARCANO V2 — DATA LAYER =====================
   Single source of truth. DB_KEY = 'arcano_v2' everywhere.
   Firebase-first: every write goes to Firebase RTDB, then mirrors to localStorage.
   On load: Firebase wins. localStorage is only an offline fallback.
   ===================== */

const DB_KEY = 'arcano_v2';
const FB_PATH = 'arcano/db';

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBvuJusx4_FvAdXhBl89VVlCicNb-yrdzo",
  authDomain: "arcano-6788d.firebaseapp.com",
  databaseURL: "https://arcano-6788d-default-rtdb.firebaseio.com",
  projectId: "arcano-6788d",
  storageBucket: "arcano-6788d.appspot.com",
  messagingSenderId: "544197982462",
  appId: "1:544197982462:web:4e8d7e3e4a9e7c6c7b3a2d"
};

/* ---------- State ---------- */
let _db = null;         // current in-memory data
let _ready = false;     // whether initial load is complete
let _saveTimer = null;  // debounce timer for Firebase writes
let _listeners = [];    // change callbacks

/* ---------- Default empty database ---------- */
function _emptyDB() {
  return {
    especias: {},
    blends: {},
    producciones: {},
    compras: {},
    ventas: {},
    usuarios: {
      admin: { id: 'admin', nombre: 'Administrador', pin: '1234', rol: 'admin', activo: true, creado: new Date().toISOString() }
    },
    meta: {
      nextId: { especias: 1, blends: 1, producciones: 1, compras: 1, ventas: 1, usuarios: 1 }
    }
  };
}

/* ---------- Firebase init ---------- */
let _firebaseApp = null;
let _firebaseDb = null;

function _initFirebase() {
  if (_firebaseDb) return;
  try {
    if (typeof firebase === 'undefined') {
      console.warn('[DB] Firebase SDK not loaded');
      return;
    }
    _firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
    _firebaseDb = firebase.database();
    console.log('[DB] Firebase initialized');
  } catch (e) {
    console.error('[DB] Firebase init error:', e);
  }
}

/* ---------- Get Firebase DB ref ---------- */
function _fbRef() {
  if (!_firebaseDb) _initFirebase();
  return _firebaseDb ? _firebaseDb.ref(FB_PATH) : null;
}

/* ---------- Save to Firebase (debounced) ---------- */
function _saveToFirebase() {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    const ref = _fbRef();
    if (!ref) {
      console.warn('[DB] No Firebase, saving to localStorage only');
      _saveToLocal();
      return;
    }
    ref.set(_db)
      .then(() => {
        console.log('[DB] Saved to Firebase');
        _saveToLocal(); // also mirror locally
      })
      .catch(err => {
        console.error('[DB] Firebase save error:', err);
        _saveToLocal(); // fallback
      });
  }, 300);
}

/* ---------- Save to localStorage ---------- */
function _saveToLocal() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(_db));
  } catch (e) {
    console.error('[DB] localStorage save error:', e);
  }
}

/* ---------- Load from Firebase ---------- */
function _loadFromFirebase() {
  return new Promise((resolve) => {
    const ref = _fbRef();
    if (!ref) {
      console.warn('[DB] No Firebase, loading from localStorage');
      resolve(_loadFromLocal());
      return;
    }
    ref.once('value')
      .then(snap => {
        if (snap.exists() && snap.val()) {
          _db = snap.val();
          console.log('[DB] Loaded from Firebase');
        } else {
          console.log('[DB] Firebase empty, using defaults');
          _db = _emptyDB();
        }
        // Ensure meta structure exists
        if (!_db.meta || !_db.meta.nextId) {
          _db.meta = { nextId: { especias: 1, blends: 1, producciones: 1, compras: 1, ventas: 1, usuarios: 1 } };
        }
        if (!_db.especias) _db.especias = {};
        if (!_db.blends) _db.blends = {};
        if (!_db.producciones) _db.producciones = {};
        if (!_db.compras) _db.compras = {};
        if (!_db.ventas) _db.ventas = {};
        if (!_db.usuarios) _db.usuarios = {};
        _saveToLocal(); // sync local cache
        resolve(_db);
      })
      .catch(err => {
        console.error('[DB] Firebase load error:', err);
        resolve(_loadFromLocal());
      });
  });
}

/* ---------- Load from localStorage ---------- */
function _loadFromLocal() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      _db = JSON.parse(raw);
      console.log('[DB] Loaded from localStorage');
    } else {
      _db = _emptyDB();
      console.log('[DB] No local data, using defaults');
    }
    // Ensure structure
    if (!_db.meta || !_db.meta.nextId) {
      _db.meta = { nextId: { especias: 1, blends: 1, producciones: 1, compras: 1, ventas: 1, usuarios: 1 } };
    }
    if (!_db.especias) _db.especias = {};
    if (!_db.blends) _db.blends = {};
    if (!_db.producciones) _db.producciones = {};
    if (!_db.compras) _db.compras = {};
    if (!_db.ventas) _db.ventas = {};
    if (!_db.usuarios) _db.usuarios = {};
    return _db;
  } catch (e) {
    console.error('[DB] localStorage load error:', e);
    _db = _emptyDB();
    return _db;
  }
}

/* ---------- Notify listeners ---------- */
function _notify(changeType, collection, id) {
  _listeners.forEach(fn => {
    try { fn(changeType, collection, id); } catch (e) { console.error('[DB] listener error:', e); }
  });
}

/* ==================== PUBLIC API ==================== */

/** Initialize the database. MUST be called before any other operation. */
async function initDB() {
  if (_ready) return _db;
  _initFirebase();
  await _loadFromFirebase();
  _ready = true;

  // Listen for remote changes and overwrite local state
  const ref = _fbRef();
  if (ref) {
    ref.on('value', (snap) => {
      if (snap.exists() && snap.val()) {
        _db = snap.val();
        _saveToLocal();
        _notify('remote_change', '*', '*');
        console.log('[DB] Remote change received');
      }
    });
  }

  return _db;
}

/** Get a reference to the current DB (read-only snapshot). */
function getDB() {
  if (!_db) throw new Error('DB not initialized. Call initDB() first.');
  return JSON.parse(JSON.stringify(_db)); // deep clone
}

/** Register a change listener. Returns unsubscribe function. */
function onDBChange(fn) {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter(l => l !== fn); };
}

/** Generate next ID for a collection. */
function nextId(collection) {
  const validCols = ['especias', 'blends', 'producciones', 'compras', 'ventas', 'usuarios'];
  if (!validCols.includes(collection)) throw new Error('Invalid collection: ' + collection);
  const id = String(_db.meta.nextId[collection] || 1);
  _db.meta.nextId[collection] = (_db.meta.nextId[collection] || 0) + 1;
  _saveToFirebase();
  return id;
}

/* ==================== ESPECIAS ==================== */

function getEspecias() {
  return Object.values(getDB().especias).sort((a, b) => a.nombre.localeCompare(b.nombre));
}

function getEspecia(id) {
  return getDB().especias[id] || null;
}

function saveEspecia(data) {
  const isNew = !data.id;
  if (isNew) {
    data.id = nextId('especias');
    data.creado = new Date().toISOString();
    data.stock = Number(data.stock) || 0;
    data.precioChico = Number(data.precioChico) || 0;
    data.precioGrande = Number(data.precioGrande) || 0;
  }
  // Ensure numeric fields
  data.stock = Number(data.stock) || 0;
  data.precioChico = Number(data.precioChico) || 0;
  data.precioGrande = Number(data.precioGrande) || 0;
  _db.especias[data.id] = data;
  _saveToFirebase();
  _notify(isNew ? 'create' : 'update', 'especias', data.id);
  console.log(`[DB] Especia ${isNew ? 'created' : 'updated'}: ${data.id} - ${data.nombre}`);
  return data;
}

function deleteEspecia(id) {
  if (!_db.especias[id]) return false;
  delete _db.especias[id];
  _saveToFirebase();
  _notify('delete', 'especias', id);
  return true;
}

/* ==================== BLENDS ==================== */

function getBlends() {
  return Object.values(getDB().blends).sort((a, b) => a.nombre.localeCompare(b.nombre));
}

function getBlend(id) {
  return getDB().blends[id] || null;
}

function saveBlend(data) {
  const isNew = !data.id;
  if (isNew) {
    data.id = nextId('blends');
    data.creado = new Date().toISOString();
    data.stock = Number(data.stock) || 0;
    data.precioChico = Number(data.precioChico) || 0;
    data.precioGrande = Number(data.precioGrande) || 0;
    data.ingredientes = data.ingredientes || [];
  }
  data.stock = Number(data.stock) || 0;
  data.precioChico = Number(data.precioChico) || 0;
  data.precioGrande = Number(data.precioGrande) || 0;
  _db.blends[data.id] = data;
  _saveToFirebase();
  _notify(isNew ? 'create' : 'update', 'blends', data.id);
  console.log(`[DB] Blend ${isNew ? 'created' : 'updated'}: ${data.id} - ${data.nombre}`);
  return data;
}

/** Produce blend: consume especias stock, add blend stock, create produccion record (etiqueta). */
function producirBlend(blendId, cantidad) {
  const blend = _db.blends[blendId];
  if (!blend) throw new Error('Blend no encontrado: ' + blendId);
  cantidad = Number(cantidad) || 0;
  if (cantidad <= 0) throw new Error('Cantidad debe ser mayor a 0');

  const ingredientes = blend.ingredientes || [];
  const detalleIngredientes = [];

  // Check especias stock
  for (const ing of ingredientes) {
    const esp = _db.especias[ing.especiaId];
    if (!esp) throw new Error('Especia no encontrada: ' + ing.especiaId);
    const needed = (ing.cantidad || 0) * cantidad;
    if (esp.stock < needed) {
      throw new Error('Stock insuficiente de "' + esp.nombre + '". Necesario: ' + needed + ', Disponible: ' + esp.stock);
    }
  }

  // All checks passed — consume especias stock and record
  for (const ing of ingredientes) {
    const esp = _db.especias[ing.especiaId];
    const needed = (ing.cantidad || 0) * cantidad;
    esp.stock -= needed;
    detalleIngredientes.push({
      especiaId: ing.especiaId,
      especiaNombre: esp.nombre,
      cantidadPorUnidad: ing.cantidad || 0,
      cantidadTotal: needed
    });
  }

  // Add blend stock (etiquetas producidas)
  blend.stock += cantidad;

  // Create produccion record
  const prodId = nextId('producciones');
  const produccion = {
    id: prodId,
    blendId: blendId,
    blendNombre: blend.nombre,
    categoria: blend.categoria || '',
    cantidad: cantidad,
    ingredientesUsados: detalleIngredientes,
    fecha: new Date().toISOString().slice(0, 10),
    creado: new Date().toISOString()
  };
  _db.producciones[prodId] = produccion;

  _saveToFirebase();
  _notify('create', 'producciones', prodId);
  _notify('update', 'blends', blendId);
  console.log('[DB] Etiquetas producidas: ' + blend.nombre + ' x' + cantidad + ' (prod #' + prodId + ')');
  return { blend, produccion };
}

function deleteBlend(id) {
  if (!_db.blends[id]) return false;
  delete _db.blends[id];
  _saveToFirebase();
  _notify('delete', 'blends', id);
  return true;
}

/* ==================== PRODUCCIONES (ETIQUETAS) ==================== */

function getProducciones() {
  return Object.values(getDB().producciones).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
}

function deleteProduccion(id) {
  if (!_db.producciones[id]) return false;
  delete _db.producciones[id];
  _saveToFirebase();
  _notify('delete', 'producciones', id);
  return true;
}

/** Get current labeled stock — blends with stock > 0, organized as etiquetas. */
function getEtiquetas() {
  const db = getDB();
  return Object.values(db.blends)
    .filter(b => b.stock > 0)
    .map(b => ({
      blendId: b.id,
      nombre: b.nombre,
      categoria: b.categoria || '',
      stock: b.stock,
      precioChico: b.precioChico || 0,
      precioGrande: b.precioGrande || 0
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/* ==================== COMPRAS ==================== */

function getCompras() {
  return Object.values(getDB().compras).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
}

function saveCompra(data) {
  const isNew = !data.id;
  if (isNew) {
    data.id = nextId('compras');
    data.creado = new Date().toISOString();
    data.fecha = data.fecha || new Date().toISOString().slice(0, 10);
    data.items = data.items || [];
    data.total = Number(data.total) || 0;
  }
  // Add stock from compra items to especias
  if (isNew) {
    for (const item of data.items) {
      if (item.especiaId && _db.especias[item.especiaId]) {
        _db.especias[item.especiaId].stock += Number(item.cantidad) || 0;
      }
    }
  }
  _db.compras[data.id] = data;
  _saveToFirebase();
  _notify(isNew ? 'create' : 'update', 'compras', data.id);
  console.log(`[DB] Compra ${isNew ? 'created' : 'updated'}: ${data.id}`);
  return data;
}

function deleteCompra(id) {
  if (!_db.compras[id]) return false;
  delete _db.compras[id];
  _saveToFirebase();
  _notify('delete', 'compras', id);
  return true;
}

/* ==================== VENTAS ==================== */

function getVentas() {
  return Object.values(getDB().ventas).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
}

function saveVenta(data) {
  const isNew = !data.id;
  if (isNew) {
    data.id = nextId('ventas');
    data.creado = new Date().toISOString();
    data.fecha = data.fecha || new Date().toISOString().slice(0, 10);
    data.items = data.items || [];
    data.total = Number(data.total) || 0;
  }
  // Consume stock from venta items — descuenta etiquetas con nombre
  if (isNew) {
    for (const item of data.items) {
      const producto = item.tipo === 'especia' ? _db.especias[item.productoId] : _db.blends[item.productoId];
      if (!producto) throw new Error('Producto no encontrado: ' + item.tipo + '/' + item.productoId);
      const cant = Number(item.cantidad) || 0;
      if (producto.stock < cant) {
        throw new Error('Stock insuficiente de "' + producto.nombre + '". Solicitado: ' + cant + ', Disponible: ' + producto.stock);
      }
      // Store the product name (etiqueta) in the venta item
      item.productoNombre = producto.nombre;
      producto.stock -= cant;
    }
  }
  _db.ventas[data.id] = data;
  _saveToFirebase();
  _notify(isNew ? 'create' : 'update', 'ventas', data.id);
  console.log(`[DB] Venta ${isNew ? 'created' : 'updated'}: ${data.id}`);
  return data;
}

function deleteVenta(id) {
  if (!_db.ventas[id]) return false;
  delete _db.ventas[id];
  _saveToFirebase();
  _notify('delete', 'ventas', id);
  return true;
}

/* ==================== USUARIOS ==================== */

function getUsuarios() {
  return Object.values(getDB().usuarios);
}

function getUsuario(id) {
  return getDB().usuarios[id] || null;
}

function saveUsuario(data) {
  const isNew = !data.id;
  if (isNew) {
    data.id = nextId('usuarios');
    data.creado = new Date().toISOString();
    data.activo = true;
  }
  _db.usuarios[data.id] = data;
  _saveToFirebase();
  _notify(isNew ? 'create' : 'update', 'usuarios', data.id);
  return data;
}

function deleteUsuario(id) {
  if (id === 'admin') return false; // can't delete admin
  if (!_db.usuarios[id]) return false;
  delete _db.usuarios[id];
  _saveToFirebase();
  _notify('delete', 'usuarios', id);
  return true;
}

function authenticateUser(pin) {
  const db = getDB();
  const users = Object.values(db.usuarios);
  const found = users.find(u => u.pin === String(pin) && u.activo !== false);
  if (found) {
    sessionStorage.setItem(DB_KEY + '_session', JSON.stringify(found));
    return found;
  }
  return null;
}

function getCurrentUser() {
  try {
    const raw = sessionStorage.getItem(DB_KEY + '_session');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function logoutUser() {
  sessionStorage.removeItem(DB_KEY + '_session');
}

/* ==================== DASHBOARD STATS ==================== */

function getStats() {
  const db = getDB();
  const especias = Object.values(db.especias);
  const blends = Object.values(db.blends);
  const ventas = Object.values(db.ventas);
  const compras = Object.values(db.compras);

  const today = new Date().toISOString().slice(0, 10);
  const ventasHoy = ventas.filter(v => v.fecha === today);
  const ventasMes = ventas.filter(v => {
    const mes = new Date().toISOString().slice(0, 7);
    return v.fecha && v.fecha.startsWith(mes);
  });

  const totalVentasHoy = ventasHoy.reduce((s, v) => s + (Number(v.total) || 0), 0);
  const totalVentasMes = ventasMes.reduce((s, v) => s + (Number(v.total) || 0), 0);
  const totalComprasMes = compras.filter(v => {
    const mes = new Date().toISOString().slice(0, 7);
    return v.fecha && v.fecha.startsWith(mes);
  }).reduce((s, c) => s + (Number(c.total) || 0), 0);

  const especiasBajoStock = especias.filter(e => e.stock <= 3);
  const blendsBajoStock = blends.filter(b => b.stock <= 3);

  return {
    totalEspecias: especias.length,
    totalBlends: blends.length,
    totalVentas: ventas.length,
    totalCompras: compras.length,
    ventasHoy: ventasHoy.length,
    totalVentasHoy,
    ventasMes: ventasMes.length,
    totalVentasMes,
    totalComprasMes,
    especiasBajoStock,
    blendsBajoStock
  };
}

/* ---------- Export for global scope ---------- */
window.ArcanoDB = {
  initDB, getDB, onDBChange, nextId,
  getEspecias, getEspecia, saveEspecia, deleteEspecia,
  getBlends, getBlend, saveBlend, deleteBlend, producirBlend,
  getProducciones, deleteProduccion, getEtiquetas,
  getCompras, saveCompra, deleteCompra,
  getVentas, saveVenta, deleteVenta,
  getUsuarios, getUsuario, saveUsuario, deleteUsuario,
  authenticateUser, getCurrentUser, logoutUser,
  getStats, DB_KEY, FB_PATH
};