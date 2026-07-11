let state = {
  caja: null,
  cajas: [],
  sucursales: [],
  productos: [],
  cart: [],
  esperaVentas: [],
  cancelarVentas: [],
  cancelarSelectedId: null,
  lastCortePreview: null,
  productSearchTimeout: null,
};

export function init() {
  bindEvents();
  mostrarSelectorCaja();
}

function bindEvents() {
  document.getElementById('btnEntrarCaja')?.addEventListener('click', entrarCaja);
  document.getElementById('btnCobrarPOS')?.addEventListener('click', cobrarVenta);
  document.getElementById('btnConfirmarCobroPOS')?.addEventListener('click', confirmarCobro);
  document.getElementById('btnEsperaPOS')?.addEventListener('click', ponerEnEspera);
  document.getElementById('btnIngresarEfectivo')?.addEventListener('click', () => new bootstrap.Modal(document.getElementById('posIngresoModal')).show());
  document.getElementById('btnRetirarEfectivo')?.addEventListener('click', () => new bootstrap.Modal(document.getElementById('posRetiroModal')).show());
  document.getElementById('btnGuardarIngreso')?.addEventListener('click', ingresarEfectivo);
  document.getElementById('btnGuardarRetiro')?.addEventListener('click', retirarEfectivo);
  document.getElementById('btnCortePOS')?.addEventListener('click', previewCorte);
  document.getElementById('btnRealizarCortePOS')?.addEventListener('click', realizarCorte);
  document.getElementById('btnGastoPOS')?.addEventListener('click', () => new bootstrap.Modal(document.getElementById('posGastoModal')).show());
  document.getElementById('btnSolicitarGastoPOS')?.addEventListener('click', solicitarGasto);
  document.getElementById('btnCancelarVentaPOS')?.addEventListener('click', abrirCancelarVentaModal);
  document.getElementById('btnConfirmarCancelarPOS')?.addEventListener('click', confirmarCancelarVenta);
  document.getElementById('btnVentaRapidaPOS')?.addEventListener('click', () => new bootstrap.Modal(document.getElementById('posVentaRapidaModal')).show());
  document.getElementById('btnRealizarVentaRapidaPOS')?.addEventListener('click', realizarVentaRapida);
  document.getElementById('btnAbandonarCaja')?.addEventListener('click', abandonarCaja);

  document.getElementById('btnVerInventario')?.addEventListener('click', () => {
    const input = document.getElementById('posProductSearch');
    if (input) { input.value = ''; input.focus(); }
    buscarProductos(true);
  });

  const searchInput = document.getElementById('posProductSearch');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(state.productSearchTimeout);
      state.productSearchTimeout = setTimeout(buscarProductos, 300);
    });
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') buscarProductos();
    });
    document.addEventListener('click', (e) => {
      const results = document.getElementById('posProductResults');
      if (results && !e.target.closest('.pos-panel-product-search')) {
        results.classList.add('d-none');
      }
    });
  }

  document.getElementById('precioSelector')?.addEventListener('change', () => {
    actualizarPreciosCart();
    recalcularTotales();
  });
}

