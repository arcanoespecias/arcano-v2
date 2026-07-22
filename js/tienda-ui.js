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
    if (p.region) meta += ' · ' + p.region;
    if (p.uso) meta += ' · ' + p.uso;

    h += '<div class="product-card">' +
      '<div class="card-img" style="position:relative">' +
        (p.imagen ? '<img src="' + p.imagen + '" alt="' + p.nombre + '" style="width:100%;height:100%;object-fit:cover;border-radius:8px">' : '<span style="font-size:1.6rem">' + (p.tipo === 'blend' ? '🌿' : '🌱') + '</span>') +
      '</div>' +
      '<div class="card-body">' +
        '<div class="card-name">' + p.nombre + '</div>' +
        '<div class="card-meta">' + meta + '</div>' +
        '<span class="stock-badge ' + stockClass + '">' + stockText + '</span>' +
        '<div class="card-prices">' +
          (hasChico ? '<div class="price-box"><div class="price-label">Chico</div><div class="price-value">$' + p.precioChico.toLocaleString() + '</div></div>' : '') +
          (hasGrande ? '<div class="price-box"><div class="price-label">Grande</div><div class="price-value">$' + p.precioGrande.toLocaleString() + '</div></div>' : '') +
          (!hasChico && !hasGrande ? '<div class="price-na">Sin precio</div>' : '') +
        '</div>' +
        (anyStock ? '<div class="size-select" id="sizes-' + p.id + '">' +
          (hasChico ? '<div class="size-opt active" onclick="selectSize(' + p.id + ',\'chico\')">Chico</div>' : '') +
          (hasGrande ? '<div class="size-opt' + (!hasChico ? ' active' : '') + '" onclick="selectSize(' + p.id + ',\'grande\')">Grande</div>' : '') +
        '</div>' +
        '<button class="add-btn" id="add-' + p.id + '" onclick="doAddToCart(' + p.id + ')">Agregar al pedido</button>'
        : '<button class="add-btn" disabled>Sin stock</button>') +
      '</div></div>';
  }
  grid.innerHTML = h;
}

/* Size selector state */
var _selectedSizes = {};
function selectSize(pid, talla) {
  _selectedSizes[pid] = talla;
  var el = document.getElementById('sizes-' + pid);
  if (!el) return;
  var opts = el.querySelectorAll('.size-opt');
  for (var i = 0; i < opts.length; i++) {
    opts[i].classList.toggle('active', opts[i].textContent.toLowerCase().indexOf(talla) >= 0);
  }
}
function doAddToCart(pid) {
  var products = getStoreProducts();
  var product = null;
  for (var i = 0; i < products.length; i++) { if (products[i].id === pid) { product = products[i]; break; } }
  if (!product) return;
  var talla = _selectedSizes[pid] || (product.stockChico > 0 ? 'chico' : 'grande');
  addToCart(product, talla);
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
        '<div class="cart-item-detail">' + (c.talla === 'grande' ? 'Grande' : 'Chico') + ' · $' + c.precio.toLocaleString() + ' c/u</div></div>' +
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

/* === SEND ORDER === */
function sendOrder() {
  var nombre = document.getElementById('o-nombre').value.trim();
  var tel = document.getElementById('o-tel').value.trim();
  var email = document.getElementById('o-email').value.trim();
  var ciudad = document.getElementById('o-ciudad').value.trim();
  var dir = document.getElementById('o-dir').value.trim();
  var notas = document.getElementById('o-notas').value.trim();
  if (!nombre || !tel) { alert('Nombre y telefono son obligatorios'); return; }

  var items = '';
  for (var i = 0; i < cart.length; i++) {
    var c = cart[i];
    items += c.nombre + ' (' + (c.talla === 'grande' ? 'Grande' : 'Chico') + ') x' + c.qty + ' = $' + (c.precio * c.qty).toLocaleString() + '\\n';
  }
  var total = getCartTotal();
  var body = 'PEDIDO NUEVO\\n\\n' +
    'Cliente: ' + nombre + '\\n' +
    'Telefono: ' + tel + '\\n' +
    (email ? 'Email: ' + email + '\\n' : '') +
    (ciudad ? 'Ciudad: ' + ciudad + '\\n' : '') +
    (dir ? 'Direccion: ' + dir + '\\n' : '') +
    '\\n--- PRODUCTOS ---\\n' + items +
    '\\nTOTAL: $' + total.toLocaleString() +
    (notas ? '\\n\\nNOTAS: ' + notas : '');

  var mailto = 'mailto:arcano.especias@gmail.com?subject=Pedido%20-%20' + encodeURIComponent(nombre) +
    '&body=' + encodeURIComponent(body);
  window.open(mailto, '_blank');

  // Show success
  var overlay = document.getElementById('order-modal');
  if (overlay) {
    overlay.querySelector('.modal').innerHTML =
      '<div class="modal-body"><div class="success-msg">' +
      '<div class="success-icon">✉️</div>' +
      '<h3>Pedido casi listo</h3>' +
      '<p>Se abrio tu cliente de email con el detalle del pedido. Envialo para completar.</p>' +
      '<button class="btn-primary" style="margin-top:20px" onclick="finishOrder()">Entendido</button>' +
      '</div></div>';
  }
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

  // Filter buttons
  document.getElementById('filters').addEventListener('click', function(e) {
    var btn = e.target.closest('.filter-btn');
    if (!btn) return;
    currentFilter = btn.dataset.cat;
    document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    renderProducts(currentFilter);
  });
});