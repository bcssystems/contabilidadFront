// ========================================
// BC Systems - Módulo Gastos
// ========================================

window.initGastos = function() {
    loadGastos(0);
};

async function loadGastos(page = 0) {
    showLoading();
    try {
        const data = await api.getGastos(page, paginationState.size, paginationState.sortBy, paginationState.sortDir);
        renderGastosTable(data);
    } catch (error) {
        console.error('Error cargando gastos:', error);
        showToast('Error al cargar gastos: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function renderGastosTable(data) {
    const items = data.content.map(item => `
        <tr>
            <td>${item.id}</td>
            <td>${item.fecha_gasto || '-'}</td>
            <td>${item.concepto || '-'}</td>
            <td>${formatCurrency(item.monto)}</td>
            <td>${item.cuentaContableId ? item.cuentaContableId : '-'}</td>
            <td>${item.asientoId ? item.asientoId : '<span class="text-muted">Auto</span>'}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn edit" onclick="editGasto(${item.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteGasto(${item.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    const html = `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Gestión de Gastos</h3>
                <button class="btn btn-primary" onclick="openGastoModal()">
                    <i class="fas fa-plus"></i> Nuevo Gasto
                </button>
            </div>
            <div class="card-body">
                <div class="table-toolbar">
                    <div class="table-toolbar-left">
                        <div class="search-box">
                            <i class="fas fa-search"></i>
                            <input type="text" placeholder="Buscar gasto...">
                        </div>
                    </div>
                    <div class="table-toolbar-right">
                        <select class="select-control" onchange="changePageSize(this.value, 'gastos')">
                            <option value="10">10 por página</option>
                            <option value="20" selected>20 por página</option>
                            <option value="30">30 por página</option>
                        </select>
                    </div>
                </div>
                ${data.content.length === 0 ? `
                    <div class="empty-state">
                        <i class="fas fa-receipt"></i>
                        <h3>No hay gastos</h3>
                        <p>Comienza registrando un nuevo gasto</p>
                        <button class="btn btn-primary" onclick="openGastoModal()">
                            <i class="fas fa-plus"></i> Nuevo Gasto
                        </button>
                    </div>
                ` : `
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Fecha</th>
                                    <th>Concepto</th>
                                    <th>Monto</th>
                                    <th>Cuenta</th>
                                    <th>Asiento</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items}
                            </tbody>
                        </table>
                    </div>
                    ${renderPagination(data, 'gastos')}
                `}
            </div>
        </div>
    `;

    document.getElementById('pageContent').innerHTML = html;
}

window.openGastoModal = function() {
    const today = new Date().toISOString().split('T')[0];
    openModal('Nuevo Gasto', `
        <form id="gastoForm">
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i> El asiento contable se generará automáticamente.
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Fecha</label>
                    <input type="date" class="form-control" name="fecha_gasto" value="${today}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Monto</label>
                    <input type="number" step="0.01" class="form-control" name="monto" required>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Concepto</label>
                <input type="text" class="form-control" name="concepto" required>
            </div>
            <div class="form-group">
                <label class="form-label">ID Cuenta Contable (opcional)</label>
                <input type="number" class="form-control" name="cuentaContableId" placeholder="6101 por defecto">
            </div>
        </form>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveGasto()">Guardar</button>
    `);
};

window.saveGasto = async function() {
    const form = document.getElementById('gastoForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    data.monto = parseFloat(data.monto);
    data.cuentaContableId = data.cuentaContableId ? parseInt(data.cuentaContableId) : null;
    // El asiento se genera automáticamente
    
    try {
        showLoading();
        await api.createGasto(data);
        showToast('Gasto creado exitosamente. Asiento contable generado automáticamente.', 'success');
        closeModal();
        loadGastos();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.editGasto = async function(id) {
    try {
        const gasto = await api.getGasto(id);
        openModal('Editar Gasto', `
            <form id="gastoForm">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Fecha</label>
                        <input type="date" class="form-control" name="fecha_gasto" value="${gasto.fecha_gasto || ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Monto</label>
                        <input type="number" step="0.01" class="form-control" name="monto" value="${gasto.monto}" required>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Concepto</label>
                    <input type="text" class="form-control" name="concepto" value="${gasto.concepto || ''}" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">ID Cuenta Contable</label>
                        <input type="number" class="form-control" name="cuentaContableId" value="${gasto.cuentaContableId || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Asiento Contable</label>
                        <input type="text" class="form-control" value="${gasto.asientoId || 'Auto'}" disabled>
                    </div>
                </div>
            </form>
        `, `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="updateGasto(${id})">Actualizar</button>
        `);
    } catch (error) {
        showToast(error.message, 'error');
    }
};

window.updateGasto = async function(id) {
    const form = document.getElementById('gastoForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    data.monto = parseFloat(data.monto);
    data.cuentaContableId = data.cuentaContableId ? parseInt(data.cuentaContableId) : null;
    // El asiento no se puede cambiar al editar
    
    try {
        showLoading();
        await api.updateGasto(id, data);
        showToast('Gasto actualizado exitosamente', 'success');
        closeModal();
        loadGastos();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.deleteGasto = async function(id) {
    if (!confirm('¿Estás seguro de eliminar este gasto?')) return;
    
    try {
        showLoading();
        await api.deleteGasto(id);
        showToast('Gasto eliminado exitosamente', 'success');
        loadGastos();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};
