import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TextInput,
  Pressable,
} from 'react-native';
import { Alert } from '@/lib/alert';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import {
  useListRefunds,
  useListCustomers,
  useListOrders,
  useUpdateRefund,
} from '@workspace/api-client-react';
import { useAdminRequest } from '@/hooks/useAdminRequest';
import { useAdminStoreIds, isAdminOwned } from '@/hooks/useAdminStoreIds';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { formatIQD, formatDate } from '@/lib/format';
import { resolveImageUrl } from '@/lib/image-url';
import { EmptyState } from '@/components/EmptyState';
import { ImageViewerModal } from '@/components/ImageViewerModal';

const PENDING = 'قيد المراجعة';
const APPROVED = 'تمت الموافقة';

type Refund = {
  id: number;
  orderId: number;
  customerPhone: string;
  productName: string;
  imageUrl: string;
  amount: number;
  status: string;
  createdAt: string;
};

function statusColor(status: string, colors: ReturnType<typeof useColors>): string {
  if (status === APPROVED) return colors.success;
  if (status === PENDING) return colors.warning;
  return colors.destructive;
}

function RefundCard({
  item,
  itemTotal,
  customerName,
  busy,
  onDecide,
}: {
  item: Refund;
  itemTotal: number;
  customerName: string | undefined;
  busy: boolean;
  onDecide: (action: 'approve' | 'reject', amount: number) => void;
}) {
  const colors = useColors();
  const [amountText, setAmountText] = useState(itemTotal > 0 ? String(itemTotal) : '');
  const [viewerOpen, setViewerOpen] = useState(false);
  const isPending = item.status === PENDING;
  const photoUri = resolveImageUrl(item.imageUrl);

  const handleApprove = () => {
    const parsed = parseInt(amountText, 10);
    const amount = Number.isFinite(parsed) && parsed > 0 ? parsed : itemTotal;
    if (!amount || amount <= 0) {
      Alert.alert('تنبيه', 'حدد مبلغ التعويض أولاً.');
      return;
    }
    onDecide('approve', amount);
  };

  const handleReject = () => {
    Alert.alert('رفض الطلب', 'متأكد من رفض طلب التعويض هذا؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'رفض', style: 'destructive', onPress: () => onDecide('reject', 0) },
    ]);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.headRow}>
        <Pressable onPress={() => setViewerOpen(true)}>
          <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" />
          <View style={styles.photoExpand}>
            <Feather name="maximize-2" size={12} color="#fff" />
          </View>
        </Pressable>
        <View style={styles.body}>
          <View style={styles.topRow}>
            <Text style={[styles.productName, { color: colors.foreground }]} numberOfLines={1}>
              {item.productName}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status, colors) + '18' }]}>
              <Text style={[styles.statusText, { color: statusColor(item.status, colors) }]}>{item.status}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Feather name="user" size={13} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {customerName ? `${customerName} · ${item.customerPhone}` : item.customerPhone}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Feather name="shopping-bag" size={13} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              طلب #{item.orderId} · {formatDate(item.createdAt)}
            </Text>
          </View>

          {itemTotal > 0 ? (
            <View style={styles.metaRow}>
              <Feather name="tag" size={13} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                سعر السلعة بالطلب: {formatIQD(itemTotal)}
              </Text>
            </View>
          ) : null}

          {!isPending ? (
            <View style={styles.metaRow}>
              <Feather name="credit-card" size={13} color={statusColor(item.status, colors)} />
              <Text style={[styles.metaText, { color: statusColor(item.status, colors) }]}>
                {item.status === APPROVED ? `تم تعويض ${formatIQD(item.amount)}` : 'مرفوض'}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {isPending ? (
        <View style={styles.actions}>
          <View style={[styles.amountInputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Text style={[styles.amountSuffix, { color: colors.mutedForeground }]}>د.ع</Text>
            <TextInput
              value={amountText}
              onChangeText={setAmountText}
              keyboardType="number-pad"
              placeholder="مبلغ التعويض"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.amountInput, { color: colors.foreground }]}
              editable={!busy}
            />
          </View>
          <Pressable
            onPress={handleApprove}
            disabled={busy}
            style={[styles.actionBtn, { backgroundColor: colors.success, opacity: busy ? 0.6 : 1 }]}
          >
            <Feather name="check" size={15} color="#fff" />
            <Text style={styles.actionText}>موافقة</Text>
          </Pressable>
          <Pressable
            onPress={handleReject}
            disabled={busy}
            style={[styles.actionBtn, { backgroundColor: colors.destructive, opacity: busy ? 0.6 : 1 }]}
          >
            <Feather name="x" size={15} color="#fff" />
            <Text style={styles.actionText}>رفض</Text>
          </Pressable>
        </View>
      ) : null}

      <ImageViewerModal uri={photoUri} visible={viewerOpen} onClose={() => setViewerOpen(false)} />
    </View>
  );
}

