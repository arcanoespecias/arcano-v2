// ===================== FIREBASE SYNC MODULE v3 =====================
// Sincronizacion en tiempo real via Firebase Realtime Database.
// v3: Updated for new data model (productos, compras, blends, ventas, usuarios, movimientos).

var FIREBASE_CONFIG = {
  apiKey: "AIzaSyBvuJusx4_FvAdXhBl89VVlCicNb-yrdzo",
  authDomain: "arcano-6788d.firebaseapp.com",
  databaseURL: "https://arcano-6788d-default-rtdb.firebaseio.com",
  projectId: "arcano-6788d",
  storageBucket: "arcano-6788d.firebasestorage.app",
  messagingSenderId: "545294699567",
  appId: "1:545294699567:web:f354ae604a0034c6578ada"
};

var FB_DB_PATH = 'arcano/db';

var fbDbRef = null;
var fbInitialized = false;
var _fbConnectionState = false;
var _fbFirstDataDone = false;
var _lastPushSignature = '';

function _dataSignature(obj) {
  try {
    return JSON.stringify(obj, Object.keys(obj).sort());
  } catch(e) { return ''; }
}

function initFirebase() {
  if (fbInitialized) return;
  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    fbDbRef = firebase.database().ref(FB_DB_PATH);
    fbInitialized = true;
    console.log('[Firebase] Inicializado - path:', FB_DB_PATH);

    firebase.database().ref('.info/connected').on('value', function(snapshot) {
      _fbConnectionState = snapshot.val() === true;
      console.log('[Firebase] Conexion:', _fbConnectionState ? 'ONLINE' : 'OFFLINE');
      renderSyncStatus();
    });
  } catch (e) {
    console.error('[Firebase] Error de inicializacion:', e.message);
    fbInitialized = false;
  }
}

function startFirebaseSync(onFirstData) {
  if (!fbInitialized) initFirebase();
  if (!fbDbRef) {
    console.error('[Firebase] No se pudo inicializar');
    if (onFirstData) { onFirstData(null); onFirstData = null; }
    return;
  }

  console.log('[Firebase] Iniciando sincronizacion...');

  var _timeoutId = setTimeout(function() {
    if (!_fbFirstDataDone) {
      console.warn('[Firebase] Timeout - arrancando con datos locales');
      _fbFirstDataDone = true;
      if (onFirstData) { onFirstData(null); onFirstData = null; }
    }
  }, 6000);

  fbDbRef.on('value', function(snapshot) {
    var data = snapshot.val();

    if (!data) {
      console.log('[Firebase] Sin datos remotos');
      if (!_fbFirstDataDone) {
        _fbFirstDataDone = true;
        clearTimeout(_timeoutId);
        var localDB = getDB();
        var hasData = (localDB.productos||[]).length + (localDB.blends||[]).length + (localDB.usuarios||[]).length;
        if (hasData > 0) {
          console.log('[Firebase] Subiendo datos locales...');
          fbPush();
        }
        if (onFirstData) { onFirstData(null); onFirstData = null; }
      }
      return;
    }

    var incomingSig = _dataSignature(data);
    if (incomingSig === _lastPushSignature) {
      _lastPushSignature = '';
      console.log('[Firebase] Eco propio - ignorando');
      return;
    }
    _lastPushSignature = '';

    // Update localStorage
    localStorage.setItem(DB_KEY, JSON.stringify(data));
    syncLocalIdCounter(data);

    // Update current user reference
    if (typeof currentUser !== 'undefined' && currentUser) {
      var updatedUser = (data.usuarios || []).find(function(u) { return u.id === currentUser.id; });
      if (updatedUser) {
        currentUser = updatedUser;
        updateUserChip();
      }
    }

    if (!_fbFirstDataDone) {
      _fbFirstDataDone = true;
      clearTimeout(_timeoutId);
      console.log('[Firebase] Datos iniciales recibidos');
      if (onFirstData) { onFirstData(data); onFirstData = null; }
    } else {
      console.log('[Firebase] Datos actualizados desde otro dispositivo');
      refreshCurrentPage();
      if (typeof currentUser !== 'undefined' && currentUser) {
        toast('Datos actualizados');
      }
    }
  }, function(error) {
    console.error('[Firebase] Error en listener:', error.code, error.message);
    if (!_fbFirstDataDone) {
      _fbFirstDataDone = true;
      clearTimeout(_timeoutId);
      if (onFirstData) { onFirstData(null); onFirstData = null; }
    }
  });
}

function fbPush() {
  if (!fbDbRef) { console.warn('[Firebase] Push ignorado'); return; }
  var db = getDB();
  var clean = JSON.parse(JSON.stringify(db));
  _lastPushSignature = _dataSignature(clean);

  fbDbRef.set(clean).then(function() {
    console.log('[Firebase] Push OK');
  }).catch(function(err) {
    console.error('[Firebase] Push error:', err.code || err.message);
    _lastPushSignature = '';
    toast('Error al guardar: ' + (err.code === 'PERMISSION_DENIED' ? 'Sin permisos' : (err.message || 'desconocido')), 'err');
  });
}

function fbForceReload() {
  if (!fbDbRef) return;
  _lastPushSignature = '';
  _fbFirstDataDone = false;
  fbDbRef.once('value').then(function(snapshot) {
    var data = snapshot.val();
    if (data) {
      localStorage.setItem(DB_KEY, JSON.stringify(data));
      syncLocalIdCounter(data);
      refreshCurrentPage();
      toast('Datos sincronizados');
    } else {
      toast('No hay datos en Firebase');
    }
  }).catch(function(err) {
    toast('Error: ' + (err.message || err.code || 'desconocido'), 'err');
  });
}

function fbIsConnected() { return _fbConnectionState; }

function renderSyncStatus() {
  var badge = document.getElementById('gh-status-badge');
  if (!badge) return;
  if (_fbConnectionState) {
    badge.className = 'badge bg';
    badge.textContent = 'Conectado';
  } else {
    badge.className = 'badge br';
    badge.textContent = 'Desconectado';
  }
}

function fbClearRemote() {
  if (!fbDbRef) return;
  if (!confirm('Borrar todos los datos de Firebase?')) return;
  fbDbRef.set(null).then(function() {
    toast('Datos remotos borrados');
  }).catch(function(err) {
    toast('Error: ' + err.message, 'err');
  });
}