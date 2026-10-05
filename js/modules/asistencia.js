import { errorMessage, resultStatus, text } from './labor-utils.js';

let cameraStream = null;
let selfieBlob = null;

export function init() {
  document.getElementById('btnActivarCamara')?.addEventListener('click', activateCamera);
  document.getElementById('btnTomarSelfie')?.addEventListener('click', takeSelfie);
  document.getElementById('btnEntrada')?.addEventListener('click', () => register('/checador/entrada'));
  document.getElementById('btnSalida')?.addEventListener('click', () => register('/checador/salida'));
  document.getElementById('btnActualizarTablero')?.addEventListener('click', loadBoard);
  loadBoard();
}

async function activateCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    show('Este navegador no permite usar la cámara en vivo.', 'danger');
    return;
  }
  try {
    cameraStream?.getTracks().forEach(track => track.stop());
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    const video = document.getElementById('cameraPreview');
    video.srcObject = cameraStream;
    document.querySelector('.camera-box')?.classList.add('active');
    document.getElementById('btnTomarSelfie').disabled = false;
    document.getElementById('selfieStatus').textContent = 'Cámara activa. Mira al frente y toma tu selfie.';
  } catch (error) {
    show('No se pudo activar la cámara: ' + error.message, 'danger');
  }
}

function takeSelfie() {
  const video = document.getElementById('cameraPreview');
  const canvas = document.getElementById('cameraCanvas');
  if (!cameraStream || !video.videoWidth) {
    show('Activa la cámara antes de tomar la selfie.', 'warning');
    return;
  }
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  canvas.toBlob(blob => {
    selfieBlob = blob;
    document.getElementById('selfieStatus').textContent = 'Selfie lista para registrar.';
    show('Selfie capturada correctamente.', 'success');
  }, 'image/jpeg', 0.92);
}

function getPosition() {
  if (!navigator.geolocation) throw new Error('Este navegador no permite obtener ubicación.');
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error('No se pudo obtener la ubicación.')), { enableHighAccuracy: true, timeout: 15000 }));
}

async function register(route) {
  if (!selfieBlob) { show('Toma tu selfie en vivo antes de registrar la asistencia.', 'warning'); return; }
  try {
    const geo = await getPosition();
    const form = new FormData();
    form.append('selfie', new File([selfieBlob], 'selfie-' + Date.now() + '.jpg', { type: 'image/jpeg' }));
    form.append('latitud', geo.coords.latitude);
    form.append('longitud', geo.coords.longitude);
    form.append('precisionMetros', geo.coords.accuracy);
    const response = route.endsWith('entrada') ? await API.entrada(form) : await API.salida(form);
    show('Registro enviado. Estado: ' + resultStatus(response), 'success');
    loadBoard();
  } catch (error) { show(errorMessage(error), 'danger'); }
}

async function loadBoard() {
  const target = document.getElementById('tableroAsistencia');
  if (!target) return;
  try {
    const data = await API.miTablero();
    const records = Array.isArray(data) ? data : (data.asistencias || []);
    target.innerHTML = '<div class="row g-2 mb-3"><div class="col-md-4"><div class="border rounded p-2"><small class="text-muted">Horas semanales</small><strong class="d-block">' + text(data.horasLaboralesSemanales ?? '-') + '</strong></div></div><div class="col-md-4"><div class="border rounded p-2"><small class="text-muted">Sueldo por hora</small><strong class="d-block">' + text(data.sueldoPorHora ?? '-') + '</strong></div></div><div class="col-md-4"><div class="border rounded p-2"><small class="text-muted">Registros</small><strong class="d-block">' + records.length + '</strong></div></div></div>' + (records.length ? '<div class="labor-table-wrap"><table class="table table-custom"><thead><tr><th>Fecha</th><th>Entrada</th><th>Salida</th><th>Estado</th></tr></thead><tbody>' + records.map(item => '<tr><td>' + text(item.fecha) + '</td><td>' + text(item.entrada || '-') + '</td><td>' + text(item.salida || '-') + '</td><td>' + text(item.estado || '-') + '</td></tr>').join('') + '</tbody></table></div>' : '<p class="text-muted mb-0">Aún no hay registros de asistencia.</p>');
    renderCalendar(data.horario?.horario || data.horario);
  } catch (error) {
    target.innerHTML = '<span class="text-danger">No se pudo cargar tu tablero: ' + text(errorMessage(error)) + '</span>';
    renderCalendar(null);
  }
}

function renderCalendar(schedule) {
  const target = document.getElementById('calendarioEmpleado');
  if (!target) return;
  const days = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
  const configured = new Map((schedule?.dias || []).map(day => [day.dia, day]));
  target.innerHTML = '<div class="labor-calendar-grid">' + days.map(day => {
    const item = configured.get(day);
    const breaks = (item?.breaks || []).map(b => text((b.inicio || '') + ' - ' + (b.fin || ''))).join('<br>');
    return '<div class="labor-calendar-day ' + (item ? 'is-active' : '') + '"><h6>' + day + '</h6>' + (item ? '<div class="labor-calendar-time">' + text(item.entrada) + ' - ' + text(item.salida) + '</div><div class="labor-calendar-break">' + (breaks ? 'Break:<br>' + breaks : 'Sin break') + '</div>' : '<span class="text-muted small">Descanso</span>') + '</div>';
  }).join('') + '</div>';
}

function show(message, type) { const el = document.getElementById('asistenciaMensaje'); el.className = 'alert alert-' + type; el.textContent = message; }
