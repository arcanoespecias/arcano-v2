/* ===================== ARCANO V3 — DATA LAYER =====================
   Flujo:
     Insumos → Stock (bolsa grs, envases, etiquetas)
     Produccion → consume insumos → Frascos listos (chico / grande)
     Ventas → consume frascos

   Stock por especia: stockBolsa (grs), stockChico, stockGrande (frascos)
   Stock por blend:   stockChico, stockGrande (frascos)
   Stock global:      envasesChico, envasesGrande
   Etiquetas:         por producto, stockChico, stockGrande
   ===================== */

const DB_KEY = 'arcano_v3';
const FB_PATH = 'arcano/db';
const DB_VERSION = 3;

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBvuJusx4_FvAdXhBl89VVlCicNb-yrdzo",
  authDomain: "arcano-6788d.firebaseapp.com",
  databaseURL: "https://arcano-6788d-default-rtdb.firebaseio.com",
  projectId: "arcano-6788d",
  storageBucket: "arcano-6788d.appspot.com",
  messagingSenderId: "544197982462",
  appId: "1:544197982462:web:4e8d7e3e4a9e7c6c7b3a2d"
};

var _db = null;
var _ready = false;
var _saveTimer = null;
var _listeners = [];

var DEFAULT_IDS = { especias: 1, blends: 1, producciones: 1, ventas: 1, entradas: 1, etiquetas: 1 };

/* ==================== HELPERS ==================== */

function _filterValid(arr) {
  return arr.filter(function(o) { return o && typeof o === 'object'; });
}

function _cleanNulls() {
  var cols = ['especias', 'blends', 'producciones', 'ventas', 'entradas', 'etiquetas'];
  for (var c = 0; c < cols.length; c++) {
    var col = cols[c];
    if (!_db[col]) { _db[col] = {}; continue; }
    var keys = Object.keys(_db[col]);
    for (var j = 0; j < keys.length; j++) {
      if (_db[col][keys[j]] == null || typeof _db[col][keys[j]] !== 'object') {
        delete _db[col][keys[j]];
      }
    }
  }
}

function _ensureStructure() {
  if (!_db || typeof _db !== 'object' || Array.isArray(_db)) {
    _db = null;
    return false;
  }
  if (!_db.meta || !_db.meta.nextId) {
    _db.meta = { nextId: Object.assign({}, DEFAULT_IDS), version: DB_VERSION };
  } else {
    _db.meta.version = DB_VERSION;
    for (var k in DEFAULT_IDS) {
      if (typeof _db.meta.nextId[k] !== 'number') _db.meta.nextId[k] = DEFAULT_IDS[k];
    }
  }
  if (!_db.especias) _db.especias = {};
  if (!_db.blends) _db.blends = {};
  if (!_db.producciones) _db.producciones = {};
  if (!_db.ventas) _db.ventas = {};
  if (!_db.entradas) _db.entradas = {};
  if (!_db.etiquetas) _db.etiquetas = {};
  if (!_db.stockEnvases) _db.stockEnvases = { chico: 0, grande: 0 };
  if (!_db.usuarios) _db.usuarios = {
    admin: { id: 'admin', nombre: 'Administrador', pin: '1234', rol: 'admin', activo: true, creado: new Date().toISOString() }
  };
  _cleanNulls();
  return true;
}

function _emptyDB() {
  return {
    meta: { nextId: Object.assign({}, DEFAULT_IDS), version: DB_VERSION },
    especias: {}, blends: {}, producciones: {}, ventas: {}, entradas: {}, etiquetas: {},
    stockEnvases: { chico: 0, grande: 0 },
    usuarios: { admin: { id: 'admin', nombre: 'Administrador', pin: '1234', rol: 'admin', activo: true, creado: new Date().toISOString() } }
  };
}

function nextId(col) {
  if (!_db.meta.nextId[col]) _db.meta.nextId[col] = 1;
  var id = _db.meta.nextId[col]++;
  return id;
}

/* ==================== FIREBASE ==================== */

var _firebaseApp = null;
var _firebaseDb = null;
var _firebaseRef = null;

function _initFirebase() {
  if (_firebaseDb) return;
  try {
    _firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
    _firebaseDb = firebase.database();
    _firebaseRef = _firebaseDb.ref(FB_PATH);
  } catch (e) {
    console.error('[DB] Firebase init error:', e);
  }
}