async function mostrarSelectorCaja() {
  detenerPollingCaja();
  document.getElementById('pos-caja-selector').classList.remove('d-none');
  document.getElementById('pos-interface').classList.add('d-none');
  try {
    state.sucursales = await API.get('/sucursales');
    const selSuc = document.getElementById('posSucursalSelect');
    selSuc.innerHTML = '<option value="">-- Selecciona una sucursal --</option>' +
      state.sucursales.map(s => `<option value="${s.idSucursal}">${Utils.esc(s.nombre)}</option>`).join('');
    selSuc.addEventListener('change', async () => {
      const idSucursal = parseInt(selSuc.value);
      const cajaSel = document.getElementById('posCajaSelect');
      const entrarBtn = document.getElementById('btnEntrarCaja');
      if (idSucursal) {
        try {
          state.cajas = await API.get('/cajas/sucursal/' + idSucursal);
          cajaSel.innerHTML = '<option value="">-- Selecciona una caja --</option>' +
            state.cajas.map(c => `<option value="${c.idCaja}">${Utils.esc(c.nombre)}</option>`).join('');
          cajaSel.disabled = false;
        } catch (_) {
          cajaSel.innerHTML = '<option value="">Error al cargar cajas</option>';
          cajaSel.disabled = true;
        }
      } else {
        cajaSel.innerHTML = '<option value="">-- Primero selecciona sucursal --</option>';
        cajaSel.disabled = true;
        entrarBtn.disabled = true;
      }
    });

    const lastCajaId = localStorage.getItem('lastCajaId');
    const lastSucursalId = localStorage.getItem('lastSucursalId');
    if (lastSucursalId) {
      selSuc.value = lastSucursalId;
      selSuc.dispatchEvent(new Event('change'));
      setTimeout(() => {
        const cajaSel = document.getElementById('posCajaSelect');
        if (lastCajaId && cajaSel) {
          const opt = cajaSel.querySelector(`option[value="${lastCajaId}"]`);
          if (opt) { cajaSel.value = lastCajaId; document.getElementById('btnEntrarCaja').disabled = false; }
        }
      }, 300);
    }

    document.getElementById('posCajaSelect').addEventListener('change', () => {
      const id = parseInt(document.getElementById('posCajaSelect').value);
      document.getElementById('btnEntrarCaja').disabled = !id;
    });
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function entrarCaja() {
  const id = parseInt(document.getElementById('posCajaSelect').value);
  if (!id) { Utils.showToast('Selecciona una caja', 'warning'); return; }
  try {
    state.caja = await API.get('/cajas/' + id);
    if (state.caja.estado === 'CERRADA') {
      const saldo = await Utils.promptInput('Saldo Inicial', '¿Con cuánto efectivo comienzas?', '0');
      if (saldo === null) return;
      await API.post('/cajas/' + id + '/apertura', { saldoInicial: parseFloat(saldo) || 0 });
      state.caja = await API.get('/cajas/' + id);
      Utils.showToast('Caja abierta exitosamente', 'success');
    }
    localStorage.setItem('lastCajaId', id);
    localStorage.setItem('lastSucursalId', state.caja.idSucursal || '');
    iniciarPOS();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function iniciarPOS() {
  document.getElementById('pos-caja-selector').classList.add('d-none');
  document.getElementById('pos-interface').classList.remove('d-none');
  actualizarSaldoCaja();
  state.productos = [];
  state.cart = [];
  renderCart();
  await buscarProductos(true);
  iniciarPollingCaja();
}

function actualizarSaldoCaja() {
  const el = document.getElementById('posSaldoActual');
  if (el && state.caja) el.textContent = '$' + (state.caja.saldoActual || 0).toFixed(2);
}

async function refreshCaja() {
  if (!state.caja) return;
  try {
    state.caja = await API.get('/cajas/' + state.caja.idCaja);
    actualizarSaldoCaja();
  } catch (_) {}
}

function iniciarPollingCaja() {
  detenerPollingCaja();
  state._pollInterval = setInterval(refreshCaja, 30000);
}

function detenerPollingCaja() {
  if (state._pollInterval) {
    clearInterval(state._pollInterval);
    state._pollInterval = null;
  }
}

function actualizarPreciosCart() {
  const precioIdx = parseInt(document.getElementById('precioSelector')?.value) || 1;
  const precioKey = 'precio' + precioIdx;
  state.cart.forEach(d => {
    const p = state.productos.find(x => x.idProducto === d.idProducto);
    if (p && p[precioKey]) d.precioUnitario = p[precioKey];
  });
  renderCart();
}

async function buscarProductos(showAll) {
  const q = document.getElementById('posProductSearch')?.value?.trim() || '';
  const results = document.getElementById('posProductResults');
  const list = document.getElementById('posProductList');
  if (!results || !list) return;

  if (q.length < 1 && !showAll) { results.classList.add('d-none'); return; }

  try {
    const params = new URLSearchParams();
    if (q) params.set('search', q);
    params.set('page', '0');
    params.set('size', showAll ? '50' : '20');
    params.set('sort', 'nombre,ASC');
    if (state.caja?.idSucursal) params.set('idSucursal', state.caja.idSucursal);

    const data = await API.get('/productos?' + params.toString());
    state.productos = data.content || [];

    if (state.productos.length === 0) {
      list.innerHTML = '<div class="pos-product-result-item text-muted">Sin resultados</div>';
    } else {
      const precioIdx = parseInt(document.getElementById('precioSelector')?.value) || 1;
      const precioKey = 'precio' + precioIdx;
      list.innerHTML = state.productos.map(p => {
        const stock = p.stockActual || 0;
        return `<div class="pos-product-result-item" data-id="${p.idProducto}">
          <div>
            <div class="fw-semibold small">${Utils.esc(p.nombre)}</div>
            <small class="text-muted">SKU: ${Utils.esc(p.sku || '-')} | Stock: ${stock}</small>
          </div>
          <div class="text-end">
            <div class="fw-bold" style="color:var(--primary)">$${(p[precioKey] || 0).toFixed(2)}</div>
            <button class="btn btn-sm btn-success pos-add-cart" data-id="${p.idProducto}" style="font-size:0.7rem">
              <i class="fas fa-cart-plus"></i>
            </button>
          </div>
        </div>`;
      }).join('');

      list.querySelectorAll('.pos-add-cart').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); agregarAlCart(parseInt(btn.dataset.id)); });
      });
      list.querySelectorAll('.pos-product-result-item').forEach(item => {
        item.addEventListener('click', (e) => {
          if (e.target.closest('.pos-add-cart')) return;
          agregarAlCart(parseInt(item.dataset.id));
        });
      });
    }
    results.classList.remove('d-none');
  } catch (_) {
    list.innerHTML = '<div class="pos-product-result-item text-muted">Error al buscar</div>';
    results.classList.remove('d-none');
  }
}

