import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Alert } from '@/lib/alert';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { DEFAULT_MAP_CENTER, type LatLng } from '@/lib/locationPickerHtml';
import { getCurrentPositionSafe } from '@/lib/location';

export interface LocationPickerProps {
  visible: boolean;
  initial?: LatLng | null;
  title?: string;
  onConfirm: (coords: LatLng) => void;
  onClose: () => void;
}

// Shared chrome (header, footer, "use my location" button) around the
// platform-specific map surface. Rendered by LocationPicker.tsx (native,
// WebView) and LocationPicker.web.tsx (web, iframe) — see lib/locationPickerHtml.ts
// for the Leaflet page both of them load.
export function LocationPickerChrome({
  visible,
  initial,
  title,
  onConfirm,
  onClose,
  renderMap,
}: LocationPickerProps & {
  renderMap: (props: { center: LatLng; onPicked: (coords: LatLng) => void }) => React.ReactNode;
}) {
  const colors = useColors();
  const [center, setCenter] = useState<LatLng>(initial ?? DEFAULT_MAP_CENTER);
  const [picked, setPicked] = useState<LatLng>(initial ?? DEFAULT_MAP_CENTER);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (visible) {
      const start = initial ?? DEFAULT_MAP_CENTER;
      setCenter(start);
      setPicked(start);
    }
  }, [visible]);

  const useMyLocation = async () => {
    setLocating(true);
    try {
      const coords = await getCurrentPositionSafe();
      if (!coords) {
        Alert.alert('تعذر تحديد موقعك', 'تأكد من تفعيل خدمة الموقع (GPS) وإعطاء الإذن، ثم حاول مرة أخرى');
        return;
      }
      setCenter(coords);
      setPicked(coords);
    } finally {
      setLocating(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} hitSlop={10} style={styles.headerBtn}>
            <Feather name="x" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
            {title ?? 'حدد موقعك على الخارطة'}
          </Text>
          <View style={styles.headerBtn} />
        </View>

        <View style={{ flex: 1 }}>{renderMap({ center, onPicked: setPicked })}</View>

        <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <Pressable
            onPress={useMyLocation}
            disabled={locating}
            style={[styles.locateBtn, { backgroundColor: colors.muted, opacity: locating ? 0.6 : 1 }]}
          >
            {locating ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Feather name="crosshair" size={16} color={colors.primary} />
            )}
            <Text style={[styles.locateBtnText, { color: colors.foreground }]}>استخدم موقعي الحالي</Text>
          </Pressable>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            حرّك الخارطة حتى يوصل الدبوس لموقعك بالضبط
          </Text>
          <Pressable
            onPress={() => onConfirm(picked)}
            style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="check-circle" size={18} color={colors.primaryForeground} />
            <Text style={[styles.confirmBtnText, { color: colors.primaryForeground }]}>تأكيد هذا الموقع</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 16,
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    gap: 10,
    borderTopWidth: 1,
  },
  locateBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 12,
  },
  locateBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 11,
    textAlign: 'center',
  },
  confirmBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
  },
  confirmBtnText: {
    fontFamily: fonts.bold,
    fontSize: 15,
  },
});
