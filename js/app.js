// ========================================
// BC Systems - Main App (Modular)
// ========================================

// Global state
let currentPage = 'inicio';
let currentModule = 'inicio';
const defaultSortBy = {
    'inicio': 'id',
    'proveedores': 'idProveedor',
    'compras': 'idCompra',
    'ventas': 'idVenta',
    'gastos': 'idGasto',
    'empleados': 'idEmpleado',
    'nomina': 'idNomina',
    'comisiones': 'idComision',
    'cuentas': 'idCuentaContable',
    'asientos': 'idAsientoContable',
    'movimientos': 'idMovimientoContable',
        'productos': 'id',
    'almacen': 'id',
    'sucursales': 'idSucursal',
    'usuarios': 'idUsuario'
};
let paginationState = {
    page: 0,
    size: 20,
    sortBy: 'idProveedor',
    sortDir: 'asc',
    totalPages: 0,
    totalElements: 0
};

let modalInteractionsInitialized = false;

// Module loader
const modules = {};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    if (!api.isAuthenticated()) return;
    
    initUserInfo();
    initNavigation();
    initModalInteractions();
    loadPage('inicio');
});

// Initialize user info
function initUserInfo() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        document.getElementById('userName').textContent = user.username || 'Usuario';
        const roleLabels = { 'ADMIN': 'Administrador', 'ALMACEN': 'AlmacÃ©n', 'USER': 'Usuario' };
        document.getElementById('userRole').textContent = roleLabels[user.rol] || user.rol || 'Usuario';
        document.getElementById('userAvatar').innerHTML = '<i class="fas fa-user"></i>';

        // Show/hide nav sections based on role
        const isAdmin = user.rol === 'ADMIN';
        const isAlmacen = user.rol === 'ALMACEN';
        document.getElementById('nav-almacen-section').style.display = (isAdmin || isAlmacen) ? '' : 'none';
        document.getElementById('nav-admin-section').style.display = isAdmin ? '' : 'none';

        if (isAlmacen) {
            document.querySelectorAll('.sidebar-nav .nav-section').forEach(section => {
                if (section.id !== 'nav-almacen-section') {
                    section.style.display = 'none';
                }
            });
        }
    }
}

// Navigation
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            navigateTo(page);
        });
    });
}

function navigateTo(page) {
    currentPage = page;
    
    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });
    
    // Update page title
    const titles = {
        'inicio': 'Inicio',
        'ventas': 'Ventas',
        'compras': 'Compras',
        'gastos': 'Gastos',
        'nomina': 'NÃ³mina',
        'proveedores': 'Proveedores',
        'empleados': 'Empleados',
        'comisiones': 'Comisiones',
        'asientos': 'Asientos Contables',
        'cuentas': 'Cuentas Contables',
    'movimientos': 'Movimientos Contables',
    'productos': 'Inventario',
    'almacen': 'Movimientos de Almac\u00e9n',
    'sucursales': 'Sucursales',
    'usuarios': 'Usuarios'
    };
    document.getElementById('pageTitle').textContent = titles[page] || page;
    
    // Reset pagination
    paginationState = {
        page: 0,
        size: 20,
        sortBy: defaultSortBy[page] || 'id',
        sortDir: 'asc',
        totalPages: 0,
        totalElements: 0
    };
    
    // Load page content
    loadPage(page);
}

