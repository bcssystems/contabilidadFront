let editingNominaId = null;
let currentPage = 0;
let totalPages = 0;
let totalElements = 0;
const PAGE_SIZE = 20;

export function init() {
  currentPage = 0;
  loadNominas();
  bindEvents();
}

function bindEvents() {
  document.getElementById('btnNuevaNomina')?.addEventListener('click', () => openNominaModal(null));
  document.getElementById('btnGuardarNomina')?.addEventListener('click', saveNomina);
  document.getElementById('searchNomina')?.addEventListener('input', Utils.debounce(function() { currentPage = 0; loadNominas(); }, 300));
  document.getElementById('nominaModal')?.addEventListener('hidden.bs.modal', () => { editingNominaId = null; });
}

async function loadNominas() {
  const tbody = document.getElementById('tableNominasBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><i class="fas fa-file-invoice-dollar"></i><p>Cargando...</p></div></td></tr>';
  try {
    const q = document.getElementById('searchNomina')?.value?.trim() || '';
    let params = '?page=' + currentPage + '&size=' + PAGE_SIZE + '&sort=id,desc';
    if (q) params += '&search=' + encodeURIComponent(q);
    const resp = await API.get('/nomina' + params);
    renderTable(resp);
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Error: ' + e.message + '</p></div></td></tr>';
  }
}

function renderTable(data) {
  const tbody = document.getElementById('tableNominasBody');
  if (!tbody) return;
  const list = data.content || [];
  totalPages = data.totalPages || 0;
  totalElements = data.totalElements || 0;

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><i class="fas fa-file-invoice-dollar"></i><p>No hay n&oacute;minas</p></div></td></tr>';
    renderPagination();
    return;
  }

  tbody.innerHTML = list.map(item =>
    '<tr>' +
      '<td>' + item.id + '</td>' +
      '<td>' + Utils.formatDate(item.fecha_nomina) + '</td>' +
      '<td>' + Utils.formatCurrency(item.sueldo) + '</td>' +
      '<td>' + (item.empleadoId || '-') + '</td>' +
      '<td>' + (item.asientoId ? item.asientoId : '<span class="text-muted">Auto</span>') + '</td>' +
      '<td>' +
        '<button class="btn btn-sm btn-outline-secondary me-1 btn-edit-nom" data-id="' + item.id + '"><i class="fas fa-edit"></i></button>' +
        '<button class="btn btn-sm btn-outline-danger btn-delete-nom" data-id="' + item.id + '"><i class="fas fa-trash"></i></button>' +
      '</td>' +
    '</tr>'
  ).join('');

  tbody.querySelectorAll('.btn-edit-nom').forEach(b => b.addEventListener('click', () => openNominaModal(parseInt(b.dataset.id))));
  tbody.querySelectorAll('.btn-delete-nom').forEach(b => b.addEventListener('click', () => deleteNomina(parseInt(b.dataset.id))));
  renderPagination();
}

function renderPagination() {
  const container = document.getElementById('paginationNominas');
  if (!container) return;
  if (totalPages <= 1) { container.innerHTML = ''; return; }
  container.innerHTML =
    '<div class="d-flex justify-content-between align-items-center"><small class="text-muted">P&aacute;gina ' + (currentPage + 1) + ' de ' + totalPages + ' (' + totalElements + ' registros)</small>' +
    '<div class="btn-group">' +
      '<button class="btn btn-sm btn-outline-secondary" id="prevPageNom" ' + (currentPage === 0 ? 'disabled' : '') + '><i class="fas fa-chevron-left"></i></button>' +
      '<button class="btn btn-sm btn-outline-secondary" id="nextPageNom" ' + (currentPage >= totalPages - 1 ? 'disabled' : '') + '><i class="fas fa-chevron-right"></i></button>' +
    '</div></div>';
  document.getElementById('prevPageNom')?.addEventListener('click', () => { if (currentPage > 0) { currentPage--; loadNominas(); } });
  document.getElementById('nextPageNom')?.addEventListener('click', () => { if (currentPage < totalPages - 1) { currentPage++; loadNominas(); } });
}

async function loadEmpleadosSelect(selectedId) {
  const select = document.getElementById('nominaEmpleado');
  select.innerHTML = '<option value="">Cargando...</option>';
  try {
    const resp = await API.get('/empleado?page=0&size=500&sort=id,asc');
    const list = resp.content || [];
    select.innerHTML = '<option value="" disabled ' + (!selectedId ? 'selected' : '') + '>Selecciona un empleado</option>';
    list.forEach(e => {
      const name = [e.nombre, e.primerApellido, e.segundoApellido].filter(Boolean).join(' ');
      const opt = document.createElement('option');
      opt.value = e.id;
      opt.textContent = name + ' (#' + e.id + ')';
      if (selectedId && e.id === selectedId) opt.selected = true;
      select.appendChild(opt);
    });
  } catch (_) {
    select.innerHTML = '<option value="">Error al cargar</option>';
  }
}

function openNominaModal(id) {
  editingNominaId = id;
  document.getElementById('nominaId').value = '';
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('nominaFecha').value = today;
  document.getElementById('nominaSueldo').value = '';

  if (id) {
    document.getElementById('nominaModalTitle').textContent = 'Editar N&oacute;mina';
    document.getElementById('btnGuardarNomina').textContent = 'Actualizar';
    API.get('/nomina/' + id).then(n => {
      document.getElementById('nominaFecha').value = n.fecha_nomina || today;
      document.getElementById('nominaSueldo').value = n.sueldo || '';
      document.getElementById('nominaId').value = id;
      loadEmpleadosSelect(n.empleadoId || null);
    }).catch(e => Utils.showToast('Error: ' + e.message, 'error'));
  } else {
    document.getElementById('nominaModalTitle').textContent = 'Nueva N&oacute;mina';
    document.getElementById('btnGuardarNomina').textContent = 'Guardar';
    loadEmpleadosSelect(null);
  }
  new bootstrap.Modal(document.getElementById('nominaModal')).show();
}

async function saveNomina() {
  const id = document.getElementById('nominaId').value;
  const data = {
    fecha_nomina: document.getElementById('nominaFecha').value,
    sueldo: parseFloat(document.getElementById('nominaSueldo').value) || 0,
    empleadoId: parseInt(document.getElementById('nominaEmpleado').value) || null,
  };
  if (!data.empleadoId || !data.sueldo) {
    Utils.showToast('Empleado y sueldo son obligatorios', 'warning');
    return;
  }
  try {
    if (id) {
      await API.put('/nomina/' + id, data);
      Utils.showToast('N&oacute;mina actualizada', 'success');
    } else {
      await API.post('/nomina', data);
      Utils.showToast('N&oacute;mina creada. Asiento generado autom&aacute;ticamente.', 'success');
    }
    bootstrap.Modal.getInstance(document.getElementById('nominaModal'))?.hide();
    loadNominas();
  } catch (e) {
    Utils.showToast('Error: ' + e.message, 'error');
  }
}

async function deleteNomina(id) {
  const confirmed = await Utils.confirmAction('&iquest;Eliminar esta n&oacute;mina?', 'Confirmar', 'Eliminar');
  if (!confirmed) return;
  try {
    await API.del('/nomina/' + id);
    Utils.showToast('N&oacute;mina eliminada', 'success');
    loadNominas();
  } catch (e) {
    Utils.showToast('Error: ' + e.message, 'error');
  }
}