function _saveToFirebase() {
  if (!_firebaseRef) return;
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(function() {
    try {
      _firebaseRef.set(_db);
    } catch (e) {
      console.error('[DB] Firebase save error:', e);
    }
  }, 500);
}

function _notify(type, col, id) {
  for (var i = 0; i < _listeners.length; i++) {
    try { _listeners[i](type, col, id); } catch (e) {}
  }
}

/* ==================== INIT ==================== */

function initDB() {
  return new Promise(function(resolve) {
    _initFirebase();

    // Try localStorage cache
    var cached = null;
    try { cached = JSON.parse(localStorage.getItem(DB_KEY)); } catch (e) {}

    if (cached && cached.meta && cached.meta.version === DB_VERSION && _ensureStructureOn(cached)) {
      _db = cached;
      _ready = true;
      _startFirebaseListener();
      resolve();
      return;
    }

    // Load from Firebase
    if (_firebaseRef) {
      _firebaseRef.once('value').then(function(snap) {
        var fbData = snap.val();
        if (fbData && fbData.meta && fbData.meta.version === DB_VERSION && _ensureStructureOn(fbData)) {
          _db = fbData;
        } else {
          // Fresh DB (old version or empty)
          _db = _emptyDB();
          _ensureStructure();
          _saveToFirebase();
        }
        _ready = true;
        _cacheLocal();
        _startFirebaseListener();
        resolve();
      }).catch(function() {
        _db = _emptyDB();
        _ensureStructure();
        _ready = true;
        resolve();
      });
    } else {
      _db = _emptyDB();
      _ensureStructure();
      _ready = true;
      resolve();
    }
  });
}

function _ensureStructureOn(data) {
  if (!data || typeof data !== 'object') return false;
  if (!data.meta || !data.meta.version) return false;
  if (data.meta.version !== DB_VERSION) return false;
  // Basic check
  if (!data.especias || !data.blends) return false;
  return true;
}

function _cacheLocal() {
  try { localStorage.setItem(DB_KEY, JSON.stringify(_db)); } catch (e) {}
}

function _startFirebaseListener() {
  if (!_firebaseRef) return;
  _firebaseRef.on('value', function(snap) {
    var data = snap.val();
    if (!data || !data.meta || data.meta.version !== DB_VERSION) return;
    var prevJson = JSON.stringify(_db);
    _db = data;
    _ensureStructure();
    _cacheLocal();
    var newJson = JSON.stringify(_db);
    if (prevJson !== newJson) {
      _notify('remote_change', '', '');
    }
  });
}

function onDBChange(fn) { _listeners.push(fn); }

/* ==================== GETTERS ==================== */

function getDB() { return _db; }

function getEspecias() {
  return _filterValid(Object.values(_db.especias || {})).sort(function(a, b) { return (a.nombre || '').localeCompare(b.nombre || ''); });
}
function getEspecia(id) { return _db.especias[id] || null; }

function getBlends() {
  return _filterValid(Object.values(_db.blends || {})).sort(function(a, b) { return (a.nombre || '').localeCompare(b.nombre || ''); });
}
function getBlend(id) { return _db.blends[id] || null; }

function getEtiquetas() {
  return _filterValid(Object.values(_db.etiquetas || {})).sort(function(a, b) { return (a.nombre || '').localeCompare(b.nombre || ''); });
}

function getEntradas() {
  return _filterValid(Object.values(_db.entradas || {})).sort(function(a, b) { return (b.fecha || '').localeCompare(a.fecha || ''); });
}
function getProducciones() {
  return _filterValid(Object.values(_db.producciones || {})).sort(function(a, b) { return (b.creado || '').localeCompare(a.creado || ''); });
}
function getVentas() {
  return _filterValid(Object.values(_db.ventas || {})).sort(function(a, b) { return (b.fecha || '').localeCompare(a.fecha || ''); });
}

/* ==================== ESPECIAS ==================== */

