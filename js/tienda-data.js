/* ===================== ARCANO TIENDA — DATA LAYER (read-only) ===================== */
var FIREBASE_CONFIG = {
  apiKey: "AIzaSyBvuJusx4_FvAdXhBl89VVlCicNb-yrdzo",
  authDomain: "arcano-6788d.firebaseapp.com",
  databaseURL: "https://arcano-6788d-default-rtdb.firebaseio.com",
  projectId: "arcano-6788d",
  storageBucket: "arcano-6788d.appspot.com",
  messagingSenderId: "544197982462",
  appId: "1:544197982462:web:4e8d7e3e4a9e7c6c7b3a2d"
};
var FB_PATH = 'arcano/db';
var _sDb = null;
var _sReady = false;
var _sListeners = [];

function initTienda() {
  return new Promise(function(resolve) {
    firebase.initializeApp(FIREBASE_CONFIG);
    var ref = firebase.database().ref(FB_PATH);
    ref.once('value').then(function(snap) {
      var d = snap.val();
      if (d && d.especias && d.blends) { _sDb = d; _sReady = true; }
      resolve();
    }).catch(function() { resolve(); });
    ref.on('value', function(snap) {
      var d = snap.val();
      if (d && d.especias && d.blends) {
        _sDb = d; _sReady = true;
        for (var i = 0; i < _sListeners.length; i++) { try { _sListeners[i](); } catch(e) {} }
      }
    });
  });
}

function onTiendaChange(fn) { _sListeners.push(fn); }

/* === PEDIDOS (write) === */
var _pedidosRef = null;

function submitOrder(orderData) {
  return new Promise(function(resolve, reject) {
    if (!_pedidosRef) _pedidosRef = firebase.database().ref('arcano/pedidos');
    orderData.creado = new Date().toISOString();
    orderData.estado = 'nuevo';
    _pedidosRef.push(orderData, function(error) {
      if (error) reject(error);
      else resolve();
    });
  });
}

function getStoreProducts() {
  if (!_sDb) return [];
  var products = [];
  var ek = Object.keys(_sDb.especias || {});
  for (var i = 0; i < ek.length; i++) {
    var e = _sDb.especias[ek[i]];
    if (!e || !e.enTienda) continue;
    products.push({
      id: e.id, nombre: e.nombre, tipo: 'especia', categoria: e.categoria || 'Comidas',
      precioChico: Number(e.precioTiendaChico) || Number(e.precioChico) || 0,
      precioGrande: Number(e.precioTiendaGrande) || Number(e.precioGrande) || 0,
      stockChico: e.stockChico || 0, stockGrande: e.stockGrande || 0,
      region: '', uso: e.uso || '', descripcion: e.descripcion || '', imagen: e.imagen || '', tags: e.tags || []
    });
  }
  var bk = Object.keys(_sDb.blends || {});
  for (var i = 0; i < bk.length; i++) {
    var b = _sDb.blends[bk[i]];
    if (!b || !b.enTienda) continue;
    products.push({
      id: b.id, nombre: b.nombre, tipo: 'blend', categoria: b.categoria || 'Comidas',
      precioChico: Number(b.precioTiendaChico) || Number(b.precioChico) || 0,
      precioGrande: Number(b.precioTiendaGrande) || Number(b.precioGrande) || 0,
      stockChico: b.stockChico || 0, stockGrande: b.stockGrande || 0,
      region: b.region || '', uso: b.uso || '', descripcion: b.descripcion || '', imagen: b.imagen || '', tags: b.tags || []
    });
  }
  return products.sort(function(a, b) { return a.nombre.localeCompare(b.nombre); });
}