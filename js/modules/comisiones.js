let editingComisionId = null;
let currentPage = 0;
let totalPages = 0;
let totalElements = 0;
const PAGE_SIZE = 20;

export function init() {
  currentPage = 0;
  loadComisiones();
  bindEvents();
}

function bindEvents() {
  document.getElementById('btnNuevaComision')?.addEventListener('click', () => openComisionModal(null));
  document.getElementById('btnGuardarComision')?.addEventListener('click', saveComision);
  document.getElementById('searchComision')?.addEventListener('input', Utils.debounce(function() { currentPage = 0; loadComisiones(); }, 300));
  document.getElementById('filterEstadoComision')?.addEventListener('change', function() { currentPage = 0; loadComisiones(); });
  document.getElementById('comisionMontoBase')?.addEventListener('input', calcComisionMonto);
  document.getElementById('comisionPorcentaje')?.addEventListener('input', calcComisionMonto);
  document.getElementById('comisionModal')?.addEventListener('hidden.bs.modal', () => { editingComisionId = null; });
}

function calcComisionMonto() {
  const base = parseFloat(document.getElementById('comisionMontoBase')?.value) || 0;
  const pct = parseFloat(document.getElementById('comisionPorcentaje')?.value) || 0;
  document.getElementById('comisionMontoCalc').value = Utils.formatCurrency(base * pct / 100);
}

async function loadComisiones() {
  const tbody = document.getElementById('tableComisionesBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><i class="fas fa-percent"></i><p>Cargando...</p></div></td></tr>';
  try {
    const q = document.getElementById('searchComision')?.value?.trim() || '';
    const estado = document.getElementById('filterEstadoComision')?.value || '';
    let params = '?page=' + currentPage + '&size=' + PAGE_SIZE + '&sort=id,desc';
    if (q) params += '&search=' + encodeURIComponent(q);
    if (estado) params += '&estadoComision=' + encodeURIComponent(estado);
    const resp = await API.get('/comision' + params);
    renderTable(resp);
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Error: ' + e.message + '</p></div></td></tr>';
  }
}

function renderTable(data) {
  const tbody = document.getElementById('tableComisionesBody');
  if (!tbody) return;
  const list = data.content || [];
  totalPages = data.totalPages || 0;
  totalElements = data.totalElements || 0;

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><i class="fas fa-percent"></i><p>No hay comisiones</p></div></td></tr>';
    renderPagination();
    return;
  }

  tbody.innerHTML = list.map(item =>
    '<tr>' +
      '<td>' + item.id + '</td>' +
      '<td>' + Utils.esc(item.tipoComision || '-') + '</td>' +
      '<td>' + Utils.formatCurrency(item.montoBase) + '</td>' +
      '<td>' + (item.porcentaje != null ? item.porcentaje + '%' : '-') + '</td>' +
      '<td>' + Utils.formatCurrency(item.montoComision) + '</td>' +
      '<td><span class="status-badge ' + (item.estadoComision || 'pendiente').toLowerCase() + '">' + (item.estadoComision || 'PENDIENTE') + '</span></td>' +
      '<td>' +
        '<button class="btn btn-sm btn-outline-secondary me-1 btn-edit-com" data-id="' + item.id + '"><i class="fas fa-edit"></i></button>' +
        '<button class="btn btn-sm btn-outline-danger btn-delete-com" data-id="' + item.id + '"><i class="fas fa-trash"></i></button>' +
      '</td>' +
    '</tr>'
  ).join('');

  tbody.querySelectorAll('.btn-edit-com').forEach(b => b.addEventListener('click', () => openComisionModal(parseInt(b.dataset.id))));
  tbody.querySelectorAll('.btn-delete-com').forEach(b => b.addEventListener('click', () => deleteComision(parseInt(b.dataset.id))));
  renderPagination();
}

