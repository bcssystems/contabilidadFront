let editingEmpleadoId = null;
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
  document.getElementById('empleadoModal')?.addEventListener('hidden.bs.modal', () => { editingEmpleadoId = null; });
}

async function loadEmpleados() {
  const tbody = document.getElementById('tableEmpleadosBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><i class="fas fa-user-tie"></i><p>Cargando...</p></div></td></tr>';
  try {
    const q = document.getElementById('searchEmpleado')?.value?.trim() || '';
    const p = document.getElementById('filterPuesto')?.value || '';
    let params = '?page=' + currentPage + '&size=' + PAGE_SIZE + '&sort=id,asc';
    if (q) params += '&search=' + encodeURIComponent(q);
    if (p) params += '&position=' + encodeURIComponent(p);
    const resp = await API.get('/usuarios');
    renderTable(resp);
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Error: ' + e.message + '</p></div></td></tr>';
  }
}

function renderTable(data) {
  const tbody = document.getElementById('tableEmpleadosBody');
  if (!tbody) return;
  const list = Array.isArray(data) ? data : (data.content || []);
  totalPages = 1;
  totalElements = list.length;

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><i class="fas fa-user-tie"></i><p>No hay empleados</p></div></td></tr>';
    renderPagination();
    return;
  }

  tbody.innerHTML = list.map(item => {
    const fullName = [item.nombre, item.primerApellido, item.segundoApellido].filter(Boolean).join(' ');
    return '<tr>' +
      '<td>' + (item.idUsuario ?? item.id) + '</td>' +
      '<td>' + Utils.esc(fullName) + '</td>' +
      '<td>' + Utils.esc(item.position || '-') + '</td>' +
      '<td>' + Utils.formatCurrency(item.sueldoBase) + '</td>' +
      '<td><span class="badge-status ' + (item.activo ? 'badge-active' : 'badge-inactive') + '">' + (item.activo ? 'Activo' : 'Inactivo') + '</span></td>' +
       '<td class="acciones-cell"><button type="button" class="btn-kebab-toggle kebab-trigger" data-id="' + (item.idUsuario ?? item.id) + '" title="Acciones"><i class="fas fa-ellipsis-v"></i></button></td>' +
    '</tr>';
  }).join('');

   tbody.querySelectorAll('.kebab-trigger').forEach(button => button.addEventListener('click', event => {
     event.stopPropagation();
     button.classList.add('show');
     Utils.abrirMenuKebab(button, [
       { icon: 'fa-edit', text: 'Editar usuario', onClick: () => openEmpleadoModal(parseInt(button.dataset.id)) },
       { icon: 'fa-user-slash', text: 'Desactivar usuario', danger: true, onClick: () => API.del('/usuarios/' + button.dataset.id).then(() => loadEmpleados()).catch(error => Utils.showToast(error.message, 'error')) },
     ]);
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
  document.getElementById('empleadoId').value = '';
  document.getElementById('empleadoNombre').value = '';
  document.getElementById('empleadoApellido1').value = '';
  document.getElementById('empleadoApellido2').value = '';
  document.getElementById('empleadoPuesto').value = 'VENDEDOR';
  document.getElementById('empleadoSueldoBase').value = '';
  document.getElementById('empleadoSueldoSemanal').value = '';
  document.getElementById('empleadoUsername').value = '';
  document.getElementById('empleadoPassword').value = '';
  document.getElementById('empleadoRole').value = 'USER';
  document.getElementById('empleadoActivo').checked = true;
  buildEmployeeSchedule();

  if (id) {
    document.getElementById('empleadoModalTitle').textContent = 'Editar Usuario';
    document.getElementById('btnGuardarEmpleado').textContent = 'Actualizar';
    API.get('/usuarios/' + id).then(e => {
      document.getElementById('empleadoNombre').value = e.nombre || '';
      document.getElementById('empleadoApellido1').value = e.primerApellido || '';
      document.getElementById('empleadoApellido2').value = e.segundoApellido || '';
      document.getElementById('empleadoPuesto').value = e.position || 'VENDEDOR';
      document.getElementById('empleadoSueldoBase').value = e.sueldoBase != null ? e.sueldoBase : '';
      document.getElementById('empleadoSueldoSemanal').value = e.sueldoSemanal != null ? e.sueldoSemanal : '';
      document.getElementById('empleadoActivo').checked = e.activo !== false;
      document.getElementById('empleadoId').value = id;
      document.getElementById('empleadoUsername').value = e.username || '';
      document.getElementById('empleadoRole').value = e.rol || 'USER';
      API.horarioEmpleado(id).then(schedule => buildEmployeeSchedule(schedule.horario || schedule)).catch(() => {});
    }).catch(e => Utils.showToast('Error: ' + e.message, 'error'));
  } else {
    document.getElementById('empleadoModalTitle').textContent = 'Nuevo Usuario';
    document.getElementById('btnGuardarEmpleado').textContent = 'Guardar';
  }
  new bootstrap.Modal(document.getElementById('empleadoModal')).show();
}

function buildEmployeeSchedule(schedule) {
  const target = document.getElementById('empleadoHorarioDias');
  if (!target) return;
  const configured = new Map((schedule?.dias || []).map(day => [day.dia, day]));
  target.innerHTML = scheduleDays.map(day => {
    const item = configured.get(day);
    return '<div class="employee-schedule-day border rounded p-2 mb-2" data-day="' + day + '"><div class="row g-2 align-items-end"><div class="col-md-2"><label class="small"><input type="checkbox" class="form-check-input me-1 schedule-active" ' + (item ? 'checked' : '') + '>' + day + '</label></div><div class="col-md-3"><label class="small">Entrada</label><input type="time" class="form-control form-control-sm schedule-entry" value="' + (item?.entrada || '') + '"></div><div class="col-md-3"><label class="small">Salida</label><input type="time" class="form-control form-control-sm schedule-exit" value="' + (item?.salida || '') + '"></div><div class="col-md-4"><label class="small">Break opcional</label><div class="input-group input-group-sm"><input type="time" class="form-control schedule-break-start" value="' + (item?.breaks?.[0]?.inicio || '') + '"><span class="input-group-text">a</span><input type="time" class="form-control schedule-break-end" value="' + (item?.breaks?.[0]?.fin || '') + '"></div></div></div></div>';
  }).join('');
}

function readEmployeeSchedule() {
  return [...document.querySelectorAll('.employee-schedule-day')].filter(row => row.querySelector('.schedule-active').checked).map(row => ({
    dia: row.dataset.day,
    entrada: row.querySelector('.schedule-entry').value,
    salida: row.querySelector('.schedule-exit').value,
    breaks: row.querySelector('.schedule-break-start').value && row.querySelector('.schedule-break-end').value ? [{ inicio: row.querySelector('.schedule-break-start').value, fin: row.querySelector('.schedule-break-end').value }] : [],
  }));
}

async function saveEmpleado() {
  const id = document.getElementById('empleadoId').value;
  const sueldoBaseRaw = document.getElementById('empleadoSueldoBase').value;
  const data = {
    nombre: document.getElementById('empleadoNombre').value.trim(),
    primerApellido: document.getElementById('empleadoApellido1').value.trim(),
    segundoApellido: document.getElementById('empleadoApellido2').value.trim() || null,
    position: document.getElementById('empleadoPuesto').value,
    personType: 'EMPLEADO',
    username: document.getElementById('empleadoUsername').value.trim(),
    password: document.getElementById('empleadoPassword').value,
    role: document.getElementById('empleadoRole').value,
  };
  if (sueldoBaseRaw !== '') data.sueldoBase = parseFloat(sueldoBaseRaw) || 0;
  const sueldoSemanalRaw = document.getElementById('empleadoSueldoSemanal').value;
  if (sueldoSemanalRaw !== '') data.sueldoSemanal = parseFloat(sueldoSemanalRaw) || 0;
  if (id) data.activo = document.getElementById('empleadoActivo').checked;

  if (!data.nombre || !data.primerApellido) {
    Utils.showToast('Nombre y primer apellido son obligatorios', 'warning');
    return;
  }

  try {
    if (id) {
      await API.put('/usuarios/' + id, { ...data, username: undefined, password: undefined });
      Utils.showToast('Empleado actualizado', 'success');
    } else {
      const dias = readEmployeeSchedule();
      if (!dias.length || dias.some(day => !day.entrada || !day.salida || day.entrada >= day.salida)) {
        Utils.showToast('Configura al menos un día con entrada y salida válidas.', 'warning');
        return;
      }
      if (!data.username || !data.password) {
        Utils.showToast('Usuario y contraseña son obligatorios.', 'warning');
        return;
      }
      const usuario = await API.post('/usuarios', data);
      const horario = await API.post('/horarios', {
        nombre: document.getElementById('empleadoHorarioNombre').value.trim() || 'Horario semanal',
        dias,
      });
      await API.post('/usuarios/' + encodeURIComponent(usuario.id) + '/horario', { horarioId: horario.id });
      Utils.showToast('Usuario creado', 'success');
    }
    bootstrap.Modal.getInstance(document.getElementById('empleadoModal'))?.hide();
    loadEmpleados();
  } catch (e) {
    Utils.showToast('Error: ' + e.message, 'error');
  }
}
