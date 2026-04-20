// ========================================
// BC Systems - Módulo Proveedores
// ========================================

window.initProveedores = function() {
    loadProveedores(0);
};

async function loadProveedores(page = 0) {
    showLoading();
    try {
        const data = await api.getProveedores(page, paginationState.size, paginationState.sortBy, paginationState.sortDir);
        renderProveedoresTable(data);
    } catch (error) {
        console.error('Error cargando proveedores:', error);
        showToast('Error al cargar proveedores: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function renderProveedoresTable(data) {
    const items = data.content.map(item => `
        <tr>
            <td>${item.id}</td>
            <td>${item.nombre}</td>
            <td>${item.cuentaPorPagarId || '-'}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn edit" onclick="editProveedor(${item.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteProveedor(${item.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    const html = `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Gestión de Proveedores</h3>
                <button class="btn btn-primary" onclick="openProveedorModal()">
                    <i class="fas fa-plus"></i> Nuevo Proveedor
                </button>
            </div>
            <div class="card-body">
                <div class="table-toolbar">
                    <div class="table-toolbar-left">
                        <div class="search-box">
                            <i class="fas fa-search"></i>
                            <input type="text" placeholder="Buscar proveedor..." onkeyup="searchProveedores(this.value)">
                        </div>
                    </div>
                    <div class="table-toolbar-right">
                        <select class="select-control" onchange="changePageSize(this.value, 'proveedores')">
                            <option value="10">10 por página</option>
                            <option value="20" selected>20 por página</option>
                            <option value="30">30 por página</option>
                        </select>
                    </div>
                </div>
                ${data.content.length === 0 ? `
                    <div class="empty-state">
                        <i class="fas fa-truck"></i>
                        <h3>No hay proveedores</h3>
                        <p>Comienza agregando un nuevo proveedor</p>
                        <button class="btn btn-primary" onclick="openProveedorModal()">
                            <i class="fas fa-plus"></i> Nuevo Proveedor
                        </button>
                    </div>
                ` : `
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Nombre</th>
                                    <th>Cuenta por Pagar</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items}
                            </tbody>
                        </table>
                    </div>
                    ${renderPagination(data, 'proveedores')}
                `}
            </div>
        </div>
    `;

    document.getElementById('pageContent').innerHTML = html;
}

function searchProveedores(query) {
    if (query.length >= 2) {
        const filtered = paginationState.proveedoresData?.content.filter(p => 
            p.nombre.toLowerCase().includes(query.toLowerCase())
        );
        if (filtered) {
            renderProveedoresTable({ ...paginationState.proveedoresData, content: filtered });
        }
    } else if (query.length === 0) {
        loadProveedores(paginationState.page);
    }
}

let cuentasPorPagarCache = null;

async function loadCuentasPorPagarOptions() {
    if (cuentasPorPagarCache) {
        return cuentasPorPagarCache;
    }

    try {
        const response = await api.getCuentasContables(0, 500, 'idCuentaContable', 'asc');
        const cuentas = (response?.content || []).filter(cuenta => cuenta.tipoCuentaContable === 'PASIVO');
        if (!cuentas.length) {
            showToast('No hay cuentas de pasivo disponibles para asignar.', 'warning');
        }
        cuentasPorPagarCache = cuentas;
    } catch (error) {
        console.error('Error cargando cuentas por pagar:', error);
        showToast('No se pudieron cargar las cuentas por pagar.', 'error');
        cuentasPorPagarCache = [];
    }

    return cuentasPorPagarCache;
}

function buildCuentaPorPagarOptions(cuentas = [], selectedId = null) {
    const selectedValue = selectedId !== undefined && selectedId !== null ? Number(selectedId) : null;

    if (!cuentas.length) {
        return '<option value="" disabled selected>No hay cuentas disponibles</option>';
    }

    const options = [`<option value="" ${selectedValue === null ? 'selected' : ''}>Sin cuenta asignada</option>`];

    cuentas.forEach(cuenta => {
        const parts = [];
        if (cuenta.codigo) parts.push(cuenta.codigo);
        if (cuenta.nombre) parts.push(cuenta.nombre);
        const label = parts.join(' - ') || `Cuenta #${cuenta.id}`;
        const isSelected = selectedValue !== null && Number(cuenta.id) === selectedValue ? 'selected' : '';
        options.push(`<option value="${cuenta.id}" ${isSelected}>${label} (#${cuenta.id})</option>`);
    });

    return options.join('');
}

window.openProveedorModal = function() {
    openProveedorModalAsync();
};

async function openProveedorModalAsync() {
    let cuentas = [];
    try {
        showLoading();
        cuentas = await loadCuentasPorPagarOptions();
    } finally {
        hideLoading();
    }

    openModal('Nuevo Proveedor', `
        <form id="proveedorForm">
            <div class="form-group">
                <label class="form-label">Nombre</label>
                <input type="text" class="form-control" name="nombre" required>
            </div>
            <div class="form-group">
                <label class="form-label">Cuenta por Pagar</label>
                <select class="form-control" name="cuentaPorPagarId">
                    ${buildCuentaPorPagarOptions(cuentas)}
                </select>
            </div>
        </form>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveProveedor()">Guardar</button>
    `);
}

window.saveProveedor = async function() {
    const form = document.getElementById('proveedorForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    data.cuentaPorPagarId = data.cuentaPorPagarId ? Number(data.cuentaPorPagarId) : null;
    
    try {
        showLoading();
        await api.createProveedor(data);
        showToast('Proveedor creado exitosamente', 'success');
        closeModal();
        loadProveedores();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.editProveedor = async function(id) {
    try {
        showLoading();
        const [proveedor, cuentas] = await Promise.all([
            api.getProveedor(id),
            loadCuentasPorPagarOptions()
        ]);

        openModal('Editar Proveedor', `
            <form id="proveedorForm">
                <div class="form-group">
                    <label class="form-label">Nombre</label>
                    <input type="text" class="form-control" name="nombre" value="${proveedor.nombre}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Cuenta por Pagar</label>
                    <select class="form-control" name="cuentaPorPagarId">
                        ${buildCuentaPorPagarOptions(cuentas, proveedor.cuentaPorPagarId)}
                    </select>
                </div>
            </form>
        `, `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="updateProveedor(${id})">Actualizar</button>
        `);
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.updateProveedor = async function(id) {
    const form = document.getElementById('proveedorForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    data.cuentaPorPagarId = data.cuentaPorPagarId ? Number(data.cuentaPorPagarId) : null;
    
    try {
        showLoading();
        await api.updateProveedor(id, data);
        showToast('Proveedor actualizado exitosamente', 'success');
        closeModal();
        loadProveedores();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.deleteProveedor = async function(id) {
    if (!confirm('¿Estás seguro de eliminar este proveedor?')) return;
    
    try {
        showLoading();
        await api.deleteProveedor(id);
        showToast('Proveedor eliminado exitosamente', 'success');
        loadProveedores();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};
