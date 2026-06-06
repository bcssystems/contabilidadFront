// ========================================
// BC Systems - Módulo Inventario (Productos)
// ========================================

const API_IMAGES_URL = 'http://localhost:8887/api/images';
let allProductos = [];
let searchTimeout;
let isSearching = false;

window.initProductos = function() {
    loadProductos(paginationState.page);
    loadAllProductos();
};

async function loadAllProductos() {
    try {
        const data = await api.getProductos(0, 1000, 'id', 'asc');
        allProductos = data.content || [];
    } catch (e) {
        console.warn('No se pudo cargar caché de búsqueda:', e);
    }
}

function debouncedSearchProductos(query) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => searchProductos(query), 350);
}

async function loadProductos(page = 0) {
    showLoading();
    try {
        const data = await api.getProductos(page, paginationState.size, paginationState.sortBy, paginationState.sortDir);
        paginationState.productosData = data;
        isSearching = false;
        renderProductosTable(data);
    } catch (error) {
        console.error('Error cargando productos:', error);
        showToast('Error al cargar productos: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function buildProductosRows(items) {
    return items.map(item => `
        <tr>
            <td>${item.id}</td>
            <td>
                ${item.imagenes && item.imagenes.length > 0
                    ? `<img src="${API_IMAGES_URL}/${item.imagenes[0]}" alt="${item.nombre}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;">`
                    : '<div style="width:40px;height:40px;background:var(--bg-body);border-radius:6px;display:flex;align-items:center;justify-content:center;"><i class="fas fa-box" style="color:var(--text-light);"></i></div>'}
            </td>
            <td>${item.nombre}</td>
            <td>${item.marca || '-'}</td>
            <td>${item.modelo || '-'}</td>
            <td>${formatCurrency(item.precioVenta)}</td>
            <td><span class="status-badge ${item.estado === 'NUEVO' ? 'active' : 'warning'}">${item.estado}</span></td>
            <td><span class="status-badge" style="background:var(--info);color:white;">${item.categoria}</span></td>
            <td><span class="status-badge ${item.pagadoCaja ? 'active' : 'inactive'}">${item.pagadoCaja ? 'Sí' : 'No'}</span></td>
            <td>
                <div class="action-btns">
                    <button class="action-btn view" onclick="viewProducto(${item.id})" title="Ver">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn edit" onclick="editProducto(${item.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteProducto(${item.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderProductosTable(data) {
    const items = buildProductosRows(data.content);

    const html = `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Gesti\u00f3n de Inventario</h3>
                <button class="btn btn-primary" onclick="openProductoModal()">
                    <i class="fas fa-plus"></i> Nuevo Producto
                </button>
            </div>
            <div class="card-body">
                <div class="table-toolbar">
                    <div class="table-toolbar-left">
                        <div class="search-box">
                            <i class="fas fa-search"></i>
                            <input type="text" placeholder="Buscar producto..." id="productoSearchInput" onkeyup="debouncedSearchProductos(this.value)">
                        </div>
                    </div>
                    <div class="table-toolbar-right">
                        <select class="select-control" onchange="changePageSize(this.value, 'productos')">
                            <option value="10">10 por p\u00e1gina</option>
                            <option value="20" selected>20 por p\u00e1gina</option>
                            <option value="30">30 por p\u00e1gina</option>
                        </select>
                    </div>
                </div>
                ${data.content.length === 0 ? `
                    <div class="empty-state">
                        <i class="fas fa-box"></i>
                        <h3>No hay productos</h3>
                        <p>Comienza agregando un nuevo producto al inventario</p>
                        <button class="btn btn-primary" onclick="openProductoModal()">
                            <i class="fas fa-plus"></i> Nuevo Producto
                        </button>
                    </div>
                ` : `
                    <div id="productosTableContainer">
                        <div class="table-container">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Imagen</th>
                                        <th>Nombre</th>
                                        <th>Marca</th>
                                        <th>Modelo</th>
                                        <th>Precio Venta</th>
                                        <th>Estado</th>
                                        <th>Categor\u00eda</th>
                                        <th>Pagado Caja</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="productosTableBody">
                                    ${items}
                                </tbody>
                            </table>
                        </div>
                        <div id="productosPagination">
                            ${renderPagination(data, 'productos')}
                        </div>
                    </div>
                `}
            </div>
        </div>
    `;

    document.getElementById('pageContent').innerHTML = html;
}

function searchProductos(query) {
    if (query.length >= 2 && allProductos.length > 0) {
        isSearching = true;
        const filtered = allProductos.filter(p =>
            p.nombre.toLowerCase().includes(query.toLowerCase()) ||
            (p.marca && p.marca.toLowerCase().includes(query.toLowerCase())) ||
            (p.modelo && p.modelo.toLowerCase().includes(query.toLowerCase()))
        );

        const tbody = document.getElementById('productosTableBody');
        if (tbody) {
            tbody.innerHTML = buildProductosRows(filtered);
        }
        const count = document.querySelector('.pagination-info');
        if (count) {
            count.textContent = `${filtered.length} resultado${filtered.length !== 1 ? 's' : ''}`;
        }
    } else if (query.length === 0) {
        if (isSearching) {
            isSearching = false;
            loadProductos(paginationState.page);
        }
    }
}
// View product detail
window.viewProducto = async function(id) {
    try {
        const p = await api.getProducto(id);
        const imagenesHtml = p.imagenes && p.imagenes.length > 0
            ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
                ${p.imagenes.map(img => `<img src="${API_IMAGES_URL}/${img}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;border:2px solid var(--border-color);">`).join('')}
               </div>`
            : '<p style="color:var(--text-light);">Sin imágenes</p>';

        const especsHtml = p.especificaciones && p.especificaciones.length > 0
            ? `<ul style="margin:0;padding-left:20px;">${p.especificaciones.map(s => `<li style="margin-bottom:4px;">${s}</li>`).join('')}</ul>`
            : '<p style="color:var(--text-light);">Sin especificaciones</p>';

        openModal(`Producto #${p.id} - ${p.nombre}`, `
            ${imagenesHtml}
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div><strong>Nombre:</strong> ${p.nombre}</div>
                <div><strong>Marca:</strong> ${p.marca || '-'}</div>
                <div><strong>Modelo:</strong> ${p.modelo || '-'}</div>
                <div><strong>Precio Compra:</strong> ${formatCurrency(p.precioCompra)}</div>
                <div><strong>Precio Venta:</strong> ${formatCurrency(p.precioVenta)}</div>
                <div><strong>Estado:</strong> ${p.estado}</div>
                <div><strong>Categoría:</strong> ${p.categoria}</div>
                <div><strong>Pagado Caja:</strong> ${p.pagadoCaja ? 'Sí' : 'No'}</div>
            </div>
            <div style="margin-top:12px;">
                <strong>Descripción:</strong>
                <p style="color:var(--text-secondary);">${p.descripcion || 'Sin descripción'}</p>
            </div>
            <div style="margin-top:12px;">
                <strong>Especificaciones:</strong>
                ${especsHtml}
            </div>
            <div style="margin-top:12px;">
                <strong>WhatsApp:</strong>
                <p style="color:var(--text-secondary);">${p.mensajeWhatsapp || '-'}</p>
            </div>
        `, `
            <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
        `);
    } catch (error) {
        showToast(error.message, 'error');
    }
};

// Open create modal
window.openProductoModal = function() {
    openModal('Nuevo Producto', buildProductoForm({}), `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveProducto()">Guardar</button>
    `);
    initEspecificacionesInputs();
};

// Save product
window.saveProducto = async function() {
    const form = document.getElementById('productoForm');
    const formData = new FormData(form);

    const especs = collectEspecificaciones();
    const data = {
        nombre: formData.get('nombre'),
        marca: formData.get('marca'),
        modelo: formData.get('modelo'),
        precioCompra: parseFloat(formData.get('precioCompra')) || 0,
        precioVenta: parseFloat(formData.get('precioVenta')) || 0,
        estado: formData.get('estado'),
        categoria: formData.get('categoria'),
        descripcion: formData.get('descripcion'),
        especificaciones: especs,
        mensajeWhatsapp: formData.get('mensajeWhatsapp'),
        pagadoCaja: document.getElementById('pagadoCaja').checked
    };

    const jsonBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const submitData = new FormData();
    submitData.append('data', jsonBlob, 'data.json');

    const imageFiles = document.getElementById('productoImagenes').files;
    for (let i = 0; i < imageFiles.length; i++) {
        submitData.append('imagenes', imageFiles[i]);
    }

    try {
        showLoading();
        await api.createProducto(submitData);
        showToast('Producto creado exitosamente', 'success');
        closeModal();
        loadProductos();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

// Edit product
window.editProducto = async function(id) {
    try {
        const p = await api.getProducto(id);
        openModal('Editar Producto', buildProductoForm(p), `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="updateProducto(${id})">Actualizar</button>
        `);
        initEspecificacionesInputs(p.especificaciones || []);
    } catch (error) {
        showToast(error.message, 'error');
    }
};

// Update product
window.updateProducto = async function(id) {
    const form = document.getElementById('productoForm');
    const formData = new FormData(form);

    const especs = collectEspecificaciones();
    const data = {
        nombre: formData.get('nombre'),
        marca: formData.get('marca'),
        modelo: formData.get('modelo'),
        precioCompra: parseFloat(formData.get('precioCompra')) || 0,
        precioVenta: parseFloat(formData.get('precioVenta')) || 0,
        estado: formData.get('estado'),
        categoria: formData.get('categoria'),
        descripcion: formData.get('descripcion'),
        especificaciones: especs,
        mensajeWhatsapp: formData.get('mensajeWhatsapp'),
        pagadoCaja: document.getElementById('pagadoCaja').checked
    };

    const jsonBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const submitData = new FormData();
    submitData.append('data', jsonBlob, 'data.json');

    const imageFiles = document.getElementById('productoImagenes').files;
    for (let i = 0; i < imageFiles.length; i++) {
        submitData.append('imagenes', imageFiles[i]);
    }

    try {
        showLoading();
        await api.updateProducto(id, submitData);
        showToast('Producto actualizado exitosamente', 'success');
        closeModal();
        loadProductos();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

// Delete product
window.deleteProducto = async function(id) {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;

    try {
        showLoading();
        await api.deleteProducto(id);
        showToast('Producto eliminado exitosamente', 'success');
        loadProductos();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

// Build product form HTML
function buildProductoForm(producto) {
    const categorias = ['ACCESORIOS', 'ANDROID', 'COMPUTADORAS', 'GADGETS', 'HOGAR', 'IPHONE', 'MOVILIDAD', 'TABLETS', 'VIDEOJUEGOS'];
    const estados = ['NUEVO', 'SEMI'];

    const existingImagesHtml = producto.imagenes && producto.imagenes.length > 0
        ? `<div style="margin-bottom:12px;">
            <label class="form-label">Imágenes actuales</label>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                ${producto.imagenes.map(img => `<img src="${API_IMAGES_URL}/${img}" style="width:60px;height:60px;object-fit:cover;border-radius:6px;border:2px solid var(--border-color);">`).join('')}
            </div>
           </div>`
        : '';

    return `
        <form id="productoForm">
            ${existingImagesHtml}
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Nombre *</label>
                    <input type="text" class="form-control" name="nombre" value="${producto.nombre || ''}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Marca</label>
                    <input type="text" class="form-control" name="marca" value="${producto.marca || ''}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Modelo</label>
                    <input type="text" class="form-control" name="modelo" value="${producto.modelo || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Categoría *</label>
                    <select class="form-control" name="categoria" required>
                        <option value="">Seleccionar...</option>
                        ${categorias.map(c => `<option value="${c}" ${producto.categoria === c ? 'selected' : ''}>${c}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Estado *</label>
                    <select class="form-control" name="estado" required>
                        ${estados.map(e => `<option value="${e}" ${producto.estado === e ? 'selected' : ''}>${e}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label" style="display:flex;align-items:center;gap:8px;margin-top:24px;">
                        <input type="checkbox" id="pagadoCaja" ${producto.pagadoCaja ? 'checked' : ''}>
                        Pagado de Caja
                    </label>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Precio Compra</label>
                    <input type="number" step="0.01" class="form-control" name="precioCompra" value="${producto.precioCompra || ''}" placeholder="0.00">
                </div>
                <div class="form-group">
                    <label class="form-label">Precio Venta *</label>
                    <input type="number" step="0.01" class="form-control" name="precioVenta" value="${producto.precioVenta || ''}" required placeholder="0.00">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Descripción</label>
                <textarea class="form-control" name="descripcion" rows="3">${producto.descripcion || ''}</textarea>
            </div>
            <div class="form-group">
                <label class="form-label">Especificaciones</label>
                <div id="especificaciones-container">
                    <div style="display:flex;gap:8px;margin-bottom:8px;">
                        <input type="text" class="form-control" placeholder="Agregar especificación..." id="nueva-especificacion-input">
                        <button type="button" class="btn btn-sm btn-primary" onclick="agregarEspecificacion()" style="white-space:nowrap;">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <div id="especificaciones-list"></div>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Imágenes</label>
                <input type="file" class="form-control" id="productoImagenes" name="imagenes" accept="image/*" multiple>
                <small style="color:var(--text-light);">Selecciona una o más imágenes para el producto</small>
            </div>
            <div class="form-group">
                <label class="form-label">Mensaje WhatsApp</label>
                <textarea class="form-control" name="mensajeWhatsapp" rows="2">${producto.mensajeWhatsapp || 'Hola, me interesa este producto. Podrian darme mas informacion?'}</textarea>
            </div>
            <div id="especificaciones-data" style="display:none;"></div>
        </form>
    `;
}

// Especificaciones management
function initEspecificacionesInputs(especificaciones) {
    const list = document.getElementById('especificaciones-list');
    if (!list) return;
    list.innerHTML = '';
    const specs = especificaciones || [];
    specs.forEach((spec, i) => addEspecificacionRow(spec, i));
}

function addEspecificacionRow(value, index) {
    const list = document.getElementById('especificaciones-list');
    if (!list) return;
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;margin-bottom:6px;align-items:center;';
    const num = index !== undefined ? index : list.children.length;
    row.innerHTML = `
        <input type="text" class="form-control" value="${value || ''}" placeholder="Especificación..." data-espec-index="${num}" style="flex:1;">
        <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()" style="padding:6px 10px;">
            <i class="fas fa-times"></i>
        </button>
    `;
    list.appendChild(row);
}

window.agregarEspecificacion = function() {
    const input = document.getElementById('nueva-especificacion-input');
    if (input && input.value.trim()) {
        addEspecificacionRow(input.value.trim());
        input.value = '';
    }
};

function collectEspecificaciones() {
    const inputs = document.querySelectorAll('#especificaciones-list input');
    return Array.from(inputs).map(i => i.value).filter(v => v.trim());
}

// Handle Enter key for adding especificaciones
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && e.target.id === 'nueva-especificacion-input') {
        e.preventDefault();
        agregarEspecificacion();
    }
});
