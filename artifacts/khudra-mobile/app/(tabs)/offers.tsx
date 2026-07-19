import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useListProducts,
  useListStores,
  type Product,
  type Store,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { ProductCard } from '@/components/ProductCard';
import { ZoomableImage } from '@/components/ZoomableImage';
import { EmptyState } from '@/components/EmptyState';
import { resolveImageUrl } from '@/lib/image-url';
import { useAuth } from '@/context/auth-context';

/** Remaining time of an offer, in friendly Arabic (e.g. "ينتهي بعد ٣ ساعات"). */
function offerCountdown(expiresAt: string | null | undefined): string | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return null;
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `ينتهي بعد ${days} ${days === 1 ? 'يوم' : 'أيام'}`;
  }
  if (hours >= 1)
    return `ينتهي بعد ${hours} ${hours === 1 ? 'ساعة' : hours <= 10 ? 'ساعات' : 'ساعة'}`;
  return `ينتهي بعد ${Math.max(minutes, 1)} دقيقة`;
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} م`;
  return `${km.toFixed(1)} كم`;
}

/** Opens the store's GPS location in the maps app (coords first, else address). */
function openStoreLocation(store: Store): void {
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

type StoreSection = { store: Store | null; storeId: number | null; offers: Product[] };

/** Splits a list into rows of two, so offers render as a clean 2-col grid. */
function toPairs<T>(list: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < list.length; i += 2) rows.push(list.slice(i, i + 2));
  return rows;
}

function StoreOffersSection({ section }: { section: StoreSection }) {
  const colors = useColors();
  const { store, offers } = section;
  const avg = store && store.ratingCount ? (store.ratingSum ?? 0) / store.ratingCount : 0;

  return (
    <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Store header */}
      <View style={styles.storeHeader}>
        {store?.imageUrl ? (
          <ZoomableImage
            uri={resolveImageUrl(store.imageUrl)}
            wrapperStyle={styles.storeLogo}
            style={styles.storeLogo}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.storeLogo, styles.storeLogoFallback, { backgroundColor: colors.primary + '15' }]}>
            <Feather name="shopping-bag" size={22} color={colors.primary} />
          </View>
        )}

        <View style={styles.storeInfo}>
          <Text style={[styles.storeName, { color: colors.foreground }]} numberOfLines={1}>
            {store?.name ?? 'عروض متنوعة'}
          </Text>
          <View style={styles.storeMetaRow}>
            {store?.storeType ? (
              <View style={[styles.typePill, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.typeText, { color: colors.secondaryForeground }]} numberOfLines={1}>
                  {store.storeType}
                </Text>
              </View>
            ) : null}
            {store && store.ratingCount ? (
              <View style={styles.ratingRow}>
                <Feather name="star" size={12} color={colors.accent} />
                <Text style={[styles.ratingText, { color: colors.accent }]}>{avg.toFixed(1)}</Text>
                <Text style={[styles.ratingCount, { color: colors.mutedForeground }]}>
                  ({store.ratingCount})
                </Text>
              </View>
            ) : null}
            {store?.distanceKm != null ? (
              <View style={styles.ratingRow}>
                <Feather name="navigation" size={11} color={colors.primary} />
                <Text style={[styles.ratingText, { color: colors.primary }]}>
                  {formatDistance(store.distanceKm)}
                </Text>
              </View>
            ) : null}
          </View>
          {store?.address ? (
            <View style={styles.addressRow}>
              <Feather name="map-pin" size={11} color={colors.mutedForeground} />
              <Text style={[styles.address, { color: colors.mutedForeground }]} numberOfLines={1}>
                {store.address}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.offerBadge, { backgroundColor: colors.destructive + '15' }]}>
          <Text style={[styles.offerBadgeText, { color: colors.destructive }]}>
            {offers.length} عرض
          </Text>
        </View>
      </View>

      {/* Store actions: enter store + open GPS location */}
      {store ? (
        <View style={styles.actionsRow}>
          <Pressable
            onPress={() => router.push(`/store/${store.id}`)}
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Feather name="shopping-bag" size={14} color={colors.primaryForeground} />
            <Text style={[styles.actionText, { color: colors.primaryForeground }]}>دخول المتجر</Text>
          </Pressable>
          {store.latitude != null || store.address ? (
            <Pressable
              onPress={() => openStoreLocation(store)}
              style={({ pressed }) => [
                styles.actionBtn,
                styles.actionBtnGhost,
                { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="map-pin" size={14} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.primary }]}>الموقع على الخريطة</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* This store's offers, in a 2-column grid */}
      <View style={styles.grid}>
        {toPairs(offers).map((pair, idx) => (
          <View key={idx} style={styles.gridRow}>
            {pair.map((item) => {
              const countdown = offerCountdown(item.discountExpiresAt);
              return (
                <View key={item.id} style={styles.cardWrap}>
                  <ProductCard product={item} />
                  {countdown ? (
                    <View style={[styles.countdown, { backgroundColor: colors.destructive + '12' }]}>
                      <Feather name="clock" size={11} color={colors.destructive} />
                      <Text style={[styles.countdownText, { color: colors.destructive }]}>
                        {countdown}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
            {pair.length === 1 ? <View style={styles.cardWrap} /> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

export default function OffersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { customer } = useAuth();
  const hasLocation = customer?.latitude != null && customer?.longitude != null;

  const productsQuery = useListProducts();
  const storesQuery = useListStores(
    hasLocation ? { lat: customer!.latitude!, lng: customer!.longitude! } : undefined,
  );

  const sections = useMemo<StoreSection[]>(() => {
    const offers = (productsQuery.data ?? []).filter(
      (p) => p.originalPrice != null && p.originalPrice > p.price,
    );
    const storeById = new Map<number, Store>();
    for (const s of storesQuery.data ?? []) storeById.set(s.id, s);

    // Group offers by their store.
    const grouped = new Map<number | null, Product[]>();
    for (const p of offers) {
      const key = p.storeId ?? null;
      const arr = grouped.get(key);
      if (arr) arr.push(p);
      else grouped.set(key, [p]);
    }

    const result: StoreSection[] = [];
    for (const [storeId, list] of grouped) {
      result.push({
        storeId,
        store: storeId != null ? storeById.get(storeId) ?? null : null,
        offers: list,
      });
    }

    // Nearest store first when a location is known; keep null-store bucket last.
    result.sort((a, b) => {
      const da = a.store?.distanceKm;
      const db = b.store?.distanceKm;
      if (da == null && db == null) return 0;
      if (da == null) return 1;
      if (db == null) return -1;
      return da - db;
    });
    return result;
  }, [productsQuery.data, storesQuery.data]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.titleRow}>
          <View style={[styles.iconCircle, { backgroundColor: colors.destructive + '15' }]}>
            <Feather name="percent" size={16} color={colors.destructive} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>العروض والخصومات</Text>
        </View>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          عروض كل متجر مجمّعة لحالها — الحق العرض قبل ما يخلص
        </Text>
      </View>

      <FlatList
        data={sections}
        keyExtractor={(item) => String(item.storeId ?? 'none')}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={productsQuery.isRefetching}
            onRefresh={() => {
              productsQuery.refetch();
              storesQuery.refetch();
            }}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          productsQuery.isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <EmptyState
              icon="percent"
              title="لا توجد عروض حالياً"
              subtitle="تابعنا — العروض تنزل هنا أول بأول"
            />
          )
        }
        renderItem={({ item }) => <StoreOffersSection section={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  titleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 18,
    textAlign: 'right',
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 14,
  },
  section: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  storeHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  storeLogo: {
    width: 52,
    height: 52,
    borderRadius: 14,
  },
  storeLogoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeInfo: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 4,
  },
  storeName: {
    fontFamily: fonts.bold,
    fontSize: 15,
    textAlign: 'right',
  },
  storeMetaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  typePill: {
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: 999,
  },
  typeText: {
    fontFamily: fonts.semibold,
    fontSize: 10,
  },
  ratingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontFamily: fonts.bold,
    fontSize: 11,
  },
  ratingCount: {
    fontFamily: fonts.regular,
    fontSize: 10,
  },
  addressRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  address: {
    fontFamily: fonts.regular,
    fontSize: 11,
    textAlign: 'right',
    flexShrink: 1,
  },
  offerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  offerBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 11,
  },
  actionsRow: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 12,
  },
  actionBtnGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  actionText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  grid: {
    gap: 12,
  },
  gridRow: {
    flexDirection: 'row-reverse',
    gap: 12,
  },
  cardWrap: {
    flex: 1,
  },
  countdown: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 8,
    paddingVertical: 4,
    marginTop: 4,
  },
  countdownText: {
    fontFamily: fonts.semibold,
    fontSize: 10,
  },
});
