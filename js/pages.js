/* ===================== ARCANO V2.1 — PAGES =====================
   Stock dual: Bolsa (grs materia prima) + Frascos (producto terminado)
   ===================== */
const Pages = {

  /* ================================================================
     DASHBOARD
     ================================================================ */
  renderDashboard(container) {
    const stats = ArcanoDB.getStats();
    const ultimasVentas = ArcanoDB.getVentas().slice(0, 5);

    container.innerHTML = `
      <div class="stats-grid" style="grid-template-columns: repeat(5, 1fr)">
        <div class="stat-card">
          <div class="stat-value">${stats.totalVentasHoy}</div>
          <div class="stat-label">Ventas Hoy</div>
          <div class="stat-sub">$${stats.totalVentasHoy.toLocaleString()}</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.totalVentasMes.toLocaleString()}</div>
          <div class="stat-label">Ventas del Mes</div>
          <div class="stat-sub">${stats.ventasMes} ops</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.totalFrascos}</div>
          <div class="stat-label">Frascos Listos</div>
          <div class="stat-sub">Para vender</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.totalEspecias}</div>
          <div class="stat-label">Especias</div>
          <div class="stat-sub">${stats.especiasBajoStockBolsa.length} con bolsa baja</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.totalBlends}</div>
          <div class="stat-label">Blends</div>
          <div class="stat-sub">${stats.blendsBajoStockFrascos.length} con pocos frascos</div>
        </div>
      </div>

      <div class="g2 mt-16">
        <div class="card">
          <div class="card-header"><h3>Compras del Mes</h3></div>
          <div class="card-body">
            <div class="big-number">$${stats.totalComprasMes.toLocaleString()}</div>
            <div class="text-muted text-sm mt-8">${stats.totalCompras} compras totales</div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Ultimas Ventas</h3></div>
          <div class="card-body">
            ${ultimasVentas.length === 0 ? '<p class="text-muted">Sin ventas</p>' :
              ultimasVentas.map(v => `<div class="list-row"><span>${v.fecha || '—'}</span><span class="fw7">$${(Number(v.total) || 0).toLocaleString()}</span></div>`).join('')}
          </div>
        </div>
      </div>

      ${(stats.especiasBajoStockBolsa.length > 0 || stats.especiasBajoStockFrascos.length > 0 || stats.blendsBajoStockFrascos.length > 0 || stats.etiquetasBajoStock.length > 0) ? `
      <div class="card mt-16">
        <div class="card-header"><h3>Alertas</h3></div>
        <div class="card-body">
          ${stats.especiasBajoStockBolsa.map(e => '<span class="badge badge-yellow mr-8">BOLSA ' + (e.nombre || '?') + ': ' + (e.stockBolsa || 0) + 'grs</span>').join('')}
          ${stats.especiasBajoStockFrascos.map(e => '<span class="badge badge-red mr-8">FRASCOS ' + (e.nombre || '?') + ': ' + (e.stockFrascos || 0) + '</span>').join('')}
          ${stats.blendsBajoStockFrascos.map(b => '<span class="badge badge-red mr-8">FRASCOS ' + (b.nombre || '?') + ': ' + (b.stockFrascos || 0) + '</span>').join('')}
          ${stats.etiquetasBajoStock.map(e => '<span class="badge badge-blue mr-8">ETQ ' + (e.nombre || '?') + ': ' + (e.stock || 0) + '</span>').join('')}
        </div>
      </div>` : ''}`;
  },

  /* ================================================================
     ESPECIAS
     ================================================================ */
  renderEspecias(container) {
    const especias = ArcanoDB.getEspecias();
    container.innerHTML = `
      <div class="page-actions">
        <button class="btn btn-gold" onclick="Pages.formEspecia()">+ Nueva Especia</button>
        <input type="text" class="input" placeholder="Buscar especia..." id="esp-search" oninput="Pages.filterEspecias()">
      </div>
      <div class="table-wrap mt-12">
        <table class="table">
          <thead>
            <tr><th>Nombre</th><th>Categoria</th><th>Bolsa (grs)</th><th>Frascos</th><th>$ Chico</th><th>$ Grande</th><th>Acciones</th></tr>
          </thead>
          <tbody id="esp-tbody">
            ${this._especiasRows(especias)}
          </tbody>
        </table>
        ${especias.length === 0 ? '<p class="text-muted mt-16 text-center">No hay especias. Agrega la primera.</p>' : ''}
      </div>`;
  },

  _especiasRows(list) {
    return list.map(e => `
      <tr>
        <td class="fw7">${e.nombre || '?'}</td>
        <td><span class="badge badge-gold">${e.categoria || '—'}</span></td>
        <td><span class="${(e.stockBolsa || 0) <= 50 ? 'text-red fw7' : ''}">${e.stockBolsa || 0} grs</span></td>
        <td><span class="${(e.stockFrascos || 0) <= 3 ? 'text-red fw7' : 'text-green'}">${e.stockFrascos || 0}</span></td>
        <td>$${(e.precioChico || 0).toLocaleString()}</td>
        <td>$${(e.precioGrande || 0).toLocaleString()}</td>
        <td>
          <button class="btn btn-sm btn-green" onclick="Pages.formProducirEspecia('${e.id}')" title="Producir frascos">Producir</button>
          <button class="btn btn-sm btn-outline" onclick="Pages.formEspecia('${e.id}')">Editar</button>
          <button class="btn btn-sm btn-red" onclick="Pages.deleteEspecia('${e.id}')">X</button>
        </td>
      </tr>`).join('');
  },

  filterEspecias() {
    const q = (document.getElementById('esp-search').value || '').toLowerCase();
    const all = ArcanoDB.getEspecias();
    const filtered = q ? all.filter(e => (e.nombre || '').toLowerCase().includes(q) || (e.categoria || '').toLowerCase().includes(q)) : all;
    document.getElementById('esp-tbody').innerHTML = this._especiasRows(filtered);
  },

  formEspecia(id) {
    const esp = id ? ArcanoDB.getEspecia(id) : null;
    const title = esp ? 'Editar Especia' : 'Nueva Especia';
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header"><h3>${title}</h3><button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">X</button></div>
        <div class="modal-body">
          <div class="form-group">
            <label>Nombre</label>
            <input type="text" class="input" id="f-esp-nombre" value="${esp ? esp.nombre : ''}" placeholder="Ej: Canela">
          </div>
          <div class="form-group">
            <label>Categoria</label>
            <select class="input" id="f-esp-cat">
              <option value="Comidas" ${esp && esp.categoria === 'Comidas' ? 'selected' : ''}>Comidas</option>
              <option value="Infusiones" ${esp && esp.categoria === 'Infusiones' ? 'selected' : ''}>Infusiones</option>
              <option value="Cocteleria" ${esp && esp.categoria === 'Cocteleria' ? 'selected' : ''}>Cocteleria</option>
            </select>
          </div>
          <div class="g2">
            <div class="form-group">
              <label>Precio Frasco Chico ($)</label>
              <input type="number" class="input" id="f-esp-pchico" value="${esp ? esp.precioChico : ''}" placeholder="0" min="0" step="100">
            </div>
            <div class="form-group">
              <label>Precio Frasco Grande ($)</label>
              <input type="number" class="input" id="f-esp-pgrande" value="${esp ? esp.precioGrande : ''}" placeholder="0" min="0" step="100">
            </div>
          </div>
          <p class="text-muted text-xs mt-8">El stock se gestiona via Compras (bolsa en grs) y Produccion (frascos).</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
          <button class="btn btn-gold" onclick="Pages.saveEspecia('${id || ''}')">Guardar</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    setTimeout(() => document.getElementById('f-esp-nombre').focus(), 100);
  },

  saveEspecia(id) {
    const nombre = document.getElementById('f-esp-nombre').value.trim();
    if (!nombre) { alert('Nombre requerido'); return; }
    const data = {
      nombre,
      categoria: document.getElementById('f-esp-cat').value,
      precioChico: Number(document.getElementById('f-esp-pchico').value) || 0,
      precioGrande: Number(document.getElementById('f-esp-pgrande').value) || 0
    };
    if (id) data.id = id;
    try {
      ArcanoDB.saveEspecia(data);
      document.querySelector('.modal-overlay').remove();
      App.renderPage('especias');
    } catch (e) { alert('Error: ' + e.message); }
  },

  deleteEspecia(id) {
    const esp = ArcanoDB.getEspecia(id);
    if (!esp) return;
    if (!confirm('Eliminar "' + (esp.nombre || '') + '"?')) return;
    ArcanoDB.deleteEspecia(id);
    App.renderPage('especias');
  },

  /* ================================================================
     PRODUCIR ESPECIA (bolsa → frascos)
     ================================================================ */
  formProducirEspecia(especiaId) {
    const esp = ArcanoDB.getEspecia(especiaId);
    if (!esp) return;
    const etqList = ArcanoDB.getEtiquetasStock();
    const etq = etqList.find(function(e) { return e.nombre === esp.nombre; });
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header"><h3>Producir Frascos: ${esp.nombre}</h3><button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">X</button></div>
        <div class="modal-body">
          <p class="text-muted text-sm">Convierte gramos de bolsa en frascos listos para vender.</p>
          <div class="list-row mt-12"><span>Bolsa disponible</span><span class="fw7 text-gold">${esp.stockBolsa || 0} grs</span></div>
          <div class="list-row"><span>Etiqueta "${esp.nombre}"</span><span class="${(etq && etq.stock > 0) ? 'text-green' : 'text-red'}">${etq ? etq.stock : 0} uds</span></div>
          <div class="g2 mt-12">
            <div class="form-group">
              <label>Grs por frasco</label>
              <input type="number" class="input" id="f-pe-grs" value="50" min="1" oninput="Pages._calcEspeciaProduccion('${especiaId}')">
            </div>
            <div class="form-group">
              <label>Cantidad de frascos</label>
              <input type="number" class="input" id="f-pe-cant" value="1" min="1" oninput="Pages._calcEspeciaProduccion('${especiaId}')">
            </div>
          </div>
          <div id="f-pe-info" class="mt-8"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
          <button class="btn btn-gold" onclick="Pages.doProducirEspecia('${especiaId}')">Producir</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    setTimeout(() => this._calcEspeciaProduccion(especiaId), 50);
  },

  _calcEspeciaProduccion(especiaId) {
    const esp = ArcanoDB.getEspecia(especiaId);
    if (!esp) return;
    const grs = Number(document.getElementById('f-pe-grs').value) || 0;
    const cant = Number(document.getElementById('f-pe-cant').value) || 0;
    const total = grs * cant;
    const disponible = esp.stockBolsa || 0;
    const ok = total > 0 && total <= disponible;
    document.getElementById('f-pe-info').innerHTML =
      '<p class="text-sm ' + (ok ? 'text-green' : 'text-red') + ' fw7">' +
      (ok ? 'OK: Se consumen ' + total + 'grs de bolsa' : total > disponible ? 'FALTAN ' + (total - disponible) + 'grs' : 'Ingresa cantidades') +
      '</p>';
  },

  doProducirEspecia(especiaId) {
    const grs = Number(document.getElementById('f-pe-grs').value) || 0;
    const cant = Number(document.getElementById('f-pe-cant').value) || 0;
    if (grs <= 0 || cant <= 0) { alert('Ingresa gramos por frasco y cantidad'); return; }
    try {
      const result = ArcanoDB.producirEspeciaFrascos(especiaId, grs, cant);
      alert('Producidos ' + cant + ' frascos de "' + result.especia.nombre + '"\\nConsumidos: ' + (grs * cant) + 'grs de bolsa');
      document.querySelector('.modal-overlay').remove();
      App.renderPage('especias');
    } catch (e) { alert(e.message); }
  },

  /* ================================================================
     BLENDS
     ================================================================ */
  renderBlends(container) {
    const blends = ArcanoDB.getBlends();
    container.innerHTML = `
      <div class="page-actions">
        <button class="btn btn-gold" onclick="Pages.formBlend()">+ Nuevo Blend</button>
      </div>
      <div class="table-wrap mt-12">
        <table class="table">
          <thead>
            <tr><th>Nombre</th><th>Categoria</th><th>Ingredientes (grs/frasco)</th><th>Frascos</th><th>$ Chico</th><th>$ Grande</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            ${blends.map(b => `
              <tr>
                <td class="fw7">${b.nombre || '?'}</td>
                <td><span class="badge badge-blue">${b.categoria || '—'}</span></td>
                <td class="text-sm">${(b.ingredientes || []).map(i => {
                  const esp = ArcanoDB.getEspecia(i.especiaId);
                  return (esp ? esp.nombre : '?') + ' ' + (i.cantidad || 0) + 'grs';
                }).join(', ')}</td>
                <td><span class="${(b.stockFrascos || 0) <= 3 ? 'text-red fw7' : 'text-green'}">${b.stockFrascos || 0}</span></td>
                <td>$${(b.precioChico || 0).toLocaleString()}</td>
                <td>$${(b.precioGrande || 0).toLocaleString()}</td>
                <td>
                  <button class="btn btn-sm btn-green" onclick="Pages.formProducirBlend('${b.id}')">Producir</button>
                  <button class="btn btn-sm btn-outline" onclick="Pages.formBlend('${b.id}')">Editar</button>
                  <button class="btn btn-sm btn-red" onclick="Pages.deleteBlend('${b.id}')">X</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
        ${blends.length === 0 ? '<p class="text-muted mt-16 text-center">No hay blends.</p>' : ''}
      </div>`;
  },

  formBlend(id) {
    const blend = id ? ArcanoDB.getBlend(id) : null;
    const especias = ArcanoDB.getEspecias();
    const title = blend ? 'Editar Blend' : 'Nuevo Blend';
    const ings = blend ? blend.ingredientes || [] : [{especiaId: '', cantidad: ''}];
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal modal-lg">
        <div class="modal-header"><h3>${title}</h3><button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">X</button></div>
        <div class="modal-body">
          <div class="form-group">
            <label>Nombre del Blend</label>
            <input type="text" class="input" id="f-bl-nombre" value="${blend ? blend.nombre : ''}" placeholder="Ej: Curry Especial">
          </div>
          <div class="form-group">
            <label>Categoria</label>
            <select class="input" id="f-bl-cat">
              <option value="Comidas" ${blend && blend.categoria === 'Comidas' ? 'selected' : ''}>Comidas</option>
              <option value="Infusiones" ${blend && blend.categoria === 'Infusiones' ? 'selected' : ''}>Infusiones</option>
              <option value="Cocteleria" ${blend && blend.categoria === 'Cocteleria' ? 'selected' : ''}>Cocteleria</option>
            </select>
          </div>
          <div class="g2">
            <div class="form-group">
              <label>Precio Frasco Chico ($)</label>
              <input type="number" class="input" id="f-bl-pchico" value="${blend ? blend.precioChico : ''}" placeholder="0" min="0" step="100">
            </div>
            <div class="form-group">
              <label>Precio Frasco Grande ($)</label>
              <input type="number" class="input" id="f-bl-pgrande" value="${blend ? blend.precioGrande : ''}" placeholder="0" min="0" step="100">
            </div>
          </div>
          <div class="form-group">
            <label>Ingredientes (grs por frasco de blend)</label>
            <div id="f-bl-ingredientes">
              ${ings.map((ing, i) => this._ingredienteRow(i, ing, especias)).join('')}
            </div>
            <button class="btn btn-sm btn-outline mt-8" onclick="Pages.addIngredienteRow()">+ Ingrediente</button>
          </div>
          <p class="text-muted text-xs mt-8">La cantidad indica los GRAMOS de cada especia por cada frasco de blend producido.</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
          <button class="btn btn-gold" onclick="Pages.saveBlend('${id || ''}')">Guardar</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    setTimeout(() => document.getElementById('f-bl-nombre').focus(), 100);
  },

  _ingredienteRow(idx, ing, especias) {
    return `<div class="g3 ing-row" data-idx="${idx}">
      <select class="input" data-field="especiaId">
        <option value="">Especia...</option>
        ${especias.map(e => '<option value="' + e.id + '" ' + (ing.especiaId === e.id ? 'selected' : '') + '>' + e.nombre + ' (' + (e.stockBolsa || 0) + 'grs)</option>').join('')}
      </select>
      <input type="number" class="input" data-field="cantidad" value="${ing.cantidad || ''}" placeholder="Grs" min="0">
      <button class="btn btn-sm btn-red" onclick="this.closest('.ing-row').remove()">X</button>
    </div>`;
  },

  addIngredienteRow() {
    const especias = ArcanoDB.getEspecias();
    const container = document.getElementById('f-bl-ingredientes');
    const idx = container.children.length;
    container.insertAdjacentHTML('beforeend', this._ingredienteRow(idx, {}, especias));
  },

  saveBlend(id) {
    const nombre = document.getElementById('f-bl-nombre').value.trim();
    if (!nombre) { alert('Nombre requerido'); return; }
    const rows = document.querySelectorAll('#f-bl-ingredientes .ing-row');
    const ingredientes = [];
    rows.forEach(row => {
      const espId = row.querySelector('[data-field="especiaId"]').value;
      const cant = Number(row.querySelector('[data-field="cantidad"]').value) || 0;
      if (espId && cant > 0) ingredientes.push({ especiaId: espId, cantidad: cant });
    });
    if (ingredientes.length === 0) { alert('Agrega al menos un ingrediente'); return; }
    const data = { nombre, categoria: document.getElementById('f-bl-cat').value, precioChico: Number(document.getElementById('f-bl-pchico').value) || 0, precioGrande: Number(document.getElementById('f-bl-pgrande').value) || 0, ingredientes };
    if (id) data.id = id;
    try {
      ArcanoDB.saveBlend(data);
      document.querySelector('.modal-overlay').remove();
      App.renderPage('blends');
    } catch (e) { alert('Error: ' + e.message); }
  },

  formProducirBlend(blendId) {
    const blend = ArcanoDB.getBlend(blendId);
    if (!blend) return;
    const etqList = ArcanoDB.getEtiquetasStock();
    const etq = etqList.find(function(e) { return e.nombre === blend.nombre; });
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal modal-lg">
        <div class="modal-header"><h3>Producir: ${blend.nombre}</h3><button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">X</button></div>
        <div class="modal-body">
          <div class="list-row"><span>Etiqueta "${blend.nombre}"</span><span class="${(etq && etq.stock > 0) ? 'text-green' : 'text-red'}">${etq ? etq.stock : 0} uds</span></div>
          <div class="form-group mt-12">
            <label>Cantidad de frascos a producir</label>
            <input type="number" class="input" id="f-prod-cant" value="1" min="1" oninput="Pages._calcBlendProduccion('${blendId}')">
          </div>
          <div id="f-prod-calc" class="mt-8"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
          <button class="btn btn-gold" onclick="Pages.doProducirBlend('${blendId}')">Producir</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    setTimeout(() => this._calcBlendProduccion(blendId), 50);
  },

  _calcBlendProduccion(blendId) {
    const blend = ArcanoDB.getBlend(blendId);
    if (!blend) return;
    const cant = Number(document.getElementById('f-prod-cant').value) || 0;
    const calcDiv = document.getElementById('f-prod-calc');
    if (cant <= 0) { calcDiv.innerHTML = ''; return; }
    const ings = blend.ingredientes || [];
    let html = '<div class="card"><div class="card-body"><table class="table"><thead><tr><th>Especia</th><th>Grs/frasco</th><th>Total grs</th><th>Bolsa</th><th>Estado</th></tr></thead><tbody>';
    let ok = true;
    for (const ing of ings) {
      const esp = ArcanoDB.getEspecia(ing.especiaId);
      if (!esp) continue;
      const total = (ing.cantidad || 0) * cant;
      const disponible = esp.stockBolsa || 0;
      const itemOk = disponible >= total;
      if (!itemOk) ok = false;
      html += '<tr><td class="fw7">' + esp.nombre + '</td><td>' + (ing.cantidad || 0) + 'grs</td><td class="fw7">' + total + 'grs</td><td>' + disponible + 'grs</td><td>' +
        (itemOk ? '<span class="badge badge-green">OK</span>' : '<span class="badge badge-red">Faltan ' + (total - disponible) + 'grs</span>') + '</td></tr>';
    }
    html += '</tbody></table></div></div>';
    // Etiqueta check
    const etqList = ArcanoDB.getEtiquetasStock();
    const etq = etqList.find(function(e) { return e.nombre === blend.nombre; });
    if (etq && etq.stock < cant) { ok = false; html += '<p class="text-red mt-8 fw7">Faltan ' + (cant - etq.stock) + ' etiquetas de "' + blend.nombre + '"</p>'; }
    else if (!etq) { ok = false; html += '<p class="text-red mt-8 fw7">No hay etiquetas "' + blend.nombre + '". Compralas en Compras.</p>'; }
    if (ok) html += '<p class="text-green mt-8 fw7">Todo disponible. Se produciran ' + cant + ' frascos.</p>';
    calcDiv.innerHTML = html;
  },

  doProducirBlend(blendId) {
    const cant = Number(document.getElementById('f-prod-cant').value) || 0;
    if (cant <= 0) { alert('Cantidad debe ser mayor a 0'); return; }
    try {
      ArcanoDB.producirBlend(blendId, cant);
      const blend = ArcanoDB.getBlend(blendId);
      alert('Producidos ' + cant + ' frascos de "' + (blend ? blend.nombre : 'Blend') + '"');
      document.querySelector('.modal-overlay').remove();
      App.renderPage('blends');
    } catch (e) { alert(e.message); }
  },

  deleteBlend(id) {
    const blend = ArcanoDB.getBlend(id);
    if (!blend) return;
    if (!confirm('Eliminar "' + (blend.nombre || '') + '"?')) return;
    ArcanoDB.deleteBlend(id);
    App.renderPage('blends');
  },

  /* ================================================================
     COMPRAS (Especias en grs + Etiquetas)
     ================================================================ */
  renderCompras(container) {
    const compras = ArcanoDB.getCompras();
    container.innerHTML = `
      <div class="page-actions">
        <button class="btn btn-gold" onclick="Pages.formCompra()">+ Nueva Compra</button>
      </div>
      <div class="table-wrap mt-12">
        <table class="table">
          <thead><tr><th>Fecha</th><th>Proveedor</th><th>Items</th><th>Total</th><th>Acciones</th></tr></thead>
          <tbody>
            ${compras.map(c => `
              <tr>
                <td>${c.fecha || '—'}</td>
                <td>${c.proveedor || '—'}</td>
                <td class="text-sm">${(c.items || []).map(i => {
                  if (i.tipo === 'etiqueta') return '<span class="badge badge-blue">ETQ</span> ' + (i.etiquetaNombre || '?') + ' x' + (i.cantidad || 0);
                  const esp = ArcanoDB.getEspecia(i.especiaId);
                  return (esp ? esp.nombre : '?') + ' ' + (i.cantidad || 0) + 'grs';
                }).join(', ') || '—'}</td>
                <td class="fw7">$${(Number(c.total) || 0).toLocaleString()}</td>
                <td>
                  <button class="btn btn-sm btn-outline" onclick="Pages.formCompra('${c.id}')">Ver</button>
                  <button class="btn btn-sm btn-red" onclick="Pages.deleteCompra('${c.id}')">X</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
        ${compras.length === 0 ? '<p class="text-muted mt-16 text-center">Sin compras.</p>' : ''}
      </div>`;
  },

  formCompra(id) {
    const compra = id ? ArcanoDB.getCompras().find(c => c.id === id) : null;
    const especias = ArcanoDB.getEspecias();
    const readonly = !!id;
    const allItems = compra ? compra.items || [] : [];
    const espItems = allItems.filter(i => i.tipo !== 'etiqueta');
    const etqItems = allItems.filter(i => i.tipo === 'etiqueta');
    if (espItems.length === 0 && !readonly) espItems.push({tipo:'especia', especiaId:'', cantidad:'', costoUnitario:''});
    if (etqItems.length === 0 && !readonly) etqItems.push({tipo:'etiqueta', etiquetaNombre:'', cantidad:'', costoUnitario:''});
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal modal-lg">
        <div class="modal-header"><h3>${id ? 'Detalle Compra' : 'Nueva Compra'}</h3><button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">X</button></div>
        <div class="modal-body">
          <div class="g2">
            <div class="form-group"><label>Fecha</label><input type="date" class="input" id="f-comp-fecha" value="${compra ? compra.fecha : new Date().toISOString().slice(0, 10)}" ${readonly ? 'disabled' : ''}></div>
            <div class="form-group"><label>Proveedor</label><input type="text" class="input" id="f-comp-prov" value="${compra ? compra.proveedor : ''}" placeholder="Nombre del proveedor" ${readonly ? 'disabled' : ''}></div>
          </div>
          <div class="form-group mt-12">
            <label>Especias (comprar en gramos para la bolsa)</label>
            <div id="f-comp-esp-items">${espItems.map((item, i) => this._compraEspRow(i, item, especias, readonly)).join('')}</div>
            ${!readonly ? '<button class="btn btn-sm btn-outline mt-8" onclick="Pages._addCompraEspRow()">+ Especia</button>' : ''}
          </div>
          <div class="form-group mt-12">
            <label>Etiquetas fisicas</label>
            <p class="text-muted text-xs">Nombre igual al producto. Ej: "Berbere", "Oregano".</p>
            <div id="f-comp-etq-items">${etqItems.map((item, i) => this._compraEtqRow(i, item, readonly)).join('')}</div>
            ${!readonly ? '<button class="btn btn-sm btn-outline mt-8" onclick="Pages._addCompraEtqRow()">+ Etiqueta</button>' : ''}
          </div>
          <div class="mt-12"><b>Total: $<span id="f-comp-total">${(Number(compra ? compra.total : 0) || 0).toLocaleString()}</span></b></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cerrar</button>
          ${!readonly ? '<button class="btn btn-gold" onclick="Pages.saveCompra()">Guardar</button>' : ''}
        </div>
      </div>`;
    document.body.appendChild(modal);
    if (!readonly) {
      modal.addEventListener('input', function(e) {
        if (e.target.closest('#f-comp-esp-items') || e.target.closest('#f-comp-etq-items')) Pages._calcCompraTotal();
      });
    }
  },

  _compraEspRow(idx, item, especias, readonly) {
    return '<div class="g4 comp-item-row" data-tipo="especia">' +
      '<select class="input" data-field="especiaId" ' + (readonly ? 'disabled' : '') + '>' +
        '<option value="">Especia...</option>' +
        especias.map(function(e) { return '<option value="' + e.id + '" ' + (item.especiaId === e.id ? 'selected' : '') + '>' + e.nombre + '</option>'; }).join('') +
      '</select>' +
      '<input type="number" class="input" data-field="cantidad" value="' + (item.cantidad || '') + '" placeholder="Grs" min="0" ' + (readonly ? 'disabled' : '') + '>' +
      '<input type="number" class="input" data-field="costoUnitario" value="' + (item.costoUnitario || '') + '" placeholder="$ / grs" min="0" step="10" ' + (readonly ? 'disabled' : '') + '>' +
      '<span class="item-subtotal">$' + ((Number(item.cantidad) || 0) * (Number(item.costoUnitario) || 0)).toLocaleString() + '</span>' +
      (!readonly ? '<button class="btn btn-sm btn-red" onclick="this.closest(\'.comp-item-row\').remove();Pages._calcCompraTotal()">X</button>' : '') +
    '</div>';
  },

  _compraEtqRow(idx, item, readonly) {
    return '<div class="g4 comp-item-row" data-tipo="etiqueta">' +
      '<input type="text" class="input" data-field="etiquetaNombre" value="' + (item.etiquetaNombre || '') + '" placeholder="Nombre etiqueta" ' + (readonly ? 'disabled' : '') + '>' +
      '<input type="number" class="input" data-field="cantidad" value="' + (item.cantidad || '') + '" placeholder="Uds" min="0" ' + (readonly ? 'disabled' : '') + '>' +
      '<input type="number" class="input" data-field="costoUnitario" value="' + (item.costoUnitario || '') + '" placeholder="$ / ud" min="0" step="100" ' + (readonly ? 'disabled' : '') + '>' +
      '<span class="item-subtotal">$' + ((Number(item.cantidad) || 0) * (Number(item.costoUnitario) || 0)).toLocaleString() + '</span>' +
      (!readonly ? '<button class="btn btn-sm btn-red" onclick="this.closest(\'.comp-item-row\').remove();Pages._calcCompraTotal()">X</button>' : '') +
    '</div>';
  },

  _addCompraEspRow() {
    var especias = ArcanoDB.getEspecias();
    document.getElementById('f-comp-esp-items').insertAdjacentHTML('beforeend', this._compraEspRow(0, {}, especias, false));
  },
  _addCompraEtqRow() {
    document.getElementById('f-comp-etq-items').insertAdjacentHTML('beforeend', this._compraEtqRow(0, {}, false));
  },

  _calcCompraTotal() {
    var total = 0;
    document.querySelectorAll('.comp-item-row').forEach(function(row) {
      var cant = Number(row.querySelector('[data-field="cantidad"]').value) || 0;
      var cost = Number(row.querySelector('[data-field="costoUnitario"]').value) || 0;
      row.querySelector('.item-subtotal').textContent = '$' + (cant * cost).toLocaleString();
      total += cant * cost;
    });
    document.getElementById('f-comp-total').textContent = total.toLocaleString();
  },

  saveCompra() {
    var fecha = document.getElementById('f-comp-fecha').value;
    var proveedor = document.getElementById('f-comp-prov').value.trim();
    var items = [], total = 0;
    document.querySelectorAll('#f-comp-esp-items .comp-item-row').forEach(function(row) {
      var espId = row.querySelector('[data-field="especiaId"]').value;
      var cant = Number(row.querySelector('[data-field="cantidad"]').value) || 0;
      var cost = Number(row.querySelector('[data-field="costoUnitario"]').value) || 0;
      if (espId && cant > 0) { items.push({ tipo: 'especia', especiaId: espId, cantidad: cant, costoUnitario: cost }); total += cant * cost; }
    });
    document.querySelectorAll('#f-comp-etq-items .comp-item-row').forEach(function(row) {
      var nombre = row.querySelector('[data-field="etiquetaNombre"]').value.trim();
      var cant = Number(row.querySelector('[data-field="cantidad"]').value) || 0;
      var cost = Number(row.querySelector('[data-field="costoUnitario"]').value) || 0;
      if (nombre && cant > 0) { items.push({ tipo: 'etiqueta', etiquetaNombre: nombre, cantidad: cant, costoUnitario: cost }); total += cant * cost; }
    });
    if (items.length === 0) { alert('Agrega al menos un item'); return; }
    try {
      ArcanoDB.saveCompra({ fecha, proveedor, items, total });
      document.querySelector('.modal-overlay').remove();
      App.renderPage('compras');
    } catch (e) { alert('Error: ' + e.message); }
  },

  deleteCompra(id) {
    if (!confirm('Eliminar esta compra?')) return;
    ArcanoDB.deleteCompra(id);
    App.renderPage('compras');
  },

  /* ================================================================
     VENTAS (solo frascos)
     ================================================================ */
  renderVentas(container) {
    const ventas = ArcanoDB.getVentas();
    container.innerHTML = `
      <div class="page-actions">
        <button class="btn btn-gold" onclick="Pages.formVenta()">+ Nueva Venta</button>
      </div>
      <div class="table-wrap mt-12">
        <table class="table">
          <thead><tr><th>Fecha</th><th>Vendedor</th><th>Items</th><th>Total</th><th>Acciones</th></tr></thead>
          <tbody>
            ${ventas.map(v => {
              const vendedor = ArcanoDB.getUsuario(v.vendedorId);
              return '<tr><td>' + (v.fecha || '—') + '</td><td>' + (vendedor ? vendedor.nombre : '—') + '</td>' +
                '<td class="text-sm">' + (v.items || []).map(i => {
                  return (i.productoNombre || '?') + ' (' + (i.tamano || '') + ') x' + (i.cantidad || 0);
                }).join(', ') + '</td>' +
                '<td class="fw7">$' + (Number(v.total) || 0).toLocaleString() + '</td>' +
                '<td><button class="btn btn-sm btn-outline" onclick="Pages.formVenta(\'' + v.id + '\')">Ver</button>' +
                '<button class="btn btn-sm btn-red" onclick="Pages.deleteVenta(\'' + v.id + '\')">X</button></td></tr>';
            }).join('')}
          </tbody>
        </table>
        ${ventas.length === 0 ? '<p class="text-muted mt-16 text-center">Sin ventas.</p>' : ''}
      </div>`;
  },

  formVenta(id) {
    const venta = id ? ArcanoDB.getVentas().find(v => v.id === id) : null;
    const frascos = ArcanoDB.getFrascosParaVender();
    const usuarios = ArcanoDB.getUsuarios().filter(u => u.id !== 'admin');
    const items = venta ? venta.items || [] : [{tipo: 'especia', productoId: '', cantidad: '', tamano: 'chico'}];
    const readonly = !!id;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal modal-lg">
        <div class="modal-header"><h3>${id ? 'Detalle Venta' : 'Nueva Venta'}</h3><button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">X</button></div>
        <div class="modal-body">
          <div class="g2">
            <div class="form-group"><label>Fecha</label><input type="date" class="input" id="f-venta-fecha" value="${venta ? venta.fecha : new Date().toISOString().slice(0, 10)}" ${readonly ? 'disabled' : ''}></div>
            <div class="form-group"><label>Vendedor</label><select class="input" id="f-venta-vendedor" ${readonly ? 'disabled' : ''}>
              ${usuarios.map(u => '<option value="' + u.id + '" ' + (venta && venta.vendedorId === u.id ? 'selected' : '') + '>' + u.nombre + '</option>').join('')}
              ${usuarios.length === 0 ? '<option value="admin">Admin</option>' : ''}
            </select></div>
          </div>
          <div class="form-group mt-8"><label>Frascos a vender</label>
            <div id="f-venta-items">${items.map((item, i) => this._ventaItemRow(i, item, frascos, readonly)).join('')}</div>
            ${!readonly ? '<button class="btn btn-sm btn-outline mt-8" onclick="Pages.addVentaItemRow()">+ Item</button>' : ''}
          </div>
          <div class="mt-12"><b>Total: $<span id="f-venta-total">${(Number(venta ? venta.total : 0) || 0).toLocaleString()}</span></b></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cerrar</button>
          ${!readonly ? '<button class="btn btn-gold" onclick="Pages.saveVenta()">Registrar Venta</button>' : ''}
        </div>
      </div>`;
    document.body.appendChild(modal);
    if (!readonly) {
      modal.addEventListener('input', (e) => { if (e.target.closest('#f-venta-items')) this._calcVentaTotal(); });
      modal.addEventListener('change', (e) => { if (e.target.closest('#f-venta-items')) this._calcVentaTotal(); });
    }
  },

  _ventaItemRow(idx, item, frascos, readonly) {
    var tipo = item.tipo || 'especia';
    var filtered = frascos.filter(f => f.tipo === tipo);
    return '<div class="venta-item-row g4" data-idx="' + idx + '">' +
      '<select class="input" data-field="tipo" ' + (readonly ? 'disabled' : '') + ' onchange="Pages._updateVentaProductos(this)">' +
        '<option value="especia" ' + (tipo === 'especia' ? 'selected' : '') + '>Especia</option>' +
        '<option value="blend" ' + (tipo === 'blend' ? 'selected' : '') + '>Blend</option>' +
      '</select>' +
      '<select class="input" data-field="productoId" ' + (readonly ? 'disabled' : '') + '>' +
        '<option value="">Seleccionar...</option>' +
        filtered.map(f => '<option value="' + f.id + '" ' + (item.productoId === f.id ? 'selected' : '') + '>' + f.nombre + ' (' + f.stockFrascos + ' frascos)</option>').join('') +
      '</select>' +
      '<select class="input" data-field="tamano" ' + (readonly ? 'disabled' : '') + ' onchange="Pages._calcVentaTotal()">' +
        '<option value="chico" ' + (item.tamano === 'chico' ? 'selected' : '') + '>Chico</option>' +
        '<option value="grande" ' + (item.tamano === 'grande' ? 'selected' : '') + '>Grande</option>' +
      '</select>' +
      '<input type="number" class="input" data-field="cantidad" value="' + (item.cantidad || '') + '" placeholder="Cant." min="1" ' + (readonly ? 'disabled' : '') + ' oninput="Pages._calcVentaTotal()">' +
      (!readonly ? '<button class="btn btn-sm btn-red" onclick="this.closest(\'.venta-item-row\').remove();Pages._calcVentaTotal()">X</button>' : '') +
    '</div>';
  },

  _updateVentaProductos(tipoSelect) {
    var row = tipoSelect.closest('.venta-item-row');
    var tipo = tipoSelect.value;
    var prodSelect = row.querySelector('[data-field="productoId"]');
    var frascos = ArcanoDB.getFrascosParaVender().filter(f => f.tipo === tipo);
    prodSelect.innerHTML = '<option value="">Seleccionar...</option>' +
      frascos.map(f => '<option value="' + f.id + '">' + f.nombre + ' (' + f.stockFrascos + ' frascos)</option>').join('');
    this._calcVentaTotal();
  },

  addVentaItemRow() {
    var frascos = ArcanoDB.getFrascosParaVender();
    var container = document.getElementById('f-venta-items');
    container.insertAdjacentHTML('beforeend', this._ventaItemRow(container.children.length, {}, frascos, false));
  },

  _calcVentaTotal() {
    let total = 0;
    document.querySelectorAll('#f-venta-items .venta-item-row').forEach(row => {
      var tipo = row.querySelector('[data-field="tipo"]').value;
      var prodId = row.querySelector('[data-field="productoId"]').value;
      var tamano = row.querySelector('[data-field="tamano"]').value;
      var cant = Number(row.querySelector('[data-field="cantidad"]').value) || 0;
      var frascos = ArcanoDB.getFrascosParaVender();
      var prod = frascos.find(f => f.id === prodId);
      var precio = prod ? (tamano === 'grande' ? prod.precioGrande : prod.precioChico) : 0;
      total += precio * cant;
    });
    document.getElementById('f-venta-total').textContent = total.toLocaleString();
  },

  saveVenta() {
    const fecha = document.getElementById('f-venta-fecha').value;
    const vendedorId = document.getElementById('f-venta-vendedor').value;
    const rows = document.querySelectorAll('#f-venta-items .venta-item-row');
    const items = [];
    let total = 0;
    rows.forEach(row => {
      const tipo = row.querySelector('[data-field="tipo"]').value;
      const prodId = row.querySelector('[data-field="productoId"]').value;
      const tamano = row.querySelector('[data-field="tamano"]').value;
      const cant = Number(row.querySelector('[data-field="cantidad"]').value) || 0;
      if (prodId && cant > 0) {
        const frascos = ArcanoDB.getFrascosParaVender();
        const prod = frascos.find(f => f.id === prodId);
        const precio = prod ? (tamano === 'grande' ? prod.precioGrande : prod.precioChico) : 0;
        items.push({ tipo, productoId: prodId, tamano, cantidad: cant, precioUnitario: precio });
        total += precio * cant;
      }
    });
    if (items.length === 0) { alert('Agrega al menos un item'); return; }
    try {
      ArcanoDB.saveVenta({ fecha, vendedorId, items, total });
      document.querySelector('.modal-overlay').remove();
      App.renderPage('ventas');
    } catch (e) { alert(e.message); }
  },

  deleteVenta(id) {
    if (!confirm('Eliminar esta venta?')) return;
    ArcanoDB.deleteVenta(id);
    App.renderPage('ventas');
  },

  /* ================================================================
     STOCK (Bolsa + Frascos)
     ================================================================ */
  renderStock(container) {
    const especias = ArcanoDB.getEspecias();
    const blends = ArcanoDB.getBlends();
    container.innerHTML = `
      <div class="g2">
        <div class="card">
          <div class="card-header"><h3>Especias en Bolsa (materia prima)</h3></div>
          <div class="card-body">
            ${especias.length === 0 ? '<p class="text-muted">Sin especias</p>' : `
            <table class="table">
              <thead><tr><th>Especia</th><th>Categoria</th><th>Gramos en bolsa</th></tr></thead>
              <tbody>
                ${especias.sort((a,b) => (a.stockBolsa||0) - (b.stockBolsa||0)).map(e => `
                  <tr>
                    <td class="fw7">${e.nombre || '?'}</td>
                    <td class="text-sm">${e.categoria || '—'}</td>
                    <td>
                      <span class="${(e.stockBolsa||0) <= 50 ? 'text-red fw7' : (e.stockBolsa||0) <= 200 ? 'text-yellow fw7' : 'text-green'}">${e.stockBolsa || 0} grs</span>
                      <div class="stock-bar"><div class="stock-fill ${(e.stockBolsa||0) <= 50 ? 'bar-red' : (e.stockBolsa||0) <= 200 ? 'bar-yellow' : 'bar-green'}" style="width:${Math.min(100, (e.stockBolsa||0) / 5)}%"></div></div>
                    </td>
                  </tr>`).join('')}
              </tbody>
            </table>`}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Frascos listos para vender</h3></div>
          <div class="card-body">
            ${(() => {
              var allFrascos = [];
              especias.forEach(e => { if ((e.stockFrascos||0) > 0) allFrascos.push({nombre: e.nombre, categoria: e.categoria, stock: e.stockFrascos, tipo: 'Especia', chico: e.precioChico, grande: e.precioGrande}); });
              blends.forEach(b => { if ((b.stockFrascos||0) > 0) allFrascos.push({nombre: b.nombre, categoria: b.categoria, stock: b.stockFrascos, tipo: 'Blend', chico: b.precioChico, grande: b.precioGrande}); });
              if (allFrascos.length === 0) return '<p class="text-muted">Sin frascos. Produce en Especias o Blends.</p>';
              return '<table class="table"><thead><tr><th>Nombre</th><th>Tipo</th><th>Frascos</th><th>$ Chico</th><th>$ Grande</th></tr></thead><tbody>' +
                allFrascos.sort((a,b) => a.stock - b.stock).map(f => `
                  <tr>
                    <td class="fw7">${f.nombre}</td>
                    <td><span class="badge ${f.tipo === 'Blend' ? 'badge-blue' : 'badge-gold'}">${f.tipo}</span></td>
                    <td><span class="${f.stock <= 3 ? 'text-red fw7' : 'text-green'}">${f.stock}</span></td>
                    <td>$${(f.chico||0).toLocaleString()}</td>
                    <td>$${(f.grande||0).toLocaleString()}</td>
                  </tr>`).join('') + '</tbody></table>';
            })()}
          </div>
        </div>
      </div>`;
  },

  /* ================================================================
     ETIQUETAS
     ================================================================ */
  renderEtiquetas(container) {
    const etqStock = ArcanoDB.getEtiquetasStock();
    const producciones = ArcanoDB.getProducciones();
    const totalEtq = etqStock.reduce(function(s, e) { return s + (e.stock || 0); }, 0);
    container.innerHTML = `
      <div class="stats-grid mt-8" style="grid-template-columns: repeat(3, 1fr)">
        <div class="stat-card" style="border-left-color: var(--blue)">
          <div class="stat-value" style="color: var(--blue)">${etqStock.length}</div>
          <div class="stat-label">Tipos de Etiquetas</div>
          <div class="stat-sub">${totalEtq} etiquetas en stock</div>
        </div>
        <div class="stat-card" style="border-left-color: var(--green)">
          <div class="stat-value" style="color: var(--green)">${ArcanoDB.getStats().totalFrascos}</div>
          <div class="stat-label">Frascos Producidos</div>
          <div class="stat-sub">Listos para vender</div>
        </div>
        <div class="stat-card" style="border-left-color: var(--gold)">
          <div class="stat-value">${producciones.length}</div>
          <div class="stat-label">Producciones</div>
          <div class="stat-sub">Total registradas</div>
        </div>
      </div>
      <div class="card mt-16">
        <div class="card-header"><h3>Stock de Etiquetas Fisicas</h3></div>
        <div class="card-body">
          ${etqStock.length === 0 ? '<p class="text-muted text-center">Sin etiquetas. Ve a <b>Compras</b> y agrega etiquetas.</p>' :
          '<div class="etiquetas-grid">' +
            etqStock.map(function(e) {
              return '<div class="etiqueta-card"><div class="etiqueta-label">' + (e.nombre || '?') + '</div>' +
                '<div class="etiqueta-cat"><span class="badge badge-blue">Etiqueta</span></div>' +
                '<div class="etiqueta-stock ' + ((e.stock||0) <= 5 ? 'text-red' : '') + '">' + (e.stock||0) + ' <span class="text-muted text-xs">uds</span></div>' +
                '</div>';
            }).join('') + '</div>'}
        </div>
      </div>
      <div class="card mt-16">
        <div class="card-header"><h3>Historial de Producciones</h3></div>
        <div class="card-body">
          ${producciones.length === 0 ? '<p class="text-muted text-center">Sin producciones.</p>' :
          '<div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Tipo</th><th>Producto</th><th>Frascos</th><th>Detalle</th></tr></thead><tbody>' +
            producciones.slice(0, 20).map(function(p) {
              return '<tr><td>' + (p.fecha || '') + '</td>' +
                '<td><span class="badge ' + (p.tipo === 'blend' ? 'badge-blue' : 'badge-gold') + '">' + (p.tipo === 'blend' ? 'Blend' : 'Especia') + '</span></td>' +
                '<td class="fw7">' + (p.blendNombre || p.especiaNombre || '') + '</td>' +
                '<td><span class="badge badge-green">' + (p.cantidad || 0) + '</span></td>' +
                '<td class="text-sm">' +
                  (p.tipo === 'blend' ?
                    (p.ingredientesUsados || []).map(function(i) { return i.especiaNombre + ' ' + i.grsTotal + 'grs'; }).join(', ') :
                    (p.grsConsumidos || 0) + 'grs consumidos'
                  ) +
                  (p.etiquetaUsada ? ' | Etq: ' + p.etiquetaUsada.etiquetaNombre : '') +
                '</td></tr>';
            }).join('') + '</tbody></table></div>'}
        </div>
      </div>`;
  },

  /* ================================================================
     USUARIOS
     ================================================================ */
  renderUsuarios(container) {
    const usuarios = ArcanoDB.getUsuarios();
    container.innerHTML = `
      <div class="page-actions"><button class="btn btn-gold" onclick="Pages.formUsuario()">+ Nuevo Usuario</button></div>
      <div class="table-wrap mt-12">
        <table class="table"><thead><tr><th>Nombre</th><th>Rol</th><th>PIN</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>${usuarios.map(u => `
            <tr>
              <td class="fw7">${u.nombre || '?'}</td>
              <td><span class="badge ${u.rol === 'admin' ? 'badge-gold' : 'badge-blue'}">${u.rol || 'vendedor'}</span></td>
              <td>${u.id === 'admin' ? '****' : u.pin}</td>
              <td><span class="badge ${u.activo !== false ? 'badge-green' : 'badge-red'}">${u.activo !== false ? 'Activo' : 'Inactivo'}</span></td>
              <td>
                <button class="btn btn-sm btn-outline" onclick="Pages.formUsuario('${u.id}')">Editar</button>
                ${u.id !== 'admin' ? '<button class="btn btn-sm btn-red" onclick="Pages.deleteUsuario(\'' + u.id + '\')">X</button>' : ''}
              </td>
            </tr>`).join('')}</tbody>
        </table>
      </div>`;
  },

  formUsuario(id) {
    const user = id ? ArcanoDB.getUsuario(id) : null;
    const isAdmin = user && user.id === 'admin';
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header"><h3>${user ? 'Editar' : 'Nuevo'} Usuario</h3><button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">X</button></div>
        <div class="modal-body">
          <div class="form-group"><label>Nombre</label><input type="text" class="input" id="f-user-nombre" value="${user ? user.nombre : ''}" placeholder="Nombre"></div>
          <div class="form-group"><label>Rol</label><select class="input" id="f-user-rol" ${isAdmin ? 'disabled' : ''}>
            <option value="vendedor" ${user && user.rol === 'vendedor' ? 'selected' : ''}>Vendedor</option>
            <option value="admin" ${user && user.rol === 'admin' ? 'selected' : ''}>Admin</option>
          </select></div>
          <div class="form-group"><label>PIN</label><input type="text" class="input" id="f-user-pin" value="${user ? user.pin : ''}" placeholder="PIN" maxlength="10"></div>
          <div class="form-group"><label>Estado</label><select class="input" id="f-user-activo" ${isAdmin ? 'disabled' : ''}>
            <option value="true" ${user && user.activo !== false ? 'selected' : ''}>Activo</option>
            <option value="false" ${user && user.activo === false ? 'selected' : ''}>Inactivo</option>
          </select></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
          <button class="btn btn-gold" onclick="Pages.saveUsuario('${id || ''}')">Guardar</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  },

  saveUsuario(id) {
    const nombre = document.getElementById('f-user-nombre').value.trim();
    const pin = document.getElementById('f-user-pin').value.trim();
    if (!nombre) { alert('Nombre requerido'); return; }
    if (!pin) { alert('PIN requerido'); return; }
    const data = { nombre, pin, rol: document.getElementById('f-user-rol').value, activo: document.getElementById('f-user-activo').value === 'true' };
    if (id) data.id = id;
    try {
      ArcanoDB.saveUsuario(data);
      document.querySelector('.modal-overlay').remove();
      App.renderPage('usuarios');
    } catch (e) { alert('Error: ' + e.message); }
  },

  deleteUsuario(id) {
    const user = ArcanoDB.getUsuario(id);
    if (!user) return;
    if (!confirm('Eliminar "' + (user.nombre || '') + '"?')) return;
    ArcanoDB.deleteUsuario(id);
    App.renderPage('usuarios');
  }
};