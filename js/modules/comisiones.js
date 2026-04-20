// ========================================
// BC Systems - Módulo Comisiones
// ========================================

window.initComisiones = function() {
    loadComisiones(0);
};

async function loadComisiones(page = 0) {
    showLoading();
    try {
        const data = await api.getComisiones(page, paginationState.size, paginationState.sortBy, paginationState.sortDir);
        renderComisionesTable(data);
    } catch (error) {
        console.error('Error cargando comisiones:', error);
        showToast('Error al cargar comisiones: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function renderComisionesTable(data) {
    const items = data.content.map(item => `
        <tr>
            <td>${item.id}</td>
            <td>${item.tipoComision || '-'}</td>
            <td>${formatCurrency(item.montoBase)}</td>
            <td>${item.porcentaje}%</td>
            <td>${formatCurrency(item.montoComision)}</td>
            <td><span class="status-badge ${item.estadoComision?.toLowerCase() || 'pending'}">${item.estadoComision || 'PENDIENTE'}</span></td>
            <td>
                <div class="action-btns">
                    <button class="action-btn edit" onclick="editComision(${item.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteComision(${item.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    const html = `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Gestión de Comisiones</h3>
                <button class="btn btn-primary" onclick="openComisionModal()">
                    <i class="fas fa-plus"></i> Nueva Comisión
                </button>
            </div>
            <div class="card-body">
                <div class="table-toolbar">
                    <div class="table-toolbar-left">
                        <div class="search-box">
                            <i class="fas fa-search"></i>
                            <input type="text" placeholder="Buscar comisión...">
                        </div>
                    </div>
                    <div class="table-toolbar-right">
                        <select class="select-control" onchange="changePageSize(this.value, 'comisiones')">
                            <option value="10">10 por página</option>
                            <option value="20" selected>20 por página</option>
                            <option value="30">30 por página</option>
                        </select>
                    </div>
                </div>
                ${data.content.length === 0 ? `
                    <div class="empty-state">
                        <i class="fas fa-percent"></i>
                        <h3>No hay comisiones</h3>
                        <p>Comienza registrando una nueva comisión</p>
                        <button class="btn btn-primary" onclick="openComisionModal()">
                            <i class="fas fa-plus"></i> Nueva Comisión
                        </button>
                    </div>
                ` : `
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Tipo</th>
                                    <th>Monto Base</th>
                                    <th>%</th>
                                    <th>Monto Comisión</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items}
                            </tbody>
                        </table>
                    </div>
                    ${renderPagination(data, 'comisiones')}
                `}
            </div>
        </div>
    `;

    document.getElementById('pageContent').innerHTML = html;
}

async function loadComisionSelectData() {
    const [empleadosResult, ventasResult] = await Promise.allSettled([
        api.getEmpleados(0, 500, 'idEmpleado', 'asc'),
        api.getVentas(0, 500, 'idVenta', 'desc')
    ]);

    const data = {
        empleados: [],
        ventas: []
    };

    const missing = [];

    if (empleadosResult.status === 'fulfilled') {
        data.empleados = empleadosResult.value?.content || [];
    } else {
        console.error('Error cargando empleados para comisiones:', empleadosResult.reason);
        missing.push('empleados');
    }

    if (ventasResult.status === 'fulfilled') {
        data.ventas = ventasResult.value?.content || [];
    } else {
        console.error('Error cargando ventas para comisiones:', ventasResult.reason);
        missing.push('ventas');
    }

    if (missing.length) {
        showToast(`No se pudieron cargar ${missing.join(' y ')}.`, 'warning');
    }

    return data;
}

function buildEmpleadoOptionsComision(empleados = [], selectedId = null) {
    const selectedValue = selectedId !== undefined && selectedId !== null ? Number(selectedId) : null;

    if (!empleados.length) {
        return '<option value="" disabled selected>No hay empleados disponibles</option>';
    }

    const options = [`<option value="" disabled ${selectedValue === null ? 'selected' : ''}>Selecciona un empleado</option>`];

    empleados.forEach(empleado => {
        const fullName = [empleado.nombre, empleado.primerApellido, empleado.segundoApellido].filter(Boolean).join(' ');
        const label = fullName || `Empleado #${empleado.id}`;
        const isSelected = selectedValue !== null && Number(empleado.id) === selectedValue ? 'selected' : '';
        options.push(`<option value="${empleado.id}" ${isSelected}>${label} (#${empleado.id})</option>`);
    });

    return options.join('');
}

function formatVentaLabel(venta) {
    const parts = [`#${venta.id}`];
    if (venta.fecha_venta) parts.push(venta.fecha_venta);
    if (typeof formatCurrency === 'function' && venta.total !== undefined && venta.total !== null) {
        parts.push(formatCurrency(venta.total));
    } else if (venta.total !== undefined && venta.total !== null) {
        parts.push(`$${venta.total}`);
    }
    if (venta.estadoVenta) parts.push(venta.estadoVenta);
    if (venta.tipoVenta) parts.push(venta.tipoVenta);
    return parts.join(' • ');
}

function setupVentaSearchSelect(ventas = [], selectedId = null) {
    const container = document.querySelector('.venta-search-select');
    if (!container) return;

    const hiddenInput = container.querySelector('input[name="ventaId"]');
    const searchInput = container.querySelector('.search-select-input');
    const clearBtn = container.querySelector('.search-select-clear');
    const dropdown = container.querySelector('.search-select-dropdown');

    let currentResults = [];

    function updateContainerState() {
        if (hiddenInput.value) {
            container.classList.add('has-value');
        } else {
            container.classList.remove('has-value');
        }
    }

    function renderOptions(query = '') {
        const normalized = query.trim().toLowerCase();

        const filtered = normalized
            ? ventas.filter(venta => {
                const label = formatVentaLabel(venta).toLowerCase();
                return label.includes(normalized) || String(venta.id).includes(normalized);
            })
            : ventas.slice();

        currentResults = filtered
            .sort((a, b) => Number(b.id) - Number(a.id))
            .slice(0, 12);

        if (!currentResults.length) {
            dropdown.innerHTML = '<div class="search-select-empty">Sin coincidencias</div>';
            dropdown.classList.add('show');
            return;
        }

        dropdown.innerHTML = currentResults.map(venta => `
            <button type="button" class="search-select-option" data-id="${venta.id}">
                ${formatVentaLabel(venta)}
            </button>
        `).join('');
        dropdown.classList.add('show');
    }

    function selectVenta(venta) {
        if (!venta) return;
        hiddenInput.value = venta.id;
        searchInput.value = formatVentaLabel(venta);
        dropdown.classList.remove('show');
        updateContainerState();
    }

    function clearSelection() {
        hiddenInput.value = '';
        searchInput.value = '';
        dropdown.classList.remove('show');
        updateContainerState();
    }

    searchInput.addEventListener('input', () => {
        hiddenInput.value = '';
        if (!searchInput.value.trim()) {
            dropdown.classList.remove('show');
            updateContainerState();
            return;
        }
        renderOptions(searchInput.value);
        updateContainerState();
    });

    searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim()) {
            renderOptions(searchInput.value);
        } else {
            renderOptions('');
        }
    });

    searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            if (currentResults.length) {
                selectVenta(currentResults[0]);
            }
        }
    });

    clearBtn?.addEventListener('click', (event) => {
        event.preventDefault();
        clearSelection();
        searchInput.focus();
    });

    dropdown.addEventListener('mousedown', (event) => {
        event.preventDefault();
        const option = event.target.closest('.search-select-option');
        if (!option) return;
        const ventaId = Number(option.dataset.id);
        const venta = ventas.find(item => Number(item.id) === ventaId);
        selectVenta(venta);
    });

    searchInput.addEventListener('blur', () => {
        setTimeout(() => dropdown.classList.remove('show'), 150);
    });

    if (selectedId) {
        const selectedVenta = ventas.find(item => Number(item.id) === Number(selectedId));
        if (selectedVenta) {
            selectVenta(selectedVenta);
        } else {
            api.getVenta(selectedId).then(venta => {
                if (venta) {
                    ventas.push(venta);
                    selectVenta(venta);
                }
            }).catch(() => {/* ignore */});
        }
    }

    updateContainerState();
}