async function agregarAlCart(prodId) {
  const p = state.productos.find(x => x.idProducto === prodId);
  if (!p) return;

  const precioIdx = parseInt(document.getElementById('precioSelector')?.value) || 1;
  const precioKey = 'precio' + precioIdx;
  const precio = p[precioKey] || 0;
  const stock = p.stockActual || 0;

  if (stock <= 0) { Utils.showToast('Producto sin stock', 'warning'); return; }

  const existente = state.cart.find(d => d.idProducto === prodId);
  if (existente) {
    if (existente.cantidad >= stock) { Utils.showToast('Stock insuficiente', 'warning'); return; }
    existente.cantidad++;
  } else {
    state.cart.push({
      idProducto: prodId,
      nombre: p.nombre,
      sku: p.sku,
      cantidad: 1,
      precioUnitario: precio,
    });
  }

  renderCart();
  document.getElementById('posProductResults')?.classList.add('d-none');
  document.getElementById('posProductSearch').value = '';
}

function renderCart() {
  const tbody = document.getElementById('posCartBody');
  if (!tbody) return;

  if (state.cart.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state py-3"><i class="fas fa-cart-plus"></i><p>Agrega productos a la venta</p></div></td></tr>';
  } else {
    tbody.innerHTML = state.cart.map((d, i) =>
      '<tr>' +
      '<td><div class="fw-semibold small">' + Utils.esc(d.nombre) + '</div><small class="text-muted" style="font-size:0.65rem">' + (d.sku || '') + '</small></td>' +
      '<td><div class="d-flex align-items-center gap-1">' +
        '<button class="pos-cart-qty-btn pos-cart-qty-minus" data-index="' + i + '"><i class="fas fa-minus"></i></button>' +
        '<span class="fw-semibold px-1">' + d.cantidad + '</span>' +
        '<button class="pos-cart-qty-btn pos-cart-qty-plus" data-index="' + i + '"><i class="fas fa-plus"></i></button>' +
      '</div></td>' +
      '<td>$' + d.precioUnitario.toFixed(2) + '</td>' +
      '<td class="fw-semibold">$' + (d.cantidad * d.precioUnitario).toFixed(2) + '</td>' +
      '<td><button class="pos-cart-remove" data-index="' + i + '"><i class="fas fa-times"></i></button></td>' +
      '</tr>'
    ).join('');

    tbody.querySelectorAll('.pos-cart-qty-minus').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.index);
        const item = state.cart[i];
        if (item.cantidad > 1) item.cantidad--;
        else state.cart.splice(i, 1);
        renderCart();
      });
    });

    tbody.querySelectorAll('.pos-cart-qty-plus').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.index);
        state.cart[i].cantidad++;
        renderCart();
      });
    });

    tbody.querySelectorAll('.pos-cart-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        state.cart.splice(parseInt(btn.dataset.index), 1);
        renderCart();
      });
    });
  }

  recalcularTotales();
}

function recalcularTotales() {
  let subtotal = 0;
  state.cart.forEach(d => {
    d.subtotal = d.cantidad * d.precioUnitario;
    subtotal += d.subtotal;
  });

  const total = Math.max(0, subtotal);
  document.getElementById('posSubtotal').textContent = '$' + subtotal.toFixed(2);
  document.getElementById('posDescuento').textContent = '-$0.00';
  document.getElementById('posTotal').textContent = '$' + total.toFixed(2);
}

async function limpiarCart() {
  state.cart = [];
  renderCart();
}

async function cobrarVenta() {
  if (!state.caja) { Utils.showToast('No hay caja activa', 'error'); return; }
  if (state.cart.length === 0) { Utils.showToast('Agrega productos a la venta', 'warning'); return; }

  for (const d of state.cart) {
    const p = state.productos.find(x => x.idProducto === d.idProducto);
    if (p && (p.stockActual || 0) < d.cantidad) {
      Utils.showToast('Stock insuficiente: ' + d.nombre, 'error');
      return;
    }
  }

  const total = parseFloat(document.getElementById('posTotal').textContent.replace('$', ''));
  const tipoVenta = document.querySelector('input[name="tipoVenta"]:checked')?.value || 'CONTADO';

  document.getElementById('posCobroTotal').textContent = '$' + total.toFixed(2);
  document.getElementById('posCobroNota').value = '';
  await cargarFormasPagoCobro();
  new bootstrap.Modal(document.getElementById('posCobroModal')).show();
}

