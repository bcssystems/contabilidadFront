// ========================================
// BC Systems - Modulo Almacen (Movimientos)
// ========================================

let allVariantesDisponibles = [];
let currentTab = 'todos';

window.initAlmacen = function() {
    loadAllVariantes();
    renderAlmacenPage();
};

async function loadAllVariantes() {
    try {
        const data = await api.getVariantesDisponibles(0, 500);
        allVariantesDisponibles = data.content || [];
    } catch (e) {
        console.warn('No se pudieron cargar variantes:', e);
    }
}

function renderAlmacenPage() {
    const html = `
        <div style="margin-bottom:20px;">
            <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:20px;">
                <div class="stat-card" style="flex:1;min-width:180px;">
                    <div class="stat-icon primary"><i class="fas fa-exchange-alt"></i></div>
                    <div class="stat-info">
                        <h3 id="totalMovimientos">-</h3>
                        <p>Movimientos</p>
                    </div>
                </div>
                <div class="stat-card" style="flex:1;min-width:180px;">
                    <div class="stat-icon warning"><i class="fas fa-clock"></i></div>
                    <div class="stat-info">
                        <h3 id="totalPendientes">-</h3>
                        <p>Pendientes</p>
                    </div>
                </div>
                <div class="stat-card" style="flex:1;min-width:180px;">
                    <div class="stat-icon success"><i class="fas fa-arrow-down"></i></div>
                    <div class="stat-info">
                        <h3 id="totalEntradas">-</h3>
                        <p>Entradas</p>
                    </div>
                </div>
                <div class="stat-card" style="flex:1;min-width:180px;">
                    <div class="stat-icon danger"><i class="fas fa-arrow-up"></i></div>
                    <div class="stat-info">
                        <h3 id="totalSalidas">-</h3>
                        <p>Salidas</p>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Movimientos de Almacen</h3>
                    <div style="display:flex;gap:8px;">
                        <button class="btn btn-success" onclick="openEntradaModal()" style="background:var(--success);border-color:var(--success);">
                            <i class="fas fa-plus-circle"></i> Registrar Entrada
                        </button>
                        <button class="btn btn-primary" onclick="openSalidaModal()">
                            <i class="fas fa-minus-circle"></i> Solicitar Salida
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div style="display:flex;gap:0;margin-bottom:16px;border-bottom:2px solid var(--border-color);">
                        <button class="tab-btn ${currentTab === 'todos' ? 'active' : ''}" onclick="switchTab('todos')" style="padding:10px 20px;border:none;background:none;cursor:pointer;font-weight:500;color:${currentTab === 'todos' ? 'var(--primary)' : 'var(--text-light)'};border-bottom:2px solid ${currentTab === 'todos' ? 'var(--primary)' : 'transparent'};margin-bottom:-2px;">
                            <i class="fas fa-list"></i> Todos
                        </button>
                        <button class="tab-btn ${currentTab === 'pendientes' ? 'active' : ''}" onclick="switchTab('pendientes')" style="padding:10px 20px;border:none;background:none;cursor:pointer;font-weight:500;color:${currentTab === 'pendientes' ? 'var(--primary)' : 'var(--text-light)'};border-bottom:2px solid ${currentTab === 'pendientes' ? 'var(--primary)' : 'transparent'};margin-bottom:-2px;">
                            <i class="fas fa-clock"></i> Pendientes <span id="pendientesCount" class="badge" style="background:var(--warning);color:white;border-radius:10px;padding:2px 8px;font-size:11px;margin-left:6px;">0</span>
                        </button>
                    </div>
                    <div id="movimientosContent">
                        ${renderLoadingState()}
                    </div>
                </div>
            </div>
        </div>
    `;
    document.getElementById('pageContent').innerHTML = html;
    loadMovimientos();
    loadPendientesCount();
}

