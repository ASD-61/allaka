import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Alert } from '@/lib/alert';
import { Linking } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { waMeLink } from '@/lib/phone';
import {
  useCreateStore,
  useListMyStores,
  useListStoreTypes,
  useRequestUploadUrl,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { RequireAuth } from '@/components/RequireAuth';
import { LocationPicker } from '@/components/LocationPicker';
import type { LatLng } from '@/lib/locationPickerHtml';
import { pickImageWithChoice, uploadPickedImage } from '@/lib/upload';

// Flat rate: ١٠٠ ألف دينار لكل ٣ أشهر (same rate the admin uses when
// approving), scaled linearly for the longer options.
const SUBSCRIPTION_PLANS: { months: 3 | 6 | 12; label: string; price: string }[] = [
  { months: 3, label: '٣ أشهر', price: '١٠٠ ألف د.ع' },
  { months: 6, label: '٦ أشهر', price: '٢٠٠ ألف د.ع' },
  { months: 12, label: '١٢ شهر', price: '٤٠٠ ألف د.ع' },
];

// The admin's WhatsApp for arranging the (offline/electronic) registration
// payment — same number shown on the help/support screen.
const ADMIN_WHATSAPP = '9647731355623';

export default function RegisterStoreScreen() {
  return (
    <RequireAuth message="سجّل دخولك حتى تقدر تسجّل متجرك">
      <RegisterStoreContent />
    </RequireAuth>
  );
}

const STATUS_COLORS = (colors: ReturnType<typeof useColors>) => ({
  'قيد المراجعة': colors.accent,
  'مفعّل': colors.primary,
  'مرفوض': colors.destructive,
});

function RegisterStoreContent() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const myStores = useListMyStores();
  const storeTypes = useListStoreTypes();
  const createStore = useCreateStore();
  const requestUploadUrl = useRequestUploadUrl();

  const [name, setName] = useState('');
  const [storeType, setStoreType] = useState('');
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [subscriptionMonths, setSubscriptionMonths] = useState<3 | 6 | 12>(3);
  // Set after a successful submit so we can show a "pay via WhatsApp" CTA.
  const [submittedStore, setSubmittedStore] = useState<{ name: string; price: string; trial: boolean } | null>(null);

  const messageAdmin = () => {
    const price = submittedStore?.price ?? '';
    const msg = submittedStore?.trial
      ? `مرحباً، طلبت تجربة مجانية لمتجر "${submittedStore?.name ?? ''}" على تطبيق علاّكة، وأريد تفعيل المتجر والاتفاق على الاشتراك. شلون نكمل؟`
      : `مرحباً، سجّلت متجر "${submittedStore?.name ?? ''}" على تطبيق علاّكة ` +
        `واخترت اشتراك بقيمة ${price}. أريد أرسل مبلغ التسجيل إلكترونياً، شلون نتفق؟`;
    Linking.openURL(waMeLink(ADMIN_WHATSAPP, msg)).catch(() =>
      Alert.alert('تعذر الفتح', 'تأكد من تثبيت واتساب على جهازك'),
    );
  };

  const handlePickImage = async () => {
    const picked = await pickImageWithChoice();
    if (!picked) return;
    setImagePreview(picked.uri);
    setUploading(true);
    try {
      const path = await uploadPickedImage(picked, (args) => requestUploadUrl.mutateAsync(args));
      setImagePath(path);
    } catch (err) {
      Alert.alert('خطأ', err instanceof Error ? err.message : 'تعذر رفع الصورة');
    } finally {
      setUploading(false);
    }
  };

  const canSubmit =
    name.trim().length > 0 &&
    storeType.trim().length > 0 &&
    address.trim().length > 0;

  const handleSubmit = async (trial: boolean) => {
    if (!canSubmit) return;
    const planPrice =
      SUBSCRIPTION_PLANS.find((p) => p.months === subscriptionMonths)?.price ?? '';
    const submittedName = name.trim();
    try {
      await createStore.mutateAsync({
        data: {
          name: submittedName,
          storeType: storeType.trim(),
          address: address.trim(),
          description: description.trim() || null,
          imageUrl: imagePath,
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
          requestedSubscriptionMonths: subscriptionMonths,
          trial,
        } as any,
      });
      setName('');
      setStoreType('');
      setAddress('');
      setDescription('');
      setCoords(null);
      setImagePath(null);
      setImagePreview(null);
      setSubscriptionMonths(3);
      myStores.refetch();
      setSubmittedStore({ name: submittedName, price: planPrice, trial });
    } catch (err: any) {
      Alert.alert('تعذر التسجيل', err?.data?.error ?? 'صار خطأ، حاول مرة ثانية');
    }
  };

  const statusColor = STATUS_COLORS(colors);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.hero, { backgroundColor: colors.primary + '12' }]}>
        <Feather name="shopping-bag" size={22} color={colors.primary} />
        <Text style={[styles.heroText, { color: colors.foreground }]}>
          سجّل متجرك ويا علاّكة
        </Text>
      </View>

      {submittedStore ? (
        <View style={[styles.successCard, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '40' }]}>
          <View style={styles.successHeader}>
            <Feather name="check-circle" size={20} color={colors.primary} />
            <Text style={[styles.successTitle, { color: colors.foreground }]}>
              {submittedStore.trial ? `تم إرسال طلب التجربة المجانية "${submittedStore.name}"` : `تم إرسال طلب "${submittedStore.name}"`}
            </Text>
          </View>
          <Text style={[styles.successText, { color: colors.mutedForeground }]}>
            {submittedStore.trial
              ? 'طلبك قيد مراجعة الإدارة. بعد الموافقة يتفعّل متجرك مجاناً لمدة ١٠ أيام تقدر خلالها تضيف منتجاتك وتستقبل الطلبات، وبعد انتهاء التجربة يتوقف المتجر ما لم تكمل الاشتراك. تقدر تراسل الإدارة على الواتساب لتسريع التفعيل والاتفاق على الاشتراك.'
              : `متجرك قيد المراجعة. تقدر تراسل الإدارة على الواتساب لدفع مبلغ التسجيل (${submittedStore.price}) إلكترونياً والاتفاق على التفعيل.`}
          </Text>
          <Pressable onPress={messageAdmin} style={[styles.waBtn, { backgroundColor: '#25D366' }]}>
            <Feather name="message-circle" size={18} color="#fff" />
            <Text style={styles.waBtnText}>
              {submittedStore.trial ? 'مراسلة الإدارة لإكمال الاشتراك' : 'مراسلة الإدارة على واتساب لدفع الاشتراك'}
            </Text>
          </Pressable>
          <Pressable onPress={() => setSubmittedStore(null)} hitSlop={6} style={{ alignSelf: 'center', paddingVertical: 6 }}>
            <Text style={[styles.successDismiss, { color: colors.mutedForeground }]}>تسجيل متجر آخر</Text>
          </Pressable>
        </View>
      ) : null}

      {(myStores.data?.length ?? 0) > 0 ? (
        <View style={{ marginBottom: 22 }}>
          <Text style={[styles.sectionLabel, { color: colors.foreground }]}>متاجري</Text>
          {myStores.data!.map((s) => (
            <View
              key={s.id}
              style={[styles.storeRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.statusPill, { backgroundColor: statusColor[s.status as keyof typeof statusColor] + '20' }]}>
                <Text style={[styles.statusText, { color: statusColor[s.status as keyof typeof statusColor] ?? colors.foreground }]}>
                  {s.status}
                </Text>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end', gap: 3 }}>
                <Text style={[styles.storeName, { color: colors.foreground }]}>{s.name}</Text>
                <Text style={[styles.storeMeta, { color: colors.mutedForeground }]}>
                  {s.storeType} · {s.address}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={[styles.sectionLabel, { color: colors.foreground }]}>معلومات المتجر</Text>

      <Pressable
        onPress={handlePickImage}
        style={[styles.imagePicker, { backgroundColor: colors.muted, borderColor: colors.border }]}
      >
        {imagePreview ? (
          <Image source={{ uri: imagePreview }} style={styles.previewImg} contentFit="contain" />
        ) : (
          <View style={styles.imagePickerPlaceholder}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primary + '15' }]}>
              <Feather name="camera" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.imagePickerText, { color: colors.mutedForeground }]}>صورة المتجر (اختياري)</Text>
          </View>
        )}
        {uploading ? (
          <View style={styles.uploadOverlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        ) : null}
      </Pressable>

      <Field label="اسم المتجر" value={name} onChangeText={setName} placeholder="مثال: بقالية النور" colors={colors} />

      {(storeTypes.data?.length ?? 0) > 0 ? (
        <View style={{ marginBottom: 14, zIndex: 10 }}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>نوع المتجر</Text>
          {/* Dropdown (expandable) instead of fixed chips — scales to many types. */}
          <Pressable
            onPress={() => setTypeMenuOpen((v) => !v)}
            style={[
              styles.dropdownHeader,
              {
                backgroundColor: colors.card,
                borderColor: typeMenuOpen ? colors.primary : colors.border,
              },
            ]}
          >
            <Feather
              name={typeMenuOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.mutedForeground}
            />
            <Text
              style={[
                styles.dropdownHeaderText,
                { color: storeType ? colors.foreground : colors.mutedForeground },
              ]}
              numberOfLines={1}
            >
              {storeType || 'اختر نوع المتجر'}
            </Text>
          </Pressable>
          {typeMenuOpen ? (
            <View style={[styles.dropdownList, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ScrollView
                style={{ maxHeight: 240 }}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
              >
                {storeTypes.data!.map((t) => {
                  const selected = storeType === t.name;
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => {
                        setStoreType(t.name);
                        setTypeMenuOpen(false);
                      }}
                      style={[
                        styles.dropdownItem,
                        { backgroundColor: selected ? colors.primary + '15' : 'transparent', borderBottomColor: colors.border },
                      ]}
                    >
                      {selected ? (
                        <Feather name="check" size={16} color={colors.primary} />
                      ) : (
                        <View style={{ width: 16 }} />
                      )}
                      <Text
                        style={[
                          styles.dropdownItemText,
                          { color: selected ? colors.primary : colors.foreground },
                        ]}
                      >
                        {t.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}
          <Text style={[styles.chipHint, { color: colors.mutedForeground }]}>
            اختر النوع الذي يطابق متجرك حتى يظهر ضمن القسم الصحيح للزبائن
          </Text>
        </View>
      ) : (
        <Field label="نوع المتجر" value={storeType} onChangeText={setStoreType} placeholder="مثال: بقالة، لحوم، مخبز، خضار" colors={colors} />
      )}

      <Field label="العنوان" value={address} onChangeText={setAddress} placeholder="المدينة والمنطقة" colors={colors} />

      <View style={{ marginBottom: 14 }}>
        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>موقع المتجر على الخارطة (اختياري)</Text>
        <Pressable
          onPress={() => setPickerVisible(true)}
          style={[
            styles.locationBtn,
            { backgroundColor: coords ? colors.primary + '18' : colors.card, borderColor: colors.border },
          ]}
        >
          <Feather name="map-pin" size={16} color={coords ? colors.primary : colors.mutedForeground} />
          <Text style={[styles.locationBtnText, { color: coords ? colors.primary : colors.mutedForeground }]}>
            {coords ? 'تم تحديد موقع المتجر' : 'حدد موقع المتجر على الخارطة'}
          </Text>
        </Pressable>
        <Text style={[styles.chipHint, { color: colors.mutedForeground }]}>
          يُستخدم هذا الموقع لإرسال رابط خارطة للزبون مع تفاصيل طلبه حتى يوصل التوصيل بسهولة
        </Text>
      </View>

      <Field
        label="تفاصيل إضافية (اختياري)"
        value={description}
        onChangeText={setDescription}
        placeholder="وصف قصير عن المتجر ومنتجاته"
        colors={colors}
        multiline
      />

      <View style={{ marginBottom: 14 }}>
        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>مدة الاشتراك المطلوبة</Text>
        <View style={styles.planRow}>
          {SUBSCRIPTION_PLANS.map((plan) => {
            const selected = subscriptionMonths === plan.months;
            return (
              <Pressable
                key={plan.months}
                onPress={() => setSubscriptionMonths(plan.months)}
                style={[
                  styles.planChip,
                  {
                    backgroundColor: selected ? colors.primary : colors.card,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.planChipLabel, { color: selected ? colors.primaryForeground : colors.foreground }]}>
                  {plan.label}
                </Text>
                <Text
                  style={[
                    styles.planChipPrice,
                    { color: selected ? colors.primaryForeground : colors.mutedForeground },
                  ]}
                >
                  {plan.price}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={[styles.chipHint, { color: colors.mutedForeground }]}>
          هذا طلب فقط — الإدارة تراجع طلبك وتفعّل الاشتراك بعد التواصل معك واستلام الدفعة
        </Text>
      </View>

      <Pressable
        onPress={() => handleSubmit(true)}
        disabled={!canSubmit || createStore.isPending}
        style={({ pressed }) => [
          styles.trialBtn,
          { backgroundColor: colors.primary, borderColor: colors.primary, opacity: !canSubmit || createStore.isPending ? 0.5 : pressed ? 0.85 : 1 },
        ]}
      >
        {createStore.isPending ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <>
            <Feather name="gift" size={18} color={colors.primaryForeground} />
            <Text style={[styles.submitText, { color: colors.primaryForeground }]}>اطلب تجربة مجانية ١٠ أيام</Text>
          </>
        )}
      </Pressable>
      <Text style={[styles.chipHint, { color: colors.mutedForeground, textAlign: 'center', marginTop: 6 }]}>
        بعد موافقة الإدارة يتفعّل متجرك ١٠ أيام مجاناً — بعدها راسل الإدارة لإكمال الاشتراك.
      </Text>

      <Pressable
        onPress={() => handleSubmit(false)}
        disabled={!canSubmit || createStore.isPending}
        style={({ pressed }) => [
          styles.submitBtn,
          { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, opacity: !canSubmit || createStore.isPending ? 0.5 : pressed ? 0.85 : 1 },
        ]}
      >
        <Feather name="send" size={16} color={colors.foreground} />
        <Text style={[styles.submitText, { color: colors.foreground }]}>إرسال طلب اشتراك مدفوع</Text>
      </Pressable>

      <LocationPicker
        visible={pickerVisible}
        initial={coords}
        title="حدد موقع المتجر"
        onConfirm={(picked) => {
          setCoords(picked);
          setPickerVisible(false);
        }}
        onClose={() => setPickerVisible(false)}
      />
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
  container: { flex: 1 },
  hero: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    marginBottom: 22,
  },
  heroText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'right',
  },
  successCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    marginBottom: 22,
  },
  successHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  successTitle: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 15,
    textAlign: 'right',
  },
  successText: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    lineHeight: 20,
    textAlign: 'right',
  },
  waBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 14,
  },
  waBtnText: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: '#fff',
  },
  successDismiss: {
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  sectionLabel: {
    fontFamily: fonts.bold,
    fontSize: 15,
    textAlign: 'right',
    marginBottom: 12,
  },
  storeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
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
  storeName: {
    fontFamily: fonts.bold,
    fontSize: 14,
    textAlign: 'right',
  },
  storeMeta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    textAlign: 'right',
  },
  fieldLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    textAlign: 'right',
    marginBottom: 6,
  },
  chipsWrap: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  dropdownHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  dropdownHeaderText: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 14,
    textAlign: 'right',
    marginRight: 10,
  },
  dropdownList: {
    marginTop: 6,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dropdownItemText: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 14,
    textAlign: 'right',
  },
  chipHint: {
    fontFamily: fonts.regular,
    fontSize: 11,
    textAlign: 'right',
    marginTop: 8,
    lineHeight: 17,
  },
  locationBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
  },
  locationBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  imagePicker: {
    height: 140,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  previewImg: {
    width: '100%',
    height: '100%',
  },
  imagePickerPlaceholder: {
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerText: {
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planRow: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  planChip: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  planChipLabel: {
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  planChipPrice: {
    fontFamily: fonts.medium,
    fontSize: 11,
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
  trialBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
  },
  submitBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
    marginTop: 12,
  },
  submitText: {
    fontFamily: fonts.bold,
    fontSize: 15,
  },
});
