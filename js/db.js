/* ===================== ARCANO V2.1 — DATA LAYER =====================
   Stock dual:
     - stockBolsa: gramos de especia cruda en bolsa (materia prima)
     - stockFrascos: unidades de producto listo para vender (frascos)
   Flujo: Compras(grs) → Produccion(consume grs+etiquetas) → Frascos → Ventas
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
var _db = null;
var _ready = false;
var _saveTimer = null;
var _listeners = [];

var DEFAULT_IDS = { especias: 1, blends: 1, producciones: 1, compras: 1, ventas: 1, usuarios: 1, etiquetas: 1 };

/* ---------- Remove null/invalid entries from all collections ---------- */
function _cleanNulls() {
  var cols = ['especias', 'blends', 'producciones', 'compras', 'ventas', 'etiquetas'];
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
  if (!_db.usuarios) _db.usuarios = {};
  var ukeys = Object.keys(_db.usuarios);
  for (var j = 0; j < ukeys.length; j++) {
    if (_db.usuarios[ukeys[j]] == null || typeof _db.usuarios[ukeys[j]] !== 'object') {
      delete _db.usuarios[ukeys[j]];
    }
  }
}

/* ---------- Migrate v2.0 (single stock) → v2.1 (bolsa+frascos) ---------- */
function _migrateV2toV21() {
  // Especias: old 'stock' (units) → stockBolsa: 0, stockFrascos: old stock
  var espKeys = Object.keys(_db.especias || {});
  for (var i = 0; i < espKeys.length; i++) {
    var esp = _db.especias[espKeys[i]];
    if (!esp || typeof esp !== 'object') continue;
    if (esp.stockBolsa === undefined) esp.stockBolsa = 0;
    if (esp.stockFrascos === undefined) {
      esp.stockFrascos = (typeof esp.stock === 'number') ? esp.stock : 0;
    }
  }
  // Blends: old 'stock' was already frascos concept
  var blKeys = Object.keys(_db.blends || {});
  for (var i = 0; i < blKeys.length; i++) {
    var bl = _db.blends[blKeys[i]];
    if (!bl || typeof bl !== 'object') continue;
    if (bl.stockFrascos === undefined) {
      bl.stockFrascos = (typeof bl.stock === 'number') ? bl.stock : 0;
    }
  }
}

/* ---------- Ensure DB structure is valid ---------- */
function _ensureStructure() {
  if (!_db) _db = {};
  if (typeof _db !== 'object' || Array.isArray(_db)) _db = {};
  _cleanNulls();
  if (!_db.meta || !_db.meta.nextId) {
    _db.meta = { nextId: Object.assign({}, DEFAULT_IDS) };
  } else {
    for (var k in DEFAULT_IDS) {
      if (typeof _db.meta.nextId[k] !== 'number') {
        _db.meta.nextId[k] = DEFAULT_IDS[k];
      }
    }
  }
  if (!_db.especias) _db.especias = {};
  if (!_db.blends) _db.blends = {};
  if (!_db.producciones) _db.producciones = {};
  if (!_db.compras) _db.compras = {};
  if (!_db.ventas) _db.ventas = {};
  if (!_db.usuarios) _db.usuarios = { admin: { id: 'admin', nombre: 'Administrador', pin: '1234', rol: 'admin', activo: true, creado: new Date().toISOString() } };
  if (!_db.etiquetas) _db.etiquetas = {};
  // Run migration after structure is ensured
  _migrateV2toV21();
}

function _emptyDB() {
  return {
    especias: {}, blends: {}, producciones: {}, compras: {}, ventas: {}, etiquetas: {},
    usuarios: { admin: { id: 'admin', nombre: 'Administrador', pin: '1234', rol: 'admin', activo: true, creado: new Date().toISOString() } },
    meta: { nextId: Object.assign({}, DEFAULT_IDS) }
  };
}

/* ---------- Firebase ---------- */
var _firebaseApp = null;
var _firebaseDb = null;

function _initFirebase() {
  if (_firebaseDb) return;
  try {
    if (typeof firebase === 'undefined') { console.warn('[DB] Firebase SDK not loaded'); return; }
    _firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
    _firebaseDb = firebase.database();
  } catch (e) { console.error('[DB] Firebase init error:', e); }
}

