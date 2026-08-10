let currentPageNom = 0;
let totalPagesNom = 0;
let totalElementsNom = 0;
let currentPageDed = 0;
let totalPagesDed = 0;
let totalElementsDed = 0;
let editingDeduccionId = null;
let desgloseData = null;
const PAGE_SIZE = 20;

export function init() {
  currentPageNom = 0;
  currentPageDed = 0;
  editingDeduccionId = null;
  desgloseData = null;
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('genFecha').value = today;
  loadNominas();
  loadDeducciones();
  loadEmpleadosSelect('genEmpleado');
  loadEmpleadosSelect('deduccionEmpleado');
  bindEvents();
}

function bindEvents() {
  document.getElementById('btnCargarDesglose')?.addEventListener('click', cargarDesglose);
  document.getElementById('btnGenerarNomina')?.addEventListener('click', generarNomina);
  document.getElementById('btnNuevaDeduccion')?.addEventListener('click', () => openDeduccionModal(null));
  document.getElementById('btnGuardarDeduccion')?.addEventListener('click', saveDeduccion);
  document.getElementById('searchDeduccion')?.addEventListener('input', Utils.debounce(function() { currentPageDed = 0; loadDeducciones(); }, 300));
  document.getElementById('searchNomina')?.addEventListener('input', Utils.debounce(function() { currentPageNom = 0; loadNominas(); }, 300));
  document.getElementById('genEmpleado')?.addEventListener('change', function() { desgloseData = null; ocultarDesglose(); });
  document.getElementById('deduccionModal')?.addEventListener('hidden.bs.modal', () => { editingDeduccionId = null; });
}

/* ============ DESGLOSE / GENERAR ============ */

