import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { Order } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { formatIQD, formatDate } from '@/lib/format';
import { useListProducts, useGetStore } from '@workspace/api-client-react';
import { useCart } from '@/context/cart-context';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const STATUS_STEPS = ['قيد التحضير', 'في الطريق', 'تم التسليم'];

function statusIndex(status: string): number {
  const idx = STATUS_STEPS.indexOf(status);
  return idx === -1 ? 0 : idx;
}

export function OrderCard({ order }: { order: Order }) {
  const colors = useColors();
  const { addItem } = useCart();
  const [expanded, setExpanded] = useState(false);
  const step = statusIndex(order.status);
  const productsQuery = useListProducts();
  // Only fetch the store when the card is expanded (to know whether the
  // merchant enabled the "البضاعة بيها خلل؟" refund flow).
  const storeQuery = useGetStore(order.storeId ?? 0, {
    query: { enabled: expanded && order.storeId != null },
  } as any);
  const refundsEnabled = storeQuery.data?.refundsEnabled !== false;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  };

  const isRecentAndPreparing = order.status === 'قيد التحضير' && 
    (new Date().getTime() - new Date(order.createdAt).getTime()) < 15 * 60000;

  const handleReorder = () => {
    const products = productsQuery.data || [];
    let skipped: string[] = [];
    
    order.items.forEach(item => {
      const p = products.find(prod => prod.name === item.name); // Match by name since ID might change or we just have name in order item
      if (p && p.inStock !== false) {
        addItem({
          id: p.id,
          name: p.name,
          price: p.price,
          unit: p.unit,
          imageUrl: p.imageUrl
        }, item.qty);
      } else {
        skipped.push(item.name);
      }
    });

    if (skipped.length > 0) {
      alert(`تم إضافة المتوفر للسلة. لم نتمكن من إيجاد: ${skipped.join('، ')}`);
    } else {
      alert('تم إعادة الطلب للسلة بنجاح!');
    }
    router.push('/cart');
  };

  return (
    <Pressable
      onPress={toggle}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={[styles.orderId, { color: colors.foreground }]}>
            طلب #{order.id}
          </Text>
          <Text style={[styles.date, { color: colors.mutedForeground }]}>
            {formatDate(order.createdAt)}
          </Text>
        </View>
        <Feather
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.mutedForeground}
        />
      </View>

      <View style={styles.progressRow}>
        {STATUS_STEPS.map((label, i) => (
          <React.Fragment key={label}>
            <View style={styles.stepWrap}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: i <= step ? colors.primary : colors.muted,
                  },
                ]}
              />
              <Text
                style={[
                  styles.stepLabel,
                  { color: i <= step ? colors.primary : colors.mutedForeground },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </View>
            {i < STATUS_STEPS.length - 1 ? (
              <View
                style={[
                  styles.line,
                  { backgroundColor: i < step ? colors.primary : colors.muted },
                ]}
              />
            ) : null}
          </React.Fragment>
        ))}
      </View>

      {expanded ? (
        <View style={[styles.details, { borderTopColor: colors.border }]}>
          {order.items.map((item, idx) => (
            <View key={`${item.id}-${idx}`} style={styles.itemRow}>
              <Text style={[styles.itemQty, { color: colors.mutedForeground }]}>
                x{item.qty}
              </Text>
              <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={[styles.itemPrice, { color: colors.foreground }]}>
                {formatIQD(item.price * item.qty)}
              </Text>
            </View>
          ))}
          <View style={[styles.summaryRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>المجموع الفرعي</Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{formatIQD(order.subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>رسوم التوصيل</Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>
              {order.deliveryFee > 0 ? formatIQD(order.deliveryFee) : 'مجانًا'}
            </Text>
          </View>
          {order.discountApplied > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>خصم النقاط</Text>
              <Text style={[styles.summaryValue, { color: colors.accent }]}>-{formatIQD(order.discountApplied)}</Text>
            </View>
          ) : null}
          <View style={styles.summaryRow}>
            <Text style={[styles.totalLabel, { color: colors.foreground }]}>الإجمالي</Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>{formatIQD(order.total)}</Text>
          </View>
          {order.walletApplied ? (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>رصيد المحفظة المستعمل</Text>
              <Text style={[styles.summaryValue, { color: colors.accent }]}>-{formatIQD(order.walletApplied)}</Text>
            </View>
          ) : null}
          {order.pointsEarned > 0 ? (
            <View style={[styles.pointsPill, { backgroundColor: colors.secondary }]}>
              <Feather name="award" size={12} color={colors.accent} />
              <Text style={[styles.pointsText, { color: colors.secondaryForeground }]}>
                +{order.pointsEarned} نقطة من هذا الطلب
              </Text>
            </View>
          ) : null}

          <View style={styles.actionsRow}>
            {order.status === 'تم التسليم' && (
              <Pressable
                onPress={() => router.push({ pathname: '/rate/[orderId]', params: { orderId: String(order.id) } })}
                style={[styles.actionBtn, { backgroundColor: colors.accent + '18' }]}
              >
                <Feather name="star" size={14} color={colors.accent} />
                <Text style={[styles.actionBtnText, { color: colors.accent }]}>قيّم المتجر</Text>
              </Pressable>
            )}

            {order.status === 'تم التسليم' && refundsEnabled && (
              <Pressable
                onPress={() => router.push({ pathname: '/refund', params: { orderId: order.id, items: JSON.stringify(order.items) } })}
                style={[styles.actionBtn, { backgroundColor: colors.destructive + '15' }]}
              >
                <Feather name="alert-triangle" size={14} color={colors.destructive} />
                <Text style={[styles.actionBtnText, { color: colors.destructive }]}>البضاعة بيها خلل؟</Text>
              </Pressable>
            )}
            
            {isRecentAndPreparing && (
              <Pressable
                onPress={() => router.push({ pathname: '/add-to-order', params: { orderId: order.id } })}
                style={[styles.actionBtn, { backgroundColor: colors.primary + '15' }]}
              >
                <Feather name="plus-circle" size={14} color={colors.primary} />
                <Text style={[styles.actionBtnText, { color: colors.primary }]}>نسيت غرض؟ أضف للطلب</Text>
              </Pressable>
            )}

            {order.status === 'قيد التحضير' && (
              <Pressable
                onPress={handleReorder}
                style={[styles.actionBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
              >
                <Feather name="refresh-ccw" size={14} color={colors.foreground} />
                <Text style={[styles.actionBtnText, { color: colors.foreground }]}>إعادة الطلب</Text>
              </Pressable>
            )}
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    alignItems: 'flex-end',
    gap: 2,
  },
  orderId: {
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  date: {
    fontFamily: fonts.regular,
    fontSize: 11,
  },
  progressRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
  },
  stepWrap: {
    alignItems: 'center',
    width: 74,
    gap: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepLabel: {
    fontFamily: fonts.medium,
    fontSize: 10,
    textAlign: 'center',
  },
  line: {
    flex: 1,
    height: 2,
    marginTop: 4,
  },
  details: {
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  itemQty: {
    fontFamily: fonts.medium,
    fontSize: 12,
    width: 28,
  },
  itemName: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: 'right',
  },
  itemPrice: {
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  summaryRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  summaryLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  summaryValue: {
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  totalLabel: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  totalValue: {
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  pointsPill: {
    flexDirection: 'row-reverse',
    alignSelf: 'flex-end',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 2,
  },
  pointsText: {
    fontFamily: fonts.medium,
    fontSize: 11,
  },
  actionsRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
    paddingTop: 8,
  },
  actionBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
  }
});
