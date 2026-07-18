import React from 'react';
import { WebView } from 'react-native-webview';
import { LocationPickerChrome, type LocationPickerProps } from '@/components/LocationPickerChrome';
import { buildLocationPickerHtml, type LatLng } from '@/lib/locationPickerHtml';

// Native (iOS/Android) map surface — react-native-webview ships in Expo Go,
// so this needs no custom dev client / native rebuild.
export function LocationPicker(props: LocationPickerProps) {
  return (
    <LocationPickerChrome
      {...props}
      renderMap={({ center, onPicked }) => (
        <WebView
          key={`${center.latitude},${center.longitude}`}
          originWhitelist={['*']}
          source={{ html: buildLocationPickerHtml(center) }}
          style={{ flex: 1 }}
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data) as Partial<LatLng>;
              if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
                onPicked({ latitude: data.latitude, longitude: data.longitude });
              }
            } catch {
              // ignore malformed bridge messages
            }
          }}
        />
      )}
    />
  );
}
