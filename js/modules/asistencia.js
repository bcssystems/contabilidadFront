import { errorMessage, resultStatus, text } from './labor-utils.js';

let selfieRequired = true;

export function init() {
  document.getElementById('btnEntrada')?.addEventListener('click', () => register('/checador/entrada'));
  document.getElementById('btnSalida')?.addEventListener('click', () => register('/checador/salida'));
  document.getElementById('btnActualizarTablero')?.addEventListener('click', loadBoard);
  loadBoard();
  loadAttendanceConfig();
}

async function loadAttendanceConfig() { const input = document.getElementById('selfie'); if (!input) return; try { const config = await API.configuracionAsistencia(); selfieRequired = config.requiereSelfie !== false; input.required = selfieRequired; input.closest('.mb-3')?.classList.toggle('d-none', !selfieRequired); } catch (_) { selfieRequired = true; input.required = true; } }

async function position() {
  if (!navigator.geolocation) throw new Error('Este navegador no permite obtener ubicación.');
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error('No se pudo obtener la ubicación.')), { enableHighAccuracy: true, timeout: 15000 }));
}

async function register(route) {
  const file = document.getElementById('selfie')?.files?.[0];
  if (selfieRequired && !file) { show('Selecciona una selfie antes de registrar.', 'warning'); return; }
  try {
    const geo = await position();
    const form = new FormData();
    if (file) form.append('selfie', file);
    form.append('latitud', geo.coords.latitude);
    form.append('longitud', geo.coords.longitude);
    form.append('precisionMetros', geo.coords.accuracy);
    const response = route.endsWith('entrada') ? await API.entrada(form) : await API.salida(form);
    show('Registro enviado. Estado: ' + resultStatus(response), 'success');
    loadBoard();
  } catch (error) { show(errorMessage(error), 'danger'); }
}

async function loadBoard() {
  const target = document.getElementById('tableroAsistencia'); if (!target) return;
  try { const data = await API.miTablero(); const schedule = data.horario?.horario; target.innerHTML = '<p><strong>Estado:</strong> ' + resultStatus(data) + '</p><p><strong>Horario:</strong> ' + text(schedule?.nombre || 'No asignado') + '</p><p><strong>Horas semanales:</strong> ' + text(data.horasLaboralesSemanales) + ' | <strong>Sueldo por hora:</strong> ' + text(data.sueldoPorHora) + '</p><pre class="small mb-0">' + text(JSON.stringify(data.asistencias || [], null, 2)) + '</pre>'; }
  catch (error) { target.innerHTML = '<span class="text-danger">' + text(errorMessage(error)) + '</span>'; }
}

function show(message, type) { const el = document.getElementById('asistenciaMensaje'); el.className = 'alert alert-' + type; el.textContent = message; }
