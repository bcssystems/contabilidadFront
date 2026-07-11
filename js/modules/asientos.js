let editingAsientoId = null;
let currentPage = 0;
let totalPages = 0;
let totalElements = 0;
const PAGE_SIZE = 20;

export function init() {
  currentPage = 0;
  loadAsientos();
  bindEvents();
}

function bindEvents() {
  document.getElementById('btnNuevoAsiento')?.addEventListener('click', () => openAsientoModal(null));
  document.getElementById('btnGuardarAsiento')?.addEventListener('click', saveAsiento);
  document.getElementById('searchAsiento')?.addEventListener('input', Utils.debounce(function() {
    currentPage = 0;
    loadAsientos();
  }, 300));
  document.getElementById('filterTipoAsiento')?.addEventListener('change', function() {
    currentPage = 0;
    loadAsientos();
  });
  document.getElementById('asientoModal')?.addEventListener('hidden.bs.modal', () => { editingAsientoId = null; });
}

function getFilterParams() {
  const q = document.getElementById('searchAsiento')?.value?.trim() || '';
  const tipo = document.getElementById('filterTipoAsiento')?.value || '';
  let params = '?page=' + currentPage + '&size=' + PAGE_SIZE + '&sort=id,desc';
  if (q) params += '&search=' + encodeURIComponent(q);
  if (tipo) params += '&tipoAsientoContable=' + encodeURIComponent(tipo);
  return params;
}

async function loadAsientos() {
  const tbody = document.getElementById('tableAsientosBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><i class="fas fa-journal-whills"></i><p>Cargando...</p></div></td></tr>';
  try {
    const resp = await API.get('/asiento-contable' + getFilterParams());
    renderTable(resp);
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Error al cargar: ' + e.message + '</p></div></td></tr>';
  }
}

function renderTable(data) {
  const tbody = document.getElementById('tableAsientosBody');
  if (!tbody) return;
  const list = data.content || [];
  totalPages = data.totalPages || 0;
  totalElements = data.totalElements || 0;

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><i class="fas fa-journal-whills"></i><p>No hay asientos contables</p></div></td></tr>';
    renderPagination();
    return;
  }

  tbody.innerHTML = list.map(item =>
    '<tr>' +
      '<td>' + item.id + '</td>' +
      '<td>' + Utils.formatDate(item.fecha) + '</td>' +
      '<td>' + Utils.esc(item.referencia || '-') + '</td>' +
      '<td>' + Utils.esc(item.descripcion || '-') + '</td>' +
      '<td><span class="status-badge ' + (item.tipoAsientoContable || 'borrador').toLowerCase() + '">' + (item.tipoAsientoContable || 'BORRADOR') + '</span></td>' +
      '<td>' +
        '<button class="btn btn-sm btn-outline-info me-1 btn-view-asiento" data-id="' + item.id + '"><i class="fas fa-eye"></i></button>' +
        '<button class="btn btn-sm btn-outline-secondary me-1 btn-edit-asiento" data-id="' + item.id + '"><i class="fas fa-edit"></i></button>' +
        '<button class="btn btn-sm btn-outline-danger btn-delete-asiento" data-id="' + item.id + '"><i class="fas fa-trash"></i></button>' +
      '</td>' +
    '</tr>'
  ).join('');

  tbody.querySelectorAll('.btn-view-asiento').forEach(b => b.addEventListener('click', () => viewAsiento(parseInt(b.dataset.id))));
  tbody.querySelectorAll('.btn-edit-asiento').forEach(b => b.addEventListener('click', () => openAsientoModal(parseInt(b.dataset.id))));
  tbody.querySelectorAll('.btn-delete-asiento').forEach(b => b.addEventListener('click', () => deleteAsiento(parseInt(b.dataset.id))));

  renderPagination();
}

function renderPagination() {
  const container = document.getElementById('paginationAsientos');
  if (!container) return;
  if (totalPages <= 1) { container.innerHTML = ''; return; }

  let html = '<div class="d-flex justify-content-between align-items-center"><small class="text-muted">P&aacute;gina ' + (currentPage + 1) + ' de ' + totalPages + ' (' + totalElements + ' registros)</small><div class="btn-group">';
  html += '<button class="btn btn-sm btn-outline-secondary" id="prevPageAs" ' + (currentPage === 0 ? 'disabled' : '') + '><i class="fas fa-chevron-left"></i></button>';
  html += '<button class="btn btn-sm btn-outline-secondary" id="nextPageAs" ' + (currentPage >= totalPages - 1 ? 'disabled' : '') + '><i class="fas fa-chevron-right"></i></button>';
  html += '</div></div>';
  container.innerHTML = html;

  document.getElementById('prevPageAs')?.addEventListener('click', () => { if (currentPage > 0) { currentPage--; loadAsientos(); } });
  document.getElementById('nextPageAs')?.addEventListener('click', () => { if (currentPage < totalPages - 1) { currentPage++; loadAsientos(); } });
}

