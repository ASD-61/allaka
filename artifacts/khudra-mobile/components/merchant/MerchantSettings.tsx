import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Alert } from '@/lib/alert';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useUpdateStore, useRequestUploadUrl, type Store } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { resolveImageUrl } from '@/lib/image-url';
import { pickImage, uploadPickedImage } from '@/lib/upload';

export function MerchantSettings({ store, onSaved }: { store: Store; onSaved: () => void }) {
  const colors = useColors();
  const updateStore = useUpdateStore();
  const requestUploadUrl = useRequestUploadUrl();

  const [name, setName] = useState(store.name);
  const [storeType, setStoreType] = useState(store.storeType);
  const [address, setAddress] = useState(store.address);
  const [description, setDescription] = useState(store.description ?? '');
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const isSuspended = store.status === 'موقوف مؤقتاً';

  const statusColor =
    store.status === 'مفعّل'
      ? colors.primary
      : store.status === 'مرفوض'
        ? colors.destructive
        : colors.accent;

  const handlePickImage = async () => {
    const picked = await pickImage();
    if (!picked) return;
    setImagePreview(picked.uri);
    setUploading(true);
    try {
      const path = await uploadPickedImage(picked, (args) => requestUploadUrl.mutateAsync(args));
      setImagePath(path);
    } catch {
      Alert.alert('خطأ', 'تعذر رفع الصورة');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !storeType.trim() || !address.trim()) {
      Alert.alert('تنبيه', 'يرجى تعبئة الاسم والنوع والعنوان');
      return;
    }
    const data: Record<string, unknown> = {
      name: name.trim(),
      storeType: storeType.trim(),
      address: address.trim(),
      description: description.trim() || null,
    };
    if (imagePath) data.imageUrl = imagePath;
    setSaving(true);
    try {
      await updateStore.mutateAsync({ id: store.id, data: data as any });
      Alert.alert('تم الحفظ', 'تم تحديث معلومات المتجر بنجاح');
      setImagePath(null);
      setImagePreview(null);
      onSaved();
    } catch (err: any) {
      Alert.alert('خطأ', err?.data?.error ?? 'تعذر حفظ التعديلات');
    } finally {
      setSaving(false);
    }
  };

  const currentImage = imagePreview ?? (store.imageUrl ? resolveImageUrl(store.imageUrl) : null);

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.infoRow}>
          <View style={[styles.statusPill, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{store.status}</Text>
          </View>
          <Text style={[styles.infoTitle, { color: colors.foreground }]}>حالة الاشتراك</Text>
        </View>
        {store.subscriptionExpiresAt ? (
          <View style={styles.detailRow}>
            <Text style={[styles.detail, { color: colors.primary }]}>
              ينتهي الاشتراك: {String(store.subscriptionExpiresAt).slice(0, 10)}
            </Text>
            <Feather name="calendar" size={13} color={colors.primary} />
          </View>
        ) : null}
        {isSuspended ? (
          <View style={[styles.warnBox, { backgroundColor: colors.warning + '15' }]}>
            <Feather name="alert-triangle" size={14} color={colors.warning} />
            <Text style={[styles.warnText, { color: colors.warning }]}>
              المتجر موقوف مؤقتاً من الإدارة
            </Text>
          </View>
        ) : null}
      </View>

      <Text style={[styles.sectionLabel, { color: colors.foreground }]}>معلومات المتجر</Text>

      <Pressable
        onPress={handlePickImage}
        style={[styles.imagePicker, { backgroundColor: colors.muted, borderColor: colors.border }]}
      >
        {currentImage ? (
          <Image source={{ uri: currentImage }} style={styles.previewImg} contentFit="cover" />
        ) : (
          <View style={styles.imagePickerPlaceholder}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primary + '15' }]}>
              <Feather name="camera" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.imagePickerText, { color: colors.mutedForeground }]}>صورة المتجر</Text>
          </View>
        )}
        {uploading ? (
          <View style={styles.uploadOverlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        ) : null}
      </Pressable>

      <Field label="اسم المتجر" value={name} onChangeText={setName} placeholder="مثال: بقالية النور" colors={colors} />
      <Field label="نوع المتجر" value={storeType} onChangeText={setStoreType} placeholder="مثال: بقالة، لحوم، مخبز" colors={colors} />
      <Field label="العنوان" value={address} onChangeText={setAddress} placeholder="المدينة والمنطقة" colors={colors} />
      <Field
        label="تفاصيل إضافية (اختياري)"
        value={description}
        onChangeText={setDescription}
        placeholder="وصف قصير عن المتجر ومنتجاته"
        colors={colors}
        multiline
      />

      <Pressable
        onPress={handleSave}
        disabled={saving || uploading}
        style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: saving || uploading ? 0.7 : 1 }]}
      >
        {saving ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <>
            <Feather name="check" size={18} color={colors.primaryForeground} />
            <Text style={[styles.submitText, { color: colors.primaryForeground }]}>حفظ التعديلات</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  colors,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  colors: ReturnType<typeof useColors>;
  multiline?: boolean;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        multiline={multiline}
        style={[
          styles.input,
          multiline ? styles.inputMultiline : null,
          { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
        ]}
        textAlign="right"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 60 },
  infoCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    marginBottom: 22,
  },
  infoRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    textAlign: 'right',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusText: {
    fontFamily: fonts.bold,
    fontSize: 11,
  },
  detailRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  detail: {
    fontFamily: fonts.medium,
    fontSize: 13,
    textAlign: 'right',
  },
  warnBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
  },
  warnText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    textAlign: 'right',
  },
  sectionLabel: {
    fontFamily: fonts.bold,
    fontSize: 15,
    textAlign: 'right',
    marginBottom: 12,
  },
  imagePicker: {
    height: 160,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  previewImg: {
    width: '100%',
    height: '100%',
  },
  imagePickerPlaceholder: {
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerText: {
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    textAlign: 'right',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  inputMultiline: {
    height: 90,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  submitBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
    marginTop: 8,
  },
  submitText: {
    fontFamily: fonts.bold,
    fontSize: 15,
  },
});
