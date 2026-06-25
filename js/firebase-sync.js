// ===================== FIREBASE SYNC MODULE v2 =====================
// Sincronizacion en tiempo real via Firebase Realtime Database.
// Reemplaza completamente a github-sync.js.
// - Sin tokens, sin SHA, sin polling manual.
// - Los cambios se propagan instantaneamente entre dispositivos.
// - Soporte offline: Firebase encola writes y sincroniza al reconectarse.
// v2: error callback, timeout, robust echo detection.

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBvuJusx4_FvAdXhBl89VVlCicNb-yrdzo",
  authDomain: "arcano-6788d.firebaseapp.com",
  databaseURL: "https://arcano-6788d-default-rtdb.firebaseio.com",
  projectId: "arcano-6788d",
  storageBucket: "arcano-6788d.firebasestorage.app",
  messagingSenderId: "545294699567",
  appId: "1:545294699567:web:f354ae604a0034c6578ada"
};

const FB_DB_PATH = 'arcano/db';

let fbDbRef = null;
let fbInitialized = false;
let _fbConnectionState = false;
let _fbFirstDataDone = false;

// Para detectar eco propio de forma robusta (ignora orden de keys)
let _lastPushSignature = '';
function _dataSignature(obj) {
  try {
    // Ordenar las keys del JSON para que el hash sea consistente
    // sin importar el orden en que Firebase devuelva los datos
    return JSON.stringify(obj, Object.keys(obj).sort());
  } catch(e) { return ''; }
}

// -------------------- Init --------------------

function initFirebase() {
  if (fbInitialized) return;
  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    fbDbRef = firebase.database().ref(FB_DB_PATH);
    fbInitialized = true;
    console.log('[Firebase] Inicializado - path:', FB_DB_PATH);

    // Habilitar persistencia offline
    if (firebase.database && typeof firebase.database.enableLogging === 'function') {
      // firebase.database.enableLogging(true); // Descomentar para debug
    }

    // Monitorear estado de conexion
    firebase.database().ref('.info/connected').on('value', function(snapshot) {
      _fbConnectionState = snapshot.val() === true;
      console.log('[Firebase] Conexion:', _fbConnectionState ? 'ONLINE' : 'OFFLINE');
      if (typeof updateSyncUI === 'function') {
        updateSyncUI(_fbConnectionState ? 'ok' : 'error', _fbConnectionState ? 'En linea' : 'Offline');
      }
      renderSyncStatus();
    });
  } catch (e) {
    console.error('[Firebase] Error de inicializacion:', e.message);
    fbInitialized = false;
  }
}

// -------------------- Real-time sync --------------------

function startFirebaseSync(onFirstData) {
  if (!fbInitialized) initFirebase();
  if (!fbDbRef) {
    console.error('[Firebase] No se pudo inicializar la referencia a la base de datos');
    if (onFirstData) { onFirstData(null); onFirstData = null; }
    return;
  }

  console.log('[Firebase] Iniciando sincronizacion en tiempo real...');

  // Timeout de seguridad: si en 6 segundos no llegan datos, arrancar igual
  var _timeoutId = setTimeout(function() {
    if (!_fbFirstDataDone) {
      console.warn('[Firebase] Timeout esperando datos - arrancando con datos locales');
      _fbFirstDataDone = true;
      if (onFirstData) { onFirstData(null); onFirstData = null; }
    }
  }, 6000);

  fbDbRef.on('value', function(snapshot) {
    var data = snapshot.val();

    if (!data) {
      // No hay datos en Firebase (base vacia o rules deniegan lectura)
      console.log('[Firebase] Sin datos remotos (vacio o sin permiso)');
      if (!_fbFirstDataDone) {
        _fbFirstDataDone = true;
        clearTimeout(_timeoutId);

        // Si hay datos locales con especias, subirlos
        var localDB = getDB();
        if (localDB.especias && localDB.especias.length > 0) {
          console.log('[Firebase] Subiendo datos locales a Firebase...');
          fbPush();
        }
        if (onFirstData) { onFirstData(null); onFirstData = null; }
      }
      return;
    }

    // Limpiar campos internos
    if (data._ghConfig) delete data._ghConfig;
    if (data._lastModified) delete data._lastModified;
    if (data._pendingPushSnapshot) delete data._pendingPushSnapshot;

    // Saltar nuestro propio eco usando signature robusta
    var incomingSig = _dataSignature(data);
    if (incomingSig === _lastPushSignature) {
      _lastPushSignature = '';
      console.log('[Firebase] Eco propio detectado - ignorando');
      return;
    }
    _lastPushSignature = '';

    // Actualizar localStorage con datos de Firebase
    localStorage.setItem(DB_KEY, JSON.stringify(data));
    syncIdCounter(data);

    // Actualizar referencia del usuario actual
    if (typeof currentUser !== 'undefined' && currentUser) {
      var updatedUser = (data.usuarios || []).find(function(u) { return u.id === currentUser.id; });
      if (updatedUser) {
        currentUser = updatedUser;
        console.log('[Firebase] Usuario actualizado:', currentUser.nombre);
        if (typeof updateUserChip === 'function') updateUserChip();
      }
    }

    if (!_fbFirstDataDone) {
      // Primera carga de datos
      _fbFirstDataDone = true;
      clearTimeout(_timeoutId);
      console.log('[Firebase] Datos iniciales recibidos -', (data.especias||[]).length, 'especias,', (data.blends||[]).length, 'blends');
      if (onFirstData) { onFirstData(data); onFirstData = null; }
    } else {
      // Actualizacion desde otro dispositivo
      console.log('[Firebase] Datos actualizados desde otro dispositivo');
      refreshCurrentPage();
      if (typeof currentUser !== 'undefined' && currentUser) {
        if (typeof toast === 'function') toast('Datos actualizados');
      }
    }
  },
  // ERROR CALLBACK - esto es critico para detectar problemas de reglas
  function(error) {
    console.error('[Firebase] Error en listener:', error.code, error.message);
    if (!_fbFirstDataDone) {
      _fbFirstDataDone = true;
      clearTimeout(_timeoutId);
      console.warn('[Firebase] No se pudo leer - posible problema de reglas de seguridad');
      if (typeof updateSyncUI === 'function') updateSyncUI('error', 'Sin permiso');
      if (onFirstData) { onFirstData(null); onFirstData = null; }
    }
  });
}

