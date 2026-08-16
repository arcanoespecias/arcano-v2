/* ===================== ARCANO V3 — DATA LAYER =====================
   Flujo:
     Insumos → Stock (pala grs, envases, stickers, bolsas)
     Produccion → consume insumos → Frascos listos (chico / grande)
     Ventas → consume frascos

   Stock por especia: stockBolsa (grs), stockChico, stockGrande (frascos)
   Stock por blend:   stockChico, stockGrande (frascos)
   Stock global:      stockEnvases (chico/grande), stockBolsas (chico/grande), stockCintas
   Stickers:           por producto, stockChico, stockGrande
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
var _localDirty = false;  // prevents Firebase listener from overwriting pending saves

var DEFAULT_IDS = { especias: 1, blends: 1, producciones: 1, ventas: 1, entradas: 1, stickers: 1, ajustes: 1, puntosDeVenta: 1, pdvVentas: 1, packs: 1 };

/* ==================== HELPERS ==================== */

function _filterValid(arr) {
  return arr.filter(function(o) { return o && typeof o === 'object'; });
}

function _cleanNulls() {
  var cols = ['especias', 'blends', 'producciones', 'ventas', 'entradas', 'stickers', 'ajustes'];
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
  if (!_db.stickers) _db.stickers = {};
  if (!_db.ajustes) _db.ajustes = {};
  if (!_db.packs) _db.packs = {};
  // Migration: copy old etiquetas data to stickers
  if (_db.etiquetas && Object.keys(_db.etiquetas).length > 0 && Object.keys(_db.stickers).length === 0) {
    _db.stickers = _db.etiquetas;
  }
  delete _db.etiquetas;
  if (!_db.stockEnvases) _db.stockEnvases = { chico: 0, grande: 0 };
  if (!_db.stockBolsas) _db.stockBolsas = { chico: 0, grande: 0 };
  if (!_db.stockCintas) _db.stockCintas = 0;
  if (!_db.usuarios) _db.usuarios = {
    admin: { id: 'admin', nombre: 'Administrador', pin: '1234', rol: 'admin', activo: true, creado: new Date().toISOString() }
  };
  if (!_db.productTags) _db.productTags = {
    'Comidas': ['Aves', 'Pescados y Mariscos', 'Cerdo', 'Salsas y Aderezos', 'Verduras y Vegetales', 'Granos y Legumbres'],
    'Infusiones': ['Relajante', 'Digestiva', 'Energética', 'Citrica', 'Refrescante', 'Detox', 'Aromatica'],
    'Cocteleria': ['Tropical', 'Citrica', 'Seca', 'Dulce']
  };
  if (!_db.tiendaConfig) _db.tiendaConfig = { logoPago: '' };
  _cleanNulls();
  return true;
}