function saveEspecia(data) {
  _ensureStructure();
  var isNew = !data.id;
  if (isNew) {
    data.id = nextId('especias');
    data.creado = new Date().toISOString();
  } else {
    var existing = _db.especias[data.id];
    if (existing) {
      data.stockBolsa = Number(existing.stockBolsa) || 0;
      data.stockChico = Number(existing.stockChico) || 0;
      data.stockGrande = Number(existing.stockGrande) || 0;
      data.creado = existing.creado;
    }
  }
  data.nombre = (data.nombre || '').trim();
  data.categoria = data.categoria || 'Comidas';
  data.precioChico = Number(data.precioChico) || 0;
  data.precioGrande = Number(data.precioGrande) || 0;
  data.gramosChico = Number(data.gramosChico) || 0;
  data.gramosGrande = Number(data.gramosGrande) || 0;
  data.stockBolsa = Number(data.stockBolsa) || 0;
  data.stockChico = Number(data.stockChico) || 0;
  data.stockGrande = Number(data.stockGrande) || 0;
  _db.especias[data.id] = data;
  _saveToFirebase(); _cacheLocal();
  _notify(isNew ? 'create' : 'update', 'especias', data.id);
  return data;
}

function deleteEspecia(id) {
  if (!_db.especias[id]) return false;
  delete _db.especias[id];
  _saveToFirebase(); _cacheLocal();
  _notify('delete', 'especias', id);
  return true;
}

/* ==================== BLENDS ==================== */

function saveBlend(data) {
  _ensureStructure();
  var isNew = !data.id;
  if (isNew) {
    data.id = nextId('blends');
    data.creado = new Date().toISOString();
  } else {
    var existing = _db.blends[data.id];
    if (existing) {
      data.stockChico = Number(existing.stockChico) || 0;
      data.stockGrande = Number(existing.stockGrande) || 0;
      data.creado = existing.creado;
    }
  }
  data.nombre = (data.nombre || '').trim();
  data.categoria = data.categoria || 'Comidas';
  data.precioChico = Number(data.precioChico) || 0;
  data.precioGrande = Number(data.precioGrande) || 0;
  data.ingredientes = data.ingredientes || [];
  data.stockChico = Number(data.stockChico) || 0;
  data.stockGrande = Number(data.stockGrande) || 0;
  _db.blends[data.id] = data;
  _saveToFirebase(); _cacheLocal();
  _notify(isNew ? 'create' : 'update', 'blends', data.id);
  return data;
}

function deleteBlend(id) {
  if (!_db.blends[id]) return false;
  delete _db.blends[id];
  _saveToFirebase(); _cacheLocal();
  _notify('delete', 'blends', id);
  return true;
}

/* ==================== ETIQUETAS ==================== */

function _findEtiquetaByNombre(nombre) {
  var keys = Object.keys(_db.etiquetas || {});
  for (var i = 0; i < keys.length; i++) {
    if (_db.etiquetas[keys[i]].nombre === nombre) return _db.etiquetas[keys[i]];
  }
  return null;
}

function _getOrCreateEtiqueta(nombre) {
  if (!_db.etiquetas) _db.etiquetas = {};
  var existing = _findEtiquetaByNombre(nombre);
  if (existing) return existing;
  var id = nextId('etiquetas');
  var nueva = { id: id, nombre: nombre, stockChico: 0, stockGrande: 0, creado: new Date().toISOString() };
  _db.etiquetas[id] = nueva;
  return nueva;
}

/** Get all products (especias+blends) with their etiqueta stock merged */
function getProductosConEtiquetas() {
  var items = [];
  var espKeys = Object.keys(_db.especias || {});
  for (var i = 0; i < espKeys.length; i++) {
    var e = _db.especias[espKeys[i]];
    if (!e || typeof e !== 'object') continue;
    var etq = _findEtiquetaByNombre(e.nombre);
    items.push({
      id: e.id, nombre: e.nombre || '', tipo: 'especia', categoria: e.categoria || '',
      stockChico: etq ? (Number(etq.stockChico) || 0) : 0,
      stockGrande: etq ? (Number(etq.stockGrande) || 0) : 0
    });
  }
  var blKeys = Object.keys(_db.blends || {});
  for (var i = 0; i < blKeys.length; i++) {
    var b = _db.blends[blKeys[i]];
    if (!b || typeof b !== 'object') continue;
    var etq = _findEtiquetaByNombre(b.nombre);
    items.push({
      id: b.id, nombre: b.nombre || '', tipo: 'blend', categoria: b.categoria || '',
      stockChico: etq ? (Number(etq.stockChico) || 0) : 0,
      stockGrande: etq ? (Number(etq.stockGrande) || 0) : 0
    });
  }
  return items.sort(function(a, b) { return a.nombre.localeCompare(b.nombre); });
}

/* ==================== ENTRADAS (Insumos) ==================== */

