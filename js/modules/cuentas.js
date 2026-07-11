let cuentasTreeData = [];
let editingCuentaId = null;

export function init() {
  loadCuentas();
  bindEvents();
}

function bindEvents() {
  document.getElementById('btnNuevaCuenta')?.addEventListener('click', () => openCuentaModal(null));
  document.getElementById('btnGuardarCuenta')?.addEventListener('click', saveCuenta);
  document.getElementById('searchCuenta')?.addEventListener('input', Utils.debounce(function() {
    filterCuentas(this.value);
  }, 300));
  document.getElementById('cuentaModal')?.addEventListener('hidden.bs.modal', () => { editingCuentaId = null; });
}

function buildParams(page, size) {
  return '?page=' + (page || 0) + '&size=' + (size || 300) + '&sort=id,asc';
}

async function loadCuentas() {
  try {
    const resp = await API.get('/cuenta-contable' + buildParams(0, 300));
    cuentasTreeData = resp.content || resp || [];
    renderTree(cuentasTreeData);
  } catch (e) {
    Utils.showToast('Error al cargar cuentas: ' + e.message, 'error');
  }
}

function buildHierarchy(list) {
  const map = new Map();
  const roots = [];
  list.forEach(c => map.set(c.id, { ...c, children: [] }));
  map.forEach(c => {
    if (c.cuentaPadreId && map.has(c.cuentaPadreId)) {
      map.get(c.cuentaPadreId).children.push(c);
    } else {
      roots.push(c);
    }
  });
  const sortFn = (a, b) => (a.codigo || '').localeCompare(b.codigo || '');
  const sortTree = nodes => { nodes.sort(sortFn); nodes.forEach(n => { if (n.children.length) sortTree(n.children); }); };
  sortTree(roots);
  return roots;
}

function renderNode(cuenta) {
  const hasChildren = cuenta.children && cuenta.children.length > 0;
  const activeClass = cuenta.activa !== false ? 'active' : 'inactive';
  const activeText = cuenta.activa !== false ? 'Activa' : 'Inactiva';

  return '<li class="cuenta-node" data-id="' + cuenta.id + '">' +
    '<div class="producto-row">' +
      '<span class="td-toggle" style="width:40px">' +
        (hasChildren ? '<button class="btn-toggle" data-id="' + cuenta.id + '"><i class="fas fa-chevron-right"></i></button>' : '') +
      '</span>' +
      '<span class="td-sku" style="flex:1"><strong>' + Utils.esc(cuenta.codigo || '-') + '</strong></span>' +
      '<span class="td-nombre" style="flex:2">' + Utils.esc(cuenta.nombre || '-') + '</span>' +
      '<span class="td-tipo" style="flex:1">' + Utils.esc(cuenta.tipoCuentaContable || '-') + '</span>' +
      '<span class="td-estado" style="flex:0.5"><span class="status-badge ' + activeClass + '">' + activeText + '</span></span>' +
      '<span class="td-acciones" style="width:80px">' +
        '<button class="btn btn-sm btn-outline-secondary me-1 btn-edit-cuenta" data-id="' + cuenta.id + '"><i class="fas fa-edit"></i></button>' +
        '<button class="btn btn-sm btn-outline-danger btn-delete-cuenta" data-id="' + cuenta.id + '"><i class="fas fa-trash"></i></button>' +
      '</span>' +
    '</div>' +
    (hasChildren ? '<ul class="producto-children" data-parent="' + cuenta.id + '" hidden>' + cuenta.children.map(c => renderNode(c)).join('') + '</ul>' : '') +
  '</li>';
}

function renderTree(list) {
  const root = document.getElementById('cuentaTreeRoot');
  if (!root) return;
  const tree = buildHierarchy(list);
  if (!tree.length) {
    root.innerHTML = '<li class="producto-node empty-tree"><div class="empty-state"><i class="fas fa-wallet"></i><p>No hay cuentas contables. Crea la primera.</p></div></li>';
    return;
  }
  root.innerHTML = tree.map(n => renderNode(n)).join('');
  bindTreeEvents();
}