async function cargarFormasPagoCobro() {
  const container = document.getElementById('posCobroPagos');
  container.innerHTML = '<div class="text-center py-3"><i class="fas fa-spinner fa-spin"></i> Cargando formas de pago...</div>';

  try {
    const tipos = await API.get('/tipos-pago');
    const total = parseFloat(document.getElementById('posCobroTotal').textContent.replace('$', ''));

    if (!tipos || tipos.length === 0) {
      container.innerHTML = '<div class="text-center py-3 text-muted">No hay formas de pago configuradas</div>';
      return;
    }

    container.innerHTML = tipos.map((t, i) => {
      const isEfectivo = t.nombre.toUpperCase() === 'EFECTIVO';
      const checked = i === 0 ? 'checked' : '';
      return `<div class="payment-row border rounded p-2 mb-1">
        <div class="row g-2 align-items-center">
          <div class="col-3">
            <div class="form-check">
              <input class="form-check-input payment-radio" type="radio" name="cobroPagoRadio" value="${t.idTipoPago}" data-nombre="${Utils.esc(t.nombre)}" ${checked}>
              <label class="form-check-label fw-semibold small">${Utils.esc(t.nombre)}</label>
            </div>
          </div>
          <div class="col-3">
            <div class="input-group input-group-sm">
              <span class="input-group-text">$</span>
              <input type="number" class="form-control payment-monto" data-id="${t.idTipoPago}" step="0.01" min="0" value="${i === 0 ? total.toFixed(2) : '0.00'}">
            </div>
          </div>
          <div class="col-6">
            <input type="text" class="form-control form-control-sm payment-referencia" data-id="${t.idTipoPago}" placeholder="${isEfectivo ? '' : 'Referencia (ej. últimos 4 dígitos)'}" ${isEfectivo ? 'disabled' : ''}>
          </div>
        </div>
      </div>`;
    }).join('');

    container.addEventListener('input', recalcularSumaCobro);

    container.querySelectorAll('.payment-radio').forEach(r => {
      r.addEventListener('change', () => {
        const id = parseInt(r.value);
        const totalVal = parseFloat(document.getElementById('posCobroTotal').textContent.replace('$', ''));
        container.querySelectorAll('.payment-monto').forEach(inp => {
          inp.value = parseInt(inp.dataset.id) === id ? totalVal.toFixed(2) : '0.00';
        });
        recalcularSumaCobro();
      });
    });

    recalcularSumaCobro();
  } catch (err) {
    container.innerHTML = '<div class="text-center py-3 text-danger">Error al cargar formas de pago</div>';
  }
}

function recalcularSumaCobro() {
  let suma = 0;
  document.querySelectorAll('.payment-monto').forEach(inp => { suma += parseFloat(inp.value) || 0; });
  const total = parseFloat(document.getElementById('posCobroTotal').textContent.replace('$', ''));
  const el = document.getElementById('posCobroSuma');
  const cambioEl = document.getElementById('posCobroCambio');
  const cambioVal = document.getElementById('posCobroCambioValor');
  el.textContent = '$' + suma.toFixed(2);

  if (suma + 0.01 < total) {
    el.style.color = 'var(--danger)';
    cambioEl.classList.add('d-none');
  } else {
    el.style.color = 'var(--success)';
    if (suma > total + 0.01) {
      cambioVal.textContent = '$' + (suma - total).toFixed(2);
      cambioEl.classList.remove('d-none');
    } else {
      cambioEl.classList.add('d-none');
    }
  }
}

