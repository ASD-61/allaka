import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useListStores, useListStoreTypes } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { EmptyState } from '@/components/EmptyState';
import { resolveImageUrl } from '@/lib/image-url';
import { useAuth } from '@/context/auth-context';

type TypeGroup = {
  type: string;
  count: number;
  image: string | null;
  sortOrder: number;
};

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { customer } = useAuth();
  const [search, setSearch] = useState('');
  const storesQuery = useListStores();
  const typesQuery = useListStoreTypes();

  // Hidden admin entry: the admin dashboard button was removed from the
  // profile screen; instead, tapping the app logo 10 times quickly reveals the
  // admin login. The counter resets if the taps are too far apart.
  const logoTaps = React.useRef(0);
  const lastTapAt = React.useRef(0);
  const handleLogoTap = () => {
    const now = Date.now();
    logoTaps.current = now - lastTapAt.current < 1500 ? logoTaps.current + 1 : 1;
    lastTapAt.current = now;
    if (logoTaps.current >= 10) {
      logoTaps.current = 0;
      router.push('/admin/login');
    }
  };

  // Landing shows a card per store type. Every admin-curated type appears
  // (with its real photo + display order) even before any store joins it, so a
  // newly-added type shows up immediately. Types that only exist on stores but
  // aren't curated yet are still shown too (using a store logo), so no active
  // store is ever hidden. Each card counts the active stores of that type.
  const groups = useMemo<TypeGroup[]>(() => {
    const map = new Map<string, TypeGroup>();

    // Seed with every curated type first (count 0 until stores match).
    for (const t of typesQuery.data ?? []) {
      map.set(t.name, {
        type: t.name,
        count: 0,
        image: t.imageUrl ?? null,
        sortOrder: t.sortOrder ?? 9999,
      });
    }

    for (const s of storesQuery.data ?? []) {
      const g =
        map.get(s.storeType) ??
        {
          type: s.storeType,
          count: 0,
          image: null,
          sortOrder: 9999,
        };
      g.count += 1;
      // Keep the curated image; only fall back to a store logo when none.
      if (!g.image && s.imageUrl) g.image = s.imageUrl;
      map.set(s.storeType, g);
    }

    let list = Array.from(map.values());
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.type.localeCompare(b.type));
    const q = search.trim();
    if (q) list = list.filter((g) => g.type.includes(q));
    return list;
  }, [storesQuery.data, typesQuery.data, search]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 12,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerTop}>
          <View style={styles.brandRow}>
            <Pressable onPress={handleLogoTap} hitSlop={6}>
              <Image
                source={require('@/assets/images/logo.png')}
                style={styles.logoCircle}
                contentFit="cover"
              />
            </Pressable>
            <View>
              <Text style={[styles.brand, { color: colors.foreground }]}>عـلاّكـة</Text>
              <Text style={[styles.brandSub, { color: colors.mutedForeground }]}>
                كل متاجرك بمكان واحد
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <View style={[styles.pointsPill, { backgroundColor: colors.secondary }]}>
              <Feather name="award" size={12} color={colors.accent} />
              <Text style={[styles.pointsText, { color: colors.secondaryForeground }]}>
                {customer?.points ?? 0}
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/notifications')}
              hitSlop={10}
              style={({ pressed }) => [
                styles.bellBtn,
                { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="bell" size={19} color={colors.foreground} />
            </Pressable>
          </View>
        </View>

        <View style={styles.searchRow}>
          <View style={[styles.searchBox, { backgroundColor: colors.muted }]}>
            <Feather name="search" size={16} color={colors.mutedForeground} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="ابحث عن متجر..."
              placeholderTextColor={colors.mutedForeground}
              style={[styles.searchInput, { color: colors.foreground }]}
              textAlign="right"
            />
          </View>
          <Pressable
            onPress={() => router.push('/product-search')}
            style={[styles.productSearchBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="shopping-bag" size={16} color="#fff" />
            <Text style={styles.productSearchBtnText}>بحث عن سلعة</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.type}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            تسوّق حسب نوع المتجر
          </Text>
        }
        ListEmptyComponent={
          storesQuery.isLoading || typesQuery.isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <EmptyState
              icon="shopping-bag"
              title="لا توجد أنواع أو متاجر بعد"
              subtitle="أضف أنواعاً من لوحة الأدمن (تبويب الأنواع) حتى تظهر هنا"
            />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/stores', params: { type: item.type } })}
            style={({ pressed }) => [
              styles.typeCard,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <View style={styles.typeImageWrap}>
              {item.image ? (
                <Image
                  source={{ uri: resolveImageUrl(item.image) }}
                  style={styles.typeImage}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.typeImage, styles.typeImageFallback, { backgroundColor: colors.primary + '15' }]}>
                  <Feather name="shopping-bag" size={26} color={colors.primary} />
                </View>
              )}
              <View style={[styles.countBadge, { backgroundColor: colors.background }]}>
                <Feather name="shopping-bag" size={11} color={colors.primary} />
                <Text style={[styles.countBadgeText, { color: colors.foreground }]}>
                  {item.count}
                </Text>
              </View>
            </View>
            <Text style={[styles.typeName, { color: colors.foreground }]} numberOfLines={1}>
              {item.type}
            </Text>
            <Text style={[styles.typeCount, { color: colors.mutedForeground }]}>
              {item.count === 1 ? 'متجر واحد' : `${item.count} متاجر`}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerTop: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  logoCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#ffffff',
  },
  brand: {
    fontFamily: fonts.bold,
    fontSize: 17,
    textAlign: 'right',
  },
  brandSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    textAlign: 'right',
  },
  headerActions: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  pointsText: {
    fontFamily: fonts.bold,
    fontSize: 11,
  },
  searchRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  productSearchBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  productSearchBtnText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#fff',
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    textAlign: 'right',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  row: {
    gap: 12,
    paddingHorizontal: 16,
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 110,
    gap: 12,
  },
  typeCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 10,
    gap: 8,
    alignItems: 'flex-end',
  },
  typeImageWrap: {
    width: '100%',
    aspectRatio: 1.4,
    borderRadius: 14,
    overflow: 'hidden',
  },
  countBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  countBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 11,
  },
  typeImage: {
    width: '100%',
    height: '100%',
  },
  typeImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeName: {
    fontFamily: fonts.bold,
    fontSize: 14,
    textAlign: 'right',
    width: '100%',
  },
  typeCount: {
    fontFamily: fonts.regular,
    fontSize: 11,
    textAlign: 'right',
    width: '100%',
  },
});
