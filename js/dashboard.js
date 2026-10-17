let _sidebarDelegationReady = false;

const ENABLED_MODULES = new Set([
  'inicio',
  'usuarios',
  'nomina',
  'asistencia',
  'puntos-geograficos',
  'revision-asistencia',
  'prestamos',
  'configuracion',
]);

const ADMIN_ONLY_MODULES = new Set([
  'usuarios',
  'nomina',
  'puntos-geograficos',
  'revision-asistencia',
  'prestamos',
  'configuracion',
]);

function configureSidebarModules() {
  const role = (localStorage.getItem('userRol') || '').toUpperCase();
  const isAdmin = role === 'ADMIN';
  document.querySelectorAll('[data-module]').forEach((link) => {
    const module = link.dataset.module;
    const enabled = ENABLED_MODULES.has(module) && (!ADMIN_ONLY_MODULES.has(module) || isAdmin);
    link.classList.toggle('sidebar-item-disabled', !enabled);
    link.setAttribute('aria-disabled', String(!enabled));
    link.dataset.development = enabled ? 'false' : 'true';
    const item = link.closest('li');
    if (item) item.style.display = enabled ? '' : 'none';
  });

  document.querySelectorAll('.sidebar-sub-toggle').forEach((toggle) => {
    const submenu = document.getElementById(toggle.dataset.target);
    const modules = submenu ? [...submenu.querySelectorAll('[data-module]')] : [];
    const disabled = modules.length > 0 && modules.every(link => link.dataset.development === 'true');
    toggle.classList.toggle('sidebar-item-disabled', disabled);
    toggle.setAttribute('aria-disabled', String(disabled));
    toggle.setAttribute('aria-expanded', 'false');
    toggle.dataset.development = disabled ? 'true' : 'false';
    const item = toggle.closest('li');
    if (item) item.style.display = disabled ? 'none' : '';
  });
}

function closeOtherSubmenus(currentSubmenu) {
  document.querySelectorAll('.sidebar-submenu.open').forEach((submenu) => {
    if (submenu !== currentSubmenu) {
      submenu.classList.remove('open');
      const toggle = document.querySelector('[data-target="' + submenu.id + '"]');
      if (toggle) {
        toggle.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    }
  });
}

function initSidebarDelegation() {
  if (_sidebarDelegationReady) return;
  _sidebarDelegationReady = true;

  configureSidebarModules();

  document.addEventListener('click', (e) => {
    const toggle = e.target.closest('.sidebar-sub-toggle');
    if (toggle) {
      e.preventDefault();
      if (toggle.dataset.development === 'true' || toggle.getAttribute('aria-disabled') === 'true') {
        Utils.showToast('Este módulo se encuentra en desarrollo.', 'info');
        return;
      }
      const targetId = toggle.dataset.target;
      const submenu = document.getElementById(targetId);
      if (submenu) {
        const opening = !submenu.classList.contains('open');
        if (opening) closeOtherSubmenus(submenu);
        submenu.classList.toggle('open');
        toggle.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(opening));
      }
      return;
    }

    const link = e.target.closest('[data-view]');
    if (link) {
      e.preventDefault();

      if (link.dataset.development === 'true' || link.getAttribute('aria-disabled') === 'true') {
        Utils.showToast('Este módulo se encuentra en desarrollo.', 'info');
        return;
      }

      const ruta = link.getAttribute('data-view');
      const modulo = link.getAttribute('data-module');

      if (!ruta && !modulo) return;

      Utils.cargarVista(ruta, modulo);

      document.querySelectorAll('.sidebar-item').forEach((l) => l.classList.remove('active'));
      link.classList.add('active');

      const sidebar = document.getElementById('sidebar');
      const overlay = document.getElementById('sidebarOverlay');
      if (window.innerWidth < 992 && sidebar) {
        sidebar.classList.remove('sidebar-open');
        if (overlay) overlay.classList.remove('active');
      }
    }
  });
}