async function loadEmpleadosSelect(selectId, selectedId) {
  const select = document.getElementById(selectId);
  if (!select) return;
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

function ocultarDesglose() {
  document.getElementById('desgloseSection').style.display = 'none';
}

async function cargarDesglose() {
  const empleadoId = document.getElementById('genEmpleado').value;
  if (!empleadoId) {
    Utils.showToast('Selecciona un empleado', 'warning');
    return;
  }
  document.getElementById('btnCargarDesglose').disabled = true;
  try {
    desgloseData = await API.get('/nomina/desglose/' + empleadoId);
    renderDesglose();
  } catch (e) {
    Utils.showToast('Error al cargar desglose: ' + e.message, 'error');
  } finally {
    document.getElementById('btnCargarDesglose').disabled = false;
  }
}

function renderDesglose() {
  const d = desgloseData;
  if (!d) return;
  document.getElementById('desgloseSueldoBase').textContent = Utils.formatCurrency(d.sueldoBase);
  document.getElementById('desgloseTotalComisiones').textContent = Utils.formatCurrency(d.totalComisiones);
  document.getElementById('desgloseTotalDeducciones').textContent = Utils.formatCurrency(d.totalDeducciones);

  const comisiones = d.comisiones || [];
  const deducciones = d.deducciones || [];

  const comList = document.getElementById('comisionesList');
  if (!comisiones.length) {
    comList.innerHTML = '<small class="text-muted">Sin comisiones pendientes</small>';
  } else {
    comList.innerHTML = comisiones.map(c =>
      '<div class="form-check mb-2">' +
        '<input class="form-check-input gen-comision" type="checkbox" value="' + c.id + '" data-monto="' + (c.montoComision || 0) + '" id="comision_' + c.id + '">' +
        '<label class="form-check-label" for="comision_' + c.id + '">' +
          (c.ventaId ? 'Venta #' + c.ventaId + ' — ' : 'Comisión #' + c.id + ' — ') +
          Utils.formatCurrency(c.montoComision) +
        '</label>' +
      '</div>'
    ).join('');
  }
  document.getElementById('comisionesCount').textContent = '(' + comisiones.length + ')';

  const dedList = document.getElementById('deduccionesList');
  if (!deducciones.length) {
    dedList.innerHTML = '<small class="text-muted">Sin deducciones pendientes</small>';
  } else {
    dedList.innerHTML = deducciones.map(dd =>
      '<div class="form-check mb-2">' +
        '<input class="form-check-input gen-deduccion" type="checkbox" value="' + dd.id + '" data-monto="' + (dd.monto || 0) + '" id="deduccion_' + dd.id + '">' +
        '<label class="form-check-label" for="deduccion_' + dd.id + '">' +
          Utils.esc(dd.concepto || 'Deducción #' + dd.id) + ' — ' +
          Utils.formatCurrency(dd.monto) +
        '</label>' +
      '</div>'
    ).join('');
  }
  document.getElementById('deduccionesCount').textContent = '(' + deducciones.length + ')';

  document.querySelectorAll('.gen-comision, .gen-deduccion').forEach(cb =>
    cb.addEventListener('change', recalcNeto)
  );

  document.getElementById('desgloseSection').style.display = 'block';
  recalcNeto();
}

function recalcNeto() {
  const d = desgloseData;
  if (!d) return;
  const base = parseFloat(d.sueldoBase) || 0;
  let totalCom = 0;
  document.querySelectorAll('.gen-comision:checked').forEach(cb => {
    totalCom += parseFloat(cb.dataset.monto) || 0;
  });
  let totalDed = 0;
  document.querySelectorAll('.gen-deduccion:checked').forEach(cb => {
    totalDed += parseFloat(cb.dataset.monto) || 0;
  });
  const neto = base + totalCom - totalDed;
  document.getElementById('desgloseNeto').textContent = Utils.formatCurrency(neto);
}

async function generarNomina() {
  const empleadoId = document.getElementById('genEmpleado').value;
  const fecha = document.getElementById('genFecha').value;
  if (!empleadoId) {
    Utils.showToast('Selecciona un empleado', 'warning');
    return;
  }
  const comisionIds = Array.from(document.querySelectorAll('.gen-comision:checked')).map(cb => parseInt(cb.value));
  const deduccionIds = Array.from(document.querySelectorAll('.gen-deduccion:checked')).map(cb => parseInt(cb.value));

  if (!comisionIds.length && !deduccionIds.length) {
    Utils.showToast('No hay comisiones ni deducciones seleccionadas; se generará solo el sueldo base', 'warning');
  }

  document.getElementById('btnGenerarNomina').disabled = true;
  try {
    await API.post('/nomina', {
      fecha_nomina: fecha,
      empleadoId: parseInt(empleadoId),
      comisionIds: comisionIds,
      deduccionIds: deduccionIds,
    });
    Utils.showToast('Nómina generada. Asiento contable creado automáticamente.', 'success');
    ocultarDesglose();
    desgloseData = null;
    currentPageNom = 0;
    loadNominas();
    const tab = new bootstrap.Tab(document.getElementById('tabNominasBtn'));
    tab.show();
  } catch (e) {
    Utils.showToast('Error: ' + e.message, 'error');
  } finally {
    document.getElementById('btnGenerarNomina').disabled = false;
  }
}

/* ============ TAB NOMINAS ============ */

async function loadNominas() {
  const tbody = document.getElementById('tableNominasBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state"><i class="fas fa-file-invoice-dollar"></i><p>Cargando...</p></div></td></tr>';
  try {
    const q = document.getElementById('searchNomina')?.value?.trim() || '';
    let params = '?page=' + currentPageNom + '&size=' + PAGE_SIZE + '&sort=id,desc';
    if (q) params += '&search=' + encodeURIComponent(q);
    const resp = await API.get('/nomina' + params);
    renderNominas(resp);
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Error: ' + e.message + '</p></div></td></tr>';
  }
}

function renderNominas(data) {
  const tbody = document.getElementById('tableNominasBody');
  if (!tbody) return;
  const list = data.content || [];
  totalPagesNom = data.totalPages || 0;
  totalElementsNom = data.totalElements || 0;

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state"><i class="fas fa-file-invoice-dollar"></i><p>No hay n&oacute;minas</p></div></td></tr>';
    renderPaginacionNom();
    return;
  }

  tbody.innerHTML = list.map(item => {
    let acciones =
      '<button class="btn btn-sm btn-outline-secondary me-1 btn-view-nom" data-id="' + item.id + '" title="Ver detalle"><i class="fas fa-eye"></i></button>';
    if (item.estado === 'GENERADA') {
      acciones += '<button class="btn btn-sm btn-outline-warning me-1 btn-cancel-nom" data-id="' + item.id + '" title="Cancelar"><i class="fas fa-ban"></i></button>';
    }
    acciones += '<button class="btn btn-sm btn-outline-danger btn-delete-nom" data-id="' + item.id + '" title="Eliminar"><i class="fas fa-trash"></i></button>';
    return '<tr>' +
      '<td>' + item.id + '</td>' +
      '<td>' + Utils.formatDate(item.fecha_nomina) + '</td>' +
      '<td>' + Utils.esc(item.empleadoNombre || item.empleadoId || '-') + '</td>' +
      '<td>' + Utils.formatCurrency(item.sueldoBase) + '</td>' +
      '<td>' + Utils.formatCurrency(item.totalComisiones) + '</td>' +
      '<td>' + Utils.formatCurrency(item.totalDeducciones) + '</td>' +
      '<td><strong>' + Utils.formatCurrency(item.sueldo) + '</strong></td>' +
      '<td>' + estadoBadge(item.estado) + '</td>' +
      '<td>' + acciones + '</td>' +
    '</tr>';
  }).join('');

  tbody.querySelectorAll('.btn-view-nom').forEach(b => b.addEventListener('click', () => verNomina(list.find(x => x.id == b.dataset.id))));
  tbody.querySelectorAll('.btn-cancel-nom').forEach(b => b.addEventListener('click', () => cancelarNomina(parseInt(b.dataset.id))));
  tbody.querySelectorAll('.btn-delete-nom').forEach(b => b.addEventListener('click', () => deleteNomina(parseInt(b.dataset.id))));
  renderPaginacionNom();
}

function renderPaginacionNom() {
  const container = document.getElementById('paginationNominas');
  if (!container) return;
  if (totalPagesNom <= 1) { container.innerHTML = ''; return; }
  container.innerHTML =
    '<div class="d-flex justify-content-between align-items-center"><small class="text-muted">P&aacute;gina ' + (currentPageNom + 1) + ' de ' + totalPagesNom + ' (' + totalElementsNom + ' registros)</small>' +
    '<div class="btn-group">' +
      '<button class="btn btn-sm btn-outline-secondary" id="prevPageNom" ' + (currentPageNom === 0 ? 'disabled' : '') + '><i class="fas fa-chevron-left"></i></button>' +
      '<button class="btn btn-sm btn-outline-secondary" id="nextPageNom" ' + (currentPageNom >= totalPagesNom - 1 ? 'disabled' : '') + '><i class="fas fa-chevron-right"></i></button>' +
    '</div></div>';
  document.getElementById('prevPageNom')?.addEventListener('click', () => { if (currentPageNom > 0) { currentPageNom--; loadNominas(); } });
  document.getElementById('nextPageNom')?.addEventListener('click', () => { if (currentPageNom < totalPagesNom - 1) { currentPageNom++; loadNominas(); } });
}

function verNomina(item) {
  if (!item) return;
  const asiento = item.asientoId ? item.asientoId : 'Auto generado';
  Utils.showDialog('N&oacute;mina #' + item.id,
    '<div class="row g-2">' +
      '<div class="col-6"><small class="text-muted">Fecha</small><div><strong>' + Utils.formatDate(item.fecha_nomina) + '</strong></div></div>' +
      '<div class="col-6"><small class="text-muted">Empleado</small><div><strong>' + Utils.esc(item.empleadoNombre || '-') + '</strong></div></div>' +
      '<div class="col-6"><small class="text-muted">Sueldo base</small><div>' + Utils.formatCurrency(item.sueldoBase) + '</div></div>' +
      '<div class="col-6"><small class="text-muted">Comisiones</small><div style="color:var(--success)">+' + Utils.formatCurrency(item.totalComisiones).replace('$', '') + '</div></div>' +
      '<div class="col-6"><small class="text-muted">Deducciones</small><div style="color:var(--danger)">-' + Utils.formatCurrency(item.totalDeducciones).replace('$', '') + '</div></div>' +
      '<div class="col-6"><small class="text-muted">Total neto</small><div><strong>' + Utils.formatCurrency(item.sueldo) + '</strong></div></div>' +
      '<div class="col-6"><small class="text-muted">Estado</small><div>' + estadoBadge(item.estado) + '</div></div>' +
      '<div class="col-6"><small class="text-muted">Asiento contable</small><div>' + Utils.esc(asiento) + '</div></div>' +
    '</div>'
  );
}

async function cancelarNomina(id) {
  const confirmed = await Utils.confirmAction('&iquest;Cancelar esta n&oacute;mina? Las comisiones y deducciones volver&aacute;n a estado pendiente.', 'Confirmar', 'Cancelar n&oacute;mina');
  if (!confirmed) return;
  try {
    await API.post('/nomina/' + id + '/cancelar');
    Utils.showToast('N&oacute;mina cancelada', 'success');
    loadNominas();
  } catch (e) {
    Utils.showToast('Error: ' + e.message, 'error');
  }
}

async function deleteNomina(id) {
  const confirmed = await Utils.confirmAction('&iquest;Eliminar esta n&oacute;mina? Se desligar&aacute;n sus comisiones y deducciones.', 'Confirmar', 'Eliminar');
  if (!confirmed) return;
  try {
    await API.del('/nomina/' + id);
    Utils.showToast('N&oacute;mina eliminada', 'success');
    loadNominas();
  } catch (e) {
    Utils.showToast('Error: ' + e.message, 'error');
  }
}

/* ============ TAB DEDUCCIONES ============ */

async function loadDeducciones() {
  const tbody = document.getElementById('tableDeduccionesBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="fas fa-minus-circle"></i><p>Cargando...</p></div></td></tr>';
  try {
    const q = document.getElementById('searchDeduccion')?.value?.trim() || '';
    let params = '?page=' + currentPageDed + '&size=' + PAGE_SIZE + '&sort=id,desc';
    if (q) params += '&search=' + encodeURIComponent(q);
    const resp = await API.get('/deduccion' + params);
    renderDeducciones(resp);
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Error: ' + e.message + '</p></div></td></tr>';
  }
}

function renderDeducciones(data) {
  const tbody = document.getElementById('tableDeduccionesBody');
  if (!tbody) return;
  const list = data.content || [];
  totalPagesDed = data.totalPages || 0;
  totalElementsDed = data.totalElements || 0;

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="fas fa-minus-circle"></i><p>No hay deducciones</p></div></td></tr>';
    renderPaginacionDed();
    return;
  }

  tbody.innerHTML = list.map(item =>
    '<tr>' +
      '<td>' + item.id + '</td>' +
      '<td>' + Utils.esc(item.empleadoNombre || item.empleadoId || '-') + '</td>' +
      '<td>' + Utils.esc(item.concepto || '-') + '</td>' +
      '<td>' + Utils.formatCurrency(item.monto) + '</td>' +
      '<td>' + Utils.formatDate(item.fecha) + '</td>' +
      '<td>' + (item.corteCajaId ? '#' + item.corteCajaId : '-') + '</td>' +
      '<td>' + estadoBadge(item.estado) + '</td>' +
      '<td>' +
        '<button class="btn btn-sm btn-outline-secondary me-1 btn-edit-ded" data-id="' + item.id + '"><i class="fas fa-edit"></i></button>' +
        '<button class="btn btn-sm btn-outline-danger btn-delete-ded" data-id="' + item.id + '"><i class="fas fa-trash"></i></button>' +
      '</td>' +
    '</tr>'
  ).join('');

  tbody.querySelectorAll('.btn-edit-ded').forEach(b => b.addEventListener('click', () => openDeduccionModal(parseInt(b.dataset.id))));
  tbody.querySelectorAll('.btn-delete-ded').forEach(b => b.addEventListener('click', () => deleteDeduccion(parseInt(b.dataset.id))));
  renderPaginacionDed();
}

function renderPaginacionDed() {
  const container = document.getElementById('paginationDeducciones');
  if (!container) return;
  if (totalPagesDed <= 1) { container.innerHTML = ''; return; }
  container.innerHTML =
    '<div class="d-flex justify-content-between align-items-center"><small class="text-muted">P&aacute;gina ' + (currentPageDed + 1) + ' de ' + totalPagesDed + ' (' + totalElementsDed + ' registros)</small>' +
    '<div class="btn-group">' +
      '<button class="btn btn-sm btn-outline-secondary" id="prevPageDed" ' + (currentPageDed === 0 ? 'disabled' : '') + '><i class="fas fa-chevron-left"></i></button>' +
      '<button class="btn btn-sm btn-outline-secondary" id="nextPageDed" ' + (currentPageDed >= totalPagesDed - 1 ? 'disabled' : '') + '><i class="fas fa-chevron-right"></i></button>' +
    '</div></div>';
  document.getElementById('prevPageDed')?.addEventListener('click', () => { if (currentPageDed > 0) { currentPageDed--; loadDeducciones(); } });
  document.getElementById('nextPageDed')?.addEventListener('click', () => { if (currentPageDed < totalPagesDed - 1) { currentPageDed++; loadDeducciones(); } });
}

async function loadCortesSelect(selectedId) {
  const select = document.getElementById('deduccionCorte');
  if (!select) return;
  select.innerHTML = '<option value="">Cargando...</option>';
  try {
    const resp = await API.get('/cortes?page=0&size=100');
    const list = resp.content || resp || [];
    select.innerHTML = '<option value="">Sin corte</option>';
    list.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.idCorte;
      opt.textContent = 'Corte #' + c.idCorte + ' — ' + Utils.formatDate(c.fechaCierre);
      if (selectedId && c.idCorte === selectedId) opt.selected = true;
      select.appendChild(opt);
    });
  } catch (_) {
    select.innerHTML = '<option value="">Sin corte</option>';
  }
}

