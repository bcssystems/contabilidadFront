// ========================================
// BC Systems - Módulo Nómina
// ========================================

window.initNomina = function() {
    loadNominas(0);
};

async function loadNominas(page = 0) {
    showLoading();
    try {
        const data = await api.getNominas(page, paginationState.size, paginationState.sortBy, paginationState.sortDir);
        renderNominasTable(data);
    } catch (error) {
        console.error('Error cargando nóminas:', error);
        showToast('Error al cargar nóminas: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function renderNominasTable(data) {
    const items = data.content.map(item => `
        <tr>
            <td>${item.id}</td>
            <td>${item.fecha_nomina || '-'}</td>
            <td>${formatCurrency(item.sueldo)}</td>
            <td>${item.empleadoId || '-'}</td>
            <td>${item.asientoId ? item.asientoId : '<span class="text-muted">Auto</span>'}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn edit" onclick="editNomina(${item.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteNomina(${item.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    const html = `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Gestión de Nómina</h3>
                <button class="btn btn-primary" onclick="openNominaModal()">
                    <i class="fas fa-plus"></i> Nueva Nómina
                </button>
            </div>
            <div class="card-body">
                <div class="table-toolbar">
                    <div class="table-toolbar-left">
                        <div class="search-box">
                            <i class="fas fa-search"></i>
                            <input type="text" placeholder="Buscar nómina...">
                        </div>
                    </div>
                    <div class="table-toolbar-right">
                        <select class="select-control" onchange="changePageSize(this.value, 'nomina')">
                            <option value="10">10 por página</option>
                            <option value="20" selected>20 por página</option>
                            <option value="30">30 por página</option>
                        </select>
                    </div>
                </div>
                ${data.content.length === 0 ? `
                    <div class="empty-state">
                        <i class="fas fa-users"></i>
                        <h3>No hay nóminas</h3>
                        <p>Comienza registrando una nueva nómina</p>
                        <button class="btn btn-primary" onclick="openNominaModal()">
                            <i class="fas fa-plus"></i> Nueva Nómina
                        </button>
                    </div>
                ` : `
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Fecha</th>
                                    <th>Sueldo</th>
                                    <th>Empleado ID</th>
                                    <th>Asiento</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items}
                            </tbody>
                        </table>
                    </div>
                    ${renderPagination(data, 'nomina')}
                `}
            </div>
        </div>
    `;

    document.getElementById('pageContent').innerHTML = html;
}

async function loadNominaSelectData() {
    const [empleadosResult, asientosResult] = await Promise.allSettled([
        api.getEmpleados(0, 500, 'idEmpleado', 'asc'),
        api.getAsientosContables(0, 500, 'idAsientoContable', 'asc')
    ]);

    const data = {
        empleados: [],
        asientos: []
    };

    const missing = [];

    if (empleadosResult.status === 'fulfilled') {
        data.empleados = empleadosResult.value?.content || [];
    } else {
        console.error('Error cargando empleados para nómina:', empleadosResult.reason);
        missing.push('empleados');
    }

    if (asientosResult.status === 'fulfilled') {
        data.asientos = asientosResult.value?.content || [];
    } else {
        console.error('Error cargando asientos para nómina:', asientosResult.reason);
        missing.push('asientos');
    }

    if (missing.length) {
        showToast(`No se pudieron cargar ${missing.join(' y ')}.`, 'warning');
    }

    return data;
}

function buildEmpleadoOptions(empleados, selectedId = null) {
    const selectedValue = selectedId !== undefined && selectedId !== null ? Number(selectedId) : null;

    if (!empleados.length) {
        return '<option value="" disabled selected>No hay empleados disponibles</option>';
    }

    const options = [`<option value="" disabled ${selectedValue === null ? 'selected' : ''}>Selecciona un empleado</option>`];

    empleados.forEach(empleado => {
        const fullName = [empleado.nombre, empleado.primerApellido, empleado.segundoApellido].filter(Boolean).join(' ');
        const isSelected = selectedValue !== null && Number(empleado.id) === selectedValue ? 'selected' : '';
        options.push(`<option value="${empleado.id}" ${isSelected}>${fullName || 'Empleado sin nombre'} (#${empleado.id})</option>`);
    });

    return options.join('');
}

function buildAsientoOptions(asientos, selectedId = null) {
    const selectedValue = selectedId !== undefined && selectedId !== null ? Number(selectedId) : null;
    const options = [`<option value="" ${selectedValue === null ? 'selected' : ''}>Sin asiento contable</option>`];

    if (!asientos.length) {
        return options.join('');
    }

    asientos.forEach(asiento => {
        const labelParts = [`#${asiento.id}`];
        if (asiento.referencia) labelParts.push(asiento.referencia);
        if (asiento.descripcion) labelParts.push(asiento.descripcion);
        const label = labelParts.join(' - ');
        const isSelected = selectedValue !== null && Number(asiento.id) === selectedValue ? 'selected' : '';
        options.push(`<option value="${asiento.id}" ${isSelected}>${label}</option>`);
    });

    return options.join('');
}

window.openNominaModal = async function() {
    const today = new Date().toISOString().split('T')[0];
    let empleados = [];
    let asientos = [];

    try {
        showLoading();
        const data = await loadNominaSelectData();
        empleados = data.empleados;
        asientos = data.asientos;
    } catch (error) {
        console.error('Error preparando datos para nómina:', error);
        showToast('Ocurrió un error al cargar datos auxiliares.', 'error');
    } finally {
        hideLoading();
    }

    openModal('Nueva Nómina', `
        <form id="nominaForm">
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i> El asiento contable se generará automáticamente.
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Fecha</label>
                    <input type="date" class="form-control" name="fecha_nomina" value="${today}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Sueldo</label>
                    <input type="number" step="0.01" class="form-control" name="sueldo" required>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Empleado</label>
                <select class="form-control" name="empleadoId" required>
                    ${buildEmpleadoOptions(empleados)}
                </select>
            </div>
        </form>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveNomina()">Guardar</button>
    `);
};

window.saveNomina = async function() {
    const form = document.getElementById('nominaForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    data.sueldo = parseFloat(data.sueldo);
    data.empleadoId = data.empleadoId ? parseInt(data.empleadoId, 10) : null;
    // El asiento se genera automáticamente

    try {
        showLoading();
        await api.createNomina(data);
        showToast('Nómina creada exitosamente. Asiento contable generado automáticamente.', 'success');
        closeModal();
        loadNominas();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.editNomina = async function(id) {
    try {
        showLoading();
        const [nomina, selectData] = await Promise.all([
            api.getNomina(id),
            loadNominaSelectData()
        ]);

        openModal('Editar Nómina', `
            <form id="nominaForm">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Fecha</label>
                        <input type="date" class="form-control" name="fecha_nomina" value="${nomina.fecha_nomina || ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Sueldo</label>
                        <input type="number" step="0.01" class="form-control" name="sueldo" value="${nomina.sueldo}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Empleado</label>
                        <select class="form-control" name="empleadoId" required>
                            ${buildEmpleadoOptions(selectData.empleados, nomina.empleadoId)}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Asiento Contable</label>
                        <input type="text" class="form-control" value="${nomina.asientoId || 'Auto'}" disabled>
                    </div>
                </div>
            </form>
        `, `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="updateNomina(${id})">Actualizar</button>
        `);
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.updateNomina = async function(id) {
    const form = document.getElementById('nominaForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    data.sueldo = parseFloat(data.sueldo);
    data.empleadoId = data.empleadoId ? parseInt(data.empleadoId, 10) : null;
    // El asiento no se puede cambiar al editar

    try {
        showLoading();
        await api.updateNomina(id, data);
        showToast('Nómina actualizada exitosamente', 'success');
        closeModal();
        loadNominas();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.deleteNomina = async function(id) {
    if (!confirm('¿Estás seguro de eliminar esta nómina?')) return;
    
    try {
        showLoading();
        await api.deleteNomina(id);
        showToast('Nómina eliminada exitosamente', 'success');
        loadNominas();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};
