window.initUsuarios = function() {
    loadUsuarios();
};

async function loadUsuarios() {
    showLoading();
    try {
        const data = await api.getUsuarios();
        renderUsuariosTable(data);
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        showToast('Error al cargar usuarios: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function renderUsuariosTable(data) {
    const items = data.map(u => `
        <tr>
            <td>${u.idUsuario}</td>
            <td>${u.username}</td>
            <td>${u.nombre || ''} ${u.primerApellido || ''} ${u.segundoApellido || ''}</td>
            <td><span class="status-badge" style="background:${u.rol === 'ADMIN' ? 'var(--danger)' : u.rol === 'ALMACEN' ? 'var(--warning)' : 'var(--info)'};color:white;">${u.rol}</span></td>
            <td><span class="status-badge ${u.activo ? 'active' : 'inactive'}">${u.activo ? 'Activo' : 'Inactivo'}</span></td>
            <td>${u.fechaRegistro ? new Date(u.fechaRegistro).toLocaleDateString('es-MX') : '-'}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn edit" onclick="editUsuario(${u.idUsuario})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteUsuario(${u.idUsuario})" title="Desactivar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    const html = `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Gestión de Usuarios</h3>
                <button class="btn btn-primary" onclick="openUsuarioModal()">
                    <i class="fas fa-plus"></i> Nuevo Usuario
                </button>
            </div>
            <div class="card-body">
                ${data.length === 0 ? `
                    <div class="empty-state">
                        <i class="fas fa-users"></i>
                        <h3>No hay usuarios</h3>
                        <p>Comienza creando un nuevo usuario</p>
                        <button class="btn btn-primary" onclick="openUsuarioModal()">
                            <i class="fas fa-plus"></i> Nuevo Usuario
                        </button>
                    </div>
                ` : `
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Usuario</th>
                                    <th>Nombre</th>
                                    <th>Rol</th>
                                    <th>Estado</th>
                                    <th>Registro</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items}
                            </tbody>
                        </table>
                    </div>
                `}
            </div>
        </div>
    `;

    document.getElementById('pageContent').innerHTML = html;
}

window.openUsuarioModal = function() {
    openModal('Nuevo Usuario', `
        <form id="usuarioForm">
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Nombre *</label>
                    <input type="text" class="form-control" name="nombre" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Primer Apellido *</label>
                    <input type="text" class="form-control" name="primerApellido" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Segundo Apellido</label>
                    <input type="text" class="form-control" name="segundoApellido">
                </div>
                <div class="form-group">
                    <label class="form-label">Tipo de Persona *</label>
                    <select class="form-control" name="personType" required>
                        <option value="USUARIO">Usuario</option>
                        <option value="EMPLEADO">Empleado</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Usuario (email) *</label>
                    <input type="email" class="form-control" name="username" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Contraseña *</label>
                    <input type="password" class="form-control" name="password" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Rol *</label>
                    <select class="form-control" name="role" required>
                        <option value="USER">Usuario</option>
                        <option value="ALMACEN">Almacén</option>
                        <option value="ADMIN">Administrador</option>
                    </select>
                </div>
            </div>
        </form>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveUsuario()">Guardar</button>
    `);
};

window.saveUsuario = async function() {
    const form = document.getElementById('usuarioForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    try {
        showLoading();
        await api.createUsuario(data);
        showToast('Usuario creado exitosamente', 'success');
        closeModal();
        loadUsuarios();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.editUsuario = async function(id) {
    try {
        const u = await api.getUsuario(id);
        openModal('Editar Usuario', `
            <form id="usuarioForm">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Nombre</label>
                        <input type="text" class="form-control" name="nombre" value="${u.nombre || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Primer Apellido</label>
                        <input type="text" class="form-control" name="primerApellido" value="${u.primerApellido || ''}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Segundo Apellido</label>
                        <input type="text" class="form-control" name="segundoApellido" value="${u.segundoApellido || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Rol</label>
                        <select class="form-control" name="role" required>
                            <option value="USER" ${u.rol === 'USER' ? 'selected' : ''}>Usuario</option>
                            <option value="ALMACEN" ${u.rol === 'ALMACEN' ? 'selected' : ''}>Almacén</option>
                            <option value="ADMIN" ${u.rol === 'ADMIN' ? 'selected' : ''}>Administrador</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Tipo Persona</label>
                        <select class="form-control" name="personType">
                            <option value="USUARIO" ${u.tipoPersona === 'USUARIO' ? 'selected' : ''}>Usuario</option>
                            <option value="EMPLEADO" ${u.tipoPersona === 'EMPLEADO' ? 'selected' : ''}>Empleado</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" style="display:flex;align-items:center;gap:8px;margin-top:24px;">
                            <input type="checkbox" name="activo" ${u.activo ? 'checked' : ''}> Activo
                        </label>
                    </div>
                </div>
            </form>
        `, `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="updateUsuario(${id})">Actualizar</button>
        `);
    } catch (error) {
        showToast(error.message, 'error');
    }
};

window.updateUsuario = async function(id) {
    const form = document.getElementById('usuarioForm');
    const formData = new FormData(form);
    const role = formData.get('role');
    const personType = formData.get('personType');
    const activo = form.querySelector('input[name="activo"]').checked;
    const data = {
        nombre: formData.get('nombre') || null,
        primerApellido: formData.get('primerApellido') || null,
        segundoApellido: formData.get('segundoApellido') || null,
        role: role || null,
        personType: personType || null,
        activo: activo
    };

    try {
        showLoading();
        await api.updateUsuario(id, data);
        showToast('Usuario actualizado exitosamente', 'success');
        closeModal();
        loadUsuarios();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.deleteUsuario = async function(id) {
    if (!confirm('¿Estás seguro de desactivar este usuario?')) return;

    try {
        showLoading();
        await api.deleteUsuario(id);
        showToast('Usuario desactivado exitosamente', 'success');
        loadUsuarios();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};