function openDeduccionModal(id) {
  editingDeduccionId = id;
  document.getElementById('deduccionId').value = '';
  document.getElementById('deduccionConcepto').value = '';
  document.getElementById('deduccionMonto').value = '';
  document.getElementById('deduccionFecha').value = new Date().toISOString().split('T')[0];
  loadEmpleadosSelect('deduccionEmpleado', id ? null : null);
  loadCortesSelect(id ? null : null);

  if (id) {
    document.getElementById('deduccionModalTitle').textContent = 'Editar Deducci&oacute;n';
    document.getElementById('btnGuardarDeduccion').textContent = 'Actualizar';
    API.get('/deduccion/' + id).then(d => {
      document.getElementById('deduccionConcepto').value = d.concepto || '';
      document.getElementById('deduccionMonto').value = d.monto != null ? d.monto : '';
      document.getElementById('deduccionFecha').value = d.fecha || new Date().toISOString().split('T')[0];
      document.getElementById('deduccionId').value = id;
      loadEmpleadosSelect('deduccionEmpleado', d.empleadoId ? parseInt(d.empleadoId) : null);
      loadCortesSelect(d.corteCajaId ? parseInt(d.corteCajaId) : null);
    }).catch(e => Utils.showToast('Error: ' + e.message, 'error'));
  } else {
    document.getElementById('deduccionModalTitle').textContent = 'Nueva Deducci&oacute;n';
    document.getElementById('btnGuardarDeduccion').textContent = 'Guardar';
  }
  new bootstrap.Modal(document.getElementById('deduccionModal')).show();
}