function _fbRef() {
  if (!_firebaseDb) _initFirebase();
  return _firebaseDb ? _firebaseDb.ref(FB_PATH) : null;
}

function _saveToFirebase() {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(function() { _doFirebaseSave(); }, 300);
}

function _saveToFirebaseImmediate() {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = null;
  _doFirebaseSave();
}

function _doFirebaseSave() {
  _ensureStructure();
  var ref = _fbRef();
  if (!ref) { _saveToLocal(); return; }
  ref.set(_db).then(function() {
    _saveToLocal();
  }).catch(function(err) {
    console.error('[DB] Firebase save error:', err);
    _saveToLocal();
  });
}

function _saveToLocal() {
  try { localStorage.setItem(DB_KEY, JSON.stringify(_db)); } catch (e) {}
}

function _loadFromFirebase() {
  return new Promise(function(resolve) {
    var ref = _fbRef();
    if (!ref) { resolve(_loadFromLocal()); return; }
    ref.once('value').then(function(snap) {
      if (snap.exists() && snap.val()) {
        var data = snap.val();
        if (typeof data !== 'object' || Array.isArray(data)) {
          _db = _emptyDB();
        } else {
          _db = data;
        }
      } else {
        _db = _emptyDB();
      }
      _ensureStructure();
      _saveToLocal();
      resolve(_db);
    }).catch(function(err) {
      console.error('[DB] Firebase load error:', err);
      resolve(_loadFromLocal());
    });
  });
}

function _loadFromLocal() {
  try {
    var raw = localStorage.getItem(DB_KEY);
    if (raw) { _db = JSON.parse(raw); } else { _db = _emptyDB(); }
  } catch (e) { _db = _emptyDB(); }
  _ensureStructure();
  return _db;
}

function _notify(type, col, id) {
  _listeners.forEach(function(fn) { try { fn(type, col, id); } catch (e) {} });
}

/* ==================== PUBLIC API ==================== */

async function initDB() {
  if (_ready) return _db;
  _initFirebase();
  await _loadFromFirebase();
  _ready = true;
  var ref = _fbRef();
  if (ref) {
    ref.on('value', function(snap) {
      if (snap.exists() && snap.val()) {
        var data = snap.val();
        if (typeof data !== 'object' || Array.isArray(data)) return;
        _db = data;
        _ensureStructure();
        _saveToLocal();
        _notify('remote_change', '*', '*');
      }
    });
  }
  return _db;
}

function getDB() {
  if (!_db) throw new Error('DB not initialized');
  return JSON.parse(JSON.stringify(_db));
}

function onDBChange(fn) {
  _listeners.push(fn);
  return function() { _listeners = _listeners.filter(function(l) { return l !== fn; }); };
}

function nextId(collection) {
  _ensureStructure();
  var id = String(_db.meta.nextId[collection] || 1);
  _db.meta.nextId[collection] = (_db.meta.nextId[collection] || 0) + 1;
  _saveToFirebase();
  return id;
}

function _filterValid(arr) {
  return arr.filter(function(item) { return item != null && typeof item === 'object'; });
}

/* ==================== ESPECIAS ==================== */

function getEspecias() {
  return _filterValid(Object.values(getDB().especias)).sort(function(a, b) { return (a.nombre || '').localeCompare(b.nombre || ''); });
}
function getEspecia(id) {
  var db = getDB();
  var esp = db.especias[id];
  return (esp != null && typeof esp === 'object') ? esp : null;
}

function saveEspecia(data) {
  _ensureStructure();
  var isNew = !data.id;
  if (isNew) {
    data.id = nextId('especias');
    data.creado = new Date().toISOString();
    data.stockBolsa = 0;
    data.stockFrascos = 0;
  }
  data.stockBolsa = Number(data.stockBolsa) || 0;
  data.stockFrascos = Number(data.stockFrascos) || 0;
  data.precioChico = Number(data.precioChico) || 0;
  data.precioGrande = Number(data.precioGrande) || 0;
  _db.especias[data.id] = data;
  _saveToFirebase();
  _notify(isNew ? 'create' : 'update', 'especias', data.id);
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
  return _filterValid(Object.values(getDB().blends)).sort(function(a, b) { return (a.nombre || '').localeCompare(b.nombre || ''); });
}
function getBlend(id) {
  var db = getDB();
  var bl = db.blends[id];
  return (bl != null && typeof bl === 'object') ? bl : null;
}

