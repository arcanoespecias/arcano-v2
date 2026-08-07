/* ===================== PUNTOS DE VENTA — UI ===================== */

var PDV = {
  currentPDV: null,
  currentView: 'list', // list | stock | ventas | stats | pos

  render(container) {
    var hash = window.location.hash || '';
    var m = hash.match(/pdv=(\d+)/);
    if (m) {
      var pdv = ArcanoDB.getPuntoDeVenta(Number(m[1]));
      if (pdv) {
        this.currentPDV = pdv;
        var view = hash.match(/view=(\w+)/);
        this.currentView = view ? view[1] : 'stock';
        this['render' + this.currentView.charAt(0).toUpperCase() + this.currentView.slice(1)](container);
        return;
      }
    }
    // Check for POS mode (sales interface via QR)
    var posMatch = hash.match(/pos=(\d+)/);
    if (posMatch) {
      this.currentPDV = ArcanoDB.getPuntoDeVenta(Number(posMatch[1]));
      if (this.currentPDV) {
        this.currentView = 'pos';
        this.renderPos(container);
        return;
      }
    }
    this.currentPDV = null;
    this.currentView = 'list';
    this.renderList(container);
  },

  hash(pdvId, view) {
    if (!pdvId) return '#';
    return '#pdv=' + pdvId + (view ? '&view=' + view : '');
  },

  go(pdvId, view) {
    window.location.hash = this.hash(pdvId, view);
    this.render(document.getElementById('page-content'));
  },

  /* ==================== LISTADO ==================== */
  renderList(container) {
    var pdvs = ArcanoDB.getPuntosDeVenta();
    var h = '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">' +
      '<div><h3 style="margin:0">Puntos de Venta</h3>' +
      '<p class="text-muted text-sm" style="margin:4px 0 0">Gestiona puntos de venta, stock y ventas por ubicacion</p></div>' +
      '<button class="btn btn-gold" onclick="PDV.formCrear()">+ Punto de Venta</button>' +
      '</div>';
    h += '<div style="border-bottom:2px solid var(--border);margin:12px 0 16px"></div>';
    if (pdvs.length === 0) {
      h += '<div class="card"><div class="card-body text-center text-muted" style="padding:40px">' +
        '<p style="font-size:48px;margin-bottom:12px">🏪</p>' +
        '<p>No hay puntos de venta creados</p>' +
        '<p class="text-sm">Crea un punto de venta para empezar a gestionar stock y ventas por ubicacion</p></div></div>';
    } else {
      h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px">';
      for (var i = 0; i < pdvs.length; i++) {
        var p = pdvs[i];
        var stats = ArcanoDB.getPDVStats(p.id);
        var stockCount = stats.totalItemsEnStock;
        var stockItems = stats.productosEnStock;
        h += '<div class="card" style="cursor:pointer" onclick="PDV.go(' + p.id + ',\'stock\')">' +
          '<div class="card-body">' +
          '<div style="display:flex;justify-content:space-between;align-items:start">' +
          '<div><h4 style="margin:0 0 4px">' + this.esc(p.nombre) + '</h4>' +
          '<p class="text-muted text-sm">' + this.esc(p.ubicacion || 'Sin ubicacion') + '</p></div>' +
          '<span class="badge ' + (p.activo !== false ? 'badge-green' : 'badge-red') + '">' + (p.activo !== false ? 'Activo' : 'Inactivo') + '</span>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:12px">' +
          '<div class="text-center"><div class="fw7" style="font-size:1.2em">' + stockItems + '</div><div class="text-muted text-sm">Productos</div></div>' +
          '<div class="text-center"><div class="fw7" style="font-size:1.2em">' + stockCount + '</div><div class="text-muted text-sm">Unidades</div></div>' +
          '<div class="text-center"><div class="fw7" style="font-size:1.2em">$' + (stats.totalIngresos || 0).toLocaleString() + '</div><div class="text-muted text-sm">Ventas</div></div>' +
          '</div>' +
          '<div style="display:flex;gap:6px;margin-top:12px">' +
          '<button class="btn btn-sm btn-outline" style="flex:1" onclick="event.stopPropagation();PDV.go(' + p.id + ',\'stock\')">Stock</button>' +
          '<button class="btn btn-sm btn-outline" style="flex:1" onclick="event.stopPropagation();PDV.go(' + p.id + ',\'ventas\')">Ventas</button>' +
          '<button class="btn btn-sm btn-outline" style="flex:1" onclick="event.stopPropagation();PDV.go(' + p.id + ',\'stats\')">Stats</button>' +
          '<button class="btn btn-sm btn-gold" onclick="event.stopPropagation();PDV.showQR(' + p.id + ')" title="Generar QR de ventas">QR</button>' +
          '</div></div></div>';
      }
      h += '</div>';
    }
    container.innerHTML = h;
  },

  /* ==================== CREAR/EDITAR PDV ==================== */
  formCrear() {
    var h = '<div class="form-group"><label>Nombre</label>' +
      '<input type="text" class="input" id="pdv-nombre" placeholder="Ej: Feria 1, Ciudad xyz"></div>' +
      '<div class="form-group"><label>Ubicacion</label>' +
      '<input type="text" class="input" id="pdv-ubicacion" placeholder="Ej: Centro, Plaza principal"></div>' +
      '<div class="form-group"><label><input type="checkbox" id="pdv-activo" checked> Activo</label></div>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end">' +
      '<button class="btn btn-outline" onclick="PDV.render(document.getElementById(\'page-content\'))">Cancelar</button>' +
      '<button class="btn btn-gold" onclick="PDV.doGuardar()">Guardar</button></div>';
    openModal('Nuevo Punto de Venta', h);
    setTimeout(function() { var el = document.getElementById('pdv-nombre'); if (el) el.focus(); }, 100);
  },

  formEditar(id) {
    var p = ArcanoDB.getPuntoDeVenta(id);
    if (!p) return;
    var h = '<div class="form-group"><label>Nombre</label>' +
      '<input type="text" class="input" id="pdv-nombre" value="' + this.esc(p.nombre) + '"></div>' +
      '<div class="form-group"><label>Ubicacion</label>' +
      '<input type="text" class="input" id="pdv-ubicacion" value="' + this.esc(p.ubicacion || '') + '"></div>' +
      '<div class="form-group"><label><input type="checkbox" id="pdv-activo" ' + (p.activo !== false ? 'checked' : '') + '> Activo</label></div>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end">' +
      '<button class="btn btn-outline" onclick="closeModal()">Cancelar</button>' +
      '<button class="btn btn-gold" onclick="PDV.doGuardar(' + id + ')">Guardar</button></div>';
    openModal('Editar Punto de Venta', h);
  },

  doGuardar(id) {
    var nombre = (document.getElementById('pdv-nombre').value || '').trim();
    var ubicacion = (document.getElementById('pdv-ubicacion').value || '').trim();
    var activo = document.getElementById('pdv-activo').checked;
    if (!nombre) { toast('Ingresa un nombre', 'err'); return; }
    var data = { nombre: nombre, ubicacion: ubicacion, activo: activo };
    if (id) data.id = id;
    try {
      var saved = ArcanoDB.savePuntoDeVenta(data);
      closeModal();
      toast('Punto de venta guardado');
      if (id && this.currentPDV) {
        this.currentPDV = saved;
        this.render(document.getElementById('page-content'));
      } else {
        this.render(document.getElementById('page-content'));
      }
    } catch (e) { toast(e.message, 'err'); }
  },

  doEliminar(id) {
    var p = ArcanoDB.getPuntoDeVenta(id);
    if (!p) return;
    if (!confirm('Eliminar "' + p.nombre + '"?\n\nEl stock sera devuelto al inventario principal.')) return;
    try {
      ArcanoDB.deletePuntoDeVenta(id);
      toast('Punto de venta eliminado');
      window.location.hash = '#';
      this.render(document.getElementById('page-content'));
    } catch (e) { toast(e.message, 'err'); }
  },

  /* ==================== STOCK ==================== */
  renderStock(container) {
    var pdv = this.currentPDV;
    if (!pdv) return;
    var h = '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
      '<button class="btn btn-ghost" onclick="PDV.go(null)">← Puntos de Venta</button>' +
      '<h3 style="margin:0">' + this.esc(pdv.nombre) + '</h3>' +
      '<span class="badge badge-blue">Stock</span></div>';
    h += '<p class="text-muted text-sm" style="margin:4px 0 0">' + this.esc(pdv.ubicacion || '') + '</p>';
    h += '<div style="display:flex;gap:6px;margin:12px 0;flex-wrap:wrap">' +
      '<button class="btn btn-gold" onclick="PDV.formMoverStock()">Mover Stock al PDV</button>' +
      '<button class="btn btn-outline" onclick="PDV.formDevolverStock()">Devolver Stock</button>' +
      '<button class="btn btn-outline" onclick="PDV.formEditar(' + pdv.id + ')">Editar</button>' +
      '<button class="btn btn-red" onclick="PDV.doEliminar(' + pdv.id + ')">Eliminar</button>' +
      '</div>';
    h += '<div style="border-bottom:2px solid var(--border);margin:0 0 16px"></div>';
    // Stock table
    var stock = pdv.stock || {};
    var keys = Object.keys(stock).filter(function(k) { return stock[k] > 0; });
    if (keys.length === 0) {
      h += '<div class="card"><div class="card-body text-center text-muted" style="padding:32px">' +
        '<p>Sin stock en este punto de venta</p>' +
        '<p class="text-sm">Usa "Mover Stock al PDV" para enviar productos</p></div></div>';
    } else {
      h += '<div class="table-wrap"><table class="table"><thead><tr>' +
        '<th>Producto</th><th>Tipo</th><th>Talla</th><th>Cantidad</th></tr></thead><tbody>';
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        var parts = k.split('_');
        var tipo = parts[0];
        var prodId = Number(parts[1]);
        var talla = parts[2];
        var producto = tipo === 'especia' ? ArcanoDB.getEspecia(prodId) : ArcanoDB.getBlend(prodId);
        var nombre = producto ? producto.nombre : '?';
        h += '<tr><td class="fw7">' + this.esc(nombre) + '</td>' +
          '<td><span class="badge ' + (tipo === 'especia' ? 'badge-gold' : 'badge-blue') + '">' + tipo + '</span></td>' +
          '<td>' + talla + '</td>' +
          '<td class="fw7">' + stock[k] + '</td></tr>';
      }
      h += '</tbody></table></div>';
    }
    container.innerHTML = h;
  },

  formMoverStock() {
    var pdv = this.currentPDV;
    if (!pdv) return;
    var especias = ArcanoDB.getEspecias();
    var blends = ArcanoDB.getBlends();
    var h = '<p class="text-muted text-sm" style="margin-bottom:12px">Selecciona productos y cantidades para mover al PDV <strong>' + this.esc(pdv.nombre) + '</strong></p>';
    h += '<div id="pdv-stock-items">';
    // Especias
    if (especias.length > 0) {
      h += '<p class="fw7" style="margin:8px 0 4px">Especias</p>';
      for (var i = 0; i < especias.length; i++) {
        var e = especias[i];
        if ((e.stockChico || 0) === 0 && (e.stockGrande || 0) === 0) continue;
        h += '<div style="display:flex;align-items:center;gap:8px;margin:4px 0">' +
          '<span style="flex:1;font-size:0.85em">' + this.esc(e.nombre) + '</span>' +
          '<span class="text-muted text-sm">Ch:' + (e.stockChico || 0) + '</span>' +
          '<input type="number" class="input" style="width:60px" min="0" max="' + (e.stockChico || 0) + '" placeholder="0" data-tipo="especia" data-id="' + e.id + '" data-talla="chico">' +
          '<span class="text-muted text-sm">Gr:' + (e.stockGrande || 0) + '</span>' +
          '<input type="number" class="input" style="width:60px" min="0" max="' + (e.stockGrande || 0) + '" placeholder="0" data-tipo="especia" data-id="' + e.id + '" data-talla="grande"></div>';
      }
    }
    // Blends
    if (blends.length > 0) {
      h += '<p class="fw7" style="margin:12px 0 4px">Blends</p>';
      for (var j = 0; j < blends.length; j++) {
        var b = blends[j];
        if ((b.stockChico || 0) === 0 && (b.stockGrande || 0) === 0) continue;
        h += '<div style="display:flex;align-items:center;gap:8px;margin:4px 0">' +
          '<span style="flex:1;font-size:0.85em">' + this.esc(b.nombre) + '</span>' +
          '<span class="text-muted text-sm">Ch:' + (b.stockChico || 0) + '</span>' +
          '<input type="number" class="input" style="width:60px" min="0" max="' + (b.stockChico || 0) + '" placeholder="0" data-tipo="blend" data-id="' + b.id + '" data-talla="chico">' +
          '<span class="text-muted text-sm">Gr:' + (b.stockGrande || 0) + '</span>' +
          '<input type="number" class="input" style="width:60px" min="0" max="' + (b.stockGrande || 0) + '" placeholder="0" data-tipo="blend" data-id="' + b.id + '" data-talla="grande"></div>';
      }
    }
    h += '</div>';
    h += '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">' +
      '<button class="btn btn-outline" onclick="closeModal()">Cancelar</button>' +
      '<button class="btn btn-gold" onclick="PDV.doMoverStock()">Mover Stock</button></div>';
    openModal('Mover Stock a ' + pdv.nombre, h);
  },

  doMoverStock() {
    var pdv = this.currentPDV;
    if (!pdv) return;
    var inputs = document.querySelectorAll('#pdv-stock-items input[type=number]');
    var items = [];
    for (var i = 0; i < inputs.length; i++) {
      var inp = inputs[i];
      var cant = Number(inp.value) || 0;
      if (cant <= 0) continue;
      items.push({ tipo: inp.dataset.tipo, productoId: Number(inp.dataset.id), talla: inp.dataset.talla, cantidad: cant });
    }
    if (items.length === 0) { toast('Selecciona al menos un producto', 'err'); return; }
    try {
      ArcanoDB.moverStockAPDV(pdv.id, items);
      closeModal();
      toast('Stock movido correctamente');
      this.currentPDV = ArcanoDB.getPuntoDeVenta(pdv.id);
      this.render(document.getElementById('page-content'));
    } catch (e) { toast(e.message, 'err'); }
  },

  formDevolverStock() {
    var pdv = this.currentPDV;
    if (!pdv) return;
    var stock = pdv.stock || {};
    var keys = Object.keys(stock).filter(function(k) { return stock[k] > 0; });
    if (keys.length === 0) { toast('No hay stock para devolver', 'err'); return; }
    var h = '<p class="text-muted text-sm" style="margin-bottom:12px">Selecciona cantidades a devolver al inventario principal</p>';
    h += '<div id="pdv-devolver-items">';
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var parts = k.split('_');
      var tipo = parts[0], prodId = Number(parts[1]), talla = parts[2];
      var producto = tipo === 'especia' ? ArcanoDB.getEspecia(prodId) : ArcanoDB.getBlend(prodId);
      var nombre = producto ? producto.nombre : '?';
      h += '<div style="display:flex;align-items:center;gap:8px;margin:4px 0">' +
        '<span style="flex:1;font-size:0.85em">' + this.esc(nombre) + ' (' + talla + ')</span>' +
        '<span class="text-muted text-sm">En PDV: ' + stock[k] + '</span>' +
        '<input type="number" class="input" style="width:70px" min="0" max="' + stock[k] + '" placeholder="0" data-key="' + k + '" data-tipo="' + tipo + '" data-id="' + prodId + '" data-talla="' + talla + '"></div>';
    }
    h += '</div>';
    h += '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">' +
      '<button class="btn btn-outline" onclick="closeModal()">Cancelar</button>' +
      '<button class="btn btn-gold" onclick="PDV.doDevolverStock()">Devolver</button></div>';
    openModal('Devolver Stock de ' + pdv.nombre, h);
  },

  doDevolverStock() {
    var pdv = this.currentPDV;
    if (!pdv) return;
    var inputs = document.querySelectorAll('#pdv-devolver-items input[type=number]');
    var items = [];
    for (var i = 0; i < inputs.length; i++) {
      var cant = Number(inputs[i].value) || 0;
      if (cant <= 0) continue;
      items.push({ tipo: inputs[i].dataset.tipo, productoId: Number(inputs[i].dataset.id), talla: inputs[i].dataset.talla, cantidad: cant });
    }
    if (items.length === 0) { toast('Selecciona al menos un producto', 'err'); return; }
    try {
      ArcanoDB.devolverStockDePDV(pdv.id, items);
      closeModal();
      toast('Stock devuelto al inventario principal');
      this.currentPDV = ArcanoDB.getPuntoDeVenta(pdv.id);
      this.render(document.getElementById('page-content'));
    } catch (e) { toast(e.message, 'err'); }
  },

  /* ==================== VENTAS DEL PDV ==================== */
  renderVentas(container) {
    var pdv = this.currentPDV;
    if (!pdv) return;
    var ventas = ArcanoDB.getPDVVentas(pdv.id);
    var stats = ArcanoDB.getPDVStats(pdv.id);
    var h = '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
      '<button class="btn btn-ghost" onclick="PDV.go(null)">← Puntos de Venta</button>' +
      '<h3 style="margin:0">' + this.esc(pdv.nombre) + '</h3>' +
      '<span class="badge badge-green">Ventas</span></div>';
    h += '<div style="display:flex;gap:6px;margin:12px 0;flex-wrap:wrap">' +
      '<button class="btn btn-gold" onclick="PDV.go(' + pdv.id + ',\'pos\')">Nueva Venta</button>' +
      '<button class="btn btn-outline" onclick="PDV.showQR(' + pdv.id + ')">Mostrar QR</button>' +
      '</div>';
    h += '<div style="border-bottom:2px solid var(--border);margin:0 0 16px"></div>';
    // Summary cards
    h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-bottom:16px">' +
      '<div class="card"><div class="card-body text-center"><div class="fw7" style="font-size:1.3em">' + stats.totalVentas + '</div><div class="text-muted text-sm">Ventas</div></div></div>' +
      '<div class="card"><div class="card-body text-center"><div class="fw7" style="font-size:1.3em">$' + stats.totalIngresos.toLocaleString() + '</div><div class="text-muted text-sm">Ingresos</div></div></div>' +
      '<div class="card"><div class="card-body text-center"><div class="fw7" style="font-size:1.3em">$' + Math.round(stats.ticketPromedio).toLocaleString() + '</div><div class="text-muted text-sm">Ticket Prom.</div></div></div>' +
      '</div>';
    if (ventas.length === 0) {
      h += '<div class="card"><div class="card-body text-center text-muted" style="padding:32px">Sin ventas registradas</div></div>';
    } else {
      h += '<div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Items</th><th>Total</th><th>Detalle</th></tr></thead><tbody>';
      for (var i = 0; i < ventas.length; i++) {
        var v = ventas[i];
        var itemsStr = (v.items || []).map(function(it) { return it.productoNombre + ' x' + it.cantidad; }).join(', ');
        h += '<tr><td>' + (v.fecha || '').slice(0, 10) + '</td><td>' + itemsStr + '</td>' +
          '<td class="fw7">$' + (v.total || 0).toLocaleString() + '</td>' +
          '<td><button class="btn btn-sm btn-outline" onclick="PDV.verVentaDetalle(' + v.id + ')">Ver</button></td></tr>';
      }
      h += '</tbody></table></div>';
    }
    container.innerHTML = h;
  },

  verVentaDetalle(ventaId) {
    var v = null;
    var all = ArcanoDB.getPDVVentas(this.currentPDV.id);
    for (var i = 0; i < all.length; i++) { if (all[i].id === ventaId) { v = all[i]; break; } }
    if (!v) return;
    var h = '<p><strong>Fecha:</strong> ' + (v.fecha || '').slice(0, 10) + '</p>';
    h += '<div class="table-wrap" style="margin-top:12px"><table class="table"><thead><tr><th>Producto</th><th>Talla</th><th>Cant.</th><th>P.Unit</th><th>Subtotal</th></tr></thead><tbody>';
    for (var j = 0; j < (v.items || []).length; j++) {
      var it = v.items[j];
      h += '<tr><td>' + this.esc(it.productoNombre) + '</td><td>' + it.talla + '</td><td>' + it.cantidad + '</td>' +
        '<td>$' + (it.precioUnitario || 0).toLocaleString() + '</td><td class="fw7">$' + (it.subtotal || 0).toLocaleString() + '</td></tr>';
    }
    h += '</tbody></table></div>';
    h += '<p class="fw7" style="text-align:right;margin-top:12px;font-size:1.2em">Total: $' + (v.total || 0).toLocaleString() + '</p>';
    openModal('Detalle Venta #' + v.id, h);
  },

  /* ==================== POS (PUNTO DE VENTA) ==================== */
  _posCart: [],

  renderPos(container) {
    var pdv = this.currentPDV;
    if (!pdv) return;
    this._posCart = [];
    var especias = ArcanoDB.getEspecias();
    var blends = ArcanoDB.getBlends();
    var stock = pdv.stock || {};
    var h = '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
      '<button class="btn btn-ghost" onclick="PDV.go(' + pdv.id + ',\'ventas\')">← Ventas</button>' +
      '<h3 style="margin:0">' + this.esc(pdv.nombre) + '</h3>' +
      '<span class="badge badge-green">Nueva Venta</span></div>';
    h += '<div style="border-bottom:2px solid var(--border);margin:8px 0 12px"></div>';
    // Productos disponibles en PDV
    h += '<div style="display:flex;gap:6px;align-items:center;margin-bottom:12px">' +
      '<input type="text" class="input" id="pos-search" placeholder="Buscar producto..." style="flex:1" oninput="PDV.filterPos()">' +
      '</div>';
    h += '<div id="pos-products" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;max-height:50vh;overflow-y:auto">';
    var products = [];
    for (var i = 0; i < especias.length; i++) {
      var e = especias[i];
      var keyCh = 'especia_' + e.id + '_chico';
      var keyGr = 'especia_' + e.id + '_grande';
      if ((stock[keyCh] || 0) > 0) products.push({ tipo: 'especia', id: e.id, nombre: e.nombre, talla: 'chico', stock: stock[keyCh], precio: e.precioChico || 0 });
      if ((stock[keyGr] || 0) > 0) products.push({ tipo: 'especia', id: e.id, nombre: e.nombre, talla: 'grande', stock: stock[keyGr], precio: e.precioGrande || 0 });
    }
    for (var j = 0; j < blends.length; j++) {
      var b = blends[j];
      var keyCh2 = 'blend_' + b.id + '_chico';
      var keyGr2 = 'blend_' + b.id + '_grande';
      if ((stock[keyCh2] || 0) > 0) products.push({ tipo: 'blend', id: b.id, nombre: b.nombre, talla: 'chico', stock: stock[keyCh2], precio: b.precioChico || 0 });
      if ((stock[keyGr2] || 0) > 0) products.push({ tipo: 'blend', id: b.id, nombre: b.nombre, talla: 'grande', stock: stock[keyGr2], precio: b.precioGrande || 0 });
    }
    for (var p = 0; p < products.length; p++) {
      var pr = products[p];
      h += '<div class="card pos-product" data-name="' + this.esc(pr.nombre).toLowerCase() + '" onclick="PDV.posAdd(\'' + pr.tipo + '\',' + pr.id + ',\'' + pr.talla + '\',' + pr.precio + ',\'' + this.esc(pr.nombre) + '\',' + pr.stock + ')" style="cursor:pointer;padding:10px">' +
        '<div class="fw7" style="font-size:0.9em">' + this.esc(pr.nombre) + '</div>' +
        '<div class="text-muted text-sm">' + pr.talla + ' · Stock: ' + pr.stock + '</div>' +
        '<div class="fw7" style="color:var(--gold)">$' + pr.precio.toLocaleString() + '</div></div>';
    }
    h += '</div>';
    // Cart
    h += '<div style="border-top:2px solid var(--border);margin-top:12px;padding-top:12px">' +
      '<h4 style="margin:0 0 8px">Carrito <span id="pos-cart-count" class="badge badge-gold">0</span></h4>' +
      '<div id="pos-cart"></div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px">' +
      '<div class="fw7" style="font-size:1.3em">Total: $<span id="pos-total">0</span></div>' +
      '<button class="btn btn-gold btn-lg" onclick="PDV.posConfirmar()" id="pos-confirm-btn" disabled>Cobrar</button></div></div>';
    container.innerHTML = h;
  },

  filterPos() {
    var q = (document.getElementById('pos-search').value || '').toLowerCase();
    var cards = document.querySelectorAll('.pos-product');
    for (var i = 0; i < cards.length; i++) {
      var name = cards[i].dataset.name || '';
      cards[i].style.display = name.indexOf(q) >= 0 ? '' : 'none';
    }
  },

  posAdd(tipo, id, talla, precio, nombre, maxStock) {
    // Check if already in cart
    for (var i = 0; i < this._posCart.length; i++) {
      var c = this._posCart[i];
      if (c.tipo === tipo && c.productoId === id && c.talla === talla) {
        if (c.cantidad >= maxStock) { toast('Stock maximo alcanzado', 'err'); return; }
        c.cantidad++;
        c.subtotal = c.precioUnitario * c.cantidad;
        this._renderPosCart();
        return;
      }
    }
    this._posCart.push({ tipo: tipo, productoId: id, talla: talla, productoNombre: nombre, precioUnitario: precio, cantidad: 1, subtotal: precio });
    this._renderPosCart();
  },

  posRemove(idx) {
    this._posCart.splice(idx, 1);
    this._renderPosCart();
  },

  posChangeQty(idx, delta) {
    var item = this._posCart[idx];
    if (!item) return;
    var newQty = item.cantidad + delta;
    if (newQty <= 0) { this.posRemove(idx); return; }
    // Check stock
    var pdv = this.currentPDV;
    var key = item.tipo + '_' + item.productoId + '_' + item.talla;
    var maxStock = (pdv.stock || {})[key] || 0;
    if (newQty > maxStock) { toast('Stock maximo: ' + maxStock, 'err'); return; }
    item.cantidad = newQty;
    item.subtotal = item.precioUnitario * item.cantidad;
    this._renderPosCart();
  },

  _renderPosCart() {
    var cartEl = document.getElementById('pos-cart');
    var totalEl = document.getElementById('pos-total');
    var countEl = document.getElementById('pos-cart-count');
    var btn = document.getElementById('pos-confirm-btn');
    if (!cartEl) return;
    if (this._posCart.length === 0) {
      cartEl.innerHTML = '<p class="text-muted text-sm text-center" style="padding:12px">Carrito vacio</p>';
      if (totalEl) totalEl.textContent = '0';
      if (countEl) countEl.textContent = '0';
      if (btn) btn.disabled = true;
      return;
    }
    if (btn) btn.disabled = false;
    var h = '<div class="table-wrap"><table class="table"><thead><tr><th>Producto</th><th>Talla</th><th>Cant.</th><th>Subtotal</th><th></th></tr></thead><tbody>';
    var total = 0;
    for (var i = 0; i < this._posCart.length; i++) {
      var it = this._posCart[i];
      total += it.subtotal;
      h += '<tr><td>' + this.esc(it.productoNombre) + '</td><td>' + it.talla + '</td>' +
        '<td><button class="btn btn-sm btn-ghost" onclick="PDV.posChangeQty(' + i + ',-1)">-</button> ' + it.cantidad + ' <button class="btn btn-sm btn-ghost" onclick="PDV.posChangeQty(' + i + ',1)">+</button></td>' +
        '<td class="fw7">$' + it.subtotal.toLocaleString() + '</td>' +
        '<td><button class="btn btn-sm btn-red" onclick="PDV.posRemove(' + i + ')">X</button></td></tr>';
    }
    h += '</tbody></table></div>';
    cartEl.innerHTML = h;
    if (totalEl) totalEl.textContent = total.toLocaleString();
    if (countEl) countEl.textContent = this._posCart.length;
  },

  posConfirmar() {
    if (this._posCart.length === 0) return;
    var pdv = this.currentPDV;
    if (!pdv) return;
    if (!confirm('Confirmar venta por $' + this._posCart.reduce(function(s, it) { return s + it.subtotal; }, 0).toLocaleString() + '?')) return;
    try {
      var venta = ArcanoDB.savePDVVenta({
        puntoDeVentaId: pdv.id,
        puntoDeVentaNombre: pdv.nombre,
        items: this._posCart.map(function(it) {
          return { tipo: it.tipo, productoId: it.productoId, talla: it.talla, cantidad: it.cantidad, precioUnitario: it.precioUnitario };
        })
      });
      this._posCart = [];
      toast('Venta registrada! #' + venta.id);
      this.currentPDV = ArcanoDB.getPuntoDeVenta(pdv.id);
      this.renderPos(document.getElementById('page-content'));
    } catch (e) { toast(e.message, 'err'); }
  },

  /* ==================== ESTADÍSTICAS ==================== */
  renderStats(container) {
    var pdv = this.currentPDV;
    if (!pdv) return;
    var stats = ArcanoDB.getPDVStats(pdv.id);
    var h = '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
      '<button class="btn btn-ghost" onclick="PDV.go(null)">← Puntos de Venta</button>' +
      '<h3 style="margin:0">' + this.esc(pdv.nombre) + '</h3>' +
      '<span class="badge badge-blue">Estadisticas</span></div>';
    h += '<div style="border-bottom:2px solid var(--border);margin:8px 0 16px"></div>';
    // KPIs
    h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin-bottom:20px">' +
      '<div class="card"><div class="card-body text-center"><div class="fw7" style="font-size:1.5em;color:var(--gold)">$' + stats.totalIngresos.toLocaleString() + '</div><div class="text-muted text-sm">Ingresos Totales</div></div></div>' +
      '<div class="card"><div class="card-body text-center"><div class="fw7" style="font-size:1.5em">' + stats.totalVentas + '</div><div class="text-muted text-sm">Total Ventas</div></div></div>' +
      '<div class="card"><div class="card-body text-center"><div class="fw7" style="font-size:1.5em">$' + Math.round(stats.ticketPromedio).toLocaleString() + '</div><div class="text-muted text-sm">Ticket Promedio</div></div></div>' +
      '<div class="card"><div class="card-body text-center"><div class="fw7" style="font-size:1.5em">' + stats.productosEnStock + '</div><div class="text-muted text-sm">Productos en Stock</div></div></div>' +
      '<div class="card"><div class="card-body text-center"><div class="fw7" style="font-size:1.5em">' + stats.totalItemsEnStock + '</div><div class="text-muted text-sm">Unidades en Stock</div></div></div>' +
      '</div>';
    // Top productos
    h += '<h4 style="margin:20px 0 8px">Productos Mas Vendidos</h4>';
    if (stats.topProductos.length === 0) {
      h += '<p class="text-muted">Sin datos de ventas</p>';
    } else {
      h += '<div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>Producto</th><th>Unidades</th><th>Monto</th><th>% del Total</th></tr></thead><tbody>';
      for (var i = 0; i < stats.topProductos.length; i++) {
        var tp = stats.topProductos[i];
        var pct = stats.totalIngresos > 0 ? ((tp.monto / stats.totalIngresos) * 100).toFixed(1) : 0;
        h += '<tr><td>' + (i + 1) + '</td><td class="fw7">' + this.esc(tp.nombre) + '</td><td>' + tp.cantidad + '</td>' +
          '<td>$' + tp.monto.toLocaleString() + '</td><td>' + pct + '%</td></tr>';
      }
      h += '</tbody></table></div>';
    }
    // Ventas por dia
    var dias = Object.keys(stats.diario).sort();
    if (dias.length > 0) {
      h += '<h4 style="margin:20px 0 8px">Ventas por Dia</h4>';
      h += '<div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Ventas</th><th>Ingresos</th><th>Ticket Prom.</th></tr></thead><tbody>';
      for (var d = 0; d < dias.length; d++) {
        var di = stats.diario[dias[d]];
        h += '<tr><td>' + dias[d] + '</td><td>' + di.ventas + '</td>' +
          '<td>$' + di.ingresos.toLocaleString() + '</td>' +
          '<td>$' + (di.ventas > 0 ? Math.round(di.ingresos / di.ventas) : 0).toLocaleString() + '</td></tr>';
      }
      h += '</tbody></table></div>';
    }
    // Valorizacion del stock actual
    h += '<h4 style="margin:20px 0 8px">Valorizacion del Stock Actual</h4>';
    var stock = pdv.stock || {};
    var stockKeys = Object.keys(stock).filter(function(k) { return stock[k] > 0; });
    var stockValor = 0;
    if (stockKeys.length === 0) {
      h += '<p class="text-muted">Sin stock</p>';
    } else {
      h += '<div class="table-wrap"><table class="table"><thead><tr><th>Producto</th><th>Talla</th><th>Cant.</th><th>P.Unit</th><th>Valor</th></tr></thead><tbody>';
      for (var s = 0; s < stockKeys.length; s++) {
        var sk = stockKeys[s];
        var parts = sk.split('_');
        var tipo = parts[0], prodId = Number(parts[1]), talla = parts[2];
        var prod = tipo === 'especia' ? ArcanoDB.getEspecia(prodId) : ArcanoDB.getBlend(prodId);
        var precio = prod ? (talla === 'grande' ? prod.precioGrande : prod.precioChico) || 0 : 0;
        var valor = precio * stock[sk];
        stockValor += valor;
        h += '<tr><td>' + this.esc(prod ? prod.nombre : '?') + '</td><td>' + talla + '</td><td>' + stock[sk] + '</td>' +
          '<td>$' + precio.toLocaleString() + '</td><td class="fw7">$' + valor.toLocaleString() + '</td></tr>';
      }
      h += '</tbody></table></div>';
      h += '<p class="fw7" style="margin-top:8px;font-size:1.1em">Valor total en stock: $' + stockValor.toLocaleString() + '</p>';
    }
    container.innerHTML = h;
  },

  /* ==================== QR ==================== */
  showQR(id) {
    var pdv = ArcanoDB.getPuntoDeVenta(id);
    if (!pdv) return;
    var url = window.location.origin + window.location.pathname + '#pos=' + id;
    var h = '<div class="text-center" style="padding:12px">' +
      '<p class="fw7" style="font-size:1.1em;margin-bottom:4px">' + this.esc(pdv.nombre) + '</p>' +
      '<p class="text-muted text-sm" style="margin-bottom:12px">' + this.esc(pdv.ubicacion || '') + '</p>' +
      '<div id="qr-container" style="display:inline-block;padding:12px;background:white;border-radius:8px"></div>' +
      '<p class="text-sm text-muted" style="margin-top:12px;word-break:break-all">' + url + '</p>' +
      '<button class="btn btn-gold mt-12" onclick="PDV.go(' + id + ',\'pos\')" style="margin-top:12px">Abrir Ventas</button>' +
      '</div>';
    openModal('QR — Punto de Venta', h);
    // Generate QR using QR code API
    var qrContainer = document.getElementById('qr-container');
    if (qrContainer) {
      var img = document.createElement('img');
      img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(url);
      img.alt = 'QR Code';
      img.style.width = '200px';
      img.style.height = '200px';
      qrContainer.appendChild(img);
    }
  },

  /* ==================== HELPERS ==================== */
  esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};

// Listen for hash changes
document.addEventListener('hashchange', function() {
  if (App.currentPage === 'puntosdeventa') {
    PDV.render(document.getElementById('page-content'));
  }
});
