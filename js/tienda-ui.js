/* ===================== ARCANO TIENDA — UI ===================== */
var cart = JSON.parse(localStorage.getItem('arcano_cart') || '[]');

function saveCart() { localStorage.setItem('arcano_cart', JSON.stringify(cart)); }

function getCartCount() { var c = 0; for (var i = 0; i < cart.length; i++) c += cart[i].qty; return c; }

function getCartTotal() { var t = 0; for (var i = 0; i < cart.length; i++) t += cart[i].precio * cart[i].qty; return t; }

function addToCart(product, talla) {
  var precio = talla === 'grande' ? product.precioGrande : product.precioChico;
  if (precio <= 0) return;
  for (var i = 0; i < cart.length; i++) {
    if (cart[i].productId === product.id && cart[i].talla === talla) { cart[i].qty++; saveCart(); updateCartFab(); return; }
  }
  cart.push({ productId: product.id, nombre: product.nombre, tipo: product.tipo, talla: talla, precio: precio, qty: 1 });
  saveCart(); updateCartFab();
}

function removeFromCart(idx) { cart.splice(idx, 1); saveCart(); updateCartFab(); if (document.getElementById('cart-list')) renderCartModal(); }

function changeQty(idx, delta) {
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  saveCart(); updateCartFab(); if (document.getElementById('cart-list')) renderCartModal();
}

function updateCartFab() {
  var fab = document.getElementById('cart-fab');
  var count = getCartCount();
  if (count > 0) { fab.style.display = 'flex'; document.getElementById('cart-count').textContent = count; }
  else { fab.style.display = 'none'; }
}

/* === RENDER PRODUCTS === */
function renderProducts(filter) {
  var products = getStoreProducts();
  var grid = document.getElementById('products-grid');
  if (products.length === 0) {
    grid.innerHTML = '<div class="empty-state"><p style="font-size:2rem;margin-bottom:8px">🌶️</p><p>No hay productos disponibles por el momento.</p></div>';
    return;
  }
  var filtered = filter && filter !== 'Todos' ? products.filter(function(p) { return p.categoria === filter; }) : products;
  if (filtered.length === 0) {
    grid.innerHTML = '<div class="empty-state"><p>No hay productos en esta categoria.</p></div>';
    return;
  }
  var h = '';
  for (var i = 0; i < filtered.length; i++) {
    var p = filtered[i];
    var hasChico = p.stockChico > 0 && p.precioChico > 0;
    var hasGrande = p.stockGrande > 0 && p.precioGrande > 0;
    var anyStock = hasChico || hasGrande;
    var stockClass = (hasChico && p.stockChico <= 3) || (hasGrande && p.stockGrande <= 3) ? 'stock-low' : 'stock-ok';
    var stockText = '';
    if (hasChico && hasGrande) stockText = 'Ch: ' + p.stockChico + ' | Gr: ' + p.stockGrande;
    else if (hasChico) stockText = 'Chico: ' + p.stockChico + ' disp.';
    else if (hasGrande) stockText = 'Grande: ' + p.stockGrande + ' disp.';

    var meta = (p.tipo === 'blend' ? 'Blend' : 'Especia');
    if (p.categoria) meta += ' \u00b7 ' + p.categoria;

    h += '<div class="product-card">' +
      '<div class="card-img" style="position:relative" onclick="openDetail(' + p.id + ')">' +
        (p.imagen ? '<img src="' + p.imagen + '" alt="' + p.nombre + '">' : '<span>' + (p.tipo === 'blend' ? '\ud83c\udf3f' : '\ud83c\udf31') + '</span>') +
      '</div>' +
      '<div class="card-body">' +
        '<div class="card-name">' + p.nombre + '</div>' +
        '<div class="card-meta">' + meta + '</div>' +
        (p.tags && p.tags.length ? '<div class="card-tags">' + p.tags.map(function(t){return '<span class="card-tag">' + t + '</span>';}).join('') + '</div>' : '') +
        (anyStock ? '<span class="stock-badge ' + stockClass + '">' + stockText + '</span>' : '') +
        '<div class="card-prices">' +
          (hasChico ? '<div class="price-box"><div class="price-label">Chico</div><div class="price-value">$' + p.precioChico.toLocaleString() + '</div></div>' : '') +
          (hasGrande ? '<div class="price-box"><div class="price-label">Grande</div><div class="price-value">$' + p.precioGrande.toLocaleString() + '</div></div>' : '') +
          (!hasChico && !hasGrande ? '<div class="price-na">Sin precio</div>' : '') +
        '</div>' +
        (anyStock ? '<button class="add-btn" onclick="doAddToCart(' + p.id + ')">Agregar al pedido</button>'
        : '<button class="add-btn" disabled>Sin stock</button>') +
      '</div></div>';
  }
  grid.innerHTML = h;
}

