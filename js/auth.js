const Auth = {
  _loggingOut: false,
  init() {
    this.bindEvents();
    this.checkAuthStatus();
  },

  bindEvents() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.login();
      });
    }

    const toggleBtn = document.getElementById('toggle-password');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const pass = document.getElementById('password');
        const icon = document.getElementById('toggle-password-icon');
        if (pass.type === 'password') {
          pass.type = 'text';
          icon.className = 'fas fa-eye-slash';
        } else {
          pass.type = 'password';
          icon.className = 'fas fa-eye';
        }
      });
    }
  },

  async login() {
    const usuario = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const btn = document.getElementById('btn-login');
    const btnText = document.getElementById('btn-login-text');
    const btnLoader = document.getElementById('btn-login-loader');

    if (!usuario || !password) {
      Utils.showToast('Ingresa usuario y contraseña', 'warning');
      return;
    }

    btn.disabled = true;
    btnText.classList.add('d-none');
    btnLoader.classList.remove('d-none');

    try {
      const response = await API.post('/auth/login', { email: usuario, password });

      localStorage.setItem('access_token', response.access_token || response.accessToken || response.token);
      localStorage.setItem('refresh_token', response.refresh_token || response.refreshToken || '');
      localStorage.setItem('username', response.username || usuario);
      localStorage.setItem('userNombre', response.nombre || response.username || usuario);
      localStorage.setItem('userRol', response.rol || 'USER');
      this._loggingOut = false;
      API._sessionClosing = false;

      try {
        const user = await API.get('/auth/me');
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('username', user.username || usuario);
        localStorage.setItem('userNombre', [user.nombre, user.primerApellido].filter(Boolean).join(' ') || user.username || usuario);
        localStorage.setItem('userRol', user.rol || user.role || 'USER');
      } catch (_) {
        // The token is still valid even when profile hydration is unavailable.
      }

      Utils.showToast('Inicio de sesión exitoso', 'success');
      this.checkAuthStatus();
    } catch (err) {
      Utils.showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btnText.classList.remove('d-none');
      btnLoader.classList.add('d-none');
    }
  },

  logout() {
    if (this._loggingOut) return;
    this._loggingOut = true;
    const token = localStorage.getItem('access_token');
    if (token) {
      API.post('/auth/logout').catch(() => {});
    }
    localStorage.clear();
    Utils.showToast('Sesión cerrada', 'info');
    this.checkAuthStatus();
  },

  checkAuthStatus() {
    const token = localStorage.getItem('access_token');
    const loginView = document.getElementById('login-view');
    const dashboardView = document.getElementById('dashboard-view');

    if (!loginView || !dashboardView) {
      if (!token) {
        window.location.href = 'index.html';
      }
      return;
    }

    if (token && !API.tokenExpirado()) {
      loginView.classList.add('d-none');
      dashboardView.classList.remove('d-none');
      if (typeof Dashboard !== 'undefined') {
        Dashboard.init();
      }
    } else {
      if (token) {
        localStorage.clear();
      }
      loginView.classList.remove('d-none');
      dashboardView.classList.add('d-none');
    }
  },
};
