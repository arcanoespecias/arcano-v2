/* ===================== ARCANO V2 — CORE (Auth, Routing, Shell) ===================== */

const App = {
  currentPage: 'dashboard',
  sidebarOpen: true,

  /* ---------- Initialization ---------- */
  async init() {
    this.showSplash();
    try {
      await ArcanoDB.initDB();
      console.log('[Core] DB initialized');
    } catch (e) {
      console.error('[Core] DB init failed:', e);
    }

    const user = ArcanoDB.getCurrentUser();
    if (user) {
      this.enterApp();
    } else {
      this.showLogin();
    }
  },

  /* ---------- Splash Screen ---------- */
  showSplash() {
    document.getElementById('app-root').innerHTML = `
      <div class="splash">
        <div class="splash-logo">A</div>
        <div class="splash-text">ARCANO</div>
        <div class="splash-sub">Especias & Blends</div>
        <div class="splash-loader"><div class="loader"></div></div>
      </div>`;
  },

  /* ---------- Login ---------- */
  showLogin() {
    document.getElementById('app-root').innerHTML = `
      <div class="login-screen">
        <div class="login-card">
          <div class="login-logo">A</div>
          <h1 class="login-title">ARCANO</h1>
          <p class="login-sub">Especias & Blends</p>
          <div class="login-form">
            <label>Ingresar PIN</label>
            <input type="password" id="pin-input" maxlength="10" placeholder="PIN de acceso" 
                   onkeydown="if(event.key==='Enter')App.doLogin()">
            <button class="btn btn-gold btn-block" onclick="App.doLogin()">Ingresar</button>
            <p id="login-error" class="text-red text-sm mt-8" style="display:none"></p>
          </div>
        </div>
      </div>`;
    setTimeout(() => {
      const inp = document.getElementById('pin-input');
      if (inp) inp.focus();
    }, 100);
  },

  doLogin() {
    const pin = document.getElementById('pin-input').value.trim();
    if (!pin) {
      this.showLoginError('Ingresar un PIN');
      return;
    }
    const user = ArcanoDB.authenticateUser(pin);
    if (user) {
      this.enterApp();
    } else {
      this.showLoginError('PIN incorrecto');
    }
  },

  showLoginError(msg) {
    const el = document.getElementById('login-error');
    el.textContent = msg;
    el.style.display = 'block';
    document.getElementById('pin-input').classList.add('input-error');
    setTimeout(() => {
      document.getElementById('pin-input').classList.remove('input-error');
    }, 1500);
  },

  /* ---------- App Shell ---------- */
  enterApp() {
    const user = ArcanoDB.getCurrentUser();
    if (!user) { this.showLogin(); return; }

    // Listen for remote DB changes → re-render current page
    ArcanoDB.onDBChange((type, col, id) => {
      if (type === 'remote_change') {
        console.log('[Core] Remote change detected, re-rendering');
        this.renderPage(this.currentPage);
      }
    });

    this.renderShell(user);
    this.renderPage('dashboard');
  },

  renderShell(user) {
    const root = document.getElementById('app-root');
    root.innerHTML = `
      <div class="app-layout ${this.sidebarOpen ? '' : 'sidebar-closed'}">
        <aside class="sidebar" id="sidebar">
          <div class="sidebar-header">
            <div class="sidebar-logo">A</div>
            <div class="sidebar-brand">ARCANO</div>
          </div>
          <nav class="sidebar-nav" id="sidebar-nav">
            <a class="nav-item active" data-page="dashboard" onclick="App.navigate('dashboard')">
              <span class="nav-icon">📊</span><span class="nav-label">Dashboard</span>
            </a>
            <a class="nav-item" data-page="especias" onclick="App.navigate('especias')">
              <span class="nav-icon">🌶️</span><span class="nav-label">Especias</span>
            </a>
            <a class="nav-item" data-page="blends" onclick="App.navigate('blends')">
              <span class="nav-icon">🧪</span><span class="nav-label">Blends</span>
            </a>
            <a class="nav-item" data-page="etiquetas" onclick="App.navigate('etiquetas')">
              <span class="nav-icon">🏷️</span><span class="nav-label">Etiquetas</span>
            </a>
            <a class="nav-item" data-page="compras" onclick="App.navigate('compras')">
              <span class="nav-icon">📦</span><span class="nav-label">Compras</span>
            </a>
            <a class="nav-item" data-page="ventas" onclick="App.navigate('ventas')">
              <span class="nav-icon">💰</span><span class="nav-label">Ventas</span>
            </a>
            <a class="nav-item" data-page="stock" onclick="App.navigate('stock')">
              <span class="nav-icon">📋</span><span class="nav-label">Stock</span>
            </a>
            <a class="nav-item" data-page="usuarios" onclick="App.navigate('usuarios')">
              <span class="nav-icon">👥</span><span class="nav-label">Usuarios</span>
            </a>
          </nav>
          <div class="sidebar-footer">
            <div class="user-info">
              <span class="user-name">${user.nombre || 'Admin'}</span>
              <span class="user-role">${user.rol || 'admin'}</span>
            </div>
            <button class="btn btn-sm btn-outline" onclick="App.logout()">Salir</button>
          </div>
        </aside>
        <main class="main-content">
          <header class="top-bar">
            <button class="btn btn-ghost" onclick="App.toggleSidebar()">☰</button>
            <h2 class="page-title" id="page-title">Dashboard</h2>
            <div class="top-bar-actions">
              <span class="sync-indicator" id="sync-indicator" title="Conectado a Firebase">● Firebase</span>
            </div>
          </header>
          <div class="page-content" id="page-content">
            <div class="loader-center"><div class="loader"></div></div>
          </div>
        </main>
      </div>`;
  },

  /* ---------- Navigation ---------- */
  navigate(page) {
    this.currentPage = page;
    // Update active nav
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });
    // Update title
    const titles = {
      dashboard: 'Dashboard', especias: 'Especias', blends: 'Blends',
      etiquetas: 'Etiquetas', compras: 'Compras', ventas: 'Ventas', stock: 'Stock', usuarios: 'Usuarios'
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

  /* ---------- Page Rendering ---------- */
  renderPage(page) {
    const container = document.getElementById('page-content');
    if (!container) return;
    try {
      switch (page) {
        case 'dashboard': Pages.renderDashboard(container); break;
        case 'especias': Pages.renderEspecias(container); break;
        case 'blends': Pages.renderBlends(container); break;
        case 'etiquetas': Pages.renderEtiquetas(container); break;
        case 'compras': Pages.renderCompras(container); break;
        case 'ventas': Pages.renderVentas(container); break;
        case 'stock': Pages.renderStock(container); break;
        case 'usuarios': Pages.renderUsuarios(container); break;
        default: container.innerHTML = '<p>Página no encontrada</p>';
      }
    } catch (e) {
      console.error('[Core] Page render error:', e);
      container.innerHTML = `<div class="error-box"><h3>Error al cargar la página</h3><p>${e.message}</p><button class="btn btn-gold mt-12" onclick="App.renderPage('${page}')">Reintentar</button></div>`;
    }
  }
};

/* ---------- Boot ---------- */
document.addEventListener('DOMContentLoaded', () => App.init());