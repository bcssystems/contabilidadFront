let editingMovimientoId = null;
let currentPage = 0;
let totalPages = 0;
let totalElements = 0;
const PAGE_SIZE = 20;

export function init() {
  currentPage = 0;
  loadMovimientos();
  bindEvents();
}

function bindEvents() {
  document.getElementById('btnNuevoMovimiento')?.addEventListener('click', () => openMovimientoModal(null));
  document.getElementById('btnGuardarMovimiento')?.addEventListener('click', saveMovimiento);
  document.getElementById('searchMovimiento')?.addEventListener('input', Utils.debounce(function() {
    currentPage = 0;
    loadMovimientos();
  }, 300));
  document.getElementById('movimientoModal')?.addEventListener('hidden.bs.modal', () => { editingMovimientoId = null; });
}

async function loadMovimientos() {
  const tbody = document.getElementById('tableMovimientosBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><i class="fas fa-exchange-alt"></i><p>Cargando...</p></div></td></tr>';
  try {
    const q = document.getElementById('searchMovimiento')?.value?.trim() || '';
    let params = '?page=' + currentPage + '&size=' + PAGE_SIZE + '&sort=id,desc';
    if (q) params += '&search=' + encodeURIComponent(q);
    const resp = await API.get('/movimiento-contable' + params);
    renderTable(resp);
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Error: ' + e.message + '</p></div></td></tr>';
  }
}

function renderTable(data) {
  const tbody = document.getElementById('tableMovimientosBody');
  if (!tbody) return;
  const list = data.content || [];
  totalPages = data.totalPages || 0;
  totalElements = data.totalElements || 0;

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><i class="fas fa-exchange-alt"></i><p>No hay movimientos</p></div></td></tr>';
    renderPagination();
    return;
  }

  tbody.innerHTML = list.map(item =>
    '<tr>' +
      '<td>' + item.id + '</td>' +
      '<td>' + Utils.esc(item.cuentaCodigo || '-') + '</td>' +
      '<td>' + Utils.esc(item.cuentaNombre || '-') + '</td>' +
      '<td>' + Utils.formatCurrency(item.debe) + '</td>' +
      '<td>' + Utils.formatCurrency(item.haber) + '</td>' +
      '<td>' +
        '<button class="btn btn-sm btn-outline-secondary me-1 btn-edit-mov" data-id="' + item.id + '"><i class="fas fa-edit"></i></button>' +
        '<button class="btn btn-sm btn-outline-danger btn-delete-mov" data-id="' + item.id + '"><i class="fas fa-trash"></i></button>' +
      '</td>' +
    '</tr>'
  ).join('');

  tbody.querySelectorAll('.btn-edit-mov').forEach(b => b.addEventListener('click', () => openMovimientoModal(parseInt(b.dataset.id))));
  tbody.querySelectorAll('.btn-delete-mov').forEach(b => b.addEventListener('click', () => deleteMovimiento(parseInt(b.dataset.id))));

  renderPagination();
}

function renderPagination() {
  const container = document.getElementById('paginationMovimientos');
  if (!container) return;
  if (totalPages <= 1) { container.innerHTML = ''; return; }
  container.innerHTML =
    '<div class="d-flex justify-content-between align-items-center"><small class="text-muted">P&aacute;gina ' + (currentPage + 1) + ' de ' + totalPages + ' (' + totalElements + ' registros)</small>' +
    '<div class="btn-group">' +
      '<button class="btn btn-sm btn-outline-secondary" id="prevPageMov" ' + (currentPage === 0 ? 'disabled' : '') + '><i class="fas fa-chevron-left"></i></button>' +
      '<button class="btn btn-sm btn-outline-secondary" id="nextPageMov" ' + (currentPage >= totalPages - 1 ? 'disabled' : '') + '><i class="fas fa-chevron-right"></i></button>' +
    '</div></div>';
  document.getElementById('prevPageMov')?.addEventListener('click', () => { if (currentPage > 0) { currentPage--; loadMovimientos(); } });
  document.getElementById('nextPageMov')?.addEventListener('click', () => { if (currentPage < totalPages - 1) { currentPage++; loadMovimientos(); } });
}

