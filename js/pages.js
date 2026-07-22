/* ===================== ARCANO V3 — PAGES (FIXED) ===================== */
const Pages = {

  /* ================================================================
     DASHBOARD
     ================================================================ */
  renderDashboard(container) {
    const s = ArcanoDB.getStats();
    const ultimasVentas = ArcanoDB.getVentas().slice(0, 5);
    const ultimasProd = ArcanoDB.getProducciones().slice(0, 5);

    container.innerHTML = `
      <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr)">
        <div class="stat-card" style="border-left-color: var(--gold)">
          <div class="stat-value">$${s.totalVentasHoy.toLocaleString()}</div>
          <div class="stat-label">Ventas Hoy</div>
          <div class="stat-sub">${s.ventasHoy} ops</div>
        </div>
        <div class="stat-card" style="border-left-color: var(--green)">
          <div class="stat-value">${s.totalFrascos}</div>
          <div class="stat-label">Frascos Listos</div>
          <div class="stat-sub">${s.frascosChico} ch / ${s.frascosGrande} gr</div>
        </div>
        <div class="stat-card" style="border-left-color: var(--blue)">
          <div class="stat-value">$${s.totalVentasMes.toLocaleString()}</div>
          <div class="stat-label">Ventas del Mes</div>
          <div class="stat-sub">${s.ventasMes} ops</div>
        </div>
      </div>
      <div class="stats-grid mt-12" style="grid-template-columns: repeat(5, 1fr)">
        <div class="stat-card"><div class="stat-value" style="font-size:1.2rem">${s.totalEspecias}</div><div class="stat-label">Especias</div></div>
        <div class="stat-card"><div class="stat-value" style="font-size:1.2rem">${s.totalBlends}</div><div class="stat-label">Blends</div></div>
        <div class="stat-card"><div class="stat-value" style="font-size:1.2rem;color:var(--blue)">${s.envasesChico}</div><div class="stat-label">Env. Chicos</div></div>
        <div class="stat-card"><div class="stat-value" style="font-size:1.2rem;color:var(--blue)">${s.envasesGrande}</div><div class="stat-label">Env. Grandes</div></div>
        <div class="stat-card"><div class="stat-value" style="font-size:1.2rem;color:${s.especiasBolsaBaja.length > 0 ? 'var(--red)' : 'var(--green)'}">${s.especiasBolsaBaja.length}</div><div class="stat-label">Bolsa Baja</div><div class="stat-sub">${s.especiasBolsaBaja.map(function(e){return e.nombre}).join(', ') || 'OK'}</div></div>
      </div>
      ${(s.etiquetasBajas.length > 0 || s.especiasBolsaBaja.length > 0) ? '<div class="card mt-16"><div class="card-header"><h3>Alertas</h3></div><div class="card-body">' +
        s.especiasBolsaBaja.map(function(e){return '<span class="badge badge-red mr-8">BOLSA: '+e.nombre+' '+(e.stockBolsa||0)+'g</span>'}).join('') +
        s.etiquetasBajas.map(function(e){return '<span class="badge badge-yellow mr-8">ETQ: '+(e.nombre||'?')+' ('+((e.stockChico||0)+(e.stockGrande||0))+')</span>'}).join('') +
        '</div></div>' : ''}
      <div class="g2 mt-16" style="gap:16px">
        <div class="card"><div class="card-header"><h3>Ultimas Ventas</h3></div><div class="card-body">
          ${ultimasVentas.length === 0 ? '<p class="text-muted text-center text-sm">Sin ventas</p>' :
          '<div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Total</th><th>Items</th></tr></thead><tbody>' +
          ultimasVentas.map(function(v){return '<tr><td>'+(v.fecha||'')+'</td><td class="fw7 text-gold">$'+(v.total||0).toLocaleString()+'</td><td class="text-sm">'+(v.items||[]).map(function(i){return (i.productoNombre||'?')+' x'+(i.cantidad||0)}).join(', ')+'</td></tr>'}).join('') +
          '</tbody></table></div>'}</div></div>
        <div class="card"><div class="card-header"><h3>Ultimas Producciones</h3></div><div class="card-body">
          ${ultimasProd.length === 0 ? '<p class="text-muted text-center text-sm">Sin producciones</p>' :
          '<div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Producto</th><th>Talla</th><th>Cant.</th></tr></thead><tbody>' +
          ultimasProd.map(function(p){return '<tr><td>'+(p.fecha||'')+'</td><td class="fw7">'+(p.productoNombre||'')+'</td><td><span class="badge '+((p.talla||'chico')==='grande'?'badge-gold':'badge-blue')+'">'+(p.talla||'chico')+'</span></td><td class="fw7 text-green">'+(p.cantidad||0)+'</td></tr>'}).join('') +
          '</tbody></table></div>'}</div></div>
      </div>`;
  },

  /* ================================================================
     PRODUCTOS
     ================================================================ */
  renderProductos(container) {
    var especias = ArcanoDB.getEspecias();
    var blends = ArcanoDB.getBlends();
    var tab = window._prodTab || 'especias';

    var h = '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">' +
      '<div class="tabs" style="margin-bottom:0;border-bottom:none">' +
        `<button class="tab${tab==='especias' ? ' active' : ''}" onclick="window._prodTab='especias';App.renderPage('productos')">Especias<span class="tab-count">${especias.length}</span></button>` +
        `<button class="tab${tab==='blends' ? ' active' : ''}" onclick="window._prodTab='blends';App.renderPage('productos')">Blends<span class="tab-count">${blends.length}</span></button>` +
        `<button class="tab${tab==='etiquetas' ? ' active' : ''}" onclick="window._prodTab='etiquetas';App.renderPage('productos')">Etiquetas</button>` +
      '</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
        (tab==='especias' ? '<button class="btn btn-gold" onclick="Pages.formEspecia()">+ Especia</button><button class="btn btn-outline" style="border-color:var(--green);color:var(--green)" onclick="Pages.formImportarExcel()">Importar Excel</button>' : '') +
        (tab==='blends' ? '<button class="btn btn-gold" onclick="Pages.formBlend()">+ Blend</button>' : '') +
      '</div></div>';

    h += '<div style="border-bottom:2px solid var(--border);margin:8px 0 16px"></div>';

    // --- TAB: ESPECIAS ---
    if (tab === 'especias') {
      if (especias.length === 0) {
        h += '<div class="card"><div class="card-body"><p class="text-muted text-center" style="padding:32px">Sin especias. Crea una o importa desde Excel.</p></div></div>';
      } else {
        h += '<div class="table-wrap"><table class="table"><thead><tr><th>Nombre</th><th>Cat.</th><th>Bolsa</th><th>Grs/Ch</th><th>Grs/Gr</th><th>$Chico</th><th>$Grande</th><th>Fr.Ch</th><th>Fr.Gr</th><th>Acciones</th></tr></thead><tbody>';
        for (var i = 0; i < especias.length; i++) {
          var e = especias[i];
          h += '<tr>' +
            '<td class="fw7">' + e.nombre + '</td>' +
            '<td><span class="badge badge-gold">' + (e.categoria||'—') + '</span></td>' +
            '<td>' + (e.stockBolsa||0) + 'g</td>' +
            '<td>' + (e.gramosChico||0) + 'g</td>' +
            '<td>' + (e.gramosGrande||0) + 'g</td>' +
            '<td>$' + (e.precioChico||0).toLocaleString() + '</td>' +
            '<td>$' + (e.precioGrande||0).toLocaleString() + '</td>' +
            '<td><span class="' + ((e.stockChico||0)<=3?'text-red fw7':'text-green') + '">' + (e.stockChico||0) + '</span></td>' +
            '<td><span class="' + ((e.stockGrande||0)<=3?'text-red fw7':'text-green') + '">' + (e.stockGrande||0) + '</span></td>' +
            '<td style="white-space:nowrap">' +
              '<button class="btn btn-sm "' + (e.enTienda ? "'btn-green'" : "'btn-outline'") + ' mr-4" onclick="ArcanoDB.toggleTienda(\'especia\',' + e.id + ');App.renderPage(\'productos\')" title="Tienda">' + (e.enTienda ? "'Tienda ON'" : "'Tienda'") + '</button>' +
              '<button class="btn btn-sm btn-green mr-4" onclick="Pages.formProduccionRapida(\'especia\',' + e.id + ')">Producir</button>' +
              '<button class="btn btn-sm btn-outline mr-8" onclick="Pages.formEspecia(' + e.id + ')">Editar</button>' +
              '<button class="btn btn-sm btn-red" onclick="Pages.delEspecia(' + e.id + ')">X</button>' +
            '</td></tr>';
        }
        h += '</tbody></table></div>';
      }
    }

    // --- TAB: BLENDS ---
    if (tab === 'blends') {
      if (blends.length === 0) {
        h += '<div class="card"><div class="card-body"><p class="text-muted text-center" style="padding:32px">Sin blends. Crea uno nuevo.</p></div></div>';
      } else {
        h += '<div class="table-wrap"><table class="table"><thead><tr><th>Nombre</th><th>Cat.</th><th>Region</th><th>Ingredientes</th><th>$Chico</th><th>$Grande</th><th>Fr.Ch</th><th>Fr.Gr</th><th>Acciones</th></tr></thead><tbody>';
        for (var i = 0; i < blends.length; i++) {
          var b = blends[i];
          var ingN = (b.ingredientes||[]).map(function(x){return x.especiaNombre||'?'}).join(', ');
          h += '<tr>' +
            '<td class="fw7">' + b.nombre + '</td>' +
            '<td><span class="badge badge-blue">' + (b.categoria||'—') + '</span></td>' +
            '<td class="text-sm text-muted">' + (b.region||'—') + '</td>' +
            '<td class="text-sm text-muted">' + (ingN||'—') + '</td>' +
            '<td>$' + (b.precioChico||0).toLocaleString() + '</td>' +
            '<td>$' + (b.precioGrande||0).toLocaleString() + '</td>' +
            '<td><span class="' + ((b.stockChico||0)<=3?'text-red fw7':'text-green') + '">' + (b.stockChico||0) + '</span></td>' +
            '<td><span class="' + ((b.stockGrande||0)<=3?'text-red fw7':'text-green') + '">' + (b.stockGrande||0) + '</span></td>' +
            '<td style="white-space:nowrap">' +
              '<button class="btn btn-sm "' + (b.enTienda ? "'btn-green'" : "'btn-outline'") + ' mr-4" onclick="ArcanoDB.toggleTienda(\'blend\',' + b.id + ');App.renderPage(\'productos\')" title="Tienda">' + (b.enTienda ? "'Tienda ON'" : "'Tienda'") + '</button>' +
              '<button class="btn btn-sm btn-green mr-4" onclick="Pages.formProduccionRapida(\'blend\',' + b.id + ')">Producir</button>' +
              '<button class="btn btn-sm btn-red" onclick="Pages.delBlend(' + b.id + ')">X</button>' +
            '</td></tr>';
        }
        h += '</tbody></table></div>';
      }
    }

    // --- TAB: ETIQUETAS ---
    if (tab === 'etiquetas') {
      var allTags = ArcanoDB.getProductTags();
      var catKeys = ['Comidas', 'Infusiones', 'Cocteleria'];
      h += '<div class="card"><div class="card-body">';
      for (var ci = 0; ci < catKeys.length; ci++) {
        var cat = catKeys[ci];
        var tags = allTags[cat] || [];
        h += '<div style="margin-bottom:20px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><span class="badge badge-gold" style="min-width:100px;text-align:center">' + cat + '</span>' +
          `<input type="text" class="input" id="new-tag-${ci}" placeholder="Nueva etiqueta..." style="flex:1;padding:6px 10px;font-size:.85rem" onkeydown="if(event.key==='Enter')Pages.doAddTag('${cat}',${ci})">` +
          `<button class="btn btn-sm btn-outline" onclick="Pages.doAddTag('${cat}',${ci})">+ Agregar</button></div>` +
          '<div style="display:flex;flex-wrap:wrap;gap:6px">';
        for (var ti = 0; ti < tags.length; ti++) {
          `<span class="tag-chip-admin"><span>${tags[ti]}</span><button onclick="Pages.doRemoveTag('${cat}','${tags[ti].replace(/'/g, '&apos;')}')" style="background:none;border:none;cursor:pointer;color:var(--red);font-size:1rem;padding:0 2px">Ã</button></span>`;
        }
        if (tags.length === 0) h += '<span class="text-sm text-muted">Sin etiquetas</span>';
        h += '</div></div>';
      }
      h += '</div></div>';
    }

    container.innerHTML = h;
  },

  /* ==================== ESPECIA FORM ====================  /* ==================== ESPECIA FORM ==================== */
  formEspecia(editId) {
    var esp = (editId != null) ? ArcanoDB.getEspecia(editId) : null;
    var isEdit = (esp != null);

    var modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.setAttribute('data-edit-id', isEdit ? String(editId) : '');

    var inner = '<div class="modal modal-lg">' +
      '<div class="modal-header"><h3>' + (isEdit ? 'Editar: ' + esp.nombre : 'Nueva Especia') + '</h3>' +
      '<button class="btn btn-ghost" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div>' +
      '<div class="modal-body">' +
        '<div class="form-group"><label>Nombre</label><input type="text" class="input" id="f-esp-nombre" value="' + (isEdit ? esp.nombre : '') + '" placeholder="Ej: Curcuma" ' + (isEdit ? 'readonly style="opacity:0.6"' : '') + '></div>' +
        '<div class="form-group"><label>Categoria</label><select class="input" id="f-esp-cat" onchange="Pages.refreshTagSelector(\'esp\')">' +
          '<option value="Comidas"' + (isEdit && esp.categoria==='Comidas' ? ' selected' : '') + '>Comidas</option>' +
          '<option value="Infusiones"' + (isEdit && esp.categoria==='Infusiones' ? ' selected' : '') + '>Infusiones</option>' +
          '<option value="Cocteleria"' + (isEdit && esp.categoria==='Cocteleria' ? ' selected' : '') + '>Cocteleria</option>' +
        '</select></div>' +
        '<div class="g2"><div class="form-group"><label>Precio Frasco Chico ($)</label><input type="number" class="input" id="f-esp-pc" value="' + (isEdit ? esp.precioChico : '') + '" placeholder="0" min="0"></div>' +
        '<div class="form-group"><label>Precio Frasco Grande ($)</label><input type="number" class="input" id="f-esp-pg" value="' + (isEdit ? esp.precioGrande : '') + '" placeholder="0" min="0"></div></div>' +
        '<div class="g2"><div class="form-group"><label>Gramos por Frasco Chico</label><input type="number" class="input" id="f-esp-gc" value="' + (isEdit ? esp.gramosChico : '') + '" placeholder="Ej: 30" min="0"></div>' +
        '<div class="form-group"><label>Gramos por Frasco Grande</label><input type="number" class="input" id="f-esp-gg" value="' + (isEdit ? esp.gramosGrande : '') + '" placeholder="Ej: 80" min="0"></div></div>' +
        '<div class="card mt-12" style="background:var(--bg);border-color:var(--gold)"><div class="card-header"><h3>Tienda</h3></div><div class="card-body">' +
        '<div class="form-group"><label>Visible en Tienda</label><select class="input" id="f-esp-tienda"><option value="0"' + (isEdit && esp.enTienda ? '' : ' selected') + '>No</option><option value="1"' + (isEdit && esp.enTienda ? ' selected' : '') + '>Si</option></select></div>' +
        '<div class="g2"><div class="form-group"><label>Precio Tienda Chico ($)</label><input type="number" class="input" id="f-esp-tc" value="' + (isEdit ? (esp.precioTiendaChico||'') : '') + '" placeholder="0" min="0"></div>' +
        '<div class="form-group"><label>Precio Tienda Grande ($)</label><input type="number" class="input" id="f-esp-tg" value="' + (isEdit ? (esp.precioTiendaGrande||'') : '') + '" placeholder="0" min="0"></div></div>' +
        '<div class="form-group"><label>Imagen</label><div class="img-upload-area" id="img-area-esp"><input type="file" accept="image/*" id="f-esp-img" style="display:none" onchange="Pages.handleImageUpload(this,\'img-area-esp\')">' +
        (isEdit && esp.imagen ? '<img src="' + esp.imagen + '" class="img-preview" id="img-preview-esp"><button class="btn btn-sm btn-red" style="margin-top:6px" onclick="Pages.removeImage(\'img-area-esp\',\'f-esp-img\')">Quitar imagen</button>' : '') +
        '<div class="img-upload-placeholder" onclick="document.getElementById(\'f-esp-img\').click()"><span>+ Click para subir imagen</span></div></div></div>' +
        '</div></div>' +
        '<div class="form-group"><label>Etiquetas</label><div id="tag-area-esp">' + Pages.buildTagSelectorHtml(isEdit ? (esp.categoria||'Comidas') : 'Comidas', esp.tags || []) + '</div></div>' +
        '<div class="form-group"><label>Descripcion (opcional)</label><textarea class="input" id="f-esp-desc" rows="2" placeholder="Breve descripcion del producto para la tienda...">' + (isEdit ? (esp.descripcion||'') : '') + '</textarea></div>' +
        '<div class="form-group"><label>Uso / Preparaciones (opcional)</label><input type="text" class="input" id="f-esp-uso" value="' + (isEdit ? (esp.uso||'') : '') + '" placeholder="Ej: Carnes, Arroces, Sopas"></div>' +
        (isEdit ? '<p class="text-xs text-muted mt-8">Stock: ' + (esp.stockBolsa||0) + 'g bolsa, ' + (esp.stockChico||0) + ' fr chico, ' + (esp.stockGrande||0) + ' fr grande</p>' : '') +
      '</div><div class="modal-footer">' +
        '<button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Cancelar</button>' +
        '<button class="btn btn-gold" id="btn-save-esp">Guardar</button>' +
      '</div></div>';
    modal.innerHTML = inner;
    document.body.appendChild(modal);

    // Bind save button (no inline onclick with id interpolation)
    document.getElementById('btn-save-esp').addEventListener('click', function() {
      var nombre = document.getElementById('f-esp-nombre').value.trim();
      if (!nombre) { alert('Ingresa un nombre'); return; }
      var previewEl = document.getElementById('img-preview-esp');
      var data = {
        nombre: nombre,
        categoria: document.getElementById('f-esp-cat').value,
        precioChico: Number(document.getElementById('f-esp-pc').value) || 0,
        precioGrande: Number(document.getElementById('f-esp-pg').value) || 0,
        gramosChico: Number(document.getElementById('f-esp-gc').value) || 0,
        gramosGrande: Number(document.getElementById('f-esp-gg').value) || 0,
        enTienda: document.getElementById('f-esp-tienda').value === '1',
        precioTiendaChico: Number(document.getElementById('f-esp-tc').value) || 0,
        precioTiendaGrande: Number(document.getElementById('f-esp-tg').value) || 0,
        imagen: previewEl ? previewEl.src : '',
        descripcion: (document.getElementById('f-esp-desc') || {}).value ? document.getElementById('f-esp-desc').value.trim() : '',
        uso: (document.getElementById('f-esp-uso') || {}).value ? document.getElementById('f-esp-uso').value.trim() : '',
        tags: Pages.getSelectedTags()
      };
      if (isEdit) {
        data.id = editId;  // CRITICAL: set the existing ID
      }
      try {
        ArcanoDB.saveEspecia(data);
        modal.remove();
        App.renderPage('productos');
      } catch (err) { alert('Error: ' + err.message); }
    });

    if (!isEdit) document.getElementById('f-esp-nombre').focus();
  },

  delEspecia(id) {
    var esp = ArcanoDB.getEspecia(id);
    if (!esp) return;
    if (!confirm('Eliminar "' + esp.nombre + '"?')) return;
    ArcanoDB.deleteEspecia(id);
    App.renderPage('productos');
  },

  /* ==================== BLEND FORM ==================== */
  formBlend(editId) {
    var bl = (editId != null) ? ArcanoDB.getBlend(editId) : null;
    var isEdit = (bl != null);
    var especias = ArcanoDB.getEspecias();
    var ings = isEdit ? (bl.ingredientes || []) : [{ especiaId: '', gramosChico: '', gramosGrande: '' }];

    var modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.setAttribute('data-edit-id', isEdit ? String(editId) : '');

    var espOptions = '<option value="">Seleccionar</option>';
    for (var i = 0; i < especias.length; i++) {
      espOptions += '<option value="' + especias[i].id + '">' + especias[i].nombre + '</option>';
    }

    var inner = '<div class="modal modal-lg">' +
      '<div class="modal-header"><h3>' + (isEdit ? 'Editar: ' + bl.nombre : 'Nuevo Blend') + '</h3>' +
      '<button class="btn btn-ghost" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div>' +
      '<div class="modal-body">' +
        '<div class="form-group"><label>Nombre</label><input type="text" class="input" id="f-bl-nombre" value="' + (isEdit ? bl.nombre : '') + '" placeholder="Ej: Curry Casero" ' + (isEdit ? 'readonly style="opacity:0.6"' : '') + '></div>' +
        '<div class="g2">' +
          '<div class="form-group"><label>Categoria</label><select class="input" id="f-bl-cat" onchange="Pages.refreshTagSelector(\'bl\')">' +
          '<option value="Comidas"' + (isEdit && bl.categoria==='Comidas' ? ' selected' : '') + '>Comidas</option>' +
          '<option value="Infusiones"' + (isEdit && bl.categoria==='Infusiones' ? ' selected' : '') + '>Infusiones</option>' +
          '<option value="Cocteleria"' + (isEdit && bl.categoria==='Cocteleria' ? ' selected' : '') + '>Cocteleria</option>' +
        '</select></div>' +
          '<div class="form-group"><label>Region (opcional)</label><input type="text" class="input" id="f-bl-region" value="' + (isEdit ? (bl.region||'') : '') + '" placeholder="Ej: India"></div>' +
        '</div>' +
        '<div class="form-group"><label>Uso (opcional)</label><input type="text" class="input" id="f-bl-uso" value="' + (isEdit ? (bl.uso||'') : '') + '" placeholder="Ej: Carnes, Currys"></div>' +
        '<div class="g2"><div class="form-group"><label>Precio Chico ($)</label><input type="number" class="input" id="f-bl-pc" value="' + (isEdit ? bl.precioChico : '') + '" placeholder="0" min="0"></div>' +
        '<div class="form-group"><label>Precio Grande ($)</label><input type="number" class="input" id="f-bl-pg" value="' + (isEdit ? bl.precioGrande : '') + '" placeholder="0" min="0"></div></div>' +
        '<div class="form-group"><label>Ingredientes</label><div id="blend-ings"></div>' +
        '<button class="btn btn-sm btn-outline mt-8" id="btn-add-ing">+ Ingrediente</button></div>' +
        '<div class="card mt-12" style="background:var(--bg);border-color:var(--gold)"><div class="card-header"><h3>Tienda</h3></div><div class="card-body">' +
        '<div class="form-group"><label>Visible en Tienda</label><select class="input" id="f-bl-tienda"><option value="0"' + (isEdit && bl.enTienda ? '' : ' selected') + '>No</option><option value="1"' + (isEdit && bl.enTienda ? ' selected' : '') + '>Si</option></select></div>' +
        '<div class="g2"><div class="form-group"><label>Precio Tienda Chico ($)</label><input type="number" class="input" id="f-bl-tc" value="' + (isEdit ? (bl.precioTiendaChico||'') : '') + '" placeholder="0" min="0"></div>' +
        '<div class="form-group"><label>Precio Tienda Grande ($)</label><input type="number" class="input" id="f-bl-tg" value="' + (isEdit ? (bl.precioTiendaGrande||'') : '') + '" placeholder="0" min="0"></div></div>' +
        '<div class="form-group"><label>Imagen</label><div class="img-upload-area" id="img-area-bl"><input type="file" accept="image/*" id="f-bl-img" style="display:none" onchange="Pages.handleImageUpload(this,\'img-area-bl\')">' +
        (isEdit && bl.imagen ? '<img src="' + bl.imagen + '" class="img-preview" id="img-preview-bl"><button class="btn btn-sm btn-red" style="margin-top:6px" onclick="Pages.removeImage(\'img-area-bl\',\'f-bl-img\')">Quitar imagen</button>' : '') +
        '<div class="img-upload-placeholder" onclick="document.getElementById(\'f-bl-img\').click()"><span>+ Click para subir imagen</span></div></div></div>' +
        '</div></div>' +
        '<div class="form-group"><label>Etiquetas</label><div id="tag-area-bl">' + Pages.buildTagSelectorHtml(isEdit ? (bl.categoria||'Comidas') : 'Comidas', bl.tags || []) + '</div></div>' +
        '<div class="form-group"><label>Descripcion (opcional)</label><textarea class="input" id="f-bl-desc" rows="2" placeholder="Breve descripcion del blend para la tienda...">' + (isEdit ? (bl.descripcion||'') : '') + '</textarea></div>' +
        (isEdit ? '<p class="text-xs text-muted mt-8">Stock: ' + (bl.stockChico||0) + ' fr chico, ' + (bl.stockGrande||0) + ' fr grande</p>' : '') +
      '</div><div class="modal-footer">' +
        '<button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Cancelar</button>' +
        '<button class="btn btn-gold" id="btn-save-bl">Guardar</button>' +
      '</div></div>';
    modal.innerHTML = inner;
    document.body.appendChild(modal);

    // Build ingredient rows
    var ingContainer = document.getElementById('blend-ings');
    var espOptsHTML = espOptions; // capture

    function addIngRow(ing) {
      var div = document.createElement('div');
      div.className = 'g4 mb-8';
      div.style.alignItems = 'end';
      var gc = ing ? (ing.gramosChico || '') : '';
      var gg = ing ? (ing.gramosGrande || '') : '';
      var selVal = ing ? ing.especiaId : '';
      div.innerHTML =
        '<div class="form-group" style="margin:0"><label>Especia</label><select class="input ing-esp">' + espOptsHTML + '</select></div>' +
        '<div class="form-group" style="margin:0"><label>Grs/Chico</label><input type="number" class="input ing-gc" value="' + gc + '" placeholder="0" min="0"></div>' +
        '<div class="form-group" style="margin:0"><label>Grs/Grande</label><input type="number" class="input ing-gg" value="' + gg + '" placeholder="0" min="0"></div>' +
        '<div><button class="btn btn-sm btn-red btn-rm-ing">X</button></div>';
      if (selVal) div.querySelector('.ing-esp').value = selVal;
      div.querySelector('.btn-rm-ing').addEventListener('click', function() { div.remove(); });
      ingContainer.appendChild(div);
    }

    for (var i = 0; i < ings.length; i++) addIngRow(ings[i]);
    document.getElementById('btn-add-ing').addEventListener('click', function() { addIngRow(null); });

    // Save
    document.getElementById('btn-save-bl').addEventListener('click', function() {
      var nombre = document.getElementById('f-bl-nombre').value.trim();
      if (!nombre) { alert('Ingresa un nombre'); return; }
      var rows = ingContainer.querySelectorAll('.g4');
      var ingredientes = [];
      for (var r = 0; r < rows.length; r++) {
        var espId = Number(rows[r].querySelector('.ing-esp').value);
        var gc = Number(rows[r].querySelector('.ing-gc').value) || 0;
        var gg = Number(rows[r].querySelector('.ing-gg').value) || 0;
        if (!espId) continue;
        var espObj = null;
        for (var s = 0; s < especias.length; s++) { if (especias[s].id === espId) { espObj = especias[s]; break; } }
        ingredientes.push({ especiaId: espId, especiaNombre: espObj ? espObj.nombre : '', gramosChico: gc, gramosGrande: gg });
      }
      var data = {
        nombre: nombre,
        categoria: document.getElementById('f-bl-cat').value,
        region: (document.getElementById('f-bl-region') || {}).value ? document.getElementById('f-bl-region').value.trim() : '',
        uso: (document.getElementById('f-bl-uso') || {}).value ? document.getElementById('f-bl-uso').value.trim() : '',
        precioChico: Number(document.getElementById('f-bl-pc').value) || 0,
        precioGrande: Number(document.getElementById('f-bl-pg').value) || 0,
        ingredientes: ingredientes,
        enTienda: document.getElementById('f-bl-tienda').value === '1',
        precioTiendaChico: Number(document.getElementById('f-bl-tc').value) || 0,
        precioTiendaGrande: Number(document.getElementById('f-bl-tg').value) || 0,
        imagen: (document.getElementById('img-preview-bl') || {}).src || '',
        descripcion: (document.getElementById('f-bl-desc') || {}).value ? document.getElementById('f-bl-desc').value.trim() : '',
        tags: Pages.getSelectedTags()
      };
      if (isEdit) {
        data.id = editId;  // CRITICAL: set the existing ID
      }
      try {
        ArcanoDB.saveBlend(data);
        modal.remove();
        App.renderPage('productos');
      } catch (err) { alert('Error: ' + err.message); }
    });

    if (!isEdit) document.getElementById('f-bl-nombre').focus();
  },

  delBlend(id) {
    var bl = ArcanoDB.getBlend(id);
    if (!bl) return;
    if (!confirm('Eliminar "' + bl.nombre + '"?')) return;
    ArcanoDB.deleteBlend(id);
    App.renderPage('productos');
  },

  /* ================================================================
     INSUMOS
     ================================================================ */
  renderInsumos(container) {
    var db = ArcanoDB.getDB();
    var envases = db.stockEnvases || { chico: 0, grande: 0 };
    var especias = ArcanoDB.getEspecias();
    var etiqList = ArcanoDB.getProductosConEtiquetas();
    var entradas = ArcanoDB.getEntradas();

    var h = '<div class="page-actions"><button class="btn btn-gold" onclick="Pages.formEntrada()">+ Registrar Entrada</button></div>';
    h += '<div class="stats-grid mt-12" style="grid-template-columns: repeat(3, 1fr)">' +
      '<div class="stat-card" style="border-left-color:var(--blue)"><div class="stat-value" style="color:var(--blue)">' + (envases.chico||0) + '</div><div class="stat-label">Envases Chicos</div></div>' +
      '<div class="stat-card" style="border-left-color:var(--blue)"><div class="stat-value" style="color:var(--blue)">' + (envases.grande||0) + '</div><div class="stat-label">Envases Grandes</div></div>' +
      '<div class="stat-card" style="border-left-color:var(--gold)"><div class="stat-value">' + especias.length + '</div><div class="stat-label">Especias en Bolsa</div></div></div>';

    h += '<div class="g2 mt-16" style="gap:16px">';
    // Especias en bolsa
    h += '<div class="card"><div class="card-header"><h3>Bolsa (materia prima)</h3></div><div class="card-body">';
    if (especias.length === 0) { h += '<p class="text-muted text-center text-sm">Sin especias</p>'; }
    else {
      h += '<div class="table-wrap"><table class="table"><thead><tr><th>Especia</th><th>Cat.</th><th>Gramos</th></tr></thead><tbody>';
      for (var i = 0; i < especias.length; i++) {
        var e = especias[i];
        var cls = (e.stockBolsa||0) <= 50 ? 'text-red fw7' : (e.stockBolsa||0) <= 200 ? 'text-yellow fw7' : 'text-green';
        h += '<tr><td class="fw7">' + e.nombre + '</td><td class="text-sm">' + (e.categoria||'') + '</td><td class="' + cls + '">' + (e.stockBolsa||0) + ' grs</td></tr>';
      }
      h += '</tbody></table></div>';
    }
    h += '</div></div>';
    // Etiquetas
    h += '<div class="card"><div class="card-header"><h3>Etiquetas</h3></div><div class="card-body">';
    if (etiqList.length === 0) { h += '<p class="text-muted text-center text-sm">Sin productos</p>'; }
    else {
      h += '<div class="table-wrap"><table class="table"><thead><tr><th>Producto</th><th>Tipo</th><th>Chico</th><th>Grande</th></tr></thead><tbody>';
      for (var i = 0; i < etiqList.length; i++) {
        var et = etiqList[i];
        h += '<tr><td class="fw7">' + et.nombre + '</td><td><span class="badge ' + (et.tipo==='blend'?'badge-blue':'badge-gold') + '">' + (et.tipo==='blend'?'Blend':'Especia') + '</span></td>' +
          '<td class="' + (et.stockChico<=5?'text-red fw7':'') + '">' + et.stockChico + '</td>' +
          '<td class="' + (et.stockGrande<=5?'text-red fw7':'') + '">' + et.stockGrande + '</td></tr>';
      }
      h += '</tbody></table></div>';
    }
    h += '</div></div></div>';

    // Historial
    h += '<div class="card mt-16"><div class="card-header"><h3>Historial de Entradas</h3></div><div class="card-body">';
    if (entradas.length === 0) { h += '<p class="text-muted text-center">Sin entradas.</p>'; }
    else {
      h += '<div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Items</th><th>Total</th><th></th></tr></thead><tbody>';
      for (var i = 0; i < Math.min(entradas.length, 30); i++) {
        var en = entradas[i];
        var desc = (en.items||[]).map(function(it) {
          if (it.tipo==='especia_grs') return (it.especiaNombre||'?') + ' ' + it.cantidad + 'grs';
          if (it.tipo==='envase') return 'Env ' + (it.talla||'chico') + ' x' + it.cantidad;
          if (it.tipo==='etiqueta') return 'Etq ' + (it.etiquetaNombre||'?') + ' ' + (it.talla||'chico') + ' x' + it.cantidad;
          return '?';
        }).join(' | ');
        h += '<tr><td>' + (en.fecha||'') + '</td><td class="text-sm">' + desc + '</td><td class="fw7 text-gold">$' + (en.total||0).toLocaleString() + '</td>' +
          '<td><button class="btn btn-sm btn-red" onclick="Pages.delEntrada(' + en.id + ')">X</button></td></tr>';
      }
      h += '</tbody></table></div>';
    }
    h += '</div></div>';
    container.innerHTML = h;
  },

  /* ---------- Entrada Form ---------- */
  formEntrada() {
    var especias = ArcanoDB.getEspecias();
    var modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = '<div class="modal modal-lg">' +
      '<div class="modal-header"><h3>Registrar Entrada</h3><button class="btn btn-ghost" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div>' +
      '<div class="modal-body">' +
        '<div class="form-group"><label>Fecha</label><input type="date" class="input" id="f-ent-fecha" value="' + new Date().toISOString().slice(0,10) + '"></div>' +
        '<div class="form-group"><label>Proveedor (opcional)</label><input type="text" class="input" id="f-ent-prov" placeholder="Nombre"></div>' +
        '<div class="form-group"><label>Items</label><div id="ent-items"></div>' +
        '<button class="btn btn-sm btn-outline mt-8" id="btn-add-ent">+ Item</button></div>' +
        '<div class="venta-total-box mt-12">Total: $<span id="ent-total">0</span></div>' +
      '</div><div class="modal-footer">' +
        '<button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Cancelar</button>' +
        '<button class="btn btn-gold" id="btn-save-ent">Registrar</button>' +
      '</div></div>';
    document.body.appendChild(modal);

    var itemsDiv = document.getElementById('ent-items');

    function buildEspOpts() {
      var o = '';
      var esps = ArcanoDB.getEspecias();
      for (var i = 0; i < esps.length; i++) o += '<option value="' + esps[i].id + '">' + esps[i].nombre + '</option>';
      return o;
    }

    function buildProductoOpts() {
      var o = '';
      var esps = ArcanoDB.getEspecias();
      var bls = ArcanoDB.getBlends();
      if (esps.length > 0) {
        o += '<optgroup label="Especias">';
        for (var i = 0; i < esps.length; i++) o += '<option value="' + esps[i].nombre + '">' + esps[i].nombre + '</option>';
        o += '</optgroup>';
      }
      if (bls.length > 0) {
        o += '<optgroup label="Blends">';
        for (var i = 0; i < bls.length; i++) o += '<option value="' + bls[i].nombre + '">' + bls[i].nombre + '</option>';
        o += '</optgroup>';
      }
      return o;
    }

    function addEntRow() {
      var div = document.createElement('div');
      div.className = 'card mb-8';
      div.style.background = 'var(--bg)';
      div.innerHTML = '<div class="card-body" style="padding:12px">' +
        '<div class="g4 mb-8">' +
          '<div class="form-group" style="margin:0"><label>Tipo</label><select class="input ent-tipo"><option value="especia_grs">Especia (grs)</option><option value="envase">Envases</option><option value="etiqueta">Etiquetas</option></select></div>' +
          '<div class="form-group" style="margin:0" id="ent-detail-placeholder"></div>' +
          '<div class="form-group" style="margin:0"><label>Cantidad</label><input type="number" class="input ent-cant" placeholder="0" min="0"></div>' +
          '<div class="form-group" style="margin:0"><label>Costo Unit.</label><input type="number" class="input ent-cost" placeholder="0" min="0"></div>' +
        '</div>' +
        '<div style="text-align:right"><button class="btn btn-sm btn-red btn-rm-ent">Quitar</button></div>' +
        '</div>';
      itemsDiv.appendChild(div);

      var tipoSel = div.querySelector('.ent-tipo');
      var detailDiv = div.querySelector('#ent-detail-placeholder');
      detailDiv.removeAttribute('id');

      function renderDetail() {
        var t = tipoSel.value;
        if (t === 'especia_grs') {
          detailDiv.innerHTML = '<label>Especia</label><select class="input ent-especia"><option value="">Seleccionar</option>' + buildEspOpts() + '</select>';
        } else if (t === 'envase') {
          detailDiv.innerHTML = '<label>Talla</label><select class="input ent-talla"><option value="chico">Chico</option><option value="grande">Grande</option></select>';
        } else {
          detailDiv.innerHTML = '<label>Producto</label><select class="input ent-etq-nombre"><option value="">Seleccionar</option>' + buildProductoOpts() + '</select><label class="mt-8" style="display:block">Talla</label><select class="input ent-talla"><option value="chico">Chico</option><option value="grande">Grande</option></select>';
        }
      }
      tipoSel.addEventListener('change', renderDetail);
      renderDetail();
      div.querySelector('.btn-rm-ent').addEventListener('click', function() { div.remove(); updateTotal(); });
      div.querySelector('.ent-cant').addEventListener('input', updateTotal);
      div.querySelector('.ent-cost').addEventListener('input', updateTotal);
    }

    function updateTotal() {
      var rows = itemsDiv.children;
      var total = 0;
      for (var i = 0; i < rows.length; i++) {
        var c = Number(rows[i].querySelector('.ent-cant').value) || 0;
        var co = Number(rows[i].querySelector('.ent-cost').value) || 0;
        total += c * co;
      }
      document.getElementById('ent-total').textContent = total.toLocaleString();
    }

    addEntRow();
    document.getElementById('btn-add-ent').addEventListener('click', addEntRow);

    document.getElementById('btn-save-ent').addEventListener('click', function() {
      var rows = itemsDiv.children;
      var items = [];
      var total = 0;
      var esps = ArcanoDB.getEspecias();

      for (var i = 0; i < rows.length; i++) {
        var tipo = rows[i].querySelector('.ent-tipo').value;
        var cant = Number(rows[i].querySelector('.ent-cant').value) || 0;
        var cost = Number(rows[i].querySelector('.ent-cost').value) || 0;
        if (cant <= 0) continue;
        var item = { tipo: tipo, cantidad: cant, costoUnitario: cost };
        total += cant * cost;
        if (tipo === 'especia_grs') {
          var espSel = rows[i].querySelector('.ent-especia');
          if (!espSel) { alert('Falta especia en item ' + (i+1)); return; }
          item.especiaId = Number(espSel.value);
          var espObj = null;
          for (var s = 0; s < esps.length; s++) { if (esps[s].id === item.especiaId) { espObj = esps[s]; break; } }
          item.especiaNombre = espObj ? espObj.nombre : '?';
        } else if (tipo === 'envase') {
          item.talla = rows[i].querySelector('.ent-talla').value;
        } else if (tipo === 'etiqueta') {
          item.etiquetaNombre = (rows[i].querySelector('.ent-etq-nombre').value || '').trim();
          if (!item.etiquetaNombre) { alert('Falta nombre de etiqueta en item ' + (i+1)); return; }
          item.talla = rows[i].querySelector('.ent-talla').value;
        }
        items.push(item);
      }
      if (items.length === 0) { alert('Agrega al menos un item'); return; }
      try {
        ArcanoDB.saveEntrada({ fecha: document.getElementById('f-ent-fecha').value, proveedor: document.getElementById('f-ent-prov').value.trim(), items: items, total: total });
        modal.remove();
        App.renderPage('insumos');
      } catch (err) { alert('Error: ' + err.message); }
    });
  },

  delEntrada(id) {
    if (!confirm('Eliminar esta entrada?')) return;
    ArcanoDB.deleteEntrada(id);
    App.renderPage('insumos');
  },

  /* ================================================================
     PRODUCCION
     ================================================================ */
  renderProduccion(container) {
    var prods = ArcanoDB.getProducciones();
    var h = '<div class="page-actions"><button class="btn btn-gold" onclick="Pages.formProduccion()">+ Nueva Produccion</button></div>';
    h += '<div class="card mt-16"><div class="card-header"><h3>Historial</h3></div><div class="card-body">';
    if (prods.length === 0) {
      h += '<p class="text-muted text-center">Sin producciones.</p>';
    } else {
      h += '<div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Tipo</th><th>Producto</th><th>Talla</th><th>Cant.</th><th>Detalle</th></tr></thead><tbody>';
      for (var i = 0; i < Math.min(prods.length, 30); i++) {
        var p = prods[i];
        var det = p.tipo === 'blend' ?
          (p.ingredientes||[]).map(function(x){return x.especiaNombre+' '+x.gramosTotal+'g'}).join(', ') :
          (p.gramosTotal||0) + 'g consumidos';
        h += '<tr><td>' + (p.fecha||'') + '</td>' +
          '<td><span class="badge ' + (p.tipo==='blend'?'badge-blue':'badge-gold') + '">' + (p.tipo==='blend'?'Blend':'Especia') + '</span></td>' +
          '<td class="fw7">' + (p.productoNombre||'') + '</td>' +
          '<td><span class="badge ' + ((p.talla||'chico')==='grande'?'badge-gold':'badge-blue') + '">' + (p.talla||'chico') + '</span></td>' +
          '<td class="fw7 text-green">' + (p.cantidad||0) + ' fr</td>' +
          '<td class="text-sm">' + det + ' | Env:' + (p.envasesConsumidos||0) + ' Etq:' + (p.etiquetasConsumidas||0) + '</td></tr>';
      }
      h += '</tbody></table></div>';
    }
    h += '</div></div>';
    container.innerHTML = h;
  },

  /** Produccion rapida desde Productos */
  formProduccionRapida(tipo, productoId) {
    Pages.formProduccion(tipo, productoId);
  },

  /** Formulario de produccion — tipo y productoId son opcionales (pre-llenan) */
  formProduccion(presetTipo, presetProdId) {
    var modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = '<div class="modal modal-lg">' +
      '<div class="modal-header"><h3>Nueva Produccion</h3><button class="btn btn-ghost" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div>' +
      '<div class="modal-body">' +
        '<div class="form-group"><label>Tipo</label><select class="input" id="f-prod-tipo"><option value="especia">Especia</option><option value="blend">Blend</option></select></div>' +
        '<div class="form-group"><label>Producto</label><select class="input" id="f-prod-prod"><option value="">Seleccionar</option></select></div>' +
        '<div class="g2"><div class="form-group"><label>Talla</label><select class="input" id="f-prod-talla"><option value="chico">Chico</option><option value="grande">Grande</option></select></div>' +
        '<div class="form-group"><label>Cantidad de frascos</label><input type="number" class="input" id="f-prod-cant" value="1" min="1"></div></div>' +
        '<div id="f-prod-preview" class="mt-12"></div>' +
      '</div><div class="modal-footer">' +
        '<button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Cancelar</button>' +
        '<button class="btn btn-gold" id="btn-prod">Producir</button>' +
      '</div></div>';
    document.body.appendChild(modal);

    var tipoSel = document.getElementById('f-prod-tipo');
    var prodSel = document.getElementById('f-prod-prod');
    var tallaSel = document.getElementById('f-prod-talla');
    var cantInput = document.getElementById('f-prod-cant');
    var previewDiv = document.getElementById('f-prod-preview');
    var prodBtn = document.getElementById('btn-prod');
    prodBtn.disabled = true;

    function loadProductos() {
      var tipo = tipoSel.value;
      var list = tipo === 'blend' ? ArcanoDB.getBlends() : ArcanoDB.getEspecias();
      prodSel.innerHTML = '<option value="">Seleccionar</option>';
      for (var i = 0; i < list.length; i++) {
        prodSel.innerHTML += '<option value="' + list[i].id + '">' + list[i].nombre + '</option>';
      }
      previewDiv.innerHTML = '';
      prodBtn.disabled = true;
    }

    function updatePreview() {
      var tipo = tipoSel.value;
      var prodId = Number(prodSel.value);
      var talla = tallaSel.value;
      var cant = Number(cantInput.value) || 0;
      if (!prodId || cant <= 0) { previewDiv.innerHTML = ''; prodBtn.disabled = true; return; }

      var producto = tipo === 'blend' ? ArcanoDB.getBlend(prodId) : ArcanoDB.getEspecia(prodId);
      if (!producto) { previewDiv.innerHTML = '<p class="text-red">Producto no encontrado</p>'; prodBtn.disabled = true; return; }

      var db = ArcanoDB.getDB();
      var envases = db.stockEnvases || { chico: 0, grande: 0 };
      var allOk = true;
      var h = '<div class="card"><div class="card-body">' +
        '<p class="fw7 mb-8">Producir ' + cant + ' frasco' + (cant>1?'s':'') + ' ' + talla + ' de <span class="text-gold">' + producto.nombre + '</span></p>';

      if (tipo === 'especia') {
        var gpf = talla === 'grande' ? (Number(producto.gramosGrande)||0) : (Number(producto.gramosChico)||0);
        var grsTotal = gpf * cant;
        var bolsaOk = (producto.stockBolsa||0) >= grsTotal;
        if (!bolsaOk) allOk = false;
        h += '<div class="list-row"><span>Bolsa de ' + producto.nombre + '</span><span class="' + (bolsaOk?'text-green':'text-red fw7') + '">' + (producto.stockBolsa||0) + 'g disponible → necesita ' + grsTotal + 'g ' + (bolsaOk?'OK':'FALTA') + '</span></div>';
      } else {
        // Blend ingredients
        var ings = producto.ingredientes || [];
        if (ings.length === 0) {
          h += '<p class="text-red">Este blend no tiene ingredientes definidos. Editalo primero.</p>';
          allOk = false;
        } else {
          for (var i = 0; i < ings.length; i++) {
            var esp = ArcanoDB.getEspecia(ings[i].especiaId);
            var gpf2 = talla === 'grande' ? (Number(ings[i].gramosGrande)||0) : (Number(ings[i].gramosChico)||0);
            var needed = gpf2 * cant;
            var avail = esp ? (esp.stockBolsa||0) : 0;
            var ok = avail >= needed;
            if (!ok) allOk = false;
            h += '<div class="list-row"><span>' + (esp?esp.nombre:'?') + ' (bolsa)</span><span class="' + (ok?'text-green':'text-red fw7') + '">' + avail + 'g → necesita ' + needed + 'g ' + (ok?'OK':'FALTA') + '</span></div>';
          }
        }
      }

      // Envases
      var envAvail = envases[talla] || 0;
      var envOk = envAvail >= cant;
      if (!envOk) allOk = false;
      h += '<div class="list-row"><span>Envases ' + talla + '</span><span class="' + (envOk?'text-green':'text-red fw7') + '">' + envAvail + ' → necesita ' + cant + ' ' + (envOk?'OK':'FALTA') + '</span></div>';

      // Etiquetas
      var etqAvail = 0;
      var etqKeys = Object.keys(db.etiquetas || {});
      for (var j = 0; j < etqKeys.length; j++) {
        if (db.etiquetas[etqKeys[j]].nombre === producto.nombre) {
          etqAvail = Number(db.etiquetas[etqKeys[j]][talla==='grande'?'stockGrande':'stockChico']) || 0;
          break;
        }
      }
      var etqOk = etqAvail >= cant;
      if (!etqOk) allOk = false;
      h += '<div class="list-row"><span>Etiquetas ' + talla + '</span><span class="' + (etqOk?'text-green':'text-red fw7') + '">' + etqAvail + ' → necesita ' + cant + ' ' + (etqOk?'OK':'FALTA') + '</span></div>';

      h += '</div></div>';
      previewDiv.innerHTML = h;
      prodBtn.disabled = !allOk;
    }

    tipoSel.addEventListener('change', function() { loadProductos(); });
    prodSel.addEventListener('change', updatePreview);
    tallaSel.addEventListener('change', updatePreview);
    cantInput.addEventListener('input', updatePreview);

    // PRODUCE BUTTON — the critical missing handler
    prodBtn.addEventListener('click', function() {
      var tipo = tipoSel.value;
      var prodId = Number(prodSel.value);
      var talla = tallaSel.value;
      var cant = Number(cantInput.value) || 0;
      if (!prodId || cant <= 0) { alert('Selecciona producto y cantidad'); return; }
      try {
        if (tipo === 'blend') {
          ArcanoDB.producirBlend(prodId, talla, cant);
        } else {
          ArcanoDB.producirEspecia(prodId, talla, cant);
        }
        modal.remove();
        App.renderPage(App.currentPage);
      } catch (err) { alert('Error: ' + err.message); }
    });

    // Preset values if called from Productos
    if (presetTipo) tipoSel.value = presetTipo;
    loadProductos();
    if (presetProdId) {
      prodSel.value = presetProdId;
      updatePreview();
    }
  },

  /* ================================================================
     VENTAS
     ================================================================ */
  renderVentas(container) {
    var ventas = ArcanoDB.getVentas();
    var h = '<div class="page-actions"><button class="btn btn-gold" onclick="Pages.formVenta()">+ Nueva Venta</button></div>';
    h += '<div class="card mt-16"><div class="card-header"><h3>Historial</h3></div><div class="card-body">';
    if (ventas.length === 0) {
      h += '<p class="text-muted text-center">Sin ventas.</p>';
    } else {
      h += '<div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Items</th><th>Total</th><th></th></tr></thead><tbody>';
      for (var i = 0; i < Math.min(ventas.length, 30); i++) {
        var v = ventas[i];
        var desc = (v.items||[]).map(function(it){ return (it.productoNombre||'?')+' '+(it.talla||'chico')+' x'+(it.cantidad||0)+' ($'+(it.subtotal||0).toLocaleString()+')'; }).join(' | ');
        h += '<tr><td>' + (v.fecha||'') + '</td><td class="text-sm">' + desc + '</td><td class="fw7 text-gold">$' + (v.total||0).toLocaleString() + '</td>' +
          '<td><button class="btn btn-sm btn-red" onclick="Pages.delVenta(' + v.id + ')">X</button></td></tr>';
      }
      h += '</tbody></table></div>';
    }
    h += '</div></div>';
    container.innerHTML = h;
  },

  formVenta() {
    var frascos = ArcanoDB.getFrascosParaVender();
    var modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = '<div class="modal modal-lg">' +
      '<div class="modal-header"><h3>Nueva Venta</h3><button class="btn btn-ghost" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div>' +
      '<div class="modal-body">' +
        '<div class="form-group"><label>Fecha</label><input type="date" class="input" id="f-v-fecha" value="' + new Date().toISOString().slice(0,10) + '"></div>' +
        '<div class="form-group"><label>Items</label><div id="v-items"></div>' +
        '<button class="btn btn-sm btn-outline mt-8" id="btn-add-vitem">+ Item</button></div>' +
        '<div class="venta-total-box mt-12">Total: $<span id="v-total">0</span></div>' +
      '</div><div class="modal-footer">' +
        '<button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Cancelar</button>' +
        '<button class="btn btn-gold" id="btn-save-v">Vender</button>' +
      '</div></div>';
    document.body.appendChild(modal);

    var itemsDiv = document.getElementById('v-items');

    function buildFrascoOpts() {
      var list = ArcanoDB.getFrascosParaVender();
      var o = '<option value="">Seleccionar</option>';
      for (var i = 0; i < list.length; i++) {
        var f = list[i];
        o += '<option value="' + f.tipo + '|' + f.id + '|' + f.talla + '" data-precio="' + f.precio + '" data-stock="' + f.stock + '">' +
          f.nombre + ' (' + f.talla + ') - $' + f.precio.toLocaleString() + ' [stock:' + f.stock + ']</option>';
      }
      return o;
    }

    function addVItemRow() {
      var div = document.createElement('div');
      div.className = 'g4 mb-8';
      div.style.alignItems = 'end';
      div.innerHTML =
        '<div class="form-group" style="margin:0"><label>Producto</label><select class="input vi-prod">' + buildFrascoOpts() + '</select></div>' +
        '<div class="form-group" style="margin:0"><label>Cantidad</label><input type="number" class="input vi-cant" value="1" min="1"></div>' +
        '<div class="form-group" style="margin:0"><label>Precio Unit.</label><input type="number" class="input vi-precio" placeholder="0"></div>' +
        '<div><button class="btn btn-sm btn-red btn-rm-vi">X</button></div>';
      itemsDiv.appendChild(div);

      var prodSel = div.querySelector('.vi-prod');
      var cantInp = div.querySelector('.vi-cant');
      var precioInp = div.querySelector('.vi-precio');

      prodSel.addEventListener('change', function() {
        var opt = prodSel.options[prodSel.selectedIndex];
        precioInp.value = opt.dataset.precio || '';
        cantInp.max = opt.dataset.stock || 999;
        if (Number(cantInp.value) > Number(opt.dataset.stock)) cantInp.value = opt.dataset.stock;
        updateTotal();
      });
      cantInp.addEventListener('input', updateTotal);
      precioInp.addEventListener('input', updateTotal);
      div.querySelector('.btn-rm-vi').addEventListener('click', function() { div.remove(); updateTotal(); });
    }

    function updateTotal() {
      var rows = itemsDiv.children;
      var total = 0;
      for (var i = 0; i < rows.length; i++) {
        total += (Number(rows[i].querySelector('.vi-cant').value)||0) * (Number(rows[i].querySelector('.vi-precio').value)||0);
      }
      document.getElementById('v-total').textContent = total.toLocaleString();
    }

    addVItemRow();
    document.getElementById('btn-add-vitem').addEventListener('click', addVItemRow);

    document.getElementById('btn-save-v').addEventListener('click', function() {
      var rows = itemsDiv.children;
      var items = [];
      for (var i = 0; i < rows.length; i++) {
        var val = rows[i].querySelector('.vi-prod').value;
        if (!val) continue;
        var parts = val.split('|');
        var cant = Number(rows[i].querySelector('.vi-cant').value) || 0;
        var precio = Number(rows[i].querySelector('.vi-precio').value) || 0;
        if (cant <= 0) continue;
        items.push({ tipo: parts[0], productoId: Number(parts[1]), talla: parts[2], cantidad: cant, precioUnitario: precio });
      }
      if (items.length === 0) { alert('Agrega al menos un item'); return; }
      try {
        ArcanoDB.saveVenta({ fecha: document.getElementById('f-v-fecha').value, items: items });
        modal.remove();
        App.renderPage('ventas');
      } catch (err) { alert('Error: ' + err.message); }
    });
  },

  delVenta(id) {
    if (!confirm('Eliminar esta venta?')) return;
    ArcanoDB.deleteVenta(id);
    App.renderPage('ventas');
  },

  /* ================================================================
     STOCK
     ================================================================ */
  renderStock(container) {
    var db = ArcanoDB.getDB();
    var especias = ArcanoDB.getEspecias();
    var blends = ArcanoDB.getBlends();
    var envases = db.stockEnvases || { chico: 0, grande: 0 };
    var etiqList = ArcanoDB.getProductosConEtiquetas();

    var h = '<div class="stats-grid" style="grid-template-columns: repeat(3, 1fr)">' +
      '<div class="stat-card" style="border-left-color:var(--blue)"><div class="stat-value" style="color:var(--blue)">' + (envases.chico||0) + '</div><div class="stat-label">Envases Chicos</div></div>' +
      '<div class="stat-card" style="border-left-color:var(--blue)"><div class="stat-value" style="color:var(--blue)">' + (envases.grande||0) + '</div><div class="stat-label">Envases Grandes</div></div>' +
      '<div class="stat-card" style="border-left-color:var(--gold)"><div class="stat-value">' +
        (especias.reduce(function(s,e){return s+(e.stockChico||0)},0) + blends.reduce(function(s,b){return s+(b.stockChico||0)},0)) +
      '</div><div class="stat-label">Total Frascos Chico</div></div></div>';

    h += '<div class="card mt-16"><div class="card-header"><h3>Especias</h3></div><div class="card-body">';
    if (especias.length === 0) { h += '<p class="text-muted text-center">Sin especias</p>'; }
    else {
      h += '<div class="table-wrap"><table class="table"><thead><tr><th>Nombre</th><th>Bolsa (grs)</th><th>Fr.Chico</th><th>Fr.Grande</th><th>Etq.Chico</th><th>Etq.Grande</th></tr></thead><tbody>';
      for (var i = 0; i < especias.length; i++) {
        var e = especias[i];
        var et = null;
        for (var j = 0; j < etiqList.length; j++) { if (etiqList[j].nombre === e.nombre) { et = etiqList[j]; break; } }
        h += '<tr><td class="fw7">' + e.nombre + '</td>' +
          '<td class="' + ((e.stockBolsa||0)<=50?'text-red fw7':'') + '">' + (e.stockBolsa||0) + '</td>' +
          '<td class="' + ((e.stockChico||0)<=3?'text-red fw7':'text-green') + '">' + (e.stockChico||0) + '</td>' +
          '<td class="' + ((e.stockGrande||0)<=3?'text-red fw7':'text-green') + '">' + (e.stockGrande||0) + '</td>' +
          '<td>' + (et?et.stockChico:0) + '</td><td>' + (et?et.stockGrande:0) + '</td></tr>';
      }
      h += '</tbody></table></div>';
    }
    h += '</div></div>';

    h += '<div class="card mt-16"><div class="card-header"><h3>Blends</h3></div><div class="card-body">';
    if (blends.length === 0) { h += '<p class="text-muted text-center">Sin blends</p>'; }
    else {
      h += '<div class="table-wrap"><table class="table"><thead><tr><th>Nombre</th><th>Fr.Chico</th><th>Fr.Grande</th><th>Etq.Chico</th><th>Etq.Grande</th></tr></thead><tbody>';
      for (var i = 0; i < blends.length; i++) {
        var b = blends[i];
        var et = null;
        for (var j = 0; j < etiqList.length; j++) { if (etiqList[j].nombre === b.nombre) { et = etiqList[j]; break; } }
        h += '<tr><td class="fw7">' + b.nombre + '</td>' +
          '<td class="' + ((b.stockChico||0)<=3?'text-red fw7':'text-green') + '">' + (b.stockChico||0) + '</td>' +
          '<td class="' + ((b.stockGrande||0)<=3?'text-red fw7':'text-green') + '">' + (b.stockGrande||0) + '</td>' +
          '<td>' + (et?et.stockChico:0) + '</td><td>' + (et?et.stockGrande:0) + '</td></tr>';
      }
      h += '</tbody></table></div>';
    }
    h += '</div></div>';
    container.innerHTML = h;
  },

  /* ================================================================
     TIENDA ADMIN
     ================================================================ */
  renderTiendaAdmin(container) {
    var productos = ArcanoDB.getTiendaProductos();
    var allEsp = ArcanoDB.getEspecias();
    var allBl = ArcanoDB.getBlends();
    var enTiendaCount = 0;
    for (var i = 0; i < allEsp.length; i++) { if (allEsp[i].enTienda) enTiendaCount++; }
    for (var i = 0; i < allBl.length; i++) { if (allBl[i].enTienda) enTiendaCount++; }

    var h = '<div class="stats-grid" style="grid-template-columns: repeat(3, 1fr)">' +
      '<div class="stat-card" style="border-left-color:var(--gold)"><div class="stat-value">' + enTiendaCount + '</div><div class="stat-label">Productos en Tienda</div></div>' +
      '<div class="stat-card" style="border-left-color:var(--green)"><div class="stat-value">' + productos.length + '</div><div class="stat-label">Disponibles (con stock)</div></div>' +
      '<div class="stat-card"><div class="stat-value" style="font-size:0.85rem">arcanoespecias.github.io/arcano-v2/tienda.html</div><div class="stat-label">URL Publica</div></div>' +
      '</div>';

    h += '<div class="card mt-16"><div class="card-header"><h3>Productos visibles en la tienda</h3></div><div class="card-body">';
    if (productos.length === 0) {
      h += '<p class="text-muted text-center">No hay productos visibles. Activa "Tienda" en Productos > Editar.</p>';
    } else {
      h += '<div class="table-wrap"><table class="table"><thead><tr><th>Nombre</th><th>Tipo</th><th>Cat.</th><th>Precio Chico</th><th>Precio Grande</th><th>Stock Ch</th><th>Stock Gr</th></tr></thead><tbody>';
      for (var i = 0; i < productos.length; i++) {
        var p = productos[i];
        h += '<tr>' +
          '<td class="fw7">' + p.nombre + '</td>' +
          '<td><span class="badge ' + (p.tipo==='blend'?'badge-blue':'badge-gold') + '">' + (p.tipo==='blend'?'Blend':'Especia') + '</span></td>' +
          '<td>' + (p.categoria||'') + '</td>' +
          '<td class="text-gold">$' + (p.precioChico||0).toLocaleString() + '</td>' +
          '<td class="text-gold">$' + (p.precioGrande||0).toLocaleString() + '</td>' +
          '<td class="text-green">' + p.stockChico + '</td>' +
          '<td class="text-green">' + p.stockGrande + '</td></tr>';
      }
      h += '</tbody></table></div>';
    }
    h += '</div></div>';
    container.innerHTML = h;
  },

  /* ================================================================
     IMPORTAR EXCEL
     ================================================================ */
  formImportarExcel() {
    var modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = '<div class="modal modal-lg" style="max-width:680px">' +
      '<div class="modal-header"><h3>Importar Excel</h3><button class="btn btn-ghost" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div>' +
      '<div class="modal-body">' +
        '<p class="text-sm text-muted mb-12">Subi tu archivo Excel con las hojas <b>ESPECIAS</b> y <b>BLENDS</b>. El sistema creara los productos automaticamente.</p>' +
        '<div class="form-group"><label>Archivo Excel (.xlsx)</label>' +
        '<input type="file" class="input" id="f-import-file" accept=".xlsx,.xls"></div>' +
        '<div class="g2">' +
          '<div class="form-group"><label>Grs por Frasco Chico</label><input type="number" class="input" id="f-import-gc" value="30" min="1"></div>' +
          '<div class="form-group"><label>Grs por Frasco Grande</label><input type="number" class="input" id="f-import-gg" value="80" min="1"></div>' +
        '</div>' +
        '<div id="f-import-status" class="mt-12"></div>' +
        '<div id="f-import-preview" class="mt-12" style="display:none"></div>' +
      '</div>' +
      '<div class="modal-footer" id="f-import-footer">' +
        '<button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Cancelar</button>' +
        '<button class="btn btn-gold" id="btn-parse-excel" disabled>Analizar</button>' +
      '</div>' +
    '</div>';
    document.body.appendChild(modal);

    var fileInput = document.getElementById('f-import-file');
    var parseBtn = document.getElementById('btn-parse-excel');
    var statusDiv = document.getElementById('f-import-status');
    var previewDiv = document.getElementById('f-import-preview');
    var footerDiv = document.getElementById('f-import-footer');

    // Enable parse button when file selected
    fileInput.addEventListener('change', function() {
      parseBtn.disabled = !fileInput.files.length;
    });

    // Parse Excel
    parseBtn.addEventListener('click', function() {
      parseBtn.disabled = true;
      statusDiv.innerHTML = '<p class="text-muted">Leyendo archivo...</p>';
      previewDiv.style.display = 'none';

      var reader = new FileReader();
      reader.onload = function(e) {
        try {
          var data = new Uint8Array(e.target.result);
          var workbook = XLSX.read(data, { type: 'array' });

          // Parse ESPECIAS sheet
          var especiasList = [];
          var espSheet = workbook.Sheets['ESPECIAS'];
          if (espSheet) {
            var espData = XLSX.utils.sheet_to_json(espSheet, { header: 1 });
            for (var i = 1; i < espData.length; i++) {
              var row = espData[i];
              var nombre = (row[0] || '').toString().trim();
              if (!nombre || nombre.toLowerCase() === 'especia / ingrediente') continue;
              especiasList.push({ nombre: nombre, categoria: 'Comidas' });
            }
          }

          // Parse BLENDS sheet
          var blendsList = [];
          var blSheet = workbook.Sheets['BLENDS'];
          if (blSheet) {
            var blData = XLSX.utils.sheet_to_json(blSheet, { header: 1 });
            var currentBlend = null;
            for (var j = 1; j < blData.length; j++) {
              var row = blData[j];
              if (!row) continue;
              var firstCol = row[0] ? (row[0] || '').toString().trim() : '';
              var ingCol = row[3] ? (row[3] || '').toString().trim() : '';

              if (firstCol) {
                // New blend row — save previous if any
                if (currentBlend && currentBlend.ingredientes.length > 0) {
                  blendsList.push(currentBlend);
                }
                currentBlend = {
                  nombre: firstCol,
                  region: (row[1] || '').toString().trim(),
                  uso: (row[2] || '').toString().trim(),
                  ingredientes: []
                };
              }

              // This row has an ingredient (either on the blend header row or on subsequent rows)
              if (currentBlend && ingCol) {
                currentBlend.ingredientes.push({
                  especia: ingCol,
                  g: Number(row[4]) || 0,
                  pct: Number(row[5]) || 0
                });
              }
            }
            if (currentBlend && currentBlend.ingredientes.length > 0) {
              blendsList.push(currentBlend);
            }
          }

          if (especiasList.length === 0 && blendsList.length === 0) {
            statusDiv.innerHTML = '<p class="text-red">No se encontraron datos. Asegurate que el Excel tenga las hojas ESPECIAS y BLENDS.</p>';
            parseBtn.disabled = false;
            return;
          }

          // Check for existing
          var existEsp = 0;
          var existBl = 0;
          var allEspecias = ArcanoDB.getEspecias();
          var allBlends = ArcanoDB.getBlends();
          for (var i = 0; i < especiasList.length; i++) {
            if (ArcanoDB.findEspeciaByName(especiasList[i].nombre)) existEsp++;
          }
          for (var j = 0; j < blendsList.length; j++) {
            for (var k = 0; k < allBlends.length; k++) {
              if (allBlends[k].nombre.toLowerCase() === blendsList[j].nombre.toLowerCase()) { existBl++; break; }
            }
          }

          // Check unresolved ingredients (mirroring db.js findEspeciaByName logic)
          var unresolved = [];
          for (var j = 0; j < blendsList.length; j++) {
            for (var ii = 0; ii < blendsList[j].ingredientes.length; ii++) {
              var ingName = blendsList[j].ingredientes[ii].especia;
              var found = false;
              // Check existing especias in DB
              if (ArcanoDB.findEspeciaByName(ingName)) { found = true; }
              // Check in especiasList (to be created)
              if (!found) {
                var target = ingName.trim().toLowerCase();
                for (var ei = 0; ei < especiasList.length; ei++) {
                  var ename = especiasList[ei].nombre.trim().toLowerCase();
                  if (ename === target) { found = true; break; }
                  if (ename.indexOf(target) === 0 || target.indexOf(ename) === 0) { found = true; break; }
                  // Word overlap
                  var words = target.split(/[\s()\/,]+/).filter(function(w){return w.length>=4});
                  for (var wi = 0; wi < words.length; wi++) {
                    if (ename.indexOf(words[wi]) >= 0) { found = true; break; }
                  }
                  if (found) break;
                }
              }
              if (!found) unresolved.push(blendsList[j].nombre + ' -> ' + ingName);
            }
          }

          // Show preview
          var gramosChico = Number(document.getElementById('f-import-gc').value) || 30;
          var gramosGrande = Number(document.getElementById('f-import-gg').value) || 80;

          var phtml = '<div class="card"><div class="card-header"><h3>Vista Previa</h3></div><div class="card-body">';
          phtml += '<div class="stats-grid mb-12" style="grid-template-columns:repeat(4,1fr)">' +
            '<div class="stat-card"><div class="stat-value" style="color:var(--green)">' + especiasList.length + '</div><div class="stat-label">Especias en Excel</div></div>' +
            '<div class="stat-card"><div class="stat-value">' + blendsList.length + '</div><div class="stat-label">Blends en Excel</div></div>' +
            '<div class="stat-card"><div class="stat-value" style="font-size:1rem">' + gramosChico + 'g / ' + gramosGrande + 'g</div><div class="stat-label">Frasco Ch/Gr</div></div>' +
            '<div class="stat-card"><div class="stat-value" style="color:' + (unresolved.length > 0 ? 'var(--red)' : 'var(--green)') + '">' + unresolved.length + '</div><div class="stat-label">Ingredientes sin resolver</div></div>' +
          '</div>';

          if (existEsp > 0 || existBl > 0) {
            phtml += '<p class="text-sm text-muted mb-8">' +
              (existEsp > 0 ? '<span class="badge badge-yellow mr-8">' + existEsp + ' especias ya existen (se omiten)</span>' : '') +
              (existBl > 0 ? '<span class="badge badge-yellow mr-8">' + existBl + ' blends ya existen (se omiten)</span>' : '') +
            '</p>';
          }

          if (unresolved.length > 0) {
            phtml += '<div class="mb-8"><p class="text-red fw7 mb-4">Ingredientes que no se pudieron resolver:</p>' +
              '<div style="max-height:120px;overflow-y:auto;font-size:0.78rem;color:var(--red)">' +
              unresolved.map(function(u) { return '<div>' + u + '</div>'; }).join('') +
              '</div><p class="text-xs text-muted mt-4">Estos ingredientes no se vincularan a los blends.</p></div>';
          }

          // Sample blends
          phtml += '<p class="fw7 mt-8 mb-4">Ejemplos de blends a crear:</p>';
          var sampleBlends = blendsList.slice(0, 5);
          for (var s = 0; s < sampleBlends.length; s++) {
            var sb = sampleBlends[s];
            phtml += '<div class="list-row" style="flex-direction:column;align-items:flex-start;gap:2px">' +
              '<span class="fw7 text-gold">' + sb.nombre + '</span>' +
              '<span class="text-xs text-muted">' + (sb.region ? sb.region + ' | ' : '') + (sb.uso || '') + ' | ' + sb.ingredientes.length + ' ingredientes</span>' +
              '<span class="text-xs text-muted">' + sb.ingredientes.map(function(ing) {
                var gc = Math.round((ing.g / 500) * gramosChico * 100) / 100;
                return ing.especia + ' ' + ing.g + 'g → ' + gc + 'g/frasco';
              }).join(' + ') + '</span></div>';
          }
          if (blendsList.length > 5) phtml += '<p class="text-xs text-muted mt-4">... y ' + (blendsList.length - 5) + ' blends mas</p>';

          phtml += '</div></div>';
          previewDiv.innerHTML = phtml;
          previewDiv.style.display = 'block';

          // Replace footer with Confirm button
          footerDiv.innerHTML =
            '<button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Cancelar</button>' +
            '<button class="btn btn-gold" id="btn-do-import">Confirmar Importacion (' + (especiasList.length - existEsp) + ' esp + ' + (blendsList.length - existBl) + ' blends)</button>';

          document.getElementById('btn-do-import').addEventListener('click', function() {
            var gc = Number(document.getElementById('f-import-gc').value) || 30;
            var gg = Number(document.getElementById('f-import-gg').value) || 80;
            var btn = document.getElementById('btn-do-import');
            btn.disabled = true;
            btn.textContent = 'Importando...';

            try {
              var resultado = ArcanoDB.importFromExcelData(especiasList, blendsList, gc, gg);
              var rhtml = '<div class="card"><div class="card-body">' +
                '<p class="text-green fw7 mb-8">Importacion completada</p>' +
                '<div class="stats-grid" style="grid-template-columns:repeat(2,1fr)">' +
                  '<div class="stat-card"><div class="stat-value" style="color:var(--green)">' + resultado.especiasCreadas + '</div><div class="stat-label">Especias Creadas</div></div>' +
                  '<div class="stat-card"><div class="stat-value" style="color:var(--green)">' + resultado.blendsCreados + '</div><div class="stat-label">Blends Creados</div></div>' +
                  '<div class="stat-card"><div class="stat-value">' + resultado.especiasExistentes + '</div><div class="stat-label">Especias Ya Existentes</div></div>' +
                  '<div class="stat-card"><div class="stat-value">' + resultado.blendsExistentes + '</div><div class="stat-label">Blends Ya Existentes</div></div>' +
                '</div>';
              if (resultado.ingredientesNoResueltos.length > 0) {
                rhtml += '<p class="text-xs text-muted mt-8">Ingredientes no resueltos: ' + resultado.ingredientesNoResueltos.length + '</p>';
              }
              rhtml += '</div></div>';
              previewDiv.innerHTML = rhtml;

              // Close after 2s
              setTimeout(function() {
                modal.remove();
                App.renderPage('productos');
              }, 2000);
            } catch (err) {
              previewDiv.innerHTML += '<p class="text-red mt-8">Error: ' + err.message + '</p>';
              btn.disabled = false;
              btn.textContent = 'Reintentar';
            }
          });

        } catch (err) {
          statusDiv.innerHTML = '<p class="text-red">Error al leer el archivo: ' + err.message + '</p>';
          parseBtn.disabled = false;
        }
      };
      reader.onerror = function() {
        statusDiv.innerHTML = '<p class="text-red">Error al leer el archivo.</p>';
        parseBtn.disabled = false;
      };
      reader.readAsArrayBuffer(fileInput.files[0]);
    });
  },

  /* ================================================================
     USUARIOS
     ================================================================ */
  renderUsuarios(container) {
    var usuarios = ArcanoDB.getUsuarios();
    var h = '<div class="page-actions"><button class="btn btn-gold" onclick="Pages.formUsuario()">+ Nuevo Usuario</button></div>';
    h += '<div class="table-wrap mt-12"><table class="table"><thead><tr><th>Nombre</th><th>Rol</th><th>PIN</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>';
    for (var i = 0; i < usuarios.length; i++) {
      var u = usuarios[i];
      h += '<tr><td class="fw7">' + (u.nombre||'?') + '</td>' +
        '<td><span class="badge ' + (u.rol==='admin'?'badge-gold':'badge-blue') + '">' + (u.rol||'vendedor') + '</span></td>' +
        '<td>' + (u.id==='admin'?'****':u.pin) + '</td>' +
        '<td><span class="badge ' + (u.activo!==false?'badge-green':'badge-red') + '">' + (u.activo!==false?'Activo':'Inactivo') + '</span></td>' +
        '<td><button class="btn btn-sm btn-outline" onclick="Pages.formUsuario(\'' + u.id + '\')">Editar</button>' +
        (u.id!=='admin' ? ' <button class="btn btn-sm btn-red" onclick="Pages.delUsuario(\'' + u.id + '\')">X</button>' : '') + '</td></tr>';
    }
    h += '</tbody></table></div>';
    container.innerHTML = h;
  },

  formUsuario(editId) {
    var users = ArcanoDB.getUsuarios();
    var user = null;
    for (var i = 0; i < users.length; i++) { if (users[i].id === editId) { user = users[i]; break; } }
    var isAdmin = user && user.id === 'admin';

    var modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = '<div class="modal">' +
      '<div class="modal-header"><h3>' + (user?'Editar':'Nuevo') + ' Usuario</h3><button class="btn btn-ghost" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div>' +
      '<div class="modal-body">' +
        '<div class="form-group"><label>Nombre</label><input type="text" class="input" id="f-u-nombre" value="' + (user?user.nombre:'') + '"></div>' +
        '<div class="form-group"><label>Rol</label><select class="input" id="f-u-rol" ' + (isAdmin?'disabled':'') + '><option value="vendedor"' + (user&&user.rol==='vendedor'?' selected':'') + '>Vendedor</option><option value="admin"' + (user&&user.rol==='admin'?' selected':'') + '>Admin</option></select></div>' +
        '<div class="form-group"><label>PIN</label><input type="text" class="input" id="f-u-pin" value="' + (user?user.pin:'') + '" maxlength="10"></div>' +
        '<div class="form-group"><label>Estado</label><select class="input" id="f-u-activo" ' + (isAdmin?'disabled':'') + '><option value="true"' + (user&&user.activo!==false?' selected':'') + '>Activo</option><option value="false"' + (user&&user.activo===false?' selected':'') + '>Inactivo</option></select></div>' +
      '</div><div class="modal-footer">' +
        '<button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Cancelar</button>' +
        '<button class="btn btn-gold" id="btn-save-u">Guardar</button>' +
      '</div></div>';
    document.body.appendChild(modal);

    document.getElementById('btn-save-u').addEventListener('click', function() {
      var nombre = document.getElementById('f-u-nombre').value.trim();
      var pin = document.getElementById('f-u-pin').value.trim();
      if (!nombre || !pin) { alert('Nombre y PIN obligatorios'); return; }
      var id = editId || ('user_' + Date.now());
      ArcanoDB.saveUsuario({
        id: id, nombre: nombre, rol: document.getElementById('f-u-rol').value,
        pin: pin, activo: document.getElementById('f-u-activo').value === 'true', creado: new Date().toISOString()
      });
      modal.remove();
      App.renderPage('usuarios');
    });
  },

  delUsuario(id) {
    if (id === 'admin') return;
    if (!confirm('Eliminar usuario?')) return;
    ArcanoDB.deleteUsuario(id);
    App.renderPage('usuarios');
  },

  /* ================================================================
     TAG SELECTOR HELPER
     ================================================================ */
  buildTagSelectorHtml(cat, selectedTags) {
    var tags = ArcanoDB.getTagsForCategoria(cat);
    var sel = selectedTags || [];
    var h = '<div class="tag-selector" id="tag-selector">';
    if (tags.length === 0) {
      h += '<p class="text-sm text-muted">No hay etiquetas para esta categoria.</p>';
    } else {
      for (var i = 0; i < tags.length; i++) {
        var checked = sel.indexOf(tags[i]) >= 0 ? ' checked' : '';
        h += '<label class="tag-chip"><input type="checkbox" value="' + tags[i] + '"' + checked + '><span>' + tags[i] + '</span></label>';
      }
    }
    h += '</div>';
    return h;
  },

  getSelectedTags() {
    var cbs = document.querySelectorAll('#tag-selector input[type=checkbox]');
    var tags = [];
    for (var i = 0; i < cbs.length; i++) {
      if (cbs[i].checked) tags.push(cbs[i].value);
    }
    return tags;
  },

  refreshTagSelector(prefix) {
    var catEl = document.getElementById('f-' + prefix + '-cat');
    var areaEl = document.getElementById('tag-area-' + prefix);
    if (!catEl || !areaEl) return;
    areaEl.innerHTML = Pages.buildTagSelectorHtml(catEl.value, []);
  },

  doAddTag(cat, idx) {
    var inp = document.getElementById('new-tag-' + idx);
    if (!inp) return;
    var name = inp.value.trim();
    if (!name) return;
    if (ArcanoDB.addProductTag(cat, name)) {
      App.renderPage('productos');
    } else {
      alert('La etiqueta ya existe en esta categoria.');
    }
  },

  doRemoveTag(cat, tagName) {
    if (confirm('Eliminar etiqueta "' + tagName + '"? Se quitara de los productos que la tengan.')) {
      ArcanoDB.removeProductTag(cat, tagName);
      App.renderPage('productos');
    }
  },

  /* ================================================================
     IMAGE UPLOAD HELPERS
     ================================================================ */
  handleImageUpload(input, areaId) {
    var file = input.files && input.files[0];
    if (!file) return;
    ArcanoDB.compressImage(file, 400, 0.75, function(err, dataUrl) {
      if (err) { alert(err); return; }
      var area = document.getElementById(areaId);
      var placeholder = area.querySelector('.img-upload-placeholder');
      if (placeholder) placeholder.style.display = 'none';
      var existing = document.getElementById('img-preview-' + areaId.split('-').pop());
      if (existing) existing.remove();
      var removeBtn = area.querySelector('.btn-red');
      if (removeBtn) removeBtn.remove();
      var img = document.createElement('img');
      img.src = dataUrl;
      img.className = 'img-preview';
      img.id = 'img-preview-' + areaId.split('-').pop();
      area.insertBefore(img, placeholder);
      var rmBtn = document.createElement('button');
      rmBtn.className = 'btn btn-sm btn-red';
      rmBtn.style.marginTop = '6px';
      rmBtn.textContent = 'Quitar imagen';
      rmBtn.onclick = function() { Pages.removeImage(areaId, input.id); };
      area.insertBefore(rmBtn, placeholder);
    });
  },

  removeImage(areaId, inputId) {
    var area = document.getElementById(areaId);
    var preview = area.querySelector('.img-preview');
    if (preview) preview.remove();
    var btn = area.querySelector('.btn-red');
    if (btn) btn.remove();
    var placeholder = area.querySelector('.img-upload-placeholder');
    if (placeholder) placeholder.style.display = '';
    var inp = document.getElementById(inputId);
    if (inp) inp.value = '';
  }
};