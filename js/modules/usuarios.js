let editingEmpleadoId = null;
let currentHorarioId = null;
let currentPage = 0;
let totalPages = 0;
let totalElements = 0;
const PAGE_SIZE = 20;

export function init() {
  currentPage = 0;
  loadEmpleados();
  bindEvents();
}

const scheduleDays = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];

function bindEvents() {
  document.getElementById('btnNuevoEmpleado')?.addEventListener('click', () => openEmpleadoModal(null));
  document.getElementById('btnGuardarEmpleado')?.addEventListener('click', saveEmpleado);
  document.getElementById('searchEmpleado')?.addEventListener('input', Utils.debounce(function() { currentPage = 0; loadEmpleados(); }, 300));
  document.getElementById('filterPuesto')?.addEventListener('change', function() { currentPage = 0; loadEmpleados(); });
  document.getElementById('empleadoTipoPersona')?.addEventListener('change', updateEmploymentFields);
  document.getElementById('empleadoSueldoSemanal')?.addEventListener('input', calculateHourlyRate);
  document.getElementById('empleadoHorarioDias')?.addEventListener('input', calculateHourlyRate);
  document.getElementById('empleadoModal')?.addEventListener('hidden.bs.modal', () => { editingEmpleadoId = null; });
}

async function loadEmpleados() {
  const tbody = document.getElementById('tableEmpleadosBody');
  if (!tbody) return;
   tbody.innerHTML = '<tr><td colspan="10"><div class="empty-state"><i class="fas fa-user-tie"></i><p>Cargando...</p></div></td></tr>';
  try {
    const resp = await API.get('/usuarios');
    const all = Array.isArray(resp) ? resp : (resp.content || []);
    const q = (document.getElementById('searchEmpleado')?.value || '').trim().toLowerCase();
    const p = document.getElementById('filterPuesto')?.value || '';
    const filtered = all.filter(item => {
      const name = [item.nombre, item.primerApellido, item.segundoApellido, item.username].filter(Boolean).join(' ').toLowerCase();
      return (!q || name.includes(q)) && (!p || item.position === p);
    });
    totalElements = filtered.length;
    totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    currentPage = Math.min(currentPage, totalPages - 1);
    renderTable(filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE));
  } catch (e) {
     tbody.innerHTML = '<tr><td colspan="10"><div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Error: ' + e.message + '</p></div></td></tr>';
  }
}

function renderTable(data) {
  const tbody = document.getElementById('tableEmpleadosBody');
  if (!tbody) return;
  const list = Array.isArray(data) ? data : (data.content || []);
  if (!list.length) {
     tbody.innerHTML = '<tr><td colspan="10"><div class="empty-state"><i class="fas fa-user-tie"></i><p>No hay usuarios</p></div></td></tr>';
    renderPagination();
    return;
  }

  tbody.innerHTML = list.map(item => {
    const fullName = [item.nombre, item.primerApellido, item.segundoApellido].filter(Boolean).join(' ');
    return '<tr>' +
      '<td>' + (item.idUsuario ?? item.id) + '</td>' +
      '<td>' + Utils.esc(item.username || '-') + '</td>' +
      '<td>' + Utils.esc(fullName) + '</td>' +
      '<td>' + Utils.esc(item.rol || '-') + '</td>' +
      '<td>' + Utils.esc(item.position || item.puesto || item.cargo || '-') + '</td>' +
      '<td>' + Utils.formatCurrency(item.sueldoSemanal) + '</td>' +
      '<td>' + Utils.formatCurrency(item.sueldoHora) + '</td>' +
      '<td><span class="badge-status ' + (item.activo ? 'badge-active' : 'badge-inactive') + '">' + (item.activo ? 'Activo' : 'Inactivo') + '</span></td>' +
      '<td>' + (item.fechaRegistro ? Utils.formatDate(item.fechaRegistro) : '-') + '</td>' +
       '<td class="acciones-cell"><button type="button" class="btn-kebab-toggle kebab-trigger" data-id="' + (item.idUsuario ?? item.id) + '" title="Acciones"><i class="fas fa-ellipsis-v"></i></button></td>' +
    '</tr>';
  }).join('');

   tbody.querySelectorAll('.kebab-trigger').forEach(button => button.addEventListener('click', event => {
     event.stopPropagation();
     button.classList.add('show');
      const item = list.find(row => String(row.idUsuario ?? row.id) === button.dataset.id);
       const actions = [{ icon: 'fa-eye', text: 'Ver usuario', onClick: () => viewEmpleado(button.dataset.id) }, { icon: 'fa-edit', text: 'Editar usuario', onClick: () => openEmpleadoModal(parseInt(button.dataset.id)) }];
      if (item?.activo) {
        actions.push({ icon: 'fa-user-slash', text: 'Desactivar usuario', danger: true, onClick: () => toggleUsuario(button.dataset.id, false) });
      } else {
        actions.push({ icon: 'fa-user-check', text: 'Activar usuario', onClick: () => toggleUsuario(button.dataset.id, true) });
      }
      Utils.abrirMenuKebab(button, actions);
   }));
  renderPagination();
}

