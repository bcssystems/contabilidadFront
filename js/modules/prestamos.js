let page = 0;

export function init() {
  page = 0;
  document.getElementById('btnNuevoPrestamo')?.addEventListener('click', () => openModal());
  document.getElementById('btnGuardarPrestamo')?.addEventListener('click', save);
  document.getElementById('searchPrestamo')?.addEventListener('input', Utils.debounce(load, 300));
  document.getElementById('filterEstadoPrestamo')?.addEventListener('change', load);
  load();
}

async function load() {
  const body = document.getElementById('tablePrestamosBody');
  if (!body) return;
  try {
    await API.generarDeduccionesPrestamos(new Date().toISOString().split('T')[0]);
    const search = document.getElementById('searchPrestamo')?.value?.trim() || '';
    const state = document.getElementById('filterEstadoPrestamo')?.value || '';
    const response = await API.get('/prestamos?page=' + page + '&size=20' + (search ? '&search=' + encodeURIComponent(search) : '') + (state ? '&estado=' + state : ''));
    const list = response.content || [];
    body.innerHTML = list.length ? list.map(p => '<tr><td>' + p.id + '</td><td>' + Utils.esc(p.usuarioNombre || '-') + '</td><td>' + Utils.formatDate(p.fechaCreacion) + '</td><td>' + Utils.formatCurrency(p.montoPrincipal) + '</td><td>' + Utils.formatDate(p.fechaPrimerPago) + '</td><td>' + (p.tasaInteresPorcentaje || 0) + '%</td><td>' + p.numeroParcialidades + '</td><td>' + estado(p.estado) + '</td><td><button class="btn btn-sm btn-kebab-toggle prestamo-menu" data-id="' + p.id + '"><i class="fas fa-ellipsis-v"></i></button></td></tr>').join('') : '<tr><td colspan="9">No hay pr&eacute;stamos registrados.</td></tr>';
    body.querySelectorAll('.prestamo-menu').forEach(b => b.addEventListener('click', event => { event.stopPropagation(); const item = list.find(p => p.id === Number(b.dataset.id)); const actions = [{ icon: 'fa-eye', text: 'Ver parcialidades', onClick: () => detail(item.id) }]; if (item.estado === 'ACTIVO') { actions.unshift({ icon: 'fa-edit', text: 'Editar préstamo', onClick: () => edit(item.id) }); actions.push({ icon: 'fa-ban', text: 'Cancelar préstamo', danger: true, onClick: () => cancel(item.id) }); } Utils.abrirMenuKebab(b, actions); }));
  } catch (e) { body.innerHTML = '<tr><td colspan="9">Error: ' + Utils.esc(e.message) + '</td></tr>'; }
}

async function openModal() {
  await loadEmployees();
  const date = new Date();
  document.getElementById('prestamoId').value = '';
  document.getElementById('prestamoModalTitle').textContent = 'Nuevo préstamo';
  document.getElementById('prestamoEmpleado').disabled = false;
  document.getElementById('prestamoEmpleado').value = '';
  document.getElementById('prestamoMonto').value = '';
  document.getElementById('prestamoInteres').value = '0';
  document.getElementById('prestamoParcialidades').value = '';
  document.getElementById('prestamoPrimerPago').value = new Date(date.getTime() + 7 * 86400000).toISOString().split('T')[0];
  new bootstrap.Modal(document.getElementById('prestamoModal')).show();
}

async function loadEmployees() {
  const select = document.getElementById('prestamoEmpleado');
  const response = await API.get('/usuarios');
  const list = Array.isArray(response) ? response : response.content || [];
  select.innerHTML = '<option value="">Selecciona un empleado</option>' + list.map(e => '<option value="' + (e.idUsuario ?? e.id) + '">' + Utils.esc([e.nombre, e.primerApellido, e.segundoApellido].filter(Boolean).join(' ')) + '</option>').join('');
}

async function save() {
  const id = document.getElementById('prestamoId').value;
  const data = { montoPrincipal: Number(document.getElementById('prestamoMonto').value), tasaInteresPorcentaje: Number(document.getElementById('prestamoInteres').value) || 0, numeroParcialidades: Number(document.getElementById('prestamoParcialidades').value), fechaPrimerPago: document.getElementById('prestamoPrimerPago').value };
  if (!id) data.usuarioId = Number(document.getElementById('prestamoEmpleado').value);
  if (!data.usuarioId || data.montoPrincipal <= 0 || data.numeroParcialidades <= 0) { Utils.showToast('Completa los datos del préstamo', 'warning'); return; }
  try { if (id) await API.put('/prestamos/' + id, data); else await API.post('/prestamos', data); bootstrap.Modal.getInstance(document.getElementById('prestamoModal'))?.hide(); Utils.showToast(id ? 'Préstamo actualizado' : 'Préstamo creado', 'success'); load(); } catch (e) { Utils.showToast('Error: ' + e.message, 'error'); }
}

async function edit(id) {
  try {
    const p = await API.get('/prestamos/' + id);
    await loadEmployees();
    document.getElementById('prestamoId').value = id;
    document.getElementById('prestamoEmpleado').value = p.usuarioId;
    document.getElementById('prestamoEmpleado').disabled = true;
    document.getElementById('prestamoMonto').value = p.montoPrincipal;
    document.getElementById('prestamoInteres').value = p.tasaInteresPorcentaje || 0;
    document.getElementById('prestamoParcialidades').value = p.numeroParcialidades;
    document.getElementById('prestamoPrimerPago').value = p.fechaPrimerPago || '';
    document.getElementById('prestamoModalTitle').textContent = 'Editar préstamo';
    new bootstrap.Modal(document.getElementById('prestamoModal')).show();
  } catch (e) { Utils.showToast('Error: ' + e.message, 'error'); }
}

async function detail(id) {
  try { const p = await API.get('/prestamos/' + id); const rows = (p.parcialidades || []).map(x => '<tr><td>' + x.numero + '</td><td>' + Utils.formatDate(x.fechaVencimiento) + '</td><td>' + Utils.formatCurrency(x.monto) + '</td><td>' + estado(x.estado) + '</td></tr>').join(''); Utils.showDialog('Pr&eacute;stamo #' + id, '<p><strong>Empleado:</strong> ' + Utils.esc(p.usuarioNombre || '-') + '</p><p><strong>Saldo programado:</strong> ' + Utils.formatCurrency((p.parcialidades || []).reduce((s, x) => s + Number(x.monto || 0), 0)) + '</p><table class="table table-sm"><thead><tr><th>#</th><th>Vence</th><th>Monto</th><th>Estado</th></tr></thead><tbody>' + rows + '</tbody></table>'); } catch (e) { Utils.showToast('Error: ' + e.message, 'error'); }
}

async function cancel(id) { if (!(await Utils.confirmAction('¿Cancelar este préstamo?', 'Confirmar', 'Cancelar'))) return; try { await API.post('/prestamos/' + id + '/cancelar'); load(); Utils.showToast('Préstamo cancelado', 'success'); } catch (e) { Utils.showToast('Error: ' + e.message, 'error'); } }
function estado(value) { return '<span class="badge-status ' + (value === 'ACTIVO' ? 'badge-active' : value === 'LIQUIDADO' ? 'badge-active' : 'badge-inactive') + '">' + (value || '-') + '</span>'; }