// -------------------- Sync ID counter --------------------
// Mueve _idC (de db.js) al max ID encontrado en los datos remotos.
// Antes estaba en github-sync.js; ahora vive aqui.

function syncIdCounter(db) {
  try {
    var allIds = [
      (db.especias||[]).map(function(e){return e.id||0}),
      (db.blends||[]).map(function(b){return b.id||0}),
      (db.ventas||[]).map(function(v){return v.id||0}),
      (db.movimientos||[]).map(function(m){return m.id||0}),
      (db.usuarios||[]).map(function(u){return u.id||0})
    ].flat();
    var maxId = Math.max.apply(null, [0].concat(allIds));
    if (maxId >= _idC) _idC = maxId;
  } catch(e) { console.warn('[Firebase] syncIdCounter error:', e.message); }
}

// -------------------- Push --------------------

function fbPush() {
  if (!fbDbRef) {
    console.warn('[Firebase] Push ignorado - no hay referencia');
    return;
  }
  var db = getDB();
  // Clonar profundo y limpiar campos internos
  var clean = JSON.parse(JSON.stringify(db));
  delete clean._ghConfig;
  delete clean._lastModified;
  delete clean._pendingPushSnapshot;

  // Pre-setear signature para ignorar nuestro propio eco
  _lastPushSignature = _dataSignature(clean);

  fbDbRef.set(clean)
    .then(function() {
      console.log('[Firebase] Push OK');
    })
    .catch(function(err) {
      console.error('[Firebase] Push error:', err.code || err.message);
      _lastPushSignature = ''; // Resetear para reintentar
      if (typeof toast === 'function') {
        var msg = 'Error al guardar: ';
        if (err.code === 'PERMISSION_DENIED') msg += 'Sin permisos en Firebase';
        else msg += (err.message || err.code || 'desconocido');
        toast(msg, 'err');
      }
      if (typeof updateSyncUI === 'function') updateSyncUI('error', 'Permiso');
    });
}

// -------------------- Force reload --------------------

function fbForceReload() {
  if (!fbDbRef) return;
  _lastPushSignature = ''; // Resetear para forzar procesamiento
  _fbFirstDataDone = false; // Permitir que el listener procese
  if (typeof updateSyncUI === 'function') updateSyncUI('syncing', '...');
  fbDbRef.once('value').then(function(snapshot) {
    var data = snapshot.val();
    if (data) {
      if (data._ghConfig) delete data._ghConfig;
      if (data._lastModified) delete data._lastModified;
      localStorage.setItem(DB_KEY, JSON.stringify(data));
      syncIdCounter(data);
      refreshCurrentPage();
      toast('Datos sincronizados desde Firebase');
      if (typeof updateSyncUI === 'function') updateSyncUI('ok', 'OK');
    } else {
      toast('No hay datos en Firebase');
      if (typeof updateSyncUI === 'function') updateSyncUI('ok', 'Vacio');
    }
  }).catch(function(err) {
    toast('Error al sincronizar: ' + (err.message || err.code || 'desconocido'), 'err');
    if (typeof updateSyncUI === 'function') updateSyncUI('error', 'Error');
  });
}

// -------------------- Status --------------------

function fbIsConnected() {
  return _fbConnectionState;
}

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

// -------------------- Clear remote data --------------------

function fbClearRemote() {
  if (!fbDbRef) return;
  if (!confirm('Borrar todos los datos de Firebase? Los demas dispositivos perderan los datos.')) return;
  fbDbRef.set(null).then(function() {
    toast('Datos remotos borrados');
  }).catch(function(err) {
    toast('Error: ' + err.message, 'err');
  });
}