let currentPageNom = 0;
let totalPagesNom = 0;
let totalElementsNom = 0;
let currentPageDed = 0;
let totalPagesDed = 0;
let totalElementsDed = 0;
let editingDeduccionId = null;
let desgloseData = null;
let currentPageComNom = 0;
const PAGE_SIZE = 20;

export function init() {
  currentPageNom = 0;
  currentPageDed = 0;
  editingDeduccionId = null;
  desgloseData = null;
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('genFecha');
  if (dateInput) dateInput.value = today;
  loadNominas();
  loadDeducciones();
  loadComisionesNomina();
  loadEmpleadosSelect('genEmpleado');
  loadEmpleadosSelect('deduccionEmpleado');
  loadEmpleadosSelect('filterEmpleadoDeduccion');
  bindEvents();
}

function bindEvents() {
  document.getElementById('btnCargarDesglose')?.addEventListener('click', cargarDesglose);
  document.getElementById('btnGenerarNomina')?.addEventListener('click', generarNomina);
  document.getElementById('btnNuevaDeduccion')?.addEventListener('click', () => openDeduccionModal(null));
  document.getElementById('btnGuardarDeduccion')?.addEventListener('click', saveDeduccion);
  document.getElementById('btnImprimirNomina')?.addEventListener('click', () => { const id = document.getElementById('nominaImpresionModal')?.dataset.nominaId; if (id) imprimirRecibo(id); });
  document.getElementById('searchDeduccion')?.addEventListener('input', Utils.debounce(function() { currentPageDed = 0; loadDeducciones(); }, 300));
  document.getElementById('filterEstadoDeduccion')?.addEventListener('change', () => { currentPageDed = 0; loadDeducciones(); });
  document.getElementById('filterOrigenDeduccion')?.addEventListener('change', () => { currentPageDed = 0; loadDeducciones(); });
  ['filterEmpleadoDeduccion', 'filterDeduccionDesde', 'filterDeduccionHasta'].forEach(id => document.getElementById(id)?.addEventListener('change', () => { currentPageDed = 0; loadDeducciones(); }));
  document.getElementById('searchNomina')?.addEventListener('input', Utils.debounce(function() { currentPageNom = 0; loadNominas(); }, 300));
  ['filterEstadoNomina', 'filterNominaDesde', 'filterNominaHasta'].forEach(id => document.getElementById(id)?.addEventListener('change', () => { currentPageNom = 0; loadNominas(); }));
  document.getElementById('genEmpleado')?.addEventListener('change', function() { desgloseData = null; ocultarDesglose(); });
  document.getElementById('deduccionModal')?.addEventListener('hidden.bs.modal', () => { editingDeduccionId = null; });
  document.getElementById('btnNuevaComisionNomina')?.addEventListener('click', () => openComisionNomina(null));
  document.getElementById('btnGuardarComisionNomina')?.addEventListener('click', saveComisionNomina);
  document.getElementById('searchComisionNomina')?.addEventListener('input', Utils.debounce(() => { currentPageComNom = 0; loadComisionesNomina(); }, 300));
  document.getElementById('filterEstadoComisionNomina')?.addEventListener('change', () => { currentPageComNom = 0; loadComisionesNomina(); });
  ['filterComisionNominaDesde', 'filterComisionNominaHasta'].forEach(id => document.getElementById(id)?.addEventListener('change', () => { currentPageComNom = 0; loadComisionesNomina(); }));
}

/* ============ DESGLOSE / GENERAR ============ */

async function loadEmpleadosSelect(selectId, selectedId) {
  const select = document.getElementById(selectId);
  if (!select) return;
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
  } catch (_) {
    select.innerHTML = '<option value="">Error al cargar</option>';
  }
}

function ocultarDesglose() {
  const section = document.getElementById('desgloseSection');
  if (section) section.style.display = 'none';
}

