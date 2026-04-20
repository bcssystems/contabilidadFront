// ========================================
// BC Systems - Módulo Cuentas Contables
// ========================================

window.initCuentas = function() {
    loadCuentas(0);
};

async function loadCuentas(page = 0) {
    showLoading();
    try {
        const size = 300;
        paginationState.page = 0;
        paginationState.size = size;

        let currentPage = 0;
        let totalPages = 1;
        const todasLasCuentas = [];

        do {
            const response = await api.getCuentasContables(currentPage, size, paginationState.sortBy, paginationState.sortDir);
            totalPages = response.totalPages || 1;
            paginationState.totalPages = totalPages;
            paginationState.totalElements = response.totalElements || response.content?.length || 0;
            if (Array.isArray(response.content)) {
                todasLasCuentas.push(...response.content);
            }
            currentPage += 1;
        } while (currentPage < totalPages);

        renderCuentasTree(todasLasCuentas);
    } catch (error) {
        console.error('Error cargando cuentas contables:', error);
        showToast('Error al cargar cuentas contables: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function renderCuentasTree(cuentas = []) {
    if (!Array.isArray(cuentas)) cuentas = [];

    const tree = buildCuentaHierarchy(cuentas);
    const hasCuentas = tree.length > 0;

    const html = `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Plan de Cuentas</h3>
                <button class="btn btn-primary" onclick="openCuentaContableModal()">
                    <i class="fas fa-plus"></i> Nueva Cuenta
                </button>
            </div>
            <div class="card-body">
                <div class="table-toolbar">
                    <div class="table-toolbar-left">
                        <div class="search-box">
                            <i class="fas fa-search"></i>
                            <input type="text" placeholder="Buscar cuenta..." oninput="filterCuentaTree(this.value)">
                        </div>
                    </div>
                </div>
                ${hasCuentas ? `
                    <div class="cuentas-tree" id="cuentasTree">
                        <ul class="cuenta-tree-root">
                            ${tree.map(node => renderCuentaNode(node)).join('')}
                        </ul>
                    </div>
                ` : `
                    <div class="empty-state">
                        <i class="fas fa-wallet"></i>
                        <h3>No hay cuentas contables</h3>
                        <p>Comienza creando el plan de cuentas</p>
                        <button class="btn btn-primary" onclick="openCuentaContableModal()">
                            <i class="fas fa-plus"></i> Nueva Cuenta
                        </button>
                    </div>
                `}
            </div>
        </div>
    `;

    const container = document.getElementById('pageContent');
    container.innerHTML = html;
    setupCuentaTreeInteractions();
    window.__cuentasTreeData = cuentas;
}

function buildCuentaHierarchy(cuentas) {
    const map = new Map();
    const roots = [];

    cuentas.forEach(cuenta => {
        map.set(cuenta.id, { ...cuenta, children: [] });
    });

    map.forEach(cuenta => {
        if (cuenta.cuentaPadreId) {
            const parent = map.get(cuenta.cuentaPadreId);
            if (parent) {
                parent.children.push(cuenta);
            } else {
                roots.push(cuenta);
            }
        } else {
            roots.push(cuenta);
        }
    });

    const sortByCodigo = (a, b) => {
        const codigoA = a.codigo || '';
        const codigoB = b.codigo || '';
        if (codigoA < codigoB) return -1;
        if (codigoA > codigoB) return 1;
        return 0;
    };

    const sortTree = (nodes) => {
        nodes.sort(sortByCodigo);
        nodes.forEach(node => {
            if (node.children?.length) {
                sortTree(node.children);
            }
        });
    };

    sortTree(roots);
    return roots;
}

function renderCuentaNode(cuenta) {
    const hasChildren = cuenta.children && cuenta.children.length > 0;
    const tipo = cuenta.tipoCuentaContable || '-';
    const estadoClase = cuenta.activa ? 'active' : 'inactive';
    const estadoTexto = cuenta.activa ? 'Activa' : 'Inactiva';

    return `
        <li class="cuenta-node" data-codigo="${(cuenta.codigo || '').toLowerCase()}" data-nombre="${(cuenta.nombre || '').toLowerCase()}">
            <div class="cuenta-row">
                <div class="cuenta-toggle-wrapper">
                    ${hasChildren ? `
                        <button type="button" class="cuenta-toggle" data-id="${cuenta.id}" aria-expanded="false">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    ` : '<span class="cuenta-spacer"></span>'}
                </div>
                <div class="cuenta-details">
                    <div class="cuenta-primary">
                        <span class="cuenta-codigo">${cuenta.codigo || '-'}</span>
                        <span class="cuenta-nombre">${cuenta.nombre || '-'}</span>
                    </div>
                    <div class="cuenta-meta">
                        <span class="cuenta-tipo">${tipo}</span>
                        <span class="status-badge ${estadoClase}">${estadoTexto}</span>
                    </div>
                </div>
                <div class="action-btns">
                    <button class="action-btn edit" onclick="editCuentaContable(${cuenta.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteCuentaContable(${cuenta.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            ${hasChildren ? `
                <ul class="cuenta-children" data-parent="${cuenta.id}" hidden>
                    ${cuenta.children.map(child => renderCuentaNode(child)).join('')}
                </ul>
            ` : ''}
        </li>
    `;
}

function setupCuentaTreeInteractions() {
    const tree = document.getElementById('cuentasTree');
    if (!tree) return;

    tree.addEventListener('click', (event) => {
        const toggle = event.target.closest('.cuenta-toggle');
        if (!toggle) return;

        const node = toggle.closest('.cuenta-node');
        const children = node.querySelector(':scope > .cuenta-children');
        if (!children) return;

        const isExpanded = node.classList.toggle('expanded');
        toggle.setAttribute('aria-expanded', isExpanded);
        children.hidden = !isExpanded;

        const icon = toggle.querySelector('i');
        if (icon) {
            icon.classList.toggle('rotated', isExpanded);
        }
    });
}

window.filterCuentaTree = function(query = '') {
    const data = window.__cuentasTreeData || [];
    const treeContainer = document.getElementById('cuentasTree');
    if (!treeContainer) return;

    const normalized = query.trim().toLowerCase();
    if (!normalized) {
        renderCuentasTree(data);
        return;
    }

    const matches = data.filter(cuenta => {
        const codigo = (cuenta.codigo || '').toLowerCase();
        const nombre = (cuenta.nombre || '').toLowerCase();
        const tipo = (cuenta.tipoCuentaContable || '').toLowerCase();
        return codigo.includes(normalized) || nombre.includes(normalized) || tipo.includes(normalized);
    });

    // For search we simplify to flat list without hierarchy
    const html = `
        <div class="cuentas-tree cuentas-tree-search" id="cuentasTree">
            <ul class="cuenta-tree-root">
                ${matches.length ? matches.map(cuenta => renderCuentaNode({ ...cuenta, children: [] })).join('') : '<li class="cuenta-empty">Sin resultados</li>'}
            </ul>
        </div>
    `;
    treeContainer.outerHTML = html;
    setupCuentaTreeInteractions();
};

window.openCuentaContableModal = function() {
    openModal('Nueva Cuenta Contable', `
        <form id="cuentaForm">
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Código</label>
                    <input type="text" class="form-control" name="codigo" placeholder="ej. 1001" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Nombre</label>
                    <input type="text" class="form-control" name="nombre" placeholder="ej. Caja" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Tipo de Cuenta</label>
                    <select class="form-control" name="tipoCuentaContable" required>
                        <option value="ACTIVO">Activo</option>
                        <option value="PASIVO">Pasivo</option>
                        <option value="CAPITAL">Capital</option>
                        <option value="INGRESO">Ingreso</option>
                        <option value="GASTO">Gasto</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">ID Cuenta Padre</label>
                    <input type="number" class="form-control" name="cuentaPadreId">
                </div>
            </div>
        </form>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveCuentaContable()">Guardar</button>
    `);
};

window.saveCuentaContable = async function() {
    const form = document.getElementById('cuentaForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    data.cuentaPadreId = data.cuentaPadreId ? parseInt(data.cuentaPadreId) : null;
    
    try {
        showLoading();
        await api.createCuentaContable(data);
        showToast('Cuenta contable creada exitosamente', 'success');
        closeModal();
        loadCuentas();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.editCuentaContable = async function(id) {
    try {
        const cuenta = await api.getCuentaContable(id);
        openModal('Editar Cuenta Contable', `
            <form id="cuentaForm">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Código</label>
                        <input type="text" class="form-control" name="codigo" value="${cuenta.codigo || ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Nombre</label>
                        <input type="text" class="form-control" name="nombre" value="${cuenta.nombre || ''}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Tipo de Cuenta</label>
                        <select class="form-control" name="tipoCuentaContable" required>
                            <option value="ACTIVO" ${cuenta.tipoCuentaContable === 'ACTIVO' ? 'selected' : ''}>Activo</option>
                            <option value="PASIVO" ${cuenta.tipoCuentaContable === 'PASIVO' ? 'selected' : ''}>Pasivo</option>
                            <option value="CAPITAL" ${cuenta.tipoCuentaContable === 'CAPITAL' ? 'selected' : ''}>Capital</option>
                            <option value="INGRESO" ${cuenta.tipoCuentaContable === 'INGRESO' ? 'selected' : ''}>Ingreso</option>
                            <option value="GASTO" ${cuenta.tipoCuentaContable === 'GASTO' ? 'selected' : ''}>Gasto</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">ID Cuenta Padre</label>
                        <input type="number" class="form-control" name="cuentaPadreId" value="${cuenta.cuentaPadreId || ''}">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">
                        <input type="checkbox" name="activa" ${cuenta.activa ? 'checked' : ''}> Activa
                    </label>
                </div>
            </form>
        `, `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="updateCuentaContable(${id})">Actualizar</button>
        `);
    } catch (error) {
        showToast(error.message, 'error');
    }
};

window.updateCuentaContable = async function(id) {
    const form = document.getElementById('cuentaForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    data.cuentaPadreId = data.cuentaPadreId ? parseInt(data.cuentaPadreId) : null;
    data.activa = form.querySelector('input[name="activa"]').checked;
    
    try {
        showLoading();
        await api.updateCuentaContable(id, data);
        showToast('Cuenta contable actualizada exitosamente', 'success');
        closeModal();
        loadCuentas();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.deleteCuentaContable = async function(id) {
    if (!confirm('¿Estás seguro de eliminar esta cuenta contable?')) return;
    
    try {
        showLoading();
        await api.deleteCuentaContable(id);
        showToast('Cuenta contable eliminada exitosamente', 'success');
        loadCuentas();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};