function renderPagination() {
  const container = document.getElementById('paginationEmpleados');
  if (!container) return;
  if (totalPages <= 1) { container.innerHTML = ''; return; }
  container.innerHTML =
    '<div class="d-flex justify-content-between align-items-center"><small class="text-muted">P&aacute;gina ' + (currentPage + 1) + ' de ' + totalPages + ' (' + totalElements + ' registros)</small>' +
    '<div class="btn-group">' +
      '<button class="btn btn-sm btn-outline-secondary" id="prevPageEmp" ' + (currentPage === 0 ? 'disabled' : '') + '><i class="fas fa-chevron-left"></i></button>' +
      '<button class="btn btn-sm btn-outline-secondary" id="nextPageEmp" ' + (currentPage >= totalPages - 1 ? 'disabled' : '') + '><i class="fas fa-chevron-right"></i></button>' +
    '</div></div>';
  document.getElementById('prevPageEmp')?.addEventListener('click', () => { if (currentPage > 0) { currentPage--; loadEmpleados(); } });
  document.getElementById('nextPageEmp')?.addEventListener('click', () => { if (currentPage < totalPages - 1) { currentPage++; loadEmpleados(); } });
}

function openEmpleadoModal(id) {
  editingEmpleadoId = id;
  currentHorarioId = null;
  document.getElementById('empleadoId').value = '';
  document.getElementById('empleadoNombre').value = '';
  document.getElementById('empleadoApellido1').value = '';
  document.getElementById('empleadoApellido2').value = '';
  document.getElementById('empleadoPuesto').value = 'VENDEDOR';
  document.getElementById('empleadoTipoPersona').value = 'EMPLEADO';
  document.getElementById('empleadoSueldoSemanal').value = '';
  document.getElementById('empleadoUsername').value = 'Se generará automáticamente';
  document.getElementById('empleadoPassword').value = '';
  document.getElementById('empleadoRole').value = 'USER';
  document.getElementById('empleadoActivo').checked = true;
  buildEmployeeSchedule();
  updateEmploymentFields();

  if (id) {
    document.getElementById('empleadoModalTitle').textContent = 'Editar Usuario';
    document.getElementById('btnGuardarEmpleado').textContent = 'Actualizar';
    API.get('/usuarios/' + id).then(e => {
      document.getElementById('empleadoNombre').value = e.nombre || '';
      document.getElementById('empleadoApellido1').value = e.primerApellido || '';
      document.getElementById('empleadoApellido2').value = e.segundoApellido || '';
      document.getElementById('empleadoPuesto').value = e.position || e.puesto || e.cargo || 'VENDEDOR';
      document.getElementById('empleadoTipoPersona').value = e.tipoPersona || 'EMPLEADO';
      document.getElementById('empleadoSueldoSemanal').value = e.sueldoSemanal ?? e.sueldoBase ?? '';
      document.getElementById('empleadoActivo').checked = e.activo !== false;
      document.getElementById('empleadoId').value = id;
      document.getElementById('empleadoUsername').value = e.username || '';
      document.getElementById('empleadoRole').value = e.rol || 'USER';
      updateEmploymentFields();
      API.horarioEmpleado(id).then(schedule => {
        const assignment = schedule?.data || schedule;
        const horario = assignment?.horario || assignment?.data?.horario || assignment;
        currentHorarioId = horario?.id || assignment?.idHorario || assignment?.horarioId || null;
        document.getElementById('empleadoHorarioNombre').value = horario?.nombre || 'Horario semanal';
        buildEmployeeSchedule(horario);
      }).catch(error => {
        buildEmployeeSchedule();
        Utils.showToast('No se pudo cargar el horario: ' + error.message, 'warning');
      });
    }).catch(e => Utils.showToast('Error: ' + e.message, 'error'));
  } else {
    document.getElementById('empleadoModalTitle').textContent = 'Nuevo Usuario';
    document.getElementById('btnGuardarEmpleado').textContent = 'Guardar';
  }
  new bootstrap.Modal(document.getElementById('empleadoModal')).show();
}