function renderPagination() {
  const container = document.getElementById('paginationComisiones');
  if (!container) return;
  if (totalPages <= 1) { container.innerHTML = ''; return; }
  container.innerHTML =
    '<div class="d-flex justify-content-between align-items-center"><small class="text-muted">P&aacute;gina ' + (currentPage + 1) + ' de ' + totalPages + ' (' + totalElements + ' registros)</small>' +
    '<div class="btn-group">' +
      '<button class="btn btn-sm btn-outline-secondary" id="prevPageCom" ' + (currentPage === 0 ? 'disabled' : '') + '><i class="fas fa-chevron-left"></i></button>' +
      '<button class="btn btn-sm btn-outline-secondary" id="nextPageCom" ' + (currentPage >= totalPages - 1 ? 'disabled' : '') + '><i class="fas fa-chevron-right"></i></button>' +
    '</div></div>';
  document.getElementById('prevPageCom')?.addEventListener('click', () => { if (currentPage > 0) { currentPage--; loadComisiones(); } });
  document.getElementById('nextPageCom')?.addEventListener('click', () => { if (currentPage < totalPages - 1) { currentPage++; loadComisiones(); } });
}

async function loadEmpleadosSelect(selectedId) {
  const select = document.getElementById('comisionEmpleado');
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
  } catch (_) { select.innerHTML = '<option value="">Error al cargar</option>'; }
}

function openComisionModal(id) {
  editingComisionId = id;
  document.getElementById('comisionId').value = '';
  document.getElementById('comisionTipo').value = 'VENTA';
  document.getElementById('comisionEstado').value = 'PENDIENTE';
  document.getElementById('comisionMontoBase').value = '';
  document.getElementById('comisionPorcentaje').value = '';
  document.getElementById('comisionMontoCalc').value = '';
  document.getElementById('comisionVentaId').value = '';

  if (id) {
    document.getElementById('comisionModalTitle').textContent = 'Editar Comisi&oacute;n';
    document.getElementById('btnGuardarComision').textContent = 'Actualizar';
    API.get('/comision/' + id).then(c => {
      document.getElementById('comisionTipo').value = c.tipoComision || 'VENTA';
      document.getElementById('comisionEstado').value = c.estadoComision || 'PENDIENTE';
      document.getElementById('comisionMontoBase').value = c.montoBase || '';
      document.getElementById('comisionPorcentaje').value = c.porcentaje || '';
      document.getElementById('comisionVentaId').value = c.ventaId || '';
      document.getElementById('comisionId').value = id;
      calcComisionMonto();
      loadEmpleadosSelect(c.empleadoId || null);
    }).catch(e => Utils.showToast('Error: ' + e.message, 'error'));
  } else {
    document.getElementById('comisionModalTitle').textContent = 'Nueva Comisi&oacute;n';
    document.getElementById('btnGuardarComision').textContent = 'Guardar';
    loadEmpleadosSelect(null);
  }
  new bootstrap.Modal(document.getElementById('comisionModal')).show();
}

async function saveComision() {
  const id = document.getElementById('comisionId').value;
  const montoBase = parseFloat(document.getElementById('comisionMontoBase').value) || 0;
  const pct = parseFloat(document.getElementById('comisionPorcentaje').value) || 0;
  const data = {
    tipoComision: document.getElementById('comisionTipo').value,
    montoBase: montoBase,
    porcentaje: pct,
    montoComision: montoBase * pct / 100,
    empleadoId: parseInt(document.getElementById('comisionEmpleado').value) || null,
    ventaId: parseInt(document.getElementById('comisionVentaId').value) || null,
  };
  if (id) data.estadoComision = document.getElementById('comisionEstado').value;

  if (!data.empleadoId || !data.montoBase) {
    Utils.showToast('Empleado y monto base son obligatorios', 'warning');
    return;
  }
  try {
    if (id) {
      await API.put('/comision/' + id, data);
      Utils.showToast('Comisi&oacute;n actualizada', 'success');
    } else {
      await API.post('/comision', data);
      Utils.showToast('Comisi&oacute;n creada', 'success');
    }
    bootstrap.Modal.getInstance(document.getElementById('comisionModal'))?.hide();
    loadComisiones();
  } catch (e) {
    Utils.showToast('Error: ' + e.message, 'error');
  }
}

async function deleteComision(id) {
  const confirmed = await Utils.confirmAction('&iquest;Eliminar esta comisi&oacute;n?', 'Confirmar', 'Eliminar');
  if (!confirmed) return;
  try {
    await API.del('/comision/' + id);
    Utils.showToast('Comisi&oacute;n eliminada', 'success');
    loadComisiones();
  } catch (e) {
    Utils.showToast('Error: ' + e.message, 'error');
  }
}
