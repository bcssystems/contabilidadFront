import { errorMessage, listOf, text } from './labor-utils.js';

const days = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];

export function init() {
  buildDays();
  document.getElementById('formHorario')?.addEventListener('submit', save);
  load();
}

function buildDays() {
  const target = document.getElementById('diasHorario');
  if (!target) return;
  target.innerHTML = days.map(day => '<div class="border rounded p-2 mb-2 horario-dia" data-day="' + day + '">' +
    '<div class="row g-2 align-items-end"><div class="col-md-2"><label class="fw-semibold">' + day + '</label></div>' +
    '<div class="col-md-2"><label class="form-label">Entrada</label><input class="form-control dia-entrada" type="time"></div>' +
    '<div class="col-md-2"><label class="form-label">Salida</label><input class="form-control dia-salida" type="time"></div>' +
    '<div class="col-md-3"><label class="form-label">Breaks</label><div class="breaks"></div>' +
    '<button type="button" class="btn btn-sm btn-outline-secondary agregar-break">Agregar break</button></div></div></div>').join('');

  target.querySelectorAll('.horario-dia').forEach(row => {
    row.querySelector('.agregar-break').addEventListener('click', () => addBreak(row));
  });
}

function addBreak(row) {
  const breaks = row.querySelector('.breaks');
  const breakRow = document.createElement('div');
  breakRow.className = 'input-group input-group-sm mb-1';
  breakRow.innerHTML = '<input class="form-control break-inicio" type="time" required><span class="input-group-text">a</span>' +
    '<input class="form-control break-fin" type="time" required><button type="button" class="btn btn-outline-danger quitar-break">x</button>';
  breakRow.querySelector('.quitar-break').addEventListener('click', () => breakRow.remove());
  breaks.appendChild(breakRow);
}

async function load() {
  const body = document.getElementById('horariosBody');
  if (!body) return;
  try {
    const rows = listOf(await API.horarios());
    body.innerHTML = rows.length ? rows.map(row => {
      const minutes = (row.dias || []).reduce((sum, day) => sum +
        (new Date('1970-01-01T' + day.salida) - new Date('1970-01-01T' + day.entrada)) / 60000 -
        (day.breaks || []).reduce((total, item) => total +
          (new Date('1970-01-01T' + item.fin) - new Date('1970-01-01T' + item.inicio)) / 60000, 0), 0);
      return '<tr><td>' + text(row.nombre) + '</td><td>' + text((row.dias || []).map(day => day.dia).join(', ')) +
        '</td><td>' + text((minutes / 60).toFixed(2)) + '</td><td>' + text(row.activo ? 'ACTIVO' : 'INACTIVO') +
        '</td><td class="acciones-cell"><button type="button" class="btn-kebab-toggle kebab-trigger" data-id="' +
        text(row.id) + '" title="Acciones"><i class="fas fa-ellipsis-v"></i></button></td></tr>';
    }).join('') : '<tr><td colspan="5">Sin horarios.</td></tr>';
    body.querySelectorAll('.kebab-trigger').forEach(button => button.addEventListener('click', event => {
      event.stopPropagation();
      button.classList.add('show');
      Utils.abrirMenuKebab(button, [{ icon: 'fa-ban', text: 'Desactivar horario', danger: true, onClick: () => remove(button.dataset.id) }]);
    }));
  } catch (error) {
    body.innerHTML = '<tr><td colspan="5" class="text-danger">' + text(errorMessage(error)) + '</td></tr>';
  }
}

function readDays() {
  const selected = [...document.querySelectorAll('.horario-dia')].filter(row =>
    row.querySelector('.dia-entrada').value || row.querySelector('.dia-salida').value || row.querySelector('.break-inicio'));
  if (!selected.length) throw new Error('Selecciona al menos un día.');
  return selected.map(row => {
    const entrada = row.querySelector('.dia-entrada').value;
    const salida = row.querySelector('.dia-salida').value;
    if (!entrada || !salida || entrada >= salida) throw new Error('Completa una entrada y salida válidas para ' + row.dataset.day + '.');
    const breaks = [...row.querySelectorAll('.break-inicio')].map((input, index) => {
      const fin = row.querySelectorAll('.break-fin')[index].value;
      if (!input.value || !fin || input.value >= fin) throw new Error('El break de ' + row.dataset.day + ' no es válido.');
      return { inicio: input.value, fin };
    });
    return { dia: row.dataset.day, entrada, salida, breaks };
  });
}

async function save(event) {
  event.preventDefault();
  let dias;
  try { dias = readDays(); } catch (error) { Utils.showToast(error.message, 'warning'); return; }
  const data = { nombre: document.getElementById('horarioNombre').value.trim(), dias };
  if (!data.nombre) { Utils.showToast('Escribe un nombre para el horario.', 'warning'); return; }
  try {
    const saved = await API.post('/horarios', data);
    const user = document.getElementById('horarioUsuario').value;
    if (user) await API.guardarHorarioEmpleado(user, { horarioId: saved.id });
    Utils.showToast('Horario guardado', 'success');
    event.target.reset();
    buildDays();
    load();
  } catch (error) { Utils.showToast(errorMessage(error), 'error'); }
}

async function remove(id) {
  if (!id || !(await Utils.confirm('Se eliminará el horario seleccionado.'))) return;
  try { await API.del('/horarios/' + encodeURIComponent(id)); load(); }
  catch (error) { Utils.showToast(errorMessage(error), 'error'); }
}
