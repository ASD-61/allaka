import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Alert } from '@/lib/alert';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import {
  useListStoreRefunds,
  useDecideStoreRefund,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { formatIQD } from '@/lib/format';
import { resolveImageUrl } from '@/lib/image-url';
import { EmptyState } from '@/components/EmptyState';
import { ImageViewerModal } from '@/components/ImageViewerModal';

const PENDING = 'قيد المراجعة';
const APPROVED = 'تمت الموافقة';

// Compensation requests for THIS store's orders only. The owner reviews the
// customer's photo and either approves a wallet credit (full item price by
// default, or a custom amount) or rejects the claim.
export function MerchantRefunds({ storeId }: { storeId: number }) {
  const colors = useColors();
  const query = useListStoreRefunds(storeId);
  const decide = useDecideStoreRefund();
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  const statusColor = (status: string) =>
    status === APPROVED
      ? colors.primary
      : status === PENDING
        ? colors.accent
        : colors.destructive;

  const run = async (
    refundId: number,
    action: 'approve' | 'reject',
    amount?: number,
    reason?: string,
  ) => {
    setBusyId(refundId);
    try {
      await decide.mutateAsync({
        id: storeId,
        refundId,
        data: {
          action,
          ...(amount != null ? { amount } : {}),
          ...(reason ? { reason } : {}),
        } as any,
      });
      setRejectingId(null);
      query.refetch();
    } catch (err: any) {
      Alert.alert('خطأ', err?.data?.error ?? 'تعذر تنفيذ العملية');
    } finally {
      setBusyId(null);
    }
  };

  const confirmApprove = (refundId: number) => {
    const raw = amounts[refundId]?.trim();
    const parsed = raw ? parseInt(raw, 10) : undefined;
    if (raw && (Number.isNaN(parsed) || (parsed ?? 0) < 1)) {
      Alert.alert('تنبيه', 'أدخل مبلغ تعويض صحيح أو اتركه فارغاً للتعويض الكامل');
      return;
    }
    Alert.alert(
      'الموافقة على التعويض',
      parsed
        ? `راح ينضاف ${formatIQD(parsed)} لمحفظة الزبون`
        : 'راح ينضاف سعر المنتج كامل لمحفظة الزبون',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'موافقة', onPress: () => run(refundId, 'approve', parsed) },
      ],
    );
  };

  const confirmReject = (refundId: number) => {
    if (rejectingId !== refundId) {
      setRejectingId(refundId);
      return;
    }
    run(refundId, 'reject', undefined, reasons[refundId]?.trim() || undefined);
  };

  if (query.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <>
    <FlatList
      data={query.data ?? []}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.listContent}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      ListHeaderComponent={
        <Text style={[styles.title, { color: colors.foreground }]}>طلبات التعويض</Text>
      }
      ListEmptyComponent={
        <View style={{ marginTop: 40 }}>
          <EmptyState icon="rotate-ccw" title="لا توجد طلبات تعويض" />
        </View>
      }
      renderItem={({ item }) => {
        const sc = statusColor(item.status);
        const isPending = item.status === PENDING;
        const photos = ((item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls : [item.imageUrl]) as string[])
          .filter(Boolean)
          .map((u) => resolveImageUrl(u));
        const busy = busyId === item.id;
        const isRejecting = rejectingId === item.id;
        return (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.topRow}>
              <View style={[styles.statusPill, { backgroundColor: sc + '20' }]}>
                <Text style={[styles.statusText, { color: sc }]}>{item.status}</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end', gap: 3 }}>
                <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                  {item.productName}
                </Text>
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                  {item.customerName || item.customerPhone} · طلب #{item.orderId}
                </Text>
              </View>
              <Pressable
                onPress={() => photos[0] && setViewerUri(photos[0])}
                style={[styles.thumb, { backgroundColor: colors.muted }]}
              >
                {photos[0] ? (
                  <Image source={{ uri: photos[0] }} style={styles.thumbImg} contentFit="cover" />
                ) : (
                  <Feather name="image" size={20} color={colors.mutedForeground} />
                )}
              </Pressable>
            </View>

            {photos.length > 1 ? (
              <View style={styles.photoRow}>
                {photos.map((uri, idx) => (
                  <Pressable key={uri + idx} onPress={() => setViewerUri(uri)}>
                    <Image source={{ uri }} style={styles.photoThumb} contentFit="cover" />
                  </Pressable>
                ))}
              </View>
            ) : null}

            {item.note ? (
              <View style={[styles.noteBox, { backgroundColor: colors.background }]}>
                <Text style={[styles.noteText, { color: colors.foreground }]}>📝 {item.note}</Text>
              </View>
            ) : null}

            {!isPending && item.amount > 0 ? (
              <Text style={[styles.creditLine, { color: colors.primary }]}>
                تم تعويض {formatIQD(item.amount)}
              </Text>
            ) : null}

            {!isPending && item.status !== APPROVED && item.rejectReason ? (
              <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                سبب الرفض: {item.rejectReason}
              </Text>
            ) : null}

            {isPending ? (
              <>
                {isRejecting ? (
                  <TextInput
                    value={reasons[item.id] ?? ''}
                    onChangeText={(t) => setReasons((p) => ({ ...p, [item.id]: t }))}
                    placeholder="سبب الرفض (يظهر للزبون)"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.amountInput, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                    textAlign="right"
                  />
                ) : (
                  <View style={styles.amountRow}>
                    <TextInput
                      value={amounts[item.id] ?? ''}
                      onChangeText={(t) => setAmounts((p) => ({ ...p, [item.id]: t.replace(/[^0-9]/g, '') }))}
                      placeholder="مبلغ التعويض (اختياري - فارغ = كامل)"
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="number-pad"
                      style={[styles.amountInput, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                      textAlign="right"
                    />
                  </View>
                )}
                <View style={styles.actions}>
                  {isRejecting ? null : (
                    <Pressable
                      onPress={() => confirmApprove(item.id)}
                      disabled={busy}
                      style={[styles.actionBtn, { backgroundColor: colors.primary, flex: 1, opacity: busy ? 0.6 : 1 }]}
                    >
                      {busy ? (
                        <ActivityIndicator size="small" color={colors.primaryForeground} />
                      ) : (
                        <>
                          <Feather name="check" size={15} color={colors.primaryForeground} />
                          <Text style={[styles.actionText, { color: colors.primaryForeground }]}>موافقة</Text>
                        </>
                      )}
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => confirmReject(item.id)}
                    disabled={busy}
                    style={[styles.actionBtn, { backgroundColor: isRejecting ? colors.destructive : colors.destructive + '15', flex: isRejecting ? 1 : undefined }]}
                  >
                    <Feather name="x" size={15} color={isRejecting ? '#fff' : colors.destructive} />
                    <Text style={[styles.actionText, { color: isRejecting ? '#fff' : colors.destructive }]}>
                      {isRejecting ? 'تأكيد الرفض' : 'رفض'}
                    </Text>
                  </Pressable>
                  {isRejecting ? (
                    <Pressable
                      onPress={() => setRejectingId(null)}
                      disabled={busy}
                      style={[styles.actionBtn, { backgroundColor: colors.muted }]}
                    >
                      <Text style={[styles.actionText, { color: colors.foreground }]}>إلغاء</Text>
                    </Pressable>
                  ) : null}
                </View>
              </>
            ) : null}
          </View>
        );
      }}
    />
    <ImageViewerModal uri={viewerUri} visible={viewerUri != null} onClose={() => setViewerUri(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 20, paddingBottom: 60 },
  title: {
    fontFamily: fonts.bold,
    fontSize: 18,
    textAlign: 'right',
    marginBottom: 16,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  photoRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoThumb: {
    width: 54,
    height: 54,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
  },
  noteBox: {
    borderRadius: 12,
    padding: 10,
  },
  noteText: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    textAlign: 'right',
    lineHeight: 19,
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
    fontSize: 15,
    textAlign: 'right',
  },
  meta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    textAlign: 'right',
  },
  creditLine: {
    fontFamily: fonts.bold,
    fontSize: 13,
    textAlign: 'right',
  },
  amountRow: {
    flexDirection: 'row-reverse',
  },
  amountInput: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
  },
  actionText: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
});
