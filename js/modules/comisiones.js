let editingComisionId = null;
let currentPage = 0;
let totalPages = 0;
let totalElements = 0;
const PAGE_SIZE = 20;

export function init() {
  currentPage = 0;
  loadComisiones();
  loadEmpleadosSelect(null, 'filterEmpleadoComision');
  bindEvents();
}

function bindEvents() {
  document.getElementById('btnNuevaComision')?.addEventListener('click', () => openComisionModal(null));
  document.getElementById('btnGuardarComision')?.addEventListener('click', saveComision);
  document.getElementById('searchComision')?.addEventListener('input', Utils.debounce(function() { currentPage = 0; loadComisiones(); }, 300));
  document.getElementById('filterEstadoComision')?.addEventListener('change', function() { currentPage = 0; loadComisiones(); });
  ['filterEmpleadoComision', 'filterComisionDesde', 'filterComisionHasta'].forEach(id => document.getElementById(id)?.addEventListener('change', () => { currentPage = 0; loadComisiones(); }));
  document.getElementById('comisionModal')?.addEventListener('hidden.bs.modal', () => { editingComisionId = null; });
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
    const empleado = document.getElementById('filterEmpleadoComision')?.value || '';
    const desde = document.getElementById('filterComisionDesde')?.value || '';
    const hasta = document.getElementById('filterComisionHasta')?.value || '';
    if (empleado) params += '&usuarioId=' + empleado;
    if (desde) params += '&desde=' + desde;
    if (hasta) params += '&hasta=' + hasta;
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
      '<td>' + Utils.esc(item.usuarioNombre || '-') + '</td>' +
      '<td>' + Utils.esc(item.concepto || '-') + '</td>' +
      '<td>' + Utils.esc(item.tipoComision || '-') + '</td>' +
      '<td>' + Utils.formatCurrency(item.montoComision) + '</td>' +
      '<td>' + estadoBadge(item.estadoComision) + '</td>' +
      '<td class="acciones-cell"><button type="button" class="btn-kebab-toggle kebab-trigger" data-id="' + item.id + '" title="Acciones"><i class="fas fa-ellipsis-v"></i></button></td>' +
    '</tr>'
  ).join('');

  tbody.querySelectorAll('.kebab-trigger').forEach(button => button.addEventListener('click', event => {
    event.stopPropagation();
    button.classList.add('show');
    Utils.abrirMenuKebab(button, [
      { icon: 'fa-edit', text: 'Editar comisión', onClick: () => openComisionModal(parseInt(button.dataset.id)) },
      { icon: 'fa-trash', text: 'Eliminar comisión', danger: true, onClick: () => deleteComision(parseInt(button.dataset.id)) },
    ]);
  }));
  renderPagination();
}

function estadoBadge(estado) {
  const map = {
    'PAGADA': 'badge-active',
    'PENDIENTE': 'badge-warning',
    'CANCELADA': 'badge-inactive',
  };
  return '<span class="badge-status ' + (map[estado] || 'badge-warning') + '">' + (estado || '-') + '</span>';
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

async function loadEmpleadosSelect(selectedId, selectId = 'comisionEmpleado') {
  const select = document.getElementById(selectId);
  select.innerHTML = '<option value="">Cargando...</option>';
  try {
    const resp = await API.get('/usuarios');
    const list = Array.isArray(resp) ? resp : (resp.content || []);
    select.innerHTML = '<option value="" disabled ' + (!selectedId ? 'selected' : '') + '>Selecciona un empleado</option>';
    list.forEach(e => {
      const name = [e.nombre, e.primerApellido, e.segundoApellido].filter(Boolean).join(' ');
      const opt = document.createElement('option');
       opt.value = e.idUsuario ?? e.id;
       opt.textContent = name + ' (#' + (e.idUsuario ?? e.id) + ')';
       if (selectedId && (e.idUsuario ?? e.id) === selectedId) opt.selected = true;
      select.appendChild(opt);
    });
  } catch (_) { select.innerHTML = '<option value="">Error al cargar</option>'; }
}

function openComisionModal(id) {
  editingComisionId = id;
  document.getElementById('comisionId').value = '';
  document.getElementById('comisionTipo').value = 'VENTA';
  document.getElementById('comisionConcepto').value = '';
  document.getElementById('comisionEstado').value = 'PENDIENTE';
  document.getElementById('comisionMonto').value = '';
  document.getElementById('comisionVentaId').value = '';

  if (id) {
    document.getElementById('comisionModalTitle').textContent = 'Editar Comisi&oacute;n';
    document.getElementById('btnGuardarComision').textContent = 'Actualizar';
    API.get('/comision/' + id).then(c => {
      document.getElementById('comisionTipo').value = c.tipoComision || 'VENTA';
      document.getElementById('comisionConcepto').value = c.concepto || '';
      document.getElementById('comisionEstado').value = c.estadoComision || 'PENDIENTE';
      document.getElementById('comisionMonto').value = c.montoComision || '';
      document.getElementById('comisionVentaId').value = c.ventaId || '';
      document.getElementById('comisionId').value = id;
      loadEmpleadosSelect(c.usuarioId || null);
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
  const monto = parseFloat(document.getElementById('comisionMonto').value) || 0;
  const data = {
    tipoComision: document.getElementById('comisionTipo').value,
    concepto: document.getElementById('comisionConcepto').value.trim(),
    monto: monto,
    usuarioId: parseInt(document.getElementById('comisionEmpleado').value) || null,
    ventaId: parseInt(document.getElementById('comisionVentaId').value) || null,
  };
  if (id) data.estadoComision = document.getElementById('comisionEstado').value;

  if (!data.usuarioId || !data.monto || !data.concepto) {
    Utils.showToast('Empleado, concepto y monto son obligatorios', 'warning');
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
