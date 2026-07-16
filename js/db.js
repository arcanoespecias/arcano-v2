// ===================== ARCANO ERP — DB LAYER =====================
// localStorage + Firebase sync. 6 collections.

var DB_KEY = 'arcano_db_v3';
var _idC = 0;

// ---------- Schema constants ----------
var PRODUCT_TYPES = [
  { val: 'especia', label: 'Especia' },
  { val: 'frasco',  label: 'Frasco'  },
  { val: 'etiqueta',label: 'Etiqueta' }
];

var BLEND_FORMATOS = [
  { val: 'polvo',   label: 'Polvo'   },
  { val: 'escamas', label: 'Escamas' }
];

var UNITS = ['gr','kg','ml','L','unidad','cm','mt','rollo'];

var COMPRA_ESTADOS = [
  { val: 'pendiente', label: 'Pendiente' },
  { val: 'recibida',  label: 'Recibida'  },
  { val: 'cancelada', label: 'Cancelada' }
];

var VENTA_ESTADOS = [
  { val: 'pendiente',  label: 'Pendiente'  },
  { val: 'completada', label: 'Completada' },
  { val: 'cancelada',  label: 'Cancelada'  }
];

var ROLES = [
  { val: 'admin',    label: 'Admin'    },
  { val: 'operador', label: 'Operador' },
  { val: 'vendedor', label: 'Vendedor' }
];

// ---------- Core DB functions ----------
var _dbCached = null;

// Migrate from old key if needed (runs once)
(function() {
  try {
    var old = localStorage.getItem('arcano_erp_v1');
    if (old && !localStorage.getItem(DB_KEY)) {
      localStorage.setItem(DB_KEY, old);
      console.log('[DB] Migrated from arcano_erp_v1 to ' + DB_KEY);
    }
  } catch(e) {}
})();

function getDB() {
  if (_dbCached) return _dbCached;
  try {
    var raw = localStorage.getItem(DB_KEY);
    if (raw) {
      var db = JSON.parse(raw);
      if (!db.productos)   db.productos   = [];
      if (!db.compras)     db.compras     = [];
      if (!db.blends)      db.blends      = [];
      if (!db.ventas)      db.ventas      = [];
      if (!db.usuarios)    db.usuarios    = [];
      if (!db.movimientos) db.movimientos = [];
      syncIdCounter(db);
      _dbCached = db;
      return db;
    }
  } catch(e) { console.warn('[DB] Read error:', e.message); }
  _dbCached = emptyDB();
  return _dbCached;
}

function saveDB(dbParam) {
  var db = dbParam || getDB();
  db._idC = _idC;
  _dbCached = db;
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch(e) { console.warn('[DB] Write error:', e.message); }
  clearTimeout(saveDB._t);
  saveDB._t = setTimeout(function() {
    if (typeof fbPush === 'function') fbPush();
  }, 800);
}

function emptyDB() {
  return { productos:[], compras:[], blends:[], ventas:[], usuarios:[], movimientos:[], _idC:0 };
}

function nextId() { _idC++; return _idC; }

function syncIdCounter(db) {
  var ids = [
    (db.productos||[]),(db.compras||[]),(db.blends||[]),
    (db.ventas||[]),(db.usuarios||[]),(db.movimientos||[])
  ].reduce(function(a,c){ return a.concat(c.map(function(x){return x.id||0})); }, []);
  var mx = Math.max.apply(null,[0].concat(ids));
  if (mx >= _idC) _idC = mx;
}

function addMovimiento(tipo, itemId, productoNombre, cantidad, detalle, dbOverride) {
  var db = dbOverride || getDB();
  if (!db.movimientos) db.movimientos = [];
  db.movimientos.push({
    id: nextId(),
    tipo: tipo,
    itemId: itemId,
    producto: productoNombre,
    cantidad: cantidad,
    detalle: detalle || '',
    fecha: new Date().toISOString(),
    usuario: (typeof currentUser !== 'undefined' && currentUser) ? currentUser.nombre : 'Sistema'
  });
  saveDB(db);
}

// ---------- Formatters ----------
function fmt(n) { return '$' + Number(n||0).toLocaleString('es-CO'); }

function fmtDate(iso) {
  if (!iso) return '-';
  try { return new Date(iso).toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'}); }
  catch(e) { return iso; }
}

function fmtDateTime(iso) {
  if (!iso) return '-';
  try {
    var d = new Date(iso);
    return d.toLocaleDateString('es-CO',{day:'2-digit',month:'short'}) + ' ' +
           d.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'});
  } catch(e) { return iso; }
}