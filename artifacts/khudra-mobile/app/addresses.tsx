import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Alert } from '@/lib/alert';
import { Feather } from '@expo/vector-icons';
import { getCurrentPositionSafe } from '@/lib/location';
import {
  useListAddresses,
  useCreateAddress,
  useDeleteAddress,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { EmptyState } from '@/components/EmptyState';
import { RequireAuth } from '@/components/RequireAuth';
import { LocationPicker } from '@/components/LocationPicker';
import type { LatLng } from '@/lib/locationPickerHtml';

export default function AddressesScreen() {
  return (
    <RequireAuth message="سجّل دخولك لإدارة عناوين التوصيل">
      <AddressesContent />
    </RequireAuth>
  );
}

function AddressesContent() {
  const colors = useColors();
  const query = useListAddresses();
  const createAddress = useCreateAddress();
  const deleteAddress = useDeleteAddress();

  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState('');
  const [details, setDetails] = useState('');
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);

  const handleUseLocation = async () => {
    setLocating(true);
    try {
      const coords = await getCurrentPositionSafe();
      if (coords) setCoords(coords);
    } finally {
      setLocating(false);
      setPickerVisible(true);
    }
  };

  const resetForm = () => {
    setLabel('');
    setDetails('');
    setCoords(null);
  };

  const handleSave = async () => {
    if (!label.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم العنوان (مثل المنزل أو العمل)');
      return;
    }
    setSaving(true);
    try {
      await createAddress.mutateAsync({
        data: {
          label: label.trim(),
          details: details.trim() || null,
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
        },
      });
      resetForm();
      setShowForm(false);
      query.refetch();
    } catch {
      Alert.alert('خطأ', 'تعذر حفظ العنوان');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={query.data ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 4 }}>
            <Pressable
              onPress={() => setShowForm((v) => !v)}
              style={[styles.newBtn, { backgroundColor: colors.primary }]}
            >
              <Feather name={showForm ? 'x' : 'plus'} size={16} color={colors.primaryForeground} />
              <Text style={[styles.newBtnText, { color: colors.primaryForeground }]}>
                {showForm ? 'إلغاء' : 'إضافة عنوان جديد'}
              </Text>
            </Pressable>

            {showForm ? (
              <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TextInput
                  value={label}
                  onChangeText={setLabel}
                  placeholder="اسم العنوان (المنزل، العمل...)"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { color: colors.foreground, backgroundColor: colors.muted }]}
                  textAlign="right"
                />
                <TextInput
                  value={details}
                  onChangeText={setDetails}
                  placeholder="تفاصيل إضافية (الحي، أقرب نقطة دالة...)"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, styles.multiline, { color: colors.foreground, backgroundColor: colors.muted }]}
                  textAlign="right"
                  multiline
                />
                <Pressable
                  onPress={handleUseLocation}
                  disabled={locating}
                  style={[
                    styles.locationBtn,
                    { backgroundColor: coords ? colors.secondary : colors.muted },
                  ]}
                >
                  {locating ? (
                    <ActivityIndicator color={colors.accent} size="small" />
                  ) : (
                    <Feather name="map-pin" size={15} color={coords ? colors.accent : colors.mutedForeground} />
                  )}
                  <Text
                    style={[
                      styles.locationBtnText,
                      { color: coords ? colors.secondaryForeground : colors.mutedForeground },
                    ]}
                  >
                    {coords ? 'تم تحديد الموقع الحالي' : 'استخدام الموقع الحالي'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleSave}
                  disabled={saving}
                  style={[styles.saveBtn, { backgroundColor: colors.accent, opacity: saving ? 0.7 : 1 }]}
                >
                  {saving ? (
                    <ActivityIndicator color={colors.accentForeground} />
                  ) : (
                    <Text style={[styles.saveBtnText, { color: colors.accentForeground }]}>حفظ العنوان</Text>
                  )}
                </Pressable>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          query.isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
          ) : (
            <EmptyState icon="map-pin" title="لا توجد عناوين محفوظة" subtitle="أضف عنوانًا لتسريع عملية التوصيل" />
          )
        }
        renderItem={({ item }) => (
          <View style={[styles.addressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.addressIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="map-pin" size={16} color={colors.accent} />
            </View>
            <View style={styles.addressInfo}>
              <Text style={[styles.addressLabel, { color: colors.foreground }]}>{item.label}</Text>
              {item.details ? (
                <Text style={[styles.addressDetails, { color: colors.mutedForeground }]} numberOfLines={2}>
                  {item.details}
                </Text>
              ) : null}
              {item.latitude != null ? (
                <View style={styles.coordsRow}>
                  <Feather name="check-circle" size={11} color={colors.primary} />
                  <Text style={[styles.coordsText, { color: colors.primary }]}>موقع محدد على الخريطة</Text>
                </View>
              ) : null}
            </View>
            <Pressable
              hitSlop={8}
              onPress={() =>
                Alert.alert('حذف العنوان', `هل تريد حذف "${item.label}"؟`, [
                  { text: 'إلغاء', style: 'cancel' },
                  { text: 'حذف', style: 'destructive', onPress: () => deleteAddress.mutate({ id: item.id }) },
                ])
              }
            >
              <Feather name="trash-2" size={16} color={colors.destructive} />
            </Pressable>
          </View>
        )}
      />

      <LocationPicker
        visible={pickerVisible}
        initial={coords}
        title="حدد موقع هذا العنوان"
        onConfirm={(picked) => {
          setCoords(picked);
          setPickerVisible(false);
        }}
        onClose={() => setPickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  newBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    paddingVertical: 12,
  },
  newBtnText: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  form: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  multiline: {
    height: 70,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  locationBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
  },
  locationBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 12.5,
  },
  saveBtn: {
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  addressCard: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  addressIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressInfo: {
    flex: 1,
    gap: 3,
  },
  addressLabel: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    textAlign: 'right',
  },
  addressDetails: {
    fontFamily: fonts.regular,
    fontSize: 12,
    textAlign: 'right',
    lineHeight: 18,
  },
  coordsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  coordsText: {
    fontFamily: fonts.medium,
    fontSize: 10.5,
  },
});
