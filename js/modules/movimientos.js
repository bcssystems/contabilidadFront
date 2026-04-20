// ========================================
// BC Systems - Módulo Movimientos Contables
// ========================================

window.initMovimientos = function() {
    loadMovimientos(0);
};

async function loadMovimientos(page = 0) {
    showLoading();
    try {
        const data = await api.getMovimientosContables(page, paginationState.size, paginationState.sortBy, paginationState.sortDir);
        renderMovimientosTable(data);
    } catch (error) {
        console.error('Error cargando movimientos contables:', error);
        showToast('Error al cargar movimientos contables: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function renderMovimientosTable(data) {
    const items = data.content.map(item => `
        <tr>
            <td>${item.id}</td>
            <td>${item.cuentaCodigo || '-'}</td>
            <td>${item.cuentaNombre || '-'}</td>
            <td>${formatCurrency(item.debe)}</td>
            <td>${formatCurrency(item.haber)}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn edit" onclick="editMovimiento(${item.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteMovimiento(${item.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    const html = `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Movimientos Contables</h3>
                <button class="btn btn-primary" onclick="openMovimientoModal()">
                    <i class="fas fa-plus"></i> Nuevo Movimiento
                </button>
            </div>
            <div class="card-body">
                <div class="table-toolbar">
                    <div class="table-toolbar-left">
                        <div class="search-box">
                            <i class="fas fa-search"></i>
                            <input type="text" placeholder="Buscar movimiento...">
                        </div>
                    </div>
                    <div class="table-toolbar-right">
                        <select class="select-control" onchange="changePageSize(this.value, 'movimientos')">
                            <option value="10">10 por página</option>
                            <option value="20" selected>20 por página</option>
                            <option value="30">30 por página</option>
                        </select>
                    </div>
                </div>
                ${data.content.length === 0 ? `
                    <div class="empty-state">
                        <i class="fas fa-exchange-alt"></i>
                        <h3>No hay movimientos</h3>
                        <p>Comienza registrando un nuevo movimiento</p>
                        <button class="btn btn-primary" onclick="openMovimientoModal()">
                            <i class="fas fa-plus"></i> Nuevo Movimiento
                        </button>
                    </div>
                ` : `
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <th>ID</th>
                                    <tr>
                                    <th>Código</th>
                                    <th>Cuenta</th>
                                    <th>Debe</th>
                                    <th>Haber</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items}
                            </tbody>
                        </table>
                    </div>
                    ${renderPagination(data, 'movimientos')}
                `}
            </div>
        </div>
    `;

    document.getElementById('pageContent').innerHTML = html;
}

window.openMovimientoModal = function() {
    openModal('Nuevo Movimiento Contable', `
        <form id="movimientoForm">
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Debe</label>
                    <input type="number" step="0.01" class="form-control" name="debe" value="0">
                </div>
                <div class="form-group">
                    <label class="form-label">Haber</label>
                    <input type="number" step="0.01" class="form-control" name="haber" value="0">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">ID Cuenta Contable</label>
                    <input type="number" class="form-control" name="cuentaContableId" required>
                </div>
                <div class="form-group">
                    <label class="form-label">ID Asiento</label>
                    <input type="number" class="form-control" name="asientoId" required>
                </div>
            </div>
        </form>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveMovimiento()">Guardar</button>
    `);
};

window.saveMovimiento = async function() {
    const form = document.getElementById('movimientoForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    data.debe = parseFloat(data.debe) || 0;
    data.haber = parseFloat(data.haber) || 0;
    data.cuentaContableId = parseInt(data.cuentaContableId);
    data.asientoId = parseInt(data.asientoId);
    
    try {
        showLoading();
        await api.createMovimientoContable(data);
        showToast('Movimiento contable creado exitosamente', 'success');
        closeModal();
        loadMovimientos();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.editMovimiento = async function(id) {
    try {
        const movimiento = await api.getMovimientoContable(id);
        openModal('Editar Movimiento Contable', `
            <form id="movimientoForm">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Debe</label>
                        <input type="number" step="0.01" class="form-control" name="debe" value="${movimiento.debe || 0}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Haber</label>
                        <input type="number" step="0.01" class="form-control" name="haber" value="${movimiento.haber || 0}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">ID Cuenta Contable</label>
                        <input type="number" class="form-control" name="cuentaContableId" value="${movimiento.cuentaContableId || ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">ID Asiento</label>
                        <input type="number" class="form-control" name="asientoId" value="${movimiento.asientoId || ''}" required>
                    </div>
                </div>
            </form>
        `, `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="updateMovimiento(${id})">Actualizar</button>
        `);
    } catch (error) {
        showToast(error.message, 'error');
    }
};

window.updateMovimiento = async function(id) {
    const form = document.getElementById('movimientoForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    data.debe = parseFloat(data.debe) || 0;
    data.haber = parseFloat(data.haber) || 0;
    data.cuentaContableId = parseInt(data.cuentaContableId);
    data.asientoId = parseInt(data.asientoId);
    
    try {
        showLoading();
        await api.updateMovimientoContable(id, data);
        showToast('Movimiento contable actualizado exitosamente', 'success');
        closeModal();
        loadMovimientos();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.deleteMovimiento = async function(id) {
    if (!confirm('¿Estás seguro de eliminar este movimiento contable?')) return;
    
    try {
        showLoading();
        await api.deleteMovimientoContable(id);
        showToast('Movimiento contable eliminado exitosamente', 'success');
        loadMovimientos();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};
