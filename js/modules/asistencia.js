import { errorMessage, resultStatus, text } from './labor-utils.js';

let cameraStream = null;
let selfieBlob = null;
let selectedRoute = '/checador/entrada';
let submitting = false;
let canExitToday = false;
let canEnterToday = true;

export function init() {
  document.getElementById('btnActivarCamara')?.addEventListener('click', activateCamera);
  document.getElementById('btnTomarSelfie')?.addEventListener('click', takeSelfie);
  document.getElementById('btnEntrada')?.addEventListener('click', () => chooseAndCapture('/checador/entrada'));
  document.getElementById('btnSalida')?.addEventListener('click', () => chooseAndCapture('/checador/salida'));
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
    video.classList.remove('d-none');
    document.getElementById('selfiePreview')?.classList.add('d-none');
    document.querySelector('.camera-box')?.classList.add('active');
    document.getElementById('btnTomarSelfie').disabled = !canEnterToday && !canExitToday;
    document.getElementById('selfieStatus').textContent = 'Cámara activa. Elige Entrada o Salida para registrar.';
  } catch (error) {
    show('No se pudo activar la cámara: ' + error.message, 'danger');
  }
}

function chooseAndCapture(route) {
  selectedRoute = route;
  if (!cameraStream) {
    show('Activa la cámara antes de registrar la ' + (route.endsWith('entrada') ? 'entrada.' : 'salida.'), 'warning');
    return;
  }
  takeSelfie();
}

function takeSelfie() {
  const video = document.getElementById('cameraPreview');
  const canvas = document.getElementById('cameraCanvas');
  if (!cameraStream || !video.videoWidth) {
    show('Activa la cámara antes de tomar la selfie.', 'warning');
    return;
  }
  if (submitting) return;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  canvas.toBlob(async blob => {
    if (!blob) { show('No se pudo generar la selfie.', 'danger'); return; }
    selfieBlob = blob;
    const preview = document.getElementById('selfiePreview');
    preview.src = URL.createObjectURL(blob);
    preview.classList.remove('d-none');
    video.classList.add('d-none');
    document.getElementById('selfieStatus').textContent = 'Selfie capturada. Obteniendo ubicación para registrar...';
    await register(selectedRoute);
  }, 'image/jpeg', 0.92);
}

function getPosition() {
  if (!navigator.geolocation) throw new Error('Este navegador no permite obtener ubicación.');
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error('No se pudo obtener la ubicación.')), { enableHighAccuracy: true, timeout: 15000 }));
}

async function register(route) {
  if (!selfieBlob || submitting) return;
  submitting = true;
  setActionButtons(true);
  try {
    const geo = await getPosition();
    const form = new FormData();
    form.append('selfie', new File([selfieBlob], 'selfie-' + Date.now() + '.jpg', { type: 'image/jpeg' }));
    form.append('latitud', geo.coords.latitude);
    form.append('longitud', geo.coords.longitude);
    form.append('precisionMetros', geo.coords.accuracy);
    const response = route.endsWith('entrada') ? await API.entrada(form) : await API.salida(form);
    document.getElementById('selfieStatus').textContent = (route.endsWith('entrada') ? 'Entrada' : 'Salida') + ' registrada con selfie.';
    show('Registro enviado. Estado: ' + resultStatus(response), 'success');
    loadBoard();
  } catch (error) {
    document.getElementById('selfieStatus').textContent = 'Selfie lista. El registro no se completó.';
    show(errorMessage(error), 'danger');
  } finally {
    submitting = false;
    setActionButtons(false);
    loadBoard();
  }
}

function setActionButtons(disabled) {
  ['btnEntrada', 'btnSalida', 'btnTomarSelfie'].forEach(id => { const button = document.getElementById(id); if (button) button.disabled = disabled || (id === 'btnEntrada' && !canEnterToday) || (id === 'btnSalida' && !canExitToday) || (id === 'btnTomarSelfie' && (!cameraStream || (!canEnterToday && !canExitToday))); });
}

