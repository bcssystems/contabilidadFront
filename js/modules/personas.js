let editingUsuarioId = null;

export function init() {
  loadUsuarios();
  bindEvents();
}

function bindEvents() {
  document.getElementById('btnNuevoUsuario')?.addEventListener('click', () => openUsuarioModal(null));
  document.getElementById('btnGuardarUsuario')?.addEventListener('click', saveUsuario);
  document.getElementById('usuarioModal')?.addEventListener('hidden.bs.modal', () => { editingUsuarioId = null; });
}

async function loadUsuarios() {
  const tbody = document.getElementById('tableUsuariosBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><i class="fas fa-users"></i><p>Cargando...</p></div></td></tr>';
  try {
    const data = await API.get('/usuarios');
    renderTable(Array.isArray(data) ? data : []);
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Error: ' + e.message + '</p></div></td></tr>';
  }
}

function renderTable(list) {
  const tbody = document.getElementById('tableUsuariosBody');
  if (!tbody) return;

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><i class="fas fa-users"></i><p>No hay usuarios</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = list.map(u => {
    const fullName = [u.nombre, u.primerApellido, u.segundoApellido].filter(Boolean).join(' ');
    const roleColor = u.rol === 'ADMIN' ? 'var(--danger)' : u.rol === 'ALMACEN' ? 'var(--warning)' : 'var(--info)';
    return '<tr>' +
      '<td>' + (u.idUsuario || u.id) + '</td>' +
      '<td>' + Utils.esc(u.username || '-') + '</td>' +
      '<td>' + Utils.esc(fullName) + '</td>' +
      '<td><span class="status-badge" style="background:' + roleColor + ';color:#fff;">' + Utils.esc(u.rol || '-') + '</span></td>' +
      '<td><span class="status-badge ' + (u.activo ? 'active' : 'inactive') + '">' + (u.activo ? 'Activo' : 'Inactivo') + '</span></td>' +
      '<td>' + (u.fechaRegistro ? Utils.formatDate(u.fechaRegistro) : '-') + '</td>' +
      '<td class="acciones-cell"><button type="button" class="btn-kebab-toggle kebab-trigger" data-id="' + (u.idUsuario || u.id) + '" title="Acciones"><i class="fas fa-ellipsis-v"></i></button></td>' +
    '</tr>';
  }).join('');

  tbody.querySelectorAll('.kebab-trigger').forEach(button => button.addEventListener('click', event => {
    event.stopPropagation();
    button.classList.add('show');
    Utils.abrirMenuKebab(button, [
      { icon: 'fa-edit', text: 'Editar usuario', onClick: () => openUsuarioModal(parseInt(button.dataset.id)) },
      { icon: 'fa-user-slash', text: 'Desactivar usuario', danger: true, onClick: () => deleteUsuario(parseInt(button.dataset.id)) },
    ]);
  }));
}

function openUsuarioModal(id) {
  editingUsuarioId = id;
  document.getElementById('usuarioId').value = '';
  document.getElementById('usuarioNombre').value = '';
  document.getElementById('usuarioApellido1').value = '';
  document.getElementById('usuarioApellido2').value = '';
  document.getElementById('usuarioTipoPersona').value = 'USUARIO';
  document.getElementById('usuarioUsername').value = '';
  document.getElementById('usuarioPassword').value = '';
  document.getElementById('usuarioPassword').required = true;
  document.getElementById('usuarioRol').value = 'USER';
  document.getElementById('usuarioActivo').checked = true;
  document.getElementById('credencialesSection').style.display = '';

  if (id) {
    document.getElementById('usuarioModalTitle').textContent = 'Editar Usuario';
    document.getElementById('btnGuardarUsuario').textContent = 'Actualizar';
    document.getElementById('usuarioPassword').required = false;
    document.getElementById('credencialesSection').style.display = 'none';
    API.get('/usuarios/' + id).then(u => {
      document.getElementById('usuarioNombre').value = u.nombre || '';
      document.getElementById('usuarioApellido1').value = u.primerApellido || '';
      document.getElementById('usuarioApellido2').value = u.segundoApellido || '';
      document.getElementById('usuarioTipoPersona').value = u.tipoPersona || 'USUARIO';
      document.getElementById('usuarioUsername').value = u.username || '';
      document.getElementById('usuarioRol').value = u.rol || 'USER';
      document.getElementById('usuarioActivo').checked = u.activo !== false;
      document.getElementById('usuarioId').value = id;
    }).catch(e => Utils.showToast('Error: ' + e.message, 'error'));
  } else {
    document.getElementById('usuarioModalTitle').textContent = 'Nuevo Usuario';
    document.getElementById('btnGuardarUsuario').textContent = 'Guardar';
    document.getElementById('credencialesSection').style.display = '';
  }
  new bootstrap.Modal(document.getElementById('usuarioModal')).show();
}

async function saveUsuario() {
  const id = document.getElementById('usuarioId').value;
  const data = {
    nombre: document.getElementById('usuarioNombre').value.trim(),
    primerApellido: document.getElementById('usuarioApellido1').value.trim(),
    segundoApellido: document.getElementById('usuarioApellido2').value.trim() || null,
    personType: document.getElementById('usuarioTipoPersona').value,
    role: document.getElementById('usuarioRol').value,
  };

  if (!data.nombre || !data.primerApellido) {
    Utils.showToast('Nombre y primer apellido son obligatorios', 'warning');
    return;
  }

  try {
    if (id) {
      data.activo = document.getElementById('usuarioActivo').checked;
      await API.put('/usuarios/' + id, data);
      Utils.showToast('Usuario actualizado', 'success');
    } else {
      data.username = document.getElementById('usuarioUsername').value.trim();
      data.password = document.getElementById('usuarioPassword').value;
      if (!data.username || !data.password) {
        Utils.showToast('Usuario y contrase&ntilde;a son obligatorios', 'warning');
        return;
      }
      await API.post('/usuarios', data);
      Utils.showToast('Usuario creado', 'success');
    }
    bootstrap.Modal.getInstance(document.getElementById('usuarioModal'))?.hide();
    loadUsuarios();
  } catch (e) {
    Utils.showToast('Error: ' + e.message, 'error');
  }
}

async function deleteUsuario(id) {
  const confirmed = await Utils.confirmAction('&iquest;Desactivar este usuario?', 'Confirmar', 'Desactivar');
  if (!confirmed) return;
  try {
    await API.del('/usuarios/' + id);
    Utils.showToast('Usuario desactivado', 'success');
    loadUsuarios();
  } catch (e) {
    Utils.showToast('Error: ' + e.message, 'error');
  }
}