function updateEmploymentFields() {
  const employee = document.getElementById('empleadoTipoPersona')?.value === 'EMPLEADO';
  const section = document.getElementById('datosLaboralesSection');
  if (section) section.classList.remove('d-none');
  document.getElementById('empleadoPuesto')?.toggleAttribute('required', employee);
  document.getElementById('empleadoSueldoSemanal')?.toggleAttribute('required', employee);
}

function buildEmployeeSchedule(schedule) {
  const target = document.getElementById('empleadoHorarioDias');
  if (!target) return;
  const configured = new Map((schedule?.dias || []).map(day => [day.dia, day]));
  target.innerHTML = scheduleDays.map(day => {
    const item = configured.get(day);
    return '<div class="employee-schedule-day border rounded p-2 mb-2" data-day="' + day + '"><div class="row g-2 align-items-end"><div class="col-md-2"><label class="small fw-semibold">' + day + '</label></div><div class="col-md-3"><label class="small">Entrada</label><input type="time" class="form-control form-control-sm schedule-entry" value="' + (item?.entrada || '') + '"></div><div class="col-md-3"><label class="small">Salida</label><input type="time" class="form-control form-control-sm schedule-exit" value="' + (item?.salida || '') + '"></div><div class="col-md-4"><label class="small">Break opcional</label><div class="input-group input-group-sm"><input type="time" class="form-control schedule-break-start" value="' + (item?.breaks?.[0]?.inicio || '') + '"><span class="input-group-text">a</span><input type="time" class="form-control schedule-break-end" value="' + (item?.breaks?.[0]?.fin || '') + '"></div></div></div></div>';
   }).join('');
   calculateHourlyRate();
}

function readEmployeeSchedule(required = true) {
  const rows = [...document.querySelectorAll('.employee-schedule-day')].filter(row =>
    row.querySelector('.schedule-entry').value || row.querySelector('.schedule-exit').value ||
    row.querySelector('.schedule-break-start').value || row.querySelector('.schedule-break-end').value);
  if (!rows.length && required) throw new Error('Configura al menos un día de trabajo.');
  return rows.map(row => ({
    dia: row.dataset.day,
    entrada: row.querySelector('.schedule-entry').value,
    salida: row.querySelector('.schedule-exit').value,
    breaks: row.querySelector('.schedule-break-start').value && row.querySelector('.schedule-break-end').value ? [{ inicio: row.querySelector('.schedule-break-start').value, fin: row.querySelector('.schedule-break-end').value }] : [],
  }));
}

function calculateHourlyRate() {
  const salary = Number(document.getElementById('empleadoSueldoSemanal')?.value) || 0;
  const hours = [...document.querySelectorAll('.employee-schedule-day')].reduce((total, row) => {
    const entry = row.querySelector('.schedule-entry')?.value;
    const exit = row.querySelector('.schedule-exit')?.value;
    if (!entry || !exit) return total;
    const toMinutes = value => { const [h, m] = value.split(':').map(Number); return h * 60 + m; };
    let minutes = toMinutes(exit) - toMinutes(entry);
    const breakStart = row.querySelector('.schedule-break-start')?.value;
    const breakEnd = row.querySelector('.schedule-break-end')?.value;
    if (breakStart && breakEnd) minutes -= Math.max(0, toMinutes(breakEnd) - toMinutes(breakStart));
    return total + Math.max(0, minutes);
  }, 0);
  const target = document.getElementById('empleadoPrecioHora');
  if (target) target.value = hours ? (salary / (hours / 60)).toFixed(2) : '0.00';
}

