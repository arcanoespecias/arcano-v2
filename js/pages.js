/* ===================== ARCANO V3 — PAGES ===================== */
const Pages = {

  /* ================================================================
     DASHBOARD
     ================================================================ */
  renderDashboard(container) {
    const s = ArcanoDB.getStats();
    const ultimas = ArcanoDB.getVentas().slice(0, 5);
    const ultimasProd = ArcanoDB.getProducciones().slice(0, 5);

    container.innerHTML = `
      <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr)">
        <div class="stat-card" style="border-left-color: var(--gold)">
          <div class="stat-value">$${s.totalVentasHoy.toLocaleString()}</div>
          <div class="stat-label">Ventas Hoy</div>
          <div class="stat-sub">${s.ventasHoy} operaciones</div>
        </div>
        <div class="stat-card" style="border-left-color: var(--green)">
          <div class="stat-value">${s.totalFrascos}</div>
          <div class="stat-label">Frascos Listos</div>
          <div class="stat-sub">${s.frascosChico} chico / ${s.frascosGrande} grande</div>
        </div>
        <div class="stat-card" style="border-left-color: var(--blue)">
          <div class="stat-value">$${s.totalVentasMes.toLocaleString()}</div>
          <div class="stat-label">Ventas del Mes</div>
          <div class="stat-sub">${s.ventasMes} operaciones</div>
        </div>
      </div>
      <div class="stats-grid mt-12" style="grid-template-columns: repeat(5, 1fr)">
        <div class="stat-card">
          <div class="stat-value" style="font-size:1.2rem">${s.totalEspecias}</div>
          <div class="stat-label">Especias</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="font-size:1.2rem">${s.totalBlends}</div>
          <div class="stat-label">Blends</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="font-size:1.2rem;color:var(--blue)">${s.envasesChico}</div>
          <div class="stat-label">Env. Chicos</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="font-size:1.2rem;color:var(--blue)">${s.envasesGrande}</div>
          <div class="stat-label">Env. Grandes</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="font-size:1.2rem;color:${s.especiasBolsaBaja.length > 0 ? 'var(--red)' : 'var(--green)'}">${s.especiasBolsaBaja.length}</div>
          <div class="stat-label">Bolsa Baja</div>
          <div class="stat-sub">${s.especiasBolsaBaja.map(e => e.nombre).join(', ') || 'OK'}</div>
        </div>
      </div>

      ${(s.etiquetasBajas.length > 0 || s.especiasBolsaBaja.length > 0) ? `
      <div class="card mt-16">
        <div class="card-header"><h3>Alertas</h3></div>
        <div class="card-body">
          ${s.especiasBolsaBaja.map(e => '<span class="badge badge-red mr-8">BOLSA: ' + e.nombre + ' ' + (e.stockBolsa||0) + 'grs</span>').join('')}
          ${s.etiquetasBajas.map(e => '<span class="badge badge-yellow mr-8">ETQ: ' + (e.nombre||'?') + ' (' + ((e.stockChico||0)+(e.stockGrande||0)) + ')</span>').join('')}
        </div>
      </div>` : ''}

      <div class="g2 mt-16" style="gap:16px">
        <div class="card">
          <div class="card-header"><h3>Ultimas Ventas</h3></div>
          <div class="card-body">
            ${ultimas.length === 0 ? '<p class="text-muted text-center text-sm">Sin ventas</p>' :
            '<div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Total</th><th>Items</th></tr></thead><tbody>' +
            ultimas.map(function(v) {
              return '<tr><td>' + (v.fecha||'') + '</td><td class="fw7 text-gold">$' + (v.total||0).toLocaleString() + '</td><td class="text-sm">' + (v.items||[]).map(function(i) { return (i.productoNombre||'?') + ' x' + (i.cantidad||0); }).join(', ') + '</td></tr>';
            }).join('') + '</tbody></table></div>'}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Ultimas Producciones</h3></div>
          <div class="card-body">
            ${ultimasProd.length === 0 ? '<p class="text-muted text-center text-sm">Sin producciones</p>' :
            '<div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Producto</th><th>Talla</th><th>Cant.</th></tr></thead><tbody>' +
            ultimasProd.map(function(p) {
              return '<tr><td>' + (p.fecha||'') + '</td><td class="fw7">' + (p.productoNombre||'') + '</td><td><span class="badge ' + ((p.talla||'chico') === 'grande' ? 'badge-gold' : 'badge-blue') + '">' + (p.talla||'chico') + '</span></td><td class="fw7 text-green">' + (p.cantidad||0) + '</td></tr>';
            }).join('') + '</tbody></table></div>'}
          </div>
        </div>
      </div>`;
  },

  /* ================================================================
     PRODUCTOS (Especias + Blends)
     ================================================================ */
  renderProductos(container) {
    const especias = ArcanoDB.getEspecias();
    const blends = ArcanoDB.getBlends();

    container.innerHTML = `
      <div class="page-actions">
        <button class="btn btn-gold" onclick="Pages.formEspecia()">+ Especia</button>
        <button class="btn btn-outline" onclick="Pages.formBlend()">+ Blend</button>
      </div>

      <div class="card mt-16">
        <div class="card-header"><h3>Especias</h3></div>
        <div class="card-body">
          ${especias.length === 0 ? '<p class="text-muted text-center">Sin especias. Crea la primera.</p>' :
          '<div class="table-wrap"><table class="table"><thead><tr><th>Nombre</th><th>Categoria</th><th>Bolsa (grs)</th><th>Grs/Chico</th><th>Grs/Grande</th><th>Precio Chico</th><th>Precio Grande</th><th>Fr. Chico</th><th>Fr. Grande</th><th>Acciones</th></tr></thead><tbody>' +
          especias.map(function(e) {
            return '<tr>' +
              '<td class="fw7">' + e.nombre + '</td>' +
              '<td><span class="badge badge-gold">' + (e.categoria||'—') + '</span></td>' +
              '<td>' + (e.stockBolsa||0) + ' grs</td>' +
              '<td>' + (e.gramosChico||0) + 'g</td>' +
              '<td>' + (e.gramosGrande||0) + 'g</td>' +
              '<td>$' + (e.precioChico||0).toLocaleString() + '</td>' +
              '<td>$' + (e.precioGrande||0).toLocaleString() + '</td>' +
              '<td><span class="' + ((e.stockChico||0) <= 3 ? 'text-red fw7' : 'text-green') + '">' + (e.stockChico||0) + '</span></td>' +
              '<td><span class="' + ((e.stockGrande||0) <= 3 ? 'text-red fw7' : 'text-green') + '">' + (e.stockGrande||0) + '</span></td>' +
              '<td><button class="btn btn-sm btn-outline mr-8" onclick="Pages.formEspecia(' + e.id + ')">Editar</button><button class="btn btn-sm btn-red" onclick="Pages.delEspecia(' + e.id + ')">X</button></td>' +
              '</tr>';
          }).join('') + '</tbody></table></div>'}
        </div>
      </div>

      <div class="card mt-16">
        <div class="card-header"><h3>Blends</h3></div>
        <div class="card-body">
          ${blends.length === 0 ? '<p class="text-muted text-center">Sin blends. Crea el primero.</p>' :
          '<div class="table-wrap"><table class="table"><thead><tr><th>Nombre</th><th>Categoria</th><th>Ingredientes</th><th>Precio Chico</th><th>Precio Grande</th><th>Fr. Chico</th><th>Fr. Grande</th><th>Acciones</th></tr></thead><tbody>' +
          blends.map(function(b) {
            var ingNames = (b.ingredientes || []).map(function(i) { return i.especiaNombre || '?'; }).join(', ');
            return '<tr>' +
              '<td class="fw7">' + b.nombre + '</td>' +
              '<td><span class="badge badge-blue">' + (b.categoria||'—') + '</span></td>' +
              '<td class="text-sm text-muted">' + ingNames + '</td>' +
              '<td>$' + (b.precioChico||0).toLocaleString() + '</td>' +
              '<td>$' + (b.precioGrande||0).toLocaleString() + '</td>' +
              '<td><span class="' + ((b.stockChico||0) <= 3 ? 'text-red fw7' : 'text-green') + '">' + (b.stockChico||0) + '</span></td>' +
              '<td><span class="' + ((b.stockGrande||0) <= 3 ? 'text-red fw7' : 'text-green') + '">' + (b.stockGrande||0) + '</span></td>' +
              '<td><button class="btn btn-sm btn-outline mr-8" onclick="Pages.formBlend(' + b.id + ')">Editar</button><button class="btn btn-sm btn-red" onclick="Pages.delBlend(' + b.id + ')">X</button></td>' +
              '</tr>';
          }).join('') + '</tbody></table></div>'}
        </div>
      </div>`;
  },

  /* ---------- Especia Form ---------- */
  formEspecia(id) {
    const esp = id ? ArcanoDB.getEspecia(id) : null;
    const isEdit = !!esp;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal modal-lg">
        <div class="modal-header"><h3>${isEdit ? 'Editar: ' + esp.nombre : 'Nueva Especia'}</h3><button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">X</button></div>
        <div class="modal-body">
          <div class="form-group"><label>Nombre</label><input type="text" class="input" id="f-esp-nombre" value="${isEdit ? esp.nombre : ''}" placeholder="Ej: Curcuma" ${isEdit ? 'readonly style="opacity:0.6"' : ''}></div>
          <div class="form-group"><label>Categoria</label><select class="input" id="f-esp-cat">
            <option value="Comidas" ${isEdit && esp.categoria==='Comidas' ? 'selected' : ''}>Comidas</option>
            <option value="Infusiones" ${isEdit && esp.categoria==='Infusiones' ? 'selected' : ''}>Infusiones</option>
            <option value="Cocteleria" ${isEdit && esp.categoria==='Cocteleria' ? 'selected' : ''}>Cocteleria</option>
          </select></div>
          <div class="g2">
            <div class="form-group"><label>Precio Frasco Chico ($)</label><input type="number" class="input" id="f-esp-precioChico" value="${isEdit ? esp.precioChico : ''}" placeholder="0" min="0"></div>
            <div class="form-group"><label>Precio Frasco Grande ($)</label><input type="number" class="input" id="f-esp-precioGrande" value="${isEdit ? esp.precioGrande : ''}" placeholder="0" min="0"></div>
          </div>
          <div class="g2">
            <div class="form-group"><label>Gramos por Frasco Chico</label><input type="number" class="input" id="f-esp-gramosChico" value="${isEdit ? esp.gramosChico : ''}" placeholder="Ej: 30" min="0"></div>
            <div class="form-group"><label>Gramos por Frasco Grande</label><input type="number" class="input" id="f-esp-gramosGrande" value="${isEdit ? esp.gramosGrande : ''}" placeholder="Ej: 80" min="0"></div>
          </div>
          ${isEdit ? '<p class="text-xs text-muted mt-8">Stock actual: ' + (esp.stockBolsa||0) + ' grs en bolsa, ' + (esp.stockChico||0) + ' frascos chico, ' + (esp.stockGrande||0) + ' frascos grande. Para editar stock usa Insumos o Produccion.</p>' : ''}
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
          <button class="btn btn-gold" onclick="Pages.doSaveEspecia(${id || 'null'})">Guardar</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    if (!isEdit) document.getElementById('f-esp-nombre').focus();
    else document.getElementById('f-esp-cat').focus();
  },

  doSaveEspecia(id) {
    var nombre = document.getElementById('f-esp-nombre').value.trim();
    if (!nombre) { alert('Ingresa un nombre'); return; }
    var data = {
      id: id || undefined,
      nombre: nombre,
      categoria: document.getElementById('f-esp-cat').value,
      precioChico: document.getElementById('f-esp-precioChico').value,
      precioGrande: document.getElementById('f-esp-precioGrande').value,
      gramosChico: document.getElementById('f-esp-gramosChico').value,
      gramosGrande: document.getElementById('f-esp-gramosGrande').value
    };
    try {
      ArcanoDB.saveEspecia(data);
      document.querySelector('.modal-overlay').remove();
      App.renderPage('productos');
    } catch (e) { alert('Error: ' + e.message); }
  },

  delEspecia(id) {
    var esp = ArcanoDB.getEspecia(id);
    if (!esp) return;
    if (!confirm('Eliminar "' + esp.nombre + '"?')) return;
    ArcanoDB.deleteEspecia(id);
    App.renderPage('productos');
  },

  /* ---------- Blend Form ---------- */
  formBlend(id) {
    var bl = id ? ArcanoDB.getBlend(id) : null;
    var isEdit = !!bl;
    var especias = ArcanoDB.getEspecias();
    var ings = isEdit ? (bl.ingredientes || []) : [{ especiaId: '', gramosChico: '', gramosGrande: '' }];

    var modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal modal-lg">
        <div class="modal-header"><h3>${isEdit ? 'Editar: ' + bl.nombre : 'Nuevo Blend'}</h3><button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">X</button></div>
        <div class="modal-body">
          <div class="form-group"><label>Nombre</label><input type="text" class="input" id="f-bl-nombre" value="${isEdit ? bl.nombre : ''}" placeholder="Ej: Curry Casero" ${isEdit ? 'readonly style="opacity:0.6"' : ''}></div>
          <div class="form-group"><label>Categoria</label><select class="input" id="f-bl-cat">
            <option value="Comidas" ${isEdit && bl.categoria==='Comidas' ? 'selected' : ''}>Comidas</option>
            <option value="Infusiones" ${isEdit && bl.categoria==='Infusiones' ? 'selected' : ''}>Infusiones</option>
            <option value="Cocteleria" ${isEdit && bl.categoria==='Cocteleria' ? 'selected' : ''}>Cocteleria</option>
          </select></div>
          <div class="g2">
            <div class="form-group"><label>Precio Frasco Chico ($)</label><input type="number" class="input" id="f-bl-precioChico" value="${isEdit ? bl.precioChico : ''}" placeholder="0" min="0"></div>
            <div class="form-group"><label>Precio Frasco Grande ($)</label><input type="number" class="input" id="f-bl-precioGrande" value="${isEdit ? bl.precioGrande : ''}" placeholder="0" min="0"></div>
          </div>
          <div class="form-group">
            <label>Ingredientes</label>
            <div id="blend-ingredients">${ings.map(function(ing, idx) { return Pages._blendIngRow(ing, especias, idx); }).join('')}</div>
            <button class="btn btn-sm btn-outline mt-8" onclick="Pages._addBlendIngRow()">+ Ingrediente</button>
          </div>
          ${isEdit ? '<p class="text-xs text-muted mt-8">Stock actual: ' + (bl.stockChico||0) + ' frascos chico, ' + (bl.stockGrande||0) + ' frascos grande.</p>' : ''}
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
          <button class="btn btn-gold" onclick="Pages.doSaveBlend(${id || 'null'})">Guardar</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    if (!isEdit) document.getElementById('f-bl-nombre').focus();
    else document.getElementById('f-bl-cat').focus();
  },

  _blendIngRow(ing, especias, idx) {
    var opts = especias.map(function(e) {
      return '<option value="' + e.id + '" ' + (Number(ing.especiaId) === Number(e.id) ? 'selected' : '') + '>' + e.nombre + '</option>';
    }).join('');
    return '<div class="g4 mb-8" data-ing-idx="' + idx + '">' +
      '<div class="form-group" style="margin:0"><label>Especia</label><select class="input blend-ing-esp">' +
      '<option value="">Seleccionar</option>' + opts + '</select></div>' +
      '<div class="form-group" style="margin:0"><label>Grs/Chico</label><input type="number" class="input blend-ing-gc" value="' + (ing.gramosChico || '') + '" placeholder="0" min="0"></div>' +
      '<div class="form-group" style="margin:0"><label>Grs/Grande</label><input type="number" class="input blend-ing-gg" value="' + (ing.gramosGrande || '') + '" placeholder="0" min="0"></div>' +
      '<div style="align-self:flex-end"><button class="btn btn-sm btn-red" onclick="this.closest(\'[data-ing-idx]\').remove()">X</button></div>' +
      '</div>';
  },

  _addBlendIngRow() {
    var especias = ArcanoDB.getEspecias();
    var container = document.getElementById('blend-ingredients');
    var idx = container.children.length;
    container.insertAdjacentHTML('beforeend', Pages._blendIngRow({}, especias, idx));
  },

  doSaveBlend(id) {
    var nombre = document.getElementById('f-bl-nombre').value.trim();
    if (!nombre) { alert('Ingresa un nombre'); return; }
    var rows = document.querySelectorAll('#blend-ingredients [data-ing-idx]');
    var ingredientes = [];
    var especias = ArcanoDB.getEspecias();
    for (var i = 0; i < rows.length; i++) {
      var espId = rows[i].querySelector('.blend-ing-esp').value;
      var gc = Number(rows[i].querySelector('.blend-ing-gc').value) || 0;
      var gg = Number(rows[i].querySelector('.blend-ing-gg').value) || 0;
      if (!espId) continue;
      var esp = especias.find(function(e) { return e.id == espId; });
      ingredientes.push({ especiaId: Number(espId), especiaNombre: esp ? esp.nombre : '', gramosChico: gc, gramosGrande: gg });
    }
    var data = {
      id: id || undefined, nombre: nombre,
      categoria: document.getElementById('f-bl-cat').value,
      precioChico: document.getElementById('f-bl-precioChico').value,
      precioGrande: document.getElementById('f-bl-precioGrande').value,
      ingredientes: ingredientes
    };
    try {
      ArcanoDB.saveBlend(data);
      document.querySelector('.modal-overlay').remove();
      App.renderPage('productos');
    } catch (e) { alert('Error: ' + e.message); }
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

    container.innerHTML = `
      <div class="page-actions">
        <button class="btn btn-gold" onclick="Pages.formEntrada()">+ Registrar Entrada</button>
      </div>

      <div class="stats-grid mt-12" style="grid-template-columns: repeat(3, 1fr)">
        <div class="stat-card" style="border-left-color:var(--blue)">
          <div class="stat-value" style="color:var(--blue)">${envases.chico || 0}</div>
          <div class="stat-label">Envases Chicos</div>
        </div>
        <div class="stat-card" style="border-left-color:var(--blue)">
          <div class="stat-value" style="color:var(--blue)">${envases.grande || 0}</div>
          <div class="stat-label">Envases Grandes</div>
        </div>
        <div class="stat-card" style="border-left-color:var(--gold)">
          <div class="stat-value">${especias.length}</div>
          <div class="stat-label">Especias en Bolsa</div>
        </div>
      </div>

      <div class="g2 mt-16" style="gap:16px">
        <div class="card">
          <div class="card-header"><h3>Especias en Bolsa (materia prima)</h3></div>
          <div class="card-body">
            ${especias.length === 0 ? '<p class="text-muted text-center text-sm">Sin especias</p>' :
            '<div class="table-wrap"><table class="table"><thead><tr><th>Especia</th><th>Categoria</th><th>Gramos</th></tr></thead><tbody>' +
            especias.map(function(e) {
              var cls = (e.stockBolsa||0) <= 50 ? 'text-red fw7' : (e.stockBolsa||0) <= 200 ? 'text-yellow fw7' : 'text-green';
              return '<tr><td class="fw7">' + e.nombre + '</td><td class="text-sm">' + (e.categoria||'') + '</td><td class="' + cls + '">' + (e.stockBolsa||0) + ' grs</td></tr>';
            }).join('') + '</tbody></table></div>'}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Etiquetas Disponibles</h3></div>
          <div class="card-body">
            ${etiqList.length === 0 ? '<p class="text-muted text-center text-sm">Sin productos</p>' :
            '<div class="table-wrap"><table class="table"><thead><tr><th>Producto</th><th>Tipo</th><th>Chico</th><th>Grande</th></tr></thead><tbody>' +
            etiqList.map(function(e) {
              return '<tr><td class="fw7">' + e.nombre + '</td><td><span class="badge ' + (e.tipo === 'blend' ? 'badge-blue' : 'badge-gold') + '">' + (e.tipo === 'blend' ? 'Blend' : 'Especia') + '</span></td>' +
                '<td class="' + (e.stockChico <= 5 ? 'text-red fw7' : '') + '">' + e.stockChico + '</td>' +
                '<td class="' + (e.stockGrande <= 5 ? 'text-red fw7' : '') + '">' + e.stockGrande + '</td></tr>';
            }).join('') + '</tbody></table></div>'}
          </div>
        </div>
      </div>

      <div class="card mt-16">
        <div class="card-header"><h3>Historial de Entradas</h3></div>
        <div class="card-body">
          ${entradas.length === 0 ? '<p class="text-muted text-center">Sin entradas registradas.</p>' :
          '<div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Items</th><th>Total</th><th>Acciones</th></tr></thead><tbody>' +
          entradas.slice(0, 30).map(function(en) {
            var desc = (en.items || []).map(function(it) {
              if (it.tipo === 'especia_grs') return (it.especiaNombre || '?') + ' ' + it.cantidad + 'grs';
              if (it.tipo === 'envase') return 'Envase ' + (it.talla||'chico') + ' x' + it.cantidad;
              if (it.tipo === 'etiqueta') return 'Etq ' + (it.etiquetaNombre||'?') + ' ' + (it.talla||'chico') + ' x' + it.cantidad;
              return '?';
            }).join(' | ');
            return '<tr><td>' + (en.fecha||'') + '</td><td class="text-sm">' + desc + '</td><td class="fw7 text-gold">$' + (en.total||0).toLocaleString() + '</td>' +
              '<td><button class="btn btn-sm btn-red" onclick="Pages.delEntrada(' + en.id + ')">X</button></td></tr>';
          }).join('') + '</tbody></table></div>'}
        </div>
      </div>`;
  },

  /* ---------- Entrada Form ---------- */
  formEntrada() {
    var especias = ArcanoDB.getEspecias();
    var modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal modal-lg">
        <div class="modal-header"><h3>Registrar Entrada de Insumos</h3><button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">X</button></div>
        <div class="modal-body">
          <div class="form-group"><label>Fecha</label><input type="date" class="input" id="f-ent-fecha" value="${new Date().toISOString().slice(0,10)}"></div>
          <div class="form-group"><label>Proveedor (opcional)</label><input type="text" class="input" id="f-ent-proveedor" placeholder="Nombre del proveedor"></div>
          <div class="form-group">
            <label>Items</label>
            <div id="entrada-items">${Pages._entradaItemRow(especias, 0)}</div>
            <button class="btn btn-sm btn-outline mt-8" onclick="Pages._addEntradaItemRow()">+ Item</button>
          </div>
          <div class="venta-total-box mt-12">Total: $<span id="entrada-total-preview">0</span></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
          <button class="btn btn-gold" onclick="Pages.doSaveEntrada()">Registrar Entrada</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  },

  _entradaItemRow(especias, idx) {
    if (!especias) especias = ArcanoDB.getEspecias();
    var espOpts = especias.map(function(e) {
      return '<option value="' + e.id + '">' + e.nombre + '</option>';
    }).join('');
    return '<div class="card mb-8" data-item-idx="' + idx + '" style="background:var(--bg)">' +
      '<div class="card-body" style="padding:12px">' +
      '<div class="g4 mb-8">' +
        '<div class="form-group" style="margin:0"><label>Tipo</label><select class="input ent-item-tipo" onchange="Pages._onEntradaTipoChange(this)">' +
          '<option value="especia_grs">Especia (grs)</option>' +
          '<option value="envase">Envases</option>' +
          '<option value="etiqueta">Etiquetas</option>' +
        '</select></div>' +
        '<div class="form-group" style="margin:0" id="ent-detail-' + idx + '"></div>' +
        '<div class="form-group" style="margin:0"><label>Cantidad</label><input type="number" class="input ent-item-cant" placeholder="0" min="0" oninput="Pages._updateEntradaTotal()"></div>' +
        '<div class="form-group" style="margin:0"><label>Costo Unit. ($)</label><input type="number" class="input ent-item-cost" placeholder="0" min="0" oninput="Pages._updateEntradaTotal()"></div>' +
      '</div>' +
      '<div style="text-align:right"><button class="btn btn-sm btn-red" onclick="this.closest(\'[data-item-idx]\').remove();Pages._updateEntradaTotal()">Quitar</button></div>' +
      '</div></div>';
  },

  _onEntradaTipoChange(sel) {
    var row = sel.closest('[data-item-idx]');
    var idx = row.dataset.itemIdx;
    var detailDiv = document.getElementById('ent-detail-' + idx);
    var tipo = sel.value;
    var especias = ArcanoDB.getEspecias();

    if (tipo === 'especia_grs') {
      var opts = especias.map(function(e) { return '<option value="' + e.id + '">' + e.nombre + '</option>'; }).join('');
      detailDiv.innerHTML = '<label>Especia</label><select class="input ent-item-especia">' + opts + '</select>';
    } else if (tipo === 'envase') {
      detailDiv.innerHTML = '<label>Talla</label><select class="input ent-item-talla"><option value="chico">Chico</option><option value="grande">Grande</option></select>';
    } else if (tipo === 'etiqueta') {
      detailDiv.innerHTML = '<label>Producto</label><input type="text" class="input ent-item-etq-nombre" placeholder="Nombre del producto"><label class="mt-8" style="display:block">Talla</label><select class="input ent-item-talla"><option value="chico">Chico</option><option value="grande">Grande</option></select>';
    }
  },

  _addEntradaItemRow() {
    var container = document.getElementById('entrada-items');
    var idx = container.children.length;
    var rowHtml = Pages._entradaItemRow(null, idx);
    container.insertAdjacentHTML('beforeend', rowHtml);
    // Trigger tipo change for new row
    var newSel = container.lastElementChild.querySelector('.ent-item-tipo');
    Pages._onEntradaTipoChange(newSel);
  },

  _updateEntradaTotal() {
    var rows = document.querySelectorAll('#entrada-items [data-item-idx]');
    var total = 0;
    rows.forEach(function(r) {
      var cant = Number(r.querySelector('.ent-item-cant').value) || 0;
      var cost = Number(r.querySelector('.ent-item-cost').value) || 0;
      total += cant * cost;
    });
    var el = document.getElementById('entrada-total-preview');
    if (el) el.textContent = total.toLocaleString();
  },

  doSaveEntrada() {
    var rows = document.querySelectorAll('#entrada-items [data-item-idx]');
    var items = [];
    var total = 0;
    var especias = ArcanoDB.getEspecias();

    for (var i = 0; i < rows.length; i++) {
      var tipo = rows[i].querySelector('.ent-item-tipo').value;
      var cant = Number(rows[i].querySelector('.ent-item-cant').value) || 0;
      var cost = Number(rows[i].querySelector('.ent-item-cost').value) || 0;
      if (cant <= 0) continue;

      var item = { tipo: tipo, cantidad: cant, costoUnitario: cost };
      total += cant * cost;

      if (tipo === 'especia_grs') {
        var sel = rows[i].querySelector('.ent-item-especia');
        if (!sel) { alert('Falta seleccionar especia en item ' + (i+1)); return; }
        item.especiaId = Number(sel.value);
        var esp = especias.find(function(e) { return e.id === item.especiaId; });
        item.especiaNombre = esp ? esp.nombre : '?';
      } else if (tipo === 'envase') {
        item.talla = rows[i].querySelector('.ent-item-talla').value;
      } else if (tipo === 'etiqueta') {
        item.etiquetaNombre = (rows[i].querySelector('.ent-item-etq-nombre').value || '').trim();
        if (!item.etiquetaNombre) { alert('Falta nombre de etiqueta en item ' + (i+1)); return; }
        item.talla = rows[i].querySelector('.ent-item-talla').value;
      }
      items.push(item);
    }
    if (items.length === 0) { alert('Agrega al menos un item'); return; }

    var data = {
      fecha: document.getElementById('f-ent-fecha').value,
      proveedor: document.getElementById('f-ent-proveedor').value.trim(),
      items: items, total: total
    };
    try {
      ArcanoDB.saveEntrada(data);
      document.querySelector('.modal-overlay').remove();
      App.renderPage('insumos');
    } catch (e) { alert('Error: ' + e.message); }
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
    container.innerHTML = `
      <div class="page-actions">
        <button class="btn btn-gold" onclick="Pages.formProduccion()">+ Nueva Produccion</button>
      </div>
      <div class="card mt-16">
        <div class="card-header"><h3>Historial de Producciones</h3></div>
        <div class="card-body">
          ${prods.length === 0 ? '<p class="text-muted text-center">Sin producciones. Produce tu primer frasco.</p>' :
          '<div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Tipo</th><th>Producto</th><th>Talla</th><th>Cant.</th><th>Gramos</th><th>Envases</th><th>Etiquetas</th></tr></thead><tbody>' +
          prods.slice(0, 30).map(function(p) {
            var ingDetail = p.tipo === 'blend' ?
              (p.ingredientes || []).map(function(i) { return i.especiaNombre + ' ' + i.gramosTotal + 'g'; }).join(', ') :
              (p.gramosTotal || 0) + 'g consumidos';
            return '<tr>' +
              '<td>' + (p.fecha||'') + '</td>' +
              '<td><span class="badge ' + (p.tipo === 'blend' ? 'badge-blue' : 'badge-gold') + '">' + (p.tipo === 'blend' ? 'Blend' : 'Especia') + '</span></td>' +
              '<td class="fw7">' + (p.productoNombre||'') + '</td>' +
              '<td><span class="badge ' + ((p.talla||'chico') === 'grande' ? 'badge-gold' : 'badge-blue') + '">' + (p.talla||'chico') + '</span></td>' +
              '<td class="fw7 text-green">' + (p.cantidad||0) + ' frascos</td>' +
              '<td class="text-sm">' + ingDetail + '</td>' +
              '<td>' + (p.envasesConsumidos||0) + '</td>' +
              '<td>' + (p.etiquetasConsumidas||0) + '</td>' +
              '</tr>';
          }).join('') + '</tbody></table></div>'}
        </div>
      </div>`;
  },

  formProduccion() {
    var especias = ArcanoDB.getEspecias();
    var blends = ArcanoDB.getBlends();
    var modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal modal-lg">
        <div class="modal-header"><h3>Nueva Produccion</h3><button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">X</button></div>
        <div class="modal-body">
          <div class="form-group"><label>Tipo</label><select class="input" id="f-prod-tipo" onchange="Pages._onProdTipoChange()">
            <option value="especia">Especia</option><option value="blend">Blend</option></select></div>
          <div class="form-group" id="f-prod-produto-wrap"><label>Producto</label><select class="input" id="f-prod-producto" onchange="Pages._onProdProductoChange()">
            <option value="">Seleccionar</option>${especias.map(function(e) { return '<option value="' + e.id + '" data-tipo="especia">' + e.nombre + '</option>'; }).join('')}</select></div>
          <div class="g2">
            <div class="form-group"><label>Talla</label><select class="input" id="f-prod-talla" onchange="Pages._onProdProductoChange()">
              <option value="chico">Chico</option><option value="grande">Grande</option></select></div>
            <div class="form-group"><label>Cantidad de frascos</label><input type="number" class="input" id="f-prod-cantidad" value="1" min="1" oninput="Pages._onProdProductoChange()"></div>
          </div>
          <div id="f-prod-preview" class="mt-12"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
          <button class="btn btn-gold" id="f-prod-btn" onclick="Pages.doProduccion()">Producir</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  },

  _onProdTipoChange() {
    var tipo = document.getElementById('f-prod-tipo').value;
    var list = tipo === 'blend' ? ArcanoDB.getBlends() : ArcanoDB.getEspecias();
    var sel = document.getElementById('f-prod-producto');
    sel.innerHTML = '<option value="">Seleccionar</option>' + list.map(function(p) {
      return '<option value="' + p.id + '">' + p.nombre + '</option>';
    }).join('');
    document.getElementById('f-prod-preview').innerHTML = '';
  },

  _onProdProductoChange() {
    var tipo = document.getElementById('f-prod-tipo').value;
    var prodId = Number(document.getElementById('f-prod-producto').value);
    var talla = document.getElementById('f-prod-talla').value;
    var cant = Number(document.getElementById('f-prod-cantidad').value) || 0;
    var preview = document.getElementById('f-prod-preview');
    var db = ArcanoDB.getDB();

    if (!prodId || cant <= 0) { preview.innerHTML = ''; return; }

    var producto = tipo === 'blend' ? ArcanoDB.getBlend(prodId) : ArcanoDB.getEspecia(prodId);
    if (!producto) { preview.innerHTML = ''; return; }

    var html = '<div class="card"><div class="card-header"><h3>Vista Previa</h3></div><div class="card-body">';
    html += '<p class="fw7 mb-8">Se consumira para producir ' + cant + ' frasco' + (cant > 1 ? 's' : '') + ' ' + talla + ' de ' + producto.nombre + ':</p>';

    if (tipo === 'especia') {
      var gramosPorFrasco = talla === 'grande' ? (producto.gramosGrande || 0) : (producto.gramosChico || 0);
      var grsTotal = gramosPorFrasco * cant;
      var bolsaOk = (producto.stockBolsa || 0) >= grsTotal;
      html += '<div class="list-row"><span>Especia en bolsa</span><span class="' + (bolsaOk ? 'text-green' : 'text-red fw7') + '">' + (producto.stockBolsa||0) + ' grs disponible → necesita ' + grsTotal + ' grs ' + (bolsaOk ? '✓' : '✗') + '</span></div>';
    } else {
      var ings = producto.ingredientes || [];
      for (var i = 0; i < ings.length; i++) {
        var esp = ArcanoDB.getEspecia(ings[i].especiaId);
        var gpf = talla === 'grande' ? (ings[i].gramosGrande || 0) : (ings[i].gramosChico || 0);
        var needed = gpf * cant;
        var avail = esp ? (esp.stockBolsa || 0) : 0;
        var ok = avail >= needed;
        html += '<div class="list-row"><span>' + (esp ? esp.nombre : '?') + ' (bolsa)</span><span class="' + (ok ? 'text-green' : 'text-red fw7') + '">' + avail + ' grs → necesita ' + needed + ' grs ' + (ok ? '✓' : '✗') + '</span></div>';
      }
    }

    var envases = db.stockEnvases || { chico: 0, grande: 0 };
    var envOk = (envases[talla] || 0) >= cant;
    html += '<div class="list-row"><span>Envases ' + talla + '</span><span class="' + (envOk ? 'text-green' : 'text-red fw7') + '">' + (envases[talla]||0) + ' → necesita ' + cant + ' ' + (envOk ? '✓' : '✗') + '</span></div>';

    // Find etiqueta
    var etq = null;
    var etqKeys = Object.keys(db.etiquetas || {});
    for (var j = 0; j < etqKeys.length; j++) {
      if (db.etiquetas[etqKeys[j]].nombre === producto.nombre) { etq = db.etiquetas[etqKeys[j]]; break; }
    }
    var etqAvail = etq ? (Number(etq[talla === 'grande' ? 'stockGrande' : 'stockChico']) || 0) : 0;
    var etqOk = etqAvail >= cant;
    html += '<div class="list-row"><span>Etiquetas ' + talla + '</span><span class="' + (etqOk ? 'text-green' : 'text-red fw7') + '">' + etqAvail + ' → necesita ' + cant + ' ' + (etqOk ? '✓' : '✗') + '</span></div>';

    html += '</div></div>';
    preview.innerHTML = html;

    // Enable/disable button
    var canProduce = tipo === 'especia' ?
      ((producto.stockBolsa||0) >= (talla === 'grande' ? producto.gramosGrande : producto.gramosChico) * cant && envOk && etqOk) :
      (envOk && etqOk);
    document.getElementById('f-prod-btn').disabled = !canProduce;
  },

  doProduccion() {
    var tipo = document.getElementById('f-prod-tipo').value;
    var prodId = Number(document.getElementById('f-prod-producto').value);
    var talla = document.getElementById('f-prod-talla').value;
    var cant = Number(document.getElementById('f-prod-cantidad').value) || 0;
    if (!prodId || cant <= 0) { alert('Completa todos los campos'); return; }
    try {
      if (tipo === 'blend') {
        ArcanoDB.producirBlend(prodId, talla, cant);
      } else {
        ArcanoDB.producirEspecia(prodId, talla, cant);
      }
      document.querySelector('.modal-overlay').remove();
      App.renderPage('produccion');
    } catch (e) { alert('Error: ' + e.message); }
  },

  /* ================================================================
     VENTAS
     ================================================================ */
  renderVentas(container) {
    var ventas = ArcanoDB.getVentas();
    container.innerHTML = `
      <div class="page-actions">
        <button class="btn btn-gold" onclick="Pages.formVenta()">+ Nueva Venta</button>
      </div>
      <div class="card mt-16">
        <div class="card-header"><h3>Historial de Ventas</h3></div>
        <div class="card-body">
          ${ventas.length === 0 ? '<p class="text-muted text-center">Sin ventas.</p>' :
          '<div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Items</th><th>Total</th><th>Acciones</th></tr></thead><tbody>' +
          ventas.slice(0, 30).map(function(v) {
            var desc = (v.items || []).map(function(it) {
              return (it.productoNombre||'?') + ' ' + (it.talla||'chico') + ' x' + (it.cantidad||0) + ' ($' + (it.subtotal||0).toLocaleString() + ')';
            }).join(' | ');
            return '<tr><td>' + (v.fecha||'') + '</td><td class="text-sm">' + desc + '</td><td class="fw7 text-gold">$' + (v.total||0).toLocaleString() + '</td>' +
              '<td><button class="btn btn-sm btn-red" onclick="Pages.delVenta(' + v.id + ')">X</button></td></tr>';
          }).join('') + '</tbody></table></div>'}
        </div>
      </div>`;
  },

  formVenta() {
    var frascos = ArcanoDB.getFrascosParaVender();
    var modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal modal-lg">
        <div class="modal-header"><h3>Nueva Venta</h3><button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">X</button></div>
        <div class="modal-body">
          <div class="form-group"><label>Fecha</label><input type="date" class="input" id="f-venta-fecha" value="${new Date().toISOString().slice(0,10)}"></div>
          <div class="form-group">
            <label>Items</label>
            <div id="venta-items">${Pages._ventaItemRow(frascos, 0)}</div>
            <button class="btn btn-sm btn-outline mt-8" onclick="Pages._addVentaItemRow()">+ Item</button>
          </div>
          <div class="venta-total-box mt-12">Total: $<span id="venta-total-preview">0</span></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
          <button class="btn btn-gold" onclick="Pages.doSaveVenta()">Vender</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  },

  _ventaItemRow(frascos, idx) {
    if (!frascos) frascos = ArcanoDB.getFrascosParaVender();
    var opts = frascos.map(function(f) {
      return '<option value="' + f.tipo + '|' + f.id + '|' + f.talla + '" data-precio="' + f.precio + '" data-stock="' + f.stock + '">' +
        f.nombre + ' (' + f.talla + ') - $' + f.precio.toLocaleString() + ' [stock: ' + f.stock + ']</option>';
    }).join('');
    return '<div class="g4 mb-8" data-vitem-idx="' + idx + '">' +
      '<div class="form-group" style="margin:0"><label>Producto</label><select class="input vitem-producto" onchange="Pages._onVentaProductoChange(this)">' +
      '<option value="">Seleccionar</option>' + opts + '</select></div>' +
      '<div class="form-group" style="margin:0"><label>Cantidad</label><input type="number" class="input vitem-cant" value="1" min="1" max="999" oninput="Pages._updateVentaTotal()"></div>' +
      '<div class="form-group" style="margin:0"><label>Precio Unit.</label><input type="number" class="input vitem-precio" value="" placeholder="0" oninput="Pages._updateVentaTotal()"></div>' +
      '<div style="align-self:flex-end"><button class="btn btn-sm btn-red" onclick="this.closest(\'[data-vitem-idx]\').remove();Pages._updateVentaTotal()">X</button></div>' +
      '</div>';
  },

  _onVentaProductoChange(sel) {
    var opt = sel.options[sel.selectedIndex];
    var precio = Number(opt.dataset.precio) || 0;
    var stock = Number(opt.dataset.stock) || 0;
    var row = sel.closest('[data-vitem-idx]');
    row.querySelector('.vitem-precio').value = precio;
    var cantInput = row.querySelector('.vitem-cant');
    cantInput.max = stock;
    if (Number(cantInput.value) > stock) cantInput.value = stock;
    Pages._updateVentaTotal();
  },

  _addVentaItemRow() {
    var container = document.getElementById('venta-items');
    var idx = container.children.length;
    container.insertAdjacentHTML('beforeend', Pages._ventaItemRow(null, idx));
  },

  _updateVentaTotal() {
    var rows = document.querySelectorAll('#venta-items [data-vitem-idx]');
    var total = 0;
    rows.forEach(function(r) {
      var cant = Number(r.querySelector('.vitem-cant').value) || 0;
      var precio = Number(r.querySelector('.vitem-precio').value) || 0;
      total += cant * precio;
    });
    var el = document.getElementById('venta-total-preview');
    if (el) el.textContent = total.toLocaleString();
  },

  doSaveVenta() {
    var rows = document.querySelectorAll('#venta-items [data-vitem-idx]');
    var items = [];
    for (var i = 0; i < rows.length; i++) {
      var val = rows[i].querySelector('.vitem-producto').value;
      if (!val) continue;
      var parts = val.split('|');
      var cant = Number(rows[i].querySelector('.vitem-cant').value) || 0;
      var precio = Number(rows[i].querySelector('.vitem-precio').value) || 0;
      if (cant <= 0) continue;
      items.push({
        tipo: parts[0], productoId: Number(parts[1]), talla: parts[2],
        cantidad: cant, precioUnitario: precio
      });
    }
    if (items.length === 0) { alert('Agrega al menos un item'); return; }
    var data = {
      fecha: document.getElementById('f-venta-fecha').value,
      items: items
    };
    try {
      ArcanoDB.saveVenta(data);
      document.querySelector('.modal-overlay').remove();
      App.renderPage('ventas');
    } catch (e) { alert('Error: ' + e.message); }
  },

  delVenta(id) {
    if (!confirm('Eliminar esta venta?')) return;
    ArcanoDB.deleteVenta(id);
    App.renderPage('ventas');
  },

  /* ================================================================
     STOCK (vista unificada)
     ================================================================ */
  renderStock(container) {
    var db = ArcanoDB.getDB();
    var especias = ArcanoDB.getEspecias();
    var blends = ArcanoDB.getBlends();
    var envases = db.stockEnvases || { chico: 0, grande: 0 };
    var etiqList = ArcanoDB.getProductosConEtiquetas();

    container.innerHTML = `
      <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr)">
        <div class="stat-card" style="border-left-color:var(--blue)">
          <div class="stat-value" style="color:var(--blue)">${envases.chico || 0}</div>
          <div class="stat-label">Envases Chicos Vacios</div>
        </div>
        <div class="stat-card" style="border-left-color:var(--blue)">
          <div class="stat-value" style="color:var(--blue)">${envases.grande || 0}</div>
          <div class="stat-label">Envases Grandes Vacios</div>
        </div>
        <div class="stat-card" style="border-left-color:var(--gold)">
          <div class="stat-value">${especias.reduce(function(s,e){return s+(e.stockChico||0);},0) + blends.reduce(function(s,b){return s+(b.stockChico||0);},0)}</div>
          <div class="stat-label">Total Frascos Chico</div>
        </div>
      </div>

      <div class="card mt-16">
        <div class="card-header"><h3>Especias</h3></div>
        <div class="card-body">
          ${especias.length === 0 ? '<p class="text-muted text-center">Sin especias</p>' :
          '<div class="table-wrap"><table class="table"><thead><tr><th>Nombre</th><th>Bolsa (grs)</th><th>Frascos Chico</th><th>Frascos Grande</th><th>Etq. Chico</th><th>Etq. Grande</th></tr></thead><tbody>' +
          especias.map(function(e) {
            var etq = etiqList.find(function(x) { return x.nombre === e.nombre; });
            return '<tr>' +
              '<td class="fw7">' + e.nombre + '</td>' +
              '<td class="' + ((e.stockBolsa||0)<=50?'text-red fw7':'') + '">' + (e.stockBolsa||0) + '</td>' +
              '<td class="' + ((e.stockChico||0)<=3?'text-red fw7':'text-green') + '">' + (e.stockChico||0) + '</td>' +
              '<td class="' + ((e.stockGrande||0)<=3?'text-red fw7':'text-green') + '">' + (e.stockGrande||0) + '</td>' +
              '<td>' + (etq ? etq.stockChico : 0) + '</td>' +
              '<td>' + (etq ? etq.stockGrande : 0) + '</td>' +
              '</tr>';
          }).join('') + '</tbody></table></div>'}
        </div>
      </div>

      <div class="card mt-16">
        <div class="card-header"><h3>Blends</h3></div>
        <div class="card-body">
          ${blends.length === 0 ? '<p class="text-muted text-center">Sin blends</p>' :
          '<div class="table-wrap"><table class="table"><thead><tr><th>Nombre</th><th>Frascos Chico</th><th>Frascos Grande</th><th>Etq. Chico</th><th>Etq. Grande</th></tr></thead><tbody>' +
          blends.map(function(b) {
            var etq = etiqList.find(function(x) { return x.nombre === b.nombre; });
            return '<tr>' +
              '<td class="fw7">' + b.nombre + '</td>' +
              '<td class="' + ((b.stockChico||0)<=3?'text-red fw7':'text-green') + '">' + (b.stockChico||0) + '</td>' +
              '<td class="' + ((b.stockGrande||0)<=3?'text-red fw7':'text-green') + '">' + (b.stockGrande||0) + '</td>' +
              '<td>' + (etq ? etq.stockChico : 0) + '</td>' +
              '<td>' + (etq ? etq.stockGrande : 0) + '</td>' +
              '</tr>';
          }).join('') + '</tbody></table></div>'}
        </div>
      </div>`;
  },

  /* ================================================================
     USUARIOS
     ================================================================ */
  renderUsuarios(container) {
    var usuarios = ArcanoDB.getUsuarios();
    container.innerHTML = `
      <div class="page-actions"><button class="btn btn-gold" onclick="Pages.formUsuario()">+ Nuevo Usuario</button></div>
      <div class="table-wrap mt-12">
        <table class="table"><thead><tr><th>Nombre</th><th>Rol</th><th>PIN</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>${usuarios.map(function(u) {
            return '<tr><td class="fw7">' + (u.nombre||'?') + '</td>' +
              '<td><span class="badge ' + (u.rol==='admin'?'badge-gold':'badge-blue') + '">' + (u.rol||'vendedor') + '</span></td>' +
              '<td>' + (u.id==='admin' ? '****' : u.pin) + '</td>' +
              '<td><span class="badge ' + (u.activo!==false?'badge-green':'badge-red') + '">' + (u.activo!==false?'Activo':'Inactivo') + '</span></td>' +
              '<td><button class="btn btn-sm btn-outline" onclick="Pages.formUsuario(\'' + u.id + '\')">Editar</button>' +
              (u.id!=='admin' ? ' <button class="btn btn-sm btn-red" onclick="Pages.delUsuario(\'' + u.id + '\')">X</button>' : '') +
              '</td></tr>';
          }).join('')}</tbody>
        </table>
      </div>`;
  },

  formUsuario(id) {
    var user = id ? (function() { var u = ArcanoDB.getUsuarios().find(function(x){return x.id===id;}); return u || null; })() : null;
    var isAdmin = user && user.id === 'admin';
    var modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header"><h3>${user ? 'Editar' : 'Nuevo'} Usuario</h3><button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">X</button></div>
        <div class="modal-body">
          <div class="form-group"><label>Nombre</label><input type="text" class="input" id="f-user-nombre" value="${user ? user.nombre : ''}" placeholder="Nombre"></div>
          <div class="form-group"><label>Rol</label><select class="input" id="f-user-rol" ${isAdmin?'disabled':''}>
            <option value="vendedor" ${user && user.rol==='vendedor'?'selected':''}>Vendedor</option>
            <option value="admin" ${user && user.rol==='admin'?'selected':''}>Admin</option></select></div>
          <div class="form-group"><label>PIN</label><input type="text" class="input" id="f-user-pin" value="${user ? user.pin : ''}" placeholder="PIN" maxlength="10"></div>
          <div class="form-group"><label>Estado</label><select class="input" id="f-user-activo" ${isAdmin?'disabled':''}>
            <option value="true" ${user && user.activo!==false?'selected':''}>Activo</option>
            <option value="false" ${user && user.activo===false?'selected':''}>Inactivo</option></select></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
          <button class="btn btn-gold" onclick="Pages.doSaveUsuario('${id || ''}')">Guardar</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  },

  doSaveUsuario(origId) {
    var nombre = document.getElementById('f-user-nombre').value.trim();
    var pin = document.getElementById('f-user-pin').value.trim();
    if (!nombre || !pin) { alert('Nombre y PIN son obligatorios'); return; }
    var id = origId || ('user_' + Date.now());
    var data = {
      id: id, nombre: nombre,
      rol: document.getElementById('f-user-rol').value,
      pin: pin, activo: document.getElementById('f-user-activo').value === 'true',
      creado: new Date().toISOString()
    };
    ArcanoDB.saveUsuario(data);
    document.querySelector('.modal-overlay').remove();
    App.renderPage('usuarios');
  },

  delUsuario(id) {
    if (id === 'admin') return;
    if (!confirm('Eliminar usuario?')) return;
    ArcanoDB.deleteUsuario(id);
    App.renderPage('usuarios');
  }
};