function doAddToCart(pid) {
  var products = getStoreProducts();
  var product = null;
  for (var i = 0; i < products.length; i++) { if (products[i].id === pid) { product = products[i]; break; } }
  if (!product) return;
  var talla = (product.stockChico > 0 && product.precioChico > 0) ? 'chico' : 'grande';
  addToCart(product, talla);
}

/* === PRODUCT DETAIL MODAL === */
function openDetail(pid) {
  var products = getStoreProducts();
  var p = null;
  for (var i = 0; i < products.length; i++) { if (products[i].id === pid) { p = products[i]; break; } }
  if (!p) return;

  var hasChico = p.stockChico > 0 && p.precioChico > 0;
  var hasGrande = p.stockGrande > 0 && p.precioGrande > 0;
  var anyStock = hasChico || hasGrande;
  var typeClass = p.tipo === 'blend' ? 'detail-type-blend' : 'detail-type-especia';
  var typeLabel = p.tipo === 'blend' ? 'Blend' : 'Especia';

  var tagsHtml = '';
  if (p.categoria) tagsHtml += '<span class="detail-info-tag">' + p.categoria + '</span>';
  if (p.uso) tagsHtml += '<span class="detail-info-tag">' + p.uso + '</span>';
  if (p.region) tagsHtml += '<span class="detail-info-tag">' + p.region + '</span>';
  if (p.tags && p.tags.length) {
    for (var ti = 0; ti < p.tags.length; ti++) {
      tagsHtml += '<span class="detail-info-tag detail-tag-item">' + p.tags[ti] + '</span>';
    }
  }

  var pricesHtml = '';
  if (hasChico) pricesHtml += '<div class="detail-price-card"><div class="detail-price-label">Chico</div><div class="detail-price-val">$' + p.precioChico.toLocaleString() + '</div></div>';
  if (hasGrande) pricesHtml += '<div class="detail-price-card"><div class="detail-price-label">Grande</div><div class="detail-price-val">$' + p.precioGrande.toLocaleString() + '</div></div>';

  var stockHtml = '';
  if (hasChico && hasGrande) stockHtml = 'Chico: ' + p.stockChico + ' disponibles \u00b7 Grande: ' + p.stockGrande + ' disponibles';
  else if (hasChico) stockHtml = p.stockChico + ' frascos disponibles';
  else if (hasGrande) stockHtml = p.stockGrande + ' frascos disponibles';

  var descHtml = p.descripcion ? '<p class="detail-desc">' + p.descripcion + '</p>' : '';

  var overlay = document.createElement('div');
  overlay.className = 'detail-overlay';
  overlay.id = 'detail-overlay';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

  var html = '<div class="detail-modal">' +
    '<div class="detail-img" style="position:relative">' +
      '<button class="detail-close" onclick="document.getElementById(\'detail-overlay\').remove()">&times;</button>' +
      (p.imagen ? '<img src="' + p.imagen + '" alt="' + p.nombre + '">' : '<span class="detail-emoji">' + (p.tipo === 'blend' ? '\ud83c\udf3f' : '\ud83c\udf31') + '</span>') +
    '</div>' +
    '<div class="detail-content">' +
      '<span class="detail-type ' + typeClass + '">' + typeLabel + '</span>' +
      '<h2>' + p.nombre + '</h2>' +
      (tagsHtml ? '<div class="detail-info-row">' + tagsHtml + '</div>' : '') +
      descHtml +
      (pricesHtml ? '<div class="detail-prices-row">' + pricesHtml + '</div>' : '') +
      (stockHtml ? '<p class="detail-stock">' + stockHtml + '</p>' : '') +
      (anyStock ? '<button class="detail-add-btn" onclick="doAddToCart(' + p.id + ');document.getElementById(\'detail-overlay\').remove()">Agregar al pedido</button>' :
        '<button class="detail-add-btn" disabled>Sin stock</button>') +
    '</div></div>';

  overlay.innerHTML = html;
  document.body.appendChild(overlay);
}

/* === CART MODAL === */
function openCart() {
  var existing = document.getElementById('order-modal');
  if (existing) { existing.remove(); return; }
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'order-modal';
  document.body.appendChild(overlay);
  renderCartModal();
}

