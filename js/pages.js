/* ===================== ARCANO V2 — PAGES ===================== */
const Pages = {

  /* ================================================================
     DASHBOARD
     ================================================================ */
  renderDashboard(container) {
    const stats = ArcanoDB.getStats();
    const db = ArcanoDB.getDB();
    const ultimasVentas = ArcanoDB.getVentas().slice(0, 5);

    container.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${stats.totalVentasHoy}</div>
          <div class="stat-label">Ventas Hoy</div>
          <div class="stat-sub">$${stats.totalVentasHoy.toLocaleString()}</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.totalVentasMes.toLocaleString()}</div>
          <div class="stat-label">Ventas del Mes</div>
          <div class="stat-sub">${stats.ventasMes} operaciones</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.totalEspecias}</div>
          <div class="stat-label">Especias</div>
          <div class="stat-sub">${stats.especiasBajoStock.length} con bajo stock</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.totalBlends}</div>
          <div class="stat-label">Blends</div>
          <div class="stat-sub">${stats.blendsBajoStock.length} con bajo stock</div>
        </div>
      </div>

      <div class="g2 mt-16">
        <div class="card">
          <div class="card-header"><h3>Compras del Mes</h3></div>
          <div class="card-body">
            <div class="big-number">$${stats.totalComprasMes.toLocaleString()}</div>
            <div class="text-muted text-sm mt-8">${stats.totalCompras} compras totales registradas</div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Ultimas Ventas</h3></div>
          <div class="card-body">
            ${ultimasVentas.length === 0 ? '<p class="text-muted">Sin ventas registradas</p>' :
              ultimasVentas.map(v => `
                <div class="list-row">
                  <span>${v.fecha || '—'}</span>
                  <span class="fw7">$${(Number(v.total) || 0).toLocaleString()}</span>
                </div>`).join('')}
          </div>
        </div>
      </div>

      ${(stats.especiasBajoStock.length > 0 || stats.blendsBajoStock.length > 0) ? `
      <div class="card mt-16">
        <div class="card-header"><h3>Alertas de Stock Bajo</h3></div>
        <div class="card-body">
          ${stats.especiasBajoStock.map(e => `<span class="badge badge-red mr-8">${e.nombre}: ${e.stock} uds</span>`).join('')}
          ${stats.blendsBajoStock.map(b => `<span class="badge badge-yellow mr-8">${b.nombre}: ${b.stock} uds</span>`).join('')}
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
            <tr><th>Nombre</th><th>Categoria</th><th>Chico</th><th>Grande</th><th>Stock</th><th>Acciones</th></tr>
          </thead>
          <tbody id="esp-tbody">
            ${this._especiasRows(especias)}
          </tbody>
        </table>
        ${especias.length === 0 ? '<p class="text-muted mt-16 text-center">No hay especias cargadas. Agrega la primera con el boton de arriba.</p>' : ''}
      </div>`;
  },

  _especiasRows(list) {
    return list.map(e => `
      <tr>
        <td class="fw7">${e.nombre}</td>
        <td><span class="badge badge-gold">${e.categoria || '—'}</span></td>
        <td>$${(Number(e.precioChico) || 0).toLocaleString()}</td>
        <td>$${(Number(e.precioGrande) || 0).toLocaleString()}</td>
        <td><span class="${e.stock <= 3 ? 'text-red fw7' : ''}">${e.stock}</span></td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="Pages.formEspecia('${e.id}')">Editar</button>
          <button class="btn btn-sm btn-red" onclick="Pages.deleteEspecia('${e.id}')">Eliminar</button>
        </td>
      </tr>`).join('');
  },

  filterEspecias() {
    const q = (document.getElementById('esp-search').value || '').toLowerCase();
    const all = ArcanoDB.getEspecias();
    const filtered = q ? all.filter(e => e.nombre.toLowerCase().includes(q) || (e.categoria || '').toLowerCase().includes(q)) : all;
    document.getElementById('esp-tbody').innerHTML = this._especiasRows(filtered);
  },

  formEspecia(id) {
    const esp = id ? ArcanoDB.getEspecia(id) : null;
    const title = esp ? 'Editar Especia' : 'Nueva Especia';
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header"><h3>${title}</h3><button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">✕</button></div>
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
          <div class="form-group">
            <label>Stock Inicial (unidades)</label>
            <input type="number" class="input" id="f-esp-stock" value="${esp ? esp.stock : '0'}" placeholder="0" min="0">
          </div>
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
      precioGrande: Number(document.getElementById('f-esp-pgrande').value) || 0,
      stock: Number(document.getElementById('f-esp-stock').value) || 0
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
    if (!confirm('Eliminar especia "' + esp.nombre + '"?')) return;
    ArcanoDB.deleteEspecia(id);
    App.renderPage('especias');
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
            <tr><th>Nombre</th><th>Categoria</th><th>Ingredientes</th><th>Chico</th><th>Grande</th><th>Stock</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            ${blends.map(b => `
              <tr>
                <td class="fw7">${b.nombre}</td>
                <td><span class="badge badge-blue">${b.categoria || '—'}</span></td>
                <td class="text-sm">${(b.ingredientes || []).map(i => {
                  const esp = ArcanoDB.getEspecia(i.especiaId);
                  return (esp ? esp.nombre : '?') + ' x' + (i.cantidad || 0);
                }).join(', ')}</td>
                <td>$${(Number(b.precioChico) || 0).toLocaleString()}</td>
                <td>$${(Number(b.precioGrande) || 0).toLocaleString()}</td>
                <td><span class="${b.stock <= 3 ? 'text-red fw7' : ''}">${b.stock}</span></td>
                <td>
                  <button class="btn btn-sm btn-outline" onclick="Pages.formBlend('${b.id}')">Editar</button>
                  <button class="btn btn-sm btn-green" onclick="Pages.formProducir('${b.id}')">Producir</button>
                  <button class="btn btn-sm btn-red" onclick="Pages.deleteBlend('${b.id}')">Eliminar</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
        ${blends.length === 0 ? '<p class="text-muted mt-16 text-center">No hay blends. Crea uno con el boton de arriba.</p>' : ''}
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
        <div class="modal-header"><h3>${title}</h3><button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">✕</button></div>
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
            <label>Ingredientes (especias que componen el blend)</label>
            <div id="f-bl-ingredientes">
              ${ings.map((ing, i) => this._ingredienteRow(i, ing, especias)).join('')}
            </div>
            <button class="btn btn-sm btn-outline mt-8" onclick="Pages.addIngredienteRow()">+ Agregar Ingrediente</button>
          </div>
          <p class="text-muted text-xs mt-8">La cantidad indica cuantas unidades de cada especia se consumen por cada blend producido.</p>
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
        <option value="">Seleccionar especia...</option>
        ${especias.map(e => `<option value="${e.id}" ${ing.especiaId === e.id ? 'selected' : ''}>${e.nombre} (stock: ${e.stock})</option>`).join('')}
      </select>
      <input type="number" class="input" data-field="cantidad" value="${ing.cantidad || ''}" placeholder="Cant." min="0">
      <button class="btn btn-sm btn-red" onclick="this.closest('.ing-row').remove()">✕</button>
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

    const data = {
      nombre,
      categoria: document.getElementById('f-bl-cat').value,
      precioChico: Number(document.getElementById('f-bl-pchico').value) || 0,
      precioGrande: Number(document.getElementById('f-bl-pgrande').value) || 0,
      ingredientes
    };
    if (id) data.id = id;
    try {
      ArcanoDB.saveBlend(data);
      document.querySelector('.modal-overlay').remove();
      App.renderPage('blends');
    } catch (e) { alert('Error: ' + e.message); }
  },

  formProducir(blendId) {
    const blend = ArcanoDB.getBlend(blendId);
    if (!blend) return;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header"><h3>Producir Blend</h3><button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">✕</button></div>
        <div class="modal-body">
          <p>Producir <b>${blend.nombre}</b></p>
          <p class="text-muted text-sm">Esto consume stock de las especias componentes.</p>
          <div class="form-group mt-12">
            <label>Cantidad a producir</label>
            <input type="number" class="input" id="f-prod-cant" value="1" min="1">
          </div>
          <div class="mt-8 text-sm">
            <b>Ingredientes necesarios:</b>
            ${(blend.ingredientes || []).map(i => {
              const esp = ArcanoDB.getEspecia(i.especiaId);
              return `<div class="list-row"><span>${esp ? esp.nombre : '?'}: ${i.cantidad} uds/cada</span><span class="${esp && esp.stock < i.cantidad ? 'text-red' : 'text-green'}">Stock: ${esp ? esp.stock : 0}</span></div>`;
            }).join('')}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
          <button class="btn btn-gold" onclick="Pages.doProducir('${blendId}')">Producir</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  },

  doProducir(blendId) {
    const cant = Number(document.getElementById('f-prod-cant').value) || 0;
    if (cant <= 0) { alert('Cantidad debe ser mayor a 0'); return; }
    try {
      ArcanoDB.producirBlend(blendId, cant);
      document.querySelector('.modal-overlay').remove();
      App.renderPage('blends');
    } catch (e) { alert(e.message); }
  },

  deleteBlend(id) {
    const blend = ArcanoDB.getBlend(id);
    if (!blend) return;
    if (!confirm('Eliminar blend "' + blend.nombre + '"?')) return;
    ArcanoDB.deleteBlend(id);
    App.renderPage('blends');
  },

  /* ================================================================
     COMPRAS (Especias + Etiquetas fisicas)
     ================================================================ */
  renderCompras(container) {
    const compras = ArcanoDB.getCompras();
    container.innerHTML = `
      <div class="page-actions">
        <button class="btn btn-gold" onclick="Pages.formCompra()">+ Nueva Compra</button>
      </div>
      <div class="table-wrap mt-12">
        <table class="table">
          <thead>
            <tr><th>Fecha</th><th>Proveedor</th><th>Items</th><th>Total</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            ${compras.map(c => `
              <tr>
                <td>${c.fecha || '—'}</td>
                <td>${c.proveedor || '—'}</td>
                <td class="text-sm">${(c.items || []).map(i => {
                  if (i.tipo === 'etiqueta') return '<span class="badge badge-blue">ETQ</span> ' + (i.etiquetaNombre || '?') + ' x' + (i.cantidad || 0);
                  const esp = ArcanoDB.getEspecia(i.especiaId);
                  return (esp ? esp.nombre : '?') + ' x' + (i.cantidad || 0);
                }).join(', ') || '—'}</td>
                <td class="fw7">$${(Number(c.total) || 0).toLocaleString()}</td>
                <td>
                  <button class="btn btn-sm btn-outline" onclick="Pages.formCompra('${c.id}')">Ver</button>
                  <button class="btn btn-sm btn-red" onclick="Pages.deleteCompra('${c.id}')">Eliminar</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
        ${compras.length === 0 ? '<p class="text-muted mt-16 text-center">No hay compras registradas.</p>' : ''}
      </div>`;
  },

  formCompra(id) {
    const compra = id ? ArcanoDB.getCompras().find(c => c.id === id) : null;
    const especias = ArcanoDB.getEspecias();
    const readonly = !!id;

    // Separate items by tipo
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
            <div class="form-group">
              <label>Fecha</label>
              <input type="date" class="input" id="f-comp-fecha" value="${compra ? compra.fecha : new Date().toISOString().slice(0, 10)}" ${readonly ? 'disabled' : ''}>
            </div>
            <div class="form-group">
              <label>Proveedor</label>
              <input type="text" class="input" id="f-comp-prov" value="${compra ? compra.proveedor : ''}" placeholder="Nombre del proveedor" ${readonly ? 'disabled' : ''}>
            </div>
          </div>

          <!-- Especias -->
          <div class="form-group mt-12">
            <label>Especias</label>
            <div id="f-comp-esp-items">
              ${espItems.map((item, i) => this._compraEspRow(i, item, especias, readonly)).join('')}
            </div>
            ${!readonly ? '<button class="btn btn-sm btn-outline mt-8" onclick="Pages._addCompraEspRow()">+ Especia</button>' : ''}
          </div>

          <!-- Etiquetas -->
          <div class="form-group mt-12">
            <label>Etiquetas (frascos con nombre)</label>
            <p class="text-muted text-xs">Las etiquetas llevan el nombre del blend o especia. Ej: "Berbere", "Oregano".</p>
            <div id="f-comp-etq-items">
              ${etqItems.map((item, i) => this._compraEtqRow(i, item, readonly)).join('')}
            </div>
            ${!readonly ? '<button class="btn btn-sm btn-outline mt-8" onclick="Pages._addCompraEtqRow()">+ Etiqueta</button>' : ''}
          </div>

          <div class="mt-12">
            <b>Total: $<span id="f-comp-total">${(Number(compra ? compra.total : 0) || 0).toLocaleString()}</span></b>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cerrar</button>
          ${!readonly ? '<button class="btn btn-gold" onclick="Pages.saveCompra()">Guardar Compra</button>' : ''}
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
      '<input type="number" class="input" data-field="cantidad" value="' + (item.cantidad || '') + '" placeholder="Cant." min="0" ' + (readonly ? 'disabled' : '') + '>' +
      '<input type="number" class="input" data-field="costoUnitario" value="' + (item.costoUnitario || '') + '" placeholder="$ unit" min="0" step="100" ' + (readonly ? 'disabled' : '') + '>' +
      '<span class="item-subtotal">$' + ((Number(item.cantidad) || 0) * (Number(item.costoUnitario) || 0)).toLocaleString() + '</span>' +
      (!readonly ? '<button class="btn btn-sm btn-red" onclick="this.closest(\'.comp-item-row\').remove();Pages._calcCompraTotal()">X</button>' : '') +
    '</div>';
  },

  _compraEtqRow(idx, item, readonly) {
    return '<div class="g4 comp-item-row" data-tipo="etiqueta">' +
      '<input type="text" class="input" data-field="etiquetaNombre" value="' + (item.etiquetaNombre || '') + '" placeholder="Nombre etiqueta" ' + (readonly ? 'disabled' : '') + '>' +
      '<input type="number" class="input" data-field="cantidad" value="' + (item.cantidad || '') + '" placeholder="Cant." min="0" ' + (readonly ? 'disabled' : '') + '>' +
      '<input type="number" class="input" data-field="costoUnitario" value="' + (item.costoUnitario || '') + '" placeholder="$ unit" min="0" step="100" ' + (readonly ? 'disabled' : '') + '>' +
      '<span class="item-subtotal">$' + ((Number(item.cantidad) || 0) * (Number(item.costoUnitario) || 0)).toLocaleString() + '</span>' +
      (!readonly ? '<button class="btn btn-sm btn-red" onclick="this.closest(\'.comp-item-row\').remove();Pages._calcCompraTotal()">X</button>' : '') +
    '</div>';
  },

  _addCompraEspRow() {
    var especias = ArcanoDB.getEspecias();
    var container = document.getElementById('f-comp-esp-items');
    container.insertAdjacentHTML('beforeend', this._compraEspRow(0, {}, especias, false));
  },

  _addCompraEtqRow() {
    var container = document.getElementById('f-comp-etq-items');
    container.insertAdjacentHTML('beforeend', this._compraEtqRow(0, {}, false));
  },

  _calcCompraTotal() {
    var total = 0;
    document.querySelectorAll('#f-comp-esp-items .comp-item-row, #f-comp-etq-items .comp-item-row').forEach(function(row) {
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
    var items = [];
    var total = 0;

    // Especia items
    document.querySelectorAll('#f-comp-esp-items .comp-item-row').forEach(function(row) {
      var espId = row.querySelector('[data-field="especiaId"]').value;
      var cant = Number(row.querySelector('[data-field="cantidad"]').value) || 0;
      var cost = Number(row.querySelector('[data-field="costoUnitario"]').value) || 0;
      if (espId && cant > 0) {
        items.push({ tipo: 'especia', especiaId: espId, cantidad: cant, costoUnitario: cost });
        total += cant * cost;
      }
    });

    // Etiqueta items
    document.querySelectorAll('#f-comp-etq-items .comp-item-row').forEach(function(row) {
      var nombre = row.querySelector('[data-field="etiquetaNombre"]').value.trim();
      var cant = Number(row.querySelector('[data-field="cantidad"]').value) || 0;
      var cost = Number(row.querySelector('[data-field="costoUnitario"]').value) || 0;
      if (nombre && cant > 0) {
        items.push({ tipo: 'etiqueta', etiquetaNombre: nombre, cantidad: cant, costoUnitario: cost });
        total += cant * cost;
      }
    });

    if (items.length === 0) { alert('Agrega al menos un item (especia o etiqueta)'); return; }
    try {
      ArcanoDB.saveCompra({ fecha: fecha, proveedor: proveedor, items: items, total: total });
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
     VENTAS
     ================================================================ */
  renderVentas(container) {
    const ventas = ArcanoDB.getVentas();
    container.innerHTML = `
      <div class="page-actions">
        <button class="btn btn-gold" onclick="Pages.formVenta()">+ Nueva Venta</button>
      </div>
      <div class="table-wrap mt-12">
        <table class="table">
          <thead>
            <tr><th>Fecha</th><th>Vendedor</th><th>Items</th><th>Total</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            ${ventas.map(v => {
              const vendedor = ArcanoDB.getUsuario(v.vendedorId);
              return `<tr>
                <td>${v.fecha || '—'}</td>
                <td>${vendedor ? vendedor.nombre : '—'}</td>
                <td class="text-sm">${(v.items || []).map(i => {
                  const prod = i.tipo === 'especia' ? ArcanoDB.getEspecia(i.productoId) : ArcanoDB.getBlend(i.productoId);
                  return `${prod ? prod.nombre : '?'} (${i.tamano}) x${i.cantidad}`;
                }).join(', ') || '—'}</td>
                <td class="fw7">$${(Number(v.total) || 0).toLocaleString()}</td>
                <td>
                  <button class="btn btn-sm btn-outline" onclick="Pages.formVenta('${v.id}')">Ver</button>
                  <button class="btn btn-sm btn-red" onclick="Pages.deleteVenta('${v.id}')">Eliminar</button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
        ${ventas.length === 0 ? '<p class="text-muted mt-16 text-center">No hay ventas registradas.</p>' : ''}
      </div>`;
  },

  formVenta(id) {
    const venta = id ? ArcanoDB.getVentas().find(v => v.id === id) : null;
    const especias = ArcanoDB.getEspecias();
    const blends = ArcanoDB.getBlends();
    const usuarios = ArcanoDB.getUsuarios().filter(u => u.id !== 'admin');
    const currentUser = ArcanoDB.getCurrentUser();
    const items = venta ? venta.items || [] : [{tipo: 'especia', productoId: '', cantidad: '', tamano: 'chico'}];
    const readonly = !!id;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal modal-lg">
        <div class="modal-header"><h3>${id ? 'Detalle Venta' : 'Nueva Venta'}</h3><button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">✕</button></div>
        <div class="modal-body">
          <div class="g2">
            <div class="form-group">
              <label>Fecha</label>
              <input type="date" class="input" id="f-venta-fecha" value="${venta ? venta.fecha : new Date().toISOString().slice(0, 10)}" ${readonly ? 'disabled' : ''}>
            </div>
            <div class="form-group">
              <label>Vendedor</label>
              <select class="input" id="f-venta-vendedor" ${readonly ? 'disabled' : ''}>
                ${usuarios.map(u => `<option value="${u.id}" ${venta && venta.vendedorId === u.id ? 'selected' : ''}>${u.nombre}</option>`).join('')}
                ${usuarios.length === 0 ? '<option value="admin">Admin</option>' : ''}
              </select>
            </div>
          </div>
          <div class="form-group mt-8">
            <label>Items</label>
            <div id="f-venta-items">
              ${items.map((item, i) => this._ventaItemRow(i, item, especias, blends, readonly)).join('')}
            </div>
            ${!readonly ? '<button class="btn btn-sm btn-outline mt-8" onclick="Pages.addVentaItemRow()">+ Agregar Item</button>' : ''}
          </div>
          <div class="mt-12">
            <b>Total: $<span id="f-venta-total">${(Number(venta ? venta.total : 0) || 0).toLocaleString()}</span></b>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cerrar</button>
          ${!readonly ? '<button class="btn btn-gold" onclick="Pages.saveVenta()">Registrar Venta</button>' : ''}
        </div>
      </div>`;
    document.body.appendChild(modal);
    if (!readonly) {
      modal.addEventListener('input', (e) => {
        if (e.target.closest('#f-venta-items') || e.target.id === 'f-venta-items') this._calcVentaTotal();
      });
      modal.addEventListener('change', (e) => {
        if (e.target.closest('#f-venta-items')) this._calcVentaTotal();
      });
    }
  },

  _ventaItemRow(idx, item, especias, blends, readonly) {
    return `<div class="venta-item-row g4" data-idx="${idx}">
      <select class="input" data-field="tipo" ${readonly ? 'disabled' : ''} onchange="Pages._updateVentaProductos(this)">
        <option value="especia" ${item.tipo === 'especia' ? 'selected' : ''}>Especia</option>
        <option value="blend" ${item.tipo === 'blend' ? 'selected' : ''}>Blend</option>
      </select>
      <select class="input" data-field="productoId" ${readonly ? 'disabled' : ''}>
        <option value="">Seleccionar...</option>
        ${(item.tipo === 'blend' ? blends : especias).map(p => `<option value="${p.id}" ${item.productoId === p.id ? 'selected' : ''}>${p.nombre} (stock: ${p.stock})</option>`).join('')}
      </select>
      <select class="input" data-field="tamano" ${readonly ? 'disabled' : ''}>
        <option value="chico" ${item.tamano === 'chico' ? 'selected' : ''}>Chico</option>
        <option value="grande" ${item.tamano === 'grande' ? 'selected' : ''}>Grande</option>
      </select>
      <input type="number" class="input" data-field="cantidad" value="${item.cantidad || ''}" placeholder="Cant." min="1" ${readonly ? 'disabled' : ''}>
      ${!readonly ? '<button class="btn btn-sm btn-red" onclick="this.closest(\'.venta-item-row\').remove();Pages._calcVentaTotal()">✕</button>' : ''}
    </div>`;
  },

  _updateVentaProductos(tipoSelect) {
    const row = tipoSelect.closest('.venta-item-row');
    const tipo = tipoSelect.value;
    const prodSelect = row.querySelector('[data-field="productoId"]');
    const productos = tipo === 'blend' ? ArcanoDB.getBlends() : ArcanoDB.getEspecias();
    prodSelect.innerHTML = '<option value="">Seleccionar...</option>' +
      productos.map(p => `<option value="${p.id}">${p.nombre} (stock: ${p.stock})</option>`).join('');
    this._calcVentaTotal();
  },

  addVentaItemRow() {
    const especias = ArcanoDB.getEspecias();
    const blends = ArcanoDB.getBlends();
    const container = document.getElementById('f-venta-items');
    const idx = container.children.length;
    container.insertAdjacentHTML('beforeend', this._ventaItemRow(idx, {}, especias, blends, false));
  },

  _calcVentaTotal() {
    let total = 0;
    document.querySelectorAll('#f-venta-items .venta-item-row').forEach(row => {
      const tipo = row.querySelector('[data-field="tipo"]').value;
      const prodId = row.querySelector('[data-field="productoId"]').value;
      const tamano = row.querySelector('[data-field="tamano"]').value;
      const cant = Number(row.querySelector('[data-field="cantidad"]').value) || 0;
      const prod = tipo === 'blend' ? ArcanoDB.getBlend(prodId) : ArcanoDB.getEspecia(prodId);
      const precio = tamano === 'grande' ? (prod ? prod.precioGrande : 0) : (prod ? prod.precioChico : 0);
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
        const prod = tipo === 'blend' ? ArcanoDB.getBlend(prodId) : ArcanoDB.getEspecia(prodId);
        const precio = tamano === 'grande' ? (prod ? prod.precioGrande : 0) : (prod ? prod.precioChico : 0);
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
     STOCK
     ================================================================ */
  renderStock(container) {
    const db = ArcanoDB.getDB();
    const especias = Object.values(db.especias);
    const blends = Object.values(db.blends);

    container.innerHTML = `
      <div class="g2">
        <div class="card">
          <div class="card-header"><h3>Especias - Stock</h3></div>
          <div class="card-body">
            ${especias.length === 0 ? '<p class="text-muted">Sin especias</p>' : `
            <table class="table">
              <thead><tr><th>Nombre</th><th>Categoria</th><th>Stock</th></tr></thead>
              <tbody>
                ${especias.sort((a,b) => a.stock - b.stock).map(e => `
                  <tr>
                    <td class="fw7">${e.nombre}</td>
                    <td class="text-sm">${e.categoria || '—'}</td>
                    <td>
                      <span class="${e.stock <= 3 ? 'text-red fw7' : e.stock <= 10 ? 'text-yellow fw7' : 'text-green'}">${e.stock}</span>
                      <div class="stock-bar"><div class="stock-fill ${e.stock <= 3 ? 'bar-red' : e.stock <= 10 ? 'bar-yellow' : 'bar-green'}" style="width:${Math.min(100, e.stock * 2)}%"></div></div>
                    </td>
                  </tr>`).join('')}
              </tbody>
            </table>`}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Blends - Stock</h3></div>
          <div class="card-body">
            ${blends.length === 0 ? '<p class="text-muted">Sin blends</p>' : `
            <table class="table">
              <thead><tr><th>Nombre</th><th>Categoria</th><th>Stock</th></tr></thead>
              <tbody>
                ${blends.sort((a,b) => a.stock - b.stock).map(b => `
                  <tr>
                    <td class="fw7">${b.nombre}</td>
                    <td class="text-sm">${b.categoria || '—'}</td>
                    <td>
                      <span class="${b.stock <= 3 ? 'text-red fw7' : b.stock <= 10 ? 'text-yellow fw7' : 'text-green'}">${b.stock}</span>
                      <div class="stock-bar"><div class="stock-fill ${b.stock <= 3 ? 'bar-red' : b.stock <= 10 ? 'bar-yellow' : 'bar-green'}" style="width:${Math.min(100, b.stock * 2)}%"></div></div>
                    </td>
                  </tr>`).join('')}
              </tbody>
            </table>`}
          </div>
        </div>
      </div>`;
  },

  /* ================================================================
     USUARIOS
     ================================================================ */
  renderUsuarios(container) {
    const usuarios = ArcanoDB.getUsuarios();
    container.innerHTML = `
      <div class="page-actions">
        <button class="btn btn-gold" onclick="Pages.formUsuario()">+ Nuevo Usuario</button>
      </div>
      <div class="table-wrap mt-12">
        <table class="table">
          <thead>
            <tr><th>ID</th><th>Nombre</th><th>ROL</th><th>PIN</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            ${usuarios.map(u => `
              <tr>
                <td class="text-muted text-sm">${u.id}</td>
                <td class="fw7">${u.nombre}</td>
                <td><span class="badge ${u.rol === 'admin' ? 'badge-gold' : 'badge-blue'}">${u.rol || 'vendedor'}</span></td>
                <td>${u.id === 'admin' ? '****' : u.pin}</td>
                <td><span class="badge ${u.activo !== false ? 'badge-green' : 'badge-red'}">${u.activo !== false ? 'Activo' : 'Inactivo'}</span></td>
                <td>
                  <button class="btn btn-sm btn-outline" onclick="Pages.formUsuario('${u.id}')">Editar</button>
                  ${u.id !== 'admin' ? '<button class="btn btn-sm btn-red" onclick="Pages.deleteUsuario(\'' + u.id + '\')">Eliminar</button>' : ''}
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  },

  formUsuario(id) {
    const user = id ? ArcanoDB.getUsuario(id) : null;
    const title = user ? 'Editar Usuario' : 'Nuevo Usuario';
    const isAdmin = user && user.id === 'admin';

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header"><h3>${title}</h3><button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">✕</button></div>
        <div class="modal-body">
          <div class="form-group">
            <label>Nombre</label>
            <input type="text" class="input" id="f-user-nombre" value="${user ? user.nombre : ''}" placeholder="Nombre del vendedor">
          </div>
          <div class="form-group">
            <label>Rol</label>
            <select class="input" id="f-user-rol" ${isAdmin ? 'disabled' : ''}>
              <option value="vendedor" ${user && user.rol === 'vendedor' ? 'selected' : ''}>Vendedor</option>
              <option value="admin" ${user && user.rol === 'admin' ? 'selected' : ''}>Admin</option>
            </select>
          </div>
          <div class="form-group">
            <label>PIN de acceso</label>
            <input type="text" class="input" id="f-user-pin" value="${user ? user.pin : ''}" placeholder="PIN numerico" maxlength="10">
          </div>
          <div class="form-group">
            <label>Estado</label>
            <select class="input" id="f-user-activo" ${isAdmin ? 'disabled' : ''}>
              <option value="true" ${user && user.activo !== false ? 'selected' : ''}>Activo</option>
              <option value="false" ${user && user.activo === false ? 'selected' : ''}>Inactivo</option>
            </select>
          </div>
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
    const data = {
      nombre,
      pin,
      rol: document.getElementById('f-user-rol').value,
      activo: document.getElementById('f-user-activo').value === 'true'
    };
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
    if (!confirm('Eliminar usuario "' + user.nombre + '"?')) return;
    ArcanoDB.deleteUsuario(id);
    App.renderPage('usuarios');
  },

  /* ================================================================
     ETIQUETAS
     - Stock de etiquetas fisicas compradas (se consumen al producir)
     - Stock de blends producidos (etiquetas con nombre listas para vender)
     ================================================================ */
  renderEtiquetas(container) {
    const etqStock = ArcanoDB.getEtiquetasStock();
    const etqProducidas = ArcanoDB.getEtiquetasProducidas();
    const producciones = ArcanoDB.getProducciones();
    const db = ArcanoDB.getDB();
    const allBlends = Object.values(db.blends);

    const totalEtqFisicas = etqStock.reduce(function(s, e) { return s + e.stock; }, 0);
    const totalProducidas = etqProducidas.reduce(function(s, e) { return s + e.stock; }, 0);

    container.innerHTML = `
      <div class="page-actions">
        <button class="btn btn-gold" onclick="Pages.formProducirEtiqueta()">+ Producir</button>
        <button class="btn btn-outline" onclick="Pages.formVenderEtiqueta()">Vender Etiqueta</button>
      </div>

      <div class="stats-grid mt-16" style="grid-template-columns: repeat(3, 1fr)">
        <div class="stat-card" style="border-left-color: var(--blue)">
          <div class="stat-value" style="color: var(--blue)">${etqStock.length}</div>
          <div class="stat-label">Tipos de Etiquetas</div>
          <div class="stat-sub">${totalEtqFisicas} etiquetas fisicas en stock</div>
        </div>
        <div class="stat-card" style="border-left-color: var(--green)">
          <div class="stat-value" style="color: var(--green)">${totalProducidas}</div>
          <div class="stat-label">Blends Producidos</div>
          <div class="stat-sub">${etqProducidas.length} blends con stock</div>
        </div>
        <div class="stat-card" style="border-left-color: var(--gold)">
          <div class="stat-value">${allBlends.length}</div>
          <div class="stat-label">Blends Totales</div>
          <div class="stat-sub">Ir a Compras para comprar etiquetas</div>
        </div>
      </div>

      <!-- Etiquetas fisicas compradas -->
      <div class="card mt-16">
        <div class="card-header">
          <h3>Stock de Etiquetas Fisicas</h3>
          <span class="text-muted text-sm">Compradas en Compras. Se consumen al producir.</span>
        </div>
        <div class="card-body">
          ${etqStock.length === 0
            ? '<p class="text-muted text-center">Sin etiquetas. Ve a <b>Compras</b> y agrega etiquetas con el nombre del blend/especia.</p>'
            : '<div class="etiquetas-grid">' +
              etqStock.map(function(e) {
                var baja = e.stock <= 5;
                return '<div class="etiqueta-card">' +
                  '<div class="etiqueta-label">' + e.nombre + '</div>' +
                  '<div class="etiqueta-cat"><span class="badge badge-blue">Etiqueta Fisica</span></div>' +
                  '<div class="etiqueta-stock ' + (baja ? 'text-red' : '') + '">' + e.stock + ' <span class="text-muted text-xs">uds</span></div>' +
                  (baja ? '<p class="text-red text-xs mt-4">Stock bajo - compra mas</p>' : '') +
                '</div>';
              }).join('') + '</div>'
          }
        </div>
      </div>

      <!-- Blends producidos (listos para vender) -->
      <div class="card mt-16">
        <div class="card-header">
          <h3>Blends Producidos (listos para vender)</h3>
        </div>
        <div class="card-body">
          ${etqProducidas.length === 0
            ? '<p class="text-muted text-center">Sin blends producidos. Usa "Producir" para fabricar.</p>'
            : '<div class="etiquetas-grid">' +
              etqProducidas.map(function(e) {
                return '<div class="etiqueta-card">' +
                  '<div class="etiqueta-label">' + e.nombre + '</div>' +
                  '<div class="etiqueta-cat"><span class="badge badge-gold">' + (e.categoria || '') + '</span></div>' +
                  '<div class="etiqueta-stock">' + e.stock + ' <span class="text-muted text-xs">uds</span></div>' +
                  '<div class="etiqueta-prices"><span>Ch: $' + e.precioChico.toLocaleString() + '</span><span>Gr: $' + e.precioGrande.toLocaleString() + '</span></div>' +
                  '<div class="etiqueta-actions mt-8">' +
                    '<button class="btn btn-sm btn-green" onclick="Pages.formProducirEtiqueta(\'' + e.blendId + '\')">+ Producir</button>' +
                    '<button class="btn btn-sm btn-outline" onclick="Pages.formVenderEtiqueta(\'' + e.blendId + '\')">Vender</button>' +
                  '</div></div>';
              }).join('') + '</div>'
          }
        </div>
      </div>

      <!-- Historial -->
      <div class="card mt-16">
        <div class="card-header"><h3>Historial de Producciones</h3></div>
        <div class="card-body">
          ${producciones.length === 0
            ? '<p class="text-muted text-center">Sin producciones.</p>'
            : '<div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Blend</th><th>Cant.</th><th>Especias consumidas</th><th>Etiqueta</th></tr></thead><tbody>' +
              producciones.slice(0, 20).map(function(p) {
                return '<tr><td>' + (p.fecha || '') + '</td><td class="fw7">' + (p.blendNombre || '') + '</td>' +
                  '<td><span class="badge badge-green">' + (p.cantidad || 0) + ' uds</span></td>' +
                  '<td class="text-sm">' + (p.ingredientesUsados || []).map(function(i) { return '<span class="badge badge-gold mr-4">' + i.especiaNombre + ' x' + i.cantidadTotal + '</span>'; }).join('') + '</td>' +
                  '<td class="text-sm">' + (p.etiquetaUsada ? p.etiquetaUsada.etiquetaNombre + ' x' + p.etiquetaUsada.cantidadConsumida + ' (restan ' + p.etiquetaUsada.stockRestante + ')' : '—') + '</td></tr>';
              }).join('') + '</tbody></table></div>'
          }
        </div>
      </div>`;
  },

  /** Modal para producir etiquetas — muestra calculo claro de especias + etiqueta */
  formProducirEtiqueta(preselectedBlendId) {
    const blends = ArcanoDB.getBlends();
    if (blends.length === 0) {
      alert('Primero crea un blend en la seccion Blends.');
      return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3>Producir Etiquetas</h3>
          <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">X</button>
        </div>
        <div class="modal-body">
          <p class="text-muted text-sm mb-12">Al producir, se consumen especias del stock y se generan etiquetas con el nombre del blend.</p>
          <div class="form-group">
            <label>Seleccionar Blend</label>
            <select class="input" id="f-etq-blend" onchange="Pages._updateProduccionCalculo()">
              <option value="">-- Elegir blend --</option>
              ${blends.map(b => '<option value="' + b.id + '" ' + (preselectedBlendId === b.id ? 'selected' : '') + '>' + b.nombre + ' (' + (b.categoria || '—') + ')</option>').join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Cantidad de etiquetas a producir</label>
            <input type="number" class="input" id="f-etq-cant" value="1" min="1" oninput="Pages._updateProduccionCalculo()">
          </div>

          <!-- Calculo en tiempo real -->
          <div id="f-etq-calculo" class="mt-12" style="display:none">
            <div class="card">
              <div class="card-header"><h3>Calculo de Produccion</h3></div>
              <div class="card-body" id="f-etq-calculo-body"></div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
          <button class="btn btn-gold" onclick="Pages.doProducirEtiqueta()">Producir Etiquetas</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    // Si ya hay blend preseleccionado, mostrar calculo
    if (preselectedBlendId) {
      setTimeout(() => this._updateProduccionCalculo(), 50);
    }
  },

  /** Actualiza el calculo de especias necesarias en tiempo real */
  _updateProduccionCalculo() {
    const blendId = document.getElementById('f-etq-blend').value;
    const cant = Number(document.getElementById('f-etq-cant').value) || 0;
    const calcDiv = document.getElementById('f-etq-calculo');
    const calcBody = document.getElementById('f-etq-calculo-body');

    if (!blendId || cant <= 0) {
      calcDiv.style.display = 'none';
      return;
    }

    const blend = ArcanoDB.getBlend(blendId);
    if (!blend) { calcDiv.style.display = 'none'; return; }

    const ingredientes = blend.ingredientes || [];
    let html = '<p class="mb-8">Para producir <b>' + cant + '</b> etiquetas de <b class="text-gold">"' + blend.nombre + '"</b>:</p>';
    html += '<table class="table"><thead><tr><th>Especia</th><th>Por unidad</th><th>Total necesario</th><th>Stock actual</th><th>Estado</th></tr></thead><tbody>';

    let todoOk = true;
    for (const ing of ingredientes) {
      const esp = ArcanoDB.getEspecia(ing.especiaId);
      if (!esp) continue;
      const porUnidad = ing.cantidad || 0;
      const total = porUnidad * cant;
      const ok = esp.stock >= total;
      if (!ok) todoOk = false;
      html += '<tr>' +
        '<td class="fw7">' + esp.nombre + '</td>' +
        '<td>' + porUnidad + '</td>' +
        '<td class="fw7">' + total + '</td>' +
        '<td>' + esp.stock + '</td>' +
        '<td>' + (ok
          ? '<span class="badge badge-green">OK</span>'
          : '<span class="badge badge-red">Faltan ' + (total - esp.stock) + '</span>') +
        '</td></tr>';
    }
    html += '</tbody></table>';

    // Show etiqueta info
    var etqStockList = ArcanoDB.getEtiquetasStock();
    var etq = null;
    for (var ei = 0; ei < etqStockList.length; ei++) {
      if (etqStockList[ei].nombre === blend.nombre) { etq = etqStockList[ei]; break; }
    }
    html += '<div class="mt-12 card"><div class="card-header"><h3>Etiqueta fisica requerida</h3></div><div class="card-body">';
    if (etq) {
      var etqOk = etq.stock >= cant;
      html += '<div class="list-row"><span class="fw7">Etiqueta "' + etq.nombre + '"</span><span class="' + (etqOk ? 'text-green' : 'text-red') + '">Stock: ' + etq.stock + ' / Necesario: ' + cant + '</span></div>';
      if (!etqOk) {
        html += '<p class="text-red mt-8 fw7">Faltan ' + (cant - etq.stock) + ' etiquetas de "' + blend.nombre + '". Compralas en Compras.</p>';
        todoOk = false;
      }
    } else {
      html += '<p class="text-red fw7">No hay etiquetas "' + blend.nombre + '" en stock. Compralas en Compras primero.</p>';
      todoOk = false;
    }
    html += '</div></div>';

    if (!todoOk) {
      html += '<p class="text-red mt-8 fw7">No se puede producir. Revisa los faltantes.</p>';
    } else {
      html += '<p class="text-green mt-8 fw7">Todo disponible. Se produciran ' + cant + ' etiquetas de "' + blend.nombre + '".</p>';
    }

    calcBody.innerHTML = html;
    calcDiv.style.display = 'block';
  },

  /** Ejecutar la produccion de etiquetas */
  doProducirEtiqueta() {
    const blendId = document.getElementById('f-etq-blend').value;
    const cant = Number(document.getElementById('f-etq-cant').value) || 0;
    if (!blendId) { alert('Selecciona un blend'); return; }
    if (cant <= 0) { alert('Cantidad debe ser mayor a 0'); return; }

    const blend = ArcanoDB.getBlend(blendId);
    try {
      const result = ArcanoDB.producirBlend(blendId, cant);
      const nombre = blend ? blend.nombre : 'Blend';
      alert('Produccion exitosa: ' + cant + ' etiquetas de "' + nombre + '"\n\n' +
        'Las etiquetas ahora estan en stock y listas para vender.');
      document.querySelector('.modal-overlay').remove();
      App.renderPage('etiquetas');
    } catch (e) {
      alert(e.message);
    }
  },

  /** Modal para vender directamente desde etiquetas */
  formVenderEtiqueta(preselectedBlendId) {
    const etiquetas = ArcanoDB.getEtiquetasProducidas();
    if (etiquetas.length === 0) {
      alert('No hay etiquetas en stock. Produce blends primero.');
      return;
    }
    const usuarios = ArcanoDB.getUsuarios().filter(u => u.id !== 'admin');

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>Vender Etiqueta</h3>
          <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">X</button>
        </div>
        <div class="modal-body">
          <p class="text-muted text-sm mb-12">Se descuenta del stock la etiqueta con el nombre del blend seleccionado.</p>
          <div class="form-group">
            <label>Etiqueta (Blend)</label>
            <select class="input" id="f-vetq-blend" onchange="Pages._updateVentaEtiquetaPrecio()">
              <option value="">-- Elegir etiqueta --</option>
              ${etiquetas.map(e =>
                '<option value="' + e.blendId + '" ' + (preselectedBlendId === e.blendId ? 'selected' : '') + '>' +
                e.nombre + ' (stock: ' + e.stock + ')</option>'
              ).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Tamano del frasco</label>
            <select class="input" id="f-vetq-tamano" onchange="Pages._updateVentaEtiquetaPrecio()">
              <option value="chico">Frasco Chico</option>
              <option value="grande">Frasco Grande</option>
            </select>
          </div>
          <div class="form-group">
            <label>Cantidad</label>
            <input type="number" class="input" id="f-vetq-cant" value="1" min="1" oninput="Pages._updateVentaEtiquetaPrecio()">
          </div>
          <div class="g2">
            <div class="form-group">
              <label>Vendedor</label>
              <select class="input" id="f-vetq-vendedor">
                ${usuarios.map(u => '<option value="' + u.id + '">' + u.nombre + '</option>').join('')}
                ${usuarios.length === 0 ? '<option value="admin">Admin</option>' : ''}
              </select>
            </div>
            <div class="form-group">
              <label>Total</label>
              <div class="venta-total-box" id="f-vetq-total">$0</div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
          <button class="btn btn-gold" onclick="Pages.doVenderEtiqueta()">Registrar Venta</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    if (preselectedBlendId) {
      setTimeout(() => this._updateVentaEtiquetaPrecio(), 50);
    }
  },

  /** Actualiza precio total en tiempo real al vender etiqueta */
  _updateVentaEtiquetaPrecio() {
    const blendId = document.getElementById('f-vetq-blend').value;
    const tamano = document.getElementById('f-vetq-tamano').value;
    const cant = Number(document.getElementById('f-vetq-cant').value) || 0;
    const totalEl = document.getElementById('f-vetq-total');
    if (!blendId || cant <= 0) { totalEl.textContent = '$0'; return; }

    const blend = ArcanoDB.getBlend(blendId);
    if (!blend) { totalEl.textContent = '$0'; return; }
    const precio = tamano === 'grande' ? (blend.precioGrande || 0) : (blend.precioChico || 0);
    totalEl.textContent = '$' + (precio * cant).toLocaleString();
  },

  /** Ejecutar venta de etiqueta */
  doVenderEtiqueta() {
    const blendId = document.getElementById('f-vetq-blend').value;
    const tamano = document.getElementById('f-vetq-tamano').value;
    const cant = Number(document.getElementById('f-vetq-cant').value) || 0;
    const vendedorId = document.getElementById('f-vetq-vendedor').value;

    if (!blendId) { alert('Selecciona una etiqueta'); return; }
    if (cant <= 0) { alert('Cantidad debe ser mayor a 0'); return; }

    const blend = ArcanoDB.getBlend(blendId);
    if (!blend) { alert('Blend no encontrado'); return; }
    const precio = tamano === 'grande' ? (blend.precioGrande || 0) : (blend.precioChico || 0);

    const ventaData = {
      fecha: new Date().toISOString().slice(0, 10),
      vendedorId: vendedorId || 'admin',
      items: [{
        tipo: 'blend',
        productoId: blendId,
        tamano: tamano,
        cantidad: cant,
        precioUnitario: precio
      }],
      total: precio * cant
    };

    try {
      ArcanoDB.saveVenta(ventaData);
      alert('Venta registrada: ' + cant + ' etiqueta' + (cant > 1 ? 's' : '') + ' de "' + blend.nombre + '" (' + tamano + ')\n' +
        'Stock descontado de la etiqueta "' + blend.nombre + '".');
      document.querySelector('.modal-overlay').remove();
      App.renderPage('etiquetas');
    } catch (e) {
      alert(e.message);
    }
  }
};