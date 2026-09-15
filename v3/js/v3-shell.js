/* =====================================================================
   ARCANO v3 — SHELL OVERRIDE
   Reemplaza el shell (sidebar + topbar + login) del App original
   con un diseño moderno. Reutiliza toda la lógica de db.js y pages.js.
   ===================================================================== */

(function() {
  // ====== Sobreescribir renderShell ======
  App.renderShell = function(user) {
    var root = document.getElementById('app-root');
    root.innerHTML =
      '<div class="app-layout ' + (this.sidebarOpen ? '' : 'sidebar-collapsed') + '" id="app-layout">' +
        '<aside class="sidebar" id="sidebar">' + _v3SidebarHTML(user) + '</aside>' +
        '<div class="sidebar-overlay" id="sidebar-overlay" onclick="App.closeMobileSidebar()"></div>' +
        '<header class="topbar">' +
          '<button class="menu-toggle" onclick="App.toggleSidebar()" aria-label="Toggle menu">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>' +
          '</button>' +
          '<h2 class="topbar-title" id="page-title">Dashboard</h2>' +
          '<div class="topbar-actions">' +
            '<span class="sync-badge online" id="sync-badge">Online</span>' +
          '</div>' +
        '</header>' +
        '<main class="main-content" id="page-content">' +
          '<div class="empty-state"><div class="loader"></div></div>' +
        '</main>' +
      '</div>' +
      '<div id="modal-overlay" class="modal-overlay" style="display:none" onclick="if(event.target===this)closeModal()"><div class="modal"><div class="modal-header"><h3 class="modal-title" id="modal-title"></h3><button class="btn btn-ghost btn-icon" onclick="closeModal()"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg></button></div><div class="modal-body" id="modal-body"></div></div></div>' +
      '<div id="toast" class="toast"></div>';
  };

  // ====== Sobreescribir navigate para update del título ======
  var _origNavigate = App.navigate.bind(App);
  App.navigate = function(page) {
    _origNavigate(page);
    var titles = {
      dashboard: 'Dashboard', productos: 'Productos', insumos: 'Insumos', testing: 'Testing',
      produccion: 'Producción', costales: 'Costales', ventas: 'Ventas', gastos: 'Gastos',
      pedidos: 'Pedidos', stock: 'Stock', tienda: 'Tienda', tublend: 'Tu Blend',
      recetas: 'Recetas IA', blog: 'Blog IA', estadisticas: 'Estadísticas',
      usuarios: 'Usuarios', puntosdeventa: 'Puntos de Venta', grandesClientes: 'Grandes Clientes',
      clientes: 'Clientes', promociones: 'Promociones', carritos: 'Carritos', mensajes: 'Mensajes WhatsApp'
    };
    var t = document.getElementById('page-title');
    if (t) t.textContent = titles[page] || page;
    // Cerrar sidebar mobile
    if (window.matchMedia('(max-width: 768px)').matches) {
      App.closeMobileSidebar();
    }
  };

  // ====== Sobreescribir toggleSidebar ======
  App.toggleSidebar = function(force) {
    var isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile) {
      var sidebar = document.getElementById('sidebar');
      var overlay = document.getElementById('sidebar-overlay');
      if (!sidebar) return;
      var willOpen = (typeof force === 'boolean') ? force : !sidebar.classList.contains('mobile-open');
      sidebar.classList.toggle('mobile-open', willOpen);
      if (overlay) overlay.classList.toggle('open', willOpen);
      this.sidebarOpen = willOpen;
    } else {
      this.sidebarOpen = (typeof force === 'boolean') ? force : !this.sidebarOpen;
      var layout = document.querySelector('.app-layout');
      if (layout) layout.classList.toggle('sidebar-collapsed', !this.sidebarOpen);
    }
  };

  App.closeMobileSidebar = function() {
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (overlay) overlay.classList.remove('open');
    if (window.matchMedia('(max-width: 768px)').matches) this.sidebarOpen = false;
  };

  // ====== Sobreescribir showLogin ======
  App.showLogin = function() {
    var root = document.getElementById('app-root');
    root.innerHTML =
      '<div class="login-screen">' +
        '<div class="login-card">' +
          '<div class="login-logo">A</div>' +
          '<h1 class="login-title">ARCANO</h1>' +
          '<p class="login-sub">Especias & Blends</p>' +
          '<div class="login-form">' +
            '<div class="form-group">' +
              '<label class="form-label">PIN de acceso</label>' +
              '<input type="password" class="form-input" id="pin-input" maxlength="10" placeholder="Ingresá tu PIN" onkeydown="if(event.key===\'Enter\')App.doLogin()" autofocus>' +
            '</div>' +
            '<button class="btn btn-primary btn-block btn-lg" onclick="App.doLogin()">Ingresar</button>' +
            '<p id="login-error" class="text-red text-sm text-center" style="display:none"></p>' +
          '</div>' +
        '</div>' +
      '</div>';
    setTimeout(function() {
      var inp = document.getElementById('pin-input');
      if (inp) inp.focus();
    }, 100);
  };

  // ====== Sobreescribir showSplash ======
  App.showSplash = function() {
    var root = document.getElementById('app-root');
    root.innerHTML =
      '<div class="splash">' +
        '<div class="splash-logo">A</div>' +
        '<div class="splash-text">ARCANO</div>' +
        '<div class="splash-sub">Especias & Blends</div>' +
        '<div class="loader"></div>' +
      '</div>';
  };

  // ====== Helpers internos ======
  function _v3SidebarHTML(user) {
    var groups = [
      {
        label: 'Operaciones', items: [
          { id: 'dashboard',  label: 'Dashboard',   icon: _icon('home') },
          { id: 'productos',  label: 'Productos',   icon: _icon('box') },
          { id: 'insumos',    label: 'Insumos',     icon: _icon('package') },
          { id: 'produccion', label: 'Producción',  icon: _icon('factory') },
          { id: 'costales',   label: 'Costales',    icon: _icon('layers') }
        ]
      },
      {
        label: 'Ventas', items: [
          { id: 'ventas',  label: 'Ventas',  icon: _icon('dollar') },
          { id: 'puntosdeventa', label: 'P. de Venta', icon: _icon('store') },
          { id: 'pedidos', label: 'Pedidos', icon: _icon('cart'), badge: 'pedidos-badge' },
          { id: 'gastos',  label: 'Gastos',  icon: _icon('trending-down') }
        ]
      },
      {
        label: 'Stock y Costos', items: [
          { id: 'stock',        label: 'Stock',       icon: _icon('list') },
          { id: 'estadisticas', label: 'Estadísticas', icon: _icon('chart') }
        ]
      },
      {
        label: 'Tienda Online', items: [
          { id: 'tienda',     label: 'Tienda',     icon: _icon('globe') },
          { id: 'tublend',    label: 'Tu Blend',   icon: _icon('flask') },
          { id: 'recetas',    label: 'Recetas IA', icon: _icon('book') },
          { id: 'blog',       label: 'Blog IA',    icon: _icon('file') },
          { id: 'promociones',label: 'Promociones',icon: _icon('gift') },
          { id: 'carritos',   label: 'Carritos',   icon: _icon('shopping-bag') }
        ]
      },
      {
        label: 'Clientes', items: [
          { id: 'grandesClientes', label: 'Grandes Clientes', icon: _icon('building'), badge: 'gc-badge' },
          { id: 'clientes',        label: 'Clientes',         icon: _icon('users') },
          { id: 'mensajes',        label: 'Mensajes WA',      icon: _icon('message') }
        ]
      },
      {
        label: 'Sistema', items: [
          { id: 'usuarios', label: 'Usuarios', icon: _icon('user') },
          { id: 'testing',   label: 'Testing',   icon: _icon('beaker') }
        ]
      }
    ];

    var html = '';
    html += '<div class="sidebar-header">' +
      '<div class="sidebar-logo">A</div>' +
      '<div><div class="sidebar-brand">ARCANO</div><div class="sidebar-brand-sub">v3 preview</div></div>' +
    '</div>';
    html += '<nav class="sidebar-nav">';
    for (var gi = 0; gi < groups.length; gi++) {
      var g = groups[gi];
      html += '<div class="sidebar-group" data-group="' + g.label + '">';
      html += '<div class="sidebar-group-label" onclick="this.parentElement.classList.toggle(\'collapsed\')">' +
        '<span>' + g.label + '</span>' +
        '<span class="chevron">▼</span>' +
      '</div>';
      html += '<div class="sidebar-group-items">';
      for (var ii = 0; ii < g.items.length; ii++) {
        var item = g.items[ii];
        var badgeHtml = item.badge ? '<span class="nav-badge" id="' + item.badge + '" style="display:none"></span>' : '';
        html += '<a class="nav-item" data-page="' + item.id + '" onclick="App.navigate(\'' + item.id + '\')">' +
          '<span class="nav-icon">' + item.icon + '</span>' +
          '<span class="nav-label">' + item.label + '</span>' +
          badgeHtml +
        '</a>';
      }
      html += '</div></div>';
    }
    html += '</nav>';
    // Footer con user + logout
    var initial = (user && user.nombre) ? user.nombre.charAt(0).toUpperCase() : 'A';
    var nombre = (user && user.nombre) ? _esc(user.nombre) : 'Admin';
    var rol = (user && user.rol) ? user.rol : 'admin';
    html += '<div class="sidebar-footer">' +
      '<div class="user-avatar">' + _esc(initial) + '</div>' +
      '<div class="user-info"><div class="user-name">' + nombre + '</div><div class="user-role">' + _esc(rol) + '</div></div>' +
      '<button class="btn-logout" onclick="App.logout()" title="Salir">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>' +
      '</button>' +
    '</div>';
    return html;
  }

  function _esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Iconos SVG inline (estilo lucide, stroke 2)
  function _icon(name) {
    var i = ICONS[name] || ICONS['box'];
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + i + '</svg>';
  }

  var ICONS = {
    'home':           '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    'box':            '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
    'package':        '<line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
    'factory':        '<path d="M2 20h20"/><path d="M4 20V8l5 4V8l5 4V8l5 4v8"/><path d="M9 20v-4h4v4"/>',
    'layers':         '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    'dollar':         '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    'store':          '<path d="M3 9l1-5h16l1 5"/><path d="M4 9v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9"/><path d="M9 21V12h6v9"/>',
    'cart':           '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
    'trending-down':  '<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>',
    'list':           '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
    'chart':          '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="3" y1="20" x2="21" y2="20"/>',
    'globe':          '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    'flask':          '<path d="M9 3h6v5l4 9a2 2 0 0 1-2 3H7a2 2 0 0 1-2-3l4-9V3z"/><line x1="9" y1="3" x2="15" y2="3"/>',
    'book':           '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    'file':           '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    'gift':           '<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
    'shopping-bag':   '<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    'building':       '<path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><line x1="9" y1="9" x2="9" y2="9"/><line x1="9" y1="12" x2="9" y2="12"/><line x1="9" y1="15" x2="9" y2="15"/>',
    'users':          '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    'message':        '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    'user':           '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    'beaker':         '<path d="M9 2v6l-5 9a3 3 0 0 0 3 5h10a3 3 0 0 0 3-5l-5-9V2"/><line x1="9" y1="2" x2="15" y2="2"/>'
  };

  // Exponer el renderShell original llamado por enterApp — ya está sobreescrito arriba
  // No hace falta nada más: App.init() → enterApp() → renderShell() usará la nueva versión.
})();