function saveBlend(data) {
  _ensureStructure();
  var isNew = !data.id;
  if (isNew) {
    data.id = nextId('blends');
    data.creado = new Date().toISOString();
    data.ingredientes = data.ingredientes || [];
    data.stockFrascos = 0;
  }
  data.stockFrascos = Number(data.stockFrascos) || 0;
  data.precioChico = Number(data.precioChico) || 0;
  data.precioGrande = Number(data.precioGrande) || 0;
  _db.blends[data.id] = data;
  _saveToFirebase();
  _notify(isNew ? 'create' : 'update', 'blends', data.id);
  return data;
}

/* ==================== PRODUCCION ==================== */

/** Producir frascos de ESPECIA pura: consume grs de bolsa + etiquetas, agrega frascos */
function producirEspeciaFrascos(especiaId, grsPorFrasco, cantidad) {
  _ensureStructure();
  var esp = _db.especias[especiaId];
  if (!esp) throw new Error('Especia no encontrada');
  grsPorFrasco = Number(grsPorFrasco) || 0;
  cantidad = Number(cantidad) || 0;
  if (grsPorFrasco <= 0) throw new Error('Los gramos por frasco deben ser mayor a 0');
  if (cantidad <= 0) throw new Error('La cantidad de frascos debe ser mayor a 0');

  var grsTotal = grsPorFrasco * cantidad;
  if ((esp.stockBolsa || 0) < grsTotal) {
    throw new Error('Stock insuficiente en BOLSA de "' + esp.nombre + '". Necesario: ' + grsTotal + 'grs, Disponible: ' + (esp.stockBolsa || 0) + 'grs');
  }

  // Check etiqueta
  var etiqueta = _findEtiquetaByNombre(esp.nombre);
  var detalleEtiqueta = null;
  if (etiqueta) {
    if (etiqueta.stock < cantidad) {
      throw new Error('Stock insuficiente de ETIQUETAS "' + esp.nombre + '". Necesario: ' + cantidad + ', Disponible: ' + etiqueta.stock);
    }
    etiqueta.stock -= cantidad;
    detalleEtiqueta = { etiquetaNombre: esp.nombre, cantidadConsumida: cantidad, stockRestante: etiqueta.stock };
  } else {
    throw new Error('No hay etiquetas fisicas registradas para "' + esp.nombre + '". Compralas en Compras primero.');
  }

  // Consume bolsa, add frascos
  esp.stockBolsa = (esp.stockBolsa || 0) - grsTotal;
  esp.stockFrascos = (esp.stockFrascos || 0) + cantidad;

  // Record
  var prodId = nextId('producciones');
  var produccion = {
    id: prodId, tipo: 'especia', especiaId: especiaId, especiaNombre: esp.nombre,
    categoria: esp.categoria || '', grsPorFrasco: grsPorFrasco, cantidad: cantidad,
    grsConsumidos: grsTotal, etiquetaUsada: detalleEtiqueta,
    fecha: new Date().toISOString().slice(0, 10), creado: new Date().toISOString()
  };
  _db.producciones[prodId] = produccion;
  _saveToFirebase();
  _notify('create', 'producciones', prodId);
  _notify('update', 'especias', especiaId);
  return { especia: esp, produccion: produccion };
}

