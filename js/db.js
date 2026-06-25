// ===================== ID COUNTER =====================
let _idC = Date.now();
const nid = () => ++_idC;

// ===================== DB =====================
const DB_KEY = 'arcano_v1';

function getDB() {
  const def = {
    costos: { envChico:1780, envGrande:1750, pkgChico:0, pkgGrande:0, etiqueta:0, mo:0, otros:0 },
    especias: [],
    blends: [],
    ventas: [],
    usuarios: [
      { id: 1, nombre: 'Admin', pin: '1234', rol: 'admin', emoji: '👑' },
      { id: 2, nombre: 'Operador', pin: '0000', rol: 'operador', emoji: '🌿' },
    ],
    movimientos: []
  };
  try {
    const saved = JSON.parse(localStorage.getItem(DB_KEY) || '{}');
    return { ...def, ...saved };
  } catch { return def; }
}

let _saveDBTimer = null;
function saveDB(db) {
  db._lastModified = new Date().toISOString();
  localStorage.setItem(DB_KEY, JSON.stringify(db));
  // v8: Debounce de 800ms para evitar push por cada tecla (ej: costos oninput)
  // Se acumulan cambios rapidos y se hace UN solo push al final.
  if (typeof ghPush === 'function' && getGhConfig()) {
    clearTimeout(_saveDBTimer);
    _saveDBTimer = setTimeout(function() { ghPush(); }, 800);
  }
}

// ===================== UTILS =====================
const fmt  = n => '$' + Math.round(n || 0).toLocaleString('es-AR');
const fmtD = n => '$' + parseFloat(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtG = n => parseFloat(n || 0).toLocaleString('es-AR') + 'g';
const fmtDate = iso => new Date(iso).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'2-digit' });
const fmtDateTime = iso => new Date(iso).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' });
const fmtDay = iso => new Date(iso).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit' });

function toast(msg, type = 'gold') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = type === 'err'
    ? 'linear-gradient(135deg,#8b1a2a,#c04040)'
    : 'linear-gradient(135deg,#c9963a,#e8b84b)';
  t.style.color = type === 'err' ? '#fff' : '#1a0e00';
  t.style.display = 'block';
  clearTimeout(t._to);
  t._to = setTimeout(() => t.style.display = 'none', 2400);
}

function showAlert(id, msg, type = 'ok') {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `alert alert-${type} show`;
  el.textContent = msg;
  clearTimeout(el._to);
  el._to = setTimeout(() => el.classList.remove('show'), 3000);
}

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('open');
});

// ===================== COSTOS HELPERS =====================
function calcBlendCostData(bl, c) {
  const costoKg = bl.ingredientes.reduce((s, i) => s + (i.precioKg / 1000) * i.gramos, 0);
  const costo100g = costoKg / 10;
  const mpChico  = (costoKg / 1000) * (bl.pesoChico  || 0);
  const mpGrande = (costoKg / 1000) * (bl.pesoGrande || 0);
  const fijosC   = c.envChico  + c.pkgChico  + c.etiqueta + c.mo + c.otros;
  const fijosG   = c.envGrande + c.pkgGrande + c.etiqueta + c.mo + c.otros;
  const totalC   = mpChico  + fijosC;
  const totalG   = mpGrande + fijosG;
  const margenC  = bl.pVentaChico  ? ((bl.pVentaChico  - totalC) / bl.pVentaChico  * 100) : null;
  const margenG  = bl.pVentaGrande ? ((bl.pVentaGrande - totalG) / bl.pVentaGrande * 100) : null;
  return { costoKg, costo100g, mpChico, mpGrande, fijosC, fijosG, totalC, totalG, margenC, margenG };
}

function calcProduccion(bl, especias) {
  let unidadesC = Infinity, unidadesG = Infinity;
  if (!bl.pesoChico && !bl.pesoGrande) return { unidadesC: 0, unidadesG: 0 };
  for (const ing of bl.ingredientes) {
    const esp = especias.find(e => e.id == ing.espId);
    const stockG = esp ? (esp.stock || 0) : 0;
    const gramosPorUnitC = bl.pesoChico  ? (ing.gramos / 1000) * bl.pesoChico  : 0;
    const gramosPorUnitG = bl.pesoGrande ? (ing.gramos / 1000) * bl.pesoGrande : 0;
    if (bl.pesoChico  && gramosPorUnitC > 0) unidadesC = Math.min(unidadesC, Math.floor(stockG / gramosPorUnitC));
    if (bl.pesoGrande && gramosPorUnitG > 0) unidadesG = Math.min(unidadesG, Math.floor(stockG / gramosPorUnitG));
  }
  return { unidadesC: unidadesC === Infinity ? 0 : unidadesC, unidadesG: unidadesG === Infinity ? 0 : unidadesG };
}

