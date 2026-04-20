// ========================================
// BC Systems - Módulo Ventas
// ========================================

window.initVentas = function() {
    loadVentas(0);
};

async function loadVentas(page = 0) {
    showLoading();
    try {
        const data = await api.getVentas(page, paginationState.size, paginationState.sortBy, paginationState.sortDir);
        paginationState.ventasData = data;
        renderVentasTable(data);
    } catch (error) {
        console.error('Error cargando ventas:', error);
        showToast('Error al cargar ventas: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function renderVentasTable(data) {
    const items = data.content.map(item => `
        <tr>
            <td>${item.id}</td>
            <td>${item.fecha_venta || '-'}</td>
            <td>${item.tipoVenta || '-'}</td>
            <td>${formatCurrency(item.total)}</td>
            <td>${item.costo ? formatCurrency(item.costo) : '-'}</td>
            <td><span class="status-badge ${item.estadoVenta?.toLowerCase() || 'pending'}">${item.estadoVenta || 'PENDIENTE'}</span></td>
            <td>${item.asientoId ? item.asientoId : '<span class="text-muted">Auto</span>'}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn edit" onclick="editVenta(${item.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteVenta(${item.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    const html = `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Gestión de Ventas</h3>
                <button class="btn btn-primary" onclick="openVentaModal()">
                    <i class="fas fa-plus"></i> Nueva Venta
                </button>
            </div>
            <div class="card-body">
                <div class="table-toolbar">
                    <div class="table-toolbar-left">
                        <div class="search-box">
                            <i class="fas fa-search"></i>
                            <input type="text" placeholder="Buscar venta...">
                        </div>
                    </div>
                    <div class="table-toolbar-right">
                        <select class="select-control" onchange="changePageSize(this.value, 'ventas')">
                            <option value="10">10 por página</option>
                            <option value="20" selected>20 por página</option>
                            <option value="30">30 por página</option>
                        </select>
                    </div>
                </div>
                ${data.content.length === 0 ? `
                    <div class="empty-state">
                        <i class="fas fa-shopping-cart"></i>
                        <h3>No hay ventas</h3>
                        <p>Comienza registrando una nueva venta</p>
                        <button class="btn btn-primary" onclick="openVentaModal()">
                            <i class="fas fa-plus"></i> Nueva Venta
                        </button>
                    </div>
                ` : `
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Fecha</th>
                                    <th>Tipo</th>
                                    <th>Total</th>
                                    <th>Costo</th>
                                    <th>Estado</th>
                                    <th>Asiento</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items}
                            </tbody>
                        </table>
                    </div>
                    ${renderPagination(data, 'ventas')}
                `}
            </div>
        </div>
    `;

    document.getElementById('pageContent').innerHTML = html;
}

window.openVentaModal = function() {
    const today = new Date().toISOString().split('T')[0];
    openModal('Nueva Venta', `
        <form id="ventaForm">
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i> El asiento contable se generará automáticamente.
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Fecha de Venta</label>
                    <input type="date" class="form-control" name="fecha_venta" value="${today}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Tipo de Venta</label>
                    <select class="form-control" name="tipoVenta" required>
                        <option value="CONTADO">Contado</option>
                        <option value="CREDITO">Crédito</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Total</label>
                    <input type="number" step="0.01" class="form-control" name="total" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Costo (opcional)</label>
                    <input type="number" step="0.01" class="form-control" name="costo" placeholder="0.00">
                </div>
            </div>
        </form>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveVenta()">Guardar</button>
    `);
};

window.saveVenta = async function() {
    const form = document.getElementById('ventaForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    data.total = parseFloat(data.total);
    data.costo = data.costo ? parseFloat(data.costo) : null;
    // El asiento se genera automáticamente - no enviar asientoId
    
    try {
        showLoading();
        await api.createVenta(data);
        showToast('Venta creada exitosamente. Asiento contable generado automáticamente.', 'success');
        closeModal();
        loadVentas();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.editVenta = async function(id) {
    try {
        const venta = await api.getVenta(id);
        openModal('Editar Venta', `
            <form id="ventaForm">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Fecha de Venta</label>
                        <input type="date" class="form-control" name="fecha_venta" value="${venta.fecha_venta || ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Tipo de Venta</label>
                        <select class="form-control" name="tipoVenta" required>
                            <option value="CONTADO" ${venta.tipoVenta === 'CONTADO' ? 'selected' : ''}>Contado</option>
                            <option value="CREDITO" ${venta.tipoVenta === 'CREDITO' ? 'selected' : ''}>Crédito</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Total</label>
                        <input type="number" step="0.01" class="form-control" name="total" value="${venta.total}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Costo (opcional)</label>
                        <input type="number" step="0.01" class="form-control" name="costo" value="${venta.costo || ''}" placeholder="0.00">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Estado</label>
                        <select class="form-control" name="estadoVenta" required>
                            <option value="PENDIENTE" ${venta.estadoVenta === 'PENDIENTE' ? 'selected' : ''}>Pendiente</option>
                            <option value="LIQUIDADA" ${venta.estadoVenta === 'LIQUIDADA' ? 'selected' : ''}>Liquidada</option>
                            <option value="CANCELADA" ${venta.estadoVenta === 'CANCELADA' ? 'selected' : ''}>Cancelada</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Asiento Contable</label>
                        <input type="text" class="form-control" value="${venta.asientoId || 'Auto'}" disabled>
                    </div>
                </div>
            </form>
        `, `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="updateVenta(${id})">Actualizar</button>
        `);
    } catch (error) {
        showToast(error.message, 'error');
    }
};

window.updateVenta = async function(id) {
    const form = document.getElementById('ventaForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    data.total = parseFloat(data.total);
    data.costo = data.costo ? parseFloat(data.costo) : null;
    // El asiento no se puede cambiar al editar
    
    try {
        showLoading();
        await api.updateVenta(id, data);
        showToast('Venta actualizada exitosamente', 'success');
        closeModal();
        loadVentas();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.deleteVenta = async function(id) {
    if (!confirm('¿Estás seguro de eliminar esta venta?')) return;
    
    try {
        showLoading();
        await api.deleteVenta(id);
        showToast('Venta eliminada exitosamente', 'success');
        loadVentas();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};
