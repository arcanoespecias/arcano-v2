// ===================== ARCANO — DATA LAYER (Firebase-first) =====================
// No localStorage. Firebase is the single source of truth.
// Every mutation calls DB.save() which writes to Firebase directly.

var FIREBASE_CONFIG = {
  apiKey: "AIzaSyBvuJusx4_FvAdXhBl89VVlCicNb-yrdzo",
  authDomain: "arcano-6788d.firebaseapp.com",
  databaseURL: "https://arcano-6788d-default-rtdb.firebaseio.com",
  projectId: "arcano-6788d",
  storageBucket: "arcano-6788d.firebasestorage.app",
  messagingSenderId: "545294699567",
  appId: "1:545294699567:web:f354ae604a0034c6578ada"
};

var FB_PATH = 'arcano/db';

var DB = {
  data: null,
  _cbs: [],

  init: function(onReady) {
    var self = this;
    try {
      firebase.initializeApp(FIREBASE_CONFIG);
      var ref = firebase.database().ref(FB_PATH);

      firebase.database().ref('.info/connected').on('value', function(s) {
        var el = document.getElementById('sync-badge');
        if (el) {
          el.textContent = s.val() ? 'Online' : 'Offline';
          el.className = 'badge ' + (s.val() ? 'badge-green' : 'badge-red');
        }
      });

      ref.on('value', function(snap) {
        var d = snap.val();
        if (d && typeof d === 'object') {
          var cols = ['especias','frascos','etiquetas','blends','compras','ventas','usuarios','produccion'];
          cols.forEach(function(c) { if (!Array.isArray(d[c])) d[c] = []; });
          self.data = d;
        } else {
          self.data = self.empty();
        }
        self._notify();
        if (onReady) { onReady(); onReady = null; }
      }, function(err) {
        console.error('[DB] Firebase listener error:', err);
        if (!self.data) { self.data = self.empty(); }
        if (onReady) { onReady(); onReady = null; }
      });

      setTimeout(function() {
        if (!self.data) {
          console.warn('[DB] Timeout');
          self.data = self.empty();
          if (onReady) { onReady(); onReady = null; }
        }
      }, 8000);

    } catch(e) {
      console.error('[DB] Init error:', e);
      self.data = self.empty();
      if (onReady) { onReady(); onReady = null; }
    }
  },

  empty: function() {
    return { especias:[], frascos:[], etiquetas:[], blends:[], compras:[], ventas:[], usuarios:[], produccion:[] };
  },

  onChange: function(fn) { this._cbs.push(fn); },

  _notify: function() {
    var d = this.data;
    this._cbs.forEach(function(fn) { try { fn(d); } catch(e) { console.error('[DB] callback error:', e); } });
  },

  save: function() {
    if (!this.data) return;
    try {
      firebase.database().ref(FB_PATH).set(this.data)
        .then(function() { console.log('[DB] Saved'); })
        .catch(function(e) { console.error('[DB] Save error:', e.message); });
    } catch(e) {
      console.error('[DB] Save error:', e.message);
    }
  },

  nextId: function(col) {
    var items = (this.data && this.data[col]) || [];
    var mx = 0;
    items.forEach(function(x) { if (x.id > mx) mx = x.id; });
    return mx + 1;
  },

  find: function(col, id) {
    var items = (this.data && this.data[col]) || [];
    var r = null;
    items.forEach(function(x) { if (x.id === id) r = x; });
    return r;
  },

  findWhere: function(col, fn) {
    var items = (this.data && this.data[col]) || [];
    var r = [];
    items.forEach(function(x) { if (fn(x)) r.push(x); });
    return r;
  },

  seed: function() {
    if ((this.data.usuarios || []).length > 0) return;
    this.data.usuarios.push({
      id: 1, nombre: 'Admin', pin: '1234', rol: 'admin', activo: true, creadoEn: new Date().toISOString()
    });
    this.data.frascos.push(
      { id: 1, nombre: 'Frasco Grande', tipo: 'grande', capacidadGr: 100, stock: 50, costoUnit: 350, creadoEn: new Date().toISOString() },
      { id: 2, nombre: 'Frasco Pequeno', tipo: 'pequeno', capacidadGr: 50, stock: 100, costoUnit: 250, creadoEn: new Date().toISOString() }
    );
    this.save();
    console.log('[DB] Seed OK');
  }
};

// ===================== HELPERS =====================
function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escJs(s) {
  return esc(s || '').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
}
function fmt(n) { return '$' + Number(n||0).toLocaleString('es-CO'); }
function fmtDate(iso) {
  if (!iso) return '-';
  try { return new Date(iso).toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'}); }
  catch(e) { return iso; }
}
function fmtDateTime(iso) {
  if (!iso) return '-';
  try { var d = new Date(iso); return d.toLocaleDateString('es-CO',{day:'2-digit',month:'short'})+' '+d.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'}); }
  catch(e) { return iso; }
}
function optHtml(arr, sel) {
  if (!arr) return '';
  return arr.map(function(o) {
    var v = typeof o === 'string' ? o : o.val;
    var l = typeof o === 'string' ? o : o.label;
    return '<option value="'+esc(v)+'"'+(v===sel?' selected':'')+'>'+esc(l)+'</option>';
  }).join('');
}