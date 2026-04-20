// ========================================
// BC Systems - Módulo Empleados
// ========================================

window.initEmpleados = function() {
    loadEmpleados(0);
};

async function loadEmpleados(page = 0) {
    showLoading();
    try {
        const data = await api.getEmpleados(page, paginationState.size, paginationState.sortBy, paginationState.sortDir);
        renderEmpleadosTable(data);
    } catch (error) {
        console.error('Error cargando empleados:', error);
        showToast('Error al cargar empleados: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function renderEmpleadosTable(data) {
    const items = data.content.map(item => {
        const fullName = [item.nombre, item.primerApellido, item.segundoApellido].filter(Boolean).join(' ');
        return `
        <tr>
            <td>${item.id}</td>
            <td>${fullName}</td>
            <td>${item.position || '-'}</td>
            <td><span class="status-badge ${item.activo ? 'active' : 'inactive'}">${item.activo ? 'Activo' : 'Inactivo'}</span></td>
            <td>
                <div class="action-btns">
                    <button class="action-btn edit" onclick="editEmpleado(${item.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </td>
        </tr>
    `; }).join('');

    const html = `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Gestión de Empleados</h3>
                <button class="btn btn-primary" onclick="openEmpleadoModal()">
                    <i class="fas fa-plus"></i> Nuevo Empleado
                </button>
            </div>
            <div class="card-body">
                <div class="table-toolbar">
                    <div class="table-toolbar-left">
                        <div class="search-box">
                            <i class="fas fa-search"></i>
                            <input type="text" placeholder="Buscar empleado...">
                        </div>
                    </div>
                    <div class="table-toolbar-right">
                        <select class="select-control" onchange="changePageSize(this.value, 'empleados')">
                            <option value="10">10 por página</option>
                            <option value="20" selected>20 por página</option>
                            <option value="30">30 por página</option>
                        </select>
                    </div>
                </div>
                ${data.content.length === 0 ? `
                    <div class="empty-state">
                        <i class="fas fa-user-tie"></i>
                        <h3>No hay empleados</h3>
                        <p>Comienza agregando un nuevo empleado</p>
                        <button class="btn btn-primary" onclick="openEmpleadoModal()">
                            <i class="fas fa-plus"></i> Nuevo Empleado
                        </button>
                    </div>
                ` : `
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Nombre</th>
                                    <th>Puesto</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items}
                            </tbody>
                        </table>
                    </div>
                    ${renderPagination(data, 'empleados')}
                `}
            </div>
        </div>
    `;

    document.getElementById('pageContent').innerHTML = html;
}

window.openEmpleadoModal = function() {
    openModal('Nuevo Empleado', `
        <form id="empleadoForm">
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Nombre</label>
                    <input type="text" class="form-control" name="nombre" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Primer Apellido</label>
                    <input type="text" class="form-control" name="primerApellido" required>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Segundo Apellido</label>
                <input type="text" class="form-control" name="segundoApellido" placeholder="Opcional">
            </div>
            <div class="form-group">
                <label class="form-label">Puesto</label>
                <select class="form-control" name="position" required>
                    <option value="VENDEDOR">Vendedor</option>
                    <option value="TECNICO">Técnico</option>
                    <option value="COBRANZA">Cobranza</option>
                </select>
            </div>
        </form>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveEmpleado()">Guardar</button>
    `);
};

window.saveEmpleado = async function() {
    const form = document.getElementById('empleadoForm');
    const formData = new FormData(form);
    const data = {
        nombre: (formData.get('nombre') || '').trim(),
        primerApellido: (formData.get('primerApellido') || '').trim(),
        segundoApellido: (formData.get('segundoApellido') || '').trim() || null,
        position: formData.get('position'),
        personType: 'EMPLEADO'
    };

    try {
        showLoading();
        await api.createEmpleado(data);
        showToast('Empleado creado exitosamente', 'success');
        closeModal();
        loadEmpleados();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.editEmpleado = async function(id) {
    try {
        const empleado = await api.getEmpleado(id);
        openModal('Editar Empleado', `
            <form id="empleadoForm">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Nombre</label>
                        <input type="text" class="form-control" name="nombre" value="${empleado.nombre || ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Primer Apellido</label>
                        <input type="text" class="form-control" name="primerApellido" value="${empleado.primerApellido || ''}" required>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Segundo Apellido</label>
                    <input type="text" class="form-control" name="segundoApellido" value="${empleado.segundoApellido || ''}" placeholder="Opcional">
                </div>
                <div class="form-group">
                    <label class="form-label">Puesto</label>
                    <select class="form-control" name="position" required>
                        <option value="VENDEDOR" ${empleado.position === 'VENDEDOR' ? 'selected' : ''}>Vendedor</option>
                        <option value="TECNICO" ${empleado.position === 'TECNICO' ? 'selected' : ''}>Técnico</option>
                        <option value="COBRANZA" ${empleado.position === 'COBRANZA' ? 'selected' : ''}>Cobranza</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">
                        <input type="checkbox" name="activo" ${empleado.activo ? 'checked' : ''}> Activo
                    </label>
                </div>
            </form>
        `, `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="updateEmpleado(${id})">Actualizar</button>
        `);
    } catch (error) {
        showToast(error.message, 'error');
    }
};

window.updateEmpleado = async function(id) {
    const form = document.getElementById('empleadoForm');
    const formData = new FormData(form);
    const data = {
        nombre: (formData.get('nombre') || '').trim(),
        primerApellido: (formData.get('primerApellido') || '').trim(),
        segundoApellido: (formData.get('segundoApellido') || '').trim() || null,
        position: formData.get('position'),
        activo: form.querySelector('input[name="activo"]').checked,
        personType: 'EMPLEADO'
    };

    try {
        showLoading();
        await api.updateEmpleado(id, data);
        showToast('Empleado actualizado exitosamente', 'success');
        closeModal();
        loadEmpleados();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};
