// ========================================
// BC Systems - MÃ³dulo Compras
// ========================================

window.initCompras = function() {
    loadCompras(0);
};

async function loadCompras(page = 0) {
    showLoading();
    try {
        const data = await api.getCompras(page, paginationState.size, paginationState.sortBy, paginationState.sortDir);
        renderComprasTable(data);
    } catch (error) {
        console.error('Error cargando compras:', error);
        showToast('Error al cargar compras: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function renderComprasTable(data) {
    const items = data.content.map(item => `
        <tr>
            <td>${item.id}</td>
            <td>${item.fecha_compra || '-'}</td>
            <td>${item.tipoCompra || 'CONTADO'}</td>
            <td>${formatCurrency(item.total_compra)}</td>
            <td><span class="status-badge ${item.estadoCompra?.toLowerCase() || 'pending'}">${item.estadoCompra || 'PENDIENTE'}</span></td>
            <td>${item.asientoId ? item.asientoId : '<span class="text-muted">Auto</span>'}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn edit" onclick="editCompra(${item.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteCompra(${item.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    const html = `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">GestiÃ³n de Compras</h3>
                <button class="btn btn-primary" onclick="openCompraModal()">
                    <i class="fas fa-plus"></i> Nueva Compra
                </button>
            </div>
            <div class="card-body">
                <div class="table-toolbar">
                    <div class="table-toolbar-left">
                        <div class="search-box">
                            <i class="fas fa-search"></i>
                            <input type="text" placeholder="Buscar compra...">
                        </div>
                    </div>
                    <div class="table-toolbar-right">
                        <select class="select-control" onchange="changePageSize(this.value, 'compras')">
                            <option value="10">10 por pÃ¡gina</option>
                            <option value="20" selected>20 por pÃ¡gina</option>
                            <option value="30">30 por pÃ¡gina</option>
                        </select>
                    </div>
                </div>
                ${data.content.length === 0 ? `
                    <div class="empty-state">
                        <i class="fas fa-shopping-bag"></i>
                        <h3>No hay compras</h3>
                        <p>Comienza registrando una nueva compra</p>
                        <button class="btn btn-primary" onclick="openCompraModal()">
                            <i class="fas fa-plus"></i> Nueva Compra
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
                    ${renderPagination(data, 'compras')}
                `}
            </div>
        </div>
    `;

    document.getElementById('pageContent').innerHTML = html;
}

window.openCompraModal = function() {
    const today = new Date().toISOString().split('T')[0];
    openModal('Nueva Compra', `
        <form id="compraForm">
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i> El asiento contable se generarÃ¡ automÃ¡ticamente.
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Fecha de Compra</label>
                    <input type="date" class="form-control" name="fecha_compra" value="${today}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Tipo de Compra</label>
                    <select class="form-select" name="tipoCompra" required>
                        <option value="CONTADO">Contado</option>
                        <option value="CREDITO">CrÃ©dito</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Total</label>
                    <input type="number" step="0.01" class="form-control" name="total_compra" required>
                </div>
                <div class="form-group">
                    <label class="form-label">ID Proveedor (opcional)</label>
                    <input type="number" class="form-control" name="proveedorId" placeholder="0">
                </div>
            </div>
        </form>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveCompra()">Guardar</button>
    `);
};

window.saveCompra = async function() {
    const form = document.getElementById('compraForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    data.total_compra = parseFloat(data.total_compra);
    data.proveedorId = data.proveedorId ? parseInt(data.proveedorId) : null;
    // El asiento se genera automÃ¡ticamente
    
    try {
        showLoading();
        await api.createCompra(data);
        showToast('Compra creada exitosamente. Asiento contable generado automÃ¡ticamente.', 'success');
        closeModal();
        loadCompras();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.editCompra = async function(id) {
    try {
        const compra = await api.getCompra(id);
        openModal('Editar Compra', `
            <form id="compraForm">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Fecha de Compra</label>
                        <input type="date" class="form-control" name="fecha_compra" value="${compra.fecha_compra || ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Tipo de Compra</label>
                        <select class="form-select" name="tipoCompra" required>
                            <option value="CONTADO" ${compra.tipoCompra === 'CONTADO' ? 'selected' : ''}>Contado</option>
                            <option value="CREDITO" ${compra.tipoCompra === 'CREDITO' ? 'selected' : ''}>CrÃ©dito</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Total</label>
                        <input type="number" step="0.01" class="form-control" name="total_compra" value="${compra.total_compra}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Estado</label>
                        <select class="form-select" name="estadoCompra" required>
                            <option value="PENDIENTE" ${compra.estadoCompra === 'PENDIENTE' ? 'selected' : ''}>Pendiente</option>
                            <option value="PAGADA" ${compra.estadoCompra === 'PAGADA' ? 'selected' : ''}>Pagada</option>
                            <option value="CANCELADA" ${compra.estadoCompra === 'CANCELADA' ? 'selected' : ''}>Cancelada</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">ID Proveedor</label>
                        <input type="number" class="form-control" name="proveedorId" value="${compra.proveedorId || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Asiento Contable</label>
                        <input type="text" class="form-control" value="${compra.asientoId || 'Auto'}" disabled>
                    </div>
                </div>
            </form>
        `, `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="updateCompra(${id})">Actualizar</button>
        `);
    } catch (error) {
        showToast(error.message, 'error');
    }
};

window.updateCompra = async function(id) {
    const form = document.getElementById('compraForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    data.total_compra = parseFloat(data.total_compra);
    data.proveedorId = data.proveedorId ? parseInt(data.proveedorId) : null;
    // El asiento no se puede cambiar al editar
    
    try {
        showLoading();
        await api.updateCompra(id, data);
        showToast('Compra actualizada exitosamente', 'success');
        closeModal();
        loadCompras();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.deleteCompra = async function(id) {
    if (!confirm('Â¿EstÃ¡s seguro de eliminar esta compra?')) return;
    
    try {
        showLoading();
        await api.deleteCompra(id);
        showToast('Compra eliminada exitosamente', 'success');
        loadCompras();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};