function openAsientoModal(id) {
  editingAsientoId = id;
  const titleEl = document.getElementById('asientoModalTitle');
  const btn = document.getElementById('btnGuardarAsiento');
  document.getElementById('asientoId').value = '';

  const today = new Date().toISOString().split('T')[0];
  document.getElementById('asientoFecha').value = today;
  document.getElementById('asientoReferencia').value = '';
  document.getElementById('asientoDescripcion').value = '';
  document.getElementById('asientoTipo').value = 'BORRADOR';

  if (id) {
    titleEl.textContent = 'Editar Asiento Contable';
    btn.textContent = 'Actualizar';
    API.get('/asiento-contable/' + id).then(a => {
      document.getElementById('asientoFecha').value = a.fecha || today;
      document.getElementById('asientoReferencia').value = a.referencia || '';
      document.getElementById('asientoDescripcion').value = a.descripcion || '';
      document.getElementById('asientoTipo').value = a.tipoAsientoContable || 'BORRADOR';
      document.getElementById('asientoId').value = id;
    }).catch(e => {
      Utils.showToast('Error: ' + e.message, 'error');
      return;
    });
  } else {
    titleEl.textContent = 'Nuevo Asiento Contable';
    btn.textContent = 'Guardar';
  }

  new bootstrap.Modal(document.getElementById('asientoModal')).show();
}

async function saveAsiento() {
  const id = document.getElementById('asientoId').value;
  const data = {
    fecha: document.getElementById('asientoFecha').value,
    referencia: document.getElementById('asientoReferencia').value.trim(),
    descripcion: document.getElementById('asientoDescripcion').value.trim(),
    tipoAsientoContable: document.getElementById('asientoTipo').value,
    movimientos: [],
  };
  if (!data.referencia || !data.descripcion) {
    Utils.showToast('Referencia y descripci&oacute;n son obligatorios', 'warning');
    return;
  }
  try {
    if (id) {
      await API.put('/asiento-contable/' + id, data);
      Utils.showToast('Asiento actualizado', 'success');
    } else {
      await API.post('/asiento-contable', data);
      Utils.showToast('Asiento creado', 'success');
    }
    bootstrap.Modal.getInstance(document.getElementById('asientoModal'))?.hide();
    loadAsientos();
  } catch (e) {
    Utils.showToast('Error: ' + e.message, 'error');
  }
}

async function viewAsiento(id) {
  try {
    const a = await API.get('/asiento-contable/' + id);
    document.getElementById('viewAsientoTitle').textContent = 'Asiento #' + id;
    const movs = (a.movimientos || []).map(m =>
      '<tr><td>' + Utils.esc(m.cuentaCodigo || '-') + '</td><td>' + Utils.esc(m.cuentaNombre || '-') + '</td><td>' + Utils.formatCurrency(m.debe) + '</td><td>' + Utils.formatCurrency(m.haber) + '</td></tr>'
    ).join('') || '<tr><td colspan="4" class="text-muted">Sin movimientos</td></tr>';

    document.getElementById('viewAsientoBody').innerHTML =
      '<div class="mb-3"><div class="row g-3"><div class="col-md-3"><strong>Fecha:</strong> ' + Utils.esc(a.fecha || '-') + '</div>' +
      '<div class="col-md-3"><strong>Referencia:</strong> ' + Utils.esc(a.referencia || '-') + '</div>' +
      '<div class="col-md-3"><strong>Tipo:</strong> ' + Utils.esc(a.tipoAsientoContable || '-') + '</div>' +
      '<div class="col-md-3"><strong>Descripci&oacute;n:</strong> ' + Utils.esc(a.descripcion || '-') + '</div></div></div>' +
      '<h6 class="fw-semibold mb-2">Movimientos</h6><div class="table-responsive"><table class="table table-sm table-custom mb-0"><thead><tr><th>C&oacute;digo</th><th>Cuenta</th><th>Debe</th><th>Haber</th></tr></thead><tbody>' + movs + '</tbody></table></div>';

    new bootstrap.Modal(document.getElementById('viewAsientoModal')).show();
  } catch (e) {
    Utils.showToast('Error: ' + e.message, 'error');
  }
}

async function deleteAsiento(id) {
  const confirmed = await Utils.confirmAction('&iquest;Eliminar este asiento contable?', 'Confirmar', 'Eliminar');
  if (!confirmed) return;
  try {
    await API.del('/asiento-contable/' + id);
    Utils.showToast('Asiento eliminado', 'success');
    loadAsientos();
  } catch (e) {
    Utils.showToast('Error: ' + e.message, 'error');
  }
}
