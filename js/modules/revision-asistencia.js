import { errorMessage, listOf, text } from './labor-utils.js';

let evidenceRows = [];
let evidencePage = 0;
const PAGE_SIZE = 20;

export function init() {
  const today = new Date();
  const date = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  document.getElementById('revisionFechaInicio').value = date;
  document.getElementById('revisionFechaFin').value = date;
  document.getElementById('revisionFechaInicio').addEventListener('change', () => { evidencePage = 0; renderEvidence(); });
  document.getElementById('revisionFechaFin').addEventListener('change', () => { evidencePage = 0; renderEvidence(); });
  load();
}

async function load() {
  await Promise.all([loadEvidence(), loadJustifications()]);
}

async function loadEvidence() {
  const body = document.getElementById('evidenciasBody');
  try {
    evidenceRows = listOf(await API.evidencias());
    renderEvidence();
  } catch (e) { body.innerHTML = '<tr><td colspan="7" class="text-danger">' + text(errorMessage(e)) + '</td></tr>'; }
}

function filteredEvidence() {
  const from = document.getElementById('revisionFechaInicio').value;
  const to = document.getElementById('revisionFechaFin').value;
  return evidenceRows.filter(row => {
    const date = String(row.marcadoEn || '').slice(0, 10);
    return (!from || date >= from) && (!to || date <= to);
  });
}

function renderEvidence() {
  const body = document.getElementById('evidenciasBody');
  const rows = filteredEvidence();
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  evidencePage = Math.min(evidencePage, totalPages - 1);
  const pageRows = rows.slice(evidencePage * PAGE_SIZE, (evidencePage + 1) * PAGE_SIZE);
  body.innerHTML = pageRows.length ? pageRows.map(row => {
    const pending = row.estado === 'PENDIENTE';
    const actions = '<button type="button" class="btn btn-sm btn-outline-secondary ver-evidencia" data-id="' + text(row.evidenciaId) + '" title="Ver selfie"><i class="fas fa-image"></i></button>' +
      (pending ? ' <button type="button" class="btn-kebab-toggle kebab-trigger" data-id="' + text(row.evidenciaId) + '" title="Acciones"><i class="fas fa-ellipsis-v"></i></button>' : '');
    const location = row.estadoUbicacion === 'APROBADA' ? 'Dentro del punto' : 'Incidencia: fuera del punto' + (row.distanciaMetros != null ? ' (' + Math.round(row.distanciaMetros) + ' m)' : '');
    return '<tr><td>' + text(row.evidenciaId) + '</td><td>' + text(row.usuarioNombre || row.usuarioId) + '</td><td>' + text(row.tipo === 'ENTRADA' ? 'Entrada' : 'Salida') + '</td><td>' + Utils.formatDateTime(row.marcadoEn) + '</td><td>' + text(location) + '</td><td>' + statusBadge(row.estado) + '</td><td class="acciones-cell">' + actions + '</td></tr>';
  }).join('') : '<tr><td colspan="7">Sin evidencias para el rango seleccionado.</td></tr>';
  body.querySelectorAll('.ver-evidencia').forEach(button => button.addEventListener('click', () => viewEvidence(button.dataset.id)));
  body.querySelectorAll('.kebab-trigger').forEach(button => button.addEventListener('click', event => {
    event.stopPropagation(); button.classList.add('show');
    Utils.abrirMenuKebab(button, [{ icon: 'fa-check', text: 'Aprobar evidencia', onClick: () => decideEvidence(button.dataset.id, true) }, { icon: 'fa-times', text: 'Rechazar evidencia', danger: true, onClick: () => decideEvidence(button.dataset.id, false) }]);
  }));
  renderPagination(rows.length, totalPages);
}

function renderPagination(total, totalPages) {
  const container = document.getElementById('paginationEvidencias');
  if (totalPages <= 1) { container.innerHTML = total ? '<small class="text-muted">' + total + ' registros</small>' : ''; return; }
  container.innerHTML = '<div class="d-flex justify-content-between align-items-center"><small class="text-muted">Página ' + (evidencePage + 1) + ' de ' + totalPages + ' (' + total + ' registros)</small><div class="btn-group"><button class="btn btn-sm btn-outline-secondary" id="prevEvidence" ' + (evidencePage === 0 ? 'disabled' : '') + '>Anterior</button><button class="btn btn-sm btn-outline-secondary" id="nextEvidence" ' + (evidencePage >= totalPages - 1 ? 'disabled' : '') + '>Siguiente</button></div></div>';
  document.getElementById('prevEvidence').addEventListener('click', () => { evidencePage--; renderEvidence(); });
  document.getElementById('nextEvidence').addEventListener('click', () => { evidencePage++; renderEvidence(); });
}

async function viewEvidence(id) {
  try {
    const response = await fetch(API.baseUrl + '/asistencias/evidencias/' + encodeURIComponent(id) + '/archivo', { headers: { Authorization: 'Bearer ' + API.getToken() } });
    if (!response.ok) throw new Error('No se pudo cargar la selfie.');
    const url = URL.createObjectURL(await response.blob());
    Utils.showDialog('Selfie de asistencia #' + id, '<img src="' + url + '" alt="Selfie de asistencia" style="display:block;max-width:100%;max-height:65vh;margin:auto;border-radius:10px">');
  } catch (e) { Utils.showToast(errorMessage(e), 'error'); }
}

async function loadJustifications() {
  const panel = document.getElementById('justificacionesPanel');
  const body = document.getElementById('justificacionesBody');
  try {
    const rows = listOf(await API.justificacionesPendientes());
    panel.classList.toggle('d-none', !rows.length);
    if (!rows.length) return;
    body.innerHTML = rows.map(row => '<tr><td>' + text(row.justificacionId) + '</td><td>' + text(row.usuarioId) + '</td><td>' + text(row.comentario) + '</td><td>' + statusBadge(row.estado) + '</td><td class="acciones-cell"><button type="button" class="btn-kebab-toggle kebab-trigger" data-id="' + text(row.justificacionId) + '" title="Acciones"><i class="fas fa-ellipsis-v"></i></button></td></tr>').join('');
    body.querySelectorAll('.kebab-trigger').forEach(button => button.addEventListener('click', event => { event.stopPropagation(); button.classList.add('show'); Utils.abrirMenuKebab(button, [{ icon: 'fa-check', text: 'Aprobar justificación', onClick: () => decideJustification(button.dataset.id, true) }, { icon: 'fa-times', text: 'Rechazar justificación', danger: true, onClick: () => decideJustification(button.dataset.id, false) }]); }));
  } catch (e) { panel.classList.remove('d-none'); body.innerHTML = '<tr><td colspan="5" class="text-danger">' + text(errorMessage(e)) + '</td></tr>'; }
}

function statusBadge(status) { return '<span class="badge ' + (status === 'APROBADA' ? 'bg-success' : status === 'RECHAZADA' ? 'bg-danger' : 'bg-warning text-dark') + '">' + text(status) + '</span>'; }
async function decideEvidence(id, approve) { try { if (approve) await API.aprobarEvidencia(id); else await API.rechazarEvidencia(id, { motivo: 'Rechazada por revisión administrativa' }); Utils.showToast('Decisión guardada', 'success'); loadEvidence(); } catch (e) { Utils.showToast(errorMessage(e), 'error'); } }
async function decideJustification(id, approve) { try { await API.post('/justificaciones/' + encodeURIComponent(id) + '/' + (approve ? 'aprobar' : 'rechazar'), {}); Utils.showToast('Decisión guardada', 'success'); loadJustifications(); } catch (e) { Utils.showToast(errorMessage(e), 'error'); } }