async function confirmarCobro() {
  if (!state.caja) { Utils.showToast('No hay caja activa', 'error'); return; }

  const total = parseFloat(document.getElementById('posCobroTotal').textContent.replace('$', ''));
  const subtotal = parseFloat(document.getElementById('posSubtotal').textContent.replace('$', ''));
  const precioIdx = parseInt(document.getElementById('precioSelector')?.value) || 1;
  const tipoVenta = document.querySelector('input[name="tipoVenta"]:checked')?.value || 'CONTADO';
  const nota = document.getElementById('posCobroNota').value.trim() || null;

  const pagos = [];
  document.querySelectorAll('.payment-monto').forEach(inp => {
    const monto = parseFloat(inp.value) || 0;
    if (monto > 0) {
      const idTipoPago = parseInt(inp.dataset.id);
      const refInput = document.querySelector(`.payment-referencia[data-id="${idTipoPago}"]`);
      pagos.push({ idTipoPago, monto, referencia: refInput ? refInput.value.trim() || null : null });
    }
  });

  if (pagos.length === 0) { Utils.showToast('Selecciona al menos una forma de pago', 'warning'); return; }

  const sumaPagos = pagos.reduce((s, p) => s + p.monto, 0);
  if (sumaPagos + 0.01 < total) { Utils.showToast('La suma de los pagos debe ser al menos igual al total', 'warning'); return; }

  const request = {
    idCaja: state.caja.idCaja,
    tipoVenta: tipoVenta,
    precioSeleccionado: precioIdx,
    subtotal: subtotal,
    descuento: subtotal - total,
    total: total,
    nota: nota,
    detalles: state.cart.map(d => ({
      idProducto: d.idProducto === -999999999 ? null : d.idProducto,
      descripcion: d.sku === 'VR' ? d.nombre : null,
      cantidad: d.cantidad,
      precioUnitario: d.precioUnitario,
      subtotal: d.cantidad * d.precioUnitario,
    })),
    pagos: pagos,
  };

  try {
    const ventaCreada = await API.post('/venta', request);
    Utils.showToast('Venta registrada exitosamente', 'success');
    bootstrap.Modal.getInstance(document.getElementById('posCobroModal'))?.hide();
    await limpiarCart();
    await refreshCaja();
    imprimirTicket(ventaCreada);
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

function imprimirTicket(venta) {
  const now = new Date();
  const fechaStr = now.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  const horaStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  const detalleRows = (venta.detalles || state.cart || []).map(d => {
    const dSubtotal = d.subtotal || (d.cantidad * d.precioUnitario) || 0;
    return `<tr><td>${Utils.esc(d.productoNombre || d.nombre || d.descripcion || 'Producto')}</td><td class="center">${d.cantidad}</td><td class="right">$${(d.precioUnitario || 0).toFixed(2)}</td><td class="right">$${dSubtotal.toFixed(2)}</td></tr>`;
  }).join('');

  const pagoRows = (venta.pagos || []).map(p =>
    `<tr><td>${Utils.esc(p.tipoPagoNombre || '')}${p.referencia ? ' (' + Utils.esc(p.referencia) + ')' : ''}</td><td>$${(p.monto || 0).toFixed(2)}</td></tr>`
  ).join('');

  const printWindow = window.open('', '_blank', 'width=800,height=600');
  printWindow.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Ticket - Venta #${venta.idVenta || ''}</title>
  <style>
    @page { size: letter; margin: 0.6in; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 12px; color: #000; padding: 20px; }
    .header { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #1a3a5c; padding-bottom: 10px; }
    .header h1 { font-size: 22px; font-weight: bold; color: #1a3a5c; }
    .header .folio { font-size: 13px; color: #1a3a5c; font-weight: 600; margin-top: 4px; }
    .divider { border-top: 1px dashed #000; margin: 8px 0; }
    .info-grid { width: 100%; font-size: 11px; margin-bottom: 8px; }
    .info-grid td { padding: 2px 4px; }
    table.detalles { width: 100%; border-collapse: collapse; margin: 10px 0; }
    table.detalles thead { background: #1a3a5c; color: #fff; }
    table.detalles th { font-size: 9px; text-align: left; padding: 6px 8px; }
    table.detalles th.right, table.detalles td.right { text-align: right; }
    table.detalles th.center, table.detalles td.center { text-align: center; }
    table.detalles td { padding: 5px 8px; border-bottom: 1px solid #e0e0e0; font-size: 11px; }
    .totals { width: 100%; margin-top: 4px; border-collapse: collapse; }
    .totals td { padding: 3px 8px; font-size: 11px; }
    .totals td:last-child { text-align: right; }
    .totals .total-row td { font-size: 14px; font-weight: bold; border-top: 2px solid #000; padding-top: 6px; }
    .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #888; }
  </style>
</head>
<body>
  <div class="header">
    <h1>OMI Contabilidad</h1>
    <div class="folio">VENTA #${venta.idVenta || ''}</div>
  </div>
  <div class="divider"></div>
  <table class="info-grid">
    <tr><td><strong>Fecha</strong></td><td>${fechaStr}</td><td><strong>Caja</strong></td><td>${Utils.esc(venta.cajaNombre || state.caja?.nombre || '')}</td></tr>
    <tr><td><strong>Hora</strong></td><td>${horaStr}</td><td><strong>Sucursal</strong></td><td>${Utils.esc(venta.sucursalNombre || state.caja?.sucursalNombre || '')}</td></tr>
    <tr><td><strong>Tipo</strong></td><td>${venta.tipoVenta || 'CONTADO'}</td><td><strong>Folio</strong></td><td>#${venta.idVenta || ''}</td></tr>
  </table>
  <div class="divider"></div>
  <table class="detalles">
    <thead><tr><th style="width:45%">Descripción</th><th class="center" style="width:10%">Cant</th><th class="right" style="width:20%">Precio</th><th class="right" style="width:25%">Subtotal</th></tr></thead>
    <tbody>${detalleRows || '<tr><td colspan="4" class="center">Sin detalles</td></tr>'}</tbody>
  </table>
  <div class="divider"></div>
  <table class="totals">
    <tr><td>Subtotal</td><td>$${(venta.subtotal || 0).toFixed(2)}</td></tr>
    <tr><td>Descuento</td><td>-$${(venta.descuento || 0).toFixed(2)}</td></tr>
    <tr class="total-row"><td>TOTAL</td><td>$${(venta.total || 0).toFixed(2)}</td></tr>
  </table>
  ${pagoRows ? `<div class="divider"></div><table class="totals"><tr><td colspan="2"><strong>Pagos</strong></td></tr>${pagoRows}</table>` : ''}
  <div class="footer"><p>OMI Contabilidad — Comprobante interno de venta</p><p>${fechaStr} ${horaStr}</p></div>
</body>
</html>`);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); }, 300);
}

async function ponerEnEspera() {
  if (state.cart.length === 0 || !state.caja) return;
  state.esperaVentas.push({
    idVenta: Date.now(),
    clienteNombre: 'Mostrador',
    total: parseFloat(document.getElementById('posTotal').textContent.replace('$', '')),
    cart: JSON.parse(JSON.stringify(state.cart)),
  });
  Utils.showToast('Venta puesta en espera (local)', 'success');
  await limpiarCart();
  renderEsperas();
}

function renderEsperas() {
  const list = document.getElementById('posEsperaList');
  const count = document.getElementById('posEsperaCount');
  if (!list) return;
  count.textContent = state.esperaVentas.length;
  if (state.esperaVentas.length === 0) {
    list.innerHTML = '<small class="text-muted">Sin ventas en espera</small>';
    return;
  }
  list.innerHTML = state.esperaVentas.map(v =>
    `<div class="d-flex justify-content-between align-items-center py-1 border-bottom" style="font-size:0.8rem">
      <div>
        <div class="fw-semibold">#${v.idVenta} ${v.clienteNombre ? Utils.esc(v.clienteNombre) : 'Mostrador'}</div>
        <small class="text-muted">$${v.total.toFixed(2)}</small>
      </div>
      <div class="d-flex gap-1">
        <button class="btn btn-sm btn-success px-2 pos-reanudar-espera" data-id="${v.idVenta}" title="Reanudar" style="font-size:0.7rem"><i class="fas fa-play"></i></button>
        <button class="btn btn-sm btn-outline-danger px-2 pos-cancelar-espera" data-id="${v.idVenta}" title="Cancelar" style="font-size:0.7rem"><i class="fas fa-times"></i></button>
      </div>
    </div>`
  ).join('');

  list.querySelectorAll('.pos-reanudar-espera').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); reanudarEspera(parseInt(btn.dataset.id)); });
  });
  list.querySelectorAll('.pos-cancelar-espera').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); cancelarEsperaLocal(parseInt(btn.dataset.id)); });
  });
}

async function reanudarEspera(idVenta) {
  const idx = state.esperaVentas.findIndex(v => v.idVenta === idVenta);
  if (idx === -1) return;
  const venta = state.esperaVentas[idx];
  state.cart = venta.cart || [];
  state.esperaVentas.splice(idx, 1);
  renderCart();
  renderEsperas();
  Utils.showToast('Venta reanudada', 'info');
}

async function cancelarEsperaLocal(idVenta) {
  const ok = await Utils.confirm('Cancelar Venta en Espera', '¿Cancelar esta venta en espera?');
  if (!ok) return;
  state.esperaVentas = state.esperaVentas.filter(v => v.idVenta !== idVenta);
  renderEsperas();
  Utils.showToast('Venta en espera cancelada', 'success');
}

async function ingresarEfectivo() {
  const monto = parseFloat(document.getElementById('posIngresoMonto').value);
  const motivo = document.getElementById('posIngresoMotivo').value.trim();
  if (!monto || monto <= 0) { Utils.showToast('Monto inválido', 'warning'); return; }
  if (!motivo) { Utils.showToast('Motivo requerido', 'warning'); return; }
  try {
    await API.post('/cajas/' + state.caja.idCaja + '/ingresos', { monto, motivo });
    Utils.showToast('Ingreso registrado', 'success');
    bootstrap.Modal.getInstance(document.getElementById('posIngresoModal'))?.hide();
    document.getElementById('posIngresoMonto').value = '';
    document.getElementById('posIngresoMotivo').value = '';
    await refreshCaja();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function retirarEfectivo() {
  const monto = parseFloat(document.getElementById('posRetiroMonto').value);
  const motivo = document.getElementById('posRetiroMotivo').value.trim();
  if (!monto || monto <= 0) { Utils.showToast('Monto inválido', 'warning'); return; }
  if (!motivo) { Utils.showToast('Motivo requerido', 'warning'); return; }
  try {
    await API.post('/cajas/' + state.caja.idCaja + '/egresos', { monto, motivo });
    Utils.showToast('Retiro registrado', 'success');
    bootstrap.Modal.getInstance(document.getElementById('posRetiroModal'))?.hide();
    document.getElementById('posRetiroMonto').value = '';
    document.getElementById('posRetiroMotivo').value = '';
    await refreshCaja();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function solicitarGasto() {
  const desc = document.getElementById('posGastoDesc').value.trim();
  const monto = parseFloat(document.getElementById('posGastoMonto').value);
  if (!desc) { Utils.showToast('Descripción requerida', 'warning'); return; }
  if (!monto || monto <= 0) { Utils.showToast('Monto inválido', 'warning'); return; }
  try {
    await API.post('/gasto', { idCaja: state.caja.idCaja, descripcion: desc, monto });
    Utils.showToast('Gasto solicitado, espera autorización', 'success');
    bootstrap.Modal.getInstance(document.getElementById('posGastoModal'))?.hide();
    document.getElementById('posGastoDesc').value = '';
    document.getElementById('posGastoMonto').value = '';
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function previewCorte() {
  if (!state.caja) return;
  try {
    const corte = await API.get('/cajas/' + state.caja.idCaja + '/corte-preview');
    state.lastCortePreview = corte;
    const body = document.getElementById('posCorteBody');
    body.innerHTML = `
      <div class="row g-3">
        <div class="col-4"><div class="panel-card p-3 text-center">
          <small class="text-muted">Saldo Inicial</small>
          <h5 class="mb-0">$${(corte.saldoInicial || 0).toFixed(2)}</h5>
        </div></div>
        <div class="col-4"><div class="panel-card p-3 text-center">
          <small class="text-muted">Ventas</small>
          <h5 class="mb-0 text-success">$${(corte.totalVentas || 0).toFixed(2)}</h5>
        </div></div>
        <div class="col-4"><div class="panel-card p-3 text-center">
          <small class="text-muted">Saldo Esperado</small>
          <h5 class="mb-0" style="color:var(--primary)">$${(corte.saldoEsperado || 0).toFixed(2)}</h5>
        </div></div>
        <div class="col-6"><div class="panel-card p-3 text-center">
          <small class="text-muted">Contado</small>
          <div>$${(corte.totalVentasContado || 0).toFixed(2)}</div>
        </div></div>
        <div class="col-6"><div class="panel-card p-3 text-center">
          <small class="text-muted">Crédito</small>
          <div>$${(corte.totalVentasCredito || 0).toFixed(2)}</div>
        </div></div>
        <div class="col-6"><div class="panel-card p-3 text-center">
          <small class="text-muted">Ingresos</small>
          <div class="text-success fw-semibold">+$${(corte.totalIngresos || 0).toFixed(2)}</div>
        </div></div>
        <div class="col-6"><div class="panel-card p-3 text-center">
          <small class="text-muted">Egresos</small>
          <div class="text-danger fw-semibold">-$${(corte.totalEgresos || 0).toFixed(2)}</div>
        </div></div>
      </div>
      ${corte.detallePagos && corte.detallePagos.length > 0 ? `
      <hr>
      <h6 class="fw-semibold">Desglose por Forma de Pago</h6>
      <div class="table-responsive">
        <table class="table table-sm table-custom mb-0">
          <thead><tr><th>Forma de Pago</th><th class="text-end">Monto</th></tr></thead>
          <tbody>${corte.detallePagos.map(d => `<tr><td>${Utils.esc(d.tipoPagoNombre || '')}</td><td class="text-end fw-semibold">$${(d.monto || 0).toFixed(2)}</td></tr>`).join('')}</tbody>
        </table>
      </div>` : ''}
      <hr>
      <div class="text-center">
        <h5>Saldo Final</h5>
        <h3 class="fw-bold" style="color:var(--primary)">$${(corte.saldoFinalContado || 0).toFixed(2)}</h3>
      </div>
    `;
    new bootstrap.Modal(document.getElementById('posCorteModal')).show();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function realizarCorte() {
  if (!state.caja) return;
  if (state.esperaVentas.length > 0) {
    const ok = await Utils.confirm('Ventas en Espera', 'Hay ' + state.esperaVentas.length + ' venta(s) en espera. ¿Realizar corte de todas formas?');
    if (!ok) return;
  }
  try {
    const corteCreado = await API.post('/cajas/' + state.caja.idCaja + '/corte', {});
    Utils.showToast('Corte realizado', 'success');
    bootstrap.Modal.getInstance(document.getElementById('posCorteModal'))?.hide();
    localStorage.removeItem('lastCajaId');
    localStorage.removeItem('lastSucursalId');
    state.caja = null;
    state.esperaVentas = [];
    mostrarSelectorCaja();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function abrirCancelarVentaModal() {
  if (!state.caja) return;
  state.cancelarSelectedId = null;
  document.getElementById('btnConfirmarCancelarPOS').classList.add('d-none');
  document.getElementById('posCancelarEmpty').classList.add('d-none');

  try {
    state.cancelarVentas = await API.get('/venta/caja/' + state.caja.idCaja);
    state.cancelarVentas = state.cancelarVentas.content || state.cancelarVentas || [];
  } catch (_) {
    state.cancelarVentas = [];
  }

  const body = document.getElementById('posCancelarVentaBody');
  if (state.cancelarVentas.length === 0) {
    body.innerHTML = '';
    document.getElementById('posCancelarEmpty').classList.remove('d-none');
  } else {
    body.innerHTML = state.cancelarVentas.filter(v => v.estadoVenta !== 'CANCELADA').map(v =>
      `<tr class="pos-cancelar-row" data-id="${v.idVenta || v.id}" style="cursor:pointer">
        <td><input type="radio" name="cancelarSel" value="${v.idVenta || v.id}" class="form-check-input pos-cancelar-radio"></td>
        <td>${v.idVenta || v.id}</td>
        <td>${v.clienteNombre ? Utils.esc(v.clienteNombre) : 'Mostrador'}</td>
        <td>$${(v.total || 0).toFixed(2)}</td>
        <td>${new Date(v.fecha_venta || v.fecha).toLocaleString()}</td>
      </tr>`
    ).join('') || '<tr><td colspan="5" class="text-center text-muted">No hay ventas cancelables</td></tr>';

    body.querySelectorAll('.pos-cancelar-radio').forEach(r => {
      r.addEventListener('change', () => {
        state.cancelarSelectedId = parseInt(r.value);
        document.getElementById('btnConfirmarCancelarPOS').classList.remove('d-none');
      });
    });
    body.querySelectorAll('.pos-cancelar-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('input')) return;
        const radio = row.querySelector('.pos-cancelar-radio');
        if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change')); }
      });
    });
  }

  new bootstrap.Modal(document.getElementById('posCancelarModal')).show();
}

async function confirmarCancelarVenta() {
  if (!state.cancelarSelectedId) { Utils.showToast('Selecciona una venta', 'warning'); return; }
  const ok = await Utils.confirm('Confirmar Cancelación', '¿Estás seguro de cancelar la venta #' + state.cancelarSelectedId + '?');
  if (!ok) return;
  try {
    await API.post('/venta/' + state.cancelarSelectedId + '/cancelar', {});
    Utils.showToast('Venta #' + state.cancelarSelectedId + ' cancelada', 'success');
    bootstrap.Modal.getInstance(document.getElementById('posCancelarModal'))?.hide();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function realizarVentaRapida() {
  if (!state.caja) return;
  const desc = document.getElementById('posVrDescripcion').value.trim();
  const precioVenta = parseFloat(document.getElementById('posVrVenta').value);
  const cantidad = parseInt(document.getElementById('posVrCantidad').value) || 1;

  if (!desc) { Utils.showToast('Descripción requerida', 'warning'); return; }
  if (!precioVenta || precioVenta <= 0) { Utils.showToast('Precio inválido', 'warning'); return; }

  state.cart.push({
    idProducto: -999999999 + state.cart.length,
    nombre: desc,
    sku: 'VR',
    cantidad: cantidad,
    precioUnitario: precioVenta,
  });

  renderCart();
  bootstrap.Modal.getInstance(document.getElementById('posVentaRapidaModal'))?.hide();
  document.getElementById('posVrDescripcion').value = '';
  document.getElementById('posVrVenta').value = '';
  document.getElementById('posVrCantidad').value = '1';
  document.getElementById('posVrCompra').value = '';
  Utils.showToast('Item agregado al carrito', 'success');
}

async function abandonarCaja() {
  if (state.cart.length > 0) {
    const ok = await Utils.confirm('Carrito lleno', 'Tienes productos en el carrito. ¿Abandonar de todas formas?');
    if (!ok) return;
  }
  detenerPollingCaja();
  localStorage.removeItem('lastCajaId');
  localStorage.removeItem('lastSucursalId');
  await limpiarCart();
  state.caja = null;
  state.esperaVentas = [];
  mostrarSelectorCaja();
}