// ===================== SEED DATA =====================
function seedIfEmpty() {
  const db = getDB();
  if (db.especias.length > 0) return;
  const esp = [
    { nombre:'Ajo polvo', precioKg:17000 }, { nombre:'Ajo escama', precioKg:0 },
    { nombre:'Ajo grano', precioKg:0 }, { nombre:'Cebolla en polvo', precioKg:19200 },
    { nombre:'Cebolla en escamas', precioKg:0 }, { nombre:'Paprika', precioKg:17000 },
    { nombre:'Pimenton en escamas', precioKg:0 }, { nombre:'Paprika ahumada', precioKg:0 },
    { nombre:'Oregano', precioKg:20000 }, { nombre:'Albahaca', precioKg:26400 },
    { nombre:'Tomillo', precioKg:26500 }, { nombre:'Laurel', precioKg:31500 },
    { nombre:'Romero', precioKg:26500 }, { nombre:'Canela', precioKg:95000 },
    { nombre:'Canela en polvo', precioKg:34000 }, { nombre:'Clavos', precioKg:29000 },
    { nombre:'Clavos polvo', precioKg:32000 }, { nombre:'Jengibre', precioKg:19500 },
    { nombre:'Pimienta comun', precioKg:39000 }, { nombre:'Pimienta negra', precioKg:53000 },
    { nombre:'Pimienta blanca', precioKg:0 }, { nombre:'Pimienta dulce', precioKg:50500 },
    { nombre:'Pimienta cayena', precioKg:41000 }, { nombre:'Comino', precioKg:27000 },
    { nombre:'Hinojo', precioKg:43500 }, { nombre:'Coreandro', precioKg:0 },
    { nombre:'Semillas de Cilantro', precioKg:28800 }, { nombre:'Fenogreco', precioKg:28800 },
    { nombre:'Semillas de Mostaza', precioKg:32000 }, { nombre:'Cardamomo', precioKg:0 },
    { nombre:'Curcuma', precioKg:16800 }, { nombre:'Nuez moscada', precioKg:0 },
    { nombre:'Anis estrellado', precioKg:0 },
  ];
  esp.forEach(e => { e.id = nid(); e.stock = 0; e.stockMin = 500; });
  db.especias = esp;
  const eid = n => db.especias.find(e => e.nombre === n)?.id;
  const blends = [
    { nombre:'Berbere', ingredientes:[
      {espId:eid('Paprika'),nombre:'Paprika',gramos:300,precioKg:17000},
      {espId:eid('Pimienta cayena'),nombre:'Pimienta cayena',gramos:200,precioKg:41000},
      {espId:eid('Jengibre'),nombre:'Jengibre',gramos:150,precioKg:19500},
      {espId:eid('Semillas de Cilantro'),nombre:'Semillas de Cilantro',gramos:150,precioKg:28800},
      {espId:eid('Fenogreco'),nombre:'Fenogreco',gramos:100,precioKg:28800},
      {espId:eid('Pimienta negra'),nombre:'Pimienta negra',gramos:50,precioKg:53000},
      {espId:eid('Clavos'),nombre:'Clavos',gramos:50,precioKg:29000},
    ]},
    { nombre:'Cajun', ingredientes:[
      {espId:eid('Paprika'),nombre:'Paprika',gramos:350,precioKg:17000},
      {espId:eid('Ajo polvo'),nombre:'Ajo polvo',gramos:150,precioKg:17000},
      {espId:eid('Cebolla en polvo'),nombre:'Cebolla en polvo',gramos:150,precioKg:19200},
      {espId:eid('Pimienta negra'),nombre:'Pimienta negra',gramos:150,precioKg:53000},
      {espId:eid('Tomillo'),nombre:'Tomillo',gramos:100,precioKg:26500},
      {espId:eid('Pimienta cayena'),nombre:'Pimienta cayena',gramos:100,precioKg:41000},
    ]},
    { nombre:'Creole', ingredientes:[
      {espId:eid('Paprika'),nombre:'Paprika',gramos:300,precioKg:17000},
      {espId:eid('Oregano'),nombre:'Oregano',gramos:200,precioKg:20000},
      {espId:eid('Tomillo'),nombre:'Tomillo',gramos:200,precioKg:26500},
      {espId:eid('Ajo polvo'),nombre:'Ajo polvo',gramos:150,precioKg:17000},
      {espId:eid('Pimienta negra'),nombre:'Pimienta negra',gramos:100,precioKg:53000},
      {espId:eid('Pimienta cayena'),nombre:'Pimienta cayena',gramos:50,precioKg:41000},
    ]},
    { nombre:'Jerk Jamaicano', ingredientes:[
      {espId:eid('Pimienta dulce'),nombre:'Pimienta dulce',gramos:350,precioKg:50500},
      {espId:eid('Jengibre'),nombre:'Jengibre',gramos:200,precioKg:19500},
      {espId:eid('Canela en polvo'),nombre:'Canela en polvo',gramos:150,precioKg:34000},
      {espId:eid('Tomillo'),nombre:'Tomillo',gramos:150,precioKg:26500},
      {espId:eid('Pimienta negra'),nombre:'Pimienta negra',gramos:100,precioKg:53000},
      {espId:eid('Pimienta cayena'),nombre:'Pimienta cayena',gramos:50,precioKg:41000},
    ]},
    { nombre:'Piri Piri', ingredientes:[
      {espId:eid('Pimienta cayena'),nombre:'Pimienta cayena',gramos:350,precioKg:41000},
      {espId:eid('Paprika'),nombre:'Paprika',gramos:250,precioKg:17000},
      {espId:eid('Ajo polvo'),nombre:'Ajo polvo',gramos:200,precioKg:17000},
      {espId:eid('Oregano'),nombre:'Oregano',gramos:100,precioKg:20000},
      {espId:eid('Pimienta negra'),nombre:'Pimienta negra',gramos:100,precioKg:53000},
    ]},
    { nombre:'Vegetales Asados', ingredientes:[
      {espId:eid('Romero'),nombre:'Romero',gramos:300,precioKg:26500},
      {espId:eid('Tomillo'),nombre:'Tomillo',gramos:250,precioKg:26500},
      {espId:eid('Ajo polvo'),nombre:'Ajo polvo',gramos:200,precioKg:17000},
      {espId:eid('Pimienta negra'),nombre:'Pimienta negra',gramos:150,precioKg:53000},
      {espId:eid('Oregano'),nombre:'Oregano',gramos:100,precioKg:20000},
    ]},
  ];
  blends.forEach(b => { b.id = nid(); b.pesoChico = 0; b.pesoGrande = 0; b.pVentaChico = 0; b.pVentaGrande = 0; b.notas = ''; });
  db.blends = blends;
  saveDB(db);
}