function renderLoadingState() {
    return '<div style="text-align:center;padding:40px;color:var(--text-light);"><i class="fas fa-spinner fa-spin" style="font-size:24px;margin-bottom:12px;"></i><p>Cargando movimientos...</p></div>';
}

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        const isActive = btn.textContent.trim().includes(tab === 'todos' ? 'Todos' : 'Pendientes');
        btn.style.color = isActive ? 'var(--primary)' : 'var(--text-light)';
        btn.style.borderBottomColor = isActive ? 'var(--primary)' : 'transparent';
    });
    if (tab === 'todos') {
        loadMovimientos();
    } else {
        loadPendientes();
    }
}

async function loadMovimientos(page = 0) {
    try {
        const data = await api.getMovimientosAlmacen(page, 20);
        updateStats(data);
        renderMovimientosTable(data);
    } catch (error) {
        document.getElementById('movimientosContent').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exchange-alt"></i>
                <h3>Error al cargar movimientos</h3>
                <p>${error.message}</p>
            </div>`;
    }
}

async function loadPendientes(page = 0) {
    try {
        const data = await api.getMovimientosPendientes(page, 20);
        renderPendientesTable(data);
    } catch (error) {
        document.getElementById('movimientosContent').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clock"></i>
                <h3>Error al cargar pendientes</h3>
                <p>${error.message}</p>
            </div>`;
    }
}

async function loadPendientesCount() {
    try {
        const data = await api.getMovimientosPendientes(0, 1);
        const count = data.totalElements || 0;
        const badge = document.getElementById('pendientesCount');
        if (badge) badge.textContent = count;
    } catch (e) { /* ignore */ }
}

function updateStats(data) {
    const total = data.totalElements || 0;
    const content = data.content || [];
    const entradas = content.filter(m => m.tipo === 'ENTRADA').length;
    const salidas = content.filter(m => m.tipo === 'SALIDA').length;
    const pendientes = content.filter(m => m.estado === 'PENDIENTE').length;

    document.getElementById('totalMovimientos').textContent = total;
    document.getElementById('totalEntradas').textContent = entradas;
    document.getElementById('totalSalidas').textContent = salidas;
    document.getElementById('totalPendientes').textContent = pendientes;
}