async function saveDeduccion() {
  const id = document.getElementById('deduccionId').value;
  const data = {
    empleadoId: parseInt(document.getElementById('deduccionEmpleado').value) || null,
    concepto: document.getElementById('deduccionConcepto').value.trim(),
    monto: parseFloat(document.getElementById('deduccionMonto').value) || 0,
    fecha: document.getElementById('deduccionFecha').value,
    corteCajaId: parseInt(document.getElementById('deduccionCorte').value) || null,
  };
  if (!data.empleadoId || !data.concepto || !data.monto) {
    Utils.showToast('Empleado, concepto y monto son obligatorios', 'warning');
    return;
  }
  try {
    if (id) {
      await API.put('/deduccion/' + id, data);
      Utils.showToast('Deducci&oacute;n actualizada', 'success');
    } else {
      await API.post('/deduccion', data);
      Utils.showToast('Deducci&oacute;n creada', 'success');
    }
    bootstrap.Modal.getInstance(document.getElementById('deduccionModal'))?.hide();
    loadDeducciones();
  } catch (e) {
    Utils.showToast('Error: ' + e.message, 'error');
  }
}

async function deleteDeduccion(id) {
  const confirmed = await Utils.confirmAction('&iquest;Eliminar esta deducci&oacute;n?', 'Confirmar', 'Eliminar');
  if (!confirmed) return;
  try {
    await API.del('/deduccion/' + id);
    Utils.showToast('Deducci&oacute;n eliminada', 'success');
    loadDeducciones();
  } catch (e) {
    Utils.showToast('Error: ' + e.message, 'error');
  }
}

/* ============ HELPERS ============ */

function estadoBadge(estado) {
  const map = {
    'GENERADA': 'badge-active',
    'PAGADA': 'badge-active',
    'APLICADA': 'badge-active',
    'CANCELADA': 'badge-inactive',
    'PENDIENTE': 'badge-warning',
  };
  return '<span class="badge-status ' + (map[estado] || 'badge-warning') + '">' + (estado || '-') + '</span>';
}