function saveEntrada(data) {
  _ensureStructure();
  var isNew = !data.id;
  if (isNew) {
    data.id = nextId('entradas');
    data.creado = new Date().toISOString();
    data.fecha = data.fecha || new Date().toISOString().slice(0, 10);
    data.items = data.items || [];
    data.total = Number(data.total) || 0;
  }
  if (isNew) {
    for (var i = 0; i < data.items.length; i++) {
      var item = data.items[i];
      var tipo = item.tipo;
      if (tipo === 'especia_grs') {
        // Add grams to especia stockBolsa
        if (item.especiaId && _db.especias[item.especiaId]) {
          _db.especias[item.especiaId].stockBolsa = (_db.especias[item.especiaId].stockBolsa || 0) + (Number(item.cantidad) || 0);
        }
      } else if (tipo === 'envase') {
        var talla = item.talla || 'chico';
        if (!_db.stockEnvases) _db.stockEnvases = { chico: 0, grande: 0 };
        _db.stockEnvases[talla] = (_db.stockEnvases[talla] || 0) + (Number(item.cantidad) || 0);
      } else if (tipo === 'etiqueta') {
        var etq = _getOrCreateEtiqueta(item.etiquetaNombre);
        var t = item.talla || 'chico';
        if (t === 'grande') {
          etq.stockGrande = (etq.stockGrande || 0) + (Number(item.cantidad) || 0);
        } else {
          etq.stockChico = (etq.stockChico || 0) + (Number(item.cantidad) || 0);
        }
      }
    }
  }
  _db.entradas[data.id] = data;
  _saveToFirebase(); _cacheLocal();
  _notify(isNew ? 'create' : 'update', 'entradas', data.id);
  return data;
}

function deleteEntrada(id) {
  if (!_db.entradas[id]) return false;
  delete _db.entradas[id];
  _saveToFirebase(); _cacheLocal();
  _notify('delete', 'entradas', id);
  return true;
}

/* ==================== PRODUCCION ==================== */

function producirEspecia(especiaId, talla, cantidad) {
  _ensureStructure();
  var esp = _db.especias[especiaId];
  if (!esp) throw new Error('Especia no encontrada');
  talla = (talla === 'grande') ? 'grande' : 'chico';
  cantidad = Number(cantidad) || 0;
  if (cantidad <= 0) throw new Error('La cantidad debe ser mayor a 0');

  var gramosPorFrasco = (talla === 'grande') ? (Number(esp.gramosGrande) || 0) : (Number(esp.gramosChico) || 0);
  if (gramosPorFrasco <= 0) throw new Error('La especia no tiene gramos definidos para frasco ' + talla + '. Editala primero.');

  var grsTotal = gramosPorFrasco * cantidad;

  // Check & consume bolsa
  if ((esp.stockBolsa || 0) < grsTotal) {
    throw new Error('Bolsa insuficiente de "' + esp.nombre + '". Necesitas ' + grsTotal + 'grs, tienes ' + (esp.stockBolsa || 0) + 'grs');
  }

  // Check & consume envases
  if (!_db.stockEnvases) _db.stockEnvases = { chico: 0, grande: 0 };
  if ((_db.stockEnvases[talla] || 0) < cantidad) {
    throw new Error('Envases ' + talla + ' insuficientes. Necesitas ' + cantidad + ', tienes ' + (_db.stockEnvases[talla] || 0));
  }

  // Check & consume etiquetas
  var etq = _findEtiquetaByNombre(esp.nombre);
  var etqStock = etq ? (Number(etq[talla === 'grande' ? 'stockGrande' : 'stockChico']) || 0) : 0;
  if (etqStock < cantidad) {
    throw new Error('Etiquetas ' + talla + ' insuficientes para "' + esp.nombre + '". Necesitas ' + cantidad + ', tienes ' + etqStock);
  }

  // All checks passed — consume
  esp.stockBolsa = (esp.stockBolsa || 0) - grsTotal;
  _db.stockEnvases[talla] = (_db.stockEnvases[talla] || 0) - cantidad;
  if (etq) {
    var etqKey = talla === 'grande' ? 'stockGrande' : 'stockChico';
    etq[etqKey] = (etq[etqKey] || 0) - cantidad;
  }
  var frascoKey = talla === 'grande' ? 'stockGrande' : 'stockChico';
  esp[frascoKey] = (esp[frascoKey] || 0) + cantidad;

  // Record
  var prodId = nextId('producciones');
  var prod = {
    id: prodId, tipo: 'especia', productoId: especiaId, productoNombre: esp.nombre,
    categoria: esp.categoria || '', talla: talla, cantidad: cantidad,
    gramosPorFrasco: gramosPorFrasco, gramosTotal: grsTotal,
    envasesConsumidos: cantidad, etiquetasConsumidas: cantidad,
    fecha: new Date().toISOString().slice(0, 10), creado: new Date().toISOString()
  };
  _db.producciones[prodId] = prod;
  _saveToFirebase(); _cacheLocal();
  _notify('create', 'producciones', prodId);
  _notify('update', 'especias', especiaId);
  return { producto: esp, produccion: prod };
}

