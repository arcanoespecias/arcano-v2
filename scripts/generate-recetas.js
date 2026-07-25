#!/usr/bin/env node
/* ===================== ARCANO — GENERADOR DE RECETAS (Gemini API) =====================
   Genera 1 receta por categoria (Comida, Infusiones, Cocteleria)
   y las guarda en Firebase RTDB bajo arcano/db/recetas/
   Las recetas se ACUMULAN (push, no overwrite).
   Uso: node scripts/generate-recetas.js
   Variables de entorno: GEMINI_API_KEY (requerida)
   ===================== */

const https = require('https');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('ERROR: Variable de entorno GEMINI_API_KEY no definida');
  process.exit(1);
}

const CATEGORIAS = ['Comida', 'Infusiones', 'Cocteleria'];

function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

function callGemini(categoria, retries) {
  retries = retries || 2;
  return new Promise(function(resolve, reject) {
    var jsonExample = '{\n' +
      '  "titulo": "Nombre de la receta",\n' +
      '  "descripcion": "Breve descripcion de 1-2 oraciones",\n' +
      '  "tiempo": "30 min",\n' +
      '  "porciones": 4,\n' +
      '  "ingredientes": ["ingrediente 1", "ingrediente 2"],\n' +
      '  "pasos": ["Paso 1", "Paso 2"]\n' +
      '}';
    var prompt = 'Eres un experto en especias y cocina. Genera UNA receta creativa y original de categoria "' + categoria + '" que use especias de forma destacada. La receta debe ser practica y deliciosa. Responde SOLO con JSON valido (sin markdown, sin backticks, sin texto antes o despues) con esta estructura exacta:\n\n' + jsonExample + '\n\nLa receta debe ser diferente cada vez. Usa nombres de especias reales como curcuma, comino, canela, cardamomo, pimienta, etc. La categoria "' + categoria + '" implica: ' + getCategoryHint(categoria);

    var body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.9, maxOutputTokens: 1024 }
    });

    var options = {
      hostname: 'generativelanguage.googleapis.com',
      path: '/v1beta/models/gemini-2.0-flash:generateContent?key=' + GEMINI_API_KEY,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };

    var req = https.request(options, function(res) {
      var data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        try {
          var parsed = JSON.parse(data);
          if (parsed.error) {
            var errMsg = 'Gemini API error: ' + parsed.error.code + ' - ' + parsed.error.message;
            if (parsed.error.code === 429 && retries > 0) {
              var waitSec = 65;
              console.log('  Cuota agotada, esperando ' + waitSec + 's antes de reintentar... (retries: ' + retries + ')');
              sleep(waitSec * 1000).then(function() { return callGemini(categoria, retries - 1); }).then(resolve, reject);
              return;
            }
            reject(new Error(errMsg)); return;
          }
          var text = parsed.candidates && parsed.candidates[0] && parsed.candidates[0].content && parsed.candidates[0].content.parts && parsed.candidates[0].content.parts[0] && parsed.candidates[0].content.parts[0].text;
          if (!text) { reject(new Error('Respuesta vacia de Gemini para ' + categoria)); return; }
          text = text.replace(/\x60\x60\x60(?:json)?\s*/gi, '').replace(/\s*\x60\x60\x60$/gi, '').trim();
          var receta = JSON.parse(text);
          receta.categoria = categoria;
          receta.fecha = new Date().toISOString().split('T')[0];
          resolve(receta);
        } catch (e) {
          reject(new Error('Error parseando respuesta de Gemini para ' + categoria + ': ' + e.message + '\nRaw: ' + data.substring(0, 500)));
        }
      });
    });

    req.on('error', function(e) { reject(e); });
    req.write(body);
    req.end();
  });
}

function getCategoryHint(cat) {
  if (cat === 'Comida') return 'un plato principal, entrada o guarnicion salada con especias';
  if (cat === 'Infusiones') return 'una bebida caliente herbal o te con especias aromaticas';
  if (cat === 'Cocteleria') return 'un coctel o bebida con especias y alcohol o sin alcohol';
  return 'una receta con especias';
}

function pushToFirebase(receta) {
  return new Promise(function(resolve, reject) {
    var body = JSON.stringify(receta);
    var options = {
      hostname: 'arcano-6788d-default-rtdb.firebaseio.com',
      path: '/arcano/db/recetas.json',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };
    var req = https.request(options, function(res) {
      var data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        if (res.statusCode >= 200 && res.statusCode < 300) { resolve(data); }
        else { reject(new Error('Firebase POST error ' + res.statusCode + ': ' + data)); }
      });
    });
    req.on('error', function(e) { reject(e); });
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('=== Arcano Recetas Generator ===');
  console.log('Fecha: ' + new Date().toISOString());
  console.log('Categorias: ' + CATEGORIAS.join(', '));
  console.log('');

  for (var i = 0; i < CATEGORIAS.length; i++) {
    var cat = CATEGORIAS[i];
    if (i > 0) {
      console.log('Esperando 5s entre llamadas para evitar rate limit...');
      await sleep(5000);
    }
    console.log('Generando receta de ' + cat + '...');
    try {
      var receta = await callGemini(cat, 2);
      console.log('  Titulo: ' + receta.titulo);
      console.log('  Ingredientes: ' + (receta.ingredientes ? receta.ingredientes.length : 0) + ' items');
      console.log('  Pasos: ' + (receta.pasos ? receta.pasos.length : 0) + ' pasos');
      await pushToFirebase(receta);
      console.log('  Guardada en Firebase OK');
    } catch (err) {
      console.error('  ERROR con ' + cat + ': ' + err.message);
    }
    console.log('');
  }
  console.log('=== Fin ===');
}

main().catch(function(err) {
  console.error('Error fatal:', err.message);
  process.exit(1);
});
