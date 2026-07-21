import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Switch,
} from 'react-native';
import { Alert } from '@/lib/alert';
import { ZoomableImage } from '@/components/ZoomableImage';
import { Feather } from '@expo/vector-icons';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { getCurrentPositionSafe } from '@/lib/location';
import { LocationPicker } from '@/components/LocationPicker';
import type { LatLng } from '@/lib/locationPickerHtml';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useCreateOrder, useGetStore, useGetStoreWallet } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { formatIQD } from '@/lib/format';
import { qtyStepForUnit } from '@/lib/quantity';
import { resolveImageUrl } from '@/lib/image-url';
import { useCart } from '@/context/cart-context';
import { useAuth } from '@/context/auth-context';
import { EmptyState } from '@/components/EmptyState';

const POINTS_THRESHOLD = 100;

type DeliveryType = 'standard' | 'express';
type Redeem = 'discount' | 'free_delivery' | null;

const PICKUP_TIMES = [
  { label: 'بأسرع وقت', value: null },
  { label: 'اليوم بين ٤-٦ عصراً', value: 'اليوم بين ٤-٦ عصراً' },
  { label: 'اليوم بين ٦-٨ مساءً', value: 'اليوم بين ٦-٨ مساءً' },
  { label: 'غداً صباحاً', value: 'غداً صباحاً' },
  { label: 'غداً مساءً', value: 'غداً مساءً' },
];

export default function CartScreen() {
  // Guests can browse and build their cart freely; login is only required at
  // checkout (handled inside handleCheckout), so no RequireAuth gate here.
  return <CartContent />;
}

