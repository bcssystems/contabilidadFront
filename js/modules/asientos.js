// ========================================
// BC Systems - Módulo Asientos Contables
// ========================================

window.initAsientos = function() {
    loadAsientos(0);
};

async function loadAsientos(page = 0) {
    showLoading();
    try {
        const data = await api.getAsientosContables(page, paginationState.size, paginationState.sortBy, paginationState.sortDir);
        renderAsientosTable(data);
    } catch (error) {
        console.error('Error cargando asientos contables:', error);
        showToast('Error al cargar asientos contables: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function renderAsientosTable(data) {
    const items = data.content.map(item => `
        <tr>
            <td>${item.id}</td>
            <td>${item.fecha || '-'}</td>
            <td>${item.referencia || '-'}</td>
            <td>${item.descripcion || '-'}</td>
            <td><span class="status-badge ${item.tipoAsientoContable?.toLowerCase() || 'borrador'}">${item.tipoAsientoContable || 'BORRADOR'}</span></td>
            <td>
                <div class="action-btns">
                    <button class="action-btn view" onclick="viewAsiento(${item.id})" title="Ver">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn edit" onclick="editAsiento(${item.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteAsiento(${item.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    const html = `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Asientos Contables</h3>
                <button class="btn btn-primary" onclick="openAsientoModal()">
                    <i class="fas fa-plus"></i> Nuevo Asiento
                </button>
            </div>
            <div class="card-body">
                <div class="table-toolbar">
                    <div class="table-toolbar-left">
                        <div class="search-box">
                            <i class="fas fa-search"></i>
                            <input type="text" placeholder="Buscar asiento...">
                        </div>
                    </div>
                    <div class="table-toolbar-right">
                        <select class="select-control" onchange="changePageSize(this.value, 'asientos')">
                            <option value="10">10 por página</option>
                            <option value="20" selected>20 por página</option>
                            <option value="30">30 por página</option>
                        </select>
                    </div>
                </div>
                ${data.content.length === 0 ? `
                    <div class="empty-state">
                        <i class="fas fa-book"></i>
                        <h3>No hay asientos contables</h3>
                        <p>Comienza registrando un nuevo asiento</p>
                        <button class="btn btn-primary" onclick="openAsientoModal()">
                            <i class="fas fa-plus"></i> Nuevo Asiento
                        </button>
                    </div>
                ` : `
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Fecha</th>
                                    <th>Referencia</th>
                                    <th>Descripción</th>
                                    <th>Tipo</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items}
                            </tbody>
                        </table>
                    </div>
                    ${renderPagination(data, 'asientos')}
                `}
            </div>
        </div>
    `;

    document.getElementById('pageContent').innerHTML = html;
}

window.openAsientoModal = function() {
    const today = new Date().toISOString().split('T')[0];
    openModal('Nuevo Asiento Contable', `
        <form id="asientoForm">
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Fecha</label>
                    <input type="date" class="form-control" name="fecha" value="${today}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Referencia</label>
                    <input type="text" class="form-control" name="referencia" placeholder="ej. AS-001" required>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Descripción</label>
                <textarea class="form-control" name="descripcion" rows="2" required></textarea>
            </div>
            <div class="form-group">
                <label class="form-label">Tipo de Asiento</label>
                <select class="form-control" name="tipoAsientoContable" required>
                    <option value="BORRADOR">Borrador</option>
                    <option value="CONFIRMADO">Confirmado</option>
                    <option value="CANCELADO">Cancelado</option>
                </select>
            </div>
        </form>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveAsiento()">Guardar</button>
    `);
};

window.saveAsiento = async function() {
    const form = document.getElementById('asientoForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    data.movimientos = [];
    
    try {
        showLoading();
        await api.createAsientoContable(data);
        showToast('Asiento contable creado exitosamente', 'success');
        closeModal();
        loadAsientos();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.viewAsiento = async function(id) {
    try {
        const asiento = await api.getAsientoContable(id);
        const movimientosHtml = asiento.movimientos?.map(m => `
            <tr>
                <td>${m.cuentaCodigo || '-'}</td>
                <td>${m.cuentaNombre || '-'}</td>
                <td>${formatCurrency(m.debe)}</td>
                <td>${formatCurrency(m.haber)}</td>
            </tr>
        `).join('') || '<tr><td colspan="4">Sin movimientos</td></tr>';
        
        openModal(`Asiento #${id}`, `
            <div class="asiento-detail">
                <div class="detail-row">
                    <span class="detail-label">Fecha:</span>
                    <span>${asiento.fecha || '-'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Referencia:</span>
                    <span>${asiento.referencia || '-'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Descripción:</span>
                    <span>${asiento.descripcion || '-'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Tipo:</span>
                    <span>${asiento.tipoAsientoContable || '-'}</span>
                </div>
            </div>
            <h4 style="margin-top: 20px;">Movimientos</h4>
            <table class="table">
                <thead>
                    <tr>
                        <th>Cuenta</th>
                        <th>Nombre</th>
                        <th>Debe</th>
                        <th>Haber</th>
                    </tr>
                </thead>
                <tbody>
                    ${movimientosHtml}
                </tbody>
            </table>
        `, `
            <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
        `);
    } catch (error) {
        showToast(error.message, 'error');
    }
};

window.editAsiento = async function(id) {
    try {
        const asiento = await api.getAsientoContable(id);
        openModal('Editar Asiento Contable', `
            <form id="asientoForm">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Fecha</label>
                        <input type="date" class="form-control" name="fecha" value="${asiento.fecha || ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Referencia</label>
                        <input type="text" class="form-control" name="referencia" value="${asiento.referencia || ''}" required>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Descripción</label>
                    <textarea class="form-control" name="descripcion" rows="2" required>${asiento.descripcion || ''}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Tipo de Asiento</label>
                    <select class="form-control" name="tipoAsientoContable" required>
                        <option value="BORRADOR" ${asiento.tipoAsientoContable === 'BORRADOR' ? 'selected' : ''}>Borrador</option>
                        <option value="CONFIRMADO" ${asiento.tipoAsientoContable === 'CONFIRMADO' ? 'selected' : ''}>Confirmado</option>
                        <option value="CANCELADO" ${asiento.tipoAsientoContable === 'CANCELADO' ? 'selected' : ''}>Cancelado</option>
                    </select>
                </div>
            </form>
        `, `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="updateAsiento(${id})">Actualizar</button>
        `);
    } catch (error) {
        showToast(error.message, 'error');
    }
};

window.updateAsiento = async function(id) {
    const form = document.getElementById('asientoForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    data.movimientos = [];
    
    try {
        showLoading();
        await api.updateAsientoContable(id, data);
        showToast('Asiento contable actualizado exitosamente', 'success');
        closeModal();
        loadAsientos();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.deleteAsiento = async function(id) {
    if (!confirm('¿Estás seguro de eliminar este asiento contable?')) return;
    
    try {
        showLoading();
        await api.deleteAsientoContable(id);
        showToast('Asiento contable eliminado exitosamente', 'success');
        loadAsientos();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};