// Load page content
async function loadPage(page) {
    showLoading();
    
    try {
        // Load module if not loaded
        if (!modules[page]) {
            await loadModule(page);
        }
        
        // Call module init function (e.g., initVentas, initProveedores)
        const capitalizedPage = page.charAt(0).toUpperCase() + page.slice(1);
        const initFunctionName = 'init' + capitalizedPage;
        
        if (modules[page] && modules[page][initFunctionName]) {
            modules[page][initFunctionName]();
        } else if (page === 'inicio') {
            await renderInicioPage();
        }
    } catch (error) {
        console.error('Error loading page:', error);
        showToast('Error al cargar la pÃ¡gina', 'error');
        document.getElementById('pageContent').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error</h3>
                <p>${error.message}</p>
            </div>
        `;
    } finally {
        hideLoading();
    }
}

// Load module dynamically
async function loadModule(moduleName) {
    const moduleFiles = {
        'proveedores': 'js/modules/proveedores.js',
        'ventas': 'js/modules/ventas.js',
        'compras': 'js/modules/compras.js',
        'gastos': 'js/modules/gastos.js',
        'empleados': 'js/modules/empleados.js',
        'nomina': 'js/modules/nomina.js',
        'comisiones': 'js/modules/comisiones.js',
        'cuentas': 'js/modules/cuentas.js',
        'asientos': 'js/modules/asientos.js',
        'movimientos': 'js/modules/movimientos.js',
        'productos': 'js/modules/productos.js',
        'almacen': 'js/modules/almacen.js',
        'sucursales': 'js/modules/sucursales.js',
        'usuarios': 'js/modules/usuarios.js'
    };
    
    if (moduleFiles[moduleName]) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = moduleFiles[moduleName];
            script.onload = () => {
                modules[moduleName] = window;
                resolve();
            };
            script.onerror = () => reject(new Error(`Failed to load module: ${moduleName}`));
            document.head.appendChild(script);
        });
    }
}

// Inicio / Dashboard
async function renderInicioPage() {
    try {
        const [ventas, compras, proveedores, empleados] = await Promise.all([
            api.getVentas(0, 10),
            api.getCompras(0, 10),
            api.getProveedores(0, 10),
            api.getEmpleados(0, 10)
        ]);
        
        const content = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon primary">
                        <i class="fas fa-shopping-cart"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${ventas.totalElements || 0}</h3>
                        <p>Ventas Registradas</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon success">
                        <i class="fas fa-shopping-bag"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${compras.totalElements || 0}</h3>
                        <p>Compras Registradas</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon warning">
                        <i class="fas fa-truck"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${proveedores.totalElements || 0}</h3>
                        <p>Proveedores</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon danger">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${empleados.totalElements || 0}</h3>
                        <p>Empleados</p>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Bienvenido al Sistema de Contabilidad</h3>
                </div>
                <div class="card-body">
                    <p style="color: var(--text-secondary); line-height: 1.8;">
                        Este es el sistema de gestiÃ³n contable de <strong>BC Systems</strong>. 
                        Desde aquÃ­ podrÃ¡s administrar todos los aspectos de tu contabilidad:
                    </p>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-top: 20px;">
                        <div style="padding: 20px; background: var(--bg-body); border-radius: 12px;">
                            <i class="fas fa-book" style="font-size: 24px; color: var(--primary); margin-bottom: 12px;"></i>
                            <h4 style="margin-bottom: 8px;">Asientos Contables</h4>
                            <p style="font-size: 13px; color: var(--text-secondary);">Registra y administra todos los asientos contables de tu empresa</p>
                        </div>
                        <div style="padding: 20px; background: var(--bg-body); border-radius: 12px;">
                            <i class="fas fa-chart-line" style="font-size: 24px; color: var(--success); margin-bottom: 12px;"></i>
                            <h4 style="margin-bottom: 8px;">Reportes</h4>
                            <p style="font-size: 13px; color: var(--text-secondary);">Visualiza el estado financiero de tu negocio en tiempo real</p>
                        </div>
                        <div style="padding: 20px; background: var(--bg-body); border-radius: 12px;">
                            <i class="fas fa-shield-alt" style="font-size: 24px; color: var(--warning); margin-bottom: 12px;"></i>
                            <h4 style="margin-bottom: 8px;">Seguridad</h4>
                            <p style="font-size: 13px; color: var(--text-secondary);">Control de acceso y transacciones seguras</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('pageContent').innerHTML = content;
    } catch (error) {
        const content = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon primary">
                        <i class="fas fa-shopping-cart"></i>
                    </div>
                    <div class="stat-info">
                        <h3>-</h3>
                        <p>Ventas</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon success">
                        <i class="fas fa-shopping-bag"></i>
                    </div>
                    <div class="stat-info">
                        <h3>-</h3>
                        <p>Compras</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon warning">
                        <i class="fas fa-truck"></i>
                    </div>
                    <div class="stat-info">
                        <h3>-</h3>
                        <p>Proveedores</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon danger">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="stat-info">
                        <h3>-</h3>
                        <p>Empleados</p>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('pageContent').innerHTML = content;
    }
}

// ========================================
// PAGE RENDERERS
// ========================================

// Inicio / Dashboard
async function renderInicio() {
    try {
        const [ventas, compras, proveedores, empleados] = await Promise.all([
            api.getVentas(0, 10),
            api.getCompras(0, 10),
            api.getProveedores(0, 10),
            api.getEmpleados(0, 10)
        ]);
        
        return `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon primary">
                        <i class="fas fa-shopping-cart"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${ventas.totalElements || 0}</h3>
                        <p>Ventas Registradas</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon success">
                        <i class="fas fa-shopping-bag"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${compras.totalElements || 0}</h3>
                        <p>Compras Registradas</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon warning">
                        <i class="fas fa-truck"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${proveedores.totalElements || 0}</h3>
                        <p>Proveedores</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon danger">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${empleados.totalElements || 0}</h3>
                        <p>Empleados</p>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Bienvenido al Sistema de Contabilidad</h3>
                </div>
                <div class="card-body">
                    <p style="color: var(--text-secondary); line-height: 1.8;">
                        Este es el sistema de gestiÃ³n contable de <strong>BC Systems</strong>. 
                        Desde aquÃ­ podrÃ¡s administrar todos los aspectos de tu contabilidad:
                    </p>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-top: 20px;">
                        <div style="padding: 20px; background: var(--bg-body); border-radius: 12px;">
                            <i class="fas fa-book" style="font-size: 24px; color: var(--primary); margin-bottom: 12px;"></i>
                            <h4 style="margin-bottom: 8px;">Asientos Contables</h4>
                            <p style="font-size: 13px; color: var(--text-secondary);">Registra y administra todos los asientos contables de tu empresa</p>
                        </div>
                        <div style="padding: 20px; background: var(--bg-body); border-radius: 12px;">
                            <i class="fas fa-chart-line" style="font-size: 24px; color: var(--success); margin-bottom: 12px;"></i>
                            <h4 style="margin-bottom: 8px;">Reportes</h4>
                            <p style="font-size: 13px; color: var(--text-secondary);">Visualiza el estado financiero de tu negocio en tiempo real</p>
                        </div>
                        <div style="padding: 20px; background: var(--bg-body); border-radius: 12px;">
                            <i class="fas fa-shield-alt" style="font-size: 24px; color: var(--warning); margin-bottom: 12px;"></i>
                            <h4 style="margin-bottom: 8px;">Seguridad</h4>
                            <p style="font-size: 13px; color: var(--text-secondary);">Control de acceso y transacciones seguras</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        return `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon primary">
                        <i class="fas fa-shopping-cart"></i>
                    </div>
                    <div class="stat-info">
                        <h3>-</h3>
                        <p>Ventas</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon success">
                        <i class="fas fa-shopping-bag"></i>
                    </div>
                    <div class="stat-info">
                        <h3>-</h3>
                        <p>Compras</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon warning">
                        <i class="fas fa-truck"></i>
                    </div>
                    <div class="stat-info">
                        <h3>-</h3>
                        <p>Proveedores</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon danger">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="stat-info">
                        <h3>-</h3>
                        <p>Empleados</p>
                    </div>
                </div>
            </div>
        `;
    }
}