function renderMovimientosTable(data) {
    const items = data.content || [];
    if (items.length === 0) {
        document.getElementById('movimientosContent').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <h3>No hay movimientos</h3>
                <p>Comienza registrando una entrada o salida de almacen</p>
            </div>`;
        return;
    }

    const rows = items.map(m => buildMovimientoRow(m)).join('');
    const html = `
        <div class="table-container">
            <table class="table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Tipo</th>
                        <th>Producto</th>
                        <th>Variante</th>
                        <th>Serie</th>
                        <th>Cant.</th>
                        <th>P. Compra</th>
                        <th>Sucursal</th>
                        <th>Estado</th>
                        <th>Fecha</th>
                        <th>Solicitante</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
        ${renderPagination(data, 'almacen')}
    `;
    document.getElementById('movimientosContent').innerHTML = html;
}

function renderPendientesTable(data) {
    const items = data.content || [];
    if (items.length === 0) {
        document.getElementById('movimientosContent').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle" style="color:var(--success);"></i>
                <h3>No hay salidas pendientes</h3>
                <p>Todas las solicitudes han sido procesadas</p>
            </div>`;
        return;
    }

    const rows = items.map(m => `
        <tr>
            <td>${m.id}</td>
            <td><span class="status-badge warning">SALIDA</span></td>
            <td>${m.productoPadreNombre || '-'}</td>
            <td>${m.varianteNombre || '-'}</td>
            <td>${m.varianteNumeroSerie || '-'}</td>
            <td>${m.cantidad}</td>
            <td>${formatCurrency(m.precioCompra)}</td>
            <td>${m.sucursalNombre || '-'}</td>
            <td><span class="status-badge warning">PENDIENTE</span></td>
            <td>${m.fechaSolicitud ? new Date(m.fechaSolicitud).toLocaleDateString() : '-'}</td>
            <td>${m.solicitanteNombre || '-'}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn" style="background:var(--success);color:white;" onclick="aprobarSalida(${m.id})" title="Aprobar">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="action-btn" style="background:var(--danger);color:white;" onclick="rechazarSalida(${m.id})" title="Rechazar">
                        <i class="fas fa-times"></i>
                    </button>
                    <button class="action-btn view" onclick="viewMovimiento(${m.id})" title="Ver">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    const html = `
        <div class="table-container">
            <table class="table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Tipo</th>
                        <th>Producto</th>
                        <th>Variante</th>
                        <th>Serie</th>
                        <th>Cant.</th>
                        <th>P. Compra</th>
                        <th>Sucursal</th>
                        <th>Estado</th>
                        <th>Fecha</th>
                        <th>Solicitante</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
        ${renderPagination(data, 'almacen')}
    `;
    document.getElementById('movimientosContent').innerHTML = html;
}

function buildMovimientoRow(m) {
    const tipoClass = m.tipo === 'ENTRADA' ? 'success' : 'danger';
    const tipoIcon = m.tipo === 'ENTRADA' ? 'fa-arrow-down' : 'fa-arrow-up';
    const estadoClass = m.estado === 'APROBADO' ? 'active'
        : m.estado === 'RECHAZADO' ? 'inactive'
        : m.estado === 'CANCELADO' ? 'inactive'
        : 'warning';

    return `
        <tr>
            <td>${m.id}</td>
            <td><span class="status-badge ${tipoClass}"><i class="fas ${tipoIcon}" style="font-size:11px;margin-right:4px;"></i>${m.tipo}</span></td>
            <td>${m.productoPadreNombre || '-'}</td>
            <td>${m.varianteNombre || '-'}</td>
            <td>${m.varianteNumeroSerie || '-'}</td>
            <td>${m.cantidad}</td>
            <td>${formatCurrency(m.precioCompra)}</td>
            <td>${m.sucursalNombre || '-'}</td>
            <td><span class="status-badge ${estadoClass}">${m.estado}</span></td>
            <td>${m.fechaMovimiento ? new Date(m.fechaMovimiento).toLocaleDateString() : (m.fechaSolicitud ? new Date(m.fechaSolicitud).toLocaleDateString() : '-')}</td>
            <td>${m.solicitanteNombre || '-'}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn view" onclick="viewMovimiento(${m.id})" title="Ver">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

window.viewMovimiento = async function(id) {
    try {
        const m = await api.getMovimientoAlmacen(id);
        const tipoClass = m.tipo === 'ENTRADA' ? 'success' : 'danger';
        openModal('Movimiento #' + m.id, `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div><strong>Tipo:</strong> <span class="status-badge ${tipoClass}">${m.tipo}</span></div>
                <div><strong>Estado:</strong> <span class="status-badge ${m.estado === 'APROBADO' ? 'active' : m.estado === 'PENDIENTE' ? 'warning' : 'inactive'}">${m.estado}</span></div>
                <div><strong>Producto:</strong> ${m.productoPadreNombre || '-'}</div>
                <div><strong>Variante:</strong> ${m.varianteNombre || '-'}</div>
                <div><strong>No. Serie:</strong> ${m.varianteNumeroSerie || '-'}</div>
                <div><strong>SKU:</strong> ${m.productoPadreSku || '-'}</div>
                <div><strong>Cantidad:</strong> ${m.cantidad}</div>
                <div><strong>Precio Compra:</strong> ${formatCurrency(m.precioCompra)}</div>
                <div><strong>IMEI:</strong> ${m.imei || '-'}</div>
                <div><strong>Vale/Folio:</strong> ${m.valeFolio || '-'}</div>
                <div><strong>Folio Venta:</strong> ${m.folioVenta || '-'}</div>
                <div><strong>Medio Compra:</strong> ${m.medioCompra || '-'}</div>
                <div><strong>Proveedor:</strong> ${m.proveedorNombre || '-'}</div>
                <div><strong>Sucursal:</strong> ${m.sucursalNombre || '-'}</div>
                <div><strong>Solicitante:</strong> ${m.solicitanteNombre || '-'}</div>
                <div><strong>Aprobador:</strong> ${m.aprobadorNombre || '-'}</div>
                <div><strong>Fecha Solicitud:</strong> ${m.fechaSolicitud ? new Date(m.fechaSolicitud).toLocaleString() : '-'}</div>
                <div><strong>Fecha Aprobacion:</strong> ${m.fechaAprobacion ? new Date(m.fechaAprobacion).toLocaleString() : '-'}</div>
                <div><strong>Fecha Movimiento:</strong> ${m.fechaMovimiento ? new Date(m.fechaMovimiento).toLocaleString() : '-'}</div>
            </div>
            <div style="margin-top:12px;">
                <strong>Observacion:</strong>
                <p style="color:var(--text-secondary);">${m.observacion || 'Sin observacion'}</p>
            </div>
            <div style="margin-top:8px;">
                <strong>Descripcion:</strong>
                <p style="color:var(--text-secondary);">${m.descripcion || '-'}</p>
            </div>
        `, '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>');
    } catch (error) {
        showToast(error.message, 'error');
    }
};

// =================== ENTRADA FORM ===================

window.openEntradaModal = function() {
    openModal('Registrar Entrada a Almacen', buildEntradaForm(), `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveEntrada()">Registrar Entrada</button>
    `);
    setTimeout(() => {
        initEntradaFormAutocomplete();
        loadSucursalesSelect('entradaSucursal');
    }, 100);
};

function buildEntradaForm() {
    return `
        <form id="entradaForm">
            <div class="form-group">
                <label class="form-label">Producto / Variante *</label>
                <div style="position:relative;">
                    <input type="text" class="form-control" id="entradaVarianteSearch" placeholder="Buscar por nombre, serie o SKU..." autocomplete="off">
                    <input type="hidden" name="varianteId" id="entradaVarianteId">
                    <div id="entradaVarianteSuggestions" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--bg-card);border:1px solid var(--border-color);border-radius:8px;max-height:200px;overflow-y:auto;z-index:1000;"></div>
                </div>
                <div id="entradaVarianteInfo" style="margin-top:8px;font-size:13px;color:var(--text-secondary);"></div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Cantidad</label>
                    <input type="number" class="form-control" name="cantidad" value="1" min="1">
                </div>
                <div class="form-group">
                    <label class="form-label">Precio Compra</label>
                    <input type="number" step="0.01" class="form-control" name="precioCompra" placeholder="Dejar vacio = precio de la variante">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Medio de Compra</label>
                    <select class="form-control" name="medioCompra">
                        <option value="">Seleccionar...</option>
                        <option value="EFECTIVO">Efectivo</option>
                        <option value="TRANSFERENCIA">Transferencia</option>
                        <option value="TARJETA">Tarjeta</option>
                        <option value="CONSIGNA">Consigna</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Vale/Folio</label>
                    <input type="text" class="form-control" name="valeFolio" placeholder="Folio de entrada">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Sucursal</label>
                <select class="form-control" name="sucursalId" id="entradaSucursal">
                    <option value="">Seleccionar sucursal...</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Observacion</label>
                <textarea class="form-control" name="observacion" rows="2" placeholder="Notas sobre la entrada..."></textarea>
            </div>
        </form>
    `;
}

function initEntradaFormAutocomplete() {
    const searchInput = document.getElementById('entradaVarianteSearch');
    const suggestionsDiv = document.getElementById('entradaVarianteSuggestions');
    const hiddenId = document.getElementById('entradaVarianteId');
    const infoDiv = document.getElementById('entradaVarianteInfo');

    if (!searchInput) return;

    searchInput.addEventListener('input', function() {
        const q = this.value.toLowerCase().trim();
        if (q.length < 1) {
            suggestionsDiv.style.display = 'none';
            hiddenId.value = '';
            infoDiv.innerHTML = '';
            return;
        }

        const results = allVariantesDisponibles.filter(v =>
            v.nombre.toLowerCase().includes(q) ||
            (v.numeroSerie && v.numeroSerie.toLowerCase().includes(q)) ||
            (v.productoPadreNombre && v.productoPadreNombre.toLowerCase().includes(q)) ||
            (v.productoPadreSku && v.productoPadreSku.toLowerCase().includes(q))
        ).slice(0, 10);

        if (results.length === 0) {
            suggestionsDiv.style.display = 'none';
            return;
        }

        suggestionsDiv.style.display = 'block';
        suggestionsDiv.innerHTML = results.map(v => `
            <div class="suggestion-item" style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center;"
                 onclick="selectEntradaVariante(${v.id}, '${v.nombre.replace(/'/g, "\\'")}', '${v.productoPadreNombre || ''}', '${v.numeroSerie || ''}', '${v.precioCompra || 0}')">
                <div>
                    <strong>${v.nombre}</strong>
                    <div style="font-size:12px;color:var(--text-light);">${v.productoPadreNombre || ''} ${v.numeroSerie ? '- ' + v.numeroSerie : ''}</div>
                </div>
                <div style="font-size:12px;color:var(--text-light);">${formatCurrency(v.precioCompra)}</div>
            </div>
        `).join('');
    });

    searchInput.addEventListener('blur', function() {
        setTimeout(() => { suggestionsDiv.style.display = 'none'; }, 200);
    });
}

window.selectEntradaVariante = function(id, nombre, padreNombre, serie, precio) {
    document.getElementById('entradaVarianteSearch').value = nombre + ' (' + (padreNombre || '') + ')';
    document.getElementById('entradaVarianteId').value = id;
    document.getElementById('entradaVarianteSuggestions').style.display = 'none';
    document.getElementById('entradaVarianteInfo').innerHTML = `
        <span style="color:var(--text-secondary);">Precio actual: ${formatCurrency(parseFloat(precio))}</span>
    `;
    const precioInput = document.querySelector('input[name="precioCompra"]');
    if (precioInput && !precioInput.value) {
        precioInput.placeholder = 'Usar: ' + formatCurrency(parseFloat(precio));
    }
};

window.saveEntrada = async function() {
    const form = document.getElementById('entradaForm');
    const formData = new FormData(form);
    const varianteId = formData.get('varianteId');

    if (!varianteId) {
        showToast('Debes seleccionar un producto/variante', 'error');
        return;
    }

    const data = {
        tipo: 'ENTRADA',
        varianteId: parseInt(varianteId),
        cantidad: parseInt(formData.get('cantidad')) || 1,
        precioCompra: formData.get('precioCompra') ? parseFloat(formData.get('precioCompra')) : null,
        medioCompra: formData.get('medioCompra') || null,
        valeFolio: formData.get('valeFolio') || null,
        observacion: formData.get('observacion') || null,
        sucursalId: formData.get('sucursalId') ? parseInt(formData.get('sucursalId')) : null
    };

    try {
        showLoading();
        await api.registrarEntradaAlmacen(data);
        showToast('Entrada registrada exitosamente', 'success');
        closeModal();
        loadAllVariantes();
        loadMovimientos();
        loadPendientesCount();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

// =================== SALIDA FORM ===================

window.openSalidaModal = function() {
    openModal('Solicitar Salida de Almacen', buildSalidaForm(), `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveSalida()">Solicitar Salida</button>
    `);
    setTimeout(() => {
        initSalidaFormAutocomplete();
        loadSucursalesSelect('salidaSucursal');
    }, 100);
};

function buildSalidaForm() {
    return `
        <form id="salidaForm">
            <div class="form-group">
                <label class="form-label">Producto / Variante *</label>
                <div style="position:relative;">
                    <input type="text" class="form-control" id="salidaVarianteSearch" placeholder="Buscar por nombre, serie o SKU..." autocomplete="off">
                    <input type="hidden" name="varianteId" id="salidaVarianteId">
                    <div id="salidaVarianteSuggestions" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--bg-card);border:1px solid var(--border-color);border-radius:8px;max-height:200px;overflow-y:auto;z-index:1000;"></div>
                </div>
                <div id="salidaVarianteInfo" style="margin-top:8px;font-size:13px;color:var(--text-secondary);"></div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Cantidad</label>
                    <input type="number" class="form-control" name="cantidad" value="1" min="1">
                </div>
                <div class="form-group">
                    <label class="form-label">Precio Compra</label>
                    <input type="number" step="0.01" class="form-control" name="precioCompra" placeholder="Dejar vacio = precio de la variante">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Medio de Compra</label>
                    <select class="form-control" name="medioCompra">
                        <option value="">Seleccionar...</option>
                        <option value="EFECTIVO">Efectivo</option>
                        <option value="TRANSFERENCIA">Transferencia</option>
                        <option value="TARJETA">Tarjeta</option>
                        <option value="CONSIGNA">Consigna</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Folio Venta</label>
                    <input type="text" class="form-control" name="folioVenta" placeholder="Folio de venta asociado">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Vale/Folio</label>
                    <input type="text" class="form-control" name="valeFolio" placeholder="Vale de salida">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Sucursal</label>
                <select class="form-control" name="sucursalId" id="salidaSucursal">
                    <option value="">Seleccionar sucursal...</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Observacion</label>
                <textarea class="form-control" name="observacion" rows="2" placeholder="Motivo de la salida..."></textarea>
            </div>
        </form>
    `;
}

function initSalidaFormAutocomplete() {
    const searchInput = document.getElementById('salidaVarianteSearch');
    const suggestionsDiv = document.getElementById('salidaVarianteSuggestions');
    const hiddenId = document.getElementById('salidaVarianteId');
    const infoDiv = document.getElementById('salidaVarianteInfo');

    if (!searchInput) return;

    searchInput.addEventListener('input', function() {
        const q = this.value.toLowerCase().trim();
        if (q.length < 1) {
            suggestionsDiv.style.display = 'none';
            hiddenId.value = '';
            infoDiv.innerHTML = '';
            return;
        }

        const results = allVariantesDisponibles.filter(v =>
            v.nombre.toLowerCase().includes(q) ||
            (v.numeroSerie && v.numeroSerie.toLowerCase().includes(q)) ||
            (v.productoPadreNombre && v.productoPadreNombre.toLowerCase().includes(q)) ||
            (v.productoPadreSku && v.productoPadreSku.toLowerCase().includes(q))
        ).slice(0, 10);

        if (results.length === 0) {
            suggestionsDiv.style.display = 'none';
            return;
        }

        suggestionsDiv.style.display = 'block';
        suggestionsDiv.innerHTML = results.map(v => `
            <div class="suggestion-item" style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center;"
                 onclick="selectSalidaVariante(${v.id}, '${v.nombre.replace(/'/g, "\\'")}', '${v.productoPadreNombre || ''}', '${v.numeroSerie || ''}', '${v.precioCompra || 0}')">
                <div>
                    <strong>${v.nombre}</strong>
                    <div style="font-size:12px;color:var(--text-light);">${v.productoPadreNombre || ''} ${v.numeroSerie ? '- ' + v.numeroSerie : ''}</div>
                </div>
                <div style="font-size:12px;color:var(--text-light);">${formatCurrency(v.precioCompra)}</div>
            </div>
        `).join('');
    });

    searchInput.addEventListener('blur', function() {
        setTimeout(() => { suggestionsDiv.style.display = 'none'; }, 200);
    });
}

window.selectSalidaVariante = function(id, nombre, padreNombre, serie, precio) {
    document.getElementById('salidaVarianteSearch').value = nombre + ' (' + (padreNombre || '') + ')';
    document.getElementById('salidaVarianteId').value = id;
    document.getElementById('salidaVarianteSuggestions').style.display = 'none';
    document.getElementById('salidaVarianteInfo').innerHTML = `
        <span style="color:var(--text-secondary);">Precio actual: ${formatCurrency(parseFloat(precio))}</span>
    `;
};

window.saveSalida = async function() {
    const form = document.getElementById('salidaForm');
    const formData = new FormData(form);
    const varianteId = formData.get('varianteId');

    if (!varianteId) {
        showToast('Debes seleccionar un producto/variante', 'error');
        return;
    }

    const data = {
        tipo: 'SALIDA',
        varianteId: parseInt(varianteId),
        cantidad: parseInt(formData.get('cantidad')) || 1,
        precioCompra: formData.get('precioCompra') ? parseFloat(formData.get('precioCompra')) : null,
        medioCompra: formData.get('medioCompra') || null,
        valeFolio: formData.get('valeFolio') || null,
        folioVenta: formData.get('folioVenta') || null,
        observacion: formData.get('observacion') || null,
        sucursalId: formData.get('sucursalId') ? parseInt(formData.get('sucursalId')) : null
    };

    try {
        showLoading();
        await api.solicitarSalidaAlmacen(data);
        showToast('Salida solicitada exitosamente', 'success');
        closeModal();
        loadAllVariantes();
        loadMovimientos();
        loadPendientesCount();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

// =================== APROBAR / RECHAZAR ===================

window.aprobarSalida = async function(id) {
    if (!confirm('Aprobar esta salida de almacen?')) return;
    try {
        showLoading();
        await api.aprobarSalidaAlmacen(id);
        showToast('Salida aprobada exitosamente', 'success');
        loadPendientes(0);
        loadPendientesCount();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.rechazarSalida = async function(id) {
    if (!confirm('Rechazar esta salida de almacen?')) return;
    try {
        showLoading();
        await api.rechazarSalidaAlmacen(id);
        showToast('Salida rechazada', 'info');
        loadPendientes(0);
        loadPendientesCount();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
};

// =================== PAGINATION HELPER ===================

function renderPagination(data, module) {
    if (data.totalPages <= 1) return '';
    let buttons = '';
    const maxVisible = 5;
    let startPage = Math.max(0, data.number - Math.floor(maxVisible / 2));
    let endPage = Math.min(data.totalPages, startPage + maxVisible);
    if (endPage - startPage < maxVisible) {
        startPage = Math.max(0, endPage - maxVisible);
    }
    buttons += `<button class="pagination-btn" onclick="changeAlmacenPage(${data.number - 1})" ${data.number === 0 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>`;
    for (let i = startPage; i < endPage; i++) {
        buttons += `<button class="pagination-btn ${i === data.number ? 'active' : ''}" onclick="changeAlmacenPage(${i})">${i + 1}</button>`;
    }
    buttons += `<button class="pagination-btn" onclick="changeAlmacenPage(${data.number + 1})" ${data.number >= data.totalPages - 1 ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>`;
    return `
        <div class="pagination">
            <div class="pagination-info">
                Mostrando ${data.number * data.size + 1} - ${Math.min((data.number + 1) * data.size, data.totalElements)} de ${data.totalElements} registros
            </div>
            <div class="pagination-controls">${buttons}</div>
        </div>
    `;
}

window.changeAlmacenPage = function(page) {
    if (page < 0) return;
    if (currentTab === 'todos') {
        loadMovimientos(page);
    } else {
        loadPendientes(page);
    }
};

async function loadSucursalesSelect(selectId, selectedId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    try {
        const sucursales = await api.getSucursales();
        const activas = sucursales.filter(s => s.activa);
        select.innerHTML = '<option value="">Seleccionar sucursal...</option>' +
            activas.map(s =>
                `<option value="${s.idSucursal}" ${selectedId && s.idSucursal === selectedId ? 'selected' : ''}>${s.nombre}</option>`
            ).join('');
    } catch (e) {
        console.warn('No se pudieron cargar sucursales:', e);
    }
}
