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
    const resp = await API.get('/empleado' + params);
    renderTable(resp);
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Error: ' + e.message + '</p></div></td></tr>';
  }
}

function renderTable(data) {
  const tbody = document.getElementById('tableEmpleadosBody');
  if (!tbody) return;
  const list = data.content || [];
  totalPages = data.totalPages || 0;
  totalElements = data.totalElements || 0;

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><i class="fas fa-user-tie"></i><p>No hay empleados</p></div></td></tr>';
    renderPagination();
    return;
  }

  tbody.innerHTML = list.map(item => {
    const fullName = [item.nombre, item.primerApellido, item.segundoApellido].filter(Boolean).join(' ');
    return '<tr>' +
      '<td>' + item.id + '</td>' +
      '<td>' + Utils.esc(fullName) + '</td>' +
      '<td>' + Utils.esc(item.position || '-') + '</td>' +
      '<td>' + Utils.formatCurrency(item.sueldoBase) + '</td>' +
      '<td><span class="badge-status ' + (item.activo ? 'badge-active' : 'badge-inactive') + '">' + (item.activo ? 'Activo' : 'Inactivo') + '</span></td>' +
      '<td><button class="btn btn-sm btn-outline-secondary btn-edit-emp" data-id="' + item.id + '"><i class="fas fa-edit"></i></button></td>' +
    '</tr>';
  }).join('');

  tbody.querySelectorAll('.btn-edit-emp').forEach(b => b.addEventListener('click', () => openEmpleadoModal(parseInt(b.dataset.id))));
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
  document.getElementById('empleadoActivo').checked = true;

  if (id) {
    document.getElementById('empleadoModalTitle').textContent = 'Editar Empleado';
    document.getElementById('btnGuardarEmpleado').textContent = 'Actualizar';
    API.get('/empleado/' + id).then(e => {
      document.getElementById('empleadoNombre').value = e.nombre || '';
      document.getElementById('empleadoApellido1').value = e.primerApellido || '';
      document.getElementById('empleadoApellido2').value = e.segundoApellido || '';
      document.getElementById('empleadoPuesto').value = e.position || 'VENDEDOR';
      document.getElementById('empleadoSueldoBase').value = e.sueldoBase != null ? e.sueldoBase : '';
      document.getElementById('empleadoActivo').checked = e.activo !== false;
      document.getElementById('empleadoId').value = id;
    }).catch(e => Utils.showToast('Error: ' + e.message, 'error'));
  } else {
    document.getElementById('empleadoModalTitle').textContent = 'Nuevo Empleado';
    document.getElementById('btnGuardarEmpleado').textContent = 'Guardar';
  }
  new bootstrap.Modal(document.getElementById('empleadoModal')).show();
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
  };
  if (sueldoBaseRaw !== '') data.sueldoBase = parseFloat(sueldoBaseRaw) || 0;
  if (id) data.activo = document.getElementById('empleadoActivo').checked;

  if (!data.nombre || !data.primerApellido) {
    Utils.showToast('Nombre y primer apellido son obligatorios', 'warning');
    return;
  }

  try {
    if (id) {
      await API.put('/empleado/' + id, data);
      Utils.showToast('Empleado actualizado', 'success');
    } else {
      await API.post('/empleado', data);
      Utils.showToast('Empleado creado', 'success');
    }
    bootstrap.Modal.getInstance(document.getElementById('empleadoModal'))?.hide();
    loadEmpleados();
  } catch (e) {
    Utils.showToast('Error: ' + e.message, 'error');
  }
}