// Proveedores
async function renderProveedores() {
    let data = { content: [], totalElements: 0, totalPages: 0 };
    try {
        data = await api.getProveedores(paginationState.page, paginationState.size, paginationState.sortBy, paginationState.sortDir);
    } catch (e) {
        console.error(e);
    }
    
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
    
    return `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">GestiÃ³n de Proveedores</h3>
                <button class="btn btn-primary" onclick="openProveedorModal()">
                    <i class="fas fa-plus"></i> Nuevo Proveedor
                </button>
            </div>
            <div class="card-body">
                <div class="table-toolbar">
                    <div class="table-toolbar-left">
                        <div class="search-box">
                            <i class="fas fa-search"></i>
                            <input type="text" placeholder="Buscar proveedor...">
                        </div>
                    </div>
                    <div class="table-toolbar-right">
                        <select class="select-control" onchange="changePageSize(this.value, 'proveedores')">
                            <option value="10">10 por pÃ¡gina</option>
                            <option value="20" selected>20 por pÃ¡gina</option>
                            <option value="30">30 por pÃ¡gina</option>
                        </select>
                    </div>
                </div>
                ${data.content.length === 0 ? `
                    <div class="empty-state">
                        <i class="fas fa-truck"></i>
                        <h3>No hay proveedores</h3>
                        <p>Comienza agregando un nuevo proveedor</p>
                        <button class="btn btn-primary" onclick="openProveedorModal()">
                            <i class="fas fa-plus">edor
                        </button>
                    </i> Nuevo Prove</div>
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
}