/** Producir frascos de BLEND: consume grs de especias (bolsa) + etiquetas, agrega frascos al blend */
function producirBlend(blendId, cantidad) {
  _ensureStructure();
  var blend = _db.blends[blendId];
  if (!blend) throw new Error('Blend no encontrado');
  cantidad = Number(cantidad) || 0;
  if (cantidad <= 0) throw new Error('Cantidad debe ser mayor a 0');

  var ingredientes = blend.ingredientes || [];
  var detalleIngredientes = [];
  var detalleEtiqueta = null;

  // 1. Check especias stockBolsa (grams)
  for (var i = 0; i < ingredientes.length; i++) {
    var ing = ingredientes[i];
    var esp = _db.especias[ing.especiaId];
    if (!esp) throw new Error('Especia no encontrada: ' + ing.especiaId);
    var grsNeeded = (ing.cantidad || 0) * cantidad;
    if ((esp.stockBolsa || 0) < grsNeeded) {
      throw new Error('Stock insuficiente en BOLSA de "' + esp.nombre + '". Necesario: ' + grsNeeded + 'grs, Disponible: ' + (esp.stockBolsa || 0) + 'grs');
    }
  }
  // 2. Consume especias from bolsa
  for (var i = 0; i < ingredientes.length; i++) {
    var ing = ingredientes[i];
    var esp = _db.especias[ing.especiaId];
    var grsNeeded = (ing.cantidad || 0) * cantidad;
    esp.stockBolsa = (esp.stockBolsa || 0) - grsNeeded;
    detalleIngredientes.push({
      especiaId: ing.especiaId, especiaNombre: esp.nombre,
      grsPorFrasco: ing.cantidad || 0, grsTotal: grsNeeded
    });
  }

  // 3. Check & consume etiqueta
  var etiqueta = _findEtiquetaByNombre(blend.nombre);
  if (etiqueta) {
    if (etiqueta.stock < cantidad) {
      throw new Error('Stock insuficiente de ETIQUETAS "' + blend.nombre + '". Necesario: ' + cantidad + ', Disponible: ' + etiqueta.stock);
    }
    etiqueta.stock -= cantidad;
    detalleEtiqueta = { etiquetaNombre: etiqueta.nombre, cantidadConsumida: cantidad, stockRestante: etiqueta.stock };
  } else {
    throw new Error('No hay etiquetas fisicas registradas para "' + blend.nombre + '". Compralas en Compras primero.');
  }

  // 4. Add blend frascos
  blend.stockFrascos = (blend.stockFrascos || 0) + cantidad;

  // 5. Record
  var prodId = nextId('producciones');
  var produccion = {
    id: prodId, tipo: 'blend', blendId: blendId, blendNombre: blend.nombre,
    categoria: blend.categoria || '', cantidad: cantidad,
    ingredientesUsados: detalleIngredientes, etiquetaUsada: detalleEtiqueta,
    fecha: new Date().toISOString().slice(0, 10), creado: new Date().toISOString()
  };
  _db.producciones[prodId] = produccion;
  _saveToFirebase();
  _notify('create', 'producciones', prodId);
  _notify('update', 'blends', blendId);
  return { blend: blend, produccion: produccion };
}

function deleteBlend(id) {
  if (!_db.blends[id]) return false;
  delete _db.blends[id];
  _saveToFirebase();
  _notify('delete', 'blends', id);
  return true;
}

/* ==================== ETIQUETAS FISICAS ==================== */

function _findEtiquetaByNombre(nombre) {
  if (!_db.etiquetas) return null;
  var keys = Object.keys(_db.etiquetas);
  for (var i = 0; i < keys.length; i++) {
    if (_db.etiquetas[keys[i]].nombre === nombre) return _db.etiquetas[keys[i]];
  }
  return null;
}

function getEtiquetasStock() {
  return _filterValid(Object.values(getDB().etiquetas || {})).sort(function(a, b) { return (a.nombre || '').localeCompare(b.nombre || ''); });
}

function _getOrCreateEtiqueta(nombre) {
  if (!_db.etiquetas) _db.etiquetas = {};
  var existing = _findEtiquetaByNombre(nombre);
  if (existing) return existing;
  var id = nextId('etiquetas');
  var nueva = { id: id, nombre: nombre, stock: 0, creado: new Date().toISOString() };
  _db.etiquetas[id] = nueva;
  return nueva;
}

function getProducciones() {
  return _filterValid(Object.values(getDB().producciones)).sort(function(a, b) { return (b.fecha || '').localeCompare(a.fecha || ''); });
}

