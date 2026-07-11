let editingSucursalId = null;

export function init() {
  loadSucursales();
  bindEvents();
}

function bindEvents() {
  document.getElementById('btnNuevaSucursal')?.addEventListener('click', () => openSucursalModal(null));
  document.getElementById('btnGuardarSucursal')?.addEventListener('click', saveSucursal);
  document.getElementById('sucursalModal')?.addEventListener('hidden.bs.modal', () => { editingSucursalId = null; });
}

async function loadSucursales() {
  const tbody = document.getElementById('tableSucursalesBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><i class="fas fa-store"></i><p>Cargando...</p></div></td></tr>';
  try {
    const data = await API.get('/sucursales');
    renderTable(Array.isArray(data) ? data : []);
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Error: ' + e.message + '</p></div></td></tr>';
  }
}

function renderTable(list) {
  const tbody = document.getElementById('tableSucursalesBody');
  if (!tbody) return;

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><i class="fas fa-store"></i><p>No hay sucursales</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = list.map(s =>
    '<tr class="' + (s.activa !== false ? '' : 'inactive-row') + '">' +
      '<td>' + Utils.esc(s.nombre || '-') + '</td>' +
      '<td>' + Utils.esc(s.direccion || '-') + '</td>' +
      '<td>' + Utils.esc(s.telefono || '-') + '</td>' +
      '<td><span class="status-badge ' + (s.activa !== false ? 'active' : 'inactive') + '">' + (s.activa !== false ? 'Activa' : 'Inactiva') + '</span></td>' +
      '<td>' +
        '<button class="btn btn-sm btn-outline-secondary me-1 btn-edit-suc" data-id="' + s.idSucursal + '"><i class="fas fa-edit"></i></button>' +
        '<button class="btn btn-sm btn-outline-danger btn-delete-suc" data-id="' + s.idSucursal + '"><i class="fas fa-trash"></i></button>' +
      '</td>' +
    '</tr>'
  ).join('');

  tbody.querySelectorAll('.btn-edit-suc').forEach(b => b.addEventListener('click', () => openSucursalModal(parseInt(b.dataset.id))));
  tbody.querySelectorAll('.btn-delete-suc').forEach(b => b.addEventListener('click', () => deleteSucursal(parseInt(b.dataset.id))));
}

function openSucursalModal(id) {
  editingSucursalId = id;
  document.getElementById('sucursalId').value = '';
  document.getElementById('sucursalNombre').value = '';
  document.getElementById('sucursalDireccion').value = '';
  document.getElementById('sucursalTelefono').value = '';
  document.getElementById('sucursalActiva').checked = true;

  if (id) {
    document.getElementById('sucursalModalTitle').textContent = 'Editar Sucursal';
    document.getElementById('btnGuardarSucursal').textContent = 'Actualizar';
    API.get('/sucursales/' + id).then(s => {
      document.getElementById('sucursalNombre').value = s.nombre || '';
      document.getElementById('sucursalDireccion').value = s.direccion || '';
      document.getElementById('sucursalTelefono').value = s.telefono || '';
      document.getElementById('sucursalActiva').checked = s.activa !== false;
      document.getElementById('sucursalId').value = id;
    }).catch(e => Utils.showToast('Error: ' + e.message, 'error'));
  } else {
    document.getElementById('sucursalModalTitle').textContent = 'Nueva Sucursal';
    document.getElementById('btnGuardarSucursal').textContent = 'Guardar';
  }
  new bootstrap.Modal(document.getElementById('sucursalModal')).show();
}

async function saveSucursal() {
  const id = document.getElementById('sucursalId').value;
  const data = {
    nombre: document.getElementById('sucursalNombre').value.trim(),
    direccion: document.getElementById('sucursalDireccion').value.trim(),
    telefono: document.getElementById('sucursalTelefono').value.trim(),
    activa: document.getElementById('sucursalActiva').checked,
  };
  if (!data.nombre) { Utils.showToast('El nombre es obligatorio', 'warning'); return; }
  try {
    if (id) {
      await API.put('/sucursales/' + id, data);
      Utils.showToast('Sucursal actualizada', 'success');
    } else {
      await API.post('/sucursales', data);
      Utils.showToast('Sucursal creada', 'success');
    }
    bootstrap.Modal.getInstance(document.getElementById('sucursalModal'))?.hide();
    loadSucursales();
  } catch (e) {
    Utils.showToast('Error: ' + e.message, 'error');
  }
}

async function deleteSucursal(id) {
  const confirmed = await Utils.confirmAction('&iquest;Desactivar esta sucursal?', 'Confirmar', 'Desactivar');
  if (!confirmed) return;
  try {
    await API.del('/sucursales/' + id);
    Utils.showToast('Sucursal desactivada', 'success');
    loadSucursales();
  } catch (e) {
    Utils.showToast('Error: ' + e.message, 'error');
  }
}