async function cargarDesglose() {
  const usuarioId = document.getElementById('genEmpleado').value;
  if (!usuarioId) {
    Utils.showToast('Selecciona un empleado', 'warning');
    return;
  }
  document.getElementById('btnCargarDesglose').disabled = true;
  try {
    desgloseData = await API.get('/nomina/desglose/' + usuarioId);
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
  const setText = (id, value) => { const element = document.getElementById(id); if (element) element.textContent = value; };
  setText('desgloseSueldoSemanal', Utils.formatCurrency(d.sueldoSemanal));
  setText('desgloseTotalComisiones', Utils.formatCurrency(d.totalComisiones));
  setText('desgloseTotalDeducciones', Utils.formatCurrency(d.totalDeducciones));

  const comisiones = d.comisiones || [];
  const deducciones = d.deducciones || [];

  const comList = document.getElementById('comisionesList');
  if (!comList) return;
  if (!comisiones.length) {
    comList.innerHTML = '<small class="text-muted">Sin comisiones pendientes</small>';
  } else {
    comList.innerHTML = comisiones.map(c =>
      '<div class="form-check mb-2">' +
        '<input class="form-check-input gen-comision" type="checkbox" checked value="' + c.id + '" data-monto="' + (c.montoComision || 0) + '" id="comision_' + c.id + '">' +
        '<label class="form-check-label" for="comision_' + c.id + '">' +
          (c.ventaId ? 'Venta #' + c.ventaId + ' — ' : 'Comisión #' + c.id + ' — ') +
          Utils.formatCurrency(c.montoComision) +
        '</label>' +
      '</div>'
    ).join('');
  }
  setText('comisionesCount', '(' + comisiones.length + ')');

  const dedList = document.getElementById('deduccionesList');
  if (!dedList) return;
  if (!deducciones.length) {
    dedList.innerHTML = '<small class="text-muted">Sin deducciones pendientes</small>';
  } else {
    dedList.innerHTML = deducciones.map(dd =>
      '<div class="form-check mb-2">' +
        '<input class="form-check-input gen-deduccion" type="checkbox" checked data-estado="' + (dd.estado || '') + '" data-origen="' + (dd.origen || '') + '" value="' + dd.id + '" data-monto="' + (dd.monto || 0) + '" id="deduccion_' + dd.id + '">' +
        '<label class="form-check-label" for="deduccion_' + dd.id + '">' +
          Utils.esc(dd.concepto || 'Deducción #' + dd.id) + ' — ' +
          Utils.formatCurrency(dd.monto) +
        '</label>' +
      '</div>'
    ).join('');
  }
  setText('deduccionesCount', '(' + deducciones.length + ')');

  document.querySelectorAll('.gen-comision, .gen-deduccion').forEach(cb => cb.addEventListener('change', async () => {
    if (cb.checked && cb.classList.contains('gen-deduccion') && cb.dataset.estado === 'PENDIENTE' && cb.dataset.origen === 'ASISTENCIA') {
      try {
        await API.post('/deduccion/' + cb.value + '/aprobar', {});
        cb.dataset.estado = 'APROBADA';
        Utils.showToast('Incidencia aprobada automáticamente', 'success');
      } catch (e) {
        cb.checked = false;
        Utils.showToast('No se pudo aprobar la incidencia: ' + e.message, 'error');
      }
    }
    recalcNeto();
  }));

  const section = document.getElementById('desgloseSection');
  if (section) section.style.display = 'block';
  recalcNeto();
}

function recalcNeto() {
  const d = desgloseData;
  if (!d) return;
  const base = parseFloat(d.sueldoSemanal) || 0;
  let totalCom = 0;
  document.querySelectorAll('.gen-comision:checked').forEach(cb => {
    totalCom += parseFloat(cb.dataset.monto) || 0;
  });
  let totalDed = 0;
  document.querySelectorAll('.gen-deduccion:checked').forEach(cb => {
    totalDed += parseFloat(cb.dataset.monto) || 0;
  });
  const neto = base + totalCom - totalDed;
  const total = document.getElementById('desgloseNeto');
  if (total) total.textContent = Utils.formatCurrency(neto);
}

async function generarNomina() {
  const usuarioId = document.getElementById('genEmpleado').value;
  const fecha = document.getElementById('genFecha').value;
  if (!usuarioId) {
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
    const generated = await API.post('/nomina', {
      fecha_nomina: fecha,
      usuarioId: parseInt(usuarioId),
      comisionIds: comisionIds,
      deduccionIds: deduccionIds,
    });
    Utils.showToast('Nómina generada. Asiento contable creado automáticamente.', 'success');
    ocultarDesglose();
    desgloseData = null;
    currentPageNom = 0;
    loadNominas();
    mostrarModalImpresion(generated?.id);
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
    const state = document.getElementById('filterEstadoNomina')?.value || '';
    const desde = document.getElementById('filterNominaDesde')?.value || '';
    const hasta = document.getElementById('filterNominaHasta')?.value || '';
    if (state) params += '&estado=' + state;
    if (desde) params += '&desde=' + desde;
    if (hasta) params += '&hasta=' + hasta;
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
    const acciones = '<button type="button" class="btn-kebab-toggle kebab-trigger" data-id="' + item.id + '" title="Acciones"><i class="fas fa-ellipsis-v"></i></button>';
    return '<tr>' +
      '<td>' + item.id + '</td>' +
      '<td>' + Utils.formatDate(item.fecha_nomina) + '</td>' +
      '<td>' + Utils.esc(item.usuarioNombre || item.usuarioId || '-') + '</td>' +
      '<td>' + Utils.formatCurrency(item.sueldoSemanal) + '</td>' +
      '<td>' + Utils.formatCurrency(item.totalComisiones) + '</td>' +
      '<td>' + Utils.formatCurrency(item.totalDeducciones) + '</td>' +
      '<td><strong>' + Utils.formatCurrency(item.sueldo) + '</strong></td>' +
      '<td>' + estadoBadge(item.estado) + '</td>' +
      '<td class="acciones-cell">' + acciones + '</td>' +
    '</tr>';
  }).join('');

  tbody.querySelectorAll('.kebab-trigger').forEach(button => button.addEventListener('click', event => {
    event.stopPropagation();
    button.classList.add('show');
    const item = list.find(row => row.id == button.dataset.id);
    const actions = [{ icon: 'fa-eye', text: 'Ver detalle', onClick: () => verNomina(item) }, { icon: 'fa-print', text: 'Imprimir nómina', onClick: () => imprimirRecibo(item.id) }, { icon: 'fa-file-pdf', text: 'Descargar recibo PDF', onClick: () => descargarRecibo(item.id) }];
    if (item?.estado === 'GENERADA') actions.push({ icon: 'fa-ban', text: 'Cancelar nómina', onClick: () => cancelarNomina(parseInt(button.dataset.id)) });
    actions.push({ icon: 'fa-trash', text: 'Eliminar nómina', danger: true, onClick: () => deleteNomina(parseInt(button.dataset.id)) });
    Utils.abrirMenuKebab(button, actions);
  }));
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

async function verNomina(item) {
  if (!item) return;
  const asiento = item.asientoId ? item.asientoId : 'Auto generado';
  let desglose = null;
  try { desglose = await API.get('/nomina/' + item.id + '/desglose'); } catch (_) { /* El resumen sigue disponible. */ }
  const percepciones = '<div class="mt-3"><strong>Percepciones</strong><div class="small mt-1">' +
    '<div class="d-flex justify-content-between"><span>Sueldo base</span><span>' + Utils.formatCurrency(item.sueldoBase) + '</span></div>' +
    ((desglose?.comisiones || []).map(c => '<div class="d-flex justify-content-between"><span>' + Utils.esc(c.concepto || 'Comisión') + '</span><span>+' + Utils.formatCurrency(c.montoComision).replace('$', '') + '</span></div>').join('')) + '</div></div>';
  const deducciones = '<div class="mt-3"><strong>Deducciones</strong><div class="small mt-1">' +
    ((desglose?.deducciones || []).length ? desglose.deducciones.map(d => '<div class="d-flex justify-content-between"><span>' + Utils.esc(d.concepto || 'Deducción') + '</span><span>-' + Utils.formatCurrency(d.monto).replace('$', '') + '</span></div>').join('') : '<div class="text-muted">Sin deducciones</div>') + '</div></div>';
  Utils.showDialog('N&oacute;mina #' + item.id,
    '<div class="row g-2">' +
      '<div class="col-6"><small class="text-muted">Fecha</small><div><strong>' + Utils.formatDate(item.fecha_nomina) + '</strong></div></div>' +
      '<div class="col-6"><small class="text-muted">Usuario</small><div><strong>' + Utils.esc(item.usuarioNombre || '-') + '</strong></div></div>' +
       '<div class="col-6"><small class="text-muted">Sueldo semanal</small><div>' + Utils.formatCurrency(item.sueldoSemanal) + '</div></div>' +
      '<div class="col-6"><small class="text-muted">Comisiones</small><div style="color:var(--success)">+' + Utils.formatCurrency(item.totalComisiones).replace('$', '') + '</div></div>' +
      '<div class="col-6"><small class="text-muted">Deducciones</small><div style="color:var(--danger)">-' + Utils.formatCurrency(item.totalDeducciones).replace('$', '') + '</div></div>' +
      '<div class="col-6"><small class="text-muted">Total neto</small><div><strong>' + Utils.formatCurrency(item.sueldo) + '</strong></div></div>' +
      '<div class="col-6"><small class="text-muted">Estado</small><div>' + estadoBadge(item.estado) + '</div></div>' +
      '<div class="col-6"><small class="text-muted">Asiento contable</small><div>' + Utils.esc(asiento) + '</div></div>' +
       '</div>' + percepciones + deducciones
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

async function descargarRecibo(id) {
  try {
    const blob = await API.download('/nomina/' + id + '/pdf');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = 'nomina-' + id + '.pdf'; link.click();
    URL.revokeObjectURL(url);
  } catch (e) { Utils.showToast('Error al generar recibo: ' + e.message, 'error'); }
}

function mostrarModalImpresion(id) {
  if (!id) return;
  const modal = document.getElementById('nominaImpresionModal');
  if (!modal) return;
  modal.dataset.nominaId = id;
  const texto = document.getElementById('nominaImpresionTexto');
  if (texto) texto.textContent = 'La nómina #' + id + ' fue generada correctamente. ¿Deseas imprimirla ahora?';
  bootstrap.Modal.getOrCreateInstance(modal).show();
}

async function imprimirRecibo(id) {
  try {
    const blob = await API.download('/nomina/' + id + '/pdf');
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (!printWindow) {
      Utils.showToast('Permite las ventanas emergentes para imprimir la nómina', 'warning');
      URL.revokeObjectURL(url);
      return;
    }
    printWindow.addEventListener('load', () => printWindow.print());
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) { Utils.showToast('Error al imprimir recibo: ' + e.message, 'error'); }
}

/* ============ TAB DEDUCCIONES ============ */

async function loadDeducciones() {
  const tbody = document.getElementById('tableDeduccionesBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="fas fa-minus-circle"></i><p>Cargando...</p></div></td></tr>';
  try {
    await API.generarDeduccionesPrestamos(new Date().toISOString().split('T')[0]);
    await sincronizarDeduccionesAsistencia();
    const q = document.getElementById('searchDeduccion')?.value?.trim() || '';
    let params = '?page=' + currentPageDed + '&size=' + PAGE_SIZE + '&sort=id,desc';
    if (q) params += '&search=' + encodeURIComponent(q);
    const state = document.getElementById('filterEstadoDeduccion')?.value || '';
    const origin = document.getElementById('filterOrigenDeduccion')?.value || '';
    if (state) params += '&estado=' + state;
    if (origin) params += '&origen=' + origin;
    const employee = document.getElementById('filterEmpleadoDeduccion')?.value || '';
    const desde = document.getElementById('filterDeduccionDesde')?.value || '';
    const hasta = document.getElementById('filterDeduccionHasta')?.value || '';
    if (employee) params += '&usuarioId=' + employee;
    if (desde) params += '&desde=' + desde;
    if (hasta) params += '&hasta=' + hasta;
    const resp = await API.get('/deduccion' + params);
    renderDeducciones(resp);
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Error: ' + e.message + '</p></div></td></tr>';
  }
}

async function sincronizarDeduccionesAsistencia() {
  try {
    const today = new Date();
    const inicio = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-01';
    const fin = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    const response = await API.get('/usuarios');
    const users = Array.isArray(response) ? response : (response.content || []);
    await Promise.all(users.map(user => {
      const id = user.idUsuario ?? user.id;
      return id ? API.generarDeduccionesAsistencia(id, inicio, fin).catch(() => null) : null;
    }));
  } catch (_) {
    // La consulta de deducciones sigue funcionando aunque algún usuario no tenga horario.
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
      '<td>' + Utils.esc(item.usuarioNombre || item.usuarioId || '-') + '</td>' +
      '<td>' + Utils.esc(item.concepto || '-') + '</td>' +
      '<td>' + Utils.formatCurrency(item.monto) + '</td>' +
      '<td>' + Utils.formatDate(item.fecha) + '</td>' +
      '<td>' + (item.corteCajaId ? '#' + item.corteCajaId : '-') + '</td>' +
      '<td>' + estadoBadge(item.estado) + '</td>' +
       '<td class="acciones-cell"><button type="button" class="btn-kebab-toggle kebab-trigger" data-id="' + item.id + '" title="Acciones"><i class="fas fa-ellipsis-v"></i></button></td>' +
    '</tr>'
  ).join('');

  tbody.querySelectorAll('.kebab-trigger').forEach(button => button.addEventListener('click', event => {
    event.stopPropagation();
    button.classList.add('show');
    const item = list.find(row => row.id == button.dataset.id);
    const actions = [];
    if (item?.origen === 'ASISTENCIA' && item.estado === 'PENDIENTE') {
      actions.push({ icon: 'fa-check', text: 'Aprobar deducción', onClick: () => revisarDeduccion(item.id, true) });
      actions.push({ icon: 'fa-times', text: 'Rechazar deducción', danger: true, onClick: () => revisarDeduccion(item.id, false) });
    }
    actions.push({ icon: 'fa-edit', text: 'Editar deducción', onClick: () => openDeduccionModal(parseInt(button.dataset.id)) });
    actions.push({ icon: 'fa-trash', text: 'Eliminar deducción', danger: true, onClick: () => deleteDeduccion(parseInt(button.dataset.id)) });
    Utils.abrirMenuKebab(button, [
      ...actions,
    ]);
  }));
  renderPaginacionDed();
}

async function revisarDeduccion(id, approve) {
  try {
    await API.post('/deduccion/' + encodeURIComponent(id) + '/' + (approve ? 'aprobar' : 'rechazar'), {});
    Utils.showToast(approve ? 'Deducción aprobada' : 'Deducción rechazada', 'success');
    loadDeducciones();
  } catch (e) {
    Utils.showToast('Error: ' + e.message, 'error');
  }
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
      loadEmpleadosSelect('deduccionEmpleado', d.usuarioId ? parseInt(d.usuarioId) : null);
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
      usuarioId: parseInt(document.getElementById('deduccionEmpleado').value) || null,
    concepto: document.getElementById('deduccionConcepto').value.trim(),
    monto: parseFloat(document.getElementById('deduccionMonto').value) || 0,
    fecha: document.getElementById('deduccionFecha').value,
    corteCajaId: parseInt(document.getElementById('deduccionCorte').value) || null,
  };
  if (!data.usuarioId || !data.concepto || !data.monto) {
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

async function loadComisionesNomina() {
  const tbody = document.getElementById('tableComisionesNominaBody');
  if (!tbody) return;
  try {
    const q = document.getElementById('searchComisionNomina')?.value?.trim() || '';
    const state = document.getElementById('filterEstadoComisionNomina')?.value || '';
    const desde = document.getElementById('filterComisionNominaDesde')?.value || '';
    const hasta = document.getElementById('filterComisionNominaHasta')?.value || '';
    const resp = await API.get('/comision?page=' + currentPageComNom + '&size=20&sort=idComision,desc' + (q ? '&search=' + encodeURIComponent(q) : '') + (state ? '&estadoComision=' + state : '') + (desde ? '&desde=' + desde : '') + (hasta ? '&hasta=' + hasta : ''));
    const list = resp.content || [];
    tbody.innerHTML = list.length ? list.map(c => '<tr><td>' + c.id + '</td><td>' + Utils.esc(c.usuarioNombre || '-') + '</td><td>' + Utils.esc(c.concepto || '-') + '</td><td>' + Utils.esc(c.tipoComision || '-') + '</td><td>' + Utils.formatCurrency(c.montoComision) + '</td><td>' + estadoBadge(c.estadoComision) + '</td><td><button class="btn btn-sm btn-outline-secondary me-1 edit-comision-nomina" data-id="' + c.id + '"><i class="fas fa-edit"></i></button><button class="btn btn-sm btn-outline-danger delete-comision-nomina" data-id="' + c.id + '"><i class="fas fa-trash"></i></button></td></tr>').join('') : '<tr><td colspan="7"><div class="empty-state"><i class="fas fa-percent"></i><p>No hay comisiones</p></div></td></tr>';
    tbody.querySelectorAll('.edit-comision-nomina').forEach(b => b.addEventListener('click', () => openComisionNomina(Number(b.dataset.id))));
    tbody.querySelectorAll('.delete-comision-nomina').forEach(b => b.addEventListener('click', () => deleteComisionNomina(Number(b.dataset.id))));
    const pagination = document.getElementById('paginationComisionesNomina');
    if (pagination) pagination.innerHTML = resp.totalPages > 1 ? '<button class="btn btn-sm btn-outline-secondary" id="prevComNom" ' + (currentPageComNom === 0 ? 'disabled' : '') + '>Anterior</button> <span class="mx-2">Página ' + (currentPageComNom + 1) + ' de ' + resp.totalPages + '</span><button class="btn btn-sm btn-outline-secondary" id="nextComNom" ' + (currentPageComNom >= resp.totalPages - 1 ? 'disabled' : '') + '>Siguiente</button>' : '';
    document.getElementById('prevComNom')?.addEventListener('click', () => { currentPageComNom--; loadComisionesNomina(); });
    document.getElementById('nextComNom')?.addEventListener('click', () => { currentPageComNom++; loadComisionesNomina(); });
  } catch (e) { tbody.innerHTML = '<tr><td colspan="7">Error: ' + Utils.esc(e.message) + '</td></tr>'; }
}

async function openComisionNomina(id) {
  document.getElementById('comisionNominaId').value = id || '';
  document.getElementById('comisionNominaConcepto').value = '';
  document.getElementById('comisionNominaTipo').value = 'VENTA';
  document.getElementById('comisionNominaMonto').value = '';
  await loadEmpleadosSelect('comisionNominaEmpleado');
  if (id) {
    const c = await API.get('/comision/' + id);
    document.getElementById('comisionNominaEmpleado').value = c.usuarioId || '';
    document.getElementById('comisionNominaConcepto').value = c.concepto || '';
    document.getElementById('comisionNominaTipo').value = c.tipoComision || 'VENTA';
    document.getElementById('comisionNominaMonto').value = c.montoComision || '';
  }
  document.getElementById('comisionNominaModalTitle').textContent = id ? 'Editar Comisión' : 'Nueva Comisión';
  new bootstrap.Modal(document.getElementById('comisionNominaModal')).show();
}

async function saveComisionNomina() {
  const id = document.getElementById('comisionNominaId').value;
  const data = { usuarioId: Number(document.getElementById('comisionNominaEmpleado').value), concepto: document.getElementById('comisionNominaConcepto').value.trim(), tipoComision: document.getElementById('comisionNominaTipo').value, monto: Number(document.getElementById('comisionNominaMonto').value) };
  if (!data.usuarioId || data.monto <= 0 || !data.concepto) { Utils.showToast('Empleado, concepto y monto son obligatorios', 'warning'); return; }
  try { if (id) await API.put('/comision/' + id, data); else await API.post('/comision', data); bootstrap.Modal.getInstance(document.getElementById('comisionNominaModal'))?.hide(); loadComisionesNomina(); Utils.showToast('Comisión guardada', 'success'); } catch (e) { Utils.showToast('Error: ' + e.message, 'error'); }
}

async function deleteComisionNomina(id) {
  if (!(await Utils.confirmAction('¿Eliminar esta comisión?', 'Confirmar', 'Eliminar'))) return;
  try { await API.del('/comision/' + id); loadComisionesNomina(); Utils.showToast('Comisión eliminada', 'success'); } catch (e) { Utils.showToast('Error: ' + e.message, 'error'); }
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