// Ventas
async function renderVentas() {
    let data = { content: [], totalElements: 0, totalPages: 0 };
    try {
        data = await api.getVentas(paginationState.page, paginationState.size, paginationState.sortBy, paginationState.sortDir);
    } catch (e) {
        console.error(e);
    }
    
    const items = data.content.map(item => `
        <tr>
            <td>${item.id}</td>
            <td>${item.fecha_venta || '-'}</td>
            <td>${item.tipoVenta || '-'}</td>
            <td>${formatCurrency(item.total)}</td>
            <td><span class="status-badge ${item.estadoVenta?.toLowerCase() || 'pending'}">${item.estadoVenta || 'PENDIENTE'}</span></td>
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
    
    return `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">GestiÃ³n de Ventas</h3>
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
                            <option value="10">10 por pÃ¡gina</option>
                            <option value="20" selected>20 por pÃ¡gina</option>
                            <option value="30">30 por pÃ¡gina</option>
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
                                    <th>Estado</th>
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
}

// Compras
async function renderCompras() {
    let data = { content: [], totalElements: 0, totalPages: 0 };
    try {
        data = await api.getCompras(paginationState.page, paginationState.size, paginationState.sortBy, paginationState.sortDir);
    } catch (e) {
        console.error(e);
    }
    
    const items = data.content.map(item => `
        <tr>
            <td>${item.id}</td>
            <td>${item.fecha_compra || '-'}</td>
            <td>${formatCurrency(item.total_compra)}</td>
            <td><span class="status-badge ${item.estadoCompra?.toLowerCase() || 'pending'}">${item.estadoCompra || 'PENDIENTE'}</span></td>
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
    
    return `
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
                                    <th>Total</th>
                                    <th>Estado</th>
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
}

// Gastos
async function renderGastos() {
    let data = { content: [], totalElements: 0, totalPages: 0 };
    try {
        data = await api.getGastos(paginationState.page, paginationState.size, paginationState.sortBy, paginationState.sortDir);
    } catch (e) {
        console.error(e);
    }
    
    const items = data.content.map(item => `
        <tr>
            <td>${item.id}</td>
            <td>${item.fecha_gasto || '-'}</td>
            <td>${item.concepto || '-'}</td>
            <td>${formatCurrency(item.monto)}</td>
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
    
    return `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">GestiÃ³n de Gastos</h3>
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
                            <option value="10">10 por pÃ¡gina</option>
                            <option value="20" selected>20 por pÃ¡gina</option>
                            <option value="30">30 por pÃ¡gina</option>
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
}

// Empleados
async function renderEmpleados() {
    let data = { content: [], totalElements: 0, totalPages: 0 };
    try {
        data = await api.getEmpleados(paginationState.page, paginationState.size, paginationState.sortBy, paginationState.sortDir);
    } catch (e) {
        console.error(e);
    }
    
    const items = data.content.map(item => `
        <tr>
            <td>${item.id}</td>
            <td>${item.nombre || ''} ${item.primerApellido || ''}</td>
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
    `).join('');
    
    return `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">GestiÃ³n de Empleados</h3>
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
                            <option value="10">10 por pÃ¡gina</option>
                            <option value="20" selected>20 por pÃ¡gina</option>
                            <option value="30">30 por pÃ¡gina</option>
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
}

// NÃ³mina
async function renderNomina() {
    let data = { content: [], totalElements: 0, totalPages: 0 };
    try {
        data = await api.getNominas(paginationState.page, paginationState.size, paginationState.sortBy, paginationState.sortDir);
    } catch (e) {
        console.error(e);
    }
    
    const items = data.content.map(item => `
        <tr>
            <td>${item.id}</td>
            <td>${item.fecha_nomina || '-'}</td>
            <td>${formatCurrency(item.sueldo)}</td>
            <td>${item.empleadoId || '-'}</td>
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
    
    return `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">GestiÃ³n de NÃ³mina</h3>
                <button class="btn btn-primary" onclick="openNominaModal()">
                    <i class="fas fa-plus"></i> Nueva NÃ³mina
                </button>
            </div>
            <div class="card-body">
                <div class="table-toolbar">
                    <div class="table-toolbar-left">
                        <div class="search-box">
                            <i class="fas fa-search"></i>
                            <input type="text" placeholder="Buscar nÃ³mina...">
                        </div>
                    </div>
                    <div class="table-toolbar-right">
                        <select class="select-control" onchange="changePageSize(this.value, 'nomina')">
                            <option value="10">10 por pÃ¡gina</option>
                            <option value="20" selected>20 por pÃ¡gina</option>
                            <option value="30">30 por pÃ¡gina</option>
                        </select>
                    </div>
                </div>
                ${data.content.length === 0 ? `
                    <div class="empty-state">
                        <i class="fas fa-users"></i>
                        <h3>No hay nÃ³minas</h3>
                        <p>Comienza registrando una nueva nÃ³mina</p>
                        <button class="btn btn-primary" onclick="openNominaModal()">
                            <i class="fas fa-plus"></i> Nueva NÃ³mina
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
}

// Comisiones
async function renderComisiones() {
    let data = { content: [], totalElements: 0, totalPages: 0 };
    try {
        data = await api.getComisiones(paginationState.page, paginationState.size, paginationState.sortBy, paginationState.sortDir);
    } catch (e) {
        console.error(e);
    }
    
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
    
    return `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">GestiÃ³n de Comisiones</h3>
                <button class="btn btn-primary" onclick="openComisionModal()">
                    <i class="fas fa-plus"></i> Nueva ComisiÃ³n
                </button>
            </div>
            <div class="card-body">
                <div class="table-toolbar">
                    <div class="table-toolbar-left">
                        <div class="search-box">
                            <i class="fas fa-search"></i>
                            <input type="text" placeholder="Buscar comisiÃ³n...">
                        </div>
                    </div>
                    <div class="table-toolbar-right">
                        <select class="select-control" onchange="changePageSize(this.value, 'comisiones')">
                            <option value="10">10 por pÃ¡gina</option>
                            <option value="20" selected>20 por pÃ¡gina</option>
                            <option value="30">30 por pÃ¡gina</option>
                        </select>
                    </div>
                </div>
                ${data.content.length === 0 ? `
                    <div class="empty-state">
                        <i class="fas fa-percent"></i>
                        <h3>No hay comisiones</h3>
                        <p>Comienza registrando una nueva comisiÃ³n</p>
                        <button class="btn btn-primary" onclick="openComisionModal()">
                            <i class="fas fa-plus"></i> Nueva ComisiÃ³n
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
                                    <th>Monto ComisiÃ³n</th>
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
}

// Cuentas Contables
async function renderCuentas() {
    let data = { content: [], totalElements: 0, totalPages: 0 };
    try {
        data = await api.getCuentasContables(paginationState.page, paginationState.size, paginationState.sortBy, paginationState.sortDir);
    } catch (e) {
        console.error(e);
    }
    
    const items = data.content.map(item => `
        <tr>
            <td>${item.id}</td>
            <td>${item.codigo || '-'}</td>
            <td>${item.nombre || '-'}</td>
            <td>${item.tipoCuentaContable || '-'}</td>
            <td><span class="status-badge ${item.activa ? 'active' : 'inactive'}">${item.activa ? 'Activa' : 'Inactiva'}</span></td>
            <td>
                <div class="action-btns">
                    <button class="action-btn edit" onclick="editCuentaContable(${item.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteCuentaContable(${item.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    return `
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
                            <input type="text" placeholder="Buscar cuenta...">
                        </div>
                    </div>
                    <div class="table-toolbar-right">
                        <select class="select-control" onchange="changePageSize(this.value, 'cuentas')">
                            <option value="10">10 por pÃ¡gina</option>
                            <option value="20" selected>20 por pÃ¡gina</option>
                            <option value="30">30 por pÃ¡gina</option>
                        </select>
                    </div>
                </div>
                ${data.content.length === 0 ? `
                    <div class="empty-state">
                        <i class="fas fa-wallet"></i>
                        <h3>No hay cuentas contables</h3>
                        <p>Comienza creando el plan de cuentas</p>
                        <button class="btn btn-primary" onclick="openCuentaContableModal()">
                            <i class="fas fa-plus"></i> Nueva Cuenta
                        </button>
                    </div>
                ` : `
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>CÃ³digo</th>
                                    <th>Nombre</th>
                                    <th>Tipo</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items}
                            </tbody>
                        </table>
                    </div>
                    ${renderPagination(data, 'cuentas')}
                `}
            </div>
        </div>
    `;
}

// Asientos Contables
async function renderAsientos() {
    let data = { content: [], totalElements: 0, totalPages: 0 };
    try {
        data = await api.getAsientosContables(paginationState.page, paginationState.size, paginationState.sortBy, paginationState.sortDir);
    } catch (e) {
        console.error(e);
    }
    
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
    
    return `
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
                            <option value="10">10 por pÃ¡gina</option>
                            <option value="20" selected>20 por pÃ¡gina</option>
                            <option value="30">30 por pÃ¡gina</option>
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
                                    <th>DescripciÃ³n</th>
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
}

// Movimientos Contables
async function renderMovimientos() {
    let data = { content: [], totalElements: 0, totalPages: 0 };
    try {
        data = await api.getMovimientosContables(paginationState.page, paginationState.size, paginationState.sortBy, paginationState.sortDir);
    } catch (e) {
        console.error(e);
    }
    
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
    
    return `
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
                            <option value="10">10 por pÃ¡gina</option>
                            <option value="20" selected>20 por pÃ¡gina</option>
                            <option value="30">30 por pÃ¡gina</option>
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
                                <tr>
                                    <th>ID</th>
                                    <th>CÃ³digo</th>
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
}

// ========================================
// HELPER FUNCTIONS
// ========================================

// Toggle sidebar
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

// Show/hide loading
function showLoading() {
    document.getElementById('loadingOverlay').classList.add('active');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
}

// Show toast notification
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas ${icons[type]}"></i>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

// Modal functions
function initModalInteractions() {
    if (modalInteractionsInitialized) return;
    const overlay = document.getElementById('modalOverlay');
    if (!overlay) return;

    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
            closeModal();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && overlay.classList.contains('active')) {
            closeModal();
        }
    });

    modalInteractionsInitialized = true;
}

function openModal(title, bodyContent, footerContent) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyContent;
    document.getElementById('modalFooter').innerHTML = footerContent;
    document.getElementById('modalOverlay').classList.add('active');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
}

// Format currency
function formatCurrency(value) {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(value);
}

// Render pagination
function renderPagination(data, module) {
    if (data.totalPages <= 1) return '';
    
    let buttons = '';
    const maxVisible = 5;
    let startPage = Math.max(0, data.number - Math.floor(maxVisible / 2));
    let endPage = Math.min(data.totalPages, startPage + maxVisible);
    
    if (endPage - startPage < maxVisible) {
        startPage = Math.max(0, endPage - maxVisible);
    }
    
    buttons += `<button class="pagination-btn" onclick="changePage(${data.number - 1}, '${module}')" ${data.number === 0 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>`;
    
    for (let i = startPage; i < endPage; i++) {
        buttons += `<button class="pagination-btn ${i === data.number ? 'active' : ''}" onclick="changePage(${i}, '${module}')">${i + 1}</button>`;
    }
    
    buttons += `<button class="pagination-btn" onclick="changePage(${data.number + 1}, '${module}')" ${data.number >= data.totalPages - 1 ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>`;
    
    return `
        <div class="pagination">
            <div class="pagination-info">
                Mostrando ${data.number * data.size + 1} - ${Math.min((data.number + 1) * data.size, data.totalElements)} de ${data.totalElements} registros
            </div>
            <div class="pagination-controls">
                ${buttons}
            </div>
        </div>
    `;
}

// Pagination controls
function changePage(page, module) {
    paginationState.page = page;
    loadPage(module);
}

function changePageSize(size, module) {
    paginationState.size = parseInt(size);
    paginationState.page = 0;
    loadPage(module);
}

// Modal handlers - Placeholder functions
window.openProveedorModal = function() {
    openModal('Nuevo Proveedor', `
        <form id="proveedorForm">
            <div class="form-group">
                <label class="form-label">Nombre</label>
                <input type="text" class="form-control" name="nombre" required>
            </div>
        </form>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveProveedor()">Guardar</button>
    `);
};

window.saveProveedor = async function() {
    const form = document.getElementById('proveedorForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    try {
        showLoading();
        await api.createProveedor(data);
        showToast('Proveedor creado exitosamente', 'success');
        closeModal();
        loadPage('proveedores');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.editProveedor = async function(id) {
    try {
        const proveedor = await api.getProveedor(id);
        openModal('Editar Proveedor', `
            <form id="proveedorForm">
                <div class="form-group">
                    <label class="form-label">Nombre</label>
                    <input type="text" class="form-control" name="nombre" value="${proveedor.nombre}" required>
                </div>
            </form>
        `, `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="updateProveedor(${id})">Actualizar</button>
        `);
    } catch (error) {
        showToast(error.message, 'error');
    }
};

window.updateProveedor = async function(id) {
    const form = document.getElementById('proveedorForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    try {
        showLoading();
        await api.updateProveedor(id, data);
        showToast('Proveedor actualizado exitosamente', 'success');
        closeModal();
        loadPage('proveedores');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.deleteProveedor = async function(id) {
    if (!confirm('Â¿EstÃ¡s seguro de eliminar este proveedor?')) return;
    
    try {
        showLoading();
        await api.deleteProveedor(id);
        showToast('Proveedor eliminado exitosamente', 'success');
        loadPage('proveedores');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

// ========================================
// VENTAS CRUD
// ========================================
window.openVentaModal = function() {
    const today = new Date().toISOString().split('T')[0];
    openModal('Nueva Venta', `
        <form id="ventaForm">
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Fecha de Venta</label>
                    <input type="date" class="form-control" name="fecha_venta" value="${today}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Tipo de Venta</label>
                    <select class="form-select" name="tipoVenta" required>
                        <option value="CONTADO">Contado</option>
                        <option value="CREDITO">CrÃ©dito</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Total</label>
                    <input type="number" step="0.01" class="form-control" name="total" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Costo</label>
                    <input type="number" step="0.01" class="form-control" name="costo" required>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">ID Asiento (opcional)</label>
                <input type="number" class="form-control" name="asientoId">
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
    data.costo = parseFloat(data.costo);
    data.asientoId = data.asientoId ? parseInt(data.asientoId) : null;
    
    try {
        showLoading();
        await api.createVenta(data);
        showToast('Venta creada exitosamente', 'success');
        closeModal();
        loadPage('ventas');
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
                        <select class="form-select" name="tipoVenta" required>
                            <option value="CONTADO" ${venta.tipoVenta === 'CONTADO' ? 'selected' : ''}>Contado</option>
                            <option value="CREDITO" ${venta.tipoVenta === 'CREDITO' ? 'selected' : ''}>CrÃ©dito</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Total</label>
                        <input type="number" step="0.01" class="form-control" name="total" value="${venta.total}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Costo</label>
                        <input type="number" step="0.01" class="form-control" name="costo" value="${venta.costo}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Estado</label>
                        <select class="form-select" name="estadoVenta" required>
                            <option value="PENDIENTE" ${venta.estadoVenta === 'PENDIENTE' ? 'selected' : ''}>Pendiente</option>
                            <option value="LIQUIDADA" ${venta.estadoVenta === 'LIQUIDADA' ? 'selected' : ''}>Liquidada</option>
                            <option value="CANCELADA" ${venta.estadoVenta === 'CANCELADA' ? 'selected' : ''}>Cancelada</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">ID Asiento</label>
                        <input type="number" class="form-control" name="asientoId" value="${venta.asientoId || ''}">
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
    data.costo = parseFloat(data.costo);
    data.asientoId = data.asientoId ? parseInt(data.asientoId) : null;
    
    try {
        showLoading();
        await api.updateVenta(id, data);
        showToast('Venta actualizada exitosamente', 'success');
        closeModal();
        loadPage('ventas');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.deleteVenta = async function(id) {
    if (!confirm('Â¿EstÃ¡s seguro de eliminar esta venta?')) return;
    
    try {
        showLoading();
        await api.deleteVenta(id);
        showToast('Venta eliminada exitosamente', 'success');
        loadPage('ventas');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

// ========================================
// COMPRAS CRUD
// ========================================
window.openCompraModal = function() {
    const today = new Date().toISOString().split('T')[0];
    openModal('Nueva Compra', `
        <form id="compraForm">
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Fecha de Compra</label>
                    <input type="date" class="form-control" name="fecha_compra" value="${today}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Total</label>
                    <input type="number" step="0.01" class="form-control" name="total_compra" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">ID Proveedor</label>
                    <input type="number" class="form-control" name="proveedorId">
                </div>
                <div class="form-group">
                    <label class="form-label">ID Asiento</label>
                    <input type="number" class="form-control" name="asientoId">
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
    data.asientoId = data.asientoId ? parseInt(data.asientoId) : null;
    
    try {
        showLoading();
        await api.createCompra(data);
        showToast('Compra creada exitosamente', 'success');
        closeModal();
        loadPage('compras');
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
                        <label class="form-label">Total</label>
                        <input type="number" step="0.01" class="form-control" name="total_compra" value="${compra.total_compra}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Estado</label>
                        <select class="form-select" name="estadoCompra" required>
                            <option value="PENDIENTE" ${compra.estadoCompra === 'PENDIENTE' ? 'selected' : ''}>Pendiente</option>
                            <option value="PAGADA" ${compra.estadoCompra === 'PAGADA' ? 'selected' : ''}>Pagada</option>
                            <option value="CANCELADA" ${compra.estadoCompra === 'CANCELADA' ? 'selected' : ''}>Cancelada</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">ID Proveedor</label>
                        <input type="number" class="form-control" name="proveedorId" value="${compra.proveedorId || ''}">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">ID Asiento</label>
                    <input type="number" class="form-control" name="asientoId" value="${compra.asientoId || ''}">
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
    data.asientoId = data.asientoId ? parseInt(data.asientoId) : null;
    
    try {
        showLoading();
        await api.updateCompra(id, data);
        showToast('Compra actualizada exitosamente', 'success');
        closeModal();
        loadPage('compras');
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
        loadPage('compras');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

// ========================================
// GASTOS CRUD
// ========================================
window.openGastoModal = function() {
    const today = new Date().toISOString().split('T')[0];
    openModal('Nuevo Gasto', `
        <form id="gastoForm">
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
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">ID Cuenta Contable</label>
                    <input type="number" class="form-control" name="cuentaContableId">
                </div>
                <div class="form-group">
                    <label class="form-label">ID Asiento</label>
                    <input type="number" class="form-control" name="asientoId">
                </div>
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
    data.asientoId = data.asientoId ? parseInt(data.asientoId) : null;
    
    try {
        showLoading();
        await api.createGasto(data);
        showToast('Gasto creado exitosamente', 'success');
        closeModal();
        loadPage('gastos');
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
                        <label class="form-label">ID Asiento</label>
                        <input type="number" class="form-control" name="asientoId" value="${gasto.asientoId || ''}">
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
    data.asientoId = data.asientoId ? parseInt(data.asientoId) : null;
    
    try {
        showLoading();
        await api.updateGasto(id, data);
        showToast('Gasto actualizado exitosamente', 'success');
        closeModal();
        loadPage('gastos');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.deleteGasto = async function(id) {
    if (!confirm('Â¿EstÃ¡s seguro de eliminar este gasto?')) return;
    
    try {
        showLoading();
        await api.deleteGasto(id);
        showToast('Gasto eliminado exitosamente', 'success');
        loadPage('gastos');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

// ========================================
// EMPLEADOS CRUD
// ========================================
window.openEmpleadoModal = function() {
    openModal('Nuevo Empleado', `
        <form id="empleadoForm">
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">ID Persona</label>
                    <input type="number" class="form-control" name="personaId" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Puesto</label>
                    <select class="form-select" name="position" required>
                        <option value="VENDEDOR">Vendedor</option>
                        <option value="COBRADOR">Cobrador</option>
                        <option value="ADMINISTRADOR">Administrador</option>
                        <option value="CONTADOR">Contador</option>
                        <option value="AUXILIAR">Auxiliar</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">
                    <input type="checkbox" name="activo" checked> Activo
                </label>
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
    const data = Object.fromEntries(formData);
    data.personaId = parseInt(data.personaId);
    data.activo = form.querySelector('input[name="activo"]').checked;
    
    try {
        showLoading();
        await api.createEmpleado(data);
        showToast('Empleado creado exitosamente', 'success');
        closeModal();
        loadPage('empleados');
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
                <div class="form-group">
                    <label class="form-label">ID Persona</label>
                    <input type="number" class="form-control" name="personaId" value="${empleado.personaId || ''}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Puesto</label>
                    <select class="form-select" name="position" required>
                        <option value="VENDEDOR" ${empleado.position === 'VENDEDOR' ? 'selected' : ''}>Vendedor</option>
                        <option value="COBRADOR" ${empleado.position === 'COBRADOR' ? 'selected' : ''}>Cobrador</option>
                        <option value="ADMINISTRADOR" ${empleado.position === 'ADMINISTRADOR' ? 'selected' : ''}>Administrador</option>
                        <option value="CONTADOR" ${empleado.position === 'CONTADOR' ? 'selected' : ''}>Contador</option>
                        <option value="AUXILIAR" ${empleado.position === 'AUXILIAR' ? 'selected' : ''}>Auxiliar</option>
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
    const data = Object.fromEntries(formData);
    data.personaId = parseInt(data.personaId);
    data.activo = form.querySelector('input[name="activo"]').checked;
    
    try {
        showLoading();
        await api.updateEmpleado(id, data);
        showToast('Empleado actualizado exitosamente', 'success');
        closeModal();
        loadPage('empleados');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

// ========================================
// NÃ“MINA CRUD
// ========================================
window.openNominaModal = function() {
    const today = new Date().toISOString().split('T')[0];
    openModal('Nueva NÃ³mina', `
        <form id="nominaForm">
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
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">ID Empleado</label>
                    <input type="number" class="form-control" name="empleadoId" required>
                </div>
                <div class="form-group">
                    <label class="form-label">ID Asiento</label>
                    <input type="number" class="form-control" name="asientoId">
                </div>
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
    data.empleadoId = parseInt(data.empleadoId);
    data.asientoId = data.asientoId ? parseInt(data.asientoId) : null;
    
    try {
        showLoading();
        await api.createNomina(data);
        showToast('NÃ³mina creada exitosamente', 'success');
        closeModal();
        loadPage('nomina');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.editNomina = async function(id) {
    try {
        const nomina = await api.getNomina(id);
        openModal('Editar NÃ³mina', `
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
                        <label class="form-label">ID Empleado</label>
                        <input type="number" class="form-control" name="empleadoId" value="${nomina.empleadoId || ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">ID Asiento</label>
                        <input type="number" class="form-control" name="asientoId" value="${nomina.asientoId || ''}">
                    </div>
                </div>
            </form>
        `, `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="updateNomina(${id})">Actualizar</button>
        `);
    } catch (error) {
        showToast(error.message, 'error');
    }
};

window.updateNomina = async function(id) {
    const form = document.getElementById('nominaForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    data.sueldo = parseFloat(data.sueldo);
    data.empleadoId = parseInt(data.empleadoId);
    data.asientoId = data.asientoId ? parseInt(data.asientoId) : null;
    
    try {
        showLoading();
        await api.updateNomina(id, data);
        showToast('NÃ³mina actualizada exitosamente', 'success');
        closeModal();
        loadPage('nomina');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.deleteNomina = async function(id) {
    if (!confirm('Â¿EstÃ¡s seguro de eliminar esta nÃ³mina?')) return;
    
    try {
        showLoading();
        await api.deleteNomina(id);
        showToast('NÃ³mina eliminada exitosamente', 'success');
        loadPage('nomina');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

// ========================================
// COMISIONES CRUD
// ========================================
window.openComisionModal = function() {
    openModal('Nueva ComisiÃ³n', `
        <form id="comisionForm">
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Tipo de ComisiÃ³n</label>
                    <select class="form-select" name="tipoComision" required>
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
                    <label class="form-label">ID Empleado</label>
                    <input type="number" class="form-control" name="empleadoId" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">ID Venta</label>
                    <input type="number" class="form-control" name="ventaId">
                </div>
            </div>
        </form>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveComision()">Guardar</button>
    `);
};

window.saveComision = async function() {
    const form = document.getElementById('comisionForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    data.montoBase = parseFloat(data.montoBase);
    data.porcentajeComision = parseFloat(data.porcentajeComision);
    data.empleadoId = parseInt(data.empleadoId);
    data.ventaId = data.ventaId ? parseInt(data.ventaId) : null;
    
    try {
        showLoading();
        await api.createComision(data);
        showToast('ComisiÃ³n creada exitosamente', 'success');
        closeModal();
        loadPage('comisiones');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.editComision = async function(id) {
    try {
        const comision = await api.getComision(id);
        openModal('Editar ComisiÃ³n', `
            <form id="comisionForm">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Tipo de ComisiÃ³n</label>
                        <select class="form-select" name="tipoComision" required>
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
                        <select class="form-select" name="estadoComision" required>
                            <option value="PENDIENTE" ${comision.estadoComision === 'PENDIENTE' ? 'selected' : ''}>Pendiente</option>
                            <option value="PAGADA" ${comision.estadoComision === 'PAGADA' ? 'selected' : ''}>Pagada</option>
                            <option value="CANCELADA" ${comision.estadoComision === 'CANCELADA' ? 'selected' : ''}>Cancelada</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">ID Empleado</label>
                        <input type="number" class="form-control" name="empleadoId" value="${comision.empleadoId || ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">ID Venta</label>
                        <input type="number" class="form-control" name="ventaId" value="${comision.ventaId || ''}">
                    </div>
                </div>
            </form>
        `, `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="updateComision(${id})">Actualizar</button>
        `);
    } catch (error) {
        showToast(error.message, 'error');
    }
};

window.updateComision = async function(id) {
    const form = document.getElementById('comisionForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    data.montoBase = parseFloat(data.montoBase);
    data.porcentajeComision = parseFloat(data.porcentajeComision);
    data.empleadoId = parseInt(data.empleadoId);
    data.ventaId = data.ventaId ? parseInt(data.ventaId) : null;
    
    try {
        showLoading();
        await api.updateComision(id, data);
        showToast('ComisiÃ³n actualizada exitosamente', 'success');
        closeModal();
        loadPage('comisiones');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.deleteComision = async function(id) {
    if (!confirm('Â¿EstÃ¡s seguro de eliminar esta comisiÃ³n?')) return;
    
    try {
        showLoading();
        await api.deleteComision(id);
        showToast('ComisiÃ³n eliminada exitosamente', 'success');
        loadPage('comisiones');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

// ========================================
// CUENTAS CONTABLES CRUD
// ========================================
window.openCuentaContableModal = function() {
    openModal('Nueva Cuenta Contable', `
        <form id="cuentaForm">
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">CÃ³digo</label>
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
                    <select class="form-select" name="tipoCuentaContable" required>
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
        loadPage('cuentas');
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
                        <label class="form-label">CÃ³digo</label>
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
                        <select class="form-select" name="tipoCuentaContable" required>
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
        loadPage('cuentas');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.deleteCuentaContable = async function(id) {
    if (!confirm('Â¿EstÃ¡s seguro de eliminar esta cuenta contable?')) return;
    
    try {
        showLoading();
        await api.deleteCuentaContable(id);
        showToast('Cuenta contable eliminada exitosamente', 'success');
        loadPage('cuentas');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

// ========================================
// ASIENTOS CONTABLES CRUD
// ========================================
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
                <label class="form-label">DescripciÃ³n</label>
                <textarea class="form-control" name="descripcion" rows="2" required></textarea>
            </div>
            <div class="form-group">
                <label class="form-label">Tipo de Asiento</label>
                <select class="form-select" name="tipoAsientoContable" required>
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
        loadPage('asientos');
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
                    <span class="detail-label">DescripciÃ³n:</span>
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
                    <label class="form-label">DescripciÃ³n</label>
                    <textarea class="form-control" name="descripcion" rows="2" required>${asiento.descripcion || ''}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Tipo de Asiento</label>
                    <select class="form-select" name="tipoAsientoContable" required>
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
        loadPage('asientos');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.deleteAsiento = async function(id) {
    if (!confirm('Â¿EstÃ¡s seguro de eliminar este asiento contable?')) return;
    
    try {
        showLoading();
        await api.deleteAsientoContable(id);
        showToast('Asiento contable eliminado exitosamente', 'success');
        loadPage('asientos');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

// ========================================
// MOVIMIENTOS CONTABLES CRUD
// ========================================
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
        loadPage('movimientos');
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
        loadPage('movimientos');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.deleteMovimiento = async function(id) {
    if (!confirm('Â¿EstÃ¡s seguro de eliminar este movimiento contable?')) return;
    
    try {
        showLoading();
        await api.deleteMovimientoContable(id);
        showToast('Movimiento contable eliminado exitosamente', 'success');
        loadPage('movimientos');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};
