export interface LatLng {
  latitude: number;
  longitude: number;
}

// Falls back to Baghdad when we have no GPS/initial coordinate yet.
export const DEFAULT_MAP_CENTER: LatLng = { latitude: 33.3152, longitude: 44.3661 };

// A self-contained Leaflet (OpenStreetMap) page: shows a pin fixed at the
// screen center while the map pans underneath it (the same "drag the map,
// not the pin" pattern used by Uber/Careem-style pickers), and reports the
// center coordinate back to the host every time the map settles. Works
// identically inside a native WebView and inside a plain web <iframe> —
// the `send` helper below picks whichever bridge is available.
export function buildLocationPickerHtml(center: LatLng): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; background: #eee; }
  .center-pin {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -100%);
    width: 38px; height: 38px; z-index: 1000; pointer-events: none;
    filter: drop-shadow(0 2px 3px rgba(0,0,0,0.45));
  }
</style>
</head>
<body>
<div id="map"></div>
<svg class="center-pin" viewBox="0 0 24 24" fill="#16a34a" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 2C7.58 2 4 5.58 4 10c0 5.25 7 12 8 12s8-6.75 8-12c0-4.42-3.58-8-8-8zm0 11a3 3 0 110-6 3 3 0 010 6z"/>
</svg>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map = L.map('map', { zoomControl: true, attributionControl: false })
    .setView([${center.latitude}, ${center.longitude}], 16);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

  function send(lat, lng) {
    var msg = JSON.stringify({ latitude: lat, longitude: lng });
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(msg);
    } else if (window.parent) {
      window.parent.postMessage(msg, '*');
    }
  }
  map.on('moveend', function () {
    var c = map.getCenter();
    send(c.lat, c.lng);
  });
  send(${center.latitude}, ${center.longitude});
</script>
</body>
</html>`;
}
