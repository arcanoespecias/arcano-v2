// Arcano Admin Patch v2: nombre editable + busqueda + exportar Excel
(function(){
  // 1. Nombre editable al editar productos
  var oE = Pages.formEspecia, oB = Pages.formBlend;
  Pages.formEspecia = function(id) {
    oE(id);
    setTimeout(function() {
      var el = document.getElementById('f-esp-nombre');
      if (el) { el.removeAttribute('readonly'); el.style.opacity = '1'; }
    }, 150);
  };
  Pages.formBlend = function(id) {
    oB(id);
    setTimeout(function() {
      var el = document.getElementById('f-bl-nombre');
      if (el) { el.removeAttribute('readonly'); el.style.opacity = '1'; }
    }, 150);
  };

  // 2. Exportar a Excel usando SheetJS (ya cargado)
  Pages.exportarProductosExcel = function(tipo) {
    var ws_data, fn, sn;
    if (tipo === 'especias') {
      var list = ArcanoDB.getEspecias();
      ws_data = [['Nombre','Categoria','Pala (g)','Grs/Chico','Grs/Grande','Precio Chico','Precio Grande','Stock Chico','Stock Grande','En Tienda']];
      for (var i = 0; i < list.length; i++) {
        var e = list[i];
        ws_data.push([e.nombre||'', e.categoria||'', e.stockBolsa||0, e.gramosChico||0, e.gramosGrande||0, e.precioChico||0, e.precioGrande||0, e.stockChico||0, e.stockGrande||0, e.enTienda?'Si':'No']);
      }
      fn = 'especias_arcano.xlsx'; sn = 'ESPECIAS';
    } else {
      var list = ArcanoDB.getBlends();
      ws_data = [['Nombre','Categoria','Region','Ingredientes','Precio Chico','Precio Grande','Stock Chico','Stock Grande','En Tienda']];
      for (var i = 0; i < list.length; i++) {
        var b = list[i];
        var ings = (b.ingredientes||[]).map(function(x){ return (x.especiaNombre||'?') + ' ' + (x.gramosChico||0) + 'g/Ch ' + (x.gramosGrande||0) + 'g/Gr'; }).join('; ');
        ws_data.push([b.nombre||'', b.categoria||'', b.region||'', ings, b.precioChico||0, b.precioGrande||0, b.stockChico||0, b.stockGrande||0, b.enTienda?'Si':'No']);
      }
      fn = 'blends_arcano.xlsx'; sn = 'BLENDS';
    }
    var wb = XLSX.utils.book_new();
    var ws = XLSX.utils.aoa_to_sheet(ws_data);
    ws['!cols'] = [];
    for (var c = 0; c < ws_data[0].length; c++) {
      var mx = ws_data[0][c].length;
      for (var r = 1; r < ws_data.length; r++) {
        var cl = String(ws_data[r][c]||'').length;
        if (cl > mx) mx = cl;
      }
      ws['!cols'].push({ wch: Math.min(mx + 2, 40) });
    }
    XLSX.utils.book_append_sheet(wb, ws, sn);
    XLSX.writeFile(wb, fn);
  };

  // 3. Override renderProductos con busqueda + exportar + foco estable
  var _origRender = Pages.renderProductos;
  Pages.renderProductos = function(container) {
    var especias = ArcanoDB.getEspecias();
    var blends = ArcanoDB.getBlends();
    var tab = window._prodTab || 'especias';
    var search = window._prodSearch || '';
    var sN = search.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    var fEsp = especias.filter(function(e) { return !sN || e.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').indexOf(sN) !== -1; });
    var fBl = blends.filter(function(b) { return !sN || b.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').indexOf(sN) !== -1; });

    var h = '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">' +
      '<div class="tabs" style="margin-bottom:0;border-bottom:none">' +
        '<button class="tab' + (tab==='especias' ? ' active' : '') + '" onclick="window._prodTab=\'especias\';window._prodSearch=\'\';window._prodCursor=0;App.renderPage(\'productos\')">Especias<span class="tab-count">' + especias.length + '</span></button>' +
        '<button class="tab' + (tab==='blends' ? ' active' : '') + '" onclick="window._prodTab=\'blends\';window._prodSearch=\'\';window._prodCursor=0;App.renderPage(\'productos\')">Blends<span class="tab-count">' + blends.length + '</span></button>' +
        '<button class="tab' + (tab==='uso' ? ' active' : '') + '" onclick="window._prodTab=\'uso\';App.renderPage(\'productos\')">Etiquetas de uso</button>' +
      '</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
        (tab==='especias' ? '<button class="btn btn-gold" onclick="Pages.formEspecia()">+ Especia</button><button class="btn btn-outline" style="border-color:var(--green);color:var(--green)" onclick="Pages.formImportarExcel()">Importar Excel</button>' : '') +
        (tab==='blends' ? '<button class="btn btn-gold" onclick="Pages.formBlend()">+ Blend</button>' : '') +
      '</div></div>';

    if (tab !== 'uso') {
      var tc = tab==='especias' ? fEsp.length : fBl.length;
      var tca = tab==='especias' ? especias.length : blends.length;
      h += '<div style="display:flex;align-items:center;gap:8px;margin:10px 0 12px;flex-wrap:wrap">' +
        '<div style="position:relative;flex:1;min-width:200px">' +
          '<svg style="position:absolute;left:10px;top:50%;transform:translateY(-50%);width:16px;height:16px;opacity:0.4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
          '<input type="text" class="input" id="prod-search" placeholder="Buscar por nombre..." value="' + search.replace(/"/g, '&quot;') + '" style="padding-left:34px;width:100%">' +
        '</div>' +
        '<button class="btn btn-outline" style="border-color:var(--blue);color:var(--blue);white-space:nowrap" onclick="Pages.exportarProductosExcel(\'' + tab + '\')">Exportar ' + (tab==='especias' ? 'Especias' : 'Blends') + '</button>' +
        (search ? '<span class="text-sm text-muted">' + tc + '/' + tca + '</span>' : '') +
      '</div>';
    }

    h += '<div style="border-bottom:2px solid var(--border);margin:8px 0 16px"></div>';

    // --- TAB ESPECIAS ---
    if (tab === 'especias') {
      if (fEsp.length === 0) {
        h += '<div class="card"><div class="card-body"><p class="text-muted text-center" style="padding:32px">' + (search ? 'No se encontraron especias para "' + search + '"' : 'Sin especias. Crea una o importa desde Excel.') + '</p></div></div>';
      } else {
        h += '<div class="table-wrap"><table class="table"><thead><tr><th>Nombre</th><th>Cat.</th><th>Pala</th><th>Grs/Ch</th><th>Grs/Gr</th><th>$Pequeno</th><th>$Grande</th><th>Fr.Ch</th><th>Fr.Gr</th><th>Acciones</th></tr></thead><tbody>';
        for (var i = 0; i < fEsp.length; i++) {
          var e = fEsp[i];
          h += '<tr><td class="fw7">' + e.nombre + '</td><td><span class="badge badge-gold">' + (e.categoria||'\u2014') + '</span></td><td>' + (e.stockBolsa||0) + 'g</td><td>' + (e.gramosChico||0) + 'g</td><td>' + (e.gramosGrande||0) + 'g</td><td>$' + (e.precioChico||0).toLocaleString() + '</td><td>$' + (e.precioGrande||0).toLocaleString() + '</td><td><span class="' + ((e.stockChico||0)<=3?'text-red fw7':'text-green') + '">' + (e.stockChico||0) + '</span></td><td><span class="' + ((e.stockGrande||0)<=3?'text-red fw7':'text-green') + '">' + (e.stockGrande||0) + '</span></td><td style="white-space:nowrap"><button class="btn btn-sm ' + (e.enTienda?'btn-green':'btn-outline') + ' mr-4" onclick="ArcanoDB.toggleTienda(\'especia\',' + e.id + ');App.renderPage(\'productos\')" title="Tienda">' + (e.enTienda?'Tienda ON':'Tienda') + '</button><button class="btn btn-sm btn-green mr-4" onclick="Pages.formProduccionRapida(\'especia\',' + e.id + ')">Producir</button><button class="btn btn-sm btn-outline mr-8" onclick="Pages.formEspecia(' + e.id + ')">Editar</button><button class="btn btn-sm btn-red" onclick="Pages.delEspecia(' + e.id + ')">X</button></td></tr>';
        }
        h += '</tbody></table></div>';
      }
    }

    // --- TAB BLENDS ---
    if (tab === 'blends') {
      if (fBl.length === 0) {
        h += '<div class="card"><div class="card-body"><p class="text-muted text-center" style="padding:32px">' + (search ? 'No se encontraron blends para "' + search + '"' : 'Sin blends. Crea uno nuevo.') + '</p></div></div>';
      } else {
        h += '<div class="table-wrap"><table class="table"><thead><tr><th>Nombre</th><th>Cat.</th><th>Region</th><th>Ingredientes</th><th>$Pequeno</th><th>$Grande</th><th>Fr.Ch</th><th>Fr.Gr</th><th>Acciones</th></tr></thead><tbody>';
        for (var i = 0; i < fBl.length; i++) {
          var b = fBl[i];
          var ingN = (b.ingredientes||[]).map(function(x){return x.especiaNombre||'?'}).join(', ');
          h += '<tr><td class="fw7">' + b.nombre + '</td><td><span class="badge badge-blue">' + (b.categoria||'\u2014') + '</span></td><td class="text-sm text-muted">' + (b.region||'\u2014') + '</td><td class="text-sm text-muted">' + (ingN||'\u2014') + '</td><td>$' + (b.precioChico||0).toLocaleString() + '</td><td>$' + (b.precioGrande||0).toLocaleString() + '</td><td><span class="' + ((b.stockChico||0)<=3?'text-red fw7':'text-green') + '">' + (b.stockChico||0) + '</span></td><td><span class="' + ((b.stockGrande||0)<=3?'text-red fw7':'text-green') + '">' + (b.stockGrande||0) + '</span></td><td style="white-space:nowrap"><button class="btn btn-sm btn-outline mr-4" onclick="Pages.formBlend(' + b.id + ')" title="Editar">Editar</button><button class="btn btn-sm ' + (b.enTienda?'btn-green':'btn-outline') + ' mr-4" onclick="ArcanoDB.toggleTienda(\'blend\',' + b.id + ');App.renderPage(\'productos\')" title="Tienda">' + (b.enTienda?'Tienda ON':'Tienda') + '</button><button class="btn btn-sm btn-green mr-4" onclick="Pages.formProduccionRapida(\'blend\',' + b.id + ')">Producir</button><button class="btn btn-sm btn-red" onclick="Pages.delBlend(' + b.id + ')">X</button></td></tr>';
        }
        h += '</tbody></table></div>';
      }
    }

    // --- TAB USO: delegar a original ---
    if (tab === 'uso') { _origRender(container); return; }

    container.innerHTML = h;

    // Restaurar foco y posicion del cursor
    var si = document.getElementById('prod-search');
    if (si) {
      var pos = window._prodCursor || 0;
      si.focus();
      si.setSelectionRange(pos, pos);
      si.addEventListener('input', function() {
        window._prodSearch = this.value;
        window._prodCursor = this.selectionStart;
        Pages.renderProductos(container);
      });
    }
  };
})();