const Dashboard = {
  showSpecialUserMessage(username) {
    const allowedUsers = new Set(['bucordero', 'ngfonseca']);
    const normalizedUsername = String(username || '').trim().toLowerCase();
    if (!allowedUsers.has(normalizedUsername)) return;

    const modal = document.getElementById('specialUserMessageModal');
    if (!modal || typeof bootstrap === 'undefined') return;

    const questionView = document.getElementById('specialQuestionView');
    const finalView = document.getElementById('specialFinalView');
    const question = document.getElementById('specialQuizQuestion');
    const options = document.getElementById('specialQuizOptions');
    const progress = document.getElementById('specialQuizProgress');
    const nextButton = document.getElementById('specialQuizNext');
    const title = document.getElementById('specialUserMessageTitle');
    if (!questionView || !finalView || !question || !options || !progress || !nextButton || !title) return;

    const quiz = [
      {
        text: 'Si pudiéramos viajar mañana, ¿qué plan escogerías hacer conmigo?',
        answers: ['Escaparnos a la playa', 'Conocer un pueblito nuevo', 'Recorrer una ciudad de noche'],
      },
      {
        text: '¿Qué crees que haría inolvidable una salida juntos?',
        answers: ['Reírnos sin parar', 'Tener una plática profunda', 'Vivir una aventura inesperada'],
      },
      {
        text: '¿Qué opción describe mejor esa parte especial de tu personalidad?',
        answers: ['Tu forma de hacer reír a los demás', 'Tu manera de cuidar a quienes quieres', 'Tu lado espontáneo y aventurero'],
      },
    ];
    let currentQuestion = 0;
    const answers = [];

    const renderQuestion = () => {
      const current = quiz[currentQuestion];
      question.textContent = current.text;
      progress.textContent = 'Pregunta ' + (currentQuestion + 1) + ' de ' + quiz.length;
      options.innerHTML = current.answers.map((answer, index) =>
        '<label class="d-block border rounded p-2 mb-2" style="cursor:pointer">' +
          '<input type="radio" name="specialQuizAnswer" value="' + index + '" class="me-2">' + answer +
        '</label>'
      ).join('');
      nextButton.textContent = currentQuestion === quiz.length - 1 ? 'Terminar quiz' : 'Siguiente';
    };

    if (!modal.dataset.specialMessageBound) {
      modal.dataset.specialMessageBound = 'true';
      nextButton.addEventListener('click', async () => {
        const selected = options.querySelector('input[name="specialQuizAnswer"]:checked');
        if (!selected) return;
        answers.push(quiz[currentQuestion].answers[Number(selected.value)]);
        if (currentQuestion < quiz.length - 1) {
          currentQuestion += 1;
          renderQuestion();
          return;
        }
        nextButton.disabled = true;
        try {
          await API.post('/quiz/respuestas', {
            respuestas: answers.map((answer, index) => ({
              pregunta: quiz[index].text,
              respuesta: answer,
            })),
          });
        } catch (error) {
          answers.pop();
          nextButton.disabled = false;
          if (typeof Utils !== 'undefined') Utils.showToast('No se pudieron guardar tus respuestas en el servidor: ' + error.message, 'error');
          return;
        }
        nextButton.disabled = false;
        questionView.classList.add('d-none');
        finalView.classList.remove('d-none');
        title.textContent = 'Mensaje para ti';
      });
      modal.addEventListener('hidden.bs.modal', () => {
        currentQuestion = 0;
        answers.length = 0;
        questionView.classList.remove('d-none');
        finalView.classList.add('d-none');
        title.textContent = 'Quiz especial';
        renderQuestion();
      });
    }

    currentQuestion = 0;
    answers.length = 0;
    questionView.classList.remove('d-none');
    finalView.classList.add('d-none');
    title.textContent = 'Quiz especial';
    renderQuestion();
    bootstrap.Modal.getOrCreateInstance(modal).show();
  },

  init() {
    configureSidebarModules();
    initSidebarDelegation();
    const username = localStorage.getItem('userNombre') || localStorage.getItem('username') || 'Usuario';
    const displayName = document.getElementById('display-name');
    if (displayName) displayName.textContent = username;

    const avatar = document.getElementById('topbar-avatar');
    if (avatar) avatar.textContent = (localStorage.getItem('username') || 'U').charAt(0).toUpperCase();

    this.bindEvents();
  },

  bindEvents() {
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.onclick = () => Auth.logout();
    }

    const reloadBtn = document.getElementById('btn-reload');
    if (reloadBtn) {
      reloadBtn.onclick = () => Utils.recargarModulo();
    }

    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (sidebarToggle && sidebar) {
      sidebarToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.toggle('sidebar-open');
        if (overlay) overlay.classList.toggle('active');
      });

      if (overlay) {
        overlay.addEventListener('click', () => {
          sidebar.classList.remove('sidebar-open');
          overlay.classList.remove('active');
        });
      }

      document.addEventListener('click', (e) => {
        if (window.innerWidth < 992 &&
            sidebar.classList.contains('sidebar-open') &&
            !sidebar.contains(e.target) &&
            !sidebarToggle.contains(e.target)) {
          sidebar.classList.remove('sidebar-open');
          if (overlay) overlay.classList.remove('active');
        }
      });
    }
  },
};
