/* ===================== ARCANO V3 — PAGES (FIXED) ===================== */
const Pages = {

  /* ================================================================
     DASHBOARD — MAPA VISUAL COMPLETO DEL NEGOCIO
     ================================================================ */
  _dashCharts: [],

  renderDashboard(container) {
    if (Pages._dashCharts) { for (var _ci = 0; _ci < Pages._dashCharts.length; _ci++) { try { Pages._dashCharts[_ci].destroy(); } catch(e) {} } }
    Pages._dashCharts = [];

    var db = ArcanoDB.getDB();
    var stats = ArcanoDB.getStats();
    var ventas = ArcanoDB.getVentas();
    var pedidos = ArcanoDB.getPedidos();
    var producciones = ArcanoDB.getProducciones();
    var entradas = ArcanoDB.getEntradas();
    var especias = ArcanoDB.getEspecias();
    var blends = ArcanoDB.getBlends();
    var stickers = ArcanoDB.getStickers();
    var today = new Date().toISOString().slice(0, 10);
    var mes = new Date().toISOString().slice(0, 7);

    // === CALCULATE ALL KPIs ===
    var ventasHoy = [], ventasMes = [], pedidosNuevos = [];
    var totalIngresos = 0, totalUnidades = 0, totalOps = 0;
    var adminIngreso = 0, tiendaIngreso = 0;
    var efectivoIngreso = 0, qrIngreso = 0;
    var prodVentaMap = {}, tipoCount = {especia: 0, blend: 0}, tallaCount = {chico: 0, grande: 0};
    var diaMap = {}, monthMap = {};

    for (var vi = 0; vi < ventas.length; vi++) {
      var v = ventas[vi];
      var vf = v.fecha || '';
      totalIngresos += (v.total || 0);
      totalOps++;
      adminIngreso += (v.total || 0);
      if (v.metodoPago === 'qr') qrIngreso += (v.total || 0);
      else efectivoIngreso += (v.total || 0);
      if (vf === today) ventasHoy.push(v);
      if (vf && vf.startsWith(mes)) ventasMes.push(v);
      if (vf) {
        if (!diaMap[vf]) diaMap[vf] = {ops: 0, ingresos: 0};
        diaMap[vf].ops++;
        diaMap[vf].ingresos += (v.total || 0);
        var mn = vf.substring(0, 7);
        if (!monthMap[mn]) monthMap[mn] = {ops: 0, ingresos: 0};
        monthMap[mn].ops++;
        monthMap[mn].ingresos += (v.total || 0);
      }
      if (v.items) { for (var vi2 = 0; vi2 < v.items.length; vi2++) {
        var it = v.items[vi2];
        var iCant = it.cantidad || 0;
        totalUnidades += iCant;
        tipoCount[it.tipo || 'especia'] = (tipoCount[it.tipo || 'especia'] || 0) + iCant;
        tallaCount[it.talla || 'chico'] = (tallaCount[it.talla || 'chico'] || 0) + iCant;
        var pkey = it.productoNombre || '?';
        if (!prodVentaMap[pkey]) prodVentaMap[pkey] = 0;
        prodVentaMap[pkey] += (it.subtotal || 0);
      }}
    }
    // Include PDV ventas in payment totals
    var pdvs = ArcanoDB.getPDVs ? ArcanoDB.getPDVs() : [];
    var efectivoOps = 0, qrOps = 0;
    for (var pdvi = 0; pdvi < ventas.length; pdvi++) {
      if (ventas[pdvi].metodoPago === 'qr') qrOps++; else efectivoOps++;
    }
    for (var pdvi2 = 0; pdvi2 < pdvs.length; pdvi2++) {
      var pdvVtas = ArcanoDB.getPDVVentas(pdvs[pdvi2].id);
      for (var pdvVi = 0; pdvVi < pdvVtas.length; pdvVi++) {
        var pv = pdvVtas[pdvVi];
        totalIngresos += (pv.total || 0);
        totalOps++;
        adminIngreso += (pv.total || 0);
        if (pv.metodoPago === 'qr') { qrIngreso += (pv.total || 0); qrOps++; }
        else { efectivoIngreso += (pv.total || 0); efectivoOps++; }
        if (pv.fecha === today) ingresosHoy += (pv.total || 0);
        if (pv.fecha && pv.fecha.startsWith(mes)) { ingresosMes += (pv.total || 0); opsMes++; }
      }
    }
        for (var pi = 0; pi < pedidos.length; pi++) {
      var p = pedidos[pi];
      if (p.estado === 'nuevo') pedidosNuevos.push(p);
      if (p.estado === 'cancelado') continue;
      var pf = p.creado ? p.creado.slice(0, 10) : '';
      totalIngresos += (p.total || 0);
      totalOps++;
      tiendaIngreso += (p.total || 0);
      if (pf && pf.startsWith(mes)) ventasMes.push(p);
      if (pf) {
        if (!diaMap[pf]) diaMap[pf] = {ops: 0, ingresos: 0};
        diaMap[pf].ops++;
        diaMap[pf].ingresos += (p.total || 0);
      }
      if (p.items) { for (var pi2 = 0; pi2 < p.items.length; pi2++) {
        var pit = p.items[pi2];
        var pCant = pit.qty || pit.cantidad || 0;
        totalUnidades += pCant;
        tipoCount[pit.tipo || 'especia'] = (tipoCount[pit.tipo || 'especia'] || 0) + pCant;
        tallaCount[pit.talla || 'chico'] = (tallaCount[pit.talla || 'chico'] || 0) + pCant;
        var pkey2 = pit.nombre || '?';
        if (!prodVentaMap[pkey2]) prodVentaMap[pkey2] = 0;
        prodVentaMap[pkey2] += (pit.subtotal || 0);
      }}
    }

    var ingresosHoy = 0;
    for (var vi3 = 0; vi3 < ventasHoy.length; vi3++) ingresosHoy += (ventasHoy[vi3].total || 0);
    var ingresosMes = 0, opsMes = 0;
    for (var vi4 = 0; vi4 < ventasMes.length; vi4++) { ingresosMes += (ventasMes[vi4].total || 0); opsMes++; }

    var totalCostos = 0;
    for (var ei = 0; ei < entradas.length; ei++) totalCostos += (Number(entradas[ei].total) || 0);
    var margenBruto = totalIngresos - totalCostos;
    var margenPct = totalIngresos > 0 ? (margenBruto / totalIngresos * 100) : 0;

    var prodMesCount = 0, prodMesUds = 0;
    for (var pr = 0; pr < producciones.length; pr++) {
      var prd = producciones[pr];
      if (prd.fecha && prd.fecha.startsWith(mes)) { prodMesCount++; prodMesUds += (prd.cantidad || 0); }
    }

    var palaBaja = [], frascosBajos = [], stickerBajos = [];
    for (var ei2 = 0; ei2 < especias.length; ei2++) {
      var esp = especias[ei2];
      if ((esp.stockBolsa || 0) <= 50) palaBaja.push(esp);
      if ((esp.stockChico || 0) <= 3 && (esp.stockGrande || 0) <= 3) frascosBajos.push({nombre: esp.nombre, chico: esp.stockChico||0, grande: esp.stockGrande||0, tipo: 'especia'});
    }
    for (var bi = 0; bi < blends.length; bi++) {
      var bl = blends[bi];
      if ((bl.stockChico || 0) <= 3 && (bl.stockGrande || 0) <= 3) frascosBajos.push({nombre: bl.nombre, chico: bl.stockChico||0, grande: bl.stockGrande||0, tipo: 'blend'});
    }
    for (var si = 0; si < stickers.length; si++) {
      var stk = stickers[si];
      if (((stk.stockChico||0) + (stk.stockGrande||0)) <= 5) stickerBajos.push(stk);
    }
    var totalAlertas = palaBaja.length + frascosBajos.length + stickerBajos.length;

    var prodArr = [];
    var pkeys = Object.keys(prodVentaMap);
    for (var pk = 0; pk < pkeys.length; pk++) prodArr.push({nombre: pkeys[pk], ingreso: prodVentaMap[pkeys[pk]]});
    prodArr.sort(function(a, b) { return b.ingreso - a.ingreso; });

    // === BUILD HTML ===
    var h = '';

    // KPIs principales
    h += '<div class="dash-section-title"><span class="dash-dot" style="background:var(--gold)"></span>Resumen del Negocio</div>';
    h += '<div class="dash-kpi-row">';
    h += '<div class="dash-kpi-card dash-kpi-gold"><div class="dash-kpi-icon">$</div><div class="dash-kpi-body"><div class="dash-kpi-val">$' + ingresosHoy.toLocaleString() + '</div><div class="dash-kpi-lbl">Ventas Hoy</div></div></div>';
    h += '<div class="dash-kpi-card dash-kpi-blue"><div class="dash-kpi-icon">M</div><div class="dash-kpi-body"><div class="dash-kpi-val">$' + ingresosMes.toLocaleString() + '</div><div class="dash-kpi-lbl">Ingresos del Mes</div><div class="dash-kpi-sub">' + opsMes + ' operaciones</div></div></div>';
    var mClr = margenPct >= 0 ? 'var(--green)' : 'var(--red)';
    h += '<div class="dash-kpi-card"><div class="dash-kpi-icon" style="color:var(--green)">%a</div><div class="dash-kpi-body"><div class="dash-kpi-val" style="color:' + mClr + '">' + margenPct.toFixed(1) + '%</div><div class="dash-kpi-lbl">Margen Bruto</div><div class="dash-kpi-sub">Ingreso $' + totalIngresos.toLocaleString() + ' - Costos $' + totalCostos.toLocaleString() + '</div></div></div>';
    h += '<div class="dash-kpi-card ' + (totalAlertas > 0 ? 'dash-kpi-red' : 'dash-kpi-green') + '"><div class="dash-kpi-icon">!</div><div class="dash-kpi-body"><div class="dash-kpi-val">' + totalAlertas + '</div><div class="dash-kpi-lbl">Alertas de Stock</div><div class="dash-kpi-sub">' + palaBaja.length + ' pala, ' + frascosBajos.length + ' frascos, ' + stickerBajos.length + ' stk</div></div></div>';
    h += '</div>';

    // Segunda fila
    h += '<div class="dash-kpi-row dash-kpi-sm">';
    h += '<div class="dash-mini"><div class="dash-mini-val">' + totalUnidades + '</div><div class="dash-mini-lbl">Unidades Vendidas</div></div>';
    h += '<div class="dash-mini"><div class="dash-mini-val">$' + (totalOps > 0 ? Math.round(totalIngresos / totalOps) : 0).toLocaleString() + '</div><div class="dash-mini-lbl">Ticket Promedio</div></div>';
    h += '<div class="dash-mini"><div class="dash-mini-val">' + prodMesCount + '</div><div class="dash-mini-lbl">Producciones Mes</div><div class="dash-mini-sub">' + prodMesUds + ' frascos</div></div>';
    h += '<div class="dash-mini"><div class="dash-mini-val">' + stats.totalFrascos + '</div><div class="dash-mini-lbl">Frascos en Stock</div><div class="dash-mini-sub">' + stats.frascosChico + ' pq / ' + stats.frascosGrande + ' gr</div></div>';
    h += '<div class="dash-mini"><div class="dash-mini-val">' + stats.totalProductos + '</div><div class="dash-mini-lbl">Productos Activos</div><div class="dash-mini-sub">' + stats.totalEspecias + ' esp + ' + stats.totalBlends + ' bl</div></div>';
    h += '<div class="dash-mini"><div class="dash-mini-val">' + pedidosNuevos.length + '</div><div class="dash-mini-lbl">Pedidos Nuevos</div></div>';
    h += '</div>';

    // PANEL METODOS DE PAGO
    var _pmTotal = efectivoIngreso + qrIngreso;
    var _pmEfectivoPct = _pmTotal > 0 ? Math.round(efectivoIngreso / _pmTotal * 100) : 0;
    var _pmQrPct = _pmTotal > 0 ? Math.round(qrIngreso / _pmTotal * 100) : 0;
    h += '<div class="dash-section-title"><span class="dash-dot" style="background:var(--green)"></span>Metodos de Pago</div>';
    h += '<div class="card" style="overflow:hidden">';
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0">';
    h += '<div style="padding:24px;text-align:center;border-right:1px solid var(--border)">';
    h += '<div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);margin-bottom:8px">Efectivo</div>';
    h += '<div style="font-size:1.8rem;font-weight:800;color:var(--green)">$' + efectivoIngreso.toLocaleString() + '</div>';
    h += '<div style="font-size:0.8rem;color:var(--muted);margin-top:4px">' + _pmEfectivoPct + '% del total</div>';
    h += '<div style="font-size:0.75rem;color:var(--muted);margin-top:2px">' + efectivoOps + ' operaciones</div>';
    h += '</div>';
    h += '<div style="padding:24px;text-align:center">';
    h += '<div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);margin-bottom:8px">QR</div>';
    h += '<div style="font-size:1.8rem;font-weight:800;color:#8e44ad">$' + qrIngreso.toLocaleString() + '</div>';
    h += '<div style="font-size:0.8rem;color:var(--muted);margin-top:4px">' + _pmQrPct + '% del total</div>';
    h += '<div style="font-size:0.75rem;color:var(--muted);margin-top:2px">' + qrOps + ' operaciones</div>';
    h += '</div></div>';
    h += '<div style="padding:0 24px 20px">';
    h += '<div style="display:flex;height:10px;border-radius:5px;overflow:hidden;background:var(--bg3)">';
    h += '<div style="width:' + _pmEfectivoPct + '%;background:var(--green);transition:width 0.5s"></div>';
    h += '<div style="width:' + _pmQrPct + '%;background:#8e44ad;transition:width 0.5s"></div>';
    h += '</div>';
    h += '<div style="display:flex;justify-content:space-between;margin-top:8px;font-size:0.7rem;color:var(--muted)">';
    h += '<span>Efectivo ' + _pmEfectivoPct + '%</span>';
    h += '<span>Total: $' + _pmTotal.toLocaleString() + '</span>';
    h += '<span>QR ' + _pmQrPct + '%</span>';
    h += '</div></div></div>';

    // Canal de venta + Composicion
    h += '<div class="dash-section-title"><span class="dash-dot" style="background:var(--blue)"></span>Analisis de Ventas</div>';
    h += '<div class="dash-grid-2">';
    h += '<div class="dash-card"><h4>Canal de Venta</h4>';
    var totalCanal = adminIngreso + tiendaIngreso;
    var admPct = totalCanal > 0 ? Math.round(adminIngreso / totalCanal * 100) : 0;
    var tiePct = totalCanal > 0 ? Math.round(tiendaIngreso / totalCanal * 100) : 0;
    h += '<div class="dash-canal-row"><div class="dash-canal-item"><div class="dash-canal-bar-track"><div class="dash-canal-bar-fill" style="width:' + admPct + '%;background:var(--gold)"></div></div><div class="dash-canal-info"><span class="dash-canal-name">Ventas Admin</span><span class="dash-canal-val">$' + adminIngreso.toLocaleString() + ' (' + admPct + '%)</span></div></div>';
    h += '<div class="dash-canal-item"><div class="dash-canal-bar-track"><div class="dash-canal-bar-fill" style="width:' + tiePct + '%;background:var(--blue)"></div></div><div class="dash-canal-info"><span class="dash-canal-name">Tienda Online</span><span class="dash-canal-val">$' + tiendaIngreso.toLocaleString() + ' (' + tiePct + '%)</span></div></div></div></div>';

    // Composicion con SVG rings
    h += '<div class="dash-card"><h4>Composicion de Ventas</h4><div class="dash-comp-grid">';
    var tipoTotal = (tipoCount.especia || 0) + (tipoCount.blend || 0);
    var espPct = tipoTotal > 0 ? Math.round((tipoCount.especia || 0) / tipoTotal * 100) : 50;
    var blPct = 100 - espPct;
    var tallaTotal = (tallaCount.chico || 0) + (tallaCount.grande || 0);
    var chPct = tallaTotal > 0 ? Math.round((tallaCount.chico || 0) / tallaTotal * 100) : 50;
    var grPct = 100 - chPct;
    h += '<div class="dash-comp-item"><div class="dash-comp-ring"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--bg4)" stroke-width="3"></circle><circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--gold)" stroke-dasharray="' + espPct + ' ' + (100 - espPct) + '" stroke-dashoffset="25" stroke-linecap="round"></circle></svg><div class="dash-comp-center">' + espPct + '%</div></div><div class="dash-comp-label">Especias <b>' + (tipoCount.especia || 0) + '</b></div></div>';
    h += '<div class="dash-comp-item"><div class="dash-comp-ring"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--bg4)" stroke-width="3"></circle><circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--blue)" stroke-dasharray="' + blPct + ' ' + (100 - blPct) + '" stroke-dashoffset="25" stroke-linecap="round"></circle></svg><div class="dash-comp-center">' + blPct + '%</div></div><div class="dash-comp-label">Blends <b>' + (tipoCount.blend || 0) + '</b></div></div>';
    h += '<div class="dash-comp-item"><div class="dash-comp-ring"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--bg4)" stroke-width="3"></circle><circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--gold2)" stroke-dasharray="' + chPct + ' ' + (100 - chPct) + '" stroke-dashoffset="25" stroke-linecap="round"></circle></svg><div class="dash-comp-center">' + chPct + '%</div></div><div class="dash-comp-label">Pequeno <b>' + (tallaCount.chico || 0) + '</b></div></div>';
    h += '<div class="dash-comp-item"><div class="dash-comp-ring"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--bg4)" stroke-width="3"></circle><circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--green)" stroke-dasharray="' + grPct + ' ' + (100 - grPct) + '" stroke-dashoffset="25" stroke-linecap="round"></circle></svg><div class="dash-comp-center">' + grPct + '%</div></div><div class="dash-comp-label">Grande <b>' + (tallaCount.grande || 0) + '</b></div></div>';
    h += '</div></div></div>';

    // Charts
    h += '<div class="dash-section-title"><span class="dash-dot" style="background:var(--green)"></span>Tendencias</div>';
    h += '<div class="dash-grid-2">';
    h += '<div class="dash-card"><h4>Ingresos Ultimos 15 Dias</h4><div class="dash-chart-wrap"><canvas id="dash-chart-daily"></canvas></div></div>';
    h += '<div class="dash-card"><h4>Ingresos Mensuales</h4><div class="dash-chart-wrap"><canvas id="dash-chart-monthly"></canvas></div></div>';
    h += '</div>';

    // Top productos + Pedidos nuevos
    h += '<div class="dash-section-title"><span class="dash-dot" style="background:var(--yellow)"></span>Actividad Reciente</div>';
    h += '<div class="dash-grid-2">';
    h += '<div class="dash-card"><h4>Top 5 Productos por Ingreso</h4>';
    if (prodArr.length > 0) {
      var maxIngreso = prodArr[0].ingreso || 1;
      h += '<div class="dash-top-list">';
      for (var tp = 0; tp < Math.min(5, prodArr.length); tp++) {
        var pp = prodArr[tp];
        var barW = Math.max(4, Math.round((pp.ingreso / maxIngreso) * 100));
        h += '<div class="dash-top-item"><div class="dash-top-info"><span class="dash-top-rank">' + (tp + 1) + '</span><span class="dash-top-name">' + pp.nombre + '</span></div><div class="dash-top-bar-track"><div class="dash-top-bar-fill" style="width:' + barW + '%"></div></div><div class="dash-top-val">$' + pp.ingreso.toLocaleString() + '</div></div>';
      }
      h += '</div>';
    } else { h += '<div class="est-empty">Sin datos de ventas</div>'; }
    h += '</div>';

    // Pedidos nuevos
    h += '<div class="dash-card ' + (pedidosNuevos.length > 0 ? 'dash-card-alert' : '') + '"><h4>' + (pedidosNuevos.length > 0 ? '<span style="color:var(--red)">Pedidos Nuevos (' + pedidosNuevos.length + ')</span>' : 'Pedidos Nuevos') + '</h4>';
    if (pedidosNuevos.length > 0) {
      h += '<div class="dash-pedidos-list">';
      for (var pn = 0; pn < pedidosNuevos.length; pn++) {
        var ped = pedidosNuevos[pn];
        var cl = ped.cliente || {};
        var hora = ped.creado ? ped.creado.slice(11, 16) : '';
        h += '<div class="dash-pedido-item"><div class="dash-pedido-left"><div class="dash-pedido-time">' + hora + '</div><div class="dash-pedido-cliente">' + (cl.nombre || '?') + '</div><div class="dash-pedido-ciudad">' + (cl.ciudad || '') + '</div></div><div class="dash-pedido-right"><div class="dash-pedido-total">$' + (ped.total || 0).toLocaleString() + '</div><div class="dash-pedido-items">' + ((ped.items || []).length) + ' items</div></div></div>';
      }
      h += '</div>';
    } else { h += '<div class="est-empty">Sin pedidos pendientes</div>'; }
    h += '</div></div>';

    // Inventario
    h += '<div class="dash-section-title"><span class="dash-dot" style="background:var(--red)"></span>Estado del Inventario</div>';
    h += '<div class="dash-grid-3">';
    h += '<div class="dash-card"><h4>Envases</h4>';
    h += '<div class="dash-stock-row"><span>Pequenos</span><span class="dash-stock-val" style="color:' + (stats.envasesChico <= 10 ? 'var(--red)' : 'var(--green)') + '">' + stats.envasesChico.toLocaleString() + '</span></div><div class="dash-stock-bar-track"><div class="dash-stock-bar-fill" style="width:' + Math.min(100, stats.envasesChico / 500 * 100) + '%;background:' + (stats.envasesChico <= 10 ? 'var(--red)' : 'var(--green)') + '"></div></div>';
    h += '<div class="dash-stock-row" style="margin-top:8px"><span>Grandes</span><span class="dash-stock-val" style="color:' + (stats.envasesGrande <= 10 ? 'var(--red)' : 'var(--green)') + '">' + stats.envasesGrande.toLocaleString() + '</span></div><div class="dash-stock-bar-track"><div class="dash-stock-bar-fill" style="width:' + Math.min(100, stats.envasesGrande / 500 * 100) + '%;background:' + (stats.envasesGrande <= 10 ? 'var(--red)' : 'var(--green)') + '"></div></div></div>';
    h += '<div class="dash-card"><h4>Bolsas</h4>';
    h += '<div class="dash-stock-row"><span>Pequenas</span><span class="dash-stock-val" style="color:' + (stats.bolsasChico <= 10 ? 'var(--red)' : 'var(--green)') + '">' + stats.bolsasChico.toLocaleString() + '</span></div><div class="dash-stock-bar-track"><div class="dash-stock-bar-fill" style="width:' + Math.min(100, stats.bolsasChico / 500 * 100) + '%;background:' + (stats.bolsasChico <= 10 ? 'var(--red)' : 'var(--green)') + '"></div></div>';
    h += '<div class="dash-stock-row" style="margin-top:8px"><span>Grandes</span><span class="dash-stock-val" style="color:' + (stats.bolsasGrande <= 10 ? 'var(--red)' : 'var(--green)') + '">' + stats.bolsasGrande.toLocaleString() + '</span></div><div class="dash-stock-bar-track"><div class="dash-stock-bar-fill" style="width:' + Math.min(100, stats.bolsasGrande / 500 * 100) + '%;background:' + (stats.bolsasGrande <= 10 ? 'var(--red)' : 'var(--green)') + '"></div></div></div>';
    h += '<div class="dash-card ' + (totalAlertas > 0 ? 'dash-card-alert' : '') + '"><h4>' + (totalAlertas > 0 ? '<span style="color:var(--red)">Alertas de Stock</span>' : 'Stock Saludable') + '</h4>';
    if (totalAlertas > 0) {
      h += '<div class="dash-alert-list">';
      for (var ai = 0; ai < Math.min(palaBaja.length, 4); ai++) h += '<div class="dash-alert-item dash-alert-yellow">PALA: ' + palaBaja[ai].nombre + ' <b>' + (palaBaja[ai].stockBolsa || 0) + 'g</b></div>';
      for (var ai2 = 0; ai2 < Math.min(frascosBajos.length, 3); ai2++) h += '<div class="dash-alert-item dash-alert-red">FRASCO: ' + frascosBajos[ai2].nombre + ' <b>pq:' + frascosBajos[ai2].chico + ' gr:' + frascosBajos[ai2].grande + '</b></div>';
      for (var ai3 = 0; ai3 < Math.min(stickerBajos.length, 3); ai3++) h += '<div class="dash-alert-item dash-alert-blue">STICKER: ' + (stickerBajos[ai3].nombre || '?') + ' <b>' + ((stickerBajos[ai3].stockChico||0) + (stickerBajos[ai3].stockGrande||0)) + '</b></div>';
      h += '</div>';
    } else { h += '<div class="est-empty">Todo el inventario esta OK</div>'; }
    h += '</div></div>';

    // Ultimas operaciones
    h += '<div class="dash-section-title"><span class="dash-dot" style="background:var(--text3)"></span>Ultimas Operaciones</div>';
    h += '<div class="dash-grid-2">';
    h += '<div class="dash-card"><h4>Ultimas Ventas</h4>';
    var ultVentas = ventas.slice(0, 5);
    if (ultVentas.length === 0) { h += '<div class="est-empty">Sin ventas</div>'; }
    else {
      h += '<div class="dash-ops-list">';
      for (var uv = 0; uv < ultVentas.length; uv++) {
        var uv2 = ultVentas[uv];
        var uvItems = '';
        if (uv2.items) { for (var uv3 = 0; uv3 < Math.min(2, uv2.items.length); uv3++) { uvItems += (uv2.items[uv3].productoNombre || '?') + ' x' + (uv2.items[uv3].cantidad || 0); if (uv3 < Math.min(2, uv2.items.length) - 1) uvItems += ', '; } if ((uv2.items||[]).length > 2) uvItems += '...'; }
        h += '<div class="dash-op-item"><div class="dash-op-left"><span class="dash-op-date">' + (uv2.fecha || '') + '</span><span class="dash-op-detail">' + uvItems + '</span></div><div class="dash-op-val">$' + (uv2.total || 0).toLocaleString() + '</div></div>';
      }
      h += '</div>';
    }
    h += '</div>';
    h += '<div class="dash-card"><h4>Ultimas Producciones</h4>';
    var ultProd = producciones.slice(0, 5);
    if (ultProd.length === 0) { h += '<div class="est-empty">Sin producciones</div>'; }
    else {
      h += '<div class="dash-ops-list">';
      for (var up = 0; up < ultProd.length; up++) {
        var upr = ultProd[up];
        var tClr = (upr.talla || 'chico') === 'grande' ? 'var(--gold)' : 'var(--blue)';
        h += '<div class="dash-op-item"><div class="dash-op-left"><span class="dash-op-date">' + (upr.fecha || '') + '</span><span class="dash-op-detail">' + (upr.productoNombre || '') + ' <span style="color:' + tClr + ';font-weight:700">' + (upr.talla || 'chico') + '</span></span></div><div class="dash-op-val" style="color:var(--green)">+' + (upr.cantidad || 0) + ' frascos</div></div>';
      }
      h += '</div>';
    }
    h += '</div></div>';

    container.innerHTML = h;

    // === CHARTS ===
    Chart.defaults.color = '#9a8a78';
    Chart.defaults.borderColor = '#3a2218';
    Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    var diasSorted = Object.keys(diaMap).sort().slice(-15);
    var ctxD = document.getElementById('dash-chart-daily');
    if (ctxD && diasSorted.length > 0) {
      var dLabels = [], dData = [];
      for (var dd = 0; dd < diasSorted.length; dd++) { dLabels.push(diasSorted[dd].slice(5)); dData.push(diaMap[diasSorted[dd]].ingresos); }
      Pages._dashCharts.push(new Chart(ctxD, { type: 'bar', data: { labels: dLabels, datasets: [{ label: 'Ingresos', data: dData, backgroundColor: 'rgba(232,184,75,0.6)', borderColor: '#e8b84b', borderWidth: 1, borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: function(v) { return '$' + v.toLocaleString(); } }, grid: { color: 'rgba(58,34,24,0.4)' } }, x: { grid: { display: false } } } } }));
    }
    var mesesSorted = Object.keys(monthMap).sort().slice(-12);
    var ctxM = document.getElementById('dash-chart-monthly');
    if (ctxM && mesesSorted.length > 0) {
      var mLabels = [], mData = [];
      for (var mm = 0; mm < mesesSorted.length; mm++) { mLabels.push(mesesSorted[mm]); mData.push(monthMap[mesesSorted[mm]].ingresos); }
      Pages._dashCharts.push(new Chart(ctxM, { type: 'bar', data: { labels: mLabels, datasets: [{ label: 'Ingresos', data: mData, backgroundColor: 'rgba(93,173,226,0.6)', borderColor: '#5dade2', borderWidth: 1, borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: function(v) { return '$' + v.toLocaleString(); } }, grid: { color: 'rgba(58,34,24,0.4)' } }, x: { grid: { display: false } } } } }));
    }
    var chartWraps = container.querySelectorAll('.dash-chart-wrap');
    for (var cw = 0; cw < chartWraps.length; cw++) chartWraps[cw].style.height = '220px';
  },

  verPedido(key) {
    App.navigate('pedidos');
    setTimeout(function() { var btn = document.querySelector('[data-pedido-key="' + key + '"]'); if (btn) btn.click(); }, 300);
  },

  /* ================================================================
     PRODUCTOS
     ================================================================ */
  renderProductos(container) {
    var especias = ArcanoDB.getEspecias();
    var blends = ArcanoDB.getBlends();
    var tab = window._prodTab || 'especias';
    var packs = ArcanoDB.getPacks();

    var h = '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">' +
      '<div class="tabs" style="margin-bottom:0;border-bottom:none">' +
        `<button class="tab${tab==='especias' ? ' active' : ''}" onclick="window._prodTab='especias';App.renderPage(\'productos\')">Especias<span class="tab-count">${especias.length}</span></button>` +
        `<button class="tab${tab==='blends' ? ' active' : ''}" onclick="window._prodTab='blends';App.renderPage(\'productos\')">Blends<span class="tab-count">${blends.length}</span></button>` +
        `<button class="tab${tab==='uso' ? ' active' : ''}" onclick="window._prodTab='uso';App.renderPage(\'productos\')">Etiquetas de uso</button>` +
        `<button class="tab${tab==='packs' ? ' active' : ''}" onclick="window._prodTab='packs';App.renderPage(\'productos\')">Packs<span class="tab-count">${packs.length}</span></button>` +
      '</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
        (tab==='especias' ? '<button class="btn btn-gold" onclick="Pages.formEspecia()">+ Especia</button><button class="btn btn-outline" style="border-color:var(--green);color:var(--green)" onclick="Pages.formImportarExcel()">Importar Excel</button>' : '') +
        (tab==='blends' ? '<button class="btn btn-gold" onclick="Pages.formBlend()">+ Blend</button>' : '') +
        (tab==='packs' ? '<button class="btn btn-gold" onclick="Pages.formPack()">+ Pack</button>' : '') +
      '</div></div>';

    h += '<div style="border-bottom:2px solid var(--border);margin:8px 0 16px"></div>';

    // --- TAB: ESPECIAS ---
    if (tab === 'especias') {
      if (especias.length === 0) {
        h += '<div class="card"><div class="card-body"><p class="text-muted text-center" style="padding:32px">Sin especias. Crea una o importa desde Excel.</p></div></div>';
      } else {
        h += '<div class="table-wrap"><table class="table"><thead><tr><th>Nombre</th><th>Cat.</th><th>Pala</th><th>Grs/Ch</th><th>Grs/Gr</th><th>$Pequeño</th><th>$Grande</th><th>Fr.Ch</th><th>Fr.Gr</th><th>Acciones</th></tr></thead><tbody>';
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
              '<button class="btn btn-sm ' + (e.enTienda ? 'btn-green' : 'btn-outline') + ' mr-4" onclick="ArcanoDB.toggleTienda(\'especia\',' + e.id + ');App.renderPage(\'productos\')" title="Tienda">' + (e.enTienda ? 'Tienda ON' : 'Tienda') + '</button>' +
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
        h += '<div class="table-wrap"><table class="table"><thead><tr><th>Nombre</th><th>Cat.</th><th>Region</th><th>Ingredientes</th><th>$Pequeño</th><th>$Grande</th><th>Fr.Ch</th><th>Fr.Gr</th><th>Acciones</th></tr></thead><tbody>';
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
              '<button class="btn btn-sm btn-outline mr-4" onclick="Pages.formBlend(' + b.id + ')" title="Editar">Editar</button>' +
              '<button class="btn btn-sm ' + (b.enTienda ? 'btn-green' : 'btn-outline') + ' mr-4" onclick="ArcanoDB.toggleTienda(\'blend\',' + b.id + ');App.renderPage(\'productos\')" title="Tienda">' + (b.enTienda ? 'Tienda ON' : 'Tienda') + '</button>' +
              '<button class="btn btn-sm btn-green mr-4" onclick="Pages.formProduccionRapida(\'blend\',' + b.id + ')">Producir</button>' +
              '<button class="btn btn-sm btn-red" onclick="Pages.delBlend(' + b.id + ')">X</button>' +
            '</td></tr>';
        }
        h += '</tbody></table></div>';
      }
    }

    // --- TAB: ETIQUETAS DE USO ---
    if (tab === 'uso') {
      var allTags = ArcanoDB.getProductTags();
      var catKeys = ['Comidas', 'Infusiones', 'Cocteleria'];
      h += '<div class="card"><div class="card-body">';
      for (var ci = 0; ci < catKeys.length; ci++) {
        var cat = catKeys[ci];
        var tags = allTags[cat] || [];
        h += '<div style="margin-bottom:20px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><span class="badge badge-gold" style="min-width:100px;text-align:center">' + cat + '</span>' +
          `<input type="text" class="input" id="new-tag-${ci}" placeholder="Nueva etiqueta de uso..." style="flex:1;padding:6px 10px;font-size:.85rem" onkeydown="if(event.key==='Enter')Pages.doAddTag('${cat}',${ci})">` +
          `<button class="btn btn-sm btn-outline" onclick="Pages.doAddTag('${cat}',${ci})">+ Agregar</button></div>` +
          '<div style="display:flex;flex-wrap:wrap;gap:6px">';
        for (var ti = 0; ti < tags.length; ti++) {
          h += '<span class="tag-chip-admin"><span>' + tags[ti] + '</span><button onclick="Pages.doRemoveTag(\'' + cat + '\',\'' + tags[ti].replace(/'/g, '&apos;') + '\')" style="background:none;border:none;cursor:pointer;color:var(--red);font-size:1rem;padding:0 2px">X</button></span>';
        }
        if (tags.length === 0) h += '<span class="text-sm text-muted">Sin etiquetas de uso</span>';
        h += '</div></div>';
      }
      h += '</div></div>';
    }

    // --- TAB: PACKS ---
    if (tab === 'packs') {
      if (packs.length === 0) {
        h += '<div class="card"><div class="card-body"><p class="text-muted text-center" style="padding:32px">Sin packs. Crea un pack de productos.</p></div></div>';
      } else {
        h += '<div class="table-wrap"><table class="table"><thead><tr><th>Nombre</th><th>Componentes</th><th>Frascos</th><th>Costo</th><th>P. Venta</th><th>Margen</th><th>Acciones</th></tr></thead><tbody>';
        for (var pi = 0; pi < packs.length; pi++) {
          var pk = packs[pi];
          h += '<tr><td>' + (pk.imagen ? '<img src="' + pk.imagen + '" style="width:36px;height:36px;border-radius:6px;object-fit:cover;vertical-align:middle;margin-right:6px"> ' : '') + '<span class="fw7">' + pk.nombre + '</span></td>' +
            '<td>' + (pk.componentes || []).length + ' items</td>' +
            '<td>' + (pk.totalFrascos || 0) + '</td>' +
            '<td>$' + (pk.costoTotal || 0).toLocaleString() + '</td>' +
            '<td class="fw7">$' + (pk.precioVenta || 0).toLocaleString() + '</td>' +
            '<td class="' + ((pk.margen || 0) >= 0 ? 'text-green' : 'text-red') + '">$' + (pk.margen || 0).toLocaleString() + '</td>' +
            '<td><button class="btn btn-sm ' + (pk.enTienda ? 'btn-green' : 'btn-outline') + '" style="margin-bottom:4px" onclick="ArcanoDB.toggleTienda(\'pack\',' + pk.id + ');App.renderPage(\'productos\')">' + (pk.enTienda ? 'En Tienda' : 'Publicar') + '</button></td>' +
            '<td>' +
              '<button class="btn btn-sm btn-outline mr-4" onclick="Pages.formPack(' + pk.id + ')">Editar</button>' +
              '<button class="btn btn-sm btn-red" onclick="Pages.doDeletePack(' + pk.id + ')">X</button>' +
            '</td></tr>';
        }
        h += '</tbody></table></div>';
      }
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
        '<div class="form-group"><label>Nombre</label><input type="text" class="input" id="f-esp-nombre" value="' + (isEdit ? esp.nombre : '') + '" placeholder="Ej: Curcuma" ' + '></div>' +
        '<div class="form-group"><label>Categoria</label><select class="input" id="f-esp-cat" onchange="Pages.refreshTagSelector(\'esp\')">' +
          '<option value="Comidas"' + (isEdit && esp.categoria==='Comidas' ? ' selected' : '') + '>Comidas</option>' +
          '<option value="Infusiones"' + (isEdit && esp.categoria==='Infusiones' ? ' selected' : '') + '>Infusiones</option>' +
          '<option value="Cocteleria"' + (isEdit && esp.categoria==='Cocteleria' ? ' selected' : '') + '>Cocteleria</option>' +
        '</select></div>' +
        '<div class="card" style="border-color:var(--gold)"><div class="card-header"><h3>Precios de Venta</h3></div><div class="card-body">' +
        '<div class="g2"><div class="form-group"><label>Precio Pequeño ($)</label><input type="number" class="input" id="f-esp-pc" value="' + (isEdit ? esp.precioChico : '') + '" placeholder="Ej: 8000" min="0"></div>' +
        '<div class="form-group"><label>Precio Grande ($)</label><input type="number" class="input" id="f-esp-pg" value="' + (isEdit ? esp.precioGrande : '') + '" placeholder="Ej: 18000" min="0"></div></div>' +
        '<p class="text-xs text-muted">Estos son los precios que se mostraran en la tienda.</p></div></div>' +
        '<div class="g2"><div class="form-group"><label>Gramos por Frasco Pequeño</label><input type="number" class="input" id="f-esp-gc" value="' + (isEdit ? esp.gramosChico : '') + '" placeholder="Ej: 30" min="0"></div>' +
        '<div class="form-group"><label>Gramos por Frasco Grande</label><input type="number" class="input" id="f-esp-gg" value="' + (isEdit ? esp.gramosGrande : '') + '" placeholder="Ej: 80" min="0"></div></div>' +
        '<div class="card mt-12" style="background:var(--bg);border-color:var(--gold)"><div class="card-header"><h3>Tienda Online</h3></div><div class="card-body">' +
        '<div class="form-group"><label>Visible en Tienda</label><select class="input" id="f-esp-tienda"><option value="0"' + (isEdit && !esp.enTienda ? ' selected' : '') + '>No</option><option value="1"' + (isEdit && esp.enTienda ? ' selected' : (!isEdit ? ' selected' : '')) + '>Si</option></select></div>' +
        '<p class="text-xs text-muted mb-8">Precio especial para la tienda online (opcional). Si lo dejas vacio se usara el precio de venta.</p>' +
        '<div class="g2"><div class="form-group"><label>Precio Tienda Pequeño ($)</label><input type="number" class="input" id="f-esp-tc" value="' + (isEdit ? (esp.precioTiendaChico||'') : '') + '" placeholder="Igual al de venta" min="0"></div>' +
        '<div class="form-group"><label>Precio Tienda Grande ($)</label><input type="number" class="input" id="f-esp-tg" value="' + (isEdit ? (esp.precioTiendaGrande||'') : '') + '" placeholder="Igual al de venta" min="0"></div></div>' +
        '<div class="form-group"><label>Imagen</label><div class="img-upload-area" id="img-area-esp"><input type="file" accept="image/*" id="f-esp-img" style="display:none" onchange="Pages.handleImageUpload(this,\'img-area-esp\')">' +
        (isEdit && esp.imagen ? '<img src="' + esp.imagen + '" class="img-preview" id="img-preview-esp"><button class="btn btn-sm btn-red" style="margin-top:6px" onclick="Pages.removeImage(\'img-area-esp\',\'f-esp-img\')">Quitar imagen</button>' : '') +
        '<div class="img-upload-placeholder" onclick="document.getElementById(\'f-esp-img\').click()"><span>+ Click para subir imagen</span></div></div></div>' +
        '</div></div>' +
        '<div class="form-group"><label>Etiquetas de uso</label><div id="tag-area-esp">' + Pages.buildTagSelectorHtml(isEdit ? (esp.categoria||'Comidas') : 'Comidas', isEdit ? (esp.tags || []) : []) + '</div></div>' +
        '<div class="form-group"><label>Descripcion (opcional)</label><textarea class="input" id="f-esp-desc" rows="2" placeholder="Breve descripcion del producto para la tienda...">' + (isEdit ? (esp.descripcion||'') : '') + '</textarea></div>' +
        '<div class="form-group"><label>Uso / Preparaciones (opcional)</label><input type="text" class="input" id="f-esp-uso" value="' + (isEdit ? (esp.uso||'') : '') + '" placeholder="Ej: Carnes, Arroces, Sopas"></div>' +
        (isEdit ? '<p class="text-xs text-muted mt-8">Stock: ' + (esp.stockBolsa||0) + 'g pala, ' + (esp.stockChico||0) + ' fr pequeño, ' + (esp.stockGrande||0) + ' fr grande</p>' : '') +
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
        enTienda: document.getElementById('f-esp-tienda').value === '1' || (Number(document.getElementById('f-esp-pc').value) || Number(document.getElementById('f-esp-pg').value)) > 0,
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
        '<div class="form-group"><label>Nombre</label><input type="text" class="input" id="f-bl-nombre" value="' + (isEdit ? bl.nombre : '') + '" placeholder="Ej: Curry Casero" ' + '></div>' +
        '<div class="g2">' +
          '<div class="form-group"><label>Categoria</label><select class="input" id="f-bl-cat" onchange="Pages.refreshTagSelector(\'bl\')">' +
          '<option value="Comidas"' + (isEdit && bl.categoria==='Comidas' ? ' selected' : '') + '>Comidas</option>' +
          '<option value="Infusiones"' + (isEdit && bl.categoria==='Infusiones' ? ' selected' : '') + '>Infusiones</option>' +
          '<option value="Cocteleria"' + (isEdit && bl.categoria==='Cocteleria' ? ' selected' : '') + '>Cocteleria</option>' +
        '</select></div>' +
          '<div class="form-group"><label>Region (opcional)</label><input type="text" class="input" id="f-bl-region" value="' + (isEdit ? (bl.region||'') : '') + '" placeholder="Ej: India"></div>' +
        '</div>' +
        '<div class="form-group"><label>Uso (opcional)</label><input type="text" class="input" id="f-bl-uso" value="' + (isEdit ? (bl.uso||'') : '') + '" placeholder="Ej: Carnes, Currys"></div>' +
        '<div class="card" style="border-color:var(--gold)"><div class="card-header"><h3>Precios de Venta</h3></div><div class="card-body">' +
        '<div class="g2"><div class="form-group"><label>Precio Pequeño ($)</label><input type="number" class="input" id="f-bl-pc" value="' + (isEdit ? bl.precioChico : '') + '" placeholder="Ej: 8000" min="0"></div>' +
        '<div class="form-group"><label>Precio Grande ($)</label><input type="number" class="input" id="f-bl-pg" value="' + (isEdit ? bl.precioGrande : '') + '" placeholder="Ej: 18000" min="0"></div></div>' +
        '<p class="text-xs text-muted">Estos son los precios que se mostraran en la tienda.</p></div></div>' +
        '<div class="form-group"><label>Ingredientes</label><div id="blend-ings"></div>' +
        '<button class="btn btn-sm btn-outline mt-8" id="btn-add-ing">+ Ingrediente</button></div>' +
        '<div class="card mt-12" style="background:var(--bg);border-color:var(--gold)"><div class="card-header"><h3>Tienda Online</h3></div><div class="card-body">' +
        '<div class="form-group"><label>Visible en Tienda</label><select class="input" id="f-bl-tienda"><option value="0"' + (isEdit && !bl.enTienda ? ' selected' : '') + '>No</option><option value="1"' + (isEdit && bl.enTienda ? ' selected' : (!isEdit ? ' selected' : '')) + '>Si</option></select></div>' +
        '<p class="text-xs text-muted mb-8">Precio especial para la tienda online (opcional). Si lo dejas vacio se usara el precio de venta.</p>' +
        '<div class="g2"><div class="form-group"><label>Precio Tienda Pequeño ($)</label><input type="number" class="input" id="f-bl-tc" value="' + (isEdit ? (bl.precioTiendaChico||'') : '') + '" placeholder="Igual al de venta" min="0"></div>' +
        '<div class="form-group"><label>Precio Tienda Grande ($)</label><input type="number" class="input" id="f-bl-tg" value="' + (isEdit ? (bl.precioTiendaGrande||'') : '') + '" placeholder="Igual al de venta" min="0"></div></div>' +
        '<div class="form-group"><label>Imagen</label><div class="img-upload-area" id="img-area-bl"><input type="file" accept="image/*" id="f-bl-img" style="display:none" onchange="Pages.handleImageUpload(this,\'img-area-bl\')">' +
        (isEdit && bl.imagen ? '<img src="' + bl.imagen + '" class="img-preview" id="img-preview-bl"><button class="btn btn-sm btn-red" style="margin-top:6px" onclick="Pages.removeImage(\'img-area-bl\',\'f-bl-img\')">Quitar imagen</button>' : '') +
        '<div class="img-upload-placeholder" onclick="document.getElementById(\'f-bl-img\').click()"><span>+ Click para subir imagen</span></div></div></div>' +
        '</div></div>' +
        '<div class="form-group"><label>Etiquetas de uso</label><div id="tag-area-bl">' + Pages.buildTagSelectorHtml(isEdit ? (bl.categoria||'Comidas') : 'Comidas', isEdit ? (bl.tags || []) : []) + '</div></div>' +
        '<div class="form-group"><label>Descripcion (opcional)</label><textarea class="input" id="f-bl-desc" rows="2" placeholder="Breve descripcion del blend para la tienda...">' + (isEdit ? (bl.descripcion||'') : '') + '</textarea></div>' +
        (isEdit ? '<p class="text-xs text-muted mt-8">Stock: ' + (bl.stockChico||0) + ' fr pequeño, ' + (bl.stockGrande||0) + ' fr grande</p>' : '') +
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
        '<div class="form-group" style="margin:0"><label>Grs/Pequeño</label><input type="number" class="input ing-gc" value="' + gc + '" placeholder="0" min="0"></div>' +
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
        enTienda: document.getElementById('f-bl-tienda').value === '1' || (Number(document.getElementById('f-bl-pc').value) || Number(document.getElementById('f-bl-pg').value)) > 0,
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
    var bolsas = db.stockBolsas || { chico: 0, grande: 0 };
    var especias = ArcanoDB.getEspecias();
    var etiqList = ArcanoDB.getProductosConStickers();
    var entradas = ArcanoDB.getEntradas();

    var h = '<div class="page-actions"><button class="btn btn-gold" onclick="Pages.formEntrada()">+ Registrar Entrada</button></div>';
    h += '<div class="stats-grid mt-12" style="grid-template-columns: repeat(4, 1fr)">' +
      '<div class="stat-card" style="border-left-color:var(--blue)"><div class="stat-value" style="color:var(--blue)">' + (envases.chico||0) + '</div><div class="stat-label">Frascos Pequeños</div></div>' +
      '<div class="stat-card" style="border-left-color:var(--blue)"><div class="stat-value" style="color:var(--blue)">' + (envases.grande||0) + '</div><div class="stat-label">Frascos Grandes</div></div>' +
      '<div class="stat-card" style="border-left-color:var(--green)"><div class="stat-value" style="color:var(--green)">' + (bolsas.chico||0) + '</div><div class="stat-label">Bolsas Chicas</div></div>' +
      '<div class="stat-card" style="border-left-color:var(--green)"><div class="stat-value" style="color:var(--green)">' + (bolsas.grande||0) + '</div><div class="stat-label">Bolsas Grandes</div></div></div>';

    h += '<div class="g2 mt-16" style="gap:16px">';
    // Especias en pala
    h += '<div class="card"><div class="card-header"><h3>Pala (materia prima)</h3></div><div class="card-body">';
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
    // Stickers
    h += '<div class="card"><div class="card-header"><h3>Stickers</h3></div><div class="card-body">';
    if (etiqList.length === 0) { h += '<p class="text-muted text-center text-sm">Sin productos</p>'; }
    else {
      h += '<div class="table-wrap"><table class="table"><thead><tr><th>Producto</th><th>Tipo</th><th>Pequeño</th><th>Grande</th></tr></thead><tbody>';
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
      h += '<div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Metodo</th><th>Items</th><th>Total</th><th></th></tr></thead><tbody>';
      for (var i = 0; i < Math.min(entradas.length, 30); i++) {
        var en = entradas[i];
        var desc = (en.items||[]).map(function(it) {
          if (it.tipo==='especia_grs') return (it.especiaNombre||'?') + ' ' + it.cantidad + 'grs';
          if (it.tipo==='envase') return 'Frascos ' + (it.talla||'chico') + ' x' + it.cantidad;
          if (it.tipo==='bolsa') return 'Bolsas ' + (it.talla||'chico') + ' x' + it.cantidad;
          if (it.tipo==='sticker') return 'Stk ' + (it.stickerNombre||'?') + ' ' + (it.talla||'chico') + ' x' + it.cantidad;
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
      o += '<option value="__new__">+ Nueva especia...</option>';
      return o;
    }

    function buildProductoOpts() {
      var o = '';
      var esps = ArcanoDB.getEspecias();
      var bls = ArcanoDB.getBlends();
      if (esps.length > 0) {
        o += '<optgroup label="Especias">';
        for (var i = 0; i < esps.length; i++) o += '<option value="especia|' + esps[i].id + '">' + esps[i].nombre + '</option>';
        o += '</optgroup>';
      }
      if (bls.length > 0) {
        o += '<optgroup label="Blends">';
        for (var i = 0; i < bls.length; i++) o += '<option value="blend|' + bls[i].id + '">' + bls[i].nombre + '</option>';
        o += '</optgroup>';
      }
      o += '<option value="__new__">+ Nuevo producto...</option>';
      return o;
    }

    function addEntRow() {
      var div = document.createElement('div');
      div.className = 'card mb-8';
      div.style.background = 'var(--bg)';
      div.innerHTML = '<div class="card-body" style="padding:12px">' +
        '<div class="g4 mb-8">' +
          '<div class="form-group" style="margin:0"><label>Tipo</label><select class="input ent-tipo"><option value="especia_grs">Especia (grs)</option><option value="envase">Frascos</option><option value="bolsa">Bolsas</option><option value="sticker">Stickers</option></select></div>' +
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
          detailDiv.innerHTML = '<label>Especia</label><select class="input ent-especia"><option value="">Seleccionar</option>' + buildEspOpts() + '</select><input type="text" class="input ent-especia-new" placeholder="Nombre nueva especia..." style="display:none;margin-top:6px">';
          var espSel2 = detailDiv.querySelector('.ent-especia');
          var newInput = detailDiv.querySelector('.ent-especia-new');
          espSel2.addEventListener('change', function() {
            if (this.value === '__new__') {
              this.style.display = 'none';
              newInput.style.display = 'block';
              newInput.focus();
            }
          });
          newInput.addEventListener('blur', function() {
            if (!this.value.trim()) {
              this.style.display = 'none';
              espSel2.style.display = 'block';
              espSel2.value = '';
            }
          });
          newInput.addEventListener('keydown', function(ev) {
            if (ev.key === 'Escape') { this.value = ''; this.blur(); }
          });
        } else if (t === 'envase') {
          detailDiv.innerHTML = '<label>Talla</label><select class="input ent-talla"><option value="chico">Pequeño</option><option value="grande">Grande</option></select>';
        } else if (t === 'bolsa') {
          detailDiv.innerHTML = '<label>Talla</label><select class="input ent-talla"><option value="chico">Chica</option><option value="grande">Grande</option></select>';
        } else {
          detailDiv.innerHTML = '<label>Producto</label><select class="input ent-stk-nombre"><option value="">Seleccionar</option>' + buildProductoOpts() + '</select><input type="text" class="input ent-stk-new-nombre" placeholder="Nombre nuevo producto..." style="display:none;margin-top:6px"><select class="input ent-stk-new-tipo" style="display:none;margin-top:6px"><option value="especia">Especia</option><option value="blend">Blend</option></select><label class="mt-8" style="display:block">Talla</label><select class="input ent-talla"><option value="chico">Pequeño</option><option value="grande">Grande</option></select>';
          var stkSel = detailDiv.querySelector('.ent-stk-nombre');
          var stkNewNombre = detailDiv.querySelector('.ent-stk-new-nombre');
          var stkNewTipo = detailDiv.querySelector('.ent-stk-new-tipo');
          var stkTalla = detailDiv.querySelectorAll('.ent-talla')[0];
          stkSel.addEventListener('change', function() {
            if (this.value === '__new__') {
              this.style.display = 'none';
              stkNewTipo.style.display = 'block';
              stkNewNombre.style.display = 'block';
              stkNewNombre.focus();
            }
          });
          stkNewNombre.addEventListener('blur', function() {
            if (!this.value.trim()) {
              this.style.display = 'none';
              stkNewTipo.style.display = 'none';
              stkSel.style.display = 'block';
              stkSel.value = '';
            }
          });
          stkNewNombre.addEventListener('keydown', function(ev) {
            if (ev.key === 'Escape') { this.value = ''; this.blur(); }
          });
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
      var bls = ArcanoDB.getBlends();

      for (var i = 0; i < rows.length; i++) {
        var tipo = rows[i].querySelector('.ent-tipo').value;
        var cant = Number(rows[i].querySelector('.ent-cant').value) || 0;
        var cost = Number(rows[i].querySelector('.ent-cost').value) || 0;
        if (cant <= 0) continue;
        var item = { tipo: tipo, cantidad: cant, costoUnitario: cost };
        total += cant * cost;
        if (tipo === 'especia_grs') {
          var newEspInput = rows[i].querySelector('.ent-especia-new');
          var espSel = rows[i].querySelector('.ent-especia');
          if (newEspInput && newEspInput.style.display !== 'none' && newEspInput.value.trim()) {
            var newName = newEspInput.value.trim();
            var existingEsp = null;
            for (var s = 0; s < esps.length; s++) { if (esps[s].nombre.toLowerCase() === newName.toLowerCase()) { existingEsp = esps[s]; break; } }
            if (existingEsp) {
              item.especiaId = existingEsp.id;
              item.especiaNombre = existingEsp.nombre;
            } else {
              var newEsp = ArcanoDB.saveEspecia({ nombre: newName });
              item.especiaId = newEsp.id;
              item.especiaNombre = newEsp.nombre;
              esps = ArcanoDB.getEspecias();
            }
          } else if (espSel && espSel.value && espSel.value !== '__new__') {
            item.especiaId = Number(espSel.value);
            var espObj = null;
            for (var s = 0; s < esps.length; s++) { if (esps[s].id === item.especiaId) { espObj = esps[s]; break; } }
            item.especiaNombre = espObj ? espObj.nombre : '?';
          } else {
            alert('Falta especia en item ' + (i+1)); return;
          }
          if (!item.especiaId) { alert('Falta especia en item ' + (i+1)); return; }
        } else if (tipo === 'envase') {
          item.talla = rows[i].querySelector('.ent-talla').value;
        } else if (tipo === 'bolsa') {
          item.talla = rows[i].querySelector('.ent-talla').value;
        } else if (tipo === 'sticker') {
          var stkSel = rows[i].querySelector('.ent-stk-nombre');
          var stkNewNombre = rows[i].querySelector('.ent-stk-new-nombre');
          var stkNewTipo = rows[i].querySelector('.ent-stk-new-tipo');
          if (stkSel && stkSel.style.display !== 'none') {
            var stkVal = stkSel.value || '';
            if (!stkVal || stkVal === '__new__') { alert('Falta producto de sticker en item ' + (i+1)); return; }
            var stkParts = stkVal.split('|');
            item.stickerTipo = stkParts[0];
            var stkId = Number(stkParts[1]);
            var stkObj = stkParts[0] === 'blend' ? ArcanoDB.getBlend(stkId) : ArcanoDB.getEspecia(stkId);
            item.stickerNombre = stkObj ? stkObj.nombre : '?';
          } else if (stkNewNombre && stkNewNombre.style.display !== 'none' && stkNewNombre.value.trim()) {
            var newProdName = stkNewNombre.value.trim();
            var newProdTipo = stkNewTipo ? stkNewTipo.value : 'especia';
            item.stickerTipo = newProdTipo;
            if (newProdTipo === 'blend') {
              var newBl = ArcanoDB.saveBlend({ nombre: newProdName });
              item.stickerNombre = newBl.nombre;
            } else {
              var newEsp2 = ArcanoDB.saveEspecia({ nombre: newProdName });
              item.stickerNombre = newEsp2.nombre;
            }
          } else {
            alert('Falta producto de sticker en item ' + (i+1)); return;
          }
          if (!item.stickerNombre) { alert('Falta producto de sticker en item ' + (i+1)); return; }
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
          '<td class="text-sm">' + det + ' | Env:' + (p.envasesConsumidos||0) + ' Stk:' + (p.stickersConsumidos||0) + '</td></tr>';
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
        '<div class="g2"><div class="form-group"><label>Talla</label><select class="input" id="f-prod-talla"><option value="chico">Pequeño</option><option value="grande">Grande</option></select></div>' +
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
        h += '<div class="list-row"><span>Pala de ' + producto.nombre + '</span><span class="' + (bolsaOk?'text-green':'text-red fw7') + '">' + (producto.stockBolsa||0) + 'g disponible → necesita ' + grsTotal + 'g ' + (bolsaOk?'OK':'FALTA') + '</span></div>';
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
            h += '<div class="list-row"><span>' + (esp?esp.nombre:'?') + ' (pala)</span><span class="' + (ok?'text-green':'text-red fw7') + '">' + avail + 'g → necesita ' + needed + 'g ' + (ok?'OK':'FALTA') + '</span></div>';
          }
        }
      }

      // Envases
      var envAvail = envases[talla] || 0;
      var envOk = envAvail >= cant;
      if (!envOk) allOk = false;
      h += '<div class="list-row"><span>Envases ' + talla + '</span><span class="' + (envOk?'text-green':'text-red fw7') + '">' + envAvail + ' → necesita ' + cant + ' ' + (envOk?'OK':'FALTA') + '</span></div>';

      // Stickers
      var stkAvail = 0;
      var stkKeys = Object.keys(db.stickers || {});
      for (var j = 0; j < stkKeys.length; j++) {
        if (db.stickers[stkKeys[j]].nombre === producto.nombre) {
          stkAvail = Number(db.stickers[stkKeys[j]][talla==='grande'?'stockGrande':'stockChico']) || 0;
          break;
        }
      }
      var stkOk = stkAvail >= cant;
      if (!stkOk) allOk = false;
      h += '<div class="list-row"><span>Stickers ' + talla + '</span><span class="' + (stkOk?'text-green':'text-red fw7') + '">' + stkAvail + ' → necesita ' + cant + ' ' + (stkOk?'OK':'FALTA') + '</span></div>';

      // Bolsas (packaging)
      var bolsaAvail = (db.stockBolsas && db.stockBolsas[talla]) || 0;
      var bolsaOk = bolsaAvail >= cant;
      if (!bolsaOk) allOk = false;
      h += '<div class="list-row"><span>Bolsas ' + talla + '</span><span class="' + (bolsaOk?'text-green':'text-red fw7') + '">' + bolsaAvail + ' → necesita ' + cant + ' ' + (bolsaOk?'OK':'FALTA') + '</span></div>';

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
    var h = '<div class="page-actions"><button class="btn btn-gold" onclick="Pages.formVenta()">+ Nueva Venta</button>' +
      '<button class="btn btn-outline" onclick="Pages.formVentaQR()" style="margin-left:8px">\u{1F4F7} Vender por QR</button></div>';

    // === QR PAYMENT CONFIG ===
    h += '<div class="card mt-16"><div class="card-header"><h3>Configuracion de Pago</h3></div><div class="card-body">' +
      '<p class="text-sm text-muted mb-12">Sube la imagen QR que se mostrara al cobrar con metodo QR.</p>' +
      '<div id="qr-config-area">' +
        '<div id="qr-config-preview" style="margin-bottom:12px;text-align:center"></div>' +
        '<label class="btn btn-outline" style="cursor:pointer;display:inline-block">Subir Imagen QR<input type="file" accept="image/*" id="qr-config-file" style="display:none"></label>' +
        '<button class="btn btn-sm btn-red" id="qr-config-remove" style="margin-left:8px;display:none" onclick="Pages._removeQRPago()">Eliminar QR</button>' +
        '<p id="qr-config-status" class="text-sm text-muted mt-8"></p>' +
      '</div></div></div>';

    h += '<div class="card mt-16"><div class="card-header"><h3>Historial</h3></div><div class="card-body">';
    if (ventas.length === 0) {
      h += '<p class="text-muted text-center">Sin ventas.</p>';
    } else {
      h += '<div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Metodo</th><th>Items</th><th>Total</th><th></th></tr></thead><tbody>';
      for (var i = 0; i < Math.min(ventas.length, 30); i++) {
        var v = ventas[i];
        var desc = (v.items||[]).map(function(it){ return (it.productoNombre||'?')+' '+(it.talla||'chico')+' x'+(it.cantidad||0)+' ($'+(it.subtotal||0).toLocaleString()+')'; }).join(' | ');
        var metodoTag = v.metodoPago === 'qr' ? '<span style="color:var(--blue);font-size:0.75rem;font-weight:600">QR</span>' : '<span style="color:var(--green);font-size:0.75rem;font-weight:600">Efectivo</span>';
        h += '<tr><td>' + (v.fecha||'') + '</td><td>' + metodoTag + '</td><td class="text-sm">' + desc + '</td><td class="fw7 text-gold">$' + (v.total||0).toLocaleString() + '</td>' +
          '<td><button class="btn btn-sm btn-red" onclick="Pages.delVenta(' + v.id + ')">X</button></td></tr>';
      }
      h += '</tbody></table></div>';
    }
    h += '</div></div>';
    container.innerHTML = h;
    Pages._loadQRPagoConfig();
  },

  // --- QR PAGO CONFIG ---
  _qrPagoImage: null,

  _loadQRPagoConfig: function() {
    var cached = localStorage.getItem('arcano_qr_pago_image');
    if (cached) { Pages._qrPagoImage = cached; }
    try {
      firebase.database().ref('arcano/config/qrPagoImage').once('value').then(function(snap) {
        var val = snap.val();
        if (val) {
          Pages._qrPagoImage = val;
          localStorage.setItem('arcano_qr_pago_image', val);
        } else {
          Pages._qrPagoImage = null;
          localStorage.removeItem('arcano_qr_pago_image');
        }
        Pages._renderQRPagoPreview();
      }).catch(function() { Pages._renderQRPagoPreview(); });
    } catch(e) { Pages._renderQRPagoPreview(); }
    var fileInput = document.getElementById('qr-config-file');
    if (fileInput) {
      fileInput.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (!file) return;
        if (file.size > 500000) { alert('La imagen es muy grande (max 500KB).'); return; }
        var reader = new FileReader();
        reader.onload = function(ev) {
          var dataUrl = ev.target.result;
          Pages._qrPagoImage = dataUrl;
          localStorage.setItem('arcano_qr_pago_image', dataUrl);
          try { firebase.database().ref('arcano/config/qrPagoImage').set(dataUrl); } catch(e) {}
          Pages._renderQRPagoPreview();
          toast('QR de pago guardado');
        };
        reader.readAsDataURL(file);
      });
    }
  },

  _renderQRPagoPreview: function() {
    var preview = document.getElementById('qr-config-preview');
    var removeBtn = document.getElementById('qr-config-remove');
    var status = document.getElementById('qr-config-status');
    if (!preview) return;
    if (Pages._qrPagoImage) {
      preview.innerHTML = '<img src="' + Pages._qrPagoImage + '" style="max-width:200px;max-height:200px;border-radius:8px;border:1px solid var(--border)">';
      if (removeBtn) removeBtn.style.display = 'inline-block';
      if (status) status.textContent = 'QR configurado correctamente';
    } else {
      preview.innerHTML = '<p class="text-muted" style="padding:20px 0">No hay QR configurado. Sube una imagen.</p>';
      if (removeBtn) removeBtn.style.display = 'none';
      if (status) status.textContent = '';
    }
  },

  _removeQRPago: function() {
    if (!confirm('Eliminar el QR de pago configurado?')) return;
    Pages._qrPagoImage = null;
    localStorage.removeItem('arcano_qr_pago_image');
    try { firebase.database().ref('arcano/config/qrPagoImage').remove(); } catch(e) {}
    Pages._renderQRPagoPreview();
    toast('QR de pago eliminado');
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
        '<button class="btn btn-gold" id="btn-save-v">Cobrar</button>' +
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
      var saleData = { fecha: document.getElementById('f-v-fecha').value, items: items };
      Pages._showPagoModal(saleData, function() { modal.remove(); });
    });
  },

  delVenta(id) {
    if (!confirm('Eliminar esta venta?')) return;
    ArcanoDB.deleteVenta(id);
    App.renderPage('ventas');
  },

  _showPagoModal: function(saleData, onClose) {
    var total = 0;
    for (var i = 0; i < saleData.items.length; i++) {
      total += (Number(saleData.items[i].precioUnitario) || 0) * (Number(saleData.items[i].cantidad) || 0);
    }
    saleData.total = total;
    var qrImg = Pages._qrPagoImage;
    var pm = document.createElement('div');
    pm.className = 'modal-overlay';
    pm.id = 'pago-modal';
    var qrContent = qrImg
      ? '<div style="font-size:0.9rem;color:var(--muted);margin-bottom:8px">Muestra este QR al cliente:</div>' +
        '<div style="margin-bottom:16px"><img src="' + qrImg + '" style="max-width:260px;max-height:260px;border-radius:8px;border:1px solid var(--border)"></div>'
      : '<div style="padding:20px;margin-bottom:12px;border:2px dashed var(--border);border-radius:8px;color:var(--muted)">No hay QR configurado.<br>Ve a Ventas > Configuracion de Pago para subirlo.</div>';
    pm.innerHTML =
      '<div class="modal" style="max-width:420px;text-align:center">' +
        '<div class="modal-header"><button class="btn btn-ghost" id="pago-volver-btn" style="margin-right:auto;padding:4px 12px;font-size:0.85rem">< Volver</button><h3>Metodo de Pago</h3></div>' +
        '<div class="modal-body">' +
          '<div style="font-size:2rem;font-weight:800;color:var(--gold);margin-bottom:8px">$' + total.toLocaleString() + '</div>' +
          '<p style="color:var(--muted);margin-bottom:20px;font-size:0.9rem">Selecciona como recibiste el pago</p>' +
          '<div style="display:flex;gap:12px;justify-content:center">' +
            '<button class="btn btn-gold" id="pago-efectivo-btn" style="flex:1;padding:16px;font-size:1rem;font-weight:700">Efectivo</button>' +
            '<button class="btn btn-outline" id="pago-qr-btn" style="flex:1;padding:16px;font-size:1rem;font-weight:700;border-color:var(--gold);color:var(--gold)">QR</button>' +
          '</div>' +
          '<div id="pago-qr-area" style="display:none;margin-top:20px">' +
            qrContent +
            '<div style="display:flex;gap:12px;justify-content:center;margin-top:12px">' +
              '<button class="btn btn-gold" id="pago-recibido-btn" style="flex:1;padding:14px;font-size:1rem;font-weight:700">Pago Recibido</button>' +
              '<button class="btn btn-outline" id="pago-qr-cancel-btn" style="flex:1;padding:14px;font-size:1rem;font-weight:700">Cancelar</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(pm);
    document.getElementById('pago-efectivo-btn').addEventListener('click', function() {
      saleData.metodoPago = 'efectivo';
      try { ArcanoDB.saveVenta(saleData); pm.remove(); if (onClose) onClose(); else App.renderPage('ventas'); }
      catch (err) { alert('Error: ' + err.message); }
    });
    document.getElementById('pago-qr-btn').addEventListener('click', function() {
      document.getElementById('pago-qr-area').style.display = 'block';
      document.getElementById('pago-efectivo-btn').style.display = 'none';
      document.getElementById('pago-qr-btn').style.display = 'none';
    });
    document.getElementById('pago-recibido-btn').addEventListener('click', function() {
      saleData.metodoPago = 'qr';
      try { ArcanoDB.saveVenta(saleData); pm.remove(); if (onClose) onClose(); else App.renderPage('ventas'); }
      catch (err) { alert('Error: ' + err.message); }
    });
    document.getElementById('pago-qr-cancel-btn').addEventListener('click', function() {
      document.getElementById('pago-qr-area').style.display = 'none';
      document.getElementById('pago-efectivo-btn').style.display = '';
      document.getElementById('pago-qr-btn').style.display = '';
    });
    document.getElementById('pago-volver-btn').addEventListener('click', function() {
      pm.remove();
    });
  },

  /* ================================================================
     VENTA POR CAMARA (OCR - lectura de etiquetas)
     ================================================================ */
  _camStream: null,
  _camCart: [],
  _camOcrRunning: false,

  /** Open camera modal for label-reading sale */
  formVentaQR() {
    Pages._camCart = [];
    var modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'cam-venta-modal';
    modal.innerHTML =
      '<div class="modal modal-lg" style="max-width:520px">' +
        '<div class="modal-header"><h3>\u{1F4F7} Venta por Camara</h3>' +
          '<button class="btn btn-ghost" onclick="Pages.closeVentaCam()">X</button></div>' +
        '<div class="modal-body" style="padding:0">' +
          '<div style="position:relative;background:#000">' +
            '<video id="cam-video" autoplay playsinline style="width:100%;display:block;max-height:320px;object-fit:cover"></video>' +
            '<canvas id="cam-canvas" style="display:none"></canvas>' +
            '<div id="cam-scan-line" style="position:absolute;top:50%;left:10%;right:10%;height:2px;background:var(--gold);opacity:0.6;transform:translateY(-50%);animation:scanLine 2s ease-in-out infinite;pointer-events:none"></div>' +
            '<style>@keyframes scanLine{0%,100%{top:calc(50% - 50px)}50%{top:calc(50% + 50px)}}</style>' +
          '</div>' +
          '<div id="cam-status" style="padding:12px 16px;background:var(--bg-card);color:var(--muted);font-size:0.85rem;text-align:center">' +
            'Apunta la camara a la etiqueta del producto' +
          '</div>' +
          '<div style="display:flex;justify-content:center;gap:8px;padding:8px 16px;background:var(--bg-card)">' +
            '<button class="btn btn-sm btn-outline" id="cam-flash-btn" onclick="Pages.toggleCamFlash()">\u{1F526} Flash</button>' +
            '<button class="btn btn-sm btn-gold" onclick="Pages.captureAndRead()">\u{1F4F7} Capturar</button>' +
          '</div>' +
          '<!-- Confirmation area -->' +
          '<div id="cam-confirm-area" style="padding:12px 16px;display:none">' +
            '<div style="font-size:0.75rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px">Producto detectado</div>' +
            '<div id="cam-detected-text" style="font-size:0.8rem;color:var(--muted);margin-bottom:8px;font-style:italic"></div>' +
            '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
              '<select class="input" id="cam-prod-select" style="flex:1;min-width:140px"><option value="">Seleccionar producto</option></select>' +
              '<select class="input" id="cam-talla-select" style="width:120px"><option value="chico">Pequeño</option><option value="grande">Grande</option></select>' +
              '<button class="btn btn-sm btn-gold" onclick="Pages.addCamProduct()">+ Agregar</button>' +
              '<button class="btn btn-sm btn-outline" onclick="Pages.cancelCamDetect()">Seguir leyendo</button>' +
            '</div>' +
          '</div>' +
          '<!-- Cart -->' +
          '<div id="cam-cart-area" style="padding:12px 16px;max-height:200px;overflow-y:auto;display:none">' +
            '<div style="font-size:0.75rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px">Productos agregados</div>' +
            '<div id="cam-cart-items"></div>' +
          '</div>' +
          '<!-- Total and confirm -->' +
          '<div id="cam-total-area" style="padding:12px 16px;border-top:1px solid var(--border);display:none">' +
            '<div class="venta-total-box">Total: $<span id="cam-venta-total">0</span></div>' +
            '<button class="btn btn-gold btn-block mt-8" onclick="Pages.confirmarVentaCam()">\u{2705} Confirmar Venta</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
    setTimeout(function() { Pages.startCamera(); }, 300);
  },

  startCamera() {
    var video = document.getElementById('cam-video');
    if (!video) return;
    var statusEl = document.getElementById('cam-status');
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
    }).then(function(stream) {
      Pages._camStream = stream;
      video.srcObject = stream;
      video.play();
      if (statusEl) statusEl.textContent = 'Apunta la camara a la etiqueta del producto';
    }).catch(function(err) {
      if (statusEl) statusEl.innerHTML = '<span style="color:var(--red)">No se pudo acceder a la camara: ' + err.message + '</span>';
    });
  },

  stopCamera() {
    if (Pages._camStream) {
      Pages._camStream.getTracks().forEach(function(t) { t.stop(); });
      Pages._camStream = null;
    }
    Pages._camOcrRunning = false;
  },

  toggleCamFlash() {
    if (!Pages._camStream) return;
    var track = Pages._camStream.getVideoTracks()[0];
    if (!track) return;
    var caps = track.getCapabilities ? track.getCapabilities() : {};
    if (caps.torch) {
      var isOn = (track.getSettings && track.getSettings().torch) || false;
      track.applyConstraints({ advanced: [{ torch: !isOn }] });
      var btn = document.getElementById('cam-flash-btn');
      if (btn) btn.textContent = isOn ? '\u{1F526} Flash' : '\u{1F526} Flash ON';
    }
  },

  captureAndRead() {
    if (Pages._camOcrRunning) return;
    var video = document.getElementById('cam-video');
    var canvas = document.getElementById('cam-canvas');
    var statusEl = document.getElementById('cam-status');
    if (!video || !canvas || video.readyState < 2) return;
    if (navigator.vibrate) navigator.vibrate(50);
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    var imageData = canvas.toDataURL('image/png');
    Pages._camOcrRunning = true;
    if (statusEl) statusEl.innerHTML = '<span style="color:var(--gold)">Leyendo etiqueta...</span>';
    if (typeof Tesseract === 'undefined') {
      if (statusEl) statusEl.innerHTML = '<span style="color:var(--red)">Libreria OCR no disponible. Verifica conexion a internet.</span>';
      Pages._camOcrRunning = false;
      return;
    }
    Tesseract.recognize(imageData, 'spa+eng', {
      logger: function() {}
    }).then(function(result) {
      Pages._camOcrRunning = false;
      var text = (result && result.data && result.data.text) || '';
      text = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      Pages.handleOCRResult(text);
    }).catch(function(err) {
      Pages._camOcrRunning = false;
      if (statusEl) statusEl.innerHTML = '<span style="color:var(--red)">Error al leer: ' + err.message + '</span>';
    });
  },

  handleOCRResult(text) {
    var statusEl = document.getElementById('cam-status');
    var confirmArea = document.getElementById('cam-confirm-area');
    var detectedTextEl = document.getElementById('cam-detected-text');
    var prodSelect = document.getElementById('cam-prod-select');
    if (!text || text.length < 2) {
      if (statusEl) statusEl.innerHTML = '<span style="color:var(--red)">No se detecto texto. Intenta de nuevo.</span>';
      setTimeout(function() { if (statusEl) statusEl.textContent = 'Apunta la camara a la etiqueta del producto'; }, 2000);
      return;
    }
    var especias = ArcanoDB.getEspecias();
    var blends = ArcanoDB.getBlends();
    var allProducts = [];
    for (var i = 0; i < especias.length; i++) { allProducts.push({ tipo: 'especia', producto: especias[i] }); }
    for (var i = 0; i < blends.length; i++) { allProducts.push({ tipo: 'blend', producto: blends[i] }); }
    var ocrLower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    var scored = [];
    for (var i = 0; i < allProducts.length; i++) {
      var p = allProducts[i];
      var name = (p.producto.nombre || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      var nameWords = name.split(/\s+/);
      var matchCount = 0;
      for (var w = 0; w < nameWords.length; w++) {
        if (nameWords[w].length < 2) continue;
        if (ocrLower.indexOf(nameWords[w]) !== -1) matchCount++;
      }
      var score = nameWords.length > 0 ? matchCount / nameWords.length : 0;
      if (ocrLower.indexOf(name) !== -1) score = Math.max(score, 1.0);
      if (name.length >= 3 && ocrLower.indexOf(name.substring(0, Math.min(name.length, 6))) !== -1) score = Math.max(score, 0.7);
      if (score >= 0.5) scored.push({ tipo: p.tipo, producto: p.producto, score: score });
    }
    scored.sort(function(a, b) { return b.score - a.score; });
    if (confirmArea) confirmArea.style.display = 'block';
    if (detectedTextEl) detectedTextEl.textContent = 'Texto leido: "' + text.substring(0, 80) + (text.length > 80 ? '...' : '') + '"';
    if (prodSelect) {
      prodSelect.innerHTML = '<option value="">Seleccionar producto</option>';
      if (scored.length > 0) {
        for (var i = 0; i < Math.min(scored.length, 5); i++) {
          var s = scored[i];
          var pct = Math.round(s.score * 100);
          prodSelect.innerHTML += '<option value="' + s.tipo + '|' + s.producto.id + '">' + s.producto.nombre + ' (' + pct + '%)</option>';
        }
        if (scored[0].score >= 0.7) {
          prodSelect.value = scored[0].tipo + '|' + scored[0].producto.id;
        }
        if (statusEl) statusEl.innerHTML = '<span style="color:var(--green)">Producto detectado - confirma abajo</span>';
      } else {
        if (statusEl) statusEl.innerHTML = '<span style="color:var(--red)">No se encontro producto. Selecciona manualmente.</span>';
        for (var i = 0; i < allProducts.length; i++) {
          var ap = allProducts[i];
          prodSelect.innerHTML += '<option value="' + ap.tipo + '|' + ap.producto.id + '">' + ap.producto.nombre + '</option>';
        }
      }
    }
  },

  cancelCamDetect() {
    var confirmArea = document.getElementById('cam-confirm-area');
    if (confirmArea) confirmArea.style.display = 'none';
    var statusEl = document.getElementById('cam-status');
    if (statusEl) statusEl.textContent = 'Apunta la camara a la etiqueta del producto';
  },

  addCamProduct() {
    var prodVal = document.getElementById('cam-prod-select').value;
    var tallaVal = document.getElementById('cam-talla-select').value;
    if (!prodVal) { alert('Selecciona un producto'); return; }
    var parts = prodVal.split('|');
    var tipo = parts[0];
    var prodId = Number(parts[1]);
    var producto = tipo === 'blend' ? ArcanoDB.getBlend(prodId) : ArcanoDB.getEspecia(prodId);
    if (!producto) { alert('Producto no encontrado'); return; }
    var stockKey = tallaVal === 'grande' ? 'stockGrande' : 'stockChico';
    var precioKey = tallaVal === 'grande' ? 'precioGrande' : 'precioChico';
    var stock = producto[stockKey] || 0;
    var precio = producto[precioKey] || 0;
    if (stock <= 0) { alert('Sin stock de ' + producto.nombre + ' (' + tallaVal + ')'); return; }
    var found = false;
    for (var i = 0; i < Pages._camCart.length; i++) {
      if (Pages._camCart[i].tipo === tipo && Pages._camCart[i].productoId === prodId && Pages._camCart[i].talla === tallaVal) {
        if (Pages._camCart[i].cantidad < stock) Pages._camCart[i].cantidad++;
        found = true;
        break;
      }
    }
    if (!found) {
      Pages._camCart.push({ tipo: tipo, productoId: prodId, talla: tallaVal, cantidad: 1, precioUnitario: precio });
    }
    if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
    Pages.renderCamCart();
    Pages.cancelCamDetect();
  },

  renderCamCart() {
    var cartArea = document.getElementById('cam-cart-area');
    var cartItems = document.getElementById('cam-cart-items');
    var totalArea = document.getElementById('cam-total-area');
    var totalSpan = document.getElementById('cam-venta-total');
    if (Pages._camCart.length === 0) {
      if (cartArea) cartArea.style.display = 'none';
      if (totalArea) totalArea.style.display = 'none';
      return;
    }
    if (cartArea) cartArea.style.display = 'block';
    if (totalArea) totalArea.style.display = 'block';
    var h = '';
    var total = 0;
    for (var i = 0; i < Pages._camCart.length; i++) {
      var item = Pages._camCart[i];
      var prod = item.tipo === 'blend' ? ArcanoDB.getBlend(item.productoId) : ArcanoDB.getEspecia(item.productoId);
      var nombre = prod ? prod.nombre : '?';
      var sub = item.cantidad * item.precioUnitario;
      total += sub;
      h += '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">' +
        '<div><div style="font-weight:600;font-size:0.9rem">' + nombre + '</div>' +
        '<div style="font-size:0.75rem;color:var(--muted)">' + item.talla + ' | $' + item.precioUnitario.toLocaleString() + ' c/u</div></div>' +
        '<div style="display:flex;align-items:center;gap:8px">' +
        '<button class="btn btn-sm btn-outline" onclick="Pages.camCartQty(' + i + ',-1)">-</button>' +
        '<span style="font-weight:700;min-width:24px;text-align:center">' + item.cantidad + '</span>' +
        '<button class="btn btn-sm btn-outline" onclick="Pages.camCartQty(' + i + ',1)">+</button>' +
        '<span style="font-weight:700;color:var(--gold);min-width:70px;text-align:right">$' + sub.toLocaleString() + '</span>' +
        '<button class="btn btn-sm btn-red" onclick="Pages.camCartRemove(' + i + ')">X</button>' +
        '</div></div>';
    }
    if (cartItems) cartItems.innerHTML = h;
    if (totalSpan) totalSpan.textContent = total.toLocaleString();
  },

  camCartQty(idx, delta) {
    if (!Pages._camCart[idx]) return;
    var item = Pages._camCart[idx];
    var newCant = item.cantidad + delta;
    var producto = item.tipo === 'blend' ? ArcanoDB.getBlend(item.productoId) : ArcanoDB.getEspecia(item.productoId);
    var stockKey = item.talla === 'grande' ? 'stockGrande' : 'stockChico';
    var maxStock = producto ? (producto[stockKey] || 0) : 0;
    if (newCant < 1 || newCant > maxStock) return;
    item.cantidad = newCant;
    Pages.renderCamCart();
  },

  camCartRemove(idx) {
    Pages._camCart.splice(idx, 1);
    Pages.renderCamCart();
  },

  confirmarVentaCam() {
    if (Pages._camCart.length === 0) { alert('No hay productos en la venta'); return; }
    var saleData = {
      fecha: new Date().toISOString().slice(0, 10),
      items: JSON.parse(JSON.stringify(Pages._camCart))
    };
    Pages._showPagoModal(saleData, function() { Pages.closeVentaCam(); });
  },

  closeVentaCam() {
    Pages.stopCamera();
    var modal = document.getElementById('cam-venta-modal');
    if (modal) modal.remove();
    Pages._camCart = [];
  },


  /* ================================================================
     STOCK
     ================================================================ */
  renderStock(container) {
    var db = ArcanoDB.getDB();
    var especias = ArcanoDB.getEspecias();
    var blends = ArcanoDB.getBlends();
    var envases = db.stockEnvases || { chico: 0, grande: 0 };
    var bolsas = db.stockBolsas || { chico: 0, grande: 0 };
    var etiqList = ArcanoDB.getProductosConStickers();
    var ajustes = ArcanoDB.getAjustes();

    var h = '<div class="page-actions"><button class="btn btn-gold" onclick="Pages.formAjusteStock()">Ajustar Stock</button></div>';

    // === SECTION 1: PRODUCTOS ===
    h += '<h3 style="color:var(--gold);margin-bottom:12px;font-size:1.1rem">Stock de Productos</h3>';

    // Especias
    h += '<div class="card mt-8"><div class="card-header"><h3>Especias</h3></div><div class="card-body">';
    if (especias.length === 0) { h += '<p class="text-muted text-center">Sin especias</p>'; }
    else {
      h += '<div class="table-wrap"><table class="table"><thead><tr><th>Nombre</th><th>Cat.</th><th>Pala (grs)</th><th>Fr.Pequeño</th><th>Fr.Grande</th></tr></thead><tbody>';
      for (var i = 0; i < especias.length; i++) {
        var e = especias[i];
        h += '<tr><td class="fw7">' + e.nombre + '</td>' +
          '<td><span class="badge badge-gold">' + (e.categoria||'—') + '</span></td>' +
          '<td class="' + ((e.stockBolsa||0)<=50?'text-red fw7':'') + '">' + (e.stockBolsa||0) + '</td>' +
          '<td class="' + ((e.stockChico||0)<=3?'text-red fw7':'text-green') + '">' + (e.stockChico||0) + '</td>' +
          '<td class="' + ((e.stockGrande||0)<=3?'text-red fw7':'text-green') + '">' + (e.stockGrande||0) + '</td></tr>';
      }
      h += '</tbody></table></div>';
    }
    h += '</div></div>';

    // Blends
    h += '<div class="card mt-16"><div class="card-header"><h3>Blends</h3></div><div class="card-body">';
    if (blends.length === 0) { h += '<p class="text-muted text-center">Sin blends</p>'; }
    else {
      h += '<div class="table-wrap"><table class="table"><thead><tr><th>Nombre</th><th>Cat.</th><th>Fr.Pequeño</th><th>Fr.Grande</th></tr></thead><tbody>';
      for (var i = 0; i < blends.length; i++) {
        var b = blends[i];
        h += '<tr><td class="fw7">' + b.nombre + '</td>' +
          '<td><span class="badge badge-blue">' + (b.categoria||'—') + '</span></td>' +
          '<td class="' + ((b.stockChico||0)<=3?'text-red fw7':'text-green') + '">' + (b.stockChico||0) + '</td>' +
          '<td class="' + ((b.stockGrande||0)<=3?'text-red fw7':'text-green') + '">' + (b.stockGrande||0) + '</td></tr>';
      }
      h += '</tbody></table></div>';
    }
    h += '</div></div>';

    // === SECTION 2: PACKAGING ===
    h += '<h3 style="color:var(--gold);margin:24px 0 12px;font-size:1.1rem">Packaging</h3>';
    h += '<div class="stats-grid" style="grid-template-columns: repeat(4, 1fr)">' +
      '<div class="stat-card" style="border-left-color:var(--blue)"><div class="stat-value" style="color:var(--blue)">' + (envases.chico||0) + '</div><div class="stat-label">Frascos Pequeños</div></div>' +
      '<div class="stat-card" style="border-left-color:var(--blue)"><div class="stat-value" style="color:var(--blue)">' + (envases.grande||0) + '</div><div class="stat-label">Frascos Grandes</div></div>' +
      '<div class="stat-card" style="border-left-color:var(--green)"><div class="stat-value" style="color:var(--green)">' + (bolsas.chico||0) + '</div><div class="stat-label">Bolsas Chicas</div></div>' +
      '<div class="stat-card" style="border-left-color:var(--green)"><div class="stat-value" style="color:var(--green)">' + (bolsas.grande||0) + '</div><div class="stat-label">Bolsas Grandes</div></div></div>';

    // Stickers table
    h += '<div class="card mt-16"><div class="card-header"><h3>Stickers</h3></div><div class="card-body">';
    if (etiqList.length === 0) { h += '<p class="text-muted text-center">Sin stickers</p>'; }
    else {
      h += '<div class="table-wrap"><table class="table"><thead><tr><th>Producto</th><th>Tipo</th><th>Stk.Pequeño</th><th>Stk.Grande</th></tr></thead><tbody>';
      for (var i = 0; i < etiqList.length; i++) {
        var et = etiqList[i];
        h += '<tr><td class="fw7">' + et.nombre + '</td><td><span class="badge ' + (et.tipo==='blend'?'badge-blue':'badge-gold') + '">' + (et.tipo==='blend'?'Blend':'Especia') + '</span></td>' +
          '<td class="' + (et.stockChico<=5?'text-red fw7':'') + '">' + et.stockChico + '</td>' +
          '<td class="' + (et.stockGrande<=5?'text-red fw7':'') + '">' + et.stockGrande + '</td></tr>';
      }
      h += '</tbody></table></div>';
    }
    h += '</div></div>';

    // === SECTION 3: HISTORIAL DE AJUSTES ===
    h += '<div class="card mt-24"><div class="card-header"><h3>Historial de Ajustes Manuales</h3></div><div class="card-body">';
    if (ajustes.length === 0) {
      h += '<p class="text-muted text-center">Sin ajustes manuales.</p>';
    } else {
      h += '<div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Tipo</th><th>Producto</th><th>Sub</th><th>Cant.</th><th>Motivo</th><th></th></tr></thead><tbody>';
      for (var i = 0; i < Math.min(ajustes.length, 50); i++) {
        var aj = ajustes[i];
        var catLabel = aj.categoria === 'especia' ? 'Especia' : aj.categoria === 'blend' ? 'Blend' : aj.categoria === 'envase' ? 'Frascos' : aj.categoria === 'bolsa' ? 'Bolsas' : 'Sticker';
        var subLabel = aj.subtipo === 'pala' ? 'Pala' : aj.subtipo === 'chico' ? 'Pequeño' : 'Grande';
        var cantColor = (aj.cantidad > 0) ? 'text-green' : 'text-red';
        var cantSign = (aj.cantidad > 0) ? '+' : '';
        var unidad = aj.subtipo === 'pala' ? 'g' : 'u';
        h += '<tr><td>' + (aj.fecha||'') + '</td>' +
          '<td><span class="badge badge-gold">' + catLabel + '</span></td>' +
          '<td class="fw7">' + (aj.productoNombre||'—') + '</td>' +
          '<td>' + subLabel + '</td>' +
          '<td class="' + cantColor + ' fw7">' + cantSign + (aj.cantidad||0) + ' ' + unidad + '</td>' +
          '<td class="text-sm" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + (aj.motivo||'').replace(/"/g, '&quot;') + '">' + (aj.motivo||'—') + '</td>' +
          '<td><button class="btn btn-sm btn-red" onclick="Pages.delAjuste(' + aj.id + ')">X</button></td></tr>';
      }
      h += '</tbody></table></div>';
    }
    h += '</div></div>';
    container.innerHTML = h;
  },

  /* ---------- Ajuste Manual de Stock ---------- */
  delAjuste(id) {
    if (!confirm('Eliminar este ajuste? (El stock NO se revertira)')) return;
    ArcanoDB.deleteAjuste(id);
    App.renderPage('stock');
  },

  formAjusteStock() {
    var especias = ArcanoDB.getEspecias();
    var blends = ArcanoDB.getBlends();
    var stickerList = ArcanoDB.getStickers();

    var modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = '<div class="modal modal-lg" style="max-width:560px">' +
      '<div class="modal-header"><h3>Ajustar Stock Manualmente</h3><button class="btn btn-ghost" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div>' +
      '<div class="modal-body">' +
        '<div class="form-group"><label>Categoria</label><select class="input" id="f-aj-cat">' +
          '<option value="especia">Especia</option>' +
          '<option value="blend">Blend</option>' +
          '<option value="envase">Frascos</option>' +
          '<option value="bolsa">Bolsas</option>' +
          '<option value="sticker">Stickers</option>' +
        '</select></div>' +
        '<div class="form-group" id="f-aj-prod-wrap"><label>Producto</label><select class="input" id="f-aj-prod"></select></div>' +
        '<div class="form-group"><label>Sub-tipo</label><select class="input" id="f-aj-sub"></select></div>' +
        '<div class="form-group"><label>Cantidad (<span style="color:var(--red)">negativo = restar</span>, positivo = sumar)</label><input type="number" class="input" id="f-aj-cant" placeholder="Ej: -100 o 50"></div>' +
        '<div class="form-group"><label>Motivo <span class="text-red">*</span></label><textarea class="input" id="f-aj-motivo" rows="2" placeholder="Ej: Se rompieron, merma, conteo fisico, etc."></textarea></div>' +
        '<div id="f-aj-preview" class="card mt-12" style="background:var(--bg);border-color:var(--gold);display:none"><div class="card-body" id="f-aj-preview-body"></div></div>' +
      '</div><div class="modal-footer">' +
        '<button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Cancelar</button>' +
        '<button class="btn btn-gold" id="btn-save-aj">Aplicar Ajuste</button>' +
      '</div></div>';
    document.body.appendChild(modal);

    var catSel = document.getElementById('f-aj-cat');
    var prodSel = document.getElementById('f-aj-prod');
    var prodWrap = document.getElementById('f-aj-prod-wrap');
    var subSel = document.getElementById('f-aj-sub');
    var cantInput = document.getElementById('f-aj-cant');
    var previewDiv = document.getElementById('f-aj-preview');
    var previewBody = document.getElementById('f-aj-preview-body');

    function buildEspOpts() {
      var o = '';
      for (var i = 0; i < especias.length; i++) o += '<option value="' + especias[i].id + '">' + especias[i].nombre + '</option>';
      return o;
    }
    function buildBlendOpts() {
      var o = '';
      for (var i = 0; i < blends.length; i++) o += '<option value="' + blends[i].id + '">' + blends[i].nombre + '</option>';
      return o;
    }
    function buildStickerOpts() {
      var o = '';
      for (var i = 0; i < stickerList.length; i++) o += '<option value="' + stickerList[i].nombre + '">' + stickerList[i].nombre + '</option>';
      return o;
    }

    function updateForm() {
      var cat = catSel.value;
      var prodId = prodSel.value;

      // Show/hide product selector
      if (cat === 'envase' || cat === 'bolsa') {
        prodWrap.style.display = 'none';
      } else {
        prodWrap.style.display = '';
        if (cat === 'especia') prodSel.innerHTML = buildEspOpts();
        else if (cat === 'blend') prodSel.innerHTML = buildBlendOpts();
        else if (cat === 'sticker') prodSel.innerHTML = buildStickerOpts();
      }

      // Subtipo options
      if (cat === 'especia') {
        subSel.innerHTML = '<option value="pala">Pala (gramos)</option><option value="chico">Frasco Pequeño (unidades)</option><option value="grande">Frasco Grande (unidades)</option>';
      } else if (cat === 'blend') {
        subSel.innerHTML = '<option value="chico">Frasco Pequeño (unidades)</option><option value="grande">Frasco Grande (unidades)</option>';
      } else if (cat === 'envase') {
        subSel.innerHTML = '<option value="chico">Chico (unidades)</option><option value="grande">Grande (unidades)</option>';
      } else if (cat === 'bolsa') {
        subSel.innerHTML = '<option value="chico">Chica (unidades)</option><option value="grande">Grande (unidades)</option>';
      } else if (cat === 'sticker') {
        subSel.innerHTML = '<option value="chico">Chico (unidades)</option><option value="grande">Grande (unidades)</option>';
      }

      updatePreview();
    }

    function updatePreview() {
      var cat = catSel.value;
      var sub = subSel.value;
      var cant = Number(cantInput.value) || 0;
      var db = ArcanoDB.getDB();
      var actual = 0;
      var nombre = '';
      var unidad = sub === 'pala' ? 'g' : 'u';

      if (cat === 'especia' && prodSel.value) {
        var esp = ArcanoDB.getEspecia(Number(prodSel.value));
        if (esp) {
          nombre = esp.nombre;
          if (sub === 'pala') actual = esp.stockBolsa || 0;
          else if (sub === 'chico') actual = esp.stockChico || 0;
          else actual = esp.stockGrande || 0;
        }
      } else if (cat === 'blend' && prodSel.value) {
        var bl = ArcanoDB.getBlend(Number(prodSel.value));
        if (bl) {
          nombre = bl.nombre;
          actual = (sub === 'grande') ? (bl.stockGrande || 0) : (bl.stockChico || 0);
        }
      } else if (cat === 'envase') {
        nombre = 'Frascos ' + sub;
        actual = (db.stockEnvases || {})[sub] || 0;
      } else if (cat === 'bolsa') {
        nombre = 'Bolsas ' + sub;
        actual = (db.stockBolsas || {})[sub] || 0;
      } else if (cat === 'sticker' && prodSel.value) {
        nombre = prodSel.value;
        var stks = ArcanoDB.getStickers();
        for (var i = 0; i < stks.length; i++) {
          if (stks[i].nombre === nombre) {
            actual = (sub === 'grande') ? (stks[i].stockGrande || 0) : (stks[i].stockChico || 0);
            break;
          }
        }
      }

      if (!nombre) { previewDiv.style.display = 'none'; return; }
      var resultante = actual + cant;
      var resColor = resultante < 0 ? 'text-red' : (resultante === 0 ? 'text-yellow' : 'text-green');
      previewDiv.style.display = '';
      previewBody.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center"><div><span class="text-sm text-muted">Stock actual de <b>' + nombre + '</b> (' + sub + '):</span></div>' +
        '<div style="text-align:right"><span class="fw7" style="font-size:1.2rem">' + actual + ' ' + unidad + '</span>' +
        ' <span class="text-muted" style="margin:0 8px">&#8594;</span>' +
        '<span class="fw7 ' + resColor + '" style="font-size:1.2rem">' + resultante + ' ' + unidad + '</span></div></div>';
    }

    catSel.addEventListener('change', updateForm);
    prodSel.addEventListener('change', updatePreview);
    subSel.addEventListener('change', updatePreview);
    cantInput.addEventListener('input', updatePreview);
    updateForm();

    // Save
    document.getElementById('btn-save-aj').addEventListener('click', function() {
      var motivo = (document.getElementById('f-aj-motivo').value || '').trim();
      if (!motivo) { alert('Debes indicar el motivo del ajuste'); return; }
      var cant = Number(cantInput.value) || 0;
      if (cant === 0) { alert('La cantidad no puede ser 0'); return; }
      var cat = catSel.value;
      var sub = subSel.value;
      var data = {
        categoria: cat,
        subtipo: sub,
        cantidad: cant,
        motivo: motivo,
        fecha: new Date().toISOString().slice(0, 10)
      };
      if (cat === 'especia' || cat === 'blend') {
        data.productoId = Number(prodSel.value);
      }
      if (cat === 'sticker') {
        data.productoNombre = prodSel.value;
      }
      try {
        ArcanoDB.saveAjuste(data);
        modal.remove();
        App.renderPage('stock');
      } catch (err) { alert('Error: ' + err.message); }
    });
  },

  /* ================================================================
     PEDIDOS (Tienda)
     ================================================================ */
  renderPedidos(container) {
    var pedidos = ArcanoDB.getPedidos();
    var estados = ['nuevo', 'confirmado', 'enviado', 'entregado', 'cancelado'];
    var estadoColors = { nuevo: 'text-red', confirmado: 'text-yellow', enviado: 'text-blue', entregado: 'text-green', cancelado: 'text-muted' };
    var estadoLabels = { nuevo: 'Nuevo', confirmado: 'Confirmado', enviado: 'Enviado', entregado: 'Entregado', cancelado: 'Cancelado' };

    var h = '<div class="page-actions"><button class="btn btn-outline" onclick="App.renderPage(\'dashboard\')">Volver al Dashboard</button></div>';

    // Summary cards
    h += '<div class="stats-grid mt-12" style="grid-template-columns: repeat(5, 1fr)">';
    for (var si = 0; si < estados.length; si++) {
      var est = estados[si];
      var count = 0;
      for (var sc = 0; sc < pedidos.length; sc++) { if (pedidos[sc].estado === est) count++; }
      h += '<div class="stat-card"><div class="stat-value ' + estadoColors[est] + '">' + count + '</div><div class="stat-label">' + estadoLabels[est] + '</div></div>';
    }
    h += '</div>';

    // Table
    h += '<div class="card mt-16"><div class="card-header"><h3>Todos los Pedidos</h3></div><div class="card-body">';
    if (pedidos.length === 0) {
      h += '<p class="text-muted text-center">Sin pedidos.</p>';
    } else {
      h += '<div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Hora</th><th>Cliente</th><th>Telefono</th><th>Ciudad</th><th>Items</th><th>Total</th><th>Estado</th><th></th></tr></thead><tbody>';
      for (var i = 0; i < pedidos.length; i++) {
        var p = pedidos[i];
        var cl = p.cliente || {};
        var fecha = p.creado ? p.creado.slice(0, 10) : '';
        var hora = p.creado ? p.creado.slice(11, 16) : '';
        var nItems = (p.items || []).length;
        var estClass = estadoColors[p.estado] || 'text-muted';
        var estLabel = estadoLabels[p.estado] || p.estado;
        h += '<tr>' +
          '<td>' + fecha + '</td>' +
          '<td class="fw7">' + hora + '</td>' +
          '<td class="fw7">' + (cl.nombre || '?') + '</td>' +
          '<td>' + (cl.telefono || '') + '</td>' +
          '<td>' + (cl.ciudad || '') + '</td>' +
          '<td>' + nItems + '</td>' +
          '<td class="text-gold fw7">$' + (p.total || 0).toLocaleString() + '</td>' +
          '<td><span class="badge ' + estClass + '" style="border:1px solid">' + estLabel + '</span></td>' +
          '<td><button class="btn btn-sm btn-gold" onclick="Pages.verPedido(\'' + p._key + '\')">Ver</button>' +
          '<button class="btn btn-sm btn-red" style="margin-left:4px" onclick="Pages.eliminarPedido(\'' + p._key + '\')">Eliminar</button></td>' +
          '</tr>';
      }
      h += '</tbody></table></div>';
    }
    h += '</div></div>';
    container.innerHTML = h;
  },

  verPedido(pedidoKey) {
    var pedidos = ArcanoDB.getPedidos();
    var p = null;
    for (var i = 0; i < pedidos.length; i++) { if (pedidos[i]._key === pedidoKey) { p = pedidos[i]; break; } }
    if (!p) { alert('Pedido no encontrado'); return; }
    var cl = p.cliente || {};
    var estadoLabels = { nuevo: 'Nuevo', confirmado: 'Confirmado', enviado: 'Enviado', entregado: 'Entregado', cancelado: 'Cancelado' };
    var estados = ['nuevo', 'confirmado', 'enviado', 'entregado', 'cancelado'];
    var estadoColors = { nuevo: 'text-red', confirmado: 'text-yellow', enviado: 'text-blue', entregado: 'text-green', cancelado: 'text-muted' };

    var h = '<div class="card"><div class="card-header"><h3>Pedido de ' + (cl.nombre || '?') + '</h3><span class="badge ' + (estadoColors[p.estado]||'') + '" style="font-size:0.85rem">' + (estadoLabels[p.estado]||p.estado) + '</span></div><div class="card-body">';
    h += '<div class="g2">';
    h += '<div><p class="text-sm text-muted">Fecha</p><p class="fw7">' + (p.creado || '').replace('T', ' ') + '</p></div>';
    h += '<div><p class="text-sm text-muted">Telefono</p><p class="fw7">' + (cl.telefono || '') + '</p></div>';
    h += '<div><p class="text-sm text-muted">Email</p><p class="fw7">' + (cl.email || '') + '</p></div>';
    h += '<div><p class="text-sm text-muted">Ciudad</p><p class="fw7">' + (cl.ciudad || '') + '</p></div>';
    h += '</div>';
    if (cl.direccion) h += '<p class="mt-8 text-sm text-muted">Direccion: <b>' + cl.direccion + '</b></p>';
    if (p.notas) h += '<p class="mt-4 text-sm text-muted">Notas: <b>' + p.notas + '</b></p>';

    h += '<h4 class="mt-16">Productos</h4>';
    h += '<div class="table-wrap mt-8"><table class="table"><thead><tr><th>Producto</th><th>Talla</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr></thead><tbody>';
    for (var i = 0; i < (p.items || []).length; i++) {
      var it = p.items[i];
      var tallaLabel = it.talla === 'grande' ? 'Grande' : 'Pequeño';
      h += '<tr><td class="fw7">' + (it.nombre || '?') + '</td><td>' + tallaLabel + '</td><td>' + (it.qty || 0) + '</td><td>$' + (it.precio || 0).toLocaleString() + '</td><td class="fw7">$' + (it.subtotal || 0).toLocaleString() + '</td></tr>';
    }
    h += '</tbody></table></div>';
    h += '<div style="text-align:right;margin-top:12px;font-size:1.2rem" class="fw7">Total: $' + (p.total || 0).toLocaleString() + '</div>';

    // Metodo de pago
    var pagoMetodo = p.metodoPago || '';
    var pagoConfirmado = pagoMetodo === 'efectivo' || pagoMetodo === 'qr';
    h += '<div class="mt-16 card" style="padding:14px;background:var(--bg-card)"><h4 style="margin-bottom:10px">Metodo de Pago</h4>';
    if (pagoConfirmado) {
      var pagoLabel = pagoMetodo === 'qr' ? 'QR' : 'Efectivo';
      var pagoColor = pagoMetodo === 'qr' ? 'var(--purple)' : 'var(--green)';
      var pagoIcon = pagoMetodo === 'qr' ? '&#9641;' : '&#9733;';
      h += '<div style="display:flex;align-items:center;gap:8px;padding:10px;border-radius:8px;background:' + pagoColor + ';color:#fff;font-weight:700">';
      h += '<span style="font-size:1.3em">' + pagoIcon + '</span> ' + pagoLabel + ' <span style="font-weight:400;opacity:0.8">(confirmado)</span></div>';
      h += '<button class="btn btn-outline btn-sm mt-8" style="color:var(--red);border-color:var(--red)" onclick="Pages._pedidoResetPago(\'' + pedidoKey + '\')">Cambiar Metodo</button>';
    } else {
      h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
      h += '<button class="btn btn-sm" style="padding:16px;font-size:1rem;font-weight:700;background:var(--green);color:#fff;border:none;border-radius:8px" onclick="Pages._pedidoConfirmarPago(\'' + pedidoKey + '\',\'efectivo\')">&#9733; Efectivo</button>';
      h += '<button class="btn btn-sm" style="padding:16px;font-size:1rem;font-weight:700;background:var(--purple);color:#fff;border:none;border-radius:8px" onclick="Pages._pedidoConfirmarPago(\'' + pedidoKey + '\',\'qr\')">&#9641; QR</button>';
      h += '</div>';
      h += '<p class="text-sm text-muted mt-8" style="text-align:center">Debes confirmar el metodo de pago antes de marcar como Entregado</p>';
    }
    h += '</div>';

    // Estado buttons
    h += '<div class="mt-16"><h4>Cambiar Estado</h4><div class="mt-8" style="display:flex;gap:8px;flex-wrap:wrap">';
    for (var ei = 0; ei < estados.length; ei++) {
      var est = estados[ei];
      var isActive = p.estado === est;
      var isEntregado = est === 'entregado';
      if (isEntregado && !pagoConfirmado) {
        h += '<button class="btn btn-sm btn-outline" style="opacity:0.4;cursor:not-allowed" disabled title="Confirma el metodo de pago primero">' + estadoLabels[est] + '</button>';
      } else {
        var btnClass = isActive ? 'btn btn-gold' : 'btn btn-outline';
        h += '<button class="' + btnClass + ' btn-sm" onclick="Pages.cambiarEstadoPedido(\'' + pedidoKey + '\',\'' + est + '\')">' + estadoLabels[est] + '</button>';
      }
    }
    h += '</div></div>';

    h += '</div><div class="modal-footer"><button class="btn btn-outline" onclick="document.getElementById(\'pedido-modal\').remove()">Cerrar</button>';
    h += '<a class="btn btn-gold" href="tel:' + (cl.telefono || '') + '" target="_blank">Llamar Cliente</a>';
    h += '<button class="btn btn-sm btn-red" style="margin-left:auto" onclick="Pages.eliminarPedido(\'' + pedidoKey + '\')">Eliminar Pedido</button>';
    h += '</div></div>';

    var modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'pedido-modal';
    modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
    modal.innerHTML = '<div class="modal modal-lg" style="max-width:680px">' + h + '</div>';
    document.body.appendChild(modal);
  },

  _pedidoConfirmarPago(pedidoKey, metodo) {
    ArcanoDB.updatePedidoMetodoPago(pedidoKey, metodo);
    var modal = document.getElementById('pedido-modal');
    if (modal) modal.remove();
    Pages.verPedido(pedidoKey);
    toast(metodo === 'qr' ? 'Pago QR confirmado' : 'Pago Efectivo confirmado');
  },

  _pedidoResetPago(pedidoKey) {
    ArcanoDB.updatePedidoMetodoPago(pedidoKey, '');
    var modal = document.getElementById('pedido-modal');
    if (modal) modal.remove();
    Pages.verPedido(pedidoKey);
  },

  cambiarEstadoPedido(pedidoKey, nuevoEstado) {
    ArcanoDB.updatePedidoEstado(pedidoKey, nuevoEstado);
    var modal = document.getElementById('pedido-modal');
    if (modal) modal.remove();
    App.renderPage(App.currentPage);
  },

  eliminarPedido(pedidoKey) {
    if (!confirm('Seguro que deseas eliminar este pedido? Esta accion no se puede deshacer.')) return;
    var modal = document.getElementById('pedido-modal');
    if (modal) modal.remove();
    ArcanoDB.deletePedido(pedidoKey);
    App.renderPage(App.currentPage);
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
      h += '<div class="table-wrap"><table class="table"><thead><tr><th>Nombre</th><th>Tipo</th><th>Cat.</th><th>Precio Pequeño</th><th>Precio Grande</th><th>Stock Pq</th><th>Stock Gr</th></tr></thead><tbody>';
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
          '<div class="form-group"><label>Grs por Frasco Pequeño</label><input type="number" class="input" id="f-import-gc" value="30" min="1"></div>' +
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
      h += '<p class="text-sm text-muted">No hay etiquetas de uso para esta categoria.</p>';
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
      alert('La etiqueta de uso ya existe en esta categoria.');
    }
  },

  doRemoveTag(cat, tagName) {
    if (confirm('Eliminar etiqueta de uso "' + tagName + '"? Se quitara de los productos que la tengan.')) {
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
  },

  /* ================================================================
     RECETAS IA  (Groq API — modelo opensource Llama 3.3 70B)
     ================================================================ */
  renderRecetasAdmin(container) {
    var savedKey = localStorage.getItem('arcano_groq_key') || '';
    var categorias = ['Comida', 'Infusiones', 'Cocteleria'];

    // Build list of available products for context
    var productos = ArcanoDB.getTiendaProductos();
    var productNames = [];
    for (var i = 0; i < productos.length; i++) productNames.push(productos[i].nombre);
    var productsContext = productNames.length > 0 ? productNames.join(', ') : 'No hay productos disponibles';

    var h = '<div class="card mb-16">' +
      '<div class="card-header"><h3>Configuracion</h3></div>' +
      '<div class="card-body">' +
        '<p class="text-sm text-muted mb-12">Usa <a href="https://console.groq.com/keys" target="_blank" style="color:var(--gold)">Groq Console</a> para obtener tu API key gratis. Modelo: <b>Llama 3.3 70B</b> (opensource).</p>' +
        '<div class="form-group"><label>Groq API Key</label>' +
        '<input type="password" class="input" id="ra-groq-key" value="' + savedKey + '" placeholder="gsk_xxxx..." onblur="Pages._saveGroqKey()">' +
        '</div>' +
        '<div class="g2">' +
          '<div class="form-group"><label>Categoria</label>' +
          '<select class="input" id="ra-categoria">';
    for (var c = 0; c < categorias.length; c++) {
      h += '<option value="' + categorias[c] + '">' + categorias[c] + '</option>';
    }
    h += '</select></div>' +
          '<div class="form-group"><label>Tema de la receta (opcional)</label>' +
          '<input type="text" class="input" id="ra-tema" placeholder="Ej: arroz con leche, adobo de pollo...">' +
          '</div>' +
        '</div>' +
        '<div class="form-group"><label>Idioma de salida</label>' +
        '<select class="input" id="ra-idioma">' +
          '<option value="es">Espanol</option>' +
          '<option value="en">English</option>' +
        '</select></div>' +
        '<button class="btn btn-gold" id="ra-gen-btn" onclick="Pages.generarReceta()">Generar Receta con IA</button>' +
        '<span id="ra-gen-status" class="text-sm text-muted ml-12"></span>' +
      '</div>' +
    '</div>';

    // Existing recipes section
    h += '<div class="card">' +
      '<div class="card-header"><h3>Recetas Existentes (' + '<span id="ra-count">0</span>' + ')</h3></div>' +
      '<div class="card-body" id="ra-list"><div class="text-center text-muted">Cargando...</div></div>' +
    '</div>';

    container.innerHTML = h;

    // Load existing recipes from Firebase
    Pages._loadRecetasAdmin();

    // Try to load Groq key from Firebase (persistent storage)
    try {
      firebase.database().ref('arcano/config/groqKey').once('value').then(function(snap) {
        var fbKey = snap.val();
        if (fbKey) {
          var inp = document.getElementById('ra-groq-key');
          if (inp) inp.value = fbKey;
          localStorage.setItem('arcano_groq_key', fbKey);
        }
      }).catch(function() {});
    } catch(e) {}
  },

  _saveGroqKey: function() {
    var inp = document.getElementById('ra-groq-key');
    if (!inp) return;
    var key = inp.value.trim();
    if (key) {
      localStorage.setItem('arcano_groq_key', key);
      try { firebase.database().ref('arcano/config/groqKey').set(key); } catch(e) {}
    }
  },

  _loadRecetasAdmin: function() {
    var ref = firebase.database().ref('arcano/db/recetas').orderByChild('fecha');
    ref.once('value', function(snap) {
      var data = snap.val();
      var recetas = [];
      if (data) {
        var keys = Object.keys(data);
        for (var i = 0; i < keys.length; i++) {
          var r = data[keys[i]];
          r._key = keys[i];
          recetas.push(r);
        }
      }
      recetas.sort(function(a, b) { return (b.fecha || '').localeCompare(a.fecha || ''); });
      Pages._renderRecetasList(recetas);
    });
  },

  _renderRecetasList: function(recetas) {
    var countEl = document.getElementById('ra-count');
    var listEl = document.getElementById('ra-list');
    if (!countEl || !listEl) return;
    countEl.textContent = recetas.length;
    if (recetas.length === 0) {
      listEl.innerHTML = '<p class="text-center text-muted">No hay recetas. Genera la primera con el boton de arriba.</p>';
      return;
    }
    var h = '<div class="table-wrap"><table class="table"><thead><tr><th>Titulo</th><th>Categoria</th><th>Tiempo</th><th>Fecha</th><th></th></tr></thead><tbody>';
    for (var i = 0; i < recetas.length; i++) {
      var r = recetas[i];
      h += '<tr>' +
        '<td class="fw7">' + (r.titulo || 'Sin titulo') + '</td>' +
        '<td><span class="badge badge-gold">' + (r.categoria || '') + '</span></td>' +
        '<td>' + (r.tiempo || '-') + '</td>' +
        '<td class="text-sm text-muted">' + (r.fecha || '') + '</td>' +
        '<td><button class="btn btn-sm btn-red" onclick="Pages.borrarReceta(\'' + r._key + '\')">Eliminar</button></td>' +
        '</tr>';
    }
    h += '</tbody></table></div>';
    listEl.innerHTML = h;
  },

  borrarReceta: function(key) {
    if (!confirm('Eliminar esta receta?')) return;
    firebase.database().ref('arcano/db/recetas/' + key).remove(function() {
      Pages._loadRecetasAdmin();
    });
  },

  generarReceta: function() {
    var keyInput = document.getElementById('ra-groq-key');
    var catSelect = document.getElementById('ra-categoria');
    var temaInput = document.getElementById('ra-tema');
    var idiomaSelect = document.getElementById('ra-idioma');
    var btn = document.getElementById('ra-gen-btn');
    var status = document.getElementById('ra-gen-status');

    var apiKey = keyInput.value.trim();
    var categoria = catSelect.value;
    var tema = temaInput.value.trim();
    var idioma = idiomaSelect.value;

    if (!apiKey) { alert('Ingresa tu Groq API Key'); keyInput.focus(); return; }
    localStorage.setItem('arcano_groq_key', apiKey);
    try { firebase.database().ref('arcano/config/groqKey').set(apiKey); } catch(e) {}

    // Build product context
    var productos = ArcanoDB.getTiendaProductos();
    var nombres = [];
    for (var i = 0; i < productos.length; i++) nombres.push(productos[i].nombre);
    var productContext = nombres.length > 0 ? nombres.join(', ') : 'especias y blends variados';

    var langInstr = idioma === 'en'
      ? 'Respond ONLY in English. All fields (titulo, descripcion, ingredientes, pasos) must be in English.'
      : 'Responde SOLO en espanol. Todos los campos (titulo, descripcion, ingredientes, pasos) deben estar en espanol.';

    var temaInstr = tema
      ? 'El tema especifico es: ' + tema + '.'
      : 'Inventa un tema creativo y apetitoso.';

    var systemPrompt =
      'Eres un chef experto en especias y blends artesanales de la marca Arcano Especias. ' +
      'Tu especialidad es crear recetas deliciosas que resalten los sabores de las especias. ' +
      'Los productos disponibles son: ' + productContext + '. ' +
      'Si es posible, usa al menos uno de estos productos en la receta. ' +
      langInstr;

    var userPrompt =
      'Genera una receta de categoria "' + categoria + '". ' + temaInstr + '\n\n' +
      'Responde EXCLUSIVAMENTE con un JSON valido (sin markdown, sin backticks, sin texto antes o despues) con esta estructura exacta:\n' +
      '{"titulo": "...", "descripcion": "... (2-3 oraciones)", "categoria": "' + categoria + '", ' +
      '"tiempo": "... (ej: 30 min)", "porciones": "... (ej: 4 porciones)", ' +
      '"ingredientes": ["1 cucharadita de comino", "200g de pollo", ...], ' +
      '"pasos": ["Paso 1: ...", "Paso 2: ...", ...]}\n\n' +
      'La receta debe ser practica, deliciosa y usar especias de forma creativa. ' +
      'Entre 4 y 8 ingredientes, entre 4 y 6 pasos.';

    btn.disabled = true;
    btn.textContent = 'Generando...';
    status.textContent = 'Consultando Llama 3.3 70B via Groq...';

    fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.8,
        max_tokens: 1024,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    })
    .then(function(res) {
      if (!res.ok) return res.json().then(function(e) { throw new Error((e.error && e.error.message) || 'Error ' + res.status); });
      return res.json();
    })
    .then(function(data) {
      var content = data.choices[0].message.content.trim();
      // Strip markdown code blocks if present
      content = content.replace(/^```json?\s*/i, '').replace(/\s*```$/, '');
      var receta = JSON.parse(content);

      // Validate structure
      if (!receta.titulo) throw new Error('La receta no tiene titulo');
      if (!Array.isArray(receta.ingredientes)) throw new Error('ingredientes debe ser un array');
      if (!Array.isArray(receta.pasos)) throw new Error('pasos debe ser un array');

      // Save to Firebase
      receta.fecha = new Date().toISOString().slice(0, 10);
      if (!receta.categoria) receta.categoria = categoria;
      firebase.database().ref('arcano/db/recetas').push(receta, function(err) {
        if (err) {
          status.textContent = 'Error al guardar: ' + (err.message || err);
        } else {
          status.innerHTML = '<span style="color:var(--green)">Receta guardada: ' + receta.titulo + '</span>';
          Pages._loadRecetasAdmin();
        }
        btn.disabled = false;
        btn.textContent = 'Generar Receta con IA';
      });
    })
    .catch(function(err) {
      status.innerHTML = '<span style="color:var(--red)">Error: ' + err.message + '</span>';
      btn.disabled = false;
      btn.textContent = 'Generar Receta con IA';
    });
  },

  /* ================================================================
     ESTADISTICAS DE VENTAS (Chart.js)
     ================================================================ */
  _estPeriod: null,
  _estTab: null,
  _estCharts: [],

  renderEstadisticas: function(container) {
    var ventas = ArcanoDB.getVentas();
    var pedidos = ArcanoDB.getPedidos();
    var producciones = ArcanoDB.getProducciones();
    var entradas = ArcanoDB.getEntradas();
    var especias = ArcanoDB.getEspecias();
    var blends = ArcanoDB.getBlends();

    // === COMBINE ALL SALES (admin + tienda + PDV) ===
    var allSales = [];
    // Admin ventas
    for (var vi = 0; vi < ventas.length; vi++) {
      var v = ventas[vi];
      var vItems = [];
      if (v.items) { for (var vi2 = 0; vi2 < v.items.length; vi2++) { var it = v.items[vi2]; vItems.push({ nombre: it.productoNombre || '?', tipo: it.tipo || 'especia', talla: it.talla || 'chico', cantidad: it.cantidad || 0, precio: it.precioUnitario || 0, subtotal: it.subtotal || 0 }); } }
      allSales.push({ fecha: v.fecha || '', creado: v.creado || '', total: v.total || 0, items: vItems, source: 'admin', metodoPago: v.metodoPago || 'efectivo' });
    }
    // Tienda pedidos
    for (var pi = 0; pi < pedidos.length; pi++) {
      var p = pedidos[pi];
      if (p.estado === 'cancelado') continue;
      var pItems = [];
      if (p.items) { for (var pi2 = 0; pi2 < p.items.length; pi2++) { var pit = p.items[pi2]; pItems.push({ nombre: pit.nombre || '?', tipo: pit.tipo || 'especia', talla: pit.talla || 'chico', cantidad: pit.qty || pit.cantidad || 0, precio: pit.precio || 0, subtotal: pit.subtotal || 0 }); } }
      var pFecha = p.creado ? p.creado.slice(0, 10) : '';
      allSales.push({ fecha: pFecha, creado: p.creado || '', total: p.total || 0, items: pItems, source: 'tienda', metodoPago: p.metodoPago || '', cliente: (p.cliente || {}).nombre || '', ciudad: (p.cliente || {}).ciudad || '' });
    }
    // PDV ventas
    var pdvs = ArcanoDB.getPuntosDeVenta ? ArcanoDB.getPuntosDeVenta() : [];
    var pdvVentasAll = [];
    for (var pvi = 0; pvi < pdvs.length; pvi++) {
      var pdvV = ArcanoDB.getPDVVentas(pdvs[pvi].id);
      for (var pvj = 0; pvj < pdvV.length; pvj++) {
        var pv = pdvV[pvj];
        var pvItems = [];
        if (pv.items) { for (var pvk = 0; pvk < pv.items.length; pvk++) {
          var pvIt = pv.items[pvk];
          pvItems.push({ nombre: pvIt.productoNombre || '?', tipo: pvIt.tipo || 'especia', talla: pvIt.talla || 'chico', cantidad: pvIt.cantidad || 0, precio: pvIt.precioUnitario || 0, subtotal: pvIt.subtotal || 0 });
        }}
        allSales.push({ fecha: pv.fecha || '', creado: pv.creado || '', total: pv.total || 0, items: pvItems, source: 'pdv', metodoPago: pv.metodoPago || 'efectivo', pdvNombre: pdvs[pvi].nombre || 'PDV' });
      }
      pdvVentasAll = pdvVentasAll.concat(pdvV);
    }
    allSales.sort(function(a, b) { return (b.fecha || '').localeCompare(a.fecha || ''); });

    if (!Pages._estTab) Pages._estTab = 'ventas';

    var h = '<div class="est-tabs">';
    h += '<button class="est-tab' + (Pages._estTab === 'ventas' ? ' active' : '') + '" onclick="Pages._estTab=\'ventas\';App.renderPage(\'estadisticas\')">Ventas</button>';
    h += '<button class="est-tab' + (Pages._estTab === 'pdv' ? ' active' : '') + '" onclick="Pages._estTab=\'pdv\';App.renderPage(\'estadisticas\')">P. de Venta</button>';
    h += '<button class="est-tab' + (Pages._estTab === 'costos' ? ' active' : '') + '" onclick="Pages._estTab=\'costos\';App.renderPage(\'estadisticas\')">Costos y Margen</button>';
    h += '<button class="est-tab' + (Pages._estTab === 'produccion' ? ' active' : '') + '" onclick="Pages._estTab=\'produccion\';App.renderPage(\'estadisticas\')">Produccion</button>';
    h += '<button class="est-tab' + (Pages._estTab === 'pedidos' ? ' active' : '') + '" onclick="Pages._estTab=\'pedidos\';App.renderPage(\'estadisticas\')">Pedidos Tienda</button>';
    h += '<button class="est-tab' + (Pages._estTab === 'inventario' ? ' active' : '') + '" onclick="Pages._estTab=\'inventario\';App.renderPage(\'estadisticas\')">Inventario</button>';
    h += '</div>';
    h += '<div id="est-content"></div>';
    container.innerHTML = h;

    if (Pages._estTab === 'ventas') Pages._renderVentas(allSales, container.querySelector('#est-content'));
    else if (Pages._estTab === 'pdv') Pages._renderPDVEstadisticas(container.querySelector('#est-content'), pdvs);
    else if (Pages._estTab === 'costos') Pages._renderCostos(allSales, container.querySelector('#est-content'), entradas, especias, blends, producciones);
    else if (Pages._estTab === 'produccion') Pages._renderProduccion(allSales, container.querySelector('#est-content'), producciones);
    else if (Pages._estTab === 'pedidos') Pages._renderPedidosTienda(allSales, container.querySelector('#est-content'));
    else if (Pages._estTab === 'inventario') Pages._renderInventario(container.querySelector('#est-content'), especias, blends);
  },

  /* ================================================================
     VENTAS TAB
     ================================================================ */
  _renderVentas: function(data, el) {
    if (!el) return;
    var totalIngresos = 0, totalOps = 0, totalUnidades = 0;
    var prodMap = {}, tipoMap = {}, tallaMap = {}, diaMap = {}, monthMap = {}, ciudadMap = {}, sourceMap = {};
    for (var d = 0; d < data.length; d++) {
      var s = data[d];
      totalIngresos += (s.total || 0);
      totalOps++;
      sourceMap[s.source] = (sourceMap[s.source] || 0) + 1;
      var opUnidades = 0;
      if (s.items) { for (var it = 0; it < s.items.length; it++) {
        var item = s.items[it];
        totalUnidades += (item.cantidad || 0);
        opUnidades += (item.cantidad || 0);
        var key = item.nombre + '|' + item.tipo + '|' + item.talla;
        if (!prodMap[key]) prodMap[key] = { nombre: item.nombre, tipo: item.tipo, talla: item.talla, unidades: 0, ingreso: 0 };
        prodMap[key].unidades += (item.cantidad || 0);
        prodMap[key].ingreso += (item.subtotal || 0);
        tipoMap[item.tipo] = (tipoMap[item.tipo] || 0) + (item.cantidad || 0);
        tallaMap[item.talla || 'chico'] = (tallaMap[item.talla || 'chico'] || 0) + (item.cantidad || 0);
      }}
      if (s.fecha) {
        if (!diaMap[s.fecha]) diaMap[s.fecha] = { ops: 0, unidades: 0, ingresos: 0 };
        diaMap[s.fecha].ops++;
        diaMap[s.fecha].unidades += opUnidades;
        diaMap[s.fecha].ingresos += (s.total || 0);
        var mn = s.fecha.substring(0, 7);
        if (!monthMap[mn]) monthMap[mn] = { ops: 0, unidades: 0, ingresos: 0 };
        monthMap[mn].ops++;
        monthMap[mn].unidades += opUnidades;
        monthMap[mn].ingresos += (s.total || 0);
      }
      if (s.ciudad) {
        if (!ciudadMap[s.ciudad]) ciudadMap[s.ciudad] = { ops: 0, ingresos: 0 };
        ciudadMap[s.ciudad].ops++;
        ciudadMap[s.ciudad].ingresos += (s.total || 0);
      }
    }
    var prodArr = Object.values(prodMap).sort(function(a, b) { return b.ingreso - a.ingreso; });

    // Calculate day-on-day trend
    var diasSorted = Object.keys(diaMap).sort();
    var ingresosAyer = 0;
    if (diasSorted.length >= 2) { ingresosAyer = diaMap[diasSorted[diasSorted.length - 2]].ingresos || 0; }
    var ingresosHoy = diasSorted.length > 0 ? diaMap[diasSorted[diasSorted.length - 1]].ingresos : 0;
    var tendenciaDiaria = ingresosAyer > 0 ? Math.round(((ingresosHoy - ingresosAyer) / ingresosAyer) * 100) : 0;
    var tendSign = tendenciaDiaria >= 0 ? '+' : '';

    // Monthly comparison
    var mesesSorted = Object.keys(monthMap).sort();
    var mesActual = new Date().toISOString().slice(0, 7);
    var mesAnterior = mesesSorted.length >= 2 ? mesesSorted[mesesSorted.length - 2] : '';
    var ingresosMesActual = (monthMap[mesActual] || {}).ingresos || 0;
    var ingresosMesAnterior = mesAnterior ? (monthMap[mesAnterior] || {}).ingresos || 0 : 0;
    var tendenciaMensual = ingresosMesAnterior > 0 ? Math.round(((ingresosMesActual - ingresosMesAnterior) / ingresosMesAnterior) * 100) : 0;
    var tendMSign = tendenciaMensual >= 0 ? '+' : '';

    var h = '';
    // KPIs
    h += '<div class="est-kpi-grid">';
    h += '<div class="est-kpi"><div class="est-kpi-value">$' + totalIngresos.toLocaleString() + '</div><div class="est-kpi-label">Ingresos Totales</div><div class="est-kpi-sub">' + totalOps + ' operaciones</div></div>';
    h += '<div class="est-kpi"><div class="est-kpi-value">' + totalUnidades + '</div><div class="est-kpi-label">Unidades Vendidas</div><div class="est-kpi-sub">' + prodArr.length + ' productos distintos</div></div>';
    h += '<div class="est-kpi"><div class="est-kpi-value">$' + (totalOps > 0 ? Math.round(totalIngresos / totalOps) : 0).toLocaleString() + '</div><div class="est-kpi-label">Ticket Promedio</div><div class="est-kpi-sub">por operacion</div></div>';
    h += '<div class="est-kpi ' + (tendenciaDiaria >= 0 ? 'up' : 'down') + '"><div class="est-kpi-value">' + tendSign + tendenciaDiaria + '%</div><div class="est-kpi-label">Tendencia Dia</div><div class="est-kpi-sub">vs dia anterior</div></div>';
    h += '</div>';

    // Monthly comparison bar
    h += '<div class="card mt-16"><div class="card-header"><h3>Comparacion Mensual</h3></div><div class="card-body">';
    h += '<div class="est-kpi-grid" style="grid-template-columns:1fr 1fr 1fr">';
    h += '<div class="est-kpi"><div class="est-kpi-value">$' + ingresosMesActual.toLocaleString() + '</div><div class="est-kpi-label">Mes Actual (' + mesActual + ')</div><div class="est-kpi-sub">' + ((monthMap[mesActual] || {}).ops || 0) + ' ops / ' + ((monthMap[mesActual] || {}).unidades || 0) + ' uds</div></div>';
    h += '<div class="est-kpi"><div class="est-kpi-value">$' + ingresosMesAnterior.toLocaleString() + '</div><div class="est-kpi-label">Mes Anterior (' + mesAnterior + ')</div><div class="est-kpi-sub">' + (mesAnterior ? ((monthMap[mesAnterior] || {}).ops || 0) + ' ops / ' + ((monthMap[mesAnterior] || {}).unidades || 0) + ' uds' : 'sin datos') + '</div></div>';
    h += '<div class="est-kpi ' + (tendenciaMensual >= 0 ? 'up' : 'down') + '"><div class="est-kpi-value">' + tendMSign + tendenciaMensual + '%</div><div class="est-kpi-label">Variacion Mensual</div><div class="est-kpi-sub">' + (ingresosMesActual >= ingresosMesAnterior ? 'crecimiento' : 'caida') + '</div></div>';
    h += '</div></div></div>';

    // Source breakdown (admin vs tienda vs pdv)
    h += '<div class="card mt-16"><div class="card-header"><h3>Canal de Venta</h3></div><div class="card-body">';
    h += '<div class="stats-grid" style="grid-template-columns:1fr 1fr 1fr">';
    var adminIngreso = 0, tiendaIngreso = 0, pdvIngreso = 0, adminOps = 0, tiendaOps = 0, pdvOps = 0;
    for (var d = 0; d < data.length; d++) {
      if (data[d].source === 'admin') { adminIngreso += data[d].total || 0; adminOps++; }
      else if (data[d].source === 'pdv') { pdvIngreso += data[d].total || 0; pdvOps++; }
      else { tiendaIngreso += data[d].total || 0; tiendaOps++; }
    }
    var totalCh = adminIngreso + tiendaIngreso + pdvIngreso;
    h += '<div class="stat-card" style="border-left-color:var(--gold)"><div class="stat-value">$' + adminIngreso.toLocaleString() + '</div><div class="stat-label">Ventas Admin (Fisico)</div><div class="stat-sub">' + adminOps + ' ops' + (totalCh > 0 ? ' (' + Math.round(adminIngreso/totalCh*100) + '%)' : '') + '</div></div>';
    h += '<div class="stat-card" style="border-left-color:var(--blue)"><div class="stat-value">$' + tiendaIngreso.toLocaleString() + '</div><div class="stat-label">Pedidos Tienda Online</div><div class="stat-sub">' + tiendaOps + ' ops' + (totalCh > 0 ? ' (' + Math.round(tiendaIngreso/totalCh*100) + '%)' : '') + '</div></div>';
    h += '<div class="stat-card" style="border-left-color:var(--purple)"><div class="stat-value">$' + pdvIngreso.toLocaleString() + '</div><div class="stat-label">Puntos de Venta</div><div class="stat-sub">' + pdvOps + ' ops' + (totalCh > 0 ? ' (' + Math.round(pdvIngreso/totalCh*100) + '%)' : '') + '</div></div>';
    h += '</div></div></div>';
    // Metodo de pago (admin + pdv ventas)
    var efectivoIng = 0, qrIng = 0, efectivoOps = 0, qrOps = 0;
    for (var d = 0; d < data.length; d++) {
      if (data[d].source === 'tienda') continue;
      if (data[d].metodoPago === 'qr') { qrIng += data[d].total || 0; qrOps++; }
      else { efectivoIng += data[d].total || 0; efectivoOps++; }
    }
    var _mpT = efectivoIng + qrIng;
    h += '<div class="card mt-16"><div class="card-header"><h3>Metodo de Pago (Admin + PDV)</h3></div><div class="card-body">';
    h += '<div class="stats-grid" style="grid-template-columns:1fr 1fr">';
    h += '<div class="stat-card" style="border-left-color:var(--green)"><div class="stat-value">$' + efectivoIng.toLocaleString() + '</div><div class="stat-label">Efectivo</div><div class="stat-sub">' + efectivoOps + ' ops' + (_mpT > 0 ? ' (' + Math.round(efectivoIng/_mpT*100) + '%)' : '') + '</div></div>';
    h += '<div class="stat-card" style="border-left-color:#8e44ad"><div class="stat-value">$' + qrIng.toLocaleString() + '</div><div class="stat-label">QR</div><div class="stat-sub">' + qrOps + ' ops' + (_mpT > 0 ? ' (' + Math.round(qrIng/_mpT*100) + '%)' : '') + '</div></div>';
    h += '</div></div></div>';

    // Charts
    h += '<div class="est-charts-grid">';
    h += '<div class="est-chart-card"><h4>Ingresos Diarios</h4><div class="est-chart-wrap"><canvas id="chart-daily"></canvas></div></div>';
    h += '<div class="est-chart-card"><h4>Ingresos Mensuales</h4><div class="est-chart-wrap"><canvas id="chart-monthly"></canvas></div></div>';
    h += '</div>';

    h += '<div class="est-charts-grid">';
    h += '<div class="est-chart-card"><h4>Tipo de Producto</h4><div class="est-chart-wrap"><canvas id="chart-types"></canvas></div></div>';
    h += '<div class="est-chart-card"><h4>Venta por Talla</h4><div class="est-chart-wrap"><canvas id="chart-tallas"></canvas></div></div>';
    h += '</div>';

    h += '<div class="est-charts-grid">';
    h += '<div class="est-chart-card"><h4>Top 10 Productos por Ingreso</h4><div class="est-chart-wrap est-chart-full"><canvas id="chart-products"></canvas></div></div>';
    h += '<div class="est-chart-card"><h4>Ingresos por Ciudad</h4><div class="est-chart-wrap"><canvas id="chart-ciudad"></canvas></div></div>';
    h += '</div>';

    // Top products table
    h += '<div class="card mt-16"><div class="card-header"><h3>Top Productos por Ingreso</h3></div><div class="card-body">';
    if (prodArr.length > 0) {
      h += '<div class="table-wrap"><table class="est-detail-table"><thead><tr><th>Producto</th><th>Tipo</th><th>Talla</th><th>Unidades</th><th>Ingreso</th><th>Participacion</th></tr></thead><tbody>';
      for (var pi = 0; pi < Math.min(prodArr.length, 20); pi++) {
        var pp = prodArr[pi];
        var pct = totalIngresos > 0 ? (pp.ingreso / totalIngresos * 100).toFixed(1) : '0';
        h += '<tr><td class="fw7">' + pp.nombre + '</td><td><span class="badge ' + (pp.tipo === 'blend' ? 'badge-blue' : 'badge-gold') + '">' + (pp.tipo === 'blend' ? 'Blend' : 'Especia') + '</span></td><td>' + pp.talla + '</td><td>' + pp.unidades + '</td><td class="fw7" style="color:var(--gold)">$' + pp.ingreso.toLocaleString() + '</td><td>' + pct + '%</td></tr>';
      }
      h += '</tbody></table></div>';
    } else { h += '<p class="text-muted text-center">Sin datos</p>'; }
    h += '</div></div>';

    // Daily breakdown
    var diasArr = Object.keys(diaMap).sort().reverse();
    if (diasArr.length > 0) {
      h += '<div class="card mt-16"><div class="card-header"><h3>Desglose por Dia</h3></div><div class="card-body">';
      h += '<div class="table-wrap"><table class="est-detail-table"><thead><tr><th>Fecha</th><th>Ops</th><th>Unidades</th><th>Ingreso</th><th>Ticket Prom.</th><th>Barra</th></tr></thead><tbody>';
      var maxDiaIng = 0;
      for (var di = 0; di < diasArr.length; di++) { if (diaMap[diasArr[di]].ingresos > maxDiaIng) maxDiaIng = diaMap[diasArr[di]].ingresos; }
      for (var di2 = 0; di2 < diasArr.length; di2++) {
        var dk = diasArr[di2]; var dv = diaMap[dk];
        var dBarW = maxDiaIng > 0 ? (dv.ingresos / maxDiaIng * 100).toFixed(0) : 0;
        var ticketP = dv.ops > 0 ? Math.round(dv.ingresos / dv.ops) : 0;
        h += '<tr><td class="fw7">' + dk + '</td><td>' + dv.ops + '</td><td>' + dv.unidades + '</td><td class="fw7" style="color:var(--gold)">$' + dv.ingresos.toLocaleString() + '</td><td>$' + ticketP.toLocaleString() + '</td><td><div class="est-bar-inline"><div class="est-bar-track"><div class="est-bar-fill" style="width:' + dBarW + '%;background:var(--gold)"></div></div></div></td></tr>';
      }
      h += '</tbody></table></div></div></div>';
    }

    el.innerHTML = h;

    // === CHARTS ===
    if (Pages._estCharts) { for (var ci = 0; ci < Pages._estCharts.length; ci++) { try { Pages._estCharts[ci].destroy(); } catch (e) {} } }
    Pages._estCharts = [];
    Chart.defaults.color = '#9a8a78';
    Chart.defaults.borderColor = '#3a2218';
    Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

    var gOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { boxWidth: 12, padding: 12 } } }, scales: { y: { ticks: { callback: function(v) { return '$' + v.toLocaleString(); } }, grid: { color: 'rgba(58,34,24,0.5)' } }, x: { grid: { display: false } } } };

    // Daily line
    var dailyLabels = [], dailyData = [], dailyOpsData = [];
    for (var dd = 0; dd < diasSorted.length; dd++) { dailyLabels.push(diasSorted[dd].slice(5)); dailyData.push(diaMap[diasSorted[dd]].ingresos); dailyOpsData.push(diaMap[diasSorted[dd]].ops); }
    var ctxD = document.getElementById('chart-daily');
    if (ctxD) {
      Pages._estCharts.push(new Chart(ctxD, {
        type: 'line',
        data: { labels: dailyLabels, datasets: [
          { label: 'Ingresos ($)', data: dailyData, borderColor: '#e8b84b', backgroundColor: 'rgba(232,184,75,0.1)', fill: true, tension: 0.3, pointRadius: 3, yAxisID: 'y' },
          { label: 'Operaciones', data: dailyOpsData, borderColor: '#5dade2', backgroundColor: 'rgba(93,173,226,0.1)', fill: false, tension: 0.3, pointRadius: 2, yAxisID: 'y1' }
        ] },
        options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { labels: { boxWidth: 12, padding: 16 } } }, scales: { y: { position: 'left', ticks: { callback: function(v) { return '$' + v.toLocaleString(); } }, grid: { color: 'rgba(58,34,24,0.5)' } }, y1: { position: 'right', ticks: { stepSize: 1 }, grid: { drawOnChartArea: false } }, x: { grid: { color: 'rgba(58,34,24,0.3)' } } } }
      }));
    }

    // Monthly bar
    var mLabels = [], mData = [], mOpsData = [];
    for (var mi = 0; mi < mesesSorted.length; mi++) { mLabels.push(mesesSorted[mi]); mData.push(monthMap[mesesSorted[mi]].ingresos); mOpsData.push(monthMap[mesesSorted[mi]].ops); }
    var ctxM = document.getElementById('chart-monthly');
    if (ctxM) {
      Pages._estCharts.push(new Chart(ctxM, {
        type: 'bar', data: { labels: mLabels, datasets: [
          { label: 'Ingresos ($)', data: mData, backgroundColor: 'rgba(232,184,75,0.7)', borderColor: '#e8b84b', borderWidth: 1, borderRadius: 6, yAxisID: 'y' },
          { label: 'Operaciones', data: mOpsData, type: 'line', borderColor: '#5dade2', backgroundColor: 'transparent', pointRadius: 3, yAxisID: 'y1' }
        ] },
        options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { labels: { boxWidth: 12, padding: 16 } } }, scales: { y: { position: 'left', ticks: { callback: function(v) { return '$' + v.toLocaleString(); } }, grid: { color: 'rgba(58,34,24,0.5)' } }, y1: { position: 'right', ticks: { stepSize: 1 }, grid: { drawOnChartArea: false } }, x: { grid: { display: false } } } }
      }));
    }

    // Types doughnut
    var ctxT = document.getElementById('chart-types');
    if (ctxT) {
      Pages._estCharts.push(new Chart(ctxT, {
        type: 'doughnut', data: { labels: ['Especias', 'Blends'], datasets: [{ data: [tipoMap.especia || 0, tipoMap.blend || 0], backgroundColor: ['#e8b84b', '#5dade2'], borderColor: '#241209', borderWidth: 3 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { padding: 16, boxWidth: 12 } } } }
      }));
    }

    // Tallas pie
    var ctxTa = document.getElementById('chart-tallas');
    if (ctxTa) {
      Pages._estCharts.push(new Chart(ctxTa, {
        type: 'pie', data: { labels: ['Pequeno', 'Grande'], datasets: [{ data: [tallaMap.chico || 0, tallaMap.grande || 0], backgroundColor: ['#c9963a', '#5dade2'], borderColor: '#241209', borderWidth: 3 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 16, boxWidth: 12 } } } }
      }));
    }

    // Top 10 horizontal bar
    var top10 = prodArr.slice(0, 10);
    var ctxP = document.getElementById('chart-products');
    if (ctxP) {
      var pL = [], pI = [], pC = [];
      for (var tp = 0; tp < top10.length; tp++) { pL.push(top10[tp].nombre); pI.push(top10[tp].ingreso); pC.push(top10[tp].tipo === 'blend' ? '#5dade2' : '#e8b84b'); }
      Pages._estCharts.push(new Chart(ctxP, { type: 'bar', data: { labels: pL, datasets: [{ label: 'Ingreso ($)', data: pI, backgroundColor: pC, borderRadius: 4, barThickness: 18 }] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { callback: function(v) { return '$' + v.toLocaleString(); } }, grid: { color: 'rgba(58,34,24,0.5)' } }, y: { grid: { display: false }, ticks: { font: { size: 11 } } } } } }));
    }

    // City bar
    var ctxC = document.getElementById('chart-ciudad');
    if (ctxC) {
      var ciudades = Object.keys(ciudadMap).sort(function(a, b) { return ciudadMap[b].ingresos - ciudadMap[a].ingresos; });
      var cL = [], cD = [];
      for (var ci2 = 0; ci2 < ciudades.length; ci2++) { cL.push(ciudades[ci2]); cD.push(ciudadMap[ciudades[ci2]].ingresos); }
      Pages._estCharts.push(new Chart(ctxC, { type: 'bar', data: { labels: cL, datasets: [{ label: 'Ingresos ($)', data: cD, backgroundColor: 'rgba(39,174,96,0.7)', borderColor: '#27ae60', borderWidth: 1, borderRadius: 6 }] }, options: Object.assign({}, gOpts) }));
    }

    var canvases = el.querySelectorAll('.est-chart-wrap');
    for (var ch = 0; ch < canvases.length; ch++) { canvases[ch].style.height = canvases[ch].classList.contains('est-chart-full') ? '300px' : '260px'; }
  },

  /* ================================================================
     PUNTOS DE VENTA TAB
     ================================================================ */
  _renderPDVEstadisticas: function(el, pdvs) {
    if (!el) return;
    var totalPDVIngreso = 0, totalPDVOps = 0, totalPDVUnidades = 0;
    var totalPDVEfectivo = 0, totalPDVQR = 0;
    var totalStockPDV = 0, totalProductosEnPDV = 0;
    var pdvDataArr = [];

    for (var pvi = 0; pvi < pdvs.length; pvi++) {
      var pdv = pdvs[pvi];
      var stats = ArcanoDB.getPDVStats(pdv.id);
      var stock = (pdv.stock) ? pdv.stock : {};
      var stockKeys = Object.keys(stock).filter(function(k) { return stock[k] > 0; });
      var stockTotal = 0;
      for (var sk = 0; sk < stockKeys.length; sk++) stockTotal += stock[stockKeys[sk]];

      pdvDataArr.push({
        id: pdv.id, nombre: pdv.nombre || 'PDV', ubicacion: pdv.ubicacion || '', activo: pdv.activo !== false,
        totalVentas: stats.totalVentas, totalIngresos: stats.totalIngresos,
        totalItems: stats.totalItems, efectivoIngresos: stats.efectivoIngresos, qrIngresos: stats.qrIngresos,
        ticketPromedio: stats.ticketPromedio, productosEnStock: stockKeys.length, stockTotal: stockTotal,
        topProductos: stats.topProductos || [], diario: stats.diario || {}
      });
      totalPDVIngreso += stats.totalIngresos;
      totalPDVOps += stats.totalVentas;
      totalPDVUnidades += stats.totalItems;
      totalPDVEfectivo += stats.efectivoIngresos;
      totalPDVQR += stats.qrIngresos;
      totalStockPDV += stockTotal;
      totalProductosEnPDV += stockKeys.length;
    }

    var h = '';
    // KPIs generales
    h += '<div class="est-kpi-grid">';
    h += '<div class="est-kpi"><div class="est-kpi-value">$' + totalPDVIngreso.toLocaleString() + '</div><div class="est-kpi-label">Ingresos PDV</div><div class="est-kpi-sub">' + pdvs.length + ' punto(s) de venta</div></div>';
    h += '<div class="est-kpi"><div class="est-kpi-value">' + totalPDVOps + '</div><div class="est-kpi-label">Ventas PDV</div><div class="est-kpi-sub">' + totalPDVUnidades + ' unidades vendidas</div></div>';
    h += '<div class="est-kpi"><div class="est-kpi-value">$' + (totalPDVOps > 0 ? Math.round(totalPDVIngreso / totalPDVOps) : 0).toLocaleString() + '</div><div class="est-kpi-label">Ticket Promedio PDV</div><div class="est-kpi-sub">por venta</div></div>';
    h += '<div class="est-kpi"><div class="est-kpi-value">' + totalStockPDV + '</div><div class="est-kpi-label">Stock en PDVs</div><div class="est-kpi-sub">' + totalProductosEnPDV + ' productos distintos</div></div>';
    h += '</div>';

    // Metodo de pago PDV
    var pdvPagoTotal = totalPDVEfectivo + totalPDVQR;
    h += '<div class="card mt-16"><div class="card-header"><h3>Metodo de Pago en PDVs</h3></div><div class="card-body">';
    h += '<div class="stats-grid" style="grid-template-columns:1fr 1fr">';
    h += '<div class="stat-card" style="border-left-color:var(--green)"><div class="stat-value">$' + totalPDVEfectivo.toLocaleString() + '</div><div class="stat-label">Efectivo</div><div class="stat-sub">' + (pdvPagoTotal > 0 ? Math.round(totalPDVEfectivo/pdvPagoTotal*100) + '%' : '0%') + '</div></div>';
    h += '<div class="stat-card" style="border-left-color:#8e44ad"><div class="stat-value">$' + totalPDVQR.toLocaleString() + '</div><div class="stat-label">QR</div><div class="stat-sub">' + (pdvPagoTotal > 0 ? Math.round(totalPDVQR/pdvPagoTotal*100) + '%' : '0%') + '</div></div>';
    h += '</div></div></div>';

    // Per-PDV cards
    for (var i = 0; i < pdvDataArr.length; i++) {
      var pd = pdvDataArr[i];
      var pdColor = pd.activo ? 'var(--green)' : 'var(--red)';
      h += '<div class="card mt-16"><div class="card-header" style="display:flex;align-items:center;justify-content:space-between"><h3>' + pd.nombre + '</h3><span style="width:10px;height:10px;border-radius:50%;background:' + pdColor + '" title="' + (pd.activo ? 'Activo' : 'Inactivo') + '"></span></div><div class="card-body">';
      if (pd.ubicacion) h += '<p class="text-sm text-muted" style="margin-bottom:10px">' + pd.ubicacion + '</p>';
      h += '<div class="est-kpi-grid" style="grid-template-columns:repeat(3,1fr)">';
      h += '<div class="est-kpi"><div class="est-kpi-value">$' + pd.totalIngresos.toLocaleString() + '</div><div class="est-kpi-label">Ingresos</div><div class="est-kpi-sub">' + pd.totalVentas + ' ventas</div></div>';
      h += '<div class="est-kpi"><div class="est-kpi-value">$' + Math.round(pd.ticketPromedio).toLocaleString() + '</div><div class="est-kpi-label">Ticket Prom.</div><div class="est-kpi-sub">' + pd.totalItems + ' unidades</div></div>';
      h += '<div class="est-kpi"><div class="est-kpi-value">' + pd.stockTotal + '</div><div class="est-kpi-label">Stock Actual</div><div class="est-kpi-sub">' + pd.productosEnStock + ' productos</div></div>';
      h += '</div>';

      // Efectivo vs QR bar
      var pdPagoT = pd.efectivoIngresos + pd.qrIngresos;
      if (pdPagoT > 0) {
        var efPct = Math.round(pd.efectivoIngresos / pdPagoT * 100);
        var qrPct = 100 - efPct;
        h += '<div class="mt-12" style="background:var(--bg);border-radius:8px;overflow:hidden;height:24px;display:flex">';
        h += '<div style="width:' + efPct + '%;background:var(--green);display:flex;align-items:center;justify-content:center;color:#fff;font-size:0.75rem;font-weight:700">Ef ' + efPct + '%</div>';
        h += '<div style="width:' + qrPct + '%;background:#8e44ad;display:flex;align-items:center;justify-content:center;color:#fff;font-size:0.75rem;font-weight:700">QR ' + qrPct + '%</div>';
        h += '</div>';
      }

      // Top productos
      if (pd.topProductos.length > 0) {
        h += '<h4 class="mt-12" style="font-size:0.9rem">Top Productos</h4>';
        h += '<div class="table-wrap"><table class="est-detail-table"><thead><tr><th>Producto</th><th>Unidades</th><th>Ingreso</th></tr></thead><tbody>';
        for (var tp = 0; tp < Math.min(pd.topProductos.length, 5); tp++) {
          var tpp = pd.topProductos[tp];
          h += '<tr><td class="fw7">' + tpp.nombre + '</td><td>' + tpp.cantidad + '</td><td style="color:var(--gold)">$' + tpp.monto.toLocaleString() + '</td></tr>';
        }
        h += '</tbody></table></div>';
      }
      h += '</div></div>';
    }

    if (pdvs.length === 0) {
      h += '<div class="card mt-16"><div class="card-body" style="text-align:center;padding:40px"><p class="text-muted">No hay puntos de venta registrados</p></div></div>';
    }

    el.innerHTML = h;

    // Charts for PDVs
    if (Pages._estCharts) { for (var ci = 0; ci < Pages._estCharts.length; ci++) { try { Pages._estCharts[ci].destroy(); } catch (e) {} } }
    Pages._estCharts = [];
    Chart.defaults.color = '#9a8a78';
    Chart.defaults.borderColor = '#3a2218';

    if (pdvDataArr.length >= 2) {
      var pdvLabels = [], pdvIngresoData = [], pdvOpsData = [];
      for (var ci = 0; ci < pdvDataArr.length; ci++) {
        pdvLabels.push(pdvDataArr[ci].nombre);
        pdvIngresoData.push(pdvDataArr[ci].totalIngresos);
        pdvOpsData.push(pdvDataArr[ci].totalVentas);
      }
      var h2 = '<div class="card mt-16"><div class="card-header"><h3>Comparativa entre PDVs</h3></div><div class="card-body">';
      h2 += '<div class="est-charts-grid"><div class="est-chart-card"><h4>Ingresos por PDV</h4><div class="est-chart-wrap"><canvas id="chart-pdv-ingresos"></canvas></div></div>';
      h2 += '<div class="est-chart-card"><h4>Ventas por PDV</h4><div class="est-chart-wrap"><canvas id="chart-pdv-ops"></canvas></div></div></div>';
      h2 += '</div></div>';
      el.insertAdjacentHTML('beforeend', h2);

      var ctxI = document.getElementById('chart-pdv-ingresos');
      if (ctxI) {
        Pages._estCharts.push(new Chart(ctxI, {
          type: 'bar', data: { labels: pdvLabels, datasets: [{ label: 'Ingresos ($)', data: pdvIngresoData, backgroundColor: 'rgba(142,68,173,0.7)', borderColor: '#8e44ad', borderWidth: 1, borderRadius: 6 }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: function(v) { return '$' + v.toLocaleString(); } }, grid: { color: 'rgba(58,34,24,0.5)' } }, x: { grid: { display: false } } } }
        }));
      }
      var ctxO = document.getElementById('chart-pdv-ops');
      if (ctxO) {
        Pages._estCharts.push(new Chart(ctxO, {
          type: 'bar', data: { labels: pdvLabels, datasets: [{ label: 'Ventas', data: pdvOpsData, backgroundColor: 'rgba(93,173,226,0.7)', borderColor: '#5dade2', borderWidth: 1, borderRadius: 6 }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { stepSize: 1 } }, grid: { color: 'rgba(58,34,24,0.5)' } }, x: { grid: { display: false } } } }
        }));
      }
      var cvPdv = el.querySelectorAll('.est-chart-wrap');
      for (var ch = 0; ch < cvPdv.length; ch++) cvPdv[ch].style.height = '260px';
    }
  },

  /* ================================================================
     COSTOS Y MARGEN TAB
     ================================================================ */
  _renderCostos: function(data, el, entradas, especias, blends, producciones) {
    if (!el) return;

    // 1. Total cost of purchases (entradas)
    var totalCostoCompras = 0;
    var costoByTipo = { especia_grs: 0, envase: 0, bolsa: 0, sticker: 0 };
    var proveedorMap = {};
    var compraMonthMap = {};
    for (var ei = 0; ei < entradas.length; ei++) {
      var ent = entradas[ei];
      var entTotal = Number(ent.total) || 0;
      totalCostoCompras += entTotal;
      var prov = (ent.proveedor || 'Sin proveedor').trim();
      if (!prov) prov = 'Sin proveedor';
      if (!proveedorMap[prov]) proveedorMap[prov] = { total: 0, ops: 0 };
      proveedorMap[prov].total += entTotal;
      proveedorMap[prov].ops++;
      if (ent.fecha) {
        var mn = ent.fecha.substring(0, 7);
        if (!compraMonthMap[mn]) compraMonthMap[mn] = 0;
        compraMonthMap[mn] += entTotal;
      }
      if (ent.items) {
        for (var ij = 0; ij < ent.items.length; ij++) {
          var it = ent.items[ij];
          var t = it.tipo || 'especia_grs';
          costoByTipo[t] = (costoByTipo[t] || 0) + ((Number(it.cantidad) || 0) * (Number(it.costoUnitario) || 0));
        }
      }
    }

    // 2. Total ingresos
    var totalIngresos = 0;
    for (var si = 0; si < data.length; si++) totalIngresos += (data[si].total || 0);

    // 3. Margen
    var margenBruto = totalIngresos - totalCostoCompras;
    var margenPct = totalIngresos > 0 ? (margenBruto / totalIngresos * 100).toFixed(1) : '0';

    // 4. Per-product margin (income vs estimated material cost from produccion)
    var prodVentaMap = {}, prodCostoMap = {};
    for (var di = 0; di < data.length; di++) {
      var s = data[di];
      if (s.items) { for (var ii = 0; ii < s.items.length; ii++) {
        var item = s.items[ii];
        var pk = item.nombre + '|' + item.tipo;
        if (!prodVentaMap[pk]) prodVentaMap[pk] = 0;
        prodVentaMap[pk] += (item.subtotal || 0);
      }}
    }
    // From entradas, calculate cost per gram for each especia
    var costoPorGramo = {};
    var gramosComprados = {};
    for (var ei2 = 0; ei2 < entradas.length; ei2++) {
      var ent2 = entradas[ei2];
      if (ent2.items) { for (var ij2 = 0; ij2 < ent2.items.length; ij2++) {
        var it2 = ent2.items[ij2];
        if (it2.tipo === 'especia_grs' && it2.especiaNombre) {
          var nombre = it2.especiaNombre;
          var grs = Number(it2.cantidad) || 0;
          var cost = grs * (Number(it2.costoUnitario) || 0);
          costoPorGramo[nombre] = (costoPorGramo[nombre] || 0) + cost;
          gramosComprados[nombre] = (gramosComprados[nombre] || 0) + grs;
        }
      }}
    }
    var costoGrPorEsp = {};
    var espNames = Object.keys(gramosComprados);
    for (var gn = 0; gn < espNames.length; gn++) {
      if (gramosComprados[espNames[gn]] > 0) {
        costoGrPorEsp[espNames[gn]] = costoPorGramo[espNames[gn]] / gramosComprados[espNames[gn]];
      }
    }

    // Build blend cost from ingredients
    var costoBlendMap = {};
    for (var bi = 0; bi < blends.length; bi++) {
      var bl = blends[bi];
      var ings = bl.ingredientes || [];
      var costChico = 0, costGrande = 0;
      for (var ig = 0; ig < ings.length; ig++) {
        var ing = ings[ig];
        var cpg = costoGrPorEsp[ing.especiaNombre] || 0;
        costChico += (Number(ing.gramosChico) || 0) * cpg;
        costGrande += (Number(ing.gramosGrande) || 0) * cpg;
      }
      // Add envase + bolsa + sticker cost per unit
      costoBlendMap['blend|' + bl.nombre] = { chico: costChico, grande: costGrande };
    }
    for (var ei3 = 0; ei3 < especias.length; ei3++) {
      var esp = especias[ei3];
      var cpg2 = costoGrPorEsp[esp.nombre] || 0;
      costoBlendMap['especia|' + esp.nombre] = { chico: (Number(esp.gramosChico) || 0) * cpg2, grande: (Number(esp.gramosGrande) || 0) * cpg2 };
    }

    // 5. Production volume stats
    var totalFrascosProd = 0, totalGrsProd = 0, prodByMonth = {};
    for (var pri = 0; pri < producciones.length; pri++) {
      var pr = producciones[pri];
      totalFrascosProd += (pr.cantidad || 0);
      totalGrsProd += (pr.gramosTotal || 0);
      if (pr.fecha) {
        var pmn = pr.fecha.substring(0, 7);
        if (!prodByMonth[pmn]) prodByMonth[pmn] = { frascos: 0, gramos: 0, ops: 0 };
        prodByMonth[pmn].frascos += (pr.cantidad || 0);
        prodByMonth[pmn].gramos += (pr.gramosTotal || 0);
        prodByMonth[pmn].ops++;
      }
    }

    var h = '';
    // KPIs
    h += '<div class="est-kpi-grid">';
    h += '<div class="est-kpi"><div class="est-kpi-value">$' + totalIngresos.toLocaleString() + '</div><div class="est-kpi-label">Ingresos Totales</div><div class="est-kpi-sub">por todas las ventas</div></div>';
    h += '<div class="est-kpi"><div class="est-kpi-value" style="color:var(--red)">$' + totalCostoCompras.toLocaleString() + '</div><div class="est-kpi-label">Costo Compras</div><div class="est-kpi-sub">materia prima + packaging</div></div>';
    h += '<div class="est-kpi ' + (margenBruto >= 0 ? 'up' : 'down') + '"><div class="est-kpi-value">$' + margenBruto.toLocaleString() + '</div><div class="est-kpi-label">Margen Bruto</div><div class="est-kpi-sub">' + margenPct + '%</div></div>';
    h += '<div class="est-kpi"><div class="est-kpi-value">' + totalFrascosProd + '</div><div class="est-kpi-label">Frascos Producidos</div><div class="est-kpi-sub">' + totalGrsProd.toLocaleString() + ' grs en total</div></div>';
    h += '</div>';

    // Cost breakdown by type
    h += '<div class="card mt-16"><div class="card-header"><h3>Desglose de Costos por Tipo</h3></div><div class="card-body">';
    h += '<div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">';
    h += '<div class="stat-card" style="border-left-color:var(--gold)"><div class="stat-value">$' + (costoByTipo.especia_grs || 0).toLocaleString() + '</div><div class="stat-label">Materia Prima</div></div>';
    h += '<div class="stat-card" style="border-left-color:var(--blue)"><div class="stat-value">$' + (costoByTipo.envase || 0).toLocaleString() + '</div><div class="stat-label">Frascos (Envases)</div></div>';
    h += '<div class="stat-card" style="border-left-color:var(--green)"><div class="stat-value">$' + (costoByTipo.bolsa || 0).toLocaleString() + '</div><div class="stat-label">Bolsas</div></div>';
    h += '<div class="stat-card" style="border-left-color:var(--yellow)"><div class="stat-value">$' + (costoByTipo.sticker || 0).toLocaleString() + '</div><div class="stat-label">Stickers/Etiquetas</div></div>';
    h += '</div></div></div>';

    // Proveedor table
    var provArr = Object.keys(proveedorMap).sort(function(a, b) { return proveedorMap[b].total - proveedorMap[a].total; });
    if (provArr.length > 0) {
      h += '<div class="card mt-16"><div class="card-header"><h3>Compras por Proveedor</h3></div><div class="card-body">';
      h += '<div class="table-wrap"><table class="est-detail-table"><thead><tr><th>Proveedor</th><th>Ordenes</th><th>Total Comprado</th><th>Participacion</th></tr></thead><tbody>';
      for (var pvi = 0; pvi < provArr.length; pvi++) {
        var pv = provArr[pvi]; var pd = proveedorMap[pv];
        var pvPct = totalCostoCompras > 0 ? (pd.total / totalCostoCompras * 100).toFixed(1) : '0';
        h += '<tr><td class="fw7">' + pv + '</td><td>' + pd.ops + '</td><td class="fw7" style="color:var(--red)">$' + pd.total.toLocaleString() + '</td><td>' + pvPct + '%</td></tr>';
      }
      h += '</tbody></table></div></div></div>';
    }

    // Charts
    h += '<div class="est-charts-grid">';
    h += '<div class="est-chart-card"><h4>Ingresos vs Costos Mensual</h4><div class="est-chart-wrap"><canvas id="chart-cost-mensual"></canvas></div></div>';
    h += '<div class="est-chart-card"><h4>Distribucion de Costos</h4><div class="est-chart-wrap"><canvas id="chart-cost-dist"></canvas></div></div>';
    h += '</div>';

    // Per-product margin table
    h += '<div class="card mt-16"><div class="card-header"><h3>Margen Estimado por Producto</h3></div><div class="card-body"><p class="text-sm text-muted mb-8">Costo de materia prima estimado segun precio de compra por gramo. No incluye envases/bolsas/stickers.</p>';
    var allProducts = [];
    for (var vk = 0; vk < Object.keys(prodVentaMap).length; vk++) {
      var pk2 = Object.keys(prodVentaMap)[vk];
      var parts = pk2.split('|');
      var pNombre = parts.slice(1).join('|');
      var pTipo = parts[0];
      var pIngreso = prodVentaMap[pk2];
      var costoEst = costoBlendMap[pk2] || { chico: 0, grande: 0 };
      allProducts.push({ nombre: pNombre, tipo: pTipo, ingreso: pIngreso, costoEst: costoEst.chico + costoEst.grande });
    }
    allProducts.sort(function(a, b) { return b.ingreso - a.ingreso; });
    if (allProducts.length > 0) {
      h += '<div class="table-wrap"><table class="est-detail-table"><thead><tr><th>Producto</th><th>Tipo</th><th>Ingreso</th><th>Costo M.P.</th><th>Margen</th><th>% Margen</th></tr></thead><tbody>';
      for (var api = 0; api < Math.min(allProducts.length, 20); api++) {
        var ap = allProducts[api];
        var apMargen = ap.ingreso - ap.costoEst;
        var apPct = ap.ingreso > 0 ? (apMargen / ap.ingreso * 100).toFixed(1) : '0';
        var apColor = apMargen >= 0 ? 'var(--green)' : 'var(--red)';
        h += '<tr><td class="fw7">' + ap.nombre + '</td><td><span class="badge ' + (ap.tipo === 'blend' ? 'badge-blue' : 'badge-gold') + '">' + (ap.tipo === 'blend' ? 'Blend' : 'Especia') + '</span></td><td style="color:var(--gold)">$' + ap.ingreso.toLocaleString() + '</td><td style="color:var(--red)">$' + ap.costoEst.toLocaleString() + '</td><td style="color:' + apColor + '">$' + apMargen.toLocaleString() + '</td><td style="color:' + apColor + '">' + apPct + '%</td></tr>';
      }
      h += '</tbody></table></div>';
    } else { h += '<p class="text-muted text-center">Sin datos suficientes</p>'; }
    h += '</div></div>';

    el.innerHTML = h;

    // Charts
    if (Pages._estCharts) { for (var ci = 0; ci < Pages._estCharts.length; ci++) { try { Pages._estCharts[ci].destroy(); } catch (e) {} } }
    Pages._estCharts = [];
    Chart.defaults.color = '#9a8a78';
    Chart.defaults.borderColor = '#3a2218';
    Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

    // Ingresos vs Costos Mensual
    var allMonths = new Set(Object.keys(compraMonthMap));
    var ventasMonthMap = {};
    for (var vi = 0; vi < data.length; vi++) {
      if (data[vi].fecha) {
        var vmn = data[vi].fecha.substring(0, 7);
        ventasMonthMap[vmn] = (ventasMonthMap[vmn] || 0) + (data[vi].total || 0);
      }
    }
    Object.keys(ventasMonthMap).forEach(function(m) { allMonths.add(m); });
    var mSort = Array.from(allMonths).sort();
    var cmLabels = [], cmIngresos = [], cmCostos = [], cmMargen = [];
    for (var cm = 0; cm < mSort.length; cm++) {
      cmLabels.push(mSort[cm]);
      var v = ventasMonthMap[mSort[cm]] || 0;
      var c = compraMonthMap[mSort[cm]] || 0;
      cmIngresos.push(v); cmCostos.push(c); cmMargen.push(v - c);
    }
    var ctxCM = document.getElementById('chart-cost-mensual');
    if (ctxCM) {
      Pages._estCharts.push(new Chart(ctxCM, {
        type: 'bar', data: { labels: cmLabels, datasets: [
          { label: 'Ingresos', data: cmIngresos, backgroundColor: 'rgba(232,184,75,0.7)', borderRadius: 4 },
          { label: 'Costos', data: cmCostos, backgroundColor: 'rgba(231,76,60,0.7)', borderRadius: 4 },
          { label: 'Margen', data: cmMargen, type: 'line', borderColor: '#27ae60', backgroundColor: 'transparent', pointRadius: 4, borderWidth: 2 }
        ] },
        options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { labels: { boxWidth: 12, padding: 16 } } }, scales: { y: { ticks: { callback: function(v) { return '$' + v.toLocaleString(); } }, grid: { color: 'rgba(58,34,24,0.5)' } }, x: { grid: { display: false } } } }
      }));
    }

    // Cost distribution doughnut
    var ctxCD = document.getElementById('chart-cost-dist');
    if (ctxCD) {
      Pages._estCharts.push(new Chart(ctxCD, {
        type: 'doughnut', data: { labels: ['Materia Prima', 'Envases', 'Bolsas', 'Stickers'], datasets: [{ data: [costoByTipo.especia_grs || 0, costoByTipo.envase || 0, costoByTipo.bolsa || 0, costoByTipo.sticker || 0], backgroundColor: ['#e8b84b', '#5dade2', '#27ae60', '#f0c040'], borderColor: '#241209', borderWidth: 3 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { position: 'bottom', labels: { padding: 16, boxWidth: 12 } } } }
      }));
    }

    var canvases = el.querySelectorAll('.est-chart-wrap');
    for (var ch = 0; ch < canvases.length; ch++) { canvases[ch].style.height = '280px'; }
  },

  /* ================================================================
     PRODUCCION TAB
     ================================================================ */
  _renderProduccion: function(data, el, producciones) {
    if (!el) return;
    var totalFrascos = 0, totalGramos = 0;
    var tipoProdMap = {}, tallaProdMap = {}, prodProdMap = {}, prodMonthMap = {}, envasesConsumidos = 0, bolsasConsumidas = 0, stickersConsumidos = 0;
    for (var i = 0; i < producciones.length; i++) {
      var pr = producciones[i];
      totalFrascos += (pr.cantidad || 0);
      totalGramos += (pr.gramosTotal || 0);
      envasesConsumidos += (pr.envasesConsumidos || 0);
      bolsasConsumidas += (pr.bolsasConsumidas || 0);
      stickersConsumidos += (pr.stickersConsumidos || 0);
      tipoProdMap[pr.tipo] = (tipoProdMap[pr.tipo] || 0) + (pr.cantidad || 0);
      tallaProdMap[pr.talla || 'chico'] = (tallaProdMap[pr.talla || 'chico'] || 0) + (pr.cantidad || 0);
      var pk = (pr.productoNombre || '?') + '|' + (pr.tipo || 'especia') + '|' + (pr.talla || 'chico');
      if (!prodProdMap[pk]) prodProdMap[pk] = { nombre: pr.productoNombre, tipo: pr.tipo, talla: pr.talla, frascos: 0, gramos: 0, ops: 0 };
      prodProdMap[pk].frascos += (pr.cantidad || 0);
      prodProdMap[pk].gramos += (pr.gramosTotal || 0);
      prodProdMap[pk].ops++;
      if (pr.fecha) {
        var mn = pr.fecha.substring(0, 7);
        if (!prodMonthMap[mn]) prodMonthMap[mn] = { frascos: 0, gramos: 0, ops: 0 };
        prodMonthMap[mn].frascos += (pr.cantidad || 0);
        prodMonthMap[mn].gramos += (pr.gramosTotal || 0);
        prodMonthMap[mn].ops++;
      }
    }
    var prodArr = Object.values(prodProdMap).sort(function(a, b) { return b.frascos - a.frascos; });

    var h = '';
    h += '<div class="est-kpi-grid">';
    h += '<div class="est-kpi"><div class="est-kpi-value">' + totalFrascos + '</div><div class="est-kpi-label">Frascos Producidos</div><div class="est-kpi-sub">' + producciones.length + ' operaciones</div></div>';
    h += '<div class="est-kpi"><div class="est-kpi-value">' + totalGramos.toLocaleString() + 'g</div><div class="est-kpi-label">Materia Prima Usada</div><div class="est-kpi-sub">gramos en total</div></div>';
    h += '<div class="est-kpi"><div class="est-kpi-value">' + envasesConsumidos + '</div><div class="est-kpi-label">Envases Consumidos</div><div class="est-kpi-sub">frascos usados</div></div>';
    h += '<div class="est-kpi"><div class="est-kpi-value">' + stickersConsumidos + '</div><div class="est-kpi-label">Stickers Usados</div><div class="est-kpi-sub">etiquetas aplicadas</div></div>';
    h += '<div class="est-kpi"><div class="est-kpi-value">' + bolsasConsumidas + '</div><div class="est-kpi-label">Bolsas Usadas</div><div class="est-kpi-sub">empaques</div></div>';
    h += '</div>';

    // Charts
    h += '<div class="est-charts-grid">';
    h += '<div class="est-chart-card"><h4>Produccion Mensual (Frascos)</h4><div class="est-chart-wrap"><canvas id="chart-prod-monthly"></canvas></div></div>';
    h += '<div class="est-chart-card"><h4>Tipo y Talla</h4><div class="est-chart-wrap"><canvas id="chart-prod-tipo"></canvas></div></div>';
    h += '</div>';

    // Production table
    h += '<div class="card mt-16"><div class="card-header"><h3>Produccion por Producto</h3></div><div class="card-body">';
    if (prodArr.length > 0) {
      h += '<div class="table-wrap"><table class="est-detail-table"><thead><tr><th>Producto</th><th>Tipo</th><th>Talla</th><th>Frascos</th><th>Gramos</th><th>Ops</th></tr></thead><tbody>';
      for (var pi = 0; pi < prodArr.length; pi++) {
        var pp = prodArr[pi];
        h += '<tr><td class="fw7">' + pp.nombre + '</td><td><span class="badge ' + (pp.tipo === 'blend' ? 'badge-blue' : 'badge-gold') + '">' + (pp.tipo === 'blend' ? 'Blend' : 'Especia') + '</span></td><td>' + pp.talla + '</td><td class="fw7">' + pp.frascos + '</td><td>' + pp.gramos.toLocaleString() + 'g</td><td>' + pp.ops + '</td></tr>';
      }
      h += '</tbody></table></div>';
    } else { h += '<p class="text-muted text-center">Sin producciones</p>'; }
    h += '</div></div>';

    el.innerHTML = h;

    if (Pages._estCharts) { for (var ci = 0; ci < Pages._estCharts.length; ci++) { try { Pages._estCharts[ci].destroy(); } catch (e) {} } }
    Pages._estCharts = [];
    Chart.defaults.color = '#9a8a78'; Chart.defaults.borderColor = '#3a2218'; Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

    var pmSorted = Object.keys(prodMonthMap).sort();
    var pmL = [], pmF = [], pmG = [];
    for (var mi = 0; mi < pmSorted.length; mi++) { pmL.push(pmSorted[mi]); pmF.push(prodMonthMap[pmSorted[mi]].frascos); pmG.push(prodMonthMap[pmSorted[mi]].gramos); }
    var ctxPM = document.getElementById('chart-prod-monthly');
    if (ctxPM) {
      Pages._estCharts.push(new Chart(ctxPM, { type: 'bar', data: { labels: pmL, datasets: [
        { label: 'Frascos', data: pmF, backgroundColor: 'rgba(232,184,75,0.7)', borderRadius: 4, yAxisID: 'y' },
        { label: 'Gramos', data: pmG, type: 'line', borderColor: '#5dade2', backgroundColor: 'transparent', pointRadius: 3, yAxisID: 'y1' }
      ] }, options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { labels: { boxWidth: 12, padding: 16 } } }, scales: { y: { position: 'left', title: { display: true, text: 'Frascos' }, grid: { color: 'rgba(58,34,24,0.5)' } }, y1: { position: 'right', title: { display: true, text: 'Gramos' }, grid: { drawOnChartArea: false } }, x: { grid: { display: false } } } } }));
    }

    var ctxPT = document.getElementById('chart-prod-tipo');
    if (ctxPT) {
      Pages._estCharts.push(new Chart(ctxPT, { type: 'bar', data: { labels: ['Especia-Chico', 'Especia-Grande', 'Blend-Chico', 'Blend-Grande'], datasets: [{ label: 'Frascos', data: [tipoProdMap.especia_chico || 0, tipoProdMap.especia_grande || 0, tipoProdMap.blend_chico || 0, tipoProdMap.blend_grande || 0], backgroundColor: ['#e8b84b', '#c9963a', '#5dade2', '#3498db'], borderRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: 'rgba(58,34,24,0.5)' } }, x: { grid: { display: false } } } } }));
    }

    var canvases = el.querySelectorAll('.est-chart-wrap');
    for (var ch = 0; ch < canvases.length; ch++) { canvases[ch].style.height = '280px'; }
  },

  /* ================================================================
     PEDIDOS TIENDA TAB
     ================================================================ */
  _renderPedidosTienda: function(data, el) {
    if (!el) return;
    var total = 0, ops = 0, ciudades = {}, estadoMap = {}, dayMap = {}, prodMap = {};
    for (var i = 0; i < data.length; i++) {
      var s = data[i];
      total += (s.total || 0); ops++;
      estadoMap[s.estado || 'nuevo'] = (estadoMap[s.estado || 'nuevo'] || 0) + 1;
      if (s.ciudad) { if (!ciudades[s.ciudad]) ciudades[s.ciudad] = { ops: 0, ingreso: 0 }; ciudades[s.ciudad].ops++; ciudades[s.ciudad].ingreso += (s.total || 0); }
      if (s.fecha) { if (!dayMap[s.fecha]) dayMap[s.fecha] = { ops: 0, ingreso: 0 }; dayMap[s.fecha].ops++; dayMap[s.fecha].ingreso += (s.total || 0); }
      if (s.items) { for (var j = 0; j < s.items.length; j++) {
        var it = s.items[j]; var pk = it.nombre + '|' + (it.talla || 'chico');
        if (!prodMap[pk]) prodMap[pk] = { nombre: it.nombre, talla: it.talla, uds: 0, ingreso: 0 };
        prodMap[pk].uds += (it.cantidad || 0); prodMap[pk].ingreso += (it.subtotal || 0);
      }}
    }
    var prodArr = Object.values(prodMap).sort(function(a, b) { return b.ingreso - a.ingreso; });
    var cityArr = Object.keys(ciudades).sort(function(a, b) { return ciudades[b].ingreso - ciudades[a].ingreso; });

    var h = '<div class="est-kpi-grid">';
    h += '<div class="est-kpi"><div class="est-kpi-value">$' + total.toLocaleString() + '</div><div class="est-kpi-label">Ingresos Tienda</div><div class="est-kpi-sub">' + ops + ' pedidos</div></div>';
    h += '<div class="est-kpi"><div class="est-kpi-value">$' + (ops > 0 ? Math.round(total / ops) : 0).toLocaleString() + '</div><div class="est-kpi-label">Ticket Promedio</div><div class="est-kpi-sub">por pedido</div></div>';
    h += '<div class="est-kpi"><div class="est-kpi-value">' + cityArr.length + '</div><div class="est-kpi-label">Ciudades</div><div class="est-kpi-sub">destino de envios</div></div>';
    h += '<div class="est-kpi"><div class="est-kpi-value">' + (estadoMap.entregado || 0) + '</div><div class="est-kpi-label">Entregados</div><div class="est-kpi-sub">de ' + ops + ' total</div></div>';
    h += '</div>';

    // Estado breakdown
    var estColors = { nuevo: 'badge-red', confirmado: 'badge-yellow', preparando: 'badge-blue', enviado: 'badge-gold', entregado: 'badge-green', cancelado: 'badge-red' };
    var estLabels = { nuevo: 'Nuevos', confirmado: 'Confirmados', preparando: 'Preparando', enviado: 'Enviados', entregado: 'Entregados', cancelado: 'Cancelados' };
    h += '<div class="card mt-16"><div class="card-header"><h3>Estado de Pedidos</h3></div><div class="card-body" style="display:flex;gap:8px;flex-wrap:wrap">';
    var estKeys = Object.keys(estadoMap).sort();
    for (var ei = 0; ei < estKeys.length; ei++) {
      var ek = estKeys[ei];
      h += '<div style="text-align:center;padding:12px 16px;background:var(--bg);border-radius:8px;min-width:80px"><div style="font-size:1.4rem;font-weight:800;color:var(--text)">' + estadoMap[ek] + '</div><div style="font-size:.72rem;color:var(--text2);margin-top:2px">' + (estLabels[ek] || ek) + '</div></div>';
    }
    h += '</div></div>';

    // Charts
    h += '<div class="est-charts-grid">';
    h += '<div class="est-chart-card"><h4>Pedidos por Dia</h4><div class="est-chart-wrap"><canvas id="chart-ped-daily"></canvas></div></div>';
    h += '<div class="est-chart-card"><h4>Top 8 Productos</h4><div class="est-chart-wrap"><canvas id="chart-ped-prods"></canvas></div></div>';
    h += '</div>';

    // City table
    if (cityArr.length > 0) {
      h += '<div class="card mt-16"><div class="card-header"><h3>Ingresos por Ciudad</h3></div><div class="card-body">';
      h += '<div class="table-wrap"><table class="est-detail-table"><thead><tr><th>Ciudad</th><th>Pedidos</th><th>Ingreso</th><th>Promedio</th></tr></thead><tbody>';
      for (var ci = 0; ci < cityArr.length; ci++) {
        var cd = ciudades[cityArr[ci]];
        h += '<tr><td class="fw7">' + cityArr[ci] + '</td><td>' + cd.ops + '</td><td class="fw7" style="color:var(--gold)">$' + cd.ingreso.toLocaleString() + '</td><td>$' + (cd.ops > 0 ? Math.round(cd.ingreso / cd.ops) : 0).toLocaleString() + '</td></tr>';
      }
      h += '</tbody></table></div></div></div>';
    }

    el.innerHTML = h;

    if (Pages._estCharts) { for (var ci = 0; ci < Pages._estCharts.length; ci++) { try { Pages._estCharts[ci].destroy(); } catch (e) {} } }
    Pages._estCharts = [];
    Chart.defaults.color = '#9a8a78'; Chart.defaults.borderColor = '#3a2218'; Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

    var daySorted = Object.keys(dayMap).sort();
    var ctxPD = document.getElementById('chart-ped-daily');
    if (ctxPD) {
      var dl = [], dd = [], do2 = [];
      for (var di = 0; di < daySorted.length; di++) { dl.push(daySorted[di].slice(5)); dd.push(dayMap[daySorted[di]].ingreso); do2.push(dayMap[daySorted[di]].ops); }
      Pages._estCharts.push(new Chart(ctxPD, { type: 'bar', data: { labels: dl, datasets: [
        { label: 'Ingreso ($)', data: dd, backgroundColor: 'rgba(232,184,75,0.7)', borderRadius: 4, yAxisID: 'y' },
        { label: 'Pedidos', data: do2, type: 'line', borderColor: '#5dade2', backgroundColor: 'transparent', pointRadius: 3, yAxisID: 'y1' }
      ] }, options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { labels: { boxWidth: 12, padding: 16 } } }, scales: { y: { position: 'left', ticks: { callback: function(v) { return '$' + v.toLocaleString(); } }, grid: { color: 'rgba(58,34,24,0.5)' } }, y1: { position: 'right', ticks: { stepSize: 1 }, grid: { drawOnChartArea: false } }, x: { grid: { display: false } } } } }));
    }

    var ctxPP = document.getElementById('chart-ped-prods');
    if (ctxPP && prodArr.length > 0) {
      var top8 = prodArr.slice(0, 8);
      var pl = [], pd2 = [], pc = [];
      for (var pi = 0; pi < top8.length; pi++) { pl.push(top8[pi].nombre); pd2.push(top8[pi].ingreso); pc.push('#e8b84b'); }
      Pages._estCharts.push(new Chart(ctxPP, { type: 'bar', data: { labels: pl, datasets: [{ label: 'Ingreso ($)', data: pd2, backgroundColor: pc, borderRadius: 4 }] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { callback: function(v) { return '$' + v.toLocaleString(); } }, grid: { color: 'rgba(58,34,24,0.5)' } }, y: { grid: { display: false } } } } }));
    }

    var canvases = el.querySelectorAll('.est-chart-wrap');
    for (var ch = 0; ch < canvases.length; ch++) { canvases[ch].style.height = '280px'; }
  },

  /* ================================================================
     INVENTARIO TAB
     ================================================================ */
  _renderInventario: function(el, especias, blends) {
    if (!el) return;
    var db = ArcanoDB.getDB();
    var envases = db.stockEnvases || { chico: 0, grande: 0 };
    var bolsas = db.stockBolsas || { chico: 0, grande: 0 };
    var stickers = ArcanoDB.getStickers();

    // Calculate inventory value (at sale price)
    var valorFrascos = 0, valorPala = 0;
    var stockBajo = [], sinStock = [];
    var catMap = {}, catStockMap = {};
    for (var i = 0; i < especias.length; i++) {
      var e = especias[i];
      var vChico = (e.stockChico || 0) * (e.precioChico || 0);
      var vGrande = (e.stockGrande || 0) * (e.precioGrande || 0);
      valorFrascos += vChico + vGrande;
      var palaGrs = e.stockBolsa || 0;
      var cat = e.categoria || 'Sin categoria';
      if (!catMap[cat]) catMap[cat] = { productos: 0, frascos: 0, pala: 0 };
      catMap[cat].productos++;
      catMap[cat].frascos += (e.stockChico || 0) + (e.stockGrande || 0);
      catMap[cat].pala += palaGrs;
      var totalStock = (e.stockChico || 0) + (e.stockGrande || 0);
      if (totalStock === 0 && palaGrs === 0) sinStock.push({ nombre: e.nombre, tipo: 'especia', cat: cat });
      else if (totalStock <= 3 || palaGrs <= 50) stockBajo.push({ nombre: e.nombre, tipo: 'especia', cat: cat, frascos: totalStock, pala: palaGrs });
    }
    for (var bi = 0; bi < blends.length; bi++) {
      var b = blends[bi];
      valorFrascos += (b.stockChico || 0) * (b.precioChico || 0) + (b.stockGrande || 0) * (b.precioGrande || 0);
      var cat2 = b.categoria || 'Sin categoria';
      if (!catMap[cat2]) catMap[cat2] = { productos: 0, frascos: 0, pala: 0 };
      catMap[cat2].productos++;
      catMap[cat2].frascos += (b.stockChico || 0) + (b.stockGrande || 0);
      var ts = (b.stockChico || 0) + (b.stockGrande || 0);
      if (ts === 0) sinStock.push({ nombre: b.nombre, tipo: 'blend', cat: cat2 });
      else if (ts <= 3) stockBajo.push({ nombre: b.nombre, tipo: 'blend', cat: cat2, frascos: ts, pala: 0 });
    }
    var totalProductos = especias.length + blends.length;
    var totalFrascosStock = especias.reduce(function(s, e) { return s + (e.stockChico||0) + (e.stockGrande||0); }, 0) +
                             blends.reduce(function(s, b) { return s + (b.stockChico||0) + (b.stockGrande||0); }, 0);
    var totalPala = especias.reduce(function(s, e) { return s + (e.stockBolsa||0); }, 0);

    var h = '';
    h += '<div class="est-kpi-grid">';
    h += '<div class="est-kpi"><div class="est-kpi-value">$' + valorFrascos.toLocaleString() + '</div><div class="est-kpi-label">Valor Inventario (Frascos)</div><div class="est-kpi-sub">al precio de venta</div></div>';
    h += '<div class="est-kpi"><div class="est-kpi-value">' + totalFrascosStock + '</div><div class="est-kpi-label">Frascos en Stock</div><div class="est-kpi-sub">listos para vender</div></div>';
    h += '<div class="est-kpi"><div class="est-kpi-value">' + totalPala.toLocaleString() + 'g</div><div class="est-kpi-label">Pala (Materia Prima)</div><div class="est-kpi-sub">gramos en stock</div></div>';
    h += '<div class="est-kpi ' + (stockBajo.length > 0 ? 'down' : 'up') + '"><div class="est-kpi-value">' + stockBajo.length + '</div><div class="est-kpi-label">Stock Bajo</div><div class="est-kpi-sub">requiere reposicion</div></div>';
    h += '<div class="est-kpi ' + (sinStock.length > 0 ? 'down' : 'up') + '"><div class="est-kpi-value">' + sinStock.length + '</div><div class="est-kpi-label">Sin Stock</div><div class="est-kpi-sub">productos agotados</div></div>';
    h += '</div>';

    // Packaging stock
    h += '<div class="card mt-16"><div class="card-header"><h3>Stock de Packaging</h3></div><div class="card-body">';
    h += '<div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">';
    h += '<div class="stat-card" style="border-left-color:var(--blue)"><div class="stat-value">' + (envases.chico || 0) + '</div><div class="stat-label">Envases Pequenos</div></div>';
    h += '<div class="stat-card" style="border-left-color:var(--blue)"><div class="stat-value">' + (envases.grande || 0) + '</div><div class="stat-label">Envases Grandes</div></div>';
    h += '<div class="stat-card" style="border-left-color:var(--green)"><div class="stat-value">' + (bolsas.chico || 0) + '</div><div class="stat-label">Bolsas Pequenas</div></div>';
    h += '<div class="stat-card" style="border-left-color:var(--green)"><div class="stat-value">' + (bolsas.grande || 0) + '</div><div class="stat-label">Bolsas Grandes</div></div>';
    h += '</div></div></div>';

    // Category breakdown
    var catArr = Object.keys(catMap).sort(function(a, b) { return catMap[b].frascos - catMap[a].frascos; });
    h += '<div class="card mt-16"><div class="card-header"><h3>Inventario por Categoria</h3></div><div class="card-body">';
    h += '<div class="table-wrap"><table class="est-detail-table"><thead><tr><th>Categoria</th><th>Productos</th><th>Frascos</th><th>Pala (grs)</th></tr></thead><tbody>';
    for (var ci = 0; ci < catArr.length; ci++) {
      var cd = catMap[catArr[ci]];
      h += '<tr><td class="fw7">' + catArr[ci] + '</td><td>' + cd.productos + '</td><td>' + cd.frascos + '</td><td>' + cd.pala.toLocaleString() + '</td></tr>';
    }
    h += '</tbody></table></div></div></div>';

    // Low stock alerts
    if (stockBajo.length > 0) {
      h += '<div class="card mt-16" style="border-color:var(--yellow)"><div class="card-header"><h3 style="color:var(--yellow)">Alertas de Stock Bajo (' + stockBajo.length + ')</h3></div><div class="card-body">';
      h += '<div class="table-wrap"><table class="est-detail-table"><thead><tr><th>Producto</th><th>Tipo</th><th>Categoria</th><th>Frascos</th><th>Pala</th></tr></thead><tbody>';
      for (var si = 0; si < stockBajo.length; si++) {
        var sb = stockBajo[si];
        h += '<tr><td class="fw7">' + sb.nombre + '</td><td><span class="badge ' + (sb.tipo === 'blend' ? 'badge-blue' : 'badge-gold') + '">' + (sb.tipo === 'blend' ? 'Blend' : 'Especia') + '</span></td><td>' + sb.cat + '</td><td>' + (sb.frascos || '-') + '</td><td>' + (sb.pala ? sb.pala + 'g' : '-') + '</td></tr>';
      }
      h += '</tbody></table></div></div></div>';
    }

    // No stock
    if (sinStock.length > 0) {
      h += '<div class="card mt-16" style="border-color:var(--red)"><div class="card-header"><h3 style="color:var(--red)">Sin Stock (' + sinStock.length + ')</h3></div><div class="card-body">';
      h += '<p class="text-sm text-muted mb-8">';
      for (var ni = 0; ni < sinStock.length; ni++) {
        h += '<span class="badge badge-red mr-4">' + sinStock[ni].nombre + '</span>';
      }
      h += '</p></div></div>';
    }

    el.innerHTML = h;

    // No charts for inventory, no chart cleanup needed
    if (Pages._estCharts) { for (var ci = 0; ci < Pages._estCharts.length; ci++) { try { Pages._estCharts[ci].destroy(); } catch (e) {} } }
    Pages._estCharts = [];
  },

  /* ================================================================
     HELPERS (kept for backward compat)
     ================================================================ */
  _getCurrentEstData: function() {
    var ventas = ArcanoDB.getVentas();
    var pedidos = ArcanoDB.getPedidos();
    var allSales = [];
    for (var vi = 0; vi < ventas.length; vi++) {
      var v = ventas[vi];
      var vItems = [];
      if (v.items) { for (var vi2 = 0; vi2 < v.items.length; vi2++) { var it = v.items[vi2]; vItems.push({ nombre: it.productoNombre || '?', tipo: it.tipo || 'especia', talla: it.talla || 'chico', cantidad: it.cantidad || 0, precio: it.precioUnitario || 0, subtotal: it.subtotal || 0 }); } }
      allSales.push({ fecha: v.fecha || '', creado: v.creado || '', total: v.total || 0, items: vItems, source: 'admin', metodoPago: v.metodoPago || 'efectivo' });
    }
    for (var pi = 0; pi < pedidos.length; pi++) {
      var p = pedidos[pi];
      if (p.estado === 'cancelado') continue;
      var pItems = [];
      if (p.items) { for (var pi2 = 0; pi2 < p.items.length; pi2++) { var pit = p.items[pi2]; pItems.push({ nombre: pit.nombre || '?', tipo: pit.tipo || 'especia', talla: pit.talla || 'chico', cantidad: pit.qty || pit.cantidad || 0, precio: pit.precio || 0, subtotal: pit.subtotal || 0 }); } }
      var pFecha = p.creado ? p.creado.slice(0, 10) : '';
      allSales.push({ fecha: pFecha, creado: p.creado || '', total: p.total || 0, items: pItems, source: 'tienda', cliente: (p.cliente || {}).nombre || '', ciudad: (p.cliente || {}).ciudad || '' });
    }
    allSales.sort(function(a, b) { return (b.fecha || '').localeCompare(a.fecha || ''); });
    return allSales;
  },



  /* ==================== PACKS ==================== */
  formPack(editId) {
    var pack = (editId != null) ? ArcanoDB.getPack(editId) : null;
    var isEdit = (pack != null);
    var comps = (pack ? pack.componentes : []) || [];

    var html = '<div class="modal-overlay" id="packModal">' +
      '<div class="modal modal-lg">' +
      '<div class="modal-header"><h3>' + (isEdit ? 'Editar Pack: ' + (pack.nombre || '') : 'Nuevo Pack de Productos') + '</h3>' +
        '<button class="btn btn-sm btn-ghost" onclick="this.closest(\'.modal-overlay\').remove()">X</button></div>' +
      '<div class="modal-body" style="max-height:70vh;overflow-y:auto">' +

      '<div class="form-group"><label>Nombre del Pack</label>' +
      '<input type="text" class="input" id="packNombre" value="' + (isEdit ? (pack.nombre || '').replace(/"/g, '&quot;') : '') + '" placeholder="Ej: Pack Cocteleria Premium"></div>' +

      '<div class="form-group"><label>Descripcion (opcional)</label>' +
      '<input type="text" class="input" id="packDesc" value="' + (isEdit ? (pack.descripcion || '').replace(/"/g, '&quot;') : '') + '" placeholder="Descripcion breve del pack"></div>' +

      '<div class="form-group"><label>Precio de Venta ($)</label>' +
      '<input type="number" class="input" id="packPrecio" value="' + (isEdit ? (pack.precioVenta || 0) : '') + '" min="0" step="100" oninput="Pages.calcPackCost()"></div>' +
      '<div class="form-group"><label>Imagen del Pack</label>' +
      '<div id="img-area-pk" class="img-upload-area">' +
        (isEdit && pack.imagen ? '<img src="' + pack.imagen + '" class="img-preview" id="img-preview-pk"><button class="btn btn-sm btn-red" style="margin-top:6px" onclick="Pages.removeImage(\'img-area-pk\',\'f-pk-img\')">Quitar imagen</button>' : '') +
        '<div class="img-upload-placeholder" onclick="document.getElementById(\'f-pk-img\').click()"><span>+ Click para subir imagen</span></div></div></div>' +
      '<input type="file" id="f-pk-img" accept="image/*" style="display:none" onchange="Pages.handleImageUpload(this,\'img-area-pk\')">' +

      '<div style="display:flex;align-items:center;justify-content:space-between;margin:16px 0 8px">' +
        '<label class="fw7">Componentes del Pack</label>' +
        '<button class="btn btn-sm btn-outline" onclick="Pages.addPackComponent()">+ Agregar componente</button>' +
      '</div>' +

      '<div id="packComps">' + Pages._packCompHTML(comps) + '</div>' +

      '<div id="packCostInfo" class="card" style="margin-top:16px;background:var(--bg-card);border:1px solid var(--border)"></div>' +

      '</div>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-gold" onclick="Pages.doSavePack(' + (isEdit ? editId : 'null') + ')">Guardar Pack</button>' +
        '<button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Cancelar</button>' +
      '</div></div></div>';

    document.body.insertAdjacentHTML('beforeend', html);
    // Calculate initial cost
    setTimeout(function() { Pages.calcPackCost(); }, 50);
  },

  _packCompHTML(comps) {
    var especias = ArcanoDB.getEspecias();
    var blends = ArcanoDB.getBlends();
    var h = '';
    for (var i = 0; i < comps.length; i++) {
      var c = comps[i];
      var prodOptions = '<option value="">-- Seleccionar --</option>';
      // Especias
      for (var ei = 0; ei < especias.length; ei++) {
        var sel = (c.tipo === 'especia' && c.productoId == especias[ei].id) ? ' selected' : '';
        prodOptions += '<option value="especia:' + especias[ei].id + '"' + sel + '>' + especias[ei].nombre + '</option>';
      }
      // Blends
      for (var bi = 0; bi < blends.length; bi++) {
        var sel2 = (c.tipo === 'blend' && c.productoId == blends[bi].id) ? ' selected' : '';
        prodOptions += '<option value="blend:' + blends[bi].id + '"' + sel2 + '>' + blends[bi].nombre + ' (Blend)</option>';
      }
      h += '<div class="card" style="margin-bottom:8px;padding:12px" data-comp-idx="' + i + '">' +
        '<div style="display:flex;gap:8px;align-items:end;flex-wrap:wrap">' +
          '<div style="flex:2;min-width:180px"><label class="text-sm text-muted">Producto</label>' +
            '<select class="input" onchange="Pages._updateCompCost(this);Pages.calcPackCost()">' + prodOptions + '</select></div>' +
          '<div style="flex:1;min-width:100px"><label class="text-sm text-muted">Talla</label>' +
            '<select class="input" onchange="Pages._updateCompCost(this);Pages.calcPackCost()"><option value="chico"' + (c.talla === 'grande' ? '' : ' selected') + '>Pequeno</option><option value="grande"' + (c.talla === 'grande' ? ' selected' : '') + '>Grande</option></select></div>' +
          '<div style="flex:0.5;min-width:70px"><label class="text-sm text-muted">Cant.</label>' +
            '<input type="number" class="input" value="' + (c.cantidad || 1) + '" min="1" onchange="Pages.calcPackCost()"></div>' +
          '<div style="flex:0.7;min-width:90px"><label class="text-sm text-muted">Costo Unit.</label>' +
            '<input type="number" class="input" value="' + (c.costoUnitario || c._precio || 0) + '" min="0" step="100" readonly data-costo="1" style="background:var(--bg-body);opacity:0.7"></div>' +
          '<button class="btn btn-sm btn-red" style="margin-bottom:1px" onclick="this.parentElement.parentElement.remove();Pages.calcPackCost()">X</button>' +
        '</div></div>';
    }
    return h;
  },

  addPackComponent() {
    var container = document.getElementById('packComps');
    if (!container) return;
    var idx = container.children.length;
    var especias = ArcanoDB.getEspecias();
    var blends = ArcanoDB.getBlends();
    var prodOptions = '<option value="">-- Seleccionar --</option>';
    for (var ei = 0; ei < especias.length; ei++) {
      prodOptions += '<option value="especia:' + especias[ei].id + '">' + especias[ei].nombre + '</option>';
    }
    for (var bi = 0; bi < blends.length; bi++) {
      prodOptions += '<option value="blend:' + blends[bi].id + '">' + blends[bi].nombre + ' (Blend)</option>';
    }
    var compHTML = '<div class="card" style="margin-bottom:8px;padding:12px" data-comp-idx="' + idx + '">' +
      '<div style="display:flex;gap:8px;align-items:end;flex-wrap:wrap">' +
        '<div style="flex:2;min-width:180px"><label class="text-sm text-muted">Producto</label>' +
          '<select class="input" onchange="Pages._updateCompCost(this);Pages.calcPackCost()">' + prodOptions + '</select></div>' +
        '<div style="flex:1;min-width:100px"><label class="text-sm text-muted">Talla</label>' +
          '<select class="input" onchange="Pages._updateCompCost(this);Pages.calcPackCost()"><option value="chico" selected>Pequeno</option><option value="grande">Grande</option></select></div>' +
        '<div style="flex:0.5;min-width:70px"><label class="text-sm text-muted">Cant.</label>' +
          '<input type="number" class="input" value="1" min="1" onchange="Pages.calcPackCost()"></div>' +
        '<div style="flex:0.7;min-width:90px"><label class="text-sm text-muted">Costo Unit.</label>' +
          '<input type="number" class="input" value="0" min="0" step="100" readonly data-costo="1" style="background:var(--bg-body);opacity:0.7"></div>' +
        '<button class="btn btn-sm btn-red" style="margin-bottom:1px" onclick="this.parentElement.parentElement.remove();Pages.calcPackCost()">X</button>' +
      '</div></div>';
    container.insertAdjacentHTML('beforeend', compHTML);
  },

  _updateCompCost(selectEl) {
    var card = selectEl.closest('[data-comp-idx]');
    if (!card) return;
    var selects = card.querySelectorAll('select');
    var prodVal = selects[0].value;
    var talla = selects[1].value;
    var costoInput = card.querySelector('[data-costo]');
    if (!prodVal || !costoInput) { if (costoInput) costoInput.value = 0; return; }
    var parts = prodVal.split(':');
    var tipo = parts[0];
    var prodId = Number(parts[1]);
    var producto = null;
    if (tipo === 'especia') producto = ArcanoDB.getEspecia(prodId);
    else if (tipo === 'blend') producto = ArcanoDB.getBlend(prodId);
    if (!producto) { costoInput.value = 0; return; }
    var costoInfo = ArcanoDB.getCostoProducto(producto, tipo);
    costoInput.value = Number(talla === 'grande' ? costoInfo.grande : costoInfo.chico) || 0;
  },

  calcPackCost() {
    var infoEl = document.getElementById('packCostInfo');
    if (!infoEl) return;
    var compCards = document.querySelectorAll('#packComps [data-comp-idx]');
    var costoTotal = 0;
    var totalFrascos = 0;
    var detalles = [];

    for (var i = 0; i < compCards.length; i++) {
      var card = compCards[i];
      var selects = card.querySelectorAll('select');
      var inputs = card.querySelectorAll('input[type="number"]');
      var prodVal = selects[0].value;
      var talla = selects[1].value;
      var cant = Number(inputs[0].value) || 1;

      if (!prodVal) continue;
      var parts = prodVal.split(':');
      var tipo = parts[0];
      var prodId = Number(parts[1]);
      var producto = null;
      if (tipo === 'especia') producto = ArcanoDB.getEspecia(prodId);
      else if (tipo === 'blend') producto = ArcanoDB.getBlend(prodId);
      if (!producto) continue;

      // Always calculate real cost from purchase data (admin cannot override)
      var costoInputs = card.querySelectorAll('[data-costo]');
      var costoUnit = 0;
      if (producto) {
        var costoInfo = ArcanoDB.getCostoProducto(producto, tipo);
        costoUnit = Number(talla === 'grande' ? costoInfo.grande : costoInfo.chico) || 0;
        if (costoInputs.length > 0) costoInputs[0].value = costoUnit;
      }
      var sub = costoUnit * cant;
      costoTotal += sub;
      totalFrascos += cant;
      detalles.push(producto.nombre + ' (' + (talla === 'grande' ? 'Grande' : 'Pequeno') + ') x' + cant + ' = $' + sub.toLocaleString());
    }

    var precioVenta = Number(document.getElementById('packPrecio').value) || 0;
    var margen = precioVenta - costoTotal;
    var margenClass = margen >= 0 ? 'text-green' : 'text-red';

    var infoHTML = '<div style="padding:12px">' +
      '<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px">' +
        '<span class="fw7">Costo total de componentes:</span>' +
        '<span class="fw7">$' + costoTotal.toLocaleString() + '</span>' +
      '</div>';
    if (detalles.length > 0) {
      infoHTML += '<div class="text-sm text-muted" style="margin-bottom:8px">' + detalles.join('<br>') + '</div>';
    }
    infoHTML += '<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">' +
        '<span class="fw7">Total frascos:</span>' +
        '<span>' + totalFrascos + '</span>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">' +
        '<span class="fw7">Precio de Venta:</span>' +
        '<span class="fw7">$' + precioVenta.toLocaleString() + '</span>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">' +
        '<span class="fw7">Margen:</span>' +
        '<span class="fw7 ' + margenClass + '">$' + margen.toLocaleString() + '</span>' +
      '</div>' +
      '</div>';
    infoEl.innerHTML = infoHTML;
  },

  doSavePack(editId) {
    var nombre = (document.getElementById('packNombre').value || '').trim();
    if (!nombre) { toast('Ingresa un nombre para el pack', 'err'); return; }

    var compCards = document.querySelectorAll('#packComps [data-comp-idx]');
    var componentes = [];
    for (var i = 0; i < compCards.length; i++) {
      var card = compCards[i];
      var selects = card.querySelectorAll('select');
      var inputs = card.querySelectorAll('input[type="number"]');
      var prodVal = selects[0].value;
      var talla = selects[1].value;
      var cant = Number(inputs[0].value) || 1;
      if (!prodVal) continue;
      var parts = prodVal.split(':');
      var tipo = parts[0];
      var prodId = Number(parts[1]);
      var producto = null;
      var nombreProd = '';
      if (tipo === 'especia') { producto = ArcanoDB.getEspecia(prodId); nombreProd = producto ? producto.nombre : ''; }
      else if (tipo === 'blend') { producto = ArcanoDB.getBlend(prodId); nombreProd = producto ? producto.nombre : ''; }
      componentes.push({ tipo: tipo, productoId: prodId, nombre: nombreProd, talla: talla, cantidad: cant });
    }

    if (componentes.length === 0) { toast('Agrega al menos un componente al pack', 'err'); return; }

    var data = {
      nombre: nombre,
      descripcion: (document.getElementById('packDesc').value || '').trim(),
      precioVenta: Number(document.getElementById('packPrecio').value) || 0,
      componentes: componentes,
      imagen: (document.getElementById('img-preview-pk') || {}).src || '',
      componentes: componentes
    };
    if (editId != null) data.id = editId;

    try {
      var saved = ArcanoDB.savePack(data);
      toast('Pack guardado: ' + saved.nombre, 'ok');
      var modal = document.getElementById('packModal');
      if (modal) modal.remove();
      App.renderPage('productos');
    } catch (e) {
      toast('Error: ' + e.message, 'err');
    }
  },

  doDeletePack(id) {
    if (!confirm('Eliminar este pack?')) return;
    ArcanoDB.deletePack(id);
    toast('Pack eliminado', 'ok');
    App.renderPage('productos');
  },


  /* ================================================================
     TESTING / SANDBOX
     ================================================================ */
  renderTesting(container) {
    var db = ArcanoDB.getDB();
    var especias = ArcanoDB.getEspecias();
    var blends = ArcanoDB.getBlends();
    var ventas = ArcanoDB.getVentas();
    var pedidos = ArcanoDB.getPedidos();
    var pdvs = ArcanoDB.getPuntosDeVenta ? ArcanoDB.getPuntosDeVenta() : [];

    var h = '<div style="margin-bottom:16px">' +
      '<h3 style="margin:0 0 4px">Testing y Sandbox</h3>' +
      '<p class="text-muted text-sm">Genera datos de prueba, reinicia stocks y prueba todas las funciones del sistema.</p>' +
      '</div>';

    // Current state
    h += '<div class="card"><div class="card-header"><h3>Estado Actual</h3></div><div class="card-body">';
    h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px">';
    h += '<div class="text-center"><div class="fw7" style="font-size:1.3em;color:var(--gold)">' + especias.length + '</div><div class="text-muted text-sm">Especias</div></div>';
    h += '<div class="text-center"><div class="fw7" style="font-size:1.3em;color:var(--blue)">' + blends.length + '</div><div class="text-muted text-sm">Blends</div></div>';
    h += '<div class="text-center"><div class="fw7" style="font-size:1.3em;color:var(--green)">' + ventas.length + '</div><div class="text-muted text-sm">Ventas Admin</div></div>';
    h += '<div class="text-center"><div class="fw7" style="font-size:1.3em">' + pedidos.length + '</div><div class="text-muted text-sm">Pedidos Tienda</div></div>';
    h += '<div class="text-center"><div class="fw7" style="font-size:1.3em">' + pdvs.length + '</div><div class="text-muted text-sm">P. de Venta</div></div>';
    h += '</div></div></div>';

    // Generate test data
    h += '<div class="card mt-16"><div class="card-header"><h3>Generar Datos de Prueba</h3></div><div class="card-body">';
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
    h += '<div><label class="text-sm fw7" style="display:block;margin-bottom:4px">Especias</label><input type="number" class="input" id="test-esp" value="8" min="0" max="50"></div>';
    h += '<div><label class="text-sm fw7" style="display:block;margin-bottom:4px">Blends</label><input type="number" class="input" id="test-blend" value="5" min="0" max="50"></div>';
    h += '<div><label class="text-sm fw7" style="display:block;margin-bottom:4px">Ventas Admin</label><input type="number" class="input" id="test-ventas" value="20" min="0" max="200"></div>';
    h += '<div><label class="text-sm fw7" style="display:block;margin-bottom:4px">Pedidos Tienda</label><input type="number" class="input" id="test-pedidos" value="10" min="0" max="100"></div>';
    h += '<div><label class="text-sm fw7" style="display:block;margin-bottom:4px">PDVs</label><input type="number" class="input" id="test-pdvs" value="2" min="0" max="10"></div>';
    h += '<div><label class="text-sm fw7" style="display:block;margin-bottom:4px">Ventas por PDV</label><input type="number" class="input" id="test-pdv-ventas" value="15" min="0" max="100"></div>';
    h += '</div>';
    h += '<div style="margin-top:12px"><label class="text-sm fw7" style="display:block;margin-bottom:4px">Antiguedad (dias)</label>';
    h += '<input type="range" id="test-dias" min="1" max="90" value="30" style="width:100%" oninput="document.getElementById(\'test-dias-val\').textContent=this.value+\' dias\'"><span id="test-dias-val" class="text-sm text-muted">30 dias</span></div>';
    h += '<button class="btn btn-gold btn-block mt-12" onclick="Pages._testGenerarTodo()" style="padding:14px;font-size:1rem;font-weight:700">Generar Todo</button>';
    h += '</div></div>';

    // Individual actions
    h += '<div class="card mt-16"><div class="card-header"><h3>Acciones Individuales</h3></div><div class="card-body">';
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
    h += '<button class="btn btn-outline" onclick="Pages._testCrearProductos()">Crear 10 Productos</button>';
    h += '<button class="btn btn-outline" onclick="Pages._testGenerarVentas()">Crear 20 Ventas</button>';
    h += '<button class="btn btn-outline" onclick="Pages._testGenerarPedidos()">Crear 10 Pedidos</button>';
    h += '<button class="btn btn-outline" onclick="Pages._testCrearPDVs()">Crear 2 PDVs</button>';
    h += '<button class="btn btn-outline" onclick="Pages._testAgregarStock()">Agregar Stock PDVs</button>';
    h += '<button class="btn btn-outline" onclick="Pages._testCrearProducciones()">Crear 5 Producciones</button>';
    h += '</div></div></div>';

    // Danger zone
    h += '<div class="card mt-16"><div class="card-header"><h3 style="color:var(--red)">Zona de Peligro</h3></div><div class="card-body">';
    h += '<p class="text-sm text-muted mb-12">Estas acciones eliminan datos de forma permanente.</p>';
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
    h += '<button class="btn btn-outline" style="border-color:var(--red);color:var(--red)" onclick="Pages._testResetStocks()">Reiniciar Stocks a 0</button>';
    h += '<button class="btn btn-outline" style="border-color:var(--red);color:var(--red)" onclick="Pages._testClearVentas()">Borrar Todas las Ventas</button>';
    h += '<button class="btn btn-outline" style="border-color:var(--red);color:var(--red)" onclick="Pages._testClearPedidos()">Borrar Todos los Pedidos</button>';
    h += '<button class="btn btn-red" onclick="Pages._testNuclearReset()">RESET NUCLEAR - Borrar Todo</button>';
    h += '</div></div></div>';

    container.innerHTML = h;
  },

  _testRandomDate(d) { var dt = new Date(); dt.setDate(dt.getDate() - Math.floor(Math.random() * d)); return dt.toISOString().slice(0, 10); },

  _testGenerarTodo() {
    var esp = Number(document.getElementById('test-esp').value) || 0;
    var blend = Number(document.getElementById('test-blend').value) || 0;
    var vtas = Number(document.getElementById('test-ventas').value) || 0;
    var peds = Number(document.getElementById('test-pedidos').value) || 0;
    var npdv = Number(document.getElementById('test-pdvs').value) || 0;
    var pv = Number(document.getElementById('test-pdv-ventas').value) || 0;
    var dias = Number(document.getElementById('test-dias').value) || 30;
    Pages._testCrearProductosN(esp, blend);
    Pages._testGenerarVentasN(vtas, dias);
    Pages._testGenerarPedidosN(peds, dias);
    Pages._testCrearPDVsN(npdv, pv, dias);
    Pages._testCrearProduccionesN(5, dias);
    toast('Datos de prueba generados! Revisa Dashboard, Ventas, P.Venta y Stats.');
  },

  _testCrearProductos() { Pages._testCrearProductosN(6, 4); toast('Productos creados'); },

  _testCrearProductosN(nEsp, nBlend) {
    var nms = ['Canela','Curcuma','Pimienta Negra','Comino','Oregano','Clavo','Nuez Moscada','Jengibre','Cacao','Vanilla','Cardamomo','Cilantro','Paprika','Azafran','Laurel','Tomillo','Romero','Salvia','Hinojo','Anis'];
    var cats = ['Especias','Dulces','Saladas','Exoticas'];
    for (var i = 0; i < nEsp; i++) {
      var nm = nms[i % nms.length] + (i >= nms.length ? ' ' + Math.ceil((i+1)/nms.length) : '');
      var pc = Math.floor(Math.random() * 8000 + 3000);
      ArcanoDB.saveEspecia({ nombre: nm, categoria: cats[i % cats.length], precioChico: pc, precioGrande: Math.floor(pc * 1.7), stockBolsa: Math.floor(Math.random() * 500 + 100), stockChico: Math.floor(Math.random() * 15 + 2), stockGrande: Math.floor(Math.random() * 10 + 1), enTienda: Math.random() > 0.3 });
    }
    var nmsB = ['Arcano Mix','Fuego Interior','Dulce Despertar','Noche Estelar','Camino Sagrado','Raiz Ancestral','Brisa Otono','Sol Naciente','Luna Llena','Tierra Fertil'];
    for (var j = 0; j < nBlend; j++) {
      var nb = nmsB[j % nmsB.length] + (j >= nmsB.length ? ' ' + Math.ceil((j+1)/nmsB.length) : '');
      var pb = Math.floor(Math.random() * 12000 + 5000);
      ArcanoDB.saveBlend({ nombre: nb, categoria: 'Blends', precioChico: pb, precioGrande: Math.floor(pb * 1.6), stockChico: Math.floor(Math.random() * 12 + 2), stockGrande: Math.floor(Math.random() * 8 + 1), enTienda: Math.random() > 0.3 });
    }
  },

  _testGenerarVentas() { Pages._testGenerarVentasN(20, 30); toast('Ventas creadas'); },

  _testGenerarVentasN(count, dias) {
    var esp = ArcanoDB.getEspecias(), bl = ArcanoDB.getBlends();
    var all = [].concat(esp.map(function(e){return{tipo:'especia',id:e.id,pc:e.precioChico,pg:e.precioGrande};}), bl.map(function(b){return{tipo:'blend',id:b.id,pc:b.precioChico,pg:b.precioGrande};}));
    if (!all.length) { toast('Crea productos primero','err'); return; }
    for (var v = 0; v < count; v++) {
      var nI = Math.floor(Math.random() * 3) + 1, items = [];
      for (var it = 0; it < nI; it++) {
        var pr = all[Math.floor(Math.random() * all.length)];
        var tl = Math.random() > 0.4 ? 'chico' : 'grande', cn = Math.floor(Math.random() * 3) + 1;
        var pu = tl === 'grande' ? pr.pg : pr.pc;
        items.push({ tipo: pr.tipo, productoId: pr.id, talla: tl, cantidad: cn, precioUnitario: pu, subtotal: pu * cn });
      }
      var tot = 0; for (var t = 0; t < items.length; t++) tot += items[t].subtotal;
      ArcanoDB.saveVenta({ fecha: Pages._testRandomDate(dias), items: items, total: tot, metodoPago: Math.random() > 0.5 ? 'efectivo' : 'qr' });
    }
  },

  _testGenerarPedidos() { Pages._testGenerarPedidosN(10, 30); toast('Pedidos creados'); },

  _testGenerarPedidosN(count, dias) {
    var esp = ArcanoDB.getEspecias(), bl = ArcanoDB.getBlends();
    var all = [].concat(esp, bl);
    if (!all.length) { toast('Crea productos primero','err'); return; }
    var ests = ['nuevo','confirmado','preparando','enviado','entregado'];
    for (var i = 0; i < count; i++) {
      var nI = Math.floor(Math.random() * 3) + 1, items = [];
      for (var it = 0; it < nI; it++) {
        var pr = all[Math.floor(Math.random() * all.length)];
        var tl = Math.random() > 0.4 ? 'chico' : 'grande', cn = Math.floor(Math.random() * 2) + 1;
        var pu = tl === 'grande' ? (pr.precioGrande||0) : (pr.precioChico||0);
        items.push({ tipo: pr.tipo||'especia', productoId: pr.id, productoNombre: pr.nombre, talla: tl, cantidad: cn, precioUnitario: pu, subtotal: pu * cn });
      }
      var tot = 0; for (var t = 0; t < items.length; t++) tot += items[t].subtotal;
      ArcanoDB.savePedido({ nombre: 'Cliente Test ' + (i+1), telefono: '300' + Math.floor(Math.random()*9000000+1000000), direccion: 'Calle Test #' + (i+1), items: items, total: tot, estado: ests[Math.min(Math.floor(Math.random()*ests.length), ests.length-1)], creado: new Date(Date.now() - Math.floor(Math.random()*dias*86400000)).toISOString() });
    }
  },

  _testCrearPDVs() { Pages._testCrearPDVsN(2, 15, 30); toast('PDVs creados'); },

  _testCrearPDVsN(count, vp, dias) {
    var locs = ['Feria Central','Plaza Principal','Mercado Municipal','Centro Comercial','Parque Norte'];
    var existentes = ArcanoDB.getPuntosDeVenta ? ArcanoDB.getPuntosDeVenta() : [];
    for (var p = 0; p < count; p++) {
      var pdv = ArcanoDB.savePuntoDeVenta({ nombre: 'PDV Test ' + (existentes.length + p + 1), ubicacion: locs[p % locs.length], activo: true });
      var esp = ArcanoDB.getEspecias(), bl = ArcanoDB.getBlends();
      var all = [].concat(esp.map(function(e){return{tipo:'especia',id:e.id,pc:e.precioChico,pg:e.precioGrande};}), bl.map(function(b){return{tipo:'blend',id:b.id,pc:b.precioChico,pg:b.precioGrande};}));
      var si = [];
      for (var s = 0; s < Math.min(8, all.length); s++) {
        var pr = all[Math.floor(Math.random() * all.length)];
        si.push({ tipo: pr.tipo, productoId: pr.id, talla: 'chico', cantidad: Math.floor(Math.random()*5)+2 });
      }
      try { ArcanoDB.moverStockAPDV(pdv.id, si); } catch(e) {}
      for (var v = 0; v < vp; v++) {
        var nI = Math.floor(Math.random()*2)+1, items = [];
        for (var it = 0; it < nI; it++) {
          var pr2 = all[Math.floor(Math.random()*all.length)];
          var cn2 = Math.floor(Math.random()*2)+1;
          items.push({ tipo: pr2.tipo, productoId: pr2.id, talla: 'chico', cantidad: cn2, precioUnitario: pr2.pc, subtotal: pr2.pc*cn2 });
        }
        ArcanoDB.savePDVVenta({ puntoDeVentaId: pdv.id, fecha: Pages._testRandomDate(dias), items: items, metodoPago: Math.random()>0.5?'efectivo':'qr' });
      }
    }
  },

  _testAgregarStock() {
    var pdvs = ArcanoDB.getPuntosDeVenta ? ArcanoDB.getPuntosDeVenta() : [];
    if (!pdvs.length) { toast('Crea PDVs primero','err'); return; }
    var esp = ArcanoDB.getEspecias(), bl = ArcanoDB.getBlends();
    var all = [].concat(esp.map(function(e){return{tipo:'especia',id:e.id};}), bl.map(function(b){return{tipo:'blend',id:b.id};}));
    for (var p = 0; p < pdvs.length; p++) {
      var items = [];
      for (var s = 0; s < Math.min(6,all.length); s++) {
        var pr = all[Math.floor(Math.random()*all.length)];
        items.push({ tipo: pr.tipo, productoId: pr.id, talla: 'chico', cantidad: Math.floor(Math.random()*5)+3 });
      }
      try { ArcanoDB.moverStockAPDV(pdvs[p].id, items); } catch(e) {}
    }
    toast('Stock agregado a ' + pdvs.length + ' PDVs');
  },

  _testCrearProducciones() { Pages._testCrearProduccionesN(5, 30); toast('Producciones creadas'); },

  _testCrearProduccionesN(count, dias) {
    var esp = ArcanoDB.getEspecias(), bl = ArcanoDB.getBlends();
    var all = [].concat(esp, bl);
    if (!all.length) { toast('Crea productos primero','err'); return; }
    for (var i = 0; i < count; i++) {
      var pr = all[Math.floor(Math.random()*all.length)];
      ArcanoDB.saveProduccion({ tipo: pr.tipo||'especia', productoId: pr.id, fecha: Pages._testRandomDate(dias), cantidad: Math.floor(Math.random()*20)+5, frascosChico: Math.floor(Math.random()*10)+2, frascosGrande: Math.floor(Math.random()*5)+1 });
    }
  },

  _testResetStocks() {
    if (!confirm('Reiniciar todos los stocks a 0?')) return;
    var esp = ArcanoDB.getEspecias(), bl = ArcanoDB.getBlends();
    for (var i = 0; i < esp.length; i++) ArcanoDB.saveEspecia({ id: esp[i].id, stockBolsa: 0, stockChico: 0, stockGrande: 0 });
    for (var j = 0; j < bl.length; j++) ArcanoDB.saveBlend({ id: bl[j].id, stockChico: 0, stockGrande: 0 });
    toast('Stocks reiniciados a 0'); App.renderPage('testing');
  },

  _testClearVentas() {
    if (!confirm('Borrar TODAS las ventas (admin y PDV)?')) return;
    var v = ArcanoDB.getVentas();
    for (var i = 0; i < v.length; i++) ArcanoDB.deleteVenta(v[i].id);
    var pdvs = ArcanoDB.getPuntosDeVenta ? ArcanoDB.getPuntosDeVenta() : [];
    for (var p = 0; p < pdvs.length; p++) pdvs[p].ventas = {};
    try { firebase.database().ref('arcano').remove(); } catch(e) {}
    localStorage.clear();
    toast('Ventas eliminadas'); App.renderPage('testing');
  },

  _testClearPedidos() {
    if (!confirm('Borrar TODOS los pedidos?')) return;
    var p = ArcanoDB.getPedidos();
    for (var i = 0; i < p.length; i++) ArcanoDB.deletePedido(p[i].id);
    toast('Pedidos eliminados'); App.renderPage('testing');
  },

  _testNuclearReset() {
    if (!confirm('RESET NUCLEAR: Se borrarán TODOS los datos. Continuar?')) return;
    if (!confirm('Estas SEGURO? Se perderán productos, ventas, pedidos, PDVs, todo.')) return;
    try { firebase.database().ref('arcano').remove(); } catch(e) {}
    localStorage.clear();
    toast('Reset completo. Recargando...');
    setTimeout(function() { location.reload(); }, 1500);
  },

  _renderEstContent: function(data, el) {
    // Redirect to ventas tab for backward compat
    Pages._estTab = 'ventas';
    Pages._renderVentas(data, el);
  }};
