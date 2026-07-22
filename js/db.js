/* ===================== ARCANO V3 — DATA LAYER =====================
   Flujo:
     Insumos → Stock (pala grs, envases, stickers, bolsas)
     Produccion → consume insumos → Frascos listos (chico / grande)
     Ventas → consume frascos

   Stock por especia: stockBolsa (grs), stockChico, stockGrande (frascos)
   Stock por blend:   stockChico, stockGrande (frascos)
   Stock global:      stockEnvases (chico/grande), stockBolsas (chico/grande)
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

var DEFAULT_IDS = { especias: 1, blends: 1, producciones: 1, ventas: 1, entradas: 1, stickers: 1 };

/* ==================== HELPERS ==================== */

function _filterValid(arr) {
  return arr.filter(function(o) { return o && typeof o === 'object'; });
}

function _cleanNulls() {
  var cols = ['especias', 'blends', 'producciones', 'ventas', 'entradas', 'stickers'];
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
  // Migration: copy old etiquetas data to stickers
  if (_db.etiquetas && Object.keys(_db.etiquetas).length > 0 && Object.keys(_db.stickers).length === 0) {
    _db.stickers = _db.etiquetas;
  }
  delete _db.etiquetas;
  if (!_db.stockEnvases) _db.stockEnvases = { chico: 0, grande: 0 };
  if (!_db.stockBolsas) _db.stockBolsas = { chico: 0, grande: 0 };
  if (!_db.usuarios) _db.usuarios = {
    admin: { id: 'admin', nombre: 'Administrador', pin: '1234', rol: 'admin', activo: true, creado: new Date().toISOString() }
  };
  if (!_db.productTags) _db.productTags = {
    'Comidas': ['Aves', 'Pescados y Mariscos', 'Cerdo', 'Salsas y Aderezos', 'Verduras y Vegetales', 'Granos y Legumbres'],
    'Infusiones': ['Relajante', 'Digestiva', 'Energética', 'Citrica', 'Refrescante', 'Detox', 'Aromatica'],
    'Cocteleria': ['Tropical', 'Citrica', 'Seca', 'Dulce']
  };
  _cleanNulls();
  return true;
}

function _emptyDB() {
  return {
    meta: { nextId: Object.assign({}, DEFAULT_IDS), version: DB_VERSION },
    especias: {}, blends: {}, producciones: {}, ventas: {}, entradas: {}, stickers: {},
    stockEnvases: { chico: 0, grande: 0 },
    stockBolsas: { chico: 0, grande: 0 },
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
  _localDirty = true;
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(function() {
    try {
      var safetyTimer = setTimeout(function() { _localDirty = false; }, 5000);
      _firebaseRef.set(_db, function(error) {
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
      resolve();
      return;
    }

    // Load from Firebase
    if (_firebaseRef) {
      _firebaseRef.once('value').then(function(snap) {
        var fbData = snap.val();
        if (fbData && fbData.meta && fbData.meta.version === DB_VERSION && _ensureStructureOn(fbData)) {
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
      id: e.id, nombre: e.nombre || '', tipo: 'especia', categoria: e.categoria || '',
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
      id: b.id, nombre: b.nombre || '', tipo: 'blend', categoria: b.categoria || '',
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
          _db.especias[item.especiaId].stockBolsa = (_db.especias[item.especiaId].stockBolsa || 0) + (Number(item.cantidad) || 0);
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

  // All checks passed — consume
  esp.stockBolsa = (esp.stockBolsa || 0) - grsTotal;
  _db.stockEnvases[talla] = (_db.stockEnvases[talla] || 0) - cantidad;
  _db.stockBolsas[talla] = (_db.stockBolsas[talla] || 0) - cantidad;
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
    envasesConsumidos: cantidad, stickersConsumidos: cantidad, bolsasConsumidas: cantidad,
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
    envasesConsumidos: cantidad, stickersConsumidos: cantidad, bolsasConsumidas: cantidad,
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
      id: e.id, nombre: e.nombre, tipo: 'especia', categoria: e.categoria || 'Comidas',
      precioChico: Number(e.precioTiendaChico) || Number(e.precioChico) || 0,
      precioGrande: Number(e.precioTiendaGrande) || Number(e.precioGrande) || 0,
      stockChico: e.stockChico || 0, stockGrande: e.stockGrande || 0,
      region: '', uso: ''
    });
  }
  var blKeys = Object.keys(_db.blends || {});
  for (var i = 0; i < blKeys.length; i++) {
    var b = _db.blends[blKeys[i]];
    if (!b || !b.enTienda) continue;
    if ((b.stockChico || 0) <= 0 && (b.stockGrande || 0) <= 0) continue;
    products.push({
      id: b.id, nombre: b.nombre, tipo: 'blend', categoria: b.categoria || 'Comidas',
      precioChico: Number(b.precioTiendaChico) || Number(b.precioChico) || 0,
      precioGrande: Number(b.precioTiendaGrande) || Number(b.precioGrande) || 0,
      stockChico: b.stockChico || 0, stockGrande: b.stockGrande || 0,
      region: b.region || '', uso: b.uso || ''
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
  } else return;
  _saveToFirebase(); _cacheLocal();
  _notify('update', tipo === 'especia' ? 'especias' : 'blends', id);
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

/* ==================== EXPORT ==================== */

window.ArcanoDB = {
  initDB: initDB, getDB: getDB, onDBChange: onDBChange, nextId: nextId,
  getEspecias: getEspecias, getEspecia: getEspecia, saveEspecia: saveEspecia, deleteEspecia: deleteEspecia,
  getBlends: getBlends, getBlend: getBlend, saveBlend: saveBlend, deleteBlend: deleteBlend,
  getStickers: getStickers, getProductosConStickers: getProductosConStickers,
  getEntradas: getEntradas, saveEntrada: saveEntrada, deleteEntrada: deleteEntrada,
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
  DB_KEY: DB_KEY, FB_PATH: FB_PATH
};