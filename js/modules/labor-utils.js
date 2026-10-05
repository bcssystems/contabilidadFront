export function listOf(value) {
  if (Array.isArray(value)) return value;
  return value?.content || value?.items || value?.data || [];
}

export function errorMessage(error) {
  return error?.message || 'No fue posible completar la operación.';
}

export function text(value) {
  return Utils.esc(value === null || value === undefined ? '-' : String(value));
}

export function resultStatus(value) {
  const status = value?.estado || value?.status || value?.incidencia || value?.mensaje;
  return status ? text(status) : 'Registrado';
}

export function bindForm(formId, handler) {
  document.getElementById(formId)?.addEventListener('submit', (event) => {
    event.preventDefault();
    handler(event.currentTarget);
  });
}
