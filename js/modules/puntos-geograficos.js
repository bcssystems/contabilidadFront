import { errorMessage, listOf, text } from './labor-utils.js';

let map;
let marker;
let radiusCircle;
let points = [];
let savedMarkers = [];
let savedCircles = [];

export function init() {
  document.getElementById('formPunto')?.addEventListener('submit', save);
  document.getElementById('btnPuntoCancelar')?.addEventListener('click', reset);
  load();
  loadMap();
}

async function load() {
  const body = document.getElementById('puntosBody');
  if (!body) return;
  try {
    points = listOf(await API.puntosGeograficos());
    body.innerHTML = points.length ? points.map(row => '<tr data-point-id="' + text(row.id) + '"><td>' +
      text(row.nombre ?? row.name) + '</td><td>' + text(row.latitud ?? row.latitude) + '</td><td>' +
      text(row.longitud ?? row.longitude) + '</td><td>' + text(row.radioMetros ?? row.radiusMeters) +
      ' m</td><td class="acciones-cell"><button type="button" class="btn btn-sm btn-outline-secondary ver-punto" data-id="' +
      text(row.id) + '" title="Ver en mapa"><i class="fas fa-map-marker-alt"></i></button> <button type="button" class="btn-kebab-toggle kebab-trigger" data-id="' +
      text(row.id) + '" title="Acciones"><i class="fas fa-ellipsis-v"></i></button></td></tr>').join('') :
      '<tr><td colspan="5">Sin puntos registrados.</td></tr>';
    body.querySelectorAll('.ver-punto').forEach(button => button.addEventListener('click', () => focusPoint(points.find(row => String(row.id) === button.dataset.id))));
    body.querySelectorAll('.kebab-trigger').forEach(button => button.addEventListener('click', event => {
      event.stopPropagation();
      button.classList.add('show');
      const row = points.find(item => String(item.id) === button.dataset.id);
      Utils.abrirMenuKebab(button, [
        { icon: 'fa-edit', text: 'Editar punto', onClick: () => edit(row) },
        { icon: 'fa-map-marker-alt', text: 'Ver en mapa', onClick: () => focusPoint(row) },
        { icon: 'fa-trash-alt', text: 'Eliminar punto', danger: true, onClick: () => remove(button.dataset.id) },
      ]);
    }));
    renderSavedPoints();
  } catch (e) {
    body.innerHTML = '<tr><td colspan="5" class="text-danger">' + text(errorMessage(e)) + '</td></tr>';
  }
}

async function save(event) {
  event.preventDefault();
  const id = document.getElementById('puntoId').value;
  const data = {
    nombre: document.getElementById('puntoNombre').value.trim(),
    latitud: Number(document.getElementById('puntoLatitud').value),
    longitud: Number(document.getElementById('puntoLongitud').value),
    radioMetros: Number(document.getElementById('puntoRadio').value),
  };
  if (!data.nombre || !Number.isFinite(data.latitud) || !Number.isFinite(data.longitud) || data.radioMetros <= 0) {
    Utils.showToast('Completa nombre, coordenadas y un radio válido.', 'warning');
    return;
  }
  try {
    if (id) await API.put('/puntos-geograficos/' + encodeURIComponent(id), data);
    else await API.post('/puntos-geograficos', data);
    Utils.showToast('Punto guardado', 'success');
    reset();
    load();
  } catch (e) { Utils.showToast(errorMessage(e), 'error'); }
}

function edit(row) {
  if (!row) return;
  document.getElementById('puntoId').value = row.id;
  document.getElementById('puntoNombre').value = row.nombre ?? row.name ?? '';
  document.getElementById('puntoLatitud').value = row.latitud ?? row.latitude ?? '';
  document.getElementById('puntoLongitud').value = row.longitud ?? row.longitude ?? '';
  document.getElementById('puntoRadio').value = row.radioMetros ?? row.radiusMeters ?? 100;
  updateMapSelection();
  focusPoint(row);
}

async function remove(id) {
  if (!(await Utils.confirm('Se eliminará este punto.'))) return;
  try { await API.del('/puntos-geograficos/' + encodeURIComponent(id)); load(); }
  catch (e) { Utils.showToast(errorMessage(e), 'error'); }
}

function reset() {
  document.getElementById('formPunto')?.reset();
  document.getElementById('puntoId').value = '';
  updateMapSelection();
}