export function RefundsTab() {
  const colors = useColors();
  const adminRequest = useAdminRequest();
  const query = useListRefunds({ request: adminRequest });
  const customersQuery = useListCustomers({ request: adminRequest });
  const ordersQuery = useListOrders(undefined, { request: adminRequest });
  const updateRefund = useUpdateRefund({ request: adminRequest });
  const adminStoreIds = useAdminStoreIds();

  const [decidingId, setDecidingId] = useState<number | null>(null);

  const nameByPhone = useMemo(
    () => new Map((customersQuery.data ?? []).map((c) => [c.phone, c.name])),
    [customersQuery.data],
  );

  const orderById = useMemo(
    () => new Map((ordersQuery.data ?? []).map((o) => [o.id, o])),
    [ordersQuery.data],
  );

  // Only compensation requests for the admin's own store orders.
  const adminRefunds = useMemo(
    () =>
      ((query.data ?? []) as Refund[]).filter((r) =>
        isAdminOwned(orderById.get(r.orderId)?.storeId, adminStoreIds),
      ),
    [query.data, orderById, adminStoreIds],
  );

  const itemTotalFor = (refund: Refund): number => {
    const order = orderById.get(refund.orderId);
    const line = order?.items?.find((i) => i.name === refund.productName);
    return line ? Math.max(0, line.price) * Math.max(0, line.qty) : 0;
  };

  const decide = (id: number, action: 'approve' | 'reject', amount: number) => {
    setDecidingId(id);
    updateRefund.mutate(
      { id, data: action === 'approve' ? { action, amount } : { action } },
      {
        onSuccess: () => {
          query.refetch();
          customersQuery.refetch();
        },
        onError: (err: any) => {
          Alert.alert('تعذر التحديث', err?.data?.error || 'حدث خطأ، حاول مرة ثانية');
        },
        onSettled: () => setDecidingId(null),
      },
    );
  };

  return (
    <FlatList
      data={adminRefunds}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.listContent}
      onRefresh={() => query.refetch()}
      refreshing={query.isFetching}
      ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
      ListEmptyComponent={
        query.isLoading ? (
          <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 60 }} />
        ) : (
          <View style={{ marginTop: 40 }}>
            <EmptyState icon="rotate-ccw" title="لا توجد طلبات تعويض" />
          </View>
        )
      }
      renderItem={({ item }) => (
        <RefundCard
          item={item}
          itemTotal={itemTotalFor(item)}
          customerName={nameByPhone.get(item.customerPhone) ?? undefined}
          busy={decidingId === item.id}
          onDecide={(action, amount) => decide(item.id, action, amount)}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 20,
    paddingBottom: 60,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  headRow: {
    flexDirection: 'row-reverse',
    gap: 12,
  },
  photo: {
    width: 84,
    height: 84,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  photoExpand: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  body: {
    flex: 1,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  productName: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 15,
    textAlign: 'right',
  },
  metaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    flexShrink: 1,
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontFamily: fonts.bold,
    fontSize: 11,
  },
  actions: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  amountInputWrap: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 42,
    gap: 6,
  },
  amountInput: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 14,
    textAlign: 'right',
    padding: 0,
  },
  amountSuffix: {
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  actionBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  actionText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#fff',
  },
});
