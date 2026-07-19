import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Alert } from '@/lib/alert';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import {
  useListAllStores,
  useReviewStore,
  useUpdateStore,
  useDeleteStore,
  useRequestUploadUrl,
  type Store,
} from '@workspace/api-client-react';
import { useAdminRequest } from '@/hooks/useAdminRequest';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { resolveImageUrl } from '@/lib/image-url';
import { pickImageWithChoice, uploadPickedImage } from '@/lib/upload';
import { EmptyState } from '@/components/EmptyState';

const STATUS_PENDING = 'قيد المراجعة';
const STATUS_ACTIVE = 'مفعّل';
const STATUS_SUSPENDED = 'موقوف مؤقتاً';
const STATUS_REJECTED = 'مرفوض';

const SECTION_ORDER: { status: string; title: string }[] = [
  { status: STATUS_PENDING, title: 'بانتظار المراجعة' },
  { status: STATUS_ACTIVE, title: 'المتاجر المفعّلة' },
  { status: STATUS_SUSPENDED, title: 'موقوفة مؤقتاً' },
  { status: STATUS_REJECTED, title: 'مرفوضة' },
];

export function StoresTab() {
  const colors = useColors();
  const adminRequest = useAdminRequest();
  const query = useListAllStores({ request: adminRequest });
  const reviewStore = useReviewStore({ request: adminRequest });
  const updateStore = useUpdateStore({ request: adminRequest });
  const deleteStore = useDeleteStore({ request: adminRequest });
  const requestUploadUrl = useRequestUploadUrl();

  const [editStoreId, setEditStoreId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editStoreType, setEditStoreType] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editImagePath, setEditImagePath] = useState<string | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editUploading, setEditUploading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  const statusColor = (status: string) =>
    status === STATUS_ACTIVE
      ? colors.primary
      : status === STATUS_REJECTED
        ? colors.destructive
        : status === STATUS_SUSPENDED
          ? colors.warning ?? colors.accent
          : colors.accent;

  const doReview = async (
    id: number,
    action: 'approve' | 'reject' | 'suspend' | 'reactivate',
    months?: number,
    subscriptionMode?: 'extend' | 'set',
  ) => {
    try {
      await reviewStore.mutateAsync({
        id,
        data: { action, subscriptionMonths: months, subscriptionMode } as any,
      });
      query.refetch();
    } catch (err: any) {
      Alert.alert('خطأ', err?.data?.error ?? 'تعذر تنفيذ العملية');
    }
  };

  // "extend" stacks months on top of the current expiry (ordinary renew).
  // "set" replaces the expiry with exactly N months from today — so a misclick
  // that added 12 months can be corrected back down to 3.
  const pickSubscription = (
    store: Store,
    title: string,
    mode: 'extend' | 'set',
  ) => {
    const modeHint =
      mode === 'extend'
        ? 'المدة راح تنضاف على تاريخ الانتهاء الحالي'
        : 'المدة راح تصير من اليوم (تصحيح / تقليل الاشتراك)';
    // The merchant's requested plan (chosen at registration) is shown first
    // and labeled, so the admin doesn't have to guess/ask what they signed up
    // for — it's still just a suggestion; the admin can pick any duration.
    const requested = store.requestedSubscriptionMonths;
    const planLabel = (months: number) =>
      months === requested ? `${months === 3 ? '٣' : months === 6 ? '٦' : '١٢'} أشهر (طلب التاجر)` : `${months === 3 ? '٣' : months === 6 ? '٦' : '١٢'} أشهر`;
    const months = requested === 6 || requested === 12 ? [requested, ...[3, 6, 12].filter((m) => m !== requested)] : [3, 6, 12];
    Alert.alert(title, `${modeHint}\n(١٠٠ ألف دينار لكل ٣ أشهر)`, [
      ...months.map((m) => ({
        text: planLabel(m),
        onPress: () => doReview(store.id, 'approve', m, mode),
      })),
      { text: 'إلغاء', style: 'cancel' as const },
    ]);
  };

  const approve = (store: Store, renew: boolean) => {
    // Renewals still let the admin pick a duration. But for the FIRST
    // activation the merchant already chose their plan at registration, so we
    // don't show the subscription-type picker — just confirm and activate with
    // the requested plan (falls back to 3 months if none was requested).
    if (renew) {
      pickSubscription(store, 'تجديد الاشتراك', 'extend');
      return;
    }
    const months = store.requestedSubscriptionMonths ?? 3;
    const monthsLabel = months === 3 ? '٣' : months === 6 ? '٦' : months === 12 ? '١٢' : String(months);
    Alert.alert(
      'تفعيل المتجر',
      `تفعيل متجر "${store.name}" باشتراك ${monthsLabel} أشهر (حسب طلب التاجر).`,
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'تفعيل', onPress: () => doReview(store.id, 'approve', months, 'extend') },
      ],
    );
  };

  const correctSubscription = (store: Store) => {
    pickSubscription(store, 'تصحيح / تقليل الاشتراك', 'set');
  };

  const reject = (store: Store) => {
    Alert.alert('رفض المتجر', `هل تريد رفض متجر "${store.name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'رفض', style: 'destructive', onPress: () => doReview(store.id, 'reject') },
    ]);
  };

  const suspend = (store: Store) => {
    Alert.alert('إيقاف مؤقت', `هل تريد إيقاف متجر "${store.name}" مؤقتاً؟ راح يختفي عن الزبائن.`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'إيقاف', style: 'destructive', onPress: () => doReview(store.id, 'suspend') },
    ]);
  };

  const reactivate = (store: Store) => {
    doReview(store.id, 'reactivate');
  };

  const confirmDelete = (store: Store) => {
    // Two-step confirm so a single accidental tap (or mis-click on web confirm)
    // can't wipe a store and all its products.
    Alert.alert(
      'حذف المتجر',
      `هل تريد حذف متجر "${store.name}" نهائياً؟\nراح تنحذف كل منتجاته وما يمكن التراجع.`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'متابعة الحذف',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'تأكيد نهائي',
              `اضغط "حذف نهائي" فقط إذا متأكد من حذف "${store.name}".`,
              [
                { text: 'إلغاء', style: 'cancel' },
                {
                  text: 'حذف نهائي',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteStore.mutateAsync({ id: store.id });
                      query.refetch();
                    } catch (err: any) {
                      Alert.alert('خطأ', err?.data?.error ?? 'تعذر تنفيذ العملية');
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  const startEdit = (store: Store) => {
    setEditStoreId(store.id);
    setEditName(store.name);
    setEditStoreType(store.storeType);
    setEditAddress(store.address);
    setEditDescription(store.description ?? '');
    setEditImagePath(null);
    setEditImagePreview(null);
  };

  const handleEditPickImage = async () => {
    const picked = await pickImageWithChoice();
    if (!picked) return;
    setEditImagePreview(picked.uri);
    setEditUploading(true);
    try {
      const path = await uploadPickedImage(picked, (args) => requestUploadUrl.mutateAsync(args));
      setEditImagePath(path);
    } catch {
      Alert.alert('خطأ', 'تعذر رفع الصورة');
    } finally {
      setEditUploading(false);
    }
  };

  const handleSaveEdit = async (store: Store) => {
    if (!editName.trim() || !editStoreType.trim() || !editAddress.trim()) {
      Alert.alert('تنبيه', 'يرجى تعبئة الاسم ونوع المتجر والعنوان');
      return;
    }
    const data: Record<string, unknown> = {
      name: editName.trim(),
      storeType: editStoreType.trim(),
      address: editAddress.trim(),
      description: editDescription.trim() || null,
    };
    if (editImagePath) data.imageUrl = editImagePath;
    setEditSaving(true);
    try {
      await updateStore.mutateAsync({ id: store.id, data: data as any });
      setEditStoreId(null);
      query.refetch();
    } catch (err: any) {
      Alert.alert('خطأ', err?.data?.error ?? 'تعذر تنفيذ العملية');
    } finally {
      setEditSaving(false);
    }
  };

  if (query.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const stores = query.data ?? [];
  const sections = SECTION_ORDER.map((s) => ({
    title: s.title,
    status: s.status,
    data: stores.filter((st) => st.status === s.status),
  })).filter((s) => s.data.length > 0);

  if (sections.length === 0) {
    return (
      <View style={{ marginTop: 40 }}>
        <EmptyState icon="shopping-bag" title="لا توجد متاجر بعد" />
      </View>
    );
  }

  const renderActionBtn = (
    label: string,
    icon: React.ComponentProps<typeof Feather>['name'],
    onPress: () => void,
    variant: 'solid' | 'soft' | 'destructive',
    color: string,
  ) => {
    const bg =
      variant === 'solid'
        ? color
        : variant === 'destructive'
          ? colors.destructive + '15'
          : color + '15';
    const fg =
      variant === 'solid'
        ? colors.primaryForeground
        : variant === 'destructive'
          ? colors.destructive
          : color;
    return (
      <Pressable onPress={onPress} style={[styles.actionBtn, { backgroundColor: bg }]}>
        <Feather name={icon} size={14} color={fg} />
        <Text style={[styles.actionText, { color: fg }]}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.listContent}
      stickySectionHeadersEnabled={false}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      SectionSeparatorComponent={() => <View style={{ height: 4 }} />}
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <View style={[styles.countPill, { backgroundColor: colors.muted }]}>
            <Text style={[styles.countText, { color: colors.mutedForeground }]}>
              {section.data.length}
            </Text>
          </View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{section.title}</Text>
        </View>
      )}
      renderItem={({ item }) => {
        const sc = statusColor(item.status);
        const isPending = item.status === STATUS_PENDING;
        const isActive = item.status === STATUS_ACTIVE;
        const isSuspended = item.status === STATUS_SUSPENDED;
        const isRejected = item.status === STATUS_REJECTED;
        const isEditing = editStoreId === item.id;
        return (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.topRow}>
              <View style={[styles.statusPill, { backgroundColor: sc + '20' }]}>
                <Text style={[styles.statusText, { color: sc }]}>{item.status}</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end', gap: 3 }}>
                <Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text>
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>{item.storeType}</Text>
              </View>
              <View style={styles.thumbBox}>
                {item.imageUrl ? (
                  <Image
                    source={{ uri: resolveImageUrl(item.imageUrl) }}
                    style={styles.thumbImg}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.thumbPlaceholder, { backgroundColor: colors.muted }]}>
                    <Feather name="shopping-bag" size={18} color={colors.mutedForeground} />
                  </View>
                )}
              </View>
            </View>

            <View style={styles.detailRow}>
              <Text style={[styles.detail, { color: colors.mutedForeground }]}>{item.address}</Text>
              <Feather name="map-pin" size={13} color={colors.mutedForeground} />
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detail, { color: colors.mutedForeground }]}>{item.ownerPhone}</Text>
              <Feather name="phone" size={13} color={colors.mutedForeground} />
            </View>
            {item.description ? (
              <Text style={[styles.desc, { color: colors.mutedForeground }]}>{item.description}</Text>
            ) : null}
            {isPending && item.requestedSubscriptionMonths ? (
              <View style={[styles.requestedPlanBox, { backgroundColor: colors.accent + '15' }]}>
                <Feather name="tag" size={13} color={colors.accent} />
                <Text style={[styles.requestedPlanText, { color: colors.accent }]}>
                  التاجر طلب اشتراك {item.requestedSubscriptionMonths} أشهر
                </Text>
              </View>
            ) : null}
            {isActive && item.subscriptionExpiresAt ? (
              <View style={styles.detailRow}>
                <Text style={[styles.detail, { color: colors.primary }]}>
                  ينتهي الاشتراك: {String(item.subscriptionExpiresAt).slice(0, 10)}
                </Text>
                <Feather name="calendar" size={13} color={colors.primary} />
              </View>
            ) : null}

            <View style={styles.actions}>
              {isPending ? (
                <>
                  {renderActionBtn('تفعيل', 'check', () => approve(item, false), 'solid', colors.primary)}
                  {renderActionBtn('رفض', 'x', () => reject(item), 'destructive', colors.destructive)}
                </>
              ) : null}
              {isActive ? (
                <>
                  {renderActionBtn('تجديد الاشتراك', 'refresh-cw', () => approve(item, true), 'soft', colors.primary)}
                  {renderActionBtn('تصحيح الاشتراك', 'calendar', () => correctSubscription(item), 'soft', colors.accent)}
                  {renderActionBtn('إيقاف مؤقت', 'pause', () => suspend(item), 'soft', colors.warning ?? colors.accent)}
                  {renderActionBtn('تعديل', 'edit-2', () => (isEditing ? setEditStoreId(null) : startEdit(item)), 'soft', colors.foreground)}
                  {renderActionBtn('حذف', 'trash-2', () => confirmDelete(item), 'destructive', colors.destructive)}
                </>
              ) : null}
              {isSuspended ? (
                <>
                  {renderActionBtn('إعادة تفعيل', 'play', () => reactivate(item), 'solid', colors.primary)}
                  {renderActionBtn('تعديل', 'edit-2', () => (isEditing ? setEditStoreId(null) : startEdit(item)), 'soft', colors.foreground)}
                  {renderActionBtn('حذف', 'trash-2', () => confirmDelete(item), 'destructive', colors.destructive)}
                </>
              ) : null}
              {isRejected ? (
                <>
                  {renderActionBtn('تفعيل', 'check', () => approve(item, false), 'solid', colors.primary)}
                  {renderActionBtn('حذف', 'trash-2', () => confirmDelete(item), 'destructive', colors.destructive)}
                </>
              ) : null}
            </View>

            {isEditing ? (
              <View style={[styles.editBox, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '25' }]}>
                <View style={styles.editHeader}>
                  <Feather name="edit-2" size={14} color={colors.primary} />
                  <Text style={[styles.editTitle, { color: colors.primary }]}>تعديل المتجر</Text>
                </View>

                <View style={styles.editImageRow}>
                  <Pressable
                    onPress={handleEditPickImage}
                    style={[styles.editThumb, { backgroundColor: colors.muted, borderColor: colors.border }]}
                  >
                    {editImagePreview || item.imageUrl ? (
                      <Image
                        source={{ uri: editImagePreview ?? resolveImageUrl(item.imageUrl) }}
                        style={styles.editThumbImg}
                        contentFit="cover"
                      />
                    ) : (
                      <Feather name="camera" size={20} color={colors.mutedForeground} />
                    )}
                    {editUploading ? (
                      <View style={styles.uploadOverlay}>
                        <ActivityIndicator size="small" color="#fff" />
                      </View>
                    ) : (
                      <View style={[styles.editThumbBadge, { backgroundColor: colors.primary }]}>
                        <Feather name="camera" size={10} color={colors.primaryForeground} />
                      </View>
                    )}
                  </Pressable>
                  <TextInput
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="اسم المتجر"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.editInput, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border, flex: 1 }]}
                    textAlign="right"
                  />
                </View>

                <TextInput
                  value={editStoreType}
                  onChangeText={setEditStoreType}
                  placeholder="نوع المتجر (مثال: خضار وفواكه)"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.editInput, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
                  textAlign="right"
                />
                <TextInput
                  value={editAddress}
                  onChangeText={setEditAddress}
                  placeholder="العنوان"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.editInput, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
                  textAlign="right"
                />
                <TextInput
                  value={editDescription}
                  onChangeText={setEditDescription}
                  placeholder="وصف المتجر (اختياري)"
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  style={[styles.editInput, styles.editTextArea, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
                  textAlign="right"
                />

                <View style={styles.editActionsRow}>
                  <Pressable
                    onPress={() => handleSaveEdit(item)}
                    disabled={editSaving || editUploading}
                    style={[styles.applyBtn, { backgroundColor: colors.primary, flex: 1, opacity: editSaving || editUploading ? 0.7 : 1 }]}
                  >
                    {editSaving ? (
                      <ActivityIndicator size="small" color={colors.primaryForeground} />
                    ) : (
                      <Text style={[styles.applyBtnText, { color: colors.primaryForeground }]}>حفظ التعديلات</Text>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={() => setEditStoreId(null)}
                    style={[styles.applyBtn, { backgroundColor: colors.muted }]}
                  >
                    <Text style={[styles.applyBtnText, { color: colors.foreground }]}>إلغاء</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 20, paddingBottom: 60 },
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    textAlign: 'right',
  },
  countPill: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  thumbBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
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
  name: {
    fontFamily: fonts.bold,
    fontSize: 16,
    textAlign: 'right',
  },
  meta: {
    fontFamily: fonts.medium,
    fontSize: 12,
    textAlign: 'right',
  },
  detailRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  detail: {
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: 'right',
  },
  desc: {
    fontFamily: fonts.regular,
    fontSize: 12,
    textAlign: 'right',
    lineHeight: 19,
  },
  requestedPlanBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-end',
  },
  requestedPlanText: {
    fontFamily: fonts.semibold,
    fontSize: 11.5,
  },
  actions: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  actionBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  actionText: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  editBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginTop: 8,
  },
  editHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  editTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  editImageRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  editThumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editThumbImg: {
    width: '100%',
    height: '100%',
  },
  editThumbBadge: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editInput: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  editTextArea: {
    minHeight: 66,
    textAlignVertical: 'top',
  },
  editActionsRow: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  applyBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  applyBtnText: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
});