function deleteProduccion(id) {
  if (!_db.producciones[id]) return false;
  delete _db.producciones[id];
  _saveToFirebase();
  _notify('delete', 'producciones', id);
  return true;
}

/** Todos los productos con frascos listos para vender (especias + blends) */
function getFrascosParaVender() {
  var db = getDB();
  var items = [];
  var espKeys = Object.keys(db.especias || {});
  for (var i = 0; i < espKeys.length; i++) {
    var e = db.especias[espKeys[i]];
    if (e && typeof e === 'object' && (e.stockFrascos || 0) > 0) {
      items.push({ tipo: 'especia', id: e.id, nombre: e.nombre || '', categoria: e.categoria || '', stockFrascos: e.stockFrascos || 0, precioChico: e.precioChico || 0, precioGrande: e.precioGrande || 0 });
    }
  }
  var blKeys = Object.keys(db.blends || {});
  for (var i = 0; i < blKeys.length; i++) {
    var b = db.blends[blKeys[i]];
    if (b && typeof b === 'object' && (b.stockFrascos || 0) > 0) {
      items.push({ tipo: 'blend', id: b.id, nombre: b.nombre || '', categoria: b.categoria || '', stockFrascos: b.stockFrascos || 0, precioChico: b.precioChico || 0, precioGrande: b.precioGrande || 0 });
    }
  }
  return items.sort(function(a, b) { return a.nombre.localeCompare(b.nombre); });
}

/* ==================== COMPRAS ==================== */

function getCompras() {
  return _filterValid(Object.values(getDB().compras)).sort(function(a, b) { return (b.fecha || '').localeCompare(a.fecha || ''); });
}

function saveCompra(data) {
  _ensureStructure();
  var isNew = !data.id;
  if (isNew) {
    data.id = nextId('compras');
    data.creado = new Date().toISOString();
    data.fecha = data.fecha || new Date().toISOString().slice(0, 10);
    data.items = data.items || [];
    data.total = Number(data.total) || 0;
  }
  if (isNew) {
    for (var i = 0; i < data.items.length; i++) {
      var item = data.items[i];
      if (item.tipo === 'etiqueta') {
        var etq = _getOrCreateEtiqueta(item.etiquetaNombre);
        etq.stock += Number(item.cantidad) || 0;
      } else if (item.tipo === 'especia' && item.especiaId && _db.especias[item.especiaId]) {
        // Add to stockBolsa (grams of raw spice)
        _db.especias[item.especiaId].stockBolsa = (_db.especias[item.especiaId].stockBolsa || 0) + (Number(item.cantidad) || 0);
      }
    }
  }
  _db.compras[data.id] = data;
  _saveToFirebase();
  _notify(isNew ? 'create' : 'update', 'compras', data.id);
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
  return _filterValid(Object.values(getDB().ventas)).sort(function(a, b) { return (b.fecha || '').localeCompare(a.fecha || ''); });
}

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
      var cant = Number(item.cantidad) || 0;
      var stockDisponible = (producto.stockFrascos || 0);
      if (stockDisponible < cant) {
        throw new Error('Stock insuficiente de FRASCOS de "' + producto.nombre + '". Solicitado: ' + cant + ', Disponible: ' + stockDisponible);
      }
      item.productoNombre = producto.nombre;
      producto.stockFrascos = (producto.stockFrascos || 0) - cant;
    }
  }
  _db.ventas[data.id] = data;
  _saveToFirebase();
  _notify(isNew ? 'create' : 'update', 'ventas', data.id);
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

function getUsuarios() { return _filterValid(Object.values(getDB().usuarios)); }
function getUsuario(id) {
  var db = getDB();
  var u = db.usuarios[id];
  return (u != null && typeof u === 'object') ? u : null;
}

function saveUsuario(data) {
  _ensureStructure();
  var isNew = !data.id;
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
  if (id === 'admin') return false;
  if (!_db.usuarios[id]) return false;
  delete _db.usuarios[id];
  _saveToFirebase();
  _notify('delete', 'usuarios', id);
  return true;
}