function producirBlend(blendId, talla, cantidad) {
  _ensureStructure();
  var blend = _db.blends[blendId];
  if (!blend) throw new Error('Blend no encontrado');
  talla = (talla === 'grande') ? 'grande' : 'chico';
  cantidad = Number(cantidad) || 0;
  if (cantidad <= 0) throw new Error('La cantidad debe ser mayor a 0');

  var ingredientes = blend.ingredientes || [];
  if (ingredientes.length === 0) throw new Error('El blend no tiene ingredientes definidos. Editalo primero.');

  // Check ingredient stock
  var detalleIngredientes = [];
  for (var i = 0; i < ingredientes.length; i++) {
    var ing = ingredientes[i];
    var esp = _db.especias[ing.especiaId];
    if (!esp) throw new Error('Especia "' + (ing.especiaNombre || ing.especiaId) + '" no encontrada');
    var grsPorFrasco = (talla === 'grande') ? (Number(ing.gramosGrande) || 0) : (Number(ing.gramosChico) || 0);
    if (grsPorFrasco <= 0) throw new Error('El ingrediente "' + esp.nombre + '" no tiene gramos para frasco ' + talla);
    var grsNeeded = grsPorFrasco * cantidad;
    if ((esp.stockBolsa || 0) < grsNeeded) {
      throw new Error('Bolsa insuficiente de "' + esp.nombre + '". Necesitas ' + grsNeeded + 'grs, tienes ' + (esp.stockBolsa || 0) + 'grs');
    }
    detalleIngredientes.push({ especiaId: ing.especiaId, especiaNombre: esp.nombre, gramosPorFrasco: grsPorFrasco, gramosTotal: grsNeeded });
  }

  // Check envases
  if (!_db.stockEnvases) _db.stockEnvases = { chico: 0, grande: 0 };
  if ((_db.stockEnvases[talla] || 0) < cantidad) {
    throw new Error('Envases ' + talla + ' insuficientes. Necesitas ' + cantidad + ', tienes ' + (_db.stockEnvases[talla] || 0));
  }

  // Check etiquetas
  var etq = _findEtiquetaByNombre(blend.nombre);
  var etqStock = etq ? (Number(etq[talla === 'grande' ? 'stockGrande' : 'stockChico']) || 0) : 0;
  if (etqStock < cantidad) {
    throw new Error('Etiquetas ' + talla + ' insuficientes para "' + blend.nombre + '". Necesitas ' + cantidad + ', tienes ' + etqStock);
  }

  // All checks passed — consume
  var grsTotalGeneral = 0;
  for (var i = 0; i < detalleIngredientes.length; i++) {
    var d = detalleIngredientes[i];
    var esp = _db.especias[d.especiaId];
    esp.stockBolsa = (esp.stockBolsa || 0) - d.gramosTotal;
    grsTotalGeneral += d.gramosTotal;
  }
  _db.stockEnvases[talla] = (_db.stockEnvases[talla] || 0) - cantidad;
  if (etq) {
    var etqKey = talla === 'grande' ? 'stockGrande' : 'stockChico';
    etq[etqKey] = (etq[etqKey] || 0) - cantidad;
  }
  var frascoKey = talla === 'grande' ? 'stockGrande' : 'stockChico';
  blend[frascoKey] = (blend[frascoKey] || 0) + cantidad;

  var prodId = nextId('producciones');
  var prod = {
    id: prodId, tipo: 'blend', productoId: blendId, productoNombre: blend.nombre,
    categoria: blend.categoria || '', talla: talla, cantidad: cantidad,
    ingredientes: detalleIngredientes, gramosTotal: grsTotalGeneral,
    envasesConsumidos: cantidad, etiquetasConsumidas: cantidad,
    fecha: new Date().toISOString().slice(0, 10), creado: new Date().toISOString()
  };
  _db.producciones[prodId] = prod;
  _saveToFirebase(); _cacheLocal();
  _notify('create', 'producciones', prodId);
  _notify('update', 'blends', blendId);
  return { producto: blend, produccion: prod };
}