function bindTreeEvents() {
  document.querySelectorAll('.btn-toggle').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const li = this.closest('.cuenta-node');
      const children = li?.querySelector(':scope > .producto-children');
      if (children) {
        const expanded = li.classList.toggle('expanded');
        children.hidden = !expanded;
        this.querySelector('i')?.classList.toggle('rotated', expanded);
      }
    });
  });

  document.querySelectorAll('.btn-edit-cuenta').forEach(btn => {
    btn.addEventListener('click', function() {
      openCuentaModal(parseInt(this.dataset.id));
    });
  });

  document.querySelectorAll('.btn-delete-cuenta').forEach(btn => {
    btn.addEventListener('click', function() {
      deleteCuenta(parseInt(this.dataset.id));
    });
  });
}

function filterCuentas(query) {
  const q = query.trim().toLowerCase();
  if (!q) { renderTree(cuentasTreeData); return; }
  const filtered = cuentasTreeData.filter(c =>
    (c.codigo || '').toLowerCase().includes(q) ||
    (c.nombre || '').toLowerCase().includes(q) ||
    (c.tipoCuentaContable || '').toLowerCase().includes(q)
  );
  renderTree(filtered);
}

async function openCuentaModal(id) {
  editingCuentaId = id;
  const titleEl = document.getElementById('cuentaModalTitle');
  const btnGuardar = document.getElementById('btnGuardarCuenta');
  const idInput = document.getElementById('cuentaId');

  document.getElementById('cuentaCodigo').value = '';
  document.getElementById('cuentaNombre').value = '';
  document.getElementById('cuentaTipo').value = 'ACTIVO';
  document.getElementById('cuentaActiva').checked = true;

  await loadCuentaPadreOptions(null);

  if (id) {
    titleEl.textContent = 'Editar Cuenta Contable';
    btnGuardar.textContent = 'Actualizar';
    try {
      const c = await API.get('/cuenta-contable/' + id);
      document.getElementById('cuentaCodigo').value = c.codigo || '';
      document.getElementById('cuentaNombre').value = c.nombre || '';
      document.getElementById('cuentaTipo').value = c.tipoCuentaContable || 'ACTIVO';
      document.getElementById('cuentaActiva').checked = c.activa !== false;
      idInput.value = id;
      await loadCuentaPadreOptions(c.cuentaPadreId || null);
    } catch (e) {
      Utils.showToast('Error al cargar cuenta: ' + e.message, 'error');
      return;
    }
  } else {
    titleEl.textContent = 'Nueva Cuenta Contable';
    btnGuardar.textContent = 'Guardar';
    idInput.value = '';
  }

  new bootstrap.Modal(document.getElementById('cuentaModal')).show();
}

async function loadCuentaPadreOptions(selectedId) {
  const select = document.getElementById('cuentaPadre');
  select.innerHTML = '<option value="">Ninguna (cuenta ra&iacute;z)</option>';
  try {
    const resp = await API.get('/cuenta-contable' + buildParams(0, 300));
    const list = resp.content || resp || [];
    list.forEach(c => {
      if (c.id === editingCuentaId) return;
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = (c.codigo || '') + ' - ' + (c.nombre || '');
      if (selectedId && c.id === selectedId) opt.selected = true;
      select.appendChild(opt);
    });
  } catch (_) {}
}

async function saveCuenta() {
  const id = document.getElementById('cuentaId').value;
  const data = {
    codigo: document.getElementById('cuentaCodigo').value.trim(),
    nombre: document.getElementById('cuentaNombre').value.trim(),
    tipoCuentaContable: document.getElementById('cuentaTipo').value,
    cuentaPadreId: document.getElementById('cuentaPadre').value || null,
    activa: document.getElementById('cuentaActiva').checked,
  };

  if (!data.codigo || !data.nombre) {
    Utils.showToast('C&oacute;digo y nombre son obligatorios', 'warning');
    return;
  }

  try {
    if (id) {
      await API.put('/cuenta-contable/' + id, data);
      Utils.showToast('Cuenta actualizada', 'success');
    } else {
      await API.post('/cuenta-contable', data);
      Utils.showToast('Cuenta creada', 'success');
    }
    bootstrap.Modal.getInstance(document.getElementById('cuentaModal'))?.hide();
    loadCuentas();
  } catch (e) {
    Utils.showToast('Error: ' + e.message, 'error');
  }
}

async function deleteCuenta(id) {
  const confirmed = await Utils.confirmAction('&iquest;Eliminar esta cuenta contable?', 'Confirmar', 'Eliminar');
  if (!confirmed) return;
  try {
    await API.del('/cuenta-contable/' + id);
    Utils.showToast('Cuenta eliminada', 'success');
    loadCuentas();
  } catch (e) {
    Utils.showToast('Error: ' + e.message, 'error');
  }
}