function authenticateUser(pin) {
  var users = _filterValid(Object.values(getDB().usuarios));
  var found = users.find(function(u) { return u.pin === String(pin) && u.activo !== false; });
  if (found) { sessionStorage.setItem(DB_KEY + '_session', JSON.stringify(found)); return found; }
  return null;
}

function getCurrentUser() {
  try { var r = sessionStorage.getItem(DB_KEY + '_session'); return r ? JSON.parse(r) : null; } catch(e) { return null; }
}
function logoutUser() { sessionStorage.removeItem(DB_KEY + '_session'); }

/* ==================== DASHBOARD STATS ==================== */

function getStats() {
  var db = getDB();
  var especias = _filterValid(Object.values(db.especias || {}));
  var blends = _filterValid(Object.values(db.blends || {}));
  var ventas = _filterValid(Object.values(db.ventas || {}));
  var compras = _filterValid(Object.values(db.compras || {}));
  var etiquetas = _filterValid(Object.values(db.etiquetas || {}));

  var today = new Date().toISOString().slice(0, 10);
  var mes = new Date().toISOString().slice(0, 7);
  var ventasHoy = ventas.filter(function(v) { return v.fecha === today; });
  var ventasMes = ventas.filter(function(v) { return v.fecha && v.fecha.startsWith(mes); });
  var comprasMes = compras.filter(function(c) { return c.fecha && c.fecha.startsWith(mes); });
  var etqBajoStock = etiquetas.filter(function(e) { return (e.stock || 0) <= 5; });
  var totalFrascos = especias.reduce(function(s, e) { return s + (e.stockFrascos || 0); }, 0) +
                      blends.reduce(function(s, b) { return s + (b.stockFrascos || 0); }, 0);

  return {
    totalEspecias: especias.length,
    totalBlends: blends.length,
    totalEtiquetas: etiquetas.length,
    totalFrascos: totalFrascos,
    totalVentas: ventas.length,
    totalCompras: compras.length,
    ventasHoy: ventasHoy.length,
    totalVentasHoy: ventasHoy.reduce(function(s, v) { return s + (Number(v.total) || 0); }, 0),
    ventasMes: ventasMes.length,
    totalVentasMes: ventasMes.reduce(function(s, v) { return s + (Number(v.total) || 0); }, 0),
    totalComprasMes: comprasMes.reduce(function(s, c) { return s + (Number(c.total) || 0); }, 0),
    especiasBajoStockBolsa: especias.filter(function(e) { return (e.stockBolsa || 0) <= 50; }),
    especiasBajoStockFrascos: especias.filter(function(e) { return (e.stockFrascos || 0) <= 3; }),
    blendsBajoStockFrascos: blends.filter(function(b) { return (b.stockFrascos || 0) <= 3; }),
    etiquetasBajoStock: etqBajoStock
  };
}

/* ---------- Export ---------- */
window.ArcanoDB = {
  initDB: initDB, getDB: getDB, onDBChange: onDBChange, nextId: nextId,
  getEspecias: getEspecias, getEspecia: getEspecia, saveEspecia: saveEspecia, deleteEspecia: deleteEspecia,
  getBlends: getBlends, getBlend: getBlend, saveBlend: saveBlend, deleteBlend: deleteBlend,
  producirEspeciaFrascos: producirEspeciaFrascos, producirBlend: producirBlend,
  getProducciones: getProducciones, deleteProduccion: deleteProduccion,
  getEtiquetasStock: getEtiquetasStock, getFrascosParaVender: getFrascosParaVender, _cleanNulls: _cleanNulls,
  getCompras: getCompras, saveCompra: saveCompra, deleteCompra: deleteCompra,
  getVentas: getVentas, saveVenta: saveVenta, deleteVenta: deleteVenta,
  getUsuarios: getUsuarios, getUsuario: getUsuario, saveUsuario: saveUsuario, deleteUsuario: deleteUsuario,
  authenticateUser: authenticateUser, getCurrentUser: getCurrentUser, logoutUser: logoutUser,
  getStats: getStats, DB_KEY: DB_KEY, FB_PATH: FB_PATH
};