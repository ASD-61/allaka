import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Alert } from '@/lib/alert';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { Product } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { formatIQD } from '@/lib/format';
import { resolveImageUrl } from '@/lib/image-url';
import { ProductImageSlider } from '@/components/ProductImageSlider';
import { useCart } from '@/context/cart-context';
import { qtyStepForUnit } from '@/lib/quantity';

export function ProductCard({ product, wholesale }: { product: Product; wholesale?: boolean }) {
  const colors = useColors();
  const { items, addItem, updateQty, clear, storeId, setStoreId } = useCart();
  const cartItem = items.find((i) => i.id === product.id);
  const outOfStock = product.inStock === false;
  const step = qtyStepForUnit(product.unit);
  // Full image gallery (falls back to the single primary image).
  const galleryUris = (
    product.imageUrls && product.imageUrls.length > 0
      ? product.imageUrls
      : [product.imageUrl]
  )
    .map((u) => resolveImageUrl(u))
    .filter((u): u is string => !!u);
  // In the wholesale section a product is sold at its wholesale price (if set).
  const effectivePrice =
    wholesale && product.wholesalePrice != null ? product.wholesalePrice : product.price;

  const doAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addItem({
      id: product.id,
      name: product.name,
      price: effectivePrice,
      unit: product.unit,
      imageUrl: product.imageUrl,
      priceNote: product.priceNote ?? null,
    });
  };

  const handleAdd = () => {
    if (outOfStock) return;
    // Single-store cart: adding an item from a different store empties the
    // cart first (with confirmation), so one order = one store.
    if (
      items.length > 0 &&
      storeId != null &&
      product.storeId != null &&
      storeId !== product.storeId
    ) {
      Alert.alert(
        'متجر مختلف',
        'سلتك تحتوي أغراض من متجر ثاني. تريد تفرّغ السلة وتبدأ من هذا المتجر؟',
        [
          { text: 'إلغاء', style: 'cancel' },
          {
            text: 'إفراغ وإضافة',
            style: 'destructive',
            onPress: () => {
              clear();
              if (product.storeId != null) setStoreId(product.storeId);
              doAdd();
            },
          },
        ],
      );
      return;
    }
    if (storeId == null && product.storeId != null) setStoreId(product.storeId);
    doAdd();
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        outOfStock ? styles.cardDisabled : null,
      ]}
    >
      <View style={styles.imageWrap}>
        <ProductImageSlider uris={galleryUris} style={styles.image} contentFit="cover" />
        {galleryUris.length > 1 ? (
          <View style={[styles.countBadge, { backgroundColor: colors.background + 'CC' }]}>
            <Feather name="image" size={10} color={colors.foreground} />
            <Text style={[styles.countText, { color: colors.foreground }]}>{galleryUris.length}</Text>
          </View>
        ) : null}
        {outOfStock ? (
          <View style={[styles.outOfStockOverlay, { backgroundColor: colors.background + 'CC' }]}>
            <View style={[styles.outOfStockPill, { backgroundColor: colors.destructive }]}>
              <Text style={styles.outOfStockPillText}>نفذت الكمية</Text>
            </View>
          </View>
        ) : null}
        {product.isVip ? (
          <View style={[styles.badge, { backgroundColor: colors.accent }]}>
            <Feather name="star" size={10} color={colors.accentForeground} />
            <Text style={[styles.badgeText, { color: colors.accentForeground }]}>VIP</Text>
          </View>
        ) : null}
        {product.discountPercent ? (
          <View style={[styles.discountBadge, { backgroundColor: colors.destructive }]}>
            <Text style={styles.discountText}>-{product.discountPercent}%</Text>
          </View>
        ) : null}
        {product.isLocal ? (
          <View style={[styles.localBadge, { backgroundColor: colors.primary }]}>
            <Feather name="map-pin" size={10} color={colors.primaryForeground} />
            <Text style={[styles.localText, { color: colors.primaryForeground }]}>محلي</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={[styles.unit, { color: colors.mutedForeground }]}>{product.unit}</Text>
        {product.priceNote ? (
          <Text style={[styles.priceNote, { color: colors.accent }]} numberOfLines={2}>
            {product.priceNote}
          </Text>
        ) : null}

        <View style={styles.priceRow}>
          <View style={styles.priceCol}>
            <Text style={[styles.price, { color: colors.primary }]} numberOfLines={1} adjustsFontSizeToFit>
              {formatIQD(effectivePrice)}
            </Text>
            {!wholesale && product.originalPrice ? (
              <Text
                style={[styles.originalPrice, { color: colors.mutedForeground }]}
                numberOfLines={1}
              >
                {formatIQD(product.originalPrice)}
              </Text>
            ) : null}
          </View>

          {outOfStock ? (
            <View style={[styles.addBtn, { backgroundColor: colors.muted }]}>
              <Feather name="slash" size={16} color={colors.mutedForeground} />
            </View>
          ) : cartItem ? (
            <View style={[styles.stepper, { backgroundColor: colors.primary }]}>
              <Pressable
                hitSlop={8}
                onPress={() => updateQty(product.id, cartItem.qty - step)}
                style={styles.stepperBtn}
              >
                <Feather name="minus" size={14} color={colors.primaryForeground} />
              </Pressable>
              <Text style={[styles.stepperText, { color: colors.primaryForeground }]}>
                {cartItem.qty}
              </Text>
              <Pressable
                hitSlop={8}
                onPress={() => updateQty(product.id, cartItem.qty + step)}
                style={styles.stepperBtn}
              >
                <Feather name="plus" size={14} color={colors.primaryForeground} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={handleAdd}
              style={({ pressed }) => [
                styles.addBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Feather name="plus" size={16} color={colors.primaryForeground} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardDisabled: {
    opacity: 0.75,
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
  },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  outOfStockPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  outOfStockPillText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: {
    fontFamily: fonts.bold,
    fontSize: 10,
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  discountText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: '#FFFFFF',
  },
  localBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  localText: {
    fontFamily: fonts.bold,
    fontSize: 10,
  },
  countBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  countText: {
    fontFamily: fonts.bold,
    fontSize: 10,
  },
  info: {
    padding: 10,
    gap: 2,
  },
  name: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    textAlign: 'right',
  },
  unit: {
    fontFamily: fonts.regular,
    fontSize: 11,
    textAlign: 'right',
  },
  priceNote: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    textAlign: 'right',
  },
  priceRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    gap: 6,
  },
  priceCol: {
    flex: 1,
  },
  price: {
    fontFamily: fonts.bold,
    fontSize: 13,
    textAlign: 'right',
  },
  originalPrice: {
    fontFamily: fonts.regular,
    fontSize: 10,
    textDecorationLine: 'line-through',
    textAlign: 'right',
  },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepper: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderRadius: 999,
    gap: 6,
    paddingHorizontal: 6,
    height: 30,
  },
  stepperBtn: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    minWidth: 14,
    textAlign: 'center',
  },
});