async function viewEmpleado(id) {
  try {
    const employee = await API.get('/usuarios/' + encodeURIComponent(id));
    let schedule = null;
    try { schedule = await API.horarioEmpleado(id); } catch (_) {}
    const horario = schedule?.horario || schedule;
    const days = (horario?.dias || []).map(day => '<li>' + Utils.esc(day.dia) + ': ' + Utils.esc(day.entrada || '-') + ' - ' + Utils.esc(day.salida || '-') + '</li>').join('');
    const name = [employee.nombre, employee.primerApellido, employee.segundoApellido].filter(Boolean).join(' ');
     Utils.showDialog('Usuario #' + id, '<div class="row g-3"><div class="col-md-6"><small class="text-muted">Nombre</small><strong class="d-block">' + Utils.esc(name) + '</strong></div><div class="col-md-6"><small class="text-muted">Username</small><strong class="d-block">' + Utils.esc(employee.username || '-') + '</strong></div><div class="col-md-6"><small class="text-muted">Puesto</small><strong class="d-block">' + Utils.esc(employee.position || '-') + '</strong></div><div class="col-md-6"><small class="text-muted">Sueldo semanal</small><strong class="d-block">' + Utils.formatCurrency(employee.sueldoSemanal) + '</strong></div><div class="col-md-6"><small class="text-muted">Sueldo por hora</small><strong class="d-block">' + Utils.formatCurrency(employee.sueldoHora) + '</strong></div><div class="col-12"><small class="text-muted">Horario</small><ul class="mb-0">' + (days || '<li>Sin horario asignado</li>') + '</ul></div></div>');
  } catch (e) { Utils.showToast('Error al consultar usuario: ' + e.message, 'error'); }
}

async function saveEmpleado() {
  const id = document.getElementById('empleadoId').value;
  const data = {
    nombre: document.getElementById('empleadoNombre').value.trim(),
    primerApellido: document.getElementById('empleadoApellido1').value.trim(),
    segundoApellido: document.getElementById('empleadoApellido2').value.trim() || null,
    position: document.getElementById('empleadoPuesto').value,
    personType: document.getElementById('empleadoTipoPersona').value,
    password: document.getElementById('empleadoPassword').value,
    role: document.getElementById('empleadoRole').value,
  };
  const employee = data.personType === 'EMPLEADO';
  const sueldoSemanalRaw = document.getElementById('empleadoSueldoSemanal').value;
  if (sueldoSemanalRaw !== '') data.sueldoSemanal = parseFloat(sueldoSemanalRaw) || 0;
  if (!employee) data.position = null;
    if (id) data.activo = document.getElementById('empleadoActivo').checked;
    const nuevaPassword = data.password.trim();
    if (id) {
      if (nuevaPassword) data.password = nuevaPassword;
      else delete data.password;
    }

  if (!data.nombre || !data.primerApellido) {
    Utils.showToast('Nombre y primer apellido son obligatorios', 'warning');
    return;
  }

  try {
    const dias = readEmployeeSchedule(employee);
    if (employee && dias.some(day => !day.entrada || !day.salida || day.entrada >= day.salida || day.breaks.some(item => item.inicio >= item.fin))) {
      Utils.showToast('Configura entradas, salidas y breaks válidos.', 'warning');
      return;
    }
    if (id) {
      await API.put('/usuarios/' + id, { ...data, username: undefined });
      const scheduleData = { nombre: document.getElementById('empleadoHorarioNombre').value.trim() || 'Horario semanal', dias };
      if (dias.length && currentHorarioId) await API.put('/horarios/' + currentHorarioId, scheduleData);
      else if (dias.length) {
        const horario = await API.post('/horarios', scheduleData);
        await API.guardarHorarioEmpleado(id, { horarioId: horario.id });
      }
      Utils.showToast('Empleado actualizado', 'success');
    } else {
      if (!data.password) {
         Utils.showToast('La contraseña es obligatoria.', 'warning');
        return;
      }
      const usuario = await API.post('/usuarios', data);
      const horario = employee ? await API.post('/horarios', {
        nombre: document.getElementById('empleadoHorarioNombre').value.trim() || 'Horario semanal',
        dias,
      }) : null;
      const usuarioId = usuario.id ?? usuario.idUser ?? usuario.idUsuario;
      if (horario) await API.post('/usuarios/' + encodeURIComponent(usuarioId) + '/horario', { horarioId: horario.id });
      Utils.showToast('Usuario creado', 'success');
    }
    bootstrap.Modal.getInstance(document.getElementById('empleadoModal'))?.hide();
    loadEmpleados();
  } catch (e) {
    Utils.showToast('Error: ' + e.message, 'error');
  }
}

async function toggleUsuario(id, active) {
  try {
    if (!active && !(await Utils.confirmAction('&iquest;Desactivar este usuario?', 'Confirmar', 'Desactivar'))) return;
    await API.put('/usuarios/' + encodeURIComponent(id), { activo: active });
    Utils.showToast(active ? 'Usuario activado' : 'Usuario desactivado', 'success');
    loadEmpleados();
  } catch (e) {
    Utils.showToast('Error: ' + e.message, 'error');
  }
}
