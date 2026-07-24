/* ===================== ARCANO V3 — CORE (Auth, Routing, Shell) ===================== */

const App = {
  currentPage: 'dashboard',
  sidebarOpen: true,

  async init() {
    this.showSplash();
    try {
      await ArcanoDB.initDB();
    } catch (e) {
      console.error('[Core] DB init failed:', e);
    }
    var user = ArcanoDB.getCurrentUser();
    if (user) {
      this.enterApp();
    } else {
      this.showLogin();
    }
  },

  showSplash() {
    document.getElementById('app-root').innerHTML =
      '<div class="splash">' +
        '<div class="splash-logo">A</div>' +
        '<div class="splash-text">ARCANO</div>' +
        '<div class="splash-sub">Especias & Blends</div>' +
        '<div class="splash-loader"><div class="loader"></div></div>' +
      '</div>';
  },

  showLogin() {
    document.getElementById('app-root').innerHTML =
      '<div class="login-screen">' +
        '<div class="login-card">' +
          '<div class="login-logo">A</div>' +
          '<h1 class="login-title">ARCANO</h1>' +
          '<p class="login-sub">Especias & Blends</p>' +
          '<div class="login-form">' +
            '<label>Ingresar PIN</label>' +
            '<input type="password" id="pin-input" maxlength="10" placeholder="PIN de acceso" onkeydown="if(event.key===\'Enter\')App.doLogin()">' +
            '<button class="btn btn-gold btn-block" onclick="App.doLogin()">Ingresar</button>' +
            '<p id="login-error" class="text-red text-sm mt-8" style="display:none"></p>' +
          '</div>' +
        '</div>' +
      '</div>';
    setTimeout(function() {
      var inp = document.getElementById('pin-input');
      if (inp) inp.focus();
    }, 100);
  },

  doLogin() {
    var pin = document.getElementById('pin-input').value.trim();
    if (!pin) { this.showLoginError('Ingresar un PIN'); return; }
    var user = ArcanoDB.authenticateUser(pin);
    if (user) { this.enterApp(); } else { this.showLoginError('PIN incorrecto'); }
  },

  showLoginError(msg) {
    var el = document.getElementById('login-error');
    el.textContent = msg;
    el.style.display = 'block';
    document.getElementById('pin-input').classList.add('input-error');
    setTimeout(function() { document.getElementById('pin-input').classList.remove('input-error'); }, 1500);
  },

  enterApp() {
    var user = ArcanoDB.getCurrentUser();
    if (!user) { this.showLogin(); return; }

    ArcanoDB.onDBChange(function(type) {
      if (type === 'remote_change') App.renderPage(App.currentPage);
    });

    // Pedidos badge listener + audio notification
    function _playNotifSound() {
      try {
        var ctx = new (window.AudioContext || window.webkitAudioContext)();
        // Two-tone notification: high note then higher note
        var times = [0, 0.15, 0.35];
        var freqs = [880, 1100, 880];
        for (var i = 0; i < times.length; i++) {
          var osc = ctx.createOscillator();
          var gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = freqs[i];
          osc.type = 'sine';
          gain.gain.setValueAtTime(0.3, ctx.currentTime + times[i]);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + times[i] + 0.14);
          osc.start(ctx.currentTime + times[i]);
          osc.stop(ctx.currentTime + times[i] + 0.15);
        }
      } catch (e) {}
    }

    var _lastPedidoNuevoCount = -1;
    function _updatePedidosBadge(pedidos, isNew, countChanged) {
      var count = ArcanoDB.getPedidosCount('nuevo');
      var badge = document.getElementById('pedidos-badge');
      if (badge) {
        if (count > 0) { badge.textContent = count; badge.style.display = 'inline'; }
        else { badge.style.display = 'none'; }
      }
      // Audio + visual alert when a NEW pedido arrives (not on initial load)
      if (isNew && _lastPedidoNuevoCount >= 0) {
        _playNotifSound();
        // Flash browser tab title
        var origTitle = document.title;
        var flashCount = 0;
        var flashInterval = setInterval(function() {
          document.title = flashCount % 2 === 0 ? '\u{1F514} Nuevo Pedido!' : origTitle;
          flashCount++;
          if (flashCount >= 10) { clearInterval(flashInterval); document.title = origTitle; }
        }, 800);
        // Re-render current page to show new pedido in dashboard
        App.renderPage(App.currentPage);
      }
      _lastPedidoNuevoCount = count;
    }
    ArcanoDB.onPedidosChange(_updatePedidosBadge);
    // Initial badge update after a short delay to let pedidos load
    setTimeout(_updatePedidosBadge, 2000);

    this.renderShell(user);
    this.renderPage('dashboard');
  },

  renderShell(user) {
    var root = document.getElementById('app-root');
    root.innerHTML =
      '<div class="app-layout ' + (this.sidebarOpen ? '' : 'sidebar-closed') + '">' +
        '<aside class="sidebar" id="sidebar">' +
          '<div class="sidebar-header">' +
            '<div class="sidebar-logo">A</div>' +
            '<div class="sidebar-brand">ARCANO</div>' +
          '</div>' +
          '<nav class="sidebar-nav" id="sidebar-nav">' +
            '<a class="nav-item active" data-page="dashboard" onclick="App.navigate(\'dashboard\')">' +
              '<span class="nav-icon">📊</span><span class="nav-label">Dashboard</span></a>' +
            '<a class="nav-item" data-page="productos" onclick="App.navigate(\'productos\')">' +
              '<span class="nav-icon">🌶️</span><span class="nav-label">Productos</span></a>' +
            '<a class="nav-item" data-page="insumos" onclick="App.navigate(\'insumos\')">' +
              '<span class="nav-icon">📦</span><span class="nav-label">Insumos</span></a>' +
            '<a class="nav-item" data-page="produccion" onclick="App.navigate(\'produccion\')">' +
              '<span class="nav-icon">🏭</span><span class="nav-label">Produccion</span></a>' +
            '<a class="nav-item" data-page="ventas" onclick="App.navigate(\'ventas\')">' +
              '<span class="nav-icon">💰</span><span class="nav-label">Ventas</span></a>' +
            '<a class="nav-item" data-page="pedidos" onclick="App.navigate(\'pedidos\')" id="nav-pedidos">' +
              '<span class="nav-icon">📦</span><span class="nav-label">Pedidos</span><span class="nav-badge" id="pedidos-badge" style="display:none"></span></a>' +
            '<a class="nav-item" data-page="stock" onclick="App.navigate(\'stock\')">' +
              '<span class="nav-icon">📋</span><span class="nav-label">Stock</span></a>' +
            '<a class="nav-item" data-page="tienda" onclick="App.navigate(\'tienda\')">' +
              '<span class="nav-icon">🛒</span><span class="nav-label">Tienda</span></a>' +
            '<a class="nav-item" data-page="usuarios" onclick="App.navigate(\'usuarios\')">' +
              '<span class="nav-icon">👥</span><span class="nav-label">Usuarios</span></a>' +
          '</nav>' +
          '<div class="sidebar-footer">' +
            '<div class="user-info">' +
              '<span class="user-name">' + (user.nombre || 'Admin') + '</span>' +
              '<span class="user-role">' + (user.rol || 'admin') + '</span>' +
            '</div>' +
            '<button class="btn btn-sm btn-outline" onclick="App.logout()">Salir</button>' +
          '</div>' +
        '</aside>' +
        '<main class="main-content">' +
          '<header class="top-bar">' +
            '<button class="btn btn-ghost" onclick="App.toggleSidebar()">☰</button>' +
            '<h2 class="page-title" id="page-title">Dashboard</h2>' +
            '<div class="top-bar-actions">' +
              '<span class="sync-indicator" id="sync-indicator" title="Conectado a Firebase">● Firebase</span>' +
            '</div>' +
          '</header>' +
          '<div class="page-content" id="page-content">' +
            '<div class="loader-center"><div class="loader"></div></div>' +
          '</div>' +
        '</main>' +
      '</div>';
  },

  navigate(page) {
    this.currentPage = page;
    document.querySelectorAll('.nav-item').forEach(function(el) {
      el.classList.toggle('active', el.dataset.page === page);
    });
    var titles = {
      dashboard: 'Dashboard', productos: 'Productos', insumos: 'Insumos',
      produccion: 'Produccion', ventas: 'Ventas', pedidos: 'Pedidos', stock: 'Stock', tienda: 'Tienda', usuarios: 'Usuarios'
    };
    document.getElementById('page-title').textContent = titles[page] || page;
    this.renderPage(page);
  },

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
    document.querySelector('.app-layout').classList.toggle('sidebar-closed', !this.sidebarOpen);
  },

  logout() {
    ArcanoDB.logoutUser();
    this.showLogin();
  },

  renderPage(page) {
    var container = document.getElementById('page-content');
    if (!container) return;
    try {
      switch (page) {
        case 'dashboard': Pages.renderDashboard(container); break;
        case 'productos': Pages.renderProductos(container); break;
        case 'insumos': Pages.renderInsumos(container); break;
        case 'produccion': Pages.renderProduccion(container); break;
        case 'ventas': Pages.renderVentas(container); break;
        case 'pedidos': Pages.renderPedidos(container); break;
        case 'stock': Pages.renderStock(container); break;
        case 'tienda': Pages.renderTiendaAdmin(container); break;
        case 'usuarios': Pages.renderUsuarios(container); break;
        default: container.innerHTML = '<p>Pagina no encontrada</p>';
      }
    } catch (e) {
      console.error('[Core] Page render error:', e);
      container.innerHTML = '<div class="error-box"><h3>Error al cargar la pagina</h3><p>' + e.message + '</p><button class="btn btn-gold mt-12" onclick="App.renderPage(\'' + page + '\')">Reintentar</button></div>';
    }
  }
};

document.addEventListener('DOMContentLoaded', function() { App.init(); });