function _emptyDB() {
  return {
    meta: { nextId: Object.assign({}, DEFAULT_IDS), version: DB_VERSION },
    especias: {}, blends: {}, producciones: {}, ventas: {}, entradas: {}, stickers: {}, ajustes: {}, puntosDeVenta: {}, pdvVentas: {}, packs: {},
    stockEnvases: { chico: 0, grande: 0 },
    stockBolsas: { chico: 0, grande: 0 },
    stockCintas: 0,
    productTags: {
      'Comidas': ['Aves', 'Pescados y Mariscos', 'Cerdo', 'Salsas y Aderezos', 'Verduras y Vegetales', 'Granos y Legumbres'],
      'Infusiones': ['Relajante', 'Digestiva', 'Energética', 'Citrica', 'Refrescante', 'Detox', 'Aromatica'],
      'Cocteleria': ['Tropical', 'Citrica', 'Seca', 'Dulce']
    },
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

/* === Pedidos (path arcano/db/pedidos) === */
var _pedidos = [];           // in-memory list of orders from tienda
var _pedidosRef = null;      // Firebase ref for arcano/db/pedidos
var _pedidosListeners = [];  // callbacks when new pedido arrives

/* === Costos de insumos (separate from _db to avoid sync overwrites) === */
var _costosRef = null;
var _costosInsumos = null;
var _costosReady = false;
var _costosListeners = [];

function _initFirebase() {
  if (_firebaseDb) return;
  try {
    _firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
    _firebaseDb = firebase.database();
    _firebaseRef = _firebaseDb.ref(FB_PATH);
    _pedidosRef = _firebaseDb.ref('arcano/db/pedidos');
    _costosRef = _firebaseDb.ref('arcano/db/costosInsumos');
  } catch (e) {
    console.error('[DB] Firebase init error:', e);
  }
}

function _saveToFirebase() {
  if (!_firebaseRef) return;
  _localDirty = true;
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(function() {
    try {
      var safetyTimer = setTimeout(function() { _localDirty = false; }, 5000);
      _firebaseRef.update(_db, function(error) {
        clearTimeout(safetyTimer);
        _localDirty = false;
        if (error) console.error('[DB] Firebase save error:', error);
      });
    } catch (e) {
      console.error('[DB] Firebase save error:', e);
      _localDirty = false;
    }
  }, 500);
}

function writeField(path, value) {
  if (!_firebaseRef) return;
  try {
    _firebaseRef.child(path).set(value, function(error) {
      if (error) console.error('[DB] writeField error:', path, error);
    });
  } catch (e) {
    console.error('[DB] writeField error:', path, e);
  }
}

function saveNow() {
  return new Promise(function(resolve) {
    if (!_firebaseRef) { resolve(false); return; }
    clearTimeout(_saveTimer);
    _localDirty = true;
    try {
      _firebaseRef.update(_db, function(error) {
        _localDirty = false;
        if (error) { console.error('[DB] Firebase save error:', error); resolve(false); }
        else resolve(true);
      });
    } catch (e) {
      console.error('[DB] Firebase save error:', e);
      _localDirty = false;
      resolve(false);
    }
  });
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

    // Always try localStorage cache for instant UI
    var cached = null;
    try { cached = JSON.parse(localStorage.getItem(DB_KEY)); } catch (e) {}

    if (cached && cached.meta && cached.meta.version === DB_VERSION && _ensureStructureOn(cached)) {
      _db = cached;
      _ensureStructure();  // ensure new fields exist on cached data
      _ready = true;
      _startFirebaseListener();
      _startPedidosListener();
      _startCostosListener();
      resolve();
      return;
    }

    // Load from Firebase
    if (_firebaseRef) {
      _firebaseRef.once('value').then(function(snap) {
        var fbData = snap.val();
        if (fbData && fbData.meta && fbData.meta.version === DB_VERSION && _ensureStructureOn(fbData)) {
          delete fbData.pedidos;
          delete fbData.costosInsumos;
          _db = fbData;
          _ensureStructure();  // ensure new fields exist on Firebase data
        } else {
          _db = _emptyDB();
          _ensureStructure();
          _saveToFirebase();
        }
        _ready = true;
        _cacheLocal();
        _startFirebaseListener();
        _startPedidosListener();
        _startCostosListener();
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
    // CRITICAL: skip if local save is pending to prevent overwriting unsaved changes
    if (_localDirty) return;
    delete data.pedidos;
    delete data.costosInsumos;
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

function _startPedidosListener() {
  if (!_pedidosRef) return;
  var _prevNuevoKeys = {};
  _pedidosRef.on('value', function(snap) {
    var data = snap.val();
    var prevLen = _pedidos.length;
    var prevNuevoKeys = Object.assign({}, _prevNuevoKeys);
    _pedidos = [];
    var nuevoKeys = {};
    if (data) {
      var keys = Object.keys(data);
      for (var i = 0; i < keys.length; i++) {
        var p = data[keys[i]];
        if (p && typeof p === 'object') {
          p._key = keys[i];
          _pedidos.push(p);
          if (p.estado === 'nuevo') nuevoKeys[keys[i]] = true;
        }
      }
    }
    _pedidos.sort(function(a, b) { return (b.creado || '').localeCompare(a.creado || ''); });
    _prevNuevoKeys = nuevoKeys;
    // Detect new pedido: a key in nuevoKeys that was NOT in prevNuevoKeys
    var hasNew = false;
    var nk = Object.keys(nuevoKeys);
    for (var n = 0; n < nk.length; n++) {
      if (!prevNuevoKeys[nk[n]]) { hasNew = true; break; }
    }
    _notifyPedidos(hasNew, _pedidos.length !== prevLen);
  });
}

function _notifyPedidos(isNew, countChanged) {
  for (var i = 0; i < _pedidosListeners.length; i++) {
    try { _pedidosListeners[i](_pedidos, isNew, countChanged); } catch (e) {}
  }
}

function onPedidosChange(fn) { _pedidosListeners.push(fn); }

function getPedidos() {
  return _pedidos.slice();
}

function getPedidosCount(estado) {
  if (!estado) return _pedidos.length;
  var c = 0;
  for (var i = 0; i < _pedidos.length; i++) { if (_pedidos[i].estado === estado) c++; }
  return c;
}

function updatePedidoEstado(pedidoKey, nuevoEstado) {
  if (!_pedidosRef) return;
  _pedidosRef.child(pedidoKey + '/estado').set(nuevoEstado);
}

function updatePedidoField(pedidoKey, field, value) {
  if (!_pedidosRef) return;
  _pedidosRef.child(pedidoKey + '/' + field).set(value);
}

function deletePedido(pedidoKey) {
  if (!_pedidosRef) return;
  _pedidosRef.child(pedidoKey).remove();
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

function getStickers() {
  return _filterValid(Object.values(_db.stickers || {})).sort(function(a, b) { return (a.nombre || '').localeCompare(b.nombre || ''); });
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
      for (var _k in existing) {
        if (existing.hasOwnProperty(_k) && !data.hasOwnProperty(_k)) {
          data[_k] = existing[_k];
        }
      }
      data.creado = existing.creado;
    }
  }
  data.nombre = (data.nombre || '').trim();
  if (Array.isArray(data.categorias) && data.categorias.length > 0) {
    data.categoria = data.categorias[0];
  } else {
    data.categorias = [data.categoria || 'Comidas'];
  }
  data.precioChico = Number(data.precioChico) || 0;
  data.precioGrande = Number(data.precioGrande) || 0;
  data.gramosChico = Number(data.gramosChico) || 0;
  data.gramosGrande = Number(data.gramosGrande) || 0;
  data.stockBolsa = Number(data.stockBolsa) || 0;
  data.stockChico = Number(data.stockChico) || 0;
  data.stockGrande = Number(data.stockGrande) || 0;
  _db.especias[data.id] = data;
  _getOrCreateSticker(data.nombre);
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
      for (var _k in existing) {
        if (existing.hasOwnProperty(_k) && !data.hasOwnProperty(_k)) {
          data[_k] = existing[_k];
        }
      }
      data.creado = existing.creado;
    }
  }
  data.nombre = (data.nombre || '').trim();
  if (Array.isArray(data.categorias) && data.categorias.length > 0) {
    data.categoria = data.categorias[0];
  } else {
    data.categorias = [data.categoria || 'Comidas'];
  }
  data.precioChico = Number(data.precioChico) || 0;
  data.precioGrande = Number(data.precioGrande) || 0;
  data.ingredientes = data.ingredientes || [];
  data.stockChico = Number(data.stockChico) || 0;
  data.stockGrande = Number(data.stockGrande) || 0;
  _db.blends[data.id] = data;
  _getOrCreateSticker(data.nombre);
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

/* ==================== STICKERS ==================== */

function _findStickerByNombre(nombre) {
  var keys = Object.keys(_db.stickers || {});
  for (var i = 0; i < keys.length; i++) {
    if (_db.stickers[keys[i]].nombre === nombre) return _db.stickers[keys[i]];
  }
  return null;
}

function _getOrCreateSticker(nombre) {
  if (!_db.stickers) _db.stickers = {};
  var existing = _findStickerByNombre(nombre);
  if (existing) return existing;
  var id = nextId('stickers');
  var nueva = { id: id, nombre: nombre, stockChico: 0, stockGrande: 0, creado: new Date().toISOString() };
  _db.stickers[id] = nueva;
  return nueva;
}

/** Get all products (especias+blends) with their sticker stock merged */
function getProductosConStickers() {
  var items = [];
  var espKeys = Object.keys(_db.especias || {});
  for (var i = 0; i < espKeys.length; i++) {
    var e = _db.especias[espKeys[i]];
    if (!e || typeof e !== 'object') continue;
    var stk = _findStickerByNombre(e.nombre);
    items.push({
      id: e.id, nombre: e.nombre || '', tipo: 'especia', categoria: e.categoria || '', categorias: e.categorias || [e.categoria || 'Comidas'],
      stockChico: stk ? (Number(stk.stockChico) || 0) : 0,
      stockGrande: stk ? (Number(stk.stockGrande) || 0) : 0
    });
  }
  var blKeys = Object.keys(_db.blends || {});
  for (var i = 0; i < blKeys.length; i++) {
    var b = _db.blends[blKeys[i]];
    if (!b || typeof b !== 'object') continue;
    var stk = _findStickerByNombre(b.nombre);
    items.push({
      id: b.id, nombre: b.nombre || '', tipo: 'blend', categoria: b.categoria || '', categorias: b.categorias || [b.categoria || 'Comidas'],
      stockChico: stk ? (Number(stk.stockChico) || 0) : 0,
      stockGrande: stk ? (Number(stk.stockGrande) || 0) : 0
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
          var espObj = _db.especias[item.especiaId];
          var grsNuevos = Number(item.cantidad) || 0;
          var costoNuevo = Number(item.costoUnitario) || 0;
          // Weighted average cost per gram
          if (grsNuevos > 0 && costoNuevo > 0) {
            var stockPrevio = espObj.stockBolsa || 0;
            var costoPrevio = (_costosInsumos && _costosInsumos.especias && _costosInsumos.especias[item.especiaId]) || 0;
            var nuevoTotalGrs = stockPrevio + grsNuevos;
            var nuevoCostoProm = 0;
            if (nuevoTotalGrs > 0) {
              nuevoCostoProm = (stockPrevio * costoPrevio + grsNuevos * costoNuevo) / nuevoTotalGrs;
            }
            if (!_costosInsumos) _costosInsumos = Object.assign({}, _COSTOS_DEFAULTS);
            if (!_costosInsumos.especias) _costosInsumos.especias = {};
            _costosInsumos.especias[item.especiaId] = Math.round(nuevoCostoProm * 1000) / 1000;
            if (_costosRef) {
              _costosRef.set(_costosInsumos, function(error) {
                if (error) console.error('[DB] Costos promedio save error:', error);
              });
            }
            try { localStorage.setItem('arcano_costos', JSON.stringify(_costosInsumos)); } catch (e) {}
          }
          espObj.stockBolsa = (espObj.stockBolsa || 0) + grsNuevos;
        }
      } else if (tipo === 'envase') {
        var talla = item.talla || 'chico';
        if (!_db.stockEnvases) _db.stockEnvases = { chico: 0, grande: 0 };
        _db.stockEnvases[talla] = (_db.stockEnvases[talla] || 0) + (Number(item.cantidad) || 0);
      } else if (tipo === 'sticker') {
        var stk = _getOrCreateSticker(item.stickerNombre);
        var t = item.talla || 'chico';
        if (t === 'grande') {
          stk.stockGrande = (stk.stockGrande || 0) + (Number(item.cantidad) || 0);
        } else {
          stk.stockChico = (stk.stockChico || 0) + (Number(item.cantidad) || 0);
        }
      } else if (tipo === 'bolsa') {
        var tallaB = item.talla || 'chico';
        if (!_db.stockBolsas) _db.stockBolsas = { chico: 0, grande: 0 };
        _db.stockBolsas[tallaB] = (_db.stockBolsas[tallaB] || 0) + (Number(item.cantidad) || 0);
      } else if (tipo === 'cinta') {
        if (!_db.stockCintas) _db.stockCintas = 0;
        _db.stockCintas = _db.stockCintas + (Number(item.cantidad) || 0);
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

/* ==================== AJUSTES MANUALES DE STOCK ==================== */

function getAjustes() {
  return _filterValid(Object.values(_db.ajustes || {})).sort(function(a, b) { return (b.creado || '').localeCompare(a.creado || ''); });
}

function saveAjuste(data) {
  _ensureStructure();
  if (!_db.ajustes) _db.ajustes = {};
  var isNew = !data.id;
  if (isNew) {
    data.id = nextId('ajustes');
    data.creado = new Date().toISOString();
    data.fecha = data.fecha || new Date().toISOString().slice(0, 10);
  }
  var cantidad = Number(data.cantidad) || 0;
  if (cantidad === 0) throw new Error('La cantidad no puede ser 0');
  var cat = data.categoria; // 'especia', 'blend', 'envase', 'bolsa', 'sticker'
  var sub = data.subtipo;   // 'pala', 'chico', 'grande'

  if (cat === 'especia') {
    var esp = _db.especias[data.productoId];
    if (!esp) throw new Error('Especia no encontrada');
    if (sub === 'pala') {
      var nv = (Number(esp.stockBolsa) || 0) + cantidad;
      if (nv < 0) throw new Error('Stock de pala resultante negativo (' + nv + 'g) para ' + esp.nombre);
      esp.stockBolsa = nv;
    } else {
      var field = (sub === 'grande') ? 'stockGrande' : 'stockChico';
      var nv = (Number(esp[field]) || 0) + cantidad;
      if (nv < 0) throw new Error('Stock de frascos resultante negativo (' + nv + ') para ' + esp.nombre);
      esp[field] = nv;
    }
    data.productoNombre = esp.nombre;
  } else if (cat === 'blend') {
    var bl = _db.blends[data.productoId];
    if (!bl) throw new Error('Blend no encontrado');
    var field = (sub === 'grande') ? 'stockGrande' : 'stockChico';
    var nv = (Number(bl[field]) || 0) + cantidad;
    if (nv < 0) throw new Error('Stock resultante negativo (' + nv + ') para ' + bl.nombre);
    bl[field] = nv;
    data.productoNombre = bl.nombre;
  } else if (cat === 'envase') {
    if (!_db.stockEnvases) _db.stockEnvases = { chico: 0, grande: 0 };
    var t = (sub === 'grande') ? 'grande' : 'chico';
    var nv = (_db.stockEnvases[t] || 0) + cantidad;
    if (nv < 0) throw new Error('Stock de frascos ' + t + ' resultante negativo (' + nv + ')');
    _db.stockEnvases[t] = nv;
    data.productoNombre = 'Frascos ' + t;
  } else if (cat === 'bolsa') {
    if (!_db.stockBolsas) _db.stockBolsas = { chico: 0, grande: 0 };
    var t = (sub === 'grande') ? 'grande' : 'chico';
    var nv = (_db.stockBolsas[t] || 0) + cantidad;
    if (nv < 0) throw new Error('Stock de bolsas ' + t + ' resultante negativo (' + nv + ')');
    _db.stockBolsas[t] = nv;
    data.productoNombre = 'Bolsas ' + t;
  } else if (cat === 'sticker') {
    var stk = _getOrCreateSticker(data.productoNombre);
    var field = (sub === 'grande') ? 'stockGrande' : 'stockChico';
    var nv = (Number(stk[field]) || 0) + cantidad;
    if (nv < 0) throw new Error('Stock resultante negativo (' + nv + ') para sticker ' + stk.nombre);
    stk[field] = nv;
  } else if (cat === 'cinta') {
    if (!_db.stockCintas) _db.stockCintas = 0;
    var nv = (_db.stockCintas || 0) + cantidad;
    if (nv < 0) throw new Error('Stock resultante negativo (' + nv + ') para cintas');
    _db.stockCintas = nv;
    data.productoNombre = 'Cintas';
  }

  data.cantidad = cantidad;
  _db.ajustes[data.id] = data;
  _saveToFirebase(); _cacheLocal();
  _notify(isNew ? 'create' : 'update', 'ajustes', data.id);
  return data;
}

function deleteAjuste(id) {
  if (!_db.ajustes || !_db.ajustes[id]) return false;
  delete _db.ajustes[id];
  _saveToFirebase(); _cacheLocal();
  _notify('delete', 'ajustes', id);
  return true;
}

/* ==================== GASTOS ==================== */

function getGastos() {
  return _filterValid(Object.values(_db.gastos || {})).sort(function(a, b) { return (b.fecha || '').localeCompare(a.fecha || '') || (b.creado || '').localeCompare(a.creado || ''); });
}

function getGastosCategorias() {
  if (!_db.gastosCategorias || !Array.isArray(_db.gastosCategorias) || _db.gastosCategorias.length === 0) {
    return ['Envio', 'Arriendo', 'Servicios', 'Impuestos', 'Marketing', 'Empaque', 'Transporte', 'Otros'];
  }
  return _db.gastosCategorias;
}

function saveGasto(data) {
  _ensureStructure();
  if (!_db.gastos) _db.gastos = {};
  var isNew = !data.id;
  if (isNew) {
    data.id = nextId('gastos');
    data.creado = new Date().toISOString();
    data.fecha = data.fecha || new Date().toISOString().slice(0, 10);
  }
  data.monto = Number(data.monto) || 0;
  data.categoria = data.categoria || 'Otros';
  data.descripcion = data.descripcion || '';
  _db.gastos[data.id] = data;
  _saveToFirebase(); _cacheLocal();
  _notify(isNew ? 'create' : 'update', 'gastos', data.id);
  return data;
}

function deleteGasto(id) {
  if (!_db.gastos || !_db.gastos[id]) return false;
  delete _db.gastos[id];
  _saveToFirebase(); _cacheLocal();
  _notify('delete', 'gastos', id);
  return true;
}

function saveGastosCategorias(categorias) {
  _ensureStructure();
  _db.gastosCategorias = categorias;
  _saveToFirebase(); _cacheLocal();
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

  // Check & consume pala (raw material)
  if ((esp.stockBolsa || 0) < grsTotal) {
    throw new Error('Pala insuficiente de "' + esp.nombre + '". Necesitas ' + grsTotal + 'grs, tienes ' + (esp.stockBolsa || 0) + 'grs');
  }

  // Check & consume envases
  if (!_db.stockEnvases) _db.stockEnvases = { chico: 0, grande: 0 };
  if ((_db.stockEnvases[talla] || 0) < cantidad) {
    throw new Error('Envases ' + talla + ' insuficientes. Necesitas ' + cantidad + ', tienes ' + (_db.stockEnvases[talla] || 0));
  }

  // Check & consume stickers
  var stk = _findStickerByNombre(esp.nombre);
  var stkStock = stk ? (Number(stk[talla === 'grande' ? 'stockGrande' : 'stockChico']) || 0) : 0;
  if (stkStock < cantidad) {
    throw new Error('Stickers ' + talla + ' insuficientes para "' + esp.nombre + '". Necesitas ' + cantidad + ', tienes ' + stkStock);
  }

  // Check & consume bolsas (packaging)
  if (!_db.stockBolsas) _db.stockBolsas = { chico: 0, grande: 0 };
  if ((_db.stockBolsas[talla] || 0) < cantidad) {
    throw new Error('Bolsas ' + talla + ' insuficientes. Necesitas ' + cantidad + ', tienes ' + (_db.stockBolsas[talla] || 0));
  }

  // Check & consume cintas
  if (!_db.stockCintas) _db.stockCintas = 0;
  if ((_db.stockCintas || 0) < cantidad) {
    throw new Error('Cintas insuficientes. Necesitas ' + cantidad + ', tienes ' + (_db.stockCintas || 0));
  }

  // All checks passed — consume
  esp.stockBolsa = (esp.stockBolsa || 0) - grsTotal;
  _db.stockEnvases[talla] = (_db.stockEnvases[talla] || 0) - cantidad;
  _db.stockBolsas[talla] = (_db.stockBolsas[talla] || 0) - cantidad;
  _db.stockCintas = (_db.stockCintas || 0) - cantidad;
  if (stk) {
    var stkKey = talla === 'grande' ? 'stockGrande' : 'stockChico';
    stk[stkKey] = (stk[stkKey] || 0) - cantidad;
  }
  var frascoKey = talla === 'grande' ? 'stockGrande' : 'stockChico';
  esp[frascoKey] = (esp[frascoKey] || 0) + cantidad;

  // Record
  var prodId = nextId('producciones');
  var prod = {
    id: prodId, tipo: 'especia', productoId: especiaId, productoNombre: esp.nombre,
    categoria: esp.categoria || '', talla: talla, cantidad: cantidad,
    gramosPorFrasco: gramosPorFrasco, gramosTotal: grsTotal,
    envasesConsumidos: cantidad, stickersConsumidos: cantidad, bolsasConsumidas: cantidad, cintasConsumidas: cantidad,
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
      throw new Error('Pala insuficiente de "' + esp.nombre + '". Necesitas ' + grsNeeded + 'grs, tienes ' + (esp.stockBolsa || 0) + 'grs');
    }
    detalleIngredientes.push({ especiaId: ing.especiaId, especiaNombre: esp.nombre, gramosPorFrasco: grsPorFrasco, gramosTotal: grsNeeded });
  }

  // Check envases
  if (!_db.stockEnvases) _db.stockEnvases = { chico: 0, grande: 0 };
  if ((_db.stockEnvases[talla] || 0) < cantidad) {
    throw new Error('Envases ' + talla + ' insuficientes. Necesitas ' + cantidad + ', tienes ' + (_db.stockEnvases[talla] || 0));
  }

  // Check stickers
  var stk = _findStickerByNombre(blend.nombre);
  var stkStock = stk ? (Number(stk[talla === 'grande' ? 'stockGrande' : 'stockChico']) || 0) : 0;
  if (stkStock < cantidad) {
    throw new Error('Stickers ' + talla + ' insuficientes para "' + blend.nombre + '". Necesitas ' + cantidad + ', tienes ' + stkStock);
  }

  // Check & consume bolsas (packaging)
  if (!_db.stockBolsas) _db.stockBolsas = { chico: 0, grande: 0 };
  if ((_db.stockBolsas[talla] || 0) < cantidad) {
    throw new Error('Bolsas ' + talla + ' insuficientes. Necesitas ' + cantidad + ', tienes ' + (_db.stockBolsas[talla] || 0));
  }

  // Check & consume cintas
  if (!_db.stockCintas) _db.stockCintas = 0;
  if ((_db.stockCintas || 0) < cantidad) {
    throw new Error('Cintas insuficientes. Necesitas ' + cantidad + ', tienes ' + (_db.stockCintas || 0));
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
  _db.stockBolsas[talla] = (_db.stockBolsas[talla] || 0) - cantidad;
  _db.stockCintas = (_db.stockCintas || 0) - cantidad;
  if (stk) {
    var stkKey = talla === 'grande' ? 'stockGrande' : 'stockChico';
    stk[stkKey] = (stk[stkKey] || 0) - cantidad;
  }
  var frascoKey = talla === 'grande' ? 'stockGrande' : 'stockChico';
  blend[frascoKey] = (blend[frascoKey] || 0) + cantidad;

  var prodId = nextId('producciones');
  var prod = {
    id: prodId, tipo: 'blend', productoId: blendId, productoNombre: blend.nombre,
    categoria: blend.categoria || '', talla: talla, cantidad: cantidad,
    ingredientes: detalleIngredientes, gramosTotal: grsTotalGeneral,
    envasesConsumidos: cantidad, stickersConsumidos: cantidad, bolsasConsumidas: cantidad, cintasConsumidas: cantidad,
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
  var stickers = _filterValid(Object.values(_db.stickers || {}));
  var envases = _db.stockEnvases || { chico: 0, grande: 0 };
  var bolsas = _db.stockBolsas || { chico: 0, grande: 0 };

  var today = new Date().toISOString().slice(0, 10);
  var mes = new Date().toISOString().slice(0, 7);
  var ventasHoy = ventas.filter(function(v) { return v.fecha === today; });
  var ventasMes = ventas.filter(function(v) { return v.fecha && v.fecha.startsWith(mes); });

  var frascosChico = especias.reduce(function(s, e) { return s + (e.stockChico || 0); }, 0) +
                     blends.reduce(function(s, b) { return s + (b.stockChico || 0); }, 0);
  var frascosGrande = especias.reduce(function(s, e) { return s + (e.stockGrande || 0); }, 0) +
                      blends.reduce(function(s, b) { return s + (b.stockGrande || 0); }, 0);

  var stkBajo = stickers.filter(function(e) { return (e.stockChico + e.stockGrande) <= 5; });
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
    bolsasChico: bolsas.chico || 0,
    bolsasGrande: bolsas.grande || 0,
    ventasHoy: ventasHoy.length,
    totalVentasHoy: ventasHoy.reduce(function(s, v) { return s + (Number(v.total) || 0); }, 0),
    ventasMes: ventasMes.length,
    totalVentasMes: ventasMes.reduce(function(s, v) { return s + (Number(v.total) || 0); }, 0),
    especiasBolsaBaja: espBolsaBaja,
    stickersBajos: stkBajo
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

/* ==================== TIENDA (STORE) ==================== */

/** Products visible in the public store (enTienda=true, stock>0) */
function getTiendaProductos() {
  var products = [];
  var espKeys = Object.keys(_db.especias || {});
  for (var i = 0; i < espKeys.length; i++) {
    var e = _db.especias[espKeys[i]];
    if (!e || !e.enTienda) continue;
    if ((e.stockChico || 0) <= 0 && (e.stockGrande || 0) <= 0) continue;
    products.push({
      id: e.id, nombre: e.nombre, tipo: 'especia', categoria: e.categoria || 'Comidas', categorias: e.categorias || [e.categoria || 'Comidas'],
      precioChico: Number(e.precioTiendaChico) || Number(e.precioChico) || 0,
      precioGrande: Number(e.precioTiendaGrande) || Number(e.precioGrande) || 0,
      stockChico: e.stockChico || 0, stockGrande: e.stockGrande || 0,
      region: '', uso: e.uso || ''
    });
  }
  var blKeys = Object.keys(_db.blends || {});
  for (var i = 0; i < blKeys.length; i++) {
    var b = _db.blends[blKeys[i]];
    if (!b || !b.enTienda) continue;
    if ((b.stockChico || 0) <= 0 && (b.stockGrande || 0) <= 0) continue;
    products.push({
      id: b.id, nombre: b.nombre, tipo: 'blend', categoria: b.categoria || 'Comidas', categorias: b.categorias || [b.categoria || 'Comidas'],
      precioChico: Number(b.precioTiendaChico) || Number(b.precioChico) || 0,
      precioGrande: Number(b.precioTiendaGrande) || Number(b.precioGrande) || 0,
      stockChico: b.stockChico || 0, stockGrande: b.stockGrande || 0,
      region: b.region || '', uso: b.uso || ''
    });
  }
  // Packs
  var pkKeys = Object.keys(_db.packs || {});
  for (var i = 0; i < pkKeys.length; i++) {
    var pk = _db.packs[pkKeys[i]];
    if (!pk || !pk.enTienda) continue;
    var blendItems = pk.blendItems || [];
    var minStock = 999999;
    for (var j = 0; j < blendItems.length; j++) {
      var bi2 = blendItems[j];
      var bl2 = _db.blends[bi2.blendId];
      if (!bl2) { minStock = 0; break; }
      var st = bi2.talla === 'grande' ? (bl2.stockGrande || 0) : (bl2.stockChico || 0);
      if (st < minStock) minStock = st;
    }
    if (minStock <= 0) continue;
    products.push({
      id: pk.id, nombre: pk.nombre, tipo: 'pack', categoria: 'Packs', categorias: ['Packs'],
      precioChico: 0, precioGrande: 0, precio: Number(pk.precio) || 0,
      stockChico: 0, stockGrande: 0, stock: minStock,
      region: '', uso: pk.descripcion || '', imagen: pk.imagen || ''
    });
  }
  return products.sort(function(a, b) { return a.nombre.localeCompare(b.nombre); });
}

/** Toggle enTienda for a product */
function toggleTienda(tipo, id) {
  if (tipo === 'especia' && _db.especias[id]) {
    _db.especias[id].enTienda = !_db.especias[id].enTienda;
  } else if (tipo === 'blend' && _db.blends[id]) {
    _db.blends[id].enTienda = !_db.blends[id].enTienda;
  } else if (tipo === 'pack' && _db.packs[id]) {
    _db.packs[id].enTienda = !_db.packs[id].enTienda;
  } else return;
  _saveToFirebase(); _cacheLocal();
  var colMap = { especia: 'especias', blend: 'blends', pack: 'packs' };
  _notify('update', colMap[tipo] || tipo, id);
}

/* ==================== EXCEL IMPORT ==================== */

/** Find especia by name with flexible matching (exact, prefix, contains, word overlap) */
function findEspeciaByName(nombre) {
  if (!nombre) return null;
  var target = nombre.trim().toLowerCase();
  var keys = Object.keys(_db.especias || {});
  // 1. Exact match
  for (var i = 0; i < keys.length; i++) {
    var e = _db.especias[keys[i]];
    if (e && (e.nombre || '').trim().toLowerCase() === target) return e;
  }
  // 2. Especia name starts with target (e.g. "Color" matches "Color (achiote/...)")
  for (var i = 0; i < keys.length; i++) {
    var e = _db.especias[keys[i]];
    if (e && (e.nombre || '').trim().toLowerCase().indexOf(target) === 0) return e;
  }
  // 3. Target is contained in especia name
  for (var i = 0; i < keys.length; i++) {
    var e = _db.especias[keys[i]];
    if (e && (e.nombre || '').trim().toLowerCase().indexOf(target) >= 0) return e;
  }
  // 4. Word overlap: any word (len>=4) from target appears in especia name
  var targetWords = target.split(/[\s()\/,]+/).filter(function(w) { return w.length >= 4; });
  for (var w = 0; w < targetWords.length; w++) {
    for (var i = 0; i < keys.length; i++) {
      var e = _db.especias[keys[i]];
      if (e && (e.nombre || '').trim().toLowerCase().indexOf(targetWords[w]) >= 0) return e;
    }
  }
  return null;
}

/** Auto-detect categoria from blend USO field */
function _categoriaFromUso(uso) {
  if (!uso) return 'Comidas';
  var u = uso.toLowerCase();
  // Cocteleria keywords
  if (/\b(gin|ron|vodka|whisky|mojito|mule|vermouth|aperitif|coctel)\b/.test(u)) return 'Cocteleria';
  // Infusiones keywords
  if (/\b(relajant|sueño|digestiv|energiz|té|calidez|respiratorio|meditaci|antioxidant|bienestar|infusi)\b/.test(u)) return 'Infusiones';
  return 'Comidas';
}

/**
 * Import especias and blends from parsed Excel data.
 * Returns { especiasCreadas: N, blendsCreados: N, blendsParciales: N, errores: [] }
 *
 * especiasList: [{ nombre, categoria? }]
 * blendsList:   [{ nombre, region, uso, categoria, ingredientes: [{ especia, g, pct }] }]
 * gramosChico:  default grams for frasco chico (e.g. 30)
 * gramosGrande: default grams for frasco grande (e.g. 80)
 */
function importFromExcelData(especiasList, blendsList, gramosChico, gramosGrande) {
  _ensureStructure();
  var resultado = { especiasCreadas: 0, especiasExistentes: 0, blendsCreados: 0, blendsExistentes: 0, ingredientesNoResueltos: [], errores: [] };

  // 1. Create especias (skip if name already exists)
  for (var i = 0; i < especiasList.length; i++) {
    var esp = especiasList[i];
    var nombre = (esp.nombre || '').trim();
    if (!nombre) continue;
    var existing = findEspeciaByName(nombre);
    if (existing) {
      resultado.especiasExistentes++;
      continue;
    }
    saveEspecia({
      nombre: nombre,
      categoria: esp.categoria || 'Comidas',
      precioChico: 0,
      precioGrande: 0,
      gramosChico: Number(gramosChico) || 30,
      gramosGrande: Number(gramosGrande) || 80,
      stockBolsa: 0,
      stockChico: 0,
      stockGrande: 0
    });
    resultado.especiasCreadas++;
  }

  // 2. Create blends (skip if name already exists)
  for (var j = 0; j < blendsList.length; j++) {
    var bl = blendsList[j];
    var nombre = (bl.nombre || '').trim();
    if (!nombre) continue;
    var existingBlend = null;
    var blKeys = Object.keys(_db.blends || {});
    for (var k = 0; k < blKeys.length; k++) {
      if ((_db.blends[blKeys[k]].nombre || '').trim().toLowerCase() === nombre.toLowerCase()) {
        existingBlend = _db.blends[blKeys[k]];
        break;
      }
    }
    if (existingBlend) {
      resultado.blendsExistentes++;
      continue;
    }

    // Resolve ingredients: map specia names to IDs and calculate grams per frasco
    var ings = bl.ingredientes || [];
    var recipeTotal = 0;
    for (var ii = 0; ii < ings.length; ii++) recipeTotal += (Number(ings[ii].g) || 0);
    if (recipeTotal <= 0) recipeTotal = 500;

    var resolvedIngs = [];
    for (var ii = 0; ii < ings.length; ii++) {
      var ing = ings[ii];
      var espObj = findEspeciaByName(ing.especia);
      if (!espObj) {
        resultado.ingredientesNoResueltos.push(nombre + ' → ' + (ing.especia || '?'));
        continue;
      }
      var ingG = Number(ing.g) || 0;
      resolvedIngs.push({
        especiaId: espObj.id,
        especiaNombre: espObj.nombre,
        gramosChico: Math.round((ingG / recipeTotal) * (Number(gramosChico) || 30) * 100) / 100,
        gramosGrande: Math.round((ingG / recipeTotal) * (Number(gramosGrande) || 80) * 100) / 100,
        gramosReceta: ingG
      });
    }

    var cat = bl.categoria || _categoriaFromUso(bl.uso);
    saveBlend({
      nombre: nombre,
      categoria: cat,
      region: bl.region || '',
      uso: bl.uso || '',
      precioChico: 0,
      precioGrande: 0,
      ingredientes: resolvedIngs,
      stockChico: 0,
      stockGrande: 0
    });
    resultado.blendsCreados++;
  }

  return resultado;
}

/* ==================== PRODUCT TAGS ==================== */

function getProductTags() {
  _ensureStructure();
  return _db.productTags || {};
}

function getTagsForCategoria(cat) {
  var tags = getProductTags();
  return tags[cat] || [];
}

function addProductTag(cat, tagName) {
  _ensureStructure();
  tagName = (tagName || '').trim();
  if (!tagName) return false;
  if (!_db.productTags) _db.productTags = {};
  if (!_db.productTags[cat]) _db.productTags[cat] = [];
  // Check duplicate (case-insensitive)
  for (var i = 0; i < _db.productTags[cat].length; i++) {
    if (_db.productTags[cat][i].toLowerCase() === tagName.toLowerCase()) return false;
  }
  _db.productTags[cat].push(tagName);
  _saveToFirebase(); _cacheLocal();
  return true;
}

function removeProductTag(cat, tagName) {
  _ensureStructure();
  if (!_db.productTags || !_db.productTags[cat]) return false;
  var idx = -1;
  for (var i = 0; i < _db.productTags[cat].length; i++) {
    if (_db.productTags[cat][i] === tagName) { idx = i; break; }
  }
  if (idx < 0) return false;
  _db.productTags[cat].splice(idx, 1);
  // Also remove from all products that have this tag
  var allEsp = getEspecias();
  for (var e = 0; e < allEsp.length; e++) {
    if (allEsp[e].tags) {
      var ti = allEsp[e].tags.indexOf(tagName);
      if (ti >= 0) { allEsp[e].tags.splice(ti, 1); }
    }
  }
  var allBl = getBlends();
  for (var b = 0; b < allBl.length; b++) {
    if (allBl[b].tags) {
      var bi = allBl[b].tags.indexOf(tagName);
      if (bi >= 0) { allBl[b].tags.splice(bi, 1); }
    }
  }
  _saveToFirebase(); _cacheLocal();
  return true;
}

/* ==================== IMAGE HELPER ==================== */

function compressImage(file, maxW, quality, cb) {
  var reader = new FileReader();
  reader.onload = function(ev) {
    var img = new Image();
    img.onload = function() {
      var w = img.width, h = img.height;
      if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
      var canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      var dataUrl = canvas.toDataURL('image/jpeg', quality);
      cb(null, dataUrl);
    };
    img.onerror = function() { cb('Error al cargar imagen'); };
    img.src = ev.target.result;
  };
  reader.onerror = function() { cb('Error al leer archivo'); };
  reader.readAsDataURL(file);
}

/* ==================== PUNTOS DE VENTA ==================== */

function getPuntosDeVenta() {
  _ensureStructure();
  return _filterValid(Object.values(_db.puntosDeVenta || {})).sort(function(a, b) { return (b.creado || '').localeCompare(a.creado || ''); });
}

function getPuntoDeVenta(id) {
  _ensureStructure();
  return _db.puntosDeVenta ? _db.puntosDeVenta[id] : null;
}

function savePuntoDeVenta(data) {
  _ensureStructure();
  if (!_db.puntosDeVenta) _db.puntosDeVenta = {};
  var isNew = !data.id;
  if (isNew) {
    data.id = nextId('puntosDeVenta');
    data.creado = new Date().toISOString();
    data.stock = data.stock || {};
  }
  _db.puntosDeVenta[data.id] = data;
  _saveToFirebase(); _cacheLocal();
  _notify(isNew ? 'create' : 'update', 'puntosDeVenta', data.id);
  return data;
}

function deletePuntoDeVenta(id) {
  _ensureStructure();
  var pdv = _db.puntosDeVenta ? _db.puntosDeVenta[id] : null;
  if (!pdv) return false;
  // Return all stock to main inventory
  var stock = pdv.stock || {};
  var keys = Object.keys(stock);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    var cant = Number(stock[k]) || 0;
    if (cant <= 0) continue;
    var parts = k.split('_');
    var tipo = parts[0], prodId = Number(parts[1]), talla = parts[2];
    var producto = tipo === 'blend' ? _db.blends[prodId] : _db.especias[prodId];
    if (producto) {
      var frascoKey = talla === 'grande' ? 'stockGrande' : 'stockChico';
      producto[frascoKey] = (producto[frascoKey] || 0) + cant;
    }
  }
  delete _db.puntosDeVenta[id];
  _saveToFirebase(); _cacheLocal();
  _notify('delete', 'puntosDeVenta', id);
  return true;
}

function moverStockAPDV(pdvId, items) {
  _ensureStructure();
  var pdv = _db.puntosDeVenta ? _db.puntosDeVenta[pdvId] : null;
  if (!pdv) throw new Error('Punto de venta no encontrado');
  if (!pdv.stock) pdv.stock = {};
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var producto = it.tipo === 'blend' ? _db.blends[it.productoId] : _db.especias[it.productoId];
    if (!producto) throw new Error('Producto no encontrado: ' + it.tipo + ' ' + it.productoId);
    var frascoKey = it.talla === 'grande' ? 'stockGrande' : 'stockChico';
    if ((producto[frascoKey] || 0) < it.cantidad) {
      throw new Error('Stock insuficiente de ' + producto.nombre + ' (' + it.talla + '): tienes ' + (producto[frascoKey] || 0) + ', necesitas ' + it.cantidad);
    }
  }
  // All checks passed - deduct from main, add to PDV
  for (var j = 0; j < items.length; j++) {
    var it2 = items[j];
    var prod2 = it2.tipo === 'blend' ? _db.blends[it2.productoId] : _db.especias[it2.productoId];
    var fk = it2.talla === 'grande' ? 'stockGrande' : 'stockChico';
    prod2[fk] = (prod2[fk] || 0) - it2.cantidad;
    var stockKey = it2.tipo + '_' + it2.productoId + '_' + it2.talla;
    pdv.stock[stockKey] = (pdv.stock[stockKey] || 0) + it2.cantidad;
  }
  _saveToFirebase(); _cacheLocal();
  _notify('update', 'puntosDeVenta', pdvId);
}

function devolverStockDePDV(pdvId, items) {
  _ensureStructure();
  var pdv = _db.puntosDeVenta ? _db.puntosDeVenta[pdvId] : null;
  if (!pdv) throw new Error('Punto de venta no encontrado');
  if (!pdv.stock) pdv.stock = {};
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var stockKey = it.tipo + '_' + it.productoId + '_' + it.talla;
    if ((pdv.stock[stockKey] || 0) < it.cantidad) {
      throw new Error('Stock insuficiente en PDV para devolver');
    }
  }
  for (var j = 0; j < items.length; j++) {
    var it2 = items[j];
    var stockKey2 = it2.tipo + '_' + it2.productoId + '_' + it2.talla;
    pdv.stock[stockKey2] = (pdv.stock[stockKey2] || 0) - it2.cantidad;
    var prod2 = it2.tipo === 'blend' ? _db.blends[it2.productoId] : _db.especias[it2.productoId];
    if (prod2) {
      var fk2 = it2.talla === 'grande' ? 'stockGrande' : 'stockChico';
      prod2[fk2] = (prod2[fk2] || 0) + it2.cantidad;
    }
  }
  _saveToFirebase(); _cacheLocal();
  _notify('update', 'puntosDeVenta', pdvId);
}

function getPDVVentas(pdvId) {
  _ensureStructure();
  var all = _db.pdvVentas || {};
  var result = [];
  var keys = Object.keys(all);
  for (var i = 0; i < keys.length; i++) {
    var v = all[keys[i]];
    if (v.puntoDeVentaId === pdvId) result.push(v);
  }
  return result.sort(function(a, b) { return (b.creado || '').localeCompare(a.creado || ''); });
}

function getPDVStats(pdvId) {
  _ensureStructure();
  var pdv = _db.puntosDeVenta ? _db.puntosDeVenta[pdvId] : null;
  var ventas = getPDVVentas(pdvId);
  var stock = (pdv && pdv.stock) || {};
  var totalIngresos = 0, totalVentas = ventas.length, totalItemsEnStock = 0, productosEnStock = 0;
  var stockKeys = Object.keys(stock);
  for (var si = 0; si < stockKeys.length; si++) {
    var cant = Number(stock[stockKeys[si]]) || 0;
    if (cant > 0) { totalItemsEnStock += cant; productosEnStock++; }
  }
  var productoVentaMap = {};
  for (var vi = 0; vi < ventas.length; vi++) {
    var v = ventas[vi];
    totalIngresos += (v.total || 0);
    var vItems = v.items || [];
    for (var vj = 0; vj < vItems.length; vj++) {
      var vIt = vItems[vj];
      var prod = vIt.tipo === 'blend' ? _db.blends[vIt.productoId] : _db.especias[vIt.productoId];
      var nombre = prod ? prod.nombre : '?';
      if (!productoVentaMap[nombre]) productoVentaMap[nombre] = { cantidad: 0, monto: 0 };
      productoVentaMap[nombre].cantidad += (vIt.cantidad || 0);
      productoVentaMap[nombre].monto += (vIt.subtotal || (vIt.precioUnitario || 0) * (vIt.cantidad || 0));
    }
  }
  var topArr = Object.keys(productoVentaMap).map(function(n) { return { nombre: n, cantidad: productoVentaMap[n].cantidad, monto: productoVentaMap[n].monto }; });
  topArr.sort(function(a, b) { return b.monto - a.monto; });
  // Daily income map
  var dailyMap = {};
  for (var di = 0; di < ventas.length; di++) {
    var d = ventas[di].fecha || ventas[di].creado;
    if (d) {
      var day = d.substring(0, 10);
      dailyMap[day] = (dailyMap[day] || 0) + (ventas[di].total || 0);
    }
  }
  return {
    totalIngresos: totalIngresos,
    totalVentas: totalVentas,
    totalItemsEnStock: totalItemsEnStock,
    productosEnStock: productosEnStock,
    ticketPromedio: totalVentas > 0 ? totalIngresos / totalVentas : 0,
    topProductos: topArr,
    dailyMap: dailyMap
  };
}

function savePDVVenta(data) {
  _ensureStructure();
  if (!_db.pdvVentas) _db.pdvVentas = {};
  data.id = nextId('pdvVentas');
  data.creado = new Date().toISOString();
  data.fecha = data.fecha || new Date().toISOString().slice(0, 10);
  // Deduct stock from PDV
  var pdv = _db.puntosDeVenta ? _db.puntosDeVenta[data.puntoDeVentaId] : null;
  if (!pdv) throw new Error('Punto de venta no encontrado');
  if (!pdv.stock) pdv.stock = {};
  var total = 0;
  var items = data.items || [];
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var stockKey = it.tipo + '_' + it.productoId + '_' + it.talla;
    if ((pdv.stock[stockKey] || 0) < it.cantidad) {
      throw new Error('Stock insuficiente de ' + (it.productoNombre || '') + ' (' + it.talla + ') en PDV');
    }
  }
  for (var j = 0; j < items.length; j++) {
    var it2 = items[j];
    var sk = it2.tipo + '_' + it2.productoId + '_' + it2.talla;
    pdv.stock[sk] = (pdv.stock[sk] || 0) - it2.cantidad;
    it2.subtotal = (it2.precioUnitario || 0) * (it2.cantidad || 0);
    total += it2.subtotal;
  }
  data.total = total;
  // Also add to main ventas for global stats
  var mainVenta = {
    id: nextId('ventas'),
    fecha: data.fecha,
    creado: data.creado,
    items: items.map(function(it) {
      return { tipo: it.tipo, productoId: it.productoId, talla: it.talla, cantidad: it.cantidad, precioUnitario: it.precioUnitario, subtotal: it.subtotal, productoNombre: it.productoNombre || '' };
    }),
    total: total,
    pdvId: data.puntoDeVentaId,
    pdvNombre: data.puntoDeVentaNombre,
    metodoPago: data.metodoPago || 'efectivo'
  };
  _db.ventas[mainVenta.id] = mainVenta;
  _db.pdvVentas[data.id] = data;
  _saveToFirebase(); _cacheLocal();
  _notify('create', 'pdvVentas', data.id);
  _notify('create', 'ventas', mainVenta.id);
  return data;
}

/* ==================== COSTOS DE INSUMOS (FIREBASE SEPARATE) ==================== */
var _COSTOS_DEFAULTS = { envaseChico: 0, envaseGrande: 0, bolsaChica: 0, bolsaGrande: 0, cinta: 0, stickerChico: 0, stickerGrande: 0, especias: {} };

function getCostosInsumos() {
  return _costosInsumos || Object.assign({}, _COSTOS_DEFAULTS);
}

function saveCostosInsumos(data) {
  _costosInsumos = data;
  try { localStorage.setItem('arcano_costos', JSON.stringify(data)); } catch (e) {}
  if (_costosRef) {
    _costosRef.set(data, function(error) {
      if (error) {
        console.error('[DB] Costos save error:', error);
        alert('Error al guardar costos: ' + error.message);
      }
    });
  }
  for (var i = 0; i < _costosListeners.length; i++) {
    try { _costosListeners[i](_costosInsumos); } catch (e) {}
  }
  _notify('update', 'costosInsumos', 'global');
  return data;
}

function onCostosChange(callback) {
  _costosListeners.push(callback);
}

function _startCostosListener() {
  try {
    var cached = JSON.parse(localStorage.getItem('arcano_costos'));
    if (cached && typeof cached === 'object' && cached.especias) {
      _costosInsumos = cached;
      _costosReady = true;
    }
  } catch (e) {}
  if (!_costosRef) return;
  _costosRef.on('value', function(snap) {
    var data = snap.val();
    if (data && typeof data === 'object') {
      _costosInsumos = data;
      try { localStorage.setItem('arcano_costos', JSON.stringify(data)); } catch (e) {}
    } else if (!_costosInsumos) {
      _costosInsumos = Object.assign({}, _COSTOS_DEFAULTS);
    }
    _costosReady = true;
    for (var i = 0; i < _costosListeners.length; i++) {
      try { _costosListeners[i](_costosInsumos); } catch (e) {}
    }
  });
}

/* ==================== COSTOS DE PRODUCCION POR PRODUCTO ==================== */

/** Returns the production cost of a single unit (frasco) of a product */
function getCostoProducto(tipo, productoId, talla) {
  var costos = _costosInsumos || _COSTOS_DEFAULTS;
  var pkgC = (Number(costos.envaseChico) || 0) + (Number(costos.bolsaChica) || 0) + (Number(costos.cinta) || 0) + (Number(costos.stickerChico) || 0);
  var pkgG = (Number(costos.envaseGrande) || 0) + (Number(costos.bolsaGrande) || 0) + (Number(costos.cinta) || 0) + (Number(costos.stickerGrande) || 0);
  var pkg = talla === 'grande' ? pkgG : pkgC;
  if (tipo === 'especia') {
    var esp = _db.especias[productoId];
    if (!esp) return 0;
    var gramos = talla === 'grande' ? (Number(esp.gramosGrande) || 0) : (Number(esp.gramosChico) || 0);
    var costoGrs = (costos.especias && costos.especias[productoId]) || 0;
    return gramos * costoGrs + pkg;
  } else if (tipo === 'blend') {
    var blend = _db.blends[productoId];
    if (!blend) return 0;
    var ings = blend.ingredientes || [];
    var total = 0;
    for (var i = 0; i < ings.length; i++) {
      var g = talla === 'grande' ? (Number(ings[i].gramosGrande) || 0) : (Number(ings[i].gramosChico) || 0);
      var cpg = (costos.especias && costos.especias[ings[i].especiaId]) || 0;
      total += g * cpg;
    }
    return total + pkg;
  }
  return pkg;
}

/** Get all sales grouped by channel with production costs */
function getCostosPorCanal() {
  var costos = _costosInsumos || _COSTOS_DEFAULTS;
  var pkgC = (Number(costos.envaseChico) || 0) + (Number(costos.bolsaChica) || 0) + (Number(costos.cinta) || 0) + (Number(costos.stickerChico) || 0);
  var pkgG = (Number(costos.envaseGrande) || 0) + (Number(costos.bolsaGrande) || 0) + (Number(costos.cinta) || 0) + (Number(costos.stickerGrande) || 0);

  var channels = {
    admin: { nombre: 'Ventas Admin', ventas: 0, ingreso: 0, costo: 0, productos: {} },
    tienda: { nombre: 'Tienda Online', ventas: 0, ingreso: 0, costo: 0, productos: {} },
    pdv: { nombre: 'Puntos de Venta', ventas: 0, ingreso: 0, costo: 0, productos: {}, pdvs: {} }
  };

  // 1. Admin ventas (sin pdvId)
  var ventas = getVentas();
  for (var i = 0; i < ventas.length; i++) {
    var v = ventas[i];
    var canal = v.pdvId ? 'pdv' : 'admin';
    var ch = channels[canal];
    ch.ventas++;
    ch.ingreso += (v.total || 0);
    var items = v.items || [];
    for (var j = 0; j < items.length; j++) {
      var it = items[j];
      var tipo = it.tipo || 'especia';
      var pid = it.productoId;
      var talla = it.talla || 'chico';
      var cant = it.cantidad || 0;
      var costoUnit = getCostoProducto(tipo, pid, talla);
      var costoTotal = costoUnit * cant;
      ch.costo += costoTotal;
      var key = (it.productoNombre || '?') + '|' + talla;
      if (!ch.productos[key]) ch.productos[key] = { nombre: it.productoNombre || '?', tipo: tipo, talla: talla, cantidad: 0, ingreso: 0, costo: 0 };
      ch.productos[key].cantidad += cant;
      ch.productos[key].ingreso += (it.subtotal || 0);
      ch.productos[key].costo += costoTotal;
      if (canal === 'pdv' && v.pdvNombre) {
        if (!ch.pdvs[v.pdvNombre]) ch.pdvs[v.pdvNombre] = { ventas: 0, ingreso: 0, costo: 0, productos: {} };
        var pv = ch.pdvs[v.pdvNombre];
        pv.ventas++;
        pv.ingreso += (it.subtotal || 0);
        pv.costo += costoTotal;
        var pk2 = (it.productoNombre || '?') + '|' + talla;
        if (!pv.productos[pk2]) pv.productos[pk2] = { nombre: it.productoNombre || '?', tipo: tipo, talla: talla, cantidad: 0, ingreso: 0, costo: 0 };
        pv.productos[pk2].cantidad += cant;
        pv.productos[pk2].ingreso += (it.subtotal || 0);
        pv.productos[pk2].costo += costoTotal;
      }
    }
  }

  // 2. Tienda pedidos (entregados)
  var pedidos = getPedidos();
  for (var pi = 0; pi < pedidos.length; pi++) {
    var p = pedidos[pi];
    if (p.estado === 'cancelado') continue;
    var ch2 = channels.tienda;
    ch2.ventas++;
    ch2.ingreso += (p.total || 0);
    var pItems = p.items || [];
    for (var pj = 0; pj < pItems.length; pj++) {
      var pit = pItems[pj];
      var ptipo = pit.tipo || 'especia';
      var ppid = pit.productoId;
      var ptalla = pit.talla || 'chico';
      var pcant = pit.qty || pit.cantidad || 0;
      var pcostoUnit = getCostoProducto(ptipo, ppid, ptalla);
      var pcostoTotal = pcostoUnit * pcant;
      ch2.costo += pcostoTotal;
      var pkey = (pit.nombre || '?') + '|' + ptalla;
      if (!ch2.productos[pkey]) ch2.productos[pkey] = { nombre: pit.nombre || '?', tipo: ptipo, talla: ptalla, cantidad: 0, ingreso: 0, costo: 0 };
      ch2.productos[pkey].cantidad += pcant;
      ch2.productos[pkey].ingreso += (pit.subtotal || pit.precio * pcant || 0);
      ch2.productos[pkey].costo += pcostoTotal;
    }
  }

  // 3. Stock costs per channel
  channels.admin.stockCosto = 0;
  channels.admin.stockDetalle = [];
  var espKeys = Object.keys(_db.especias || {});
  for (var ei = 0; ei < espKeys.length; ei++) {
    var e = _db.especias[espKeys[ei]];
    if (!e || typeof e !== 'object') continue;
    var ecCh = getCostoProducto('especia', e.id, 'chico') * (e.stockChico || 0);
    var ecGr = getCostoProducto('especia', e.id, 'grande') * (e.stockGrande || 0);
    channels.admin.stockCosto += ecCh + ecGr;
    if (ecCh + ecGr > 0) channels.admin.stockDetalle.push({ nombre: e.nombre, tipo: 'especia', chico: e.stockChico || 0, grande: e.stockGrande || 0, costoChico: getCostoProducto('especia', e.id, 'chico'), costoGrande: getCostoProducto('especia', e.id, 'grande'), costoTotal: ecCh + ecGr });
  }
  var blKeys = Object.keys(_db.blends || {});
  for (var bi = 0; bi < blKeys.length; bi++) {
    var b = _db.blends[blKeys[bi]];
    if (!b || typeof b !== 'object') continue;
    var bcCh = getCostoProducto('blend', b.id, 'chico') * (b.stockChico || 0);
    var bcGr = getCostoProducto('blend', b.id, 'grande') * (b.stockGrande || 0);
    channels.admin.stockCosto += bcCh + bcGr;
    if (bcCh + bcGr > 0) channels.admin.stockDetalle.push({ nombre: b.nombre, tipo: 'blend', chico: b.stockChico || 0, grande: b.stockGrande || 0, costoChico: getCostoProducto('blend', b.id, 'chico'), costoGrande: getCostoProducto('blend', b.id, 'grande'), costoTotal: bcCh + bcGr });
  }

  // Tienda stock = same as admin stock but only enTienda products
  channels.tienda.stockCosto = 0;
  channels.tienda.stockDetalle = [];
  for (var ti = 0; ti < espKeys.length; ti++) {
    var te = _db.especias[espKeys[ti]];
    if (!te || !te.enTienda) continue;
    var tecCh = getCostoProducto('especia', te.id, 'chico') * (te.stockChico || 0);
    var tecGr = getCostoProducto('especia', te.id, 'grande') * (te.stockGrande || 0);
    channels.tienda.stockCosto += tecCh + tecGr;
    if (tecCh + tecGr > 0) channels.tienda.stockDetalle.push({ nombre: te.nombre, tipo: 'especia', chico: te.stockChico || 0, grande: te.stockGrande || 0, costoChico: getCostoProducto('especia', te.id, 'chico'), costoGrande: getCostoProducto('especia', te.id, 'grande'), costoTotal: tecCh + tecGr });
  }
  for (var tbi = 0; tbi < blKeys.length; tbi++) {
    var tb = _db.blends[blKeys[tbi]];
    if (!tb || !tb.enTienda) continue;
    var tbcCh = getCostoProducto('blend', tb.id, 'chico') * (tb.stockChico || 0);
    var tbcGr = getCostoProducto('blend', tb.id, 'grande') * (tb.stockGrande || 0);
    channels.tienda.stockCosto += tbcCh + tbcGr;
    if (tbcCh + tbcGr > 0) channels.tienda.stockDetalle.push({ nombre: tb.nombre, tipo: 'blend', chico: tb.stockChico || 0, grande: tb.stockGrande || 0, costoChico: getCostoProducto('blend', tb.id, 'chico'), costoGrande: getCostoProducto('blend', tb.id, 'grande'), costoTotal: tbcCh + tbcGr });
  }

  // PDV stock
  channels.pdv.stockCosto = 0;
  channels.pdv.stockDetalle = [];
  var pdvs = _filterValid(Object.values(_db.puntosDeVenta || {}));
  for (var pi2 = 0; pi2 < pdvs.length; pi2++) {
    var pdv = pdvs[pi2];
    var pdvStock = pdv.stock || {};
    var pdvCosto = 0;
    var sks = Object.keys(pdvStock);
    for (var si = 0; si < sks.length; si++) {
      var cant = Number(pdvStock[sks[si]]) || 0;
      if (cant <= 0) continue;
      var parts = sks[si].split('_');
      var stipo = parts[0], sprodId = Number(parts[1]), stalla = parts[2];
      var cu = getCostoProducto(stipo, sprodId, stalla);
      pdvCosto += cu * cant;
    }
    channels.pdv.stockCosto += pdvCosto;
    if (pdvCosto > 0) channels.pdv.stockDetalle.push({ nombre: pdv.nombre || 'PDV', tipo: 'pdv', chico: 0, grande: 0, costoChico: 0, costoGrande: 0, costoTotal: pdvCosto, pdvId: pdv.id });
  }

  return channels;
}

/* ==================== PACKS DE BLENDS ==================== */

function getPacks() {
  return _filterValid(Object.values(_db.packs || {})).sort(function(a, b) { return (a.nombre || '').localeCompare(b.nombre || ''); });
}

function getPack(id) {
  return (_db.packs || {})[id];
}

function savePack(data) {
  var isNew = !data.id || !_db.packs[data.id];
  if (isNew) {
    data.id = nextId('packs');
    data.creado = new Date().toISOString();
  }
  _db.packs[data.id] = data;
  _saveToFirebase(); _cacheLocal();
  _notify(isNew ? 'create' : 'update', 'packs', data.id);
  return data;
}

function deletePack(id) {
  if (!_db.packs[id]) return false;
  delete _db.packs[id];
  _saveToFirebase(); _cacheLocal();
  _notify('delete', 'packs', id);
  return true;
}

/* ==================== TIENDA CONFIG ==================== */

function getTiendaConfig() {
  return _db.tiendaConfig || { logoPago: '' };
}

function saveTiendaConfig(data) {
  if (!_db.tiendaConfig) _db.tiendaConfig = {};
  if (typeof data.logoPago === 'string') _db.tiendaConfig.logoPago = data.logoPago;
  _saveToFirebase(); _cacheLocal();
  return _db.tiendaConfig;
}

/* ==================== EXPORT ==================== */

window.ArcanoDB = {
  initDB: initDB, getDB: getDB, onDBChange: onDBChange, nextId: nextId,
  getEspecias: getEspecias, getEspecia: getEspecia, saveEspecia: saveEspecia, deleteEspecia: deleteEspecia,
  getBlends: getBlends, getBlend: getBlend, saveBlend: saveBlend, deleteBlend: deleteBlend,
  getStickers: getStickers, getProductosConStickers: getProductosConStickers,
  getEntradas: getEntradas, saveEntrada: saveEntrada, deleteEntrada: deleteEntrada,
  getGastos: getGastos, getGastosCategorias: getGastosCategorias, saveGasto: saveGasto, deleteGasto: deleteGasto, saveGastosCategorias: saveGastosCategorias,
  getAjustes: getAjustes, saveAjuste: saveAjuste, deleteAjuste: deleteAjuste,
  getPedidos: getPedidos, getPedidosCount: getPedidosCount, updatePedidoEstado: updatePedidoEstado, updatePedidoField: updatePedidoField, deletePedido: deletePedido, onPedidosChange: onPedidosChange,
  producirEspecia: producirEspecia, producirBlend: producirBlend,
  getProducciones: getProducciones, deleteProduccion: deleteProduccion,
  getFrascosParaVender: getFrascosParaVender,
  getVentas: getVentas, saveVenta: saveVenta, deleteVenta: deleteVenta,
  getUsuarios: getUsuarios, saveUsuario: saveUsuario, deleteUsuario: deleteUsuario,
  authenticateUser: authenticateUser, getCurrentUser: getCurrentUser, logoutUser: logoutUser,
  getStats: getStats,
  findEspeciaByName: findEspeciaByName,
  importFromExcelData: importFromExcelData,
  getTiendaProductos: getTiendaProductos,
  toggleTienda: toggleTienda,
  getProductTags: getProductTags, getTagsForCategoria: getTagsForCategoria,
  addProductTag: addProductTag, removeProductTag: removeProductTag,
  compressImage: compressImage,
  DB_KEY: DB_KEY, FB_PATH: FB_PATH,
  getPuntosDeVenta: getPuntosDeVenta, getPuntoDeVenta: getPuntoDeVenta,
  savePuntoDeVenta: savePuntoDeVenta, deletePuntoDeVenta: deletePuntoDeVenta,
  moverStockAPDV: moverStockAPDV, devolverStockDePDV: devolverStockDePDV,
  getPDVVentas: getPDVVentas, getPDVStats: getPDVStats, savePDVVenta: savePDVVenta,
  getPacks: getPacks, getPack: getPack, savePack: savePack, deletePack: deletePack,
  getCostosInsumos: getCostosInsumos, saveCostosInsumos: saveCostosInsumos, onCostosChange: onCostosChange,
  getCostoProducto: getCostoProducto, getCostosPorCanal: getCostosPorCanal,
  getTiendaConfig: getTiendaConfig, saveTiendaConfig: saveTiendaConfig,
  saveNow: saveNow,
  writeField: writeField
};
