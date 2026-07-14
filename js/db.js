// ===================== DB LAYER =====================
// Local DB using localStorage + Firebase sync integration.

var DB_KEY = 'arcano_db_v3';
var _idC = 0; // Global ID counter

function getDB() {
  try {
    var raw = localStorage.getItem(DB_KEY);
    if (raw) {
      var db = JSON.parse(raw);
      // Ensure all collections exist
      if (!db.productos) db.productos = [];
      if (!db.compras) db.compras = [];
      if (!db.blends) db.blends = [];
      if (!db.ventas) db.ventas = [];
      if (!db.usuarios) db.usuarios = [];
      if (!db.movimientos) db.movimientos = [];
      return db;
    }
  } catch(e) { console.warn('[DB] Error reading:', e.message); }
  return emptyDB();
}

function saveDB() {
  var db = getDB();
  db._idC = _idC;
  localStorage.setItem(DB_KEY, JSON.stringify(db));
  // Debounced Firebase push
  clearTimeout(saveDB._timer);
  saveDB._timer = setTimeout(function() {
    if (typeof fbPush === 'function') fbPush();
  }, 800);
}

function emptyDB() {
  return {
    productos: [],
    compras: [],
    blends: [],
    ventas: [],
    usuarios: [],
    movimientos: [],
    _idC: 0
  };
}

function nextId() {
  _idC++;
  return _idC;
}

function syncLocalIdCounter(db) {
  var allIds = [
    (db.productos||[]).map(function(p){return p.id||0}),
    (db.compras||[]).map(function(c){return c.id||0}),
    (db.blends||[]).map(function(b){return b.id||0}),
    (db.ventas||[]).map(function(v){return v.id||0}),
    (db.usuarios||[]).map(function(u){return u.id||0}),
    (db.movimientos||[]).map(function(m){return m.id||0})
  ].flat();
  var maxId = Math.max.apply(null, [0].concat(allIds));
  if (maxId >= _idC) _idC = maxId;
}

// CRUD helpers
function addMovimiento(tipo, collection, itemId, productoNombre, cantidad, detalle) {
  var db = getDB();
  if (!db.movimientos) db.movimientos = [];
  db.movimientos.push({
    id: nextId(),
    tipo: tipo,        // 'compra' | 'venta' | 'blend' | 'ajuste'
    coleccion: collection, // 'compras' | 'ventas' | 'blends'
    itemId: itemId,
    producto: productoNombre,
    cantidad: cantidad,
    detalle: detalle || '',
    fecha: new Date().toISOString(),
    usuario: (typeof currentUser !== 'undefined' && currentUser) ? currentUser.nombre : 'Sistema'
  });
  saveDB();
}

function fmt(n) {
  return '$' + Number(n||0).toLocaleString('es-CO');
}

function fmtDate(iso) {
  if (!iso) return '-';
  try {
    var d = new Date(iso);
    return d.toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' });
  } catch(e) { return iso; }
}

function fmtDateTime(iso) {
  if (!iso) return '-';
  try {
    var d = new Date(iso);
    return d.toLocaleDateString('es-CO', { day:'2-digit', month:'short' }) + ' ' +
           d.toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' });
  } catch(e) { return iso; }
}

// Product types for selects
var PRODUCT_TYPES = [
  { val: 'especia', label: 'Especia' },
  { val: 'frasco', label: 'Frasco' },
  { val: 'etiqueta', label: 'Etiqueta' },
  { val: 'bolsa', label: 'Bolsa' }
];

var UNITS = ['gr', 'kg', 'ml', 'L', 'unidad', 'cm', 'mt', 'rollo'];

var COMPRA_ESTADOS = [
  { val: 'pendiente', label: 'Pendiente' },
  { val: 'recibida', label: 'Recibida' },
  { val: 'cancelada', label: 'Cancelada' }
];

var VENTA_ESTADOS = [
  { val: 'pendiente', label: 'Pendiente' },
  { val: 'completada', label: 'Completada' },
  { val: 'cancelada', label: 'Cancelada' }
];

var ROLES = [
  { val: 'admin', label: 'Admin' },
  { val: 'operador', label: 'Operador' },
  { val: 'vendedor', label: 'Vendedor' }
];