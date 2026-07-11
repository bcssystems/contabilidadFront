let editingProveedorId = null;
let currentPage = 0;
let totalPages = 0;
let totalElements = 0;
const PAGE_SIZE = 20;

export function init() {
  currentPage = 0;
  loadProveedores();
  bindEvents();
}

function bindEvents() {
  document.getElementById('btnNuevoProveedor')?.addEventListener('click', () => openProveedorModal(null));
  document.getElementById('btnGuardarProveedor')?.addEventListener('click', saveProveedor);
  document.getElementById('searchProveedor')?.addEventListener('input', Utils.debounce(function() { currentPage = 0; loadProveedores(); }, 300));
  document.getElementById('proveedorModal')?.addEventListener('hidden.bs.modal', () => { editingProveedorId = null; });
}

async function loadProveedores() {
  const tbody = document.getElementById('tableProveedoresBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4"><div class="empty-state"><i class="fas fa-truck"></i><p>Cargando...</p></div></td></tr>';
  try {
    const q = document.getElementById('searchProveedor')?.value?.trim() || '';
    let params = '?page=' + currentPage + '&size=' + PAGE_SIZE + '&sort=id,asc';
    if (q) params += '&search=' + encodeURIComponent(q);
    const resp = await API.get('/proveedor' + params);
    renderTable(resp);
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="4"><div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Error: ' + e.message + '</p></div></td></tr>';
  }
}

function renderTable(data) {
  const tbody = document.getElementById('tableProveedoresBody');
  if (!tbody) return;
  const list = data.content || [];
  totalPages = data.totalPages || 0;
  totalElements = data.totalElements || 0;

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="4"><div class="empty-state"><i class="fas fa-truck"></i><p>No hay proveedores</p></div></td></tr>';
    renderPagination();
    return;
  }

  tbody.innerHTML = list.map(item =>
    '<tr>' +
      '<td>' + item.id + '</td>' +
      '<td>' + Utils.esc(item.nombre || '-') + '</td>' +
      '<td>' + (item.cuentaPorPagarId || '-') + '</td>' +
      '<td>' +
        '<button class="btn btn-sm btn-outline-secondary me-1 btn-edit-prov" data-id="' + item.id + '"><i class="fas fa-edit"></i></button>' +
        '<button class="btn btn-sm btn-outline-danger btn-delete-prov" data-id="' + item.id + '"><i class="fas fa-trash"></i></button>' +
      '</td>' +
    '</tr>'
  ).join('');

  tbody.querySelectorAll('.btn-edit-prov').forEach(b => b.addEventListener('click', () => openProveedorModal(parseInt(b.dataset.id))));
  tbody.querySelectorAll('.btn-delete-prov').forEach(b => b.addEventListener('click', () => deleteProveedor(parseInt(b.dataset.id))));
  renderPagination();
}

function renderPagination() {
  const container = document.getElementById('paginationProveedores');
  if (!container) return;
  if (totalPages <= 1) { container.innerHTML = ''; return; }
  container.innerHTML =
    '<div class="d-flex justify-content-between align-items-center"><small class="text-muted">P&aacute;gina ' + (currentPage + 1) + ' de ' + totalPages + ' (' + totalElements + ' registros)</small>' +
    '<div class="btn-group">' +
      '<button class="btn btn-sm btn-outline-secondary" id="prevPageProv" ' + (currentPage === 0 ? 'disabled' : '') + '><i class="fas fa-chevron-left"></i></button>' +
      '<button class="btn btn-sm btn-outline-secondary" id="nextPageProv" ' + (currentPage >= totalPages - 1 ? 'disabled' : '') + '><i class="fas fa-chevron-right"></i></button>' +
    '</div></div>';
  document.getElementById('prevPageProv')?.addEventListener('click', () => { if (currentPage > 0) { currentPage--; loadProveedores(); } });
  document.getElementById('nextPageProv')?.addEventListener('click', () => { if (currentPage < totalPages - 1) { currentPage++; loadProveedores(); } });
}

async function loadCuentasSelect(selectedId) {
  const select = document.getElementById('proveedorCuenta');
  select.innerHTML = '<option value="">Sin cuenta asignada</option>';
  try {
    const resp = await API.get('/cuenta-contable?page=0&size=300&sort=id,asc');
    const list = resp.content || [];
    list.filter(c => c.tipoCuentaContable === 'PASIVO').forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = (c.codigo || '') + ' - ' + (c.nombre || '') + ' (#' + c.id + ')';
      if (selectedId && c.id === selectedId) opt.selected = true;
      select.appendChild(opt);
    });
  } catch (_) {}
}

function openProveedorModal(id) {
  editingProveedorId = id;
  document.getElementById('proveedorId').value = '';
  document.getElementById('proveedorNombre').value = '';

  if (id) {
    document.getElementById('proveedorModalTitle').textContent = 'Editar Proveedor';
    document.getElementById('btnGuardarProveedor').textContent = 'Actualizar';
    API.get('/proveedor/' + id).then(p => {
      document.getElementById('proveedorNombre').value = p.nombre || '';
      document.getElementById('proveedorId').value = id;
      loadCuentasSelect(p.cuentaPorPagarId || null);
    }).catch(e => Utils.showToast('Error: ' + e.message, 'error'));
  } else {
    document.getElementById('proveedorModalTitle').textContent = 'Nuevo Proveedor';
    document.getElementById('btnGuardarProveedor').textContent = 'Guardar';
    loadCuentasSelect(null);
  }
  new bootstrap.Modal(document.getElementById('proveedorModal')).show();
}

async function saveProveedor() {
  const id = document.getElementById('proveedorId').value;
  const data = {
    nombre: document.getElementById('proveedorNombre').value.trim(),
    cuentaPorPagarId: parseInt(document.getElementById('proveedorCuenta').value) || null,
  };
  if (!data.nombre) { Utils.showToast('El nombre es obligatorio', 'warning'); return; }
  try {
    if (id) {
      await API.put('/proveedor/' + id, data);
      Utils.showToast('Proveedor actualizado', 'success');
    } else {
      await API.post('/proveedor', data);
      Utils.showToast('Proveedor creado', 'success');
    }
    bootstrap.Modal.getInstance(document.getElementById('proveedorModal'))?.hide();
    loadProveedores();
  } catch (e) {
    Utils.showToast('Error: ' + e.message, 'error');
  }
}

async function deleteProveedor(id) {
  const confirmed = await Utils.confirmAction('&iquest;Eliminar este proveedor?', 'Confirmar', 'Eliminar');
  if (!confirmed) return;
  try {
    await API.del('/proveedor/' + id);
    Utils.showToast('Proveedor eliminado', 'success');
    loadProveedores();
  } catch (e) {
    Utils.showToast('Error: ' + e.message, 'error');
  }
}