function deleteProduccion(id) {
  if (!_db.producciones[id]) return false;
  delete _db.producciones[id];
  _saveToFirebase(); _cacheLocal();
  _notify('delete', 'producciones', id);
  return true;
}

/* ==================== VENTAS ==================== */

function saveVenta(data) {
  _ensureStructure();
  var isNew = !data.id;
  if (isNew) {
    data.id = nextId('ventas');
    data.creado = new Date().toISOString();
    data.fecha = data.fecha || new Date().toISOString().slice(0, 10);
    data.items = data.items || [];
    data.total = Number(data.total) || 0;
  }
  if (isNew) {
    for (var i = 0; i < data.items.length; i++) {
      var item = data.items[i];
      var producto;
      if (item.tipo === 'especia') {
        producto = _db.especias[item.productoId];
        if (!producto) throw new Error('Especia no encontrada: ' + item.productoId);
      } else {
        producto = _db.blends[item.productoId];
        if (!producto) throw new Error('Blend no encontrado: ' + item.productoId);
      }
      item.productoNombre = producto.nombre;
      var cant = Number(item.cantidad) || 0;
      var talla = item.talla || 'chico';
      var stockKey = talla === 'grande' ? 'stockGrande' : 'stockChico';
      if ((producto[stockKey] || 0) < cant) {
        throw new Error('Stock insuficiente de frascos ' + talla + ' de "' + producto.nombre + '". Solicitado: ' + cant + ', Disponible: ' + (producto[stockKey] || 0));
      }
      producto[stockKey] = (producto[stockKey] || 0) - cant;
      item.precioUnitario = Number(item.precioUnitario) || 0;
      item.subtotal = item.precioUnitario * cant;
    }
    // Recalculate total
    data.total = data.items.reduce(function(s, it) { return s + (it.subtotal || 0); }, 0);
  }
  _db.ventas[data.id] = data;
  _saveToFirebase(); _cacheLocal();
  _notify(isNew ? 'create' : 'update', 'ventas', data.id);
  return data;
}

function deleteVenta(id) {
  if (!_db.ventas[id]) return false;
  delete _db.ventas[id];
  _saveToFirebase(); _cacheLocal();
  _notify('delete', 'ventas', id);
  return true;
}

/* ==================== AUTH ==================== */

function authenticateUser(pin) {
  var users = _db.usuarios || {};
  var keys = Object.keys(users);
  for (var i = 0; i < keys.length; i++) {
    var u = users[keys[i]];
    if (u && u.pin === pin && u.activo !== false) {
      var session = { id: u.id, nombre: u.nombre, rol: u.rol };
      sessionStorage.setItem(DB_KEY + '_session', JSON.stringify(session));
      return session;
    }
  }
  return null;
}

function getCurrentUser() {
  try { var r = sessionStorage.getItem(DB_KEY + '_session'); return r ? JSON.parse(r) : null; } catch (e) { return null; }
}
function logoutUser() { sessionStorage.removeItem(DB_KEY + '_session'); }

function getUsuarios() {
  return _filterValid(Object.values(_db.usuarios || {}));
}
function saveUsuario(data) {
  _ensureStructure();
  _db.usuarios[data.id] = data;
  _saveToFirebase(); _cacheLocal();
  return data;
}
function deleteUsuario(id) {
  if (id === 'admin') return false;
  delete _db.usuarios[id];
  _saveToFirebase(); _cacheLocal();
  return true;
}

/* ==================== STATS ==================== */

