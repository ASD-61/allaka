import React, { useEffect } from 'react';
import { LocationPickerChrome, type LocationPickerProps } from '@/components/LocationPickerChrome';
import { buildLocationPickerHtml, type LatLng } from '@/lib/locationPickerHtml';

// Web map surface — react-native-webview has no web implementation, so the
// browser build uses a plain <iframe> with the same Leaflet page instead.
export function LocationPicker(props: LocationPickerProps) {
  return (
    <LocationPickerChrome
      {...props}
      renderMap={({ center, onPicked }) => <MapFrame center={center} onPicked={onPicked} />}
    />
  );
}

function MapFrame({ center, onPicked }: { center: LatLng; onPicked: (coords: LatLng) => void }) {
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(String(event.data)) as Partial<LatLng>;
        if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          onPicked({ latitude: data.latitude, longitude: data.longitude });
        }
      } catch {
        // ignore messages that aren't ours (e.g. from dev tools extensions)
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onPicked]);

  return (
    <iframe
      key={`${center.latitude},${center.longitude}`}
      title="location-picker-map"
      srcDoc={buildLocationPickerHtml(center)}
      style={{ border: 0, width: '100%', height: '100%' }}
    />
  );
}
