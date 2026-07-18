import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { useSearchProducts } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { formatIQD } from '@/lib/format';
import { resolveImageUrl } from '@/lib/image-url';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/context/auth-context';

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} م`;
  return `${km.toFixed(1)} كم`;
}

export default function ProductSearchScreen() {
  const colors = useColors();
  const { customer } = useAuth();
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');

  const hasLocation = customer?.latitude != null && customer?.longitude != null;
  const searchQuery = useSearchProducts(
    {
      q: submitted,
      ...(hasLocation ? { lat: customer!.latitude!, lng: customer!.longitude! } : {}),
    },
    { query: { enabled: submitted.trim().length > 0 } } as any,
  );

  const handleSearch = () => setSubmitted(query.trim());

  const results = searchQuery.data ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'بحث عن سلعة' }} />

      <View style={styles.searchRow}>
        <View style={[styles.searchBox, { backgroundColor: colors.muted }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="مثال: رمان، طماطة، خيار..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
            textAlign="right"
            returnKeyType="search"
            onSubmitEditing={handleSearch}
            autoFocus
          />
        </View>
        <Pressable
          onPress={handleSearch}
          style={[styles.searchBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.searchBtnText}>بحث</Text>
        </Pressable>
      </View>

      {!hasLocation && submitted ? (
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          فعّل خدمة الموقع حتى تظهر النتائج مرتبة من الأقرب إليك
        </Text>
      ) : null}

      {searchQuery.isLoading && submitted ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.store.id}-${item.product.id}`}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            submitted ? (
              <EmptyState
                icon="search"
                title="ماكو نتائج"
                subtitle={`ما اكو متجر عنده "${submitted}" متوفر حالياً`}
              />
            ) : (
              <EmptyState
                icon="search"
                title="دوّر عن أي سلعة"
                subtitle="اكتب اسم السلعة وراح نطلعلك أقرب المتاجر المتوفرة عندها"
              />
            )
          }
          renderItem={({ item }) => {
            const { product, store } = item;
            return (
              <Pressable
                onPress={() => router.push(`/store/${store.id}`)}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <View style={styles.cardRow}>
                  {product.imageUrl ? (
                    <Image
                      source={{ uri: resolveImageUrl(product.imageUrl) }}
                      style={styles.productImage}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.productImage, styles.imageFallback, { backgroundColor: colors.primary + '15' }]}>
                      <Feather name="shopping-bag" size={20} color={colors.primary} />
                    </View>
                  )}
                  <View style={styles.info}>
                    <Text style={[styles.productName, { color: colors.foreground }]} numberOfLines={1}>
                      {product.name}
                    </Text>
                    <Text style={[styles.price, { color: colors.primary }]}>
                      {formatIQD(product.price)} / {product.unit}
                    </Text>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <View style={styles.storeRow}>
                  <View style={styles.storeInfo}>
                    <Text style={[styles.storeName, { color: colors.foreground }]} numberOfLines={1}>
                      {store.name}
                    </Text>
                    <View style={styles.addressRow}>
                      <Feather name="map-pin" size={11} color={colors.mutedForeground} />
                      <Text style={[styles.address, { color: colors.mutedForeground }]} numberOfLines={1}>
                        {store.address}
                      </Text>
                      {store.distanceKm != null ? (
                        <Text style={[styles.distance, { color: colors.primary }]}>
                          · {formatDistance(store.distanceKm)}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  {store.ownerPhone ? (
                    <Pressable
                      onPress={() => Linking.openURL(`tel:${store.ownerPhone}`)}
                      style={[styles.callBtn, { backgroundColor: colors.primary + '15' }]}
                    >
                      <Feather name="phone" size={14} color={colors.primary} />
                      <Text style={[styles.callBtnText, { color: colors.primary }]}>
                        {store.ownerPhone}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    padding: 16,
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
  searchBtn: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#fff',
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    textAlign: 'right',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  listContent: { padding: 16, paddingTop: 0, paddingBottom: 40 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  cardRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  productImage: {
    width: 52,
    height: 52,
    borderRadius: 12,
  },
  imageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 4, alignItems: 'flex-end' },
  productName: {
    fontFamily: fonts.bold,
    fontSize: 14,
    textAlign: 'right',
  },
  price: {
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  divider: {
    height: 1,
  },
  storeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  storeInfo: { flex: 1, gap: 4, alignItems: 'flex-end' },
  storeName: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    textAlign: 'right',
  },
  addressRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  address: {
    fontFamily: fonts.regular,
    fontSize: 11,
  },
  distance: {
    fontFamily: fonts.semibold,
    fontSize: 11,
  },
  callBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  callBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
  },
});