window.openComisionModal = function() {
    openComisionModalAsync();
};

async function openComisionModalAsync() {
    let empleados = [];
    let ventas = [];

    try {
        showLoading();
        const data = await loadComisionSelectData();
        empleados = data.empleados;
        ventas = data.ventas;
    } finally {
        hideLoading();
    }

    openModal('Nueva Comisión', `
        <form id="comisionForm">
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Tipo de Comisión</label>
                    <select class="form-control" name="tipoComision" required>
                        <option value="VENTA">Venta</option>
                        <option value="COBRANZA">Cobranza</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Monto Base</label>
                    <input type="number" step="0.01" class="form-control" name="montoBase" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Porcentaje (%)</label>
                    <input type="number" step="0.01" class="form-control" name="porcentajeComision" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Empleado</label>
                    <select class="form-control" name="empleadoId" required>
                        ${buildEmpleadoOptionsComision(empleados)}
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Venta (opcional)</label>
                <div class="search-select venta-search-select">
                    <input type="hidden" name="ventaId">
                    <input type="text" class="form-control search-select-input" placeholder="Buscar venta por ID, fecha, total..." autocomplete="off">
                    <button type="button" class="search-select-clear" title="Limpiar selección">
                        <i class="fas fa-times"></i>
                    </button>
                    <div class="search-select-dropdown"></div>
                </div>
            </div>
        </form>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveComision()">Guardar</button>
    `);

    setupVentaSearchSelect(ventas);
}

