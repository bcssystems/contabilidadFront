export function init() {
  loadStats();
}

async function loadStats() {
  try {
    const [cuentas, asientos, proveedores, empleados] = await Promise.allSettled([
      API.get('/cuenta-contable?page=0&size=1'),
      API.get('/asiento-contable?page=0&size=1'),
      API.get('/proveedor?page=0&size=1'),
       API.get('/usuarios'),
    ]);

    const setStat = (id, result) => {
      const el = document.getElementById(id);
       if (el) el.textContent = result.status === 'fulfilled' ? (Array.isArray(result.value) ? result.value.length : (result.value.totalElements || 0)) : '-';
    };

    setStat('statsCuentas', cuentas);
    setStat('statsAsientos', asientos);
    setStat('statsProveedores', proveedores);
    setStat('statsEmpleados', empleados);
  } catch (e) {
    console.error('Error loading stats:', e);
  }
}