async function loadBoard() {
  const target = document.getElementById('tableroAsistencia');
  if (!target) return;
  try {
    const data = await API.miTablero();
    const records = Array.isArray(data) ? data : (data.asistencias || []);
    const now = new Date();
    const todayKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    const today = records.find(item => item.fecha === todayKey);
    const hasEntry = Boolean(today?.entrada);
    const hasExit = Boolean(today?.salida);
    canEnterToday = !hasEntry;
    canExitToday = hasEntry && !hasExit;
    const exitButton = document.getElementById('btnSalida');
    const entryButton = document.getElementById('btnEntrada');
    const selfieButton = document.getElementById('btnTomarSelfie');
    if (entryButton) entryButton.disabled = !canEnterToday;
    if (exitButton) exitButton.disabled = !canExitToday;
    if (selfieButton) selfieButton.disabled = !cameraStream || (!canEnterToday && !canExitToday);
    target.innerHTML = '<div class="row g-2 mb-3"><div class="col-md-6"><div class="border rounded p-2"><small class="text-muted">Horas semanales</small><strong class="d-block">' + text(data.horasLaboralesSemanales ?? '-') + '</strong></div></div><div class="col-md-6"><div class="border rounded p-2"><small class="text-muted">Registros</small><strong class="d-block">' + records.length + '</strong></div></div></div>' + (records.length ? '<div class="labor-table-wrap"><table class="table table-custom"><thead><tr><th>Fecha</th><th>Entrada</th><th>Salida</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>' + records.map(item => '<tr><td>' + Utils.formatDate(item.fecha) + '</td><td>' + Utils.formatDateTime(item.entrada) + '</td><td>' + Utils.formatDateTime(item.salida) + '</td><td>' + text(displayStatus(item)) + '</td><td class="acciones-cell"><button type="button" class="btn-kebab-toggle kebab-trigger" data-id="' + text(item.id) + '" title="Acciones"><i class="fas fa-ellipsis-v"></i></button></td></tr>').join('') + '</tbody></table></div>' : '<p class="text-muted mb-0">Aún no hay registros de asistencia.</p>');
    target.querySelectorAll('.kebab-trigger').forEach(button => button.addEventListener('click', event => { event.stopPropagation(); button.classList.add('show'); const item = records.find(row => String(row.id) === button.dataset.id); Utils.abrirMenuKebab(button, [{ icon: 'fa-eye', text: 'Ver registro', onClick: () => Utils.showDialog('Registro de asistencia', '<div class="row g-3"><div class="col-6"><small class="text-muted">Fecha</small><strong class="d-block">' + Utils.formatDate(item?.fecha) + '</strong></div><div class="col-6"><small class="text-muted">Estado</small><strong class="d-block">' + text(item?.estado || '-') + '</strong></div><div class="col-6"><small class="text-muted">Entrada</small><strong class="d-block">' + Utils.formatDateTime(item?.entrada) + '</strong></div><div class="col-6"><small class="text-muted">Salida</small><strong class="d-block">' + Utils.formatDateTime(item?.salida) + '</strong></div></div>') }]); }));
    renderCalendar(data.horario?.horario || data.horario);
  } catch (error) {
    canEnterToday = true;
    canExitToday = false;
    const exitButton = document.getElementById('btnSalida');
    const selfieButton = document.getElementById('btnTomarSelfie');
    if (exitButton) exitButton.disabled = true;
    if (selfieButton) selfieButton.disabled = !cameraStream;
    target.innerHTML = '<span class="text-danger">No se pudo cargar tu tablero: ' + text(errorMessage(error)) + '</span>';
    renderCalendar(null);
  }
}

function renderCalendar(schedule) {
  const target = document.getElementById('calendarioEmpleado');
  if (!target) return;
  const days = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
  const configured = new Map((schedule?.dias || []).map(day => [day.dia, day]));
  target.innerHTML = '<div class="labor-calendar-grid">' + days.map(day => { const item = configured.get(day); const breaks = (item?.breaks || []).map(b => text((b.inicio || '') + ' - ' + (b.fin || ''))).join('<br>'); return '<div class="labor-calendar-day ' + (item ? 'is-active' : '') + '"><h6>' + day + '</h6>' + (item ? '<div class="labor-calendar-time">' + text(item.entrada) + ' - ' + text(item.salida) + '</div><div class="labor-calendar-break">' + (breaks ? 'Break:<br>' + breaks : 'Sin break') + '</div>' : '<span class="text-muted small">Descanso</span>') + '</div>'; }).join('') + '</div>';
}

function displayStatus(item) {
  if (item.estado === 'RECHAZADA') return 'Evidencia rechazada';
  if (item.estadoUbicacion === 'PENDIENTE') return 'Incidencia de ubicación';
  if (item.estadoUbicacion === 'RECHAZADA') return 'Ubicación rechazada';
  if (item.estado === 'PENDIENTE') return 'Pendiente de revisión';
  return item.estado || '-';
}

function show(message, type) { const el = document.getElementById('asistenciaMensaje'); el.className = 'alert alert-' + type; el.textContent = message; }