function CartContent() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { items, subtotal, updateQty, removeItem, clear, storeId } = useCart();
  const { customer } = useAuth();
  const createOrder = useCreateOrder();
  const storeQuery = useGetStore(storeId ?? 0, { query: { enabled: storeId != null } } as any);
  // Spendable wallet for this order = this store's refund credit + general
  // (referral) balance. Only meaningful once logged in and a store is known.
  const storeWalletQuery = useGetStoreWallet(storeId ?? 0, {
    query: { enabled: storeId != null && !!customer },
  } as any);

  const [deliveryType, setDeliveryType] = useState<DeliveryType>('standard');
  const [redeem, setRedeem] = useState<Redeem>(null);
  const [pickupTime, setPickupTime] = useState<string | null>(null);
  const [customActive, setCustomActive] = useState(false);
  const [customTime, setCustomTime] = useState('');
  const [useWallet, setUseWallet] = useState(false);
  const [note, setNote] = useState('');
  const [placing, setPlacing] = useState(false);
  const [locatingForCheckout, setLocatingForCheckout] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [initialCoords, setInitialCoords] = useState<LatLng | null>(null);

  // Loyalty points are per-store now: you can only redeem the points you
  // built up AT THIS store, so eligibility follows the store wallet's points.
  const storePoints = (storeWalletQuery.data as any)?.storePoints ?? 0;
  const canRedeem = storePoints >= POINTS_THRESHOLD;
  const walletBalance =
    (storeWalletQuery.data?.storeBalance ?? 0) +
    (storeWalletQuery.data?.generalBalance ?? customer?.walletBalance ?? 0);
  // Redeeming for "free express delivery" upgrades the order to express and
  // waives its fee, so the effective delivery type follows the redemption.
  const effectiveDeliveryType: DeliveryType =
    redeem === 'free_delivery' ? 'express' : deliveryType;
  const deliveryFee = effectiveDeliveryType === 'express' ? 3000 : 2000;
  const discount = redeem === 'discount' ? Math.min(2000, subtotal) : 0;
  const finalDeliveryFee = redeem === 'free_delivery' ? 0 : deliveryFee;
  let total = subtotal - discount + finalDeliveryFee;
  const walletApplied = useWallet ? Math.min(walletBalance, total) : 0;
  total -= walletApplied;

  // The classic (non-liquid-glass) tab bar floats over screen content
  // (tabBarStyle position: 'absolute' in the tabs layout), so the checkout
  // bar must clear it or the confirm button ends up hidden behind it.
  const usesFloatingTabBar = !isLiquidGlassAvailable();
  // Web overrides the tab bar to a taller 84px (see (tabs)/_layout.tsx); native uses the platform default.
  const classicTabBarHeight =
    (Platform.OS === 'web' ? 84 : Platform.OS === 'ios' ? 49 : 56) + insets.bottom;

  // Checkout is a two-step flow: first quietly try to seed the map picker
  // with the device's current GPS fix (if permission is already granted),
  // then always ask the customer to confirm/adjust the exact pin on the map
  // before the order is created — this way we never send an order with a
  // stale or missing location.
  const handleCheckout = async () => {
    if (locatingForCheckout) return;
    // Only now (at checkout) do we require an account — prompt the guest to
    // sign in with WhatsApp, then they can come back and confirm the order.
    if (!customer) {
      Alert.alert('سجّل دخولك', 'حتى نكمل طلبك سجّل دخولك بسرعة عبر واتساب', [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'تسجيل الدخول', onPress: () => router.push('/login') },
      ]);
      return;
    }
    setLocatingForCheckout(true);
    try {
      // Best-effort only — if this fails/times out (permission denied,
      // GPS off, no fix indoors...) the picker still opens with the default
      // center so the customer can always drop the pin manually and finish
      // the order instead of getting stuck.
      const coords = await getCurrentPositionSafe();
      setInitialCoords(coords);
    } finally {
      setLocatingForCheckout(false);
      setPickerVisible(true);
    }
  };

  const placeOrder = async (coords: LatLng) => {
    setPickerVisible(false);
    setPlacing(true);
    try {
      await createOrder.mutateAsync({
        data: {
          items: items.map((i) => ({
            id: i.id,
            name: i.name,
            price: i.price,
            unit: i.unit,
            qty: i.qty,
          })),
          deliveryType: effectiveDeliveryType,
          latitude: coords.latitude,
          longitude: coords.longitude,
          redeem: canRedeem ? redeem : null,
          pickupTime,
          walletApplied,
          note: note.trim() || null,
          storeId: storeId ?? null,
        },
      });

      clear();
      setRedeem(null);
      setNote('');
      Alert.alert('تم الطلب بنجاح', 'يمكنك متابعة حالة طلبك من تبويب طلباتي');
    } catch (err: any) {
      Alert.alert('تعذر إتمام الطلب', err?.data?.error ?? 'حدث خطأ غير متوقع، حاول مرة أخرى');
    } finally {
      setPlacing(false);
    }
  };

  if (items.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 20 }]}>
        <EmptyState icon="shopping-cart" title="سلتك فارغة" subtitle="تصفّح المتاجر وأضف أغراضك" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { paddingTop: insets.top + 16, color: colors.foreground }]}>
        سلة التسوق
      </Text>
      {storeId != null && storeQuery.data ? (
        <Pressable
          onPress={() => router.push(`/store/${storeId}`)}
          style={({ pressed }) => [
            styles.storeHeader,
            { backgroundColor: colors.secondary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Feather name="shopping-bag" size={16} color={colors.secondaryForeground} />
          <View style={styles.storeHeaderInfo}>
            <Text style={[styles.storeHeaderLabel, { color: colors.mutedForeground }]}>تشتري من</Text>
            <Text
              style={[styles.storeHeaderName, { color: colors.secondaryForeground }]}
              numberOfLines={1}
            >
              {storeQuery.data.name}
            </Text>
          </View>
          <View style={styles.storeHeaderCta}>
            <Text style={[styles.storeHeaderCtaText, { color: colors.primary }]}>أكمل التسوق</Text>
            <Feather name="chevron-left" size={16} color={colors.primary} />
          </View>
        </Pressable>
      ) : null}
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={[styles.cartRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ZoomableImage uri={resolveImageUrl(item.imageUrl)} wrapperStyle={styles.thumb} style={styles.thumb} contentFit="cover" />
            <View style={styles.cartInfo}>
              <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={[styles.itemUnit, { color: colors.mutedForeground }]}>{item.unit}</Text>
              <Text style={[styles.itemPrice, { color: colors.primary }]}>{formatIQD(item.price)}</Text>
            </View>
            <View style={styles.cartActions}>
              <Pressable hitSlop={8} onPress={() => removeItem(item.id)}>
                <Feather name="trash-2" size={16} color={colors.destructive} />
              </Pressable>
              <View style={[styles.stepper, { backgroundColor: colors.muted }]}>
                <Pressable
                  hitSlop={8}
                  onPress={() => updateQty(item.id, item.qty - qtyStepForUnit(item.unit))}
                  style={styles.stepperBtn}
                >
                  <Feather name="minus" size={13} color={colors.foreground} />
                </Pressable>
                <Text style={[styles.stepperText, { color: colors.foreground }]}>{item.qty}</Text>
                <Pressable
                  hitSlop={8}
                  onPress={() => updateQty(item.id, item.qty + qtyStepForUnit(item.unit))}
                  style={styles.stepperBtn}
                >
                  <Feather name="plus" size={13} color={colors.foreground} />
                </Pressable>
              </View>
            </View>
          </View>
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>نوع التوصيل</Text>
            <View style={styles.deliveryRow}>
              {(
                [
                  { key: 'standard', label: 'عادي', price: 2000 },
                  { key: 'express', label: 'سريع', price: 3000 },
                ] as const
              ).map((opt) => (
                <Pressable
                  key={opt.key}
                  onPress={() => setDeliveryType(opt.key)}
                  style={[
                    styles.deliveryOption,
                    {
                      backgroundColor: deliveryType === opt.key ? colors.primary : colors.card,
                      borderColor: deliveryType === opt.key ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.deliveryLabel,
                      { color: deliveryType === opt.key ? colors.primaryForeground : colors.foreground },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  <Text
                    style={[
                      styles.deliveryPrice,
                      {
                        color:
                          deliveryType === opt.key ? colors.primaryForeground : colors.mutedForeground,
                      },
                    ]}
                  >
                    {formatIQD(opt.price)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {canRedeem ? (
              <>
                <Text style={[styles.sectionLabel, { color: colors.foreground, marginTop: 18 }]}>
                  استبدال نقاط هذا المتجر ({storePoints} نقطة متاحة)
                </Text>
                <View style={styles.redeemRow}>
                  {(
                    [
                      { key: 'discount', label: 'خصم ٢٠٠٠ د.ع' },
                      { key: 'free_delivery', label: 'توصيل سريع مجاني' },
                    ] as const
                  ).map((opt) => (
                    <Pressable
                      key={opt.key}
                      onPress={() => setRedeem(redeem === opt.key ? null : opt.key)}
                      style={[
                        styles.redeemOption,
                        {
                          backgroundColor: redeem === opt.key ? colors.accent : colors.secondary,
                        },
                      ]}
                    >
                      <Feather
                        name="award"
                        size={13}
                        color={redeem === opt.key ? colors.accentForeground : colors.secondaryForeground}
                      />
                      <Text
                        style={[
                          styles.redeemLabel,
                          {
                            color:
                              redeem === opt.key ? colors.accentForeground : colors.secondaryForeground,
                          },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}

            {walletBalance > 0 && (
              <View style={[styles.walletRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.walletInfo}>
                  <Text style={[styles.walletLabel, { color: colors.foreground }]}>
                    استخدم رصيد المحفظة ({formatIQD(walletBalance)})
                  </Text>
                  {useWallet && (
                    <Text style={[styles.walletAppliedText, { color: colors.primary }]}>
                      سيتم خصم {formatIQD(walletApplied)} من الطلب
                    </Text>
                  )}
                </View>
                <Switch
                  value={useWallet}
                  onValueChange={setUseWallet}
                  trackColor={{ true: colors.primary, false: colors.border }}
                  thumbColor="#fff"
                />
              </View>
            )}

            <Text style={[styles.sectionLabel, { color: colors.foreground, marginTop: 18 }]}>
              وقت الاستلام
            </Text>
            <View style={styles.pickupRow}>
              {PICKUP_TIMES.map((opt) => {
                const selected = !customActive && pickupTime === opt.value;
                return (
                  <Pressable
                    key={opt.label}
                    onPress={() => {
                      setCustomActive(false);
                      setPickupTime(opt.value);
                    }}
                    style={[
                      styles.pickupOption,
                      {
                        backgroundColor: selected ? colors.primary : colors.card,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.pickupLabel,
                        { color: selected ? colors.primaryForeground : colors.foreground },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => {
                  setCustomActive(true);
                  setPickupTime(customTime.trim() || null);
                }}
                style={[
                  styles.pickupOption,
                  {
                    backgroundColor: customActive ? colors.primary : colors.card,
                    borderColor: customActive ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.pickupLabel,
                    { color: customActive ? colors.primaryForeground : colors.foreground },
                  ]}
                >
                  وقت آخر أحدده
                </Text>
              </Pressable>
            </View>
            {customActive ? (
              <TextInput
                value={customTime}
                onChangeText={(t) => {
                  setCustomTime(t);
                  setPickupTime(t.trim() || null);
                }}
                maxLength={80}
                placeholder="اكتب الوقت الي يناسبك، مثال: الساعة ٩ الصبح، أو بعد صلاة العشاء"
                placeholderTextColor={colors.mutedForeground}
                style={[
                  styles.customTimeInput,
                  { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border },
                ]}
                textAlign="right"
              />
            ) : null}

            <Text style={[styles.sectionLabel, { color: colors.foreground, marginTop: 18 }]}>
              ملاحظة على الطلب (اختياري)
            </Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={500}
              placeholder="مثال: الطماطم ناضجة زيادة، اتصل قبل الوصول…"
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.noteInput,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
            />

            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>المجموع الفرعي</Text>
                <Text style={[styles.summaryValue, { color: colors.foreground }]}>{formatIQD(subtotal)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>رسوم التوصيل</Text>
                <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                  {finalDeliveryFee > 0 ? formatIQD(finalDeliveryFee) : 'مجانًا'}
                </Text>
              </View>
              {discount > 0 ? (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>خصم النقاط</Text>
                  <Text style={[styles.summaryValue, { color: colors.accent }]}>-{formatIQD(discount)}</Text>
                </View>
              ) : null}
              {walletApplied > 0 ? (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>رصيد المحفظة المستعمل</Text>
                  <Text style={[styles.summaryValue, { color: colors.accent }]}>-{formatIQD(walletApplied)}</Text>
                </View>
              ) : null}
              <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.totalLabel, { color: colors.foreground }]}>الإجمالي</Text>
                <Text style={[styles.totalValue, { color: colors.primary }]}>{formatIQD(total)}</Text>
              </View>
            </View>
          </View>
        }
      />

      <View
        style={[
          styles.checkoutBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            bottom: usesFloatingTabBar ? classicTabBarHeight : 0,
            paddingBottom: usesFloatingTabBar ? 12 : insets.bottom + 12,
          },
        ]}
      >
        <Pressable
          onPress={handleCheckout}
          disabled={placing || locatingForCheckout}
          style={({ pressed }) => [
            styles.checkoutBtn,
            { backgroundColor: colors.primary, opacity: pressed || placing || locatingForCheckout ? 0.85 : 1 },
          ]}
        >
          {placing || locatingForCheckout ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <>
              <Feather name="check-circle" size={18} color={colors.primaryForeground} />
              <Text style={[styles.checkoutText, { color: colors.primaryForeground }]}>
                تأكيد الطلب · {formatIQD(total)}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      <LocationPicker
        visible={pickerVisible}
        initial={initialCoords}
        title="أين نوصّل طلبك؟"
        onConfirm={placeOrder}
        onClose={() => setPickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: {
    fontFamily: fonts.bold,
    fontSize: 20,
    textAlign: 'right',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 140,
    gap: 10,
  },
  storeHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  storeHeaderInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  storeHeaderLabel: {
    fontFamily: fonts.regular,
    fontSize: 10,
    textAlign: 'right',
  },
  storeHeaderName: {
    fontFamily: fonts.bold,
    fontSize: 14,
    textAlign: 'right',
  },
  storeHeaderCta: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 2,
  },
  storeHeaderCtaText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  cartRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  cartInfo: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    textAlign: 'right',
  },
  itemUnit: {
    fontFamily: fonts.regular,
    fontSize: 11,
    textAlign: 'right',
  },
  itemPrice: {
    fontFamily: fonts.bold,
    fontSize: 13,
    textAlign: 'right',
  },
  cartActions: {
    alignItems: 'center',
    gap: 8,
  },
  stepper: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderRadius: 999,
    gap: 6,
    paddingHorizontal: 6,
    height: 28,
  },
  stepperBtn: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    minWidth: 12,
    textAlign: 'center',
  },
  footer: {
    marginTop: 16,
    gap: 10,
  },
  sectionLabel: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    textAlign: 'right',
  },
  deliveryRow: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  noteInput: {
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: 'right',
    textAlignVertical: 'top',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 64,
  },
  deliveryOption: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    gap: 3,
  },
  deliveryLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  deliveryPrice: {
    fontFamily: fonts.regular,
    fontSize: 11,
  },
  walletRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 18,
  },
  walletInfo: {
    flex: 1,
    gap: 4,
  },
  walletLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    textAlign: 'right',
  },
  walletAppliedText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    textAlign: 'right',
  },
  pickupRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
  },
  pickupOption: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  customTimeInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 10,
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  redeemRow: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  redeemOption: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    paddingVertical: 10,
  },
  redeemLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  summaryCard: {
    marginTop: 18,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  summaryValue: {
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  totalRow: {
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 2,
  },
  totalLabel: {
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  totalValue: {
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  checkoutBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  checkoutBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 16,
  },
  checkoutText: {
    fontFamily: fonts.bold,
    fontSize: 15,
  },
});
