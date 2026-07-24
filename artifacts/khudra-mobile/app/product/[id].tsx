import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetProduct, useGetStore } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { ProductCard } from '@/components/ProductCard';
import { EmptyState } from '@/components/EmptyState';
import { shareProduct } from '@/lib/share';

/**
 * Deep-link target: khudra-mobile://product/:id (opened from a shared WhatsApp
 * link via the server's /p/:id bridge). Shows the product on its own so the
 * friend lands exactly on what was shared, with a shortcut into the full store.
 */
export default function ProductScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const productId = Number(params.id);

  const productQuery = useGetProduct(productId, {
    query: { enabled: Number.isFinite(productId) } as any,
  });
  const product = productQuery.data;
  const storeQuery = useGetStore(product?.storeId as number, {
    query: { enabled: product?.storeId != null } as any,
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: product?.name ?? 'المنتج',
          headerRight: () =>
            product ? (
              <Pressable
                onPress={() => shareProduct({ id: product.id, name: product.name })}
                hitSlop={10}
                style={{ paddingHorizontal: 8 }}
              >
                <Feather name="share-2" size={20} color={colors.primary} />
              </Pressable>
            ) : null,
        }}
      />

      {productQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !product ? (
        <View style={styles.center}>
          <EmptyState
            icon="package"
            title="المنتج غير متوفر"
            subtitle="ربما تم حذف هذا المنتج أو نفدت الكمية."
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 16 }}
        >
          {storeQuery.data ? (
            <Text style={[styles.storeName, { color: colors.mutedForeground }]}>
              {storeQuery.data.name}
            </Text>
          ) : null}

          <View style={styles.cardWrap}>
            <ProductCard product={product} />
          </View>

          <Pressable
            onPress={() => router.push(`/store/${product.storeId}` as any)}
            style={({ pressed }) => [
              styles.storeBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Feather name="shopping-bag" size={18} color={colors.primaryForeground} />
            <Text style={[styles.storeBtnText, { color: colors.primaryForeground }]}>
              عرض المتجر وكل المنتجات
            </Text>
          </Pressable>

          <Pressable
            onPress={() => shareProduct({ id: product.id, name: product.name })}
            style={({ pressed }) => [
              styles.shareBtn,
              { borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Feather name="share-2" size={18} color={colors.foreground} />
            <Text style={[styles.shareBtnText, { color: colors.foreground }]}>
              مشاركة المنتج مع صديق
            </Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  storeName: { fontFamily: fonts.semibold, fontSize: 14, textAlign: 'right' },
  cardWrap: { maxWidth: 320, width: '100%', alignSelf: 'center' },
  storeBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
  },
  storeBtnText: { fontFamily: fonts.bold, fontSize: 15 },
  shareBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  shareBtnText: { fontFamily: fonts.semibold, fontSize: 14 },
});