window.saveComision = async function() {
    const form = document.getElementById('comisionForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    data.montoBase = parseFloat(data.montoBase);
    data.porcentajeComision = parseFloat(data.porcentajeComision);
    data.empleadoId = data.empleadoId ? parseInt(data.empleadoId, 10) : null;
    data.ventaId = data.ventaId ? parseInt(data.ventaId, 10) : null;

    if (!data.empleadoId) {
        showToast('Selecciona un empleado válido.', 'warning');
        return;
    }

    try {
        showLoading();
        await api.createComision(data);
        showToast('Comisión creada exitosamente', 'success');
        closeModal();
        loadComisiones();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.editComision = async function(id) {
    try {
        showLoading();
        const [comision, selectData] = await Promise.all([
            api.getComision(id),
            loadComisionSelectData()
        ]);

        openModal('Editar Comisión', `
            <form id="comisionForm">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Tipo de Comisión</label>
                        <select class="form-control" name="tipoComision" required>
                            <option value="VENTA" ${comision.tipoComision === 'VENTA' ? 'selected' : ''}>Venta</option>
                            <option value="COBRANZA" ${comision.tipoComision === 'COBRANZA' ? 'selected' : ''}>Cobranza</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Monto Base</label>
                        <input type="number" step="0.01" class="form-control" name="montoBase" value="${comision.montoBase}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Porcentaje (%)</label>
                        <input type="number" step="0.01" class="form-control" name="porcentajeComision" value="${comision.porcentajeComision}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Estado</label>
                        <select class="form-control" name="estadoComision" required>
                            <option value="PENDIENTE" ${comision.estadoComision === 'PENDIENTE' ? 'selected' : ''}>Pendiente</option>
                            <option value="PAGADA" ${comision.estadoComision === 'PAGADA' ? 'selected' : ''}>Pagada</option>
                            <option value="CANCELADA" ${comision.estadoComision === 'CANCELADA' ? 'selected' : ''}>Cancelada</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Empleado</label>
                        <select class="form-control" name="empleadoId" required>
                            ${buildEmpleadoOptionsComision(selectData.empleados, comision.empleadoId)}
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Venta (opcional)</label>
                    <div class="search-select venta-search-select">
                        <input type="hidden" name="ventaId" value="${comision.ventaId || ''}">
                        <input type="text" class="form-control search-select-input" placeholder="Buscar venta por ID, fecha, total..." autocomplete="off">
                        <button type="button" class="search-select-clear" title="Limpiar selección">
                            <i class="fas fa-times"></i>
                        </button>
                        <div class="search-select-dropdown"></div>
                    </div>
                </div>
            </form>
        `, `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="updateComision(${id})">Actualizar</button>
        `);

        setupVentaSearchSelect(selectData.ventas, comision.ventaId);
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.updateComision = async function(id) {
    const form = document.getElementById('comisionForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    data.montoBase = parseFloat(data.montoBase);
    data.porcentajeComision = parseFloat(data.porcentajeComision);
    data.empleadoId = data.empleadoId ? parseInt(data.empleadoId, 10) : null;
    data.ventaId = data.ventaId ? parseInt(data.ventaId, 10) : null;

    if (!data.empleadoId) {
        showToast('Selecciona un empleado válido.', 'warning');
        return;
    }
    
    try {
        showLoading();
        await api.updateComision(id, data);
        showToast('Comisión actualizada exitosamente', 'success');
        closeModal();
        loadComisiones();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.deleteComision = async function(id) {
    if (!confirm('¿Estás seguro de eliminar esta comisión?')) return;
    
    try {
        showLoading();
        await api.deleteComision(id);
        showToast('Comisión eliminada exitosamente', 'success');
        loadComisiones();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};
