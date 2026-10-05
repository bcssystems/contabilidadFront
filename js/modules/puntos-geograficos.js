import { errorMessage, listOf, text } from './labor-utils.js';
let map;
let marker;
let radiusCircle;
export function init() { document.getElementById('formPunto')?.addEventListener('submit', save); document.getElementById('btnPuntoCancelar')?.addEventListener('click', reset); load(); loadMap(); }
async function load() { const body = document.getElementById('puntosBody'); try { const rows = listOf(await API.puntosGeograficos()); body.innerHTML = rows.length ? rows.map(row => '<tr><td>' + text(row.nombre || row.name) + '</td><td>' + text(row.latitud || row.latitude) + '</td><td>' + text(row.longitud || row.longitude) + '</td><td>' + text(row.radioMetros || row.radiusMeters) + ' m</td><td><button class="btn btn-sm btn-outline-secondary" data-edit="' + text(row.id) + '">Editar</button> <button class="btn btn-sm btn-outline-danger" data-remove="' + text(row.id) + '">Eliminar</button></td></tr>').join('') : '<tr><td colspan="5">Sin puntos registrados.</td></tr>'; body.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => edit(rows.find(r => String(r.id) === b.dataset.edit)))); body.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => remove(b.dataset.remove))); } catch (e) { body.innerHTML = '<tr><td colspan="5" class="text-danger">' + text(errorMessage(e)) + '</td></tr>'; } }
async function save(event) { event.preventDefault(); const id = document.getElementById('puntoId').value; const data = { nombre: document.getElementById('puntoNombre').value.trim(), latitud: Number(document.getElementById('puntoLatitud').value), longitud: Number(document.getElementById('puntoLongitud').value), radioMetros: Number(document.getElementById('puntoRadio').value) }; try { if (id) await API.put('/puntos-geograficos/' + encodeURIComponent(id), data); else await API.post('/puntos-geograficos', data); Utils.showToast('Punto guardado', 'success'); reset(); load(); } catch (e) { Utils.showToast(errorMessage(e), 'error'); } }
function edit(row) { if (!row) return; document.getElementById('puntoId').value = row.id; document.getElementById('puntoNombre').value = row.nombre || row.name || ''; document.getElementById('puntoLatitud').value = row.latitud ?? row.latitude ?? ''; document.getElementById('puntoLongitud').value = row.longitud ?? row.longitude ?? ''; document.getElementById('puntoRadio').value = row.radioMetros ?? row.radiusMeters ?? 100; }
async function remove(id) { if (!(await Utils.confirm('Se eliminará este punto.'))) return; try { await API.del('/puntos-geograficos/' + encodeURIComponent(id)); load(); } catch (e) { Utils.showToast(errorMessage(e), 'error'); } }
function reset() { document.getElementById('formPunto')?.reset(); document.getElementById('puntoId').value = ''; updateMapSelection(); }
function loadMap() { if (!window.GOOGLE_MAPS_API_KEY) { const alert = document.getElementById('mapConfigAlert'); alert.textContent = 'Google Maps no está configurado. Define window.GOOGLE_MAPS_API_KEY en js/config.js o en tu despliegue.'; alert.classList.remove('d-none'); return; } if (window.google?.maps) return createMap(); const script = document.createElement('script'); script.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(window.GOOGLE_MAPS_API_KEY) + '&callback=__initLaborMap'; script.async = true; script.onerror = () => { document.getElementById('mapConfigAlert').textContent = 'No se pudo cargar Google Maps. Revisa la clave y sus restricciones.'; document.getElementById('mapConfigAlert').classList.remove('d-none'); }; window.__initLaborMap = createMap; document.head.appendChild(script); }
function createMap() { map = new google.maps.Map(document.getElementById('googleMap'), { center: { lat: 19.4326, lng: -99.1332 }, zoom: 11 }); map.addListener('click', event => { document.getElementById('puntoLatitud').value = event.latLng.lat().toFixed(7); document.getElementById('puntoLongitud').value = event.latLng.lng().toFixed(7); updateMapSelection(); }); ['puntoLatitud', 'puntoLongitud', 'puntoRadio'].forEach(id => document.getElementById(id)?.addEventListener('input', updateMapSelection)); }

function updateMapSelection() {
  if (!map || !window.google?.maps) return;
  const lat = Number(document.getElementById('puntoLatitud')?.value);
  const lng = Number(document.getElementById('puntoLongitud')?.value);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  const center = { lat, lng };
  if (!marker) {
    marker = new google.maps.Marker({ map, position: center, draggable: true });
    marker.addListener('dragend', event => {
      document.getElementById('puntoLatitud').value = event.latLng.lat().toFixed(7);
      document.getElementById('puntoLongitud').value = event.latLng.lng().toFixed(7);
      updateMapSelection();
    });
  }
  marker.setPosition(center);
  const radius = Math.max(1, Number(document.getElementById('puntoRadio')?.value) || 100);
  if (!radiusCircle) radiusCircle = new google.maps.Circle({ map, strokeColor: '#0d6efd', strokeOpacity: 0.8, strokeWeight: 2, fillColor: '#0d6efd', fillOpacity: 0.15 });
  radiusCircle.setCenter(center);
  radiusCircle.setRadius(radius);
  map.panTo(center);
}
