import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useGetStore,
  useListProducts,
  useListStoreTypes,
  useListFollows,
  useFollowStore,
  useUnfollowStore,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { ProductCard } from '@/components/ProductCard';
import { ZoomableImage } from '@/components/ZoomableImage';
import { CategoryChip } from '@/components/CategoryChip';
import { EmptyState } from '@/components/EmptyState';
import { ClearanceSection } from '@/components/ClearanceSection';
import { RecipeCard } from '@/components/RecipeCard';
import { resolveImageUrl } from '@/lib/image-url';
import { useCart } from '@/context/cart-context';
import { useAuth } from '@/context/auth-context';
import { haversineKm, formatDistance } from '@/lib/location';
import { displayPhone, telLink } from '@/lib/phone';

const ALL = 'الكل';
const WHOLESALE = 'قسم الجملة';

/** Opens the store's GPS location in the maps app (coords first, else address). */
function openStoreLocation(store: { latitude?: number | null; longitude?: number | null; address?: string | null }): void {
  let url: string;
  if (store.latitude != null && store.longitude != null) {
    url = `https://www.google.com/maps/search/?api=1&query=${store.latitude},${store.longitude}`;
  } else if (store.address) {
    url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address)}`;
  } else {
    return;
  }
  Linking.openURL(url).catch(() => {});
}

export default function StoreDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const storeId = Number(params.id);
  const { items, storeId: cartStoreId, setStoreId, totalCount } = useCart();
  const { customer } = useAuth();

  const [category, setCategory] = useState(ALL);
  const [search, setSearch] = useState('');
  // Manual pull-to-refresh only. Tying the spinner to react-query's isFetching
  // makes it flash on every 3s background poll (a "dot" blinking in/out).
  const [refreshing, setRefreshing] = useState(false);

  const storeQuery = useGetStore(storeId);
  const productsQuery = useListProducts({ storeId });
  const typesQuery = useListStoreTypes();

  // Follow (favourite) this store — only meaningful for logged-in customers.
  const followsQuery = useListFollows({ query: { enabled: !!customer } } as any);
  const followStore = useFollowStore();
  const unfollowStore = useUnfollowStore();
  const isFollowing = (followsQuery.data ?? []).some((s: any) => s.id === storeId);
  const toggleFollow = () => {
    if (!customer) {
      router.push('/login');
      return;
    }
    const opts = { onSuccess: () => followsQuery.refetch() };
    if (isFollowing) unfollowStore.mutate({ id: storeId }, opts);
    else followStore.mutate({ id: storeId }, opts);
  };

  // Arriving at a store with an empty cart binds the cart to this store.
  // (Mixing items from a different store is handled at add-time in ProductCard.)
  useEffect(() => {
    if (items.length === 0 && cartStoreId !== storeId) setStoreId(storeId);
  }, [items.length, cartStoreId, storeId, setStoreId]);

  const allProducts = productsQuery.data ?? [];
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of allProducts) if (p.category) set.add(p.category);
    return Array.from(set);
  }, [allProducts]);
  const hasWholesale = useMemo(() => allProducts.some((p) => p.isWholesale), [allProducts]);

  const products = useMemo(() => {
    let list = allProducts;
    if (category === WHOLESALE) list = list.filter((p) => p.isWholesale);
    else if (category !== ALL) list = list.filter((p) => p.category === category);
    const q = search.trim();
    if (q) list = list.filter((p) => p.name.includes(q));
    return list;
  }, [allProducts, category, search]);

  const store = storeQuery.data;
  // "شنو نطبخ اليوم؟" only appears for store types the admin enabled
  // (showRecipes) — e.g. produce/grocery, never pharmacies/schools.
  const showRecipes = useMemo(() => {
    if (!store?.storeType) return false;
    const match = (typesQuery.data ?? []).find((t) => t.name === store.storeType);
    return !!match?.showRecipes;
  }, [store?.storeType, typesQuery.data]);
  const phone = store?.ownerPhone && /\d/.test(store.ownerPhone) ? store.ownerPhone : null;
  const chips = [ALL, ...(hasWholesale ? [WHOLESALE] : []), ...categories];

  // Distance from the customer's saved location to this store (computed on the
  // client so it shows consistently, even though the single-store API doesn't
  // return a precomputed distanceKm like the list endpoints do).
  const distanceKm = useMemo(() => {
    if (
      customer?.latitude == null ||
      customer?.longitude == null ||
      store?.latitude == null ||
      store?.longitude == null
    ) {
      return null;
    }
    return haversineKm(
      customer.latitude,
      customer.longitude,
      store.latitude,
      store.longitude,
    );
  }, [customer?.latitude, customer?.longitude, store?.latitude, store?.longitude]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: store?.name ?? 'المتجر' }} />
      <FlatList
        data={products}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              try {
                await Promise.all([productsQuery.refetch(), storeQuery.refetch()]);
              } finally {
                setRefreshing(false);
              }
            }}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.hero}>
              {store?.imageUrl ? (
                <ZoomableImage
                  uri={resolveImageUrl(store.imageUrl)}
                  style={styles.heroImage}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.heroImage, styles.heroFallback, { backgroundColor: colors.primary + '15' }]}>
                  <Feather name="shopping-bag" size={30} color={colors.primary} />
                </View>
              )}
              <View style={styles.heroInfo}>
                <Text style={[styles.storeName, { color: colors.foreground }]} numberOfLines={1}>
                  {store?.name}
                </Text>
                {store?.storeType ? (
                  <View style={[styles.typePill, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.typeText, { color: colors.secondaryForeground }]}>
                      {store.storeType}
                    </Text>
                  </View>
                ) : null}
                {store && (store.ratingCount ?? 0) > 0 ? (
                  <View style={styles.ratingRow}>
                    <Text style={[styles.ratingCount, { color: colors.mutedForeground }]}>
                      ({store.ratingCount})
                    </Text>
                    {[1, 2, 3, 4, 5].map((n) => {
                      const avg = (store.ratingSum ?? 0) / (store.ratingCount ?? 1);
                      return (
                        <Feather
                          key={n}
                          name="star"
                          size={13}
                          color={n <= Math.round(avg) ? colors.accent : colors.muted}
                        />
                      );
                    })}
                    <Text style={[styles.ratingAvg, { color: colors.accent }]}>
                      {((store.ratingSum ?? 0) / (store.ratingCount ?? 1)).toFixed(1)}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {store ? (
              <Pressable
                onPress={toggleFollow}
                style={({ pressed }) => [
                  styles.followBtn,
                  {
                    backgroundColor: isFollowing ? colors.primary : colors.primary + '15',
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Feather
                  name="heart"
                  size={15}
                  color={isFollowing ? colors.primaryForeground : colors.primary}
                />
                <Text
                  style={[
                    styles.followBtnText,
                    { color: isFollowing ? colors.primaryForeground : colors.primary },
                  ]}
                >
                  {isFollowing ? 'تتابع هذا المتجر ✓' : 'متابعة المتجر'}
                </Text>
              </Pressable>
            ) : null}

            {store?.description ? (
              <Text style={[styles.desc, { color: colors.mutedForeground }]}>{store.description}</Text>
            ) : null}

            <View style={styles.metaRow}>
              <Feather name="map-pin" size={14} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{store?.address}</Text>
            </View>
            {phone || (store && (store.latitude != null || store.address)) ? (
              <View style={styles.contactRow}>
                {phone ? (
                  <Pressable
                    onPress={() => Linking.openURL(telLink(phone))}
                    style={({ pressed }) => [
                      styles.contactBtn,
                      { backgroundColor: colors.primary + '15', opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Feather name="phone" size={14} color={colors.primary} />
                    <Text style={[styles.contactText, { color: colors.primary }]}>{displayPhone(phone)}</Text>
                  </Pressable>
                ) : null}
                {store && (store.latitude != null || store.address) ? (
                  <Pressable
                    onPress={() => openStoreLocation(store)}
                    style={({ pressed }) => [
                      styles.contactBtn,
                      { backgroundColor: colors.primary + '15', opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Feather name="map-pin" size={14} color={colors.primary} />
                    <Text style={[styles.contactText, { color: colors.primary }]}>الموقع على الخريطة</Text>
                  </Pressable>
                ) : null}
                {distanceKm != null ? (
                  <View style={[styles.contactBtn, { backgroundColor: colors.secondary }]}>
                    <Feather name="navigation" size={14} color={colors.secondaryForeground} />
                    <Text style={[styles.contactText, { color: colors.secondaryForeground }]}>
                      {formatDistance(distanceKm)}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            <View style={[styles.searchBox, { backgroundColor: colors.muted }]}>
              <Feather name="search" size={16} color={colors.mutedForeground} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="ابحث داخل المتجر..."
                placeholderTextColor={colors.mutedForeground}
                style={[styles.searchInput, { color: colors.foreground }]}
                textAlign="right"
              />
            </View>

            {showRecipes ? <RecipeCard products={allProducts} /> : null}
            <ClearanceSection products={allProducts} />

            <FlatList
              data={chips}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <CategoryChip
                  label={item}
                  active={category === item}
                  onPress={() => setCategory(item)}
                />
              )}
              horizontal
              inverted
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
              style={styles.chipsList}
            />
          </>
        }
        ListEmptyComponent={
          productsQuery.isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <EmptyState icon="frown" title="لا توجد منتجات" subtitle="جرّب فئة أخرى أو كلمة بحث" />
          )
        }
        renderItem={({ item }) => (
          <ProductCard product={item} wholesale={category === WHOLESALE} />
        )}
      />

      {totalCount > 0 ? (
        <Pressable
          onPress={() => router.push('/cart')}
          style={({ pressed }) => [
            styles.cartBar,
            { backgroundColor: colors.primary, bottom: insets.bottom + 12, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Feather name="shopping-cart" size={18} color={colors.primaryForeground} />
          <Text style={[styles.cartBarText, { color: colors.primaryForeground }]}>
            عرض السلة ({totalCount})
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  row: {
    gap: 12,
    paddingHorizontal: 16,
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 120,
    gap: 12,
  },
  hero: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  heroImage: {
    width: 72,
    height: 72,
    borderRadius: 18,
  },
  heroFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfo: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 6,
  },
  storeName: {
    fontFamily: fonts.bold,
    fontSize: 18,
    textAlign: 'right',
  },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  typeText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
  },
  ratingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  ratingAvg: {
    fontFamily: fonts.bold,
    fontSize: 12,
    marginRight: 4,
  },
  ratingCount: {
    fontFamily: fonts.regular,
    fontSize: 11,
    marginLeft: 2,
  },
  desc: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'right',
    paddingHorizontal: 16,
  },
  followBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    height: 46,
    borderRadius: 14,
  },
  followBtnText: {
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  metaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
  },
  metaText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    textAlign: 'right',
  },
  contactRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 6,
  },
  contactBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 12,
  },
  contactText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  searchBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    marginHorizontal: 16,
    marginTop: 6,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  chipsList: {
    marginTop: 4,
    marginBottom: 4,
  },
  chipsRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    paddingHorizontal: 16,
  },
  cartBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 52,
    borderRadius: 16,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cartBarText: {
    fontFamily: fonts.bold,
    fontSize: 15,
  },
});