function getStats() {
  var especias = _filterValid(Object.values(_db.especias || {}));
  var blends = _filterValid(Object.values(_db.blends || {}));
  var ventas = _filterValid(Object.values(_db.ventas || {}));
  var etiquetas = _filterValid(Object.values(_db.etiquetas || {}));
  var envases = _db.stockEnvases || { chico: 0, grande: 0 };

  var today = new Date().toISOString().slice(0, 10);
  var mes = new Date().toISOString().slice(0, 7);
  var ventasHoy = ventas.filter(function(v) { return v.fecha === today; });
  var ventasMes = ventas.filter(function(v) { return v.fecha && v.fecha.startsWith(mes); });

  var frascosChico = especias.reduce(function(s, e) { return s + (e.stockChico || 0); }, 0) +
                     blends.reduce(function(s, b) { return s + (b.stockChico || 0); }, 0);
  var frascosGrande = especias.reduce(function(s, e) { return s + (e.stockGrande || 0); }, 0) +
                      blends.reduce(function(s, b) { return s + (b.stockGrande || 0); }, 0);

  var etqBajo = etiquetas.filter(function(e) { return (e.stockChico + e.stockGrande) <= 5; });
  var espBolsaBaja = especias.filter(function(e) { return (e.stockBolsa || 0) <= 50; });

  return {
    totalEspecias: especias.length,
    totalBlends: blends.length,
    totalProductos: especias.length + blends.length,
    frascosChico: frascosChico,
    frascosGrande: frascosGrande,
    totalFrascos: frascosChico + frascosGrande,
    envasesChico: envases.chico || 0,
    envasesGrande: envases.grande || 0,
    ventasHoy: ventasHoy.length,
    totalVentasHoy: ventasHoy.reduce(function(s, v) { return s + (Number(v.total) || 0); }, 0),
    ventasMes: ventasMes.length,
    totalVentasMes: ventasMes.reduce(function(s, v) { return s + (Number(v.total) || 0); }, 0),
    especiasBolsaBaja: espBolsaBaja,
    etiquetasBajas: etqBajo
  };
}

/** Items for venta selection: products with frascos > 0 */
function getFrascosParaVender() {
  var items = [];
  var espKeys = Object.keys(_db.especias || {});
  for (var i = 0; i < espKeys.length; i++) {
    var e = _db.especias[espKeys[i]];
    if (!e || typeof e !== 'object') continue;
    if ((e.stockChico || 0) > 0) items.push({ tipo: 'especia', id: e.id, nombre: e.nombre, talla: 'chico', stock: e.stockChico, precio: e.precioChico || 0 });
    if ((e.stockGrande || 0) > 0) items.push({ tipo: 'especia', id: e.id, nombre: e.nombre, talla: 'grande', stock: e.stockGrande, precio: e.precioGrande || 0 });
  }
  var blKeys = Object.keys(_db.blends || {});
  for (var i = 0; i < blKeys.length; i++) {
    var b = _db.blends[blKeys[i]];
    if (!b || typeof b !== 'object') continue;
    if ((b.stockChico || 0) > 0) items.push({ tipo: 'blend', id: b.id, nombre: b.nombre, talla: 'chico', stock: b.stockChico, precio: b.precioChico || 0 });
    if ((b.stockGrande || 0) > 0) items.push({ tipo: 'blend', id: b.id, nombre: b.nombre, talla: 'grande', stock: b.stockGrande, precio: b.precioGrande || 0 });
  }
  return items.sort(function(a, b) { return a.nombre.localeCompare(b.nombre); });
}

/* ==================== EXPORT ==================== */

window.ArcanoDB = {
  initDB: initDB, getDB: getDB, onDBChange: onDBChange, nextId: nextId,
  getEspecias: getEspecias, getEspecia: getEspecia, saveEspecia: saveEspecia, deleteEspecia: deleteEspecia,
  getBlends: getBlends, getBlend: getBlend, saveBlend: saveBlend, deleteBlend: deleteBlend,
  getEtiquetas: getEtiquetas, getProductosConEtiquetas: getProductosConEtiquetas,
  getEntradas: getEntradas, saveEntrada: saveEntrada, deleteEntrada: deleteEntrada,
  producirEspecia: producirEspecia, producirBlend: producirBlend,
  getProducciones: getProducciones, deleteProduccion: deleteProduccion,
  getFrascosParaVender: getFrascosParaVender,
  getVentas: getVentas, saveVenta: saveVenta, deleteVenta: deleteVenta,
  getUsuarios: getUsuarios, saveUsuario: saveUsuario, deleteUsuario: deleteUsuario,
  authenticateUser: authenticateUser, getCurrentUser: getCurrentUser, logoutUser: logoutUser,
  getStats: getStats,
  DB_KEY: DB_KEY, FB_PATH: FB_PATH
};