function loadMap() {
  if (!window.GOOGLE_MAPS_API_KEY) {
    const alert = document.getElementById('mapConfigAlert');
    if (alert) { alert.textContent = 'Google Maps no está configurado. Define window.GOOGLE_MAPS_API_KEY en js/config.js o en tu despliegue.'; alert.classList.remove('d-none'); }
    return;
  }
  if (window.google?.maps) return createMap();
  const script = document.createElement('script');
  script.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(window.GOOGLE_MAPS_API_KEY) + '&callback=__initLaborMap';
  script.async = true;
  script.onerror = () => {
    const alert = document.getElementById('mapConfigAlert');
    if (alert) { alert.textContent = 'No se pudo cargar Google Maps. Revisa la clave y sus restricciones.'; alert.classList.remove('d-none'); }
  };
  window.__initLaborMap = createMap;
  document.head.appendChild(script);
}

function createMap() {
  map = new google.maps.Map(document.getElementById('googleMap'), { center: { lat: 21.0186, lng: -101.8572 }, zoom: 14 });
  map.addListener('click', event => {
    document.getElementById('puntoLatitud').value = event.latLng.lat().toFixed(7);
    document.getElementById('puntoLongitud').value = event.latLng.lng().toFixed(7);
    updateMapSelection();
  });
  renderSavedPoints();
}

function pointData(row) {
  return { lat: Number(row.latitud ?? row.latitude), lng: Number(row.longitud ?? row.longitude), radius: Number(row.radioMetros ?? row.radiusMeters) || 100 };
}

function renderSavedPoints() {
  if (!map || !window.google?.maps) return;
  savedMarkers.forEach(item => item.setMap(null));
  savedCircles.forEach(item => item.setMap(null));
  savedMarkers = [];
  savedCircles = [];
  const bounds = new google.maps.LatLngBounds();
  points.filter(row => row.activo !== false).forEach(row => {
    const data = pointData(row);
    if (!Number.isFinite(data.lat) || !Number.isFinite(data.lng)) return;
    const position = { lat: data.lat, lng: data.lng };
    const savedMarker = new google.maps.Marker({ map, position, title: row.nombre ?? row.name ?? 'Punto geográfico', label: 'P' });
    const circle = new google.maps.Circle({ map, center: position, radius: data.radius, strokeColor: '#198754', strokeOpacity: 0.8, strokeWeight: 2, fillColor: '#198754', fillOpacity: 0.12 });
    savedMarker.addListener('click', () => focusPoint(row));
    savedMarkers.push(savedMarker);
    savedCircles.push(circle);
    bounds.extend(position);
  });
  if (!bounds.isEmpty()) map.fitBounds(bounds, 60);
}

function focusPoint(row) {
  if (!row || !map) return;
  const data = pointData(row);
  if (!Number.isFinite(data.lat) || !Number.isFinite(data.lng)) return;
  map.panTo({ lat: data.lat, lng: data.lng });
  map.setZoom(17);
  editSelection(data.lat, data.lng, data.radius);
}

function editSelection(lat, lng, radius) {
  document.getElementById('puntoLatitud').value = lat.toFixed(7);
  document.getElementById('puntoLongitud').value = lng.toFixed(7);
  document.getElementById('puntoRadio').value = radius;
  updateMapSelection();
}

function updateMapSelection() {
  if (!map || !window.google?.maps) return;
  const lat = Number(document.getElementById('puntoLatitud')?.value);
  const lng = Number(document.getElementById('puntoLongitud')?.value);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  const center = { lat, lng };
  if (!marker) {
    marker = new google.maps.Marker({ map, position: center, draggable: true, title: 'Punto en edición' });
    marker.addListener('dragend', event => editSelection(event.latLng.lat(), event.latLng.lng(), Number(document.getElementById('puntoRadio')?.value) || 100));
  }
  marker.setPosition(center);
  const radius = Math.max(1, Number(document.getElementById('puntoRadio')?.value) || 100);
  if (!radiusCircle) radiusCircle = new google.maps.Circle({ map, strokeColor: '#0d6efd', strokeOpacity: 0.8, strokeWeight: 2, fillColor: '#0d6efd', fillOpacity: 0.15 });
  radiusCircle.setCenter(center);
  radiusCircle.setRadius(radius);
}