async function openMovimientoModal(id) {
  editingMovimientoId = id;
  document.getElementById('movimientoId').value = '';
  document.getElementById('movimientoDebe').value = '0';
  document.getElementById('movimientoHaber').value = '0';

  await loadCuentasSelect();
  await loadAsientosSelect();

  if (id) {
    document.getElementById('movimientoModalTitle').textContent = 'Editar Movimiento';
    document.getElementById('btnGuardarMovimiento').textContent = 'Actualizar';
    try {
      const m = await API.get('/movimiento-contable/' + id);
      document.getElementById('movimientoDebe').value = m.debe || 0;
      document.getElementById('movimientoHaber').value = m.haber || 0;
      document.getElementById('movimientoCuenta').value = m.cuentaContableId || '';
      document.getElementById('movimientoAsiento').value = m.asientoId || '';
      document.getElementById('movimientoId').value = id;
    } catch (e) { Utils.showToast('Error: ' + e.message, 'error'); return; }
  } else {
    document.getElementById('movimientoModalTitle').textContent = 'Nuevo Movimiento';
    document.getElementById('btnGuardarMovimiento').textContent = 'Guardar';
  }
  new bootstrap.Modal(document.getElementById('movimientoModal')).show();
}

async function loadCuentasSelect() {
  const select = document.getElementById('movimientoCuenta');
  select.innerHTML = '<option value="">Seleccionar cuenta...</option>';
  try {
    const resp = await API.get('/cuenta-contable?page=0&size=300&sort=id,asc');
    const list = resp.content || resp || [];
    list.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = (c.codigo || '') + ' - ' + (c.nombre || '');
      select.appendChild(opt);
    });
  } catch (_) {}
}

async function loadAsientosSelect() {
  const select = document.getElementById('movimientoAsiento');
  select.innerHTML = '<option value="">Seleccionar asiento...</option>';
  try {
    const resp = await API.get('/asiento-contable?page=0&size=100&sort=id,desc');
    const list = resp.content || [];
    list.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = '#' + a.id + ' - ' + (a.referencia || '');
      select.appendChild(opt);
    });
  } catch (_) {}
}

async function saveMovimiento() {
  const id = document.getElementById('movimientoId').value;
  const data = {
    debe: parseFloat(document.getElementById('movimientoDebe').value) || 0,
    haber: parseFloat(document.getElementById('movimientoHaber').value) || 0,
    cuentaContableId: parseInt(document.getElementById('movimientoCuenta').value) || null,
    asientoContableId: parseInt(document.getElementById('movimientoAsiento').value) || null,
  };
  if (!data.cuentaContableId || !data.asientoContableId) {
    Utils.showToast('Cuenta y asiento son obligatorios', 'warning');
    return;
  }
  try {
    if (id) {
      await API.put('/movimiento-contable/' + id, data);
      Utils.showToast('Movimiento actualizado', 'success');
    } else {
      await API.post('/movimiento-contable', data);
      Utils.showToast('Movimiento creado', 'success');
    }
    bootstrap.Modal.getInstance(document.getElementById('movimientoModal'))?.hide();
    loadMovimientos();
  } catch (e) {
    Utils.showToast('Error: ' + e.message, 'error');
  }
}

async function deleteMovimiento(id) {
  const confirmed = await Utils.confirmAction('&iquest;Eliminar este movimiento?', 'Confirmar', 'Eliminar');
  if (!confirmed) return;
  try {
    await API.del('/movimiento-contable/' + id);
    Utils.showToast('Movimiento eliminado', 'success');
    loadMovimientos();
  } catch (e) {
    Utils.showToast('Error: ' + e.message, 'error');
  }
}