function renderCartModal() {
  var overlay = document.getElementById('order-modal');
  if (!overlay) return;
  var total = getCartTotal();
  var h = '<div class="modal">' +
    '<div class="modal-header"><h3>Tu Pedido</h3><button class="modal-close" onclick="closeCart()">&times;</button></div>' +
    '<div class="modal-body">';

  if (cart.length === 0) {
    h += '<div class="empty-state"><p>No agregaste productos aun.</p></div>';
  } else {
    h += '<div id="cart-list">';
    for (var i = 0; i < cart.length; i++) {
      var c = cart[i];
      h += '<div class="cart-item">' +
        '<div class="cart-item-info"><div class="cart-item-name">' + c.nombre + '</div>' +
        '<div class="cart-item-detail">' + (c.talla === 'grande' ? 'Grande' : 'Chico') + ' \u00b7 $' + c.precio.toLocaleString() + ' c/u</div></div>' +
        '<div class="cart-item-qty"><button onclick="changeQty(' + i + ',-1)">-</button><span>' + c.qty + '</span><button onclick="changeQty(' + i + ',1)">+</button></div>' +
        '<div class="cart-item-price">$' + (c.precio * c.qty).toLocaleString() + '</div>' +
        '<button class="cart-item-rm" onclick="removeFromCart(' + i + ')">&times;</button></div>';
    }
    h += '</div>';
    h += '<div class="cart-total">Total: $' + total.toLocaleString() + '</div>';
    h += '<div style="margin-top:16px;border-top:1px solid var(--border);padding-top:16px">' +
      '<div class="form-group"><label>Nombre</label><input class="form-input" id="o-nombre" placeholder="Tu nombre"></div>' +
      '<div class="form-row"><div class="form-group"><label>Telefono</label><input class="form-input" id="o-tel" placeholder="Ej: 300 123 4567"></div>' +
      '<div class="form-group"><label>Email</label><input class="form-input" id="o-email" type="email" placeholder="tu@email.com"></div></div>' +
      '<div class="form-row"><div class="form-group"><label>Ciudad</label><input class="form-input" id="o-ciudad" placeholder="Ej: Bogota"></div>' +
      '<div class="form-group"><label>Direccion</label><input class="form-input" id="o-dir" placeholder="Direccion de entrega"></div></div>' +
      '<div class="form-group"><label>Notas adicionales</label><textarea class="form-input" id="o-notas" placeholder="Horario de entrega, instrucciones especiales..."></textarea></div>' +
      '</div>';
  }

  h += '</div><div class="modal-footer">' +
    (cart.length > 0 ? '<button class="btn-secondary" onclick="closeCart()">Seguir comprando</button><button class="btn-primary" onclick="sendOrder()">Enviar Pedido</button>' :
    '<button class="btn-secondary" onclick="closeCart()">Volver</button>') +
    '</div></div>';
  overlay.innerHTML = h;
}

function closeCart() {
  var el = document.getElementById('order-modal');
  if (el) el.remove();
}

/* === SEND ORDER (Firebase) === */
function sendOrder() {
  var nombre = document.getElementById('o-nombre').value.trim();
  var tel = document.getElementById('o-tel').value.trim();
  var email = document.getElementById('o-email').value.trim();
  var ciudad = document.getElementById('o-ciudad').value.trim();
  var dir = document.getElementById('o-dir').value.trim();
  var notas = document.getElementById('o-notas').value.trim();
  if (!nombre || !tel) { alert('Nombre y telefono son obligatorios'); return; }
  if (cart.length === 0) { alert('El carrito esta vacio'); return; }

  var items = [];
  for (var i = 0; i < cart.length; i++) {
    var c = cart[i];
    items.push({ productId: c.productId, nombre: c.nombre, tipo: c.tipo, talla: c.talla, precio: c.precio, qty: c.qty, subtotal: c.precio * c.qty });
  }
  var total = getCartTotal();
  var orderData = {
    cliente: { nombre: nombre, telefono: tel, email: email, ciudad: ciudad, direccion: dir },
    items: items, total: total, notas: notas
  };

  var overlay = document.getElementById('order-modal');
  if (overlay) overlay.querySelector('.modal-body').innerHTML = '<div style="text-align:center;padding:30px"><div class="loader"></div><p class="text-muted mt-12">Enviando pedido...</p></div>';

  submitOrder(orderData).then(function() {
    if (overlay) {
      overlay.querySelector('.modal').innerHTML =
        '<div class="modal-body"><div class="success-msg">' +
        '<div class="success-icon">\u2705</div>' +
        '<h3>Pedido enviado</h3>' +
        '<p>Tu pedido fue recibido correctamente. Nos contactaremos pronto para confirmar.</p>' +
        '<button class="btn-primary" style="margin-top:20px" onclick="finishOrder()">Entendido</button>' +
        '</div></div>';
    }
  }).catch(function(err) {
    alert('Error al enviar el pedido: ' + (err.message || err));
    if (overlay) renderCartModal();
  });
}

function finishOrder() {
  cart = []; saveCart(); updateCartFab();
  closeCart();
  renderProducts(currentFilter);
}

/* === INIT === */
var currentFilter = 'Todos';
document.addEventListener('DOMContentLoaded', function() {
  initTienda().then(function() {
    renderProducts('Todos');
    updateCartFab();
  });

  document.getElementById('filters').addEventListener('click', function(e) {
    var btn = e.target.closest('.filter-btn');
    if (!btn) return;
    currentFilter = btn.dataset.cat;
    document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    renderProducts(currentFilter);
  });
});
