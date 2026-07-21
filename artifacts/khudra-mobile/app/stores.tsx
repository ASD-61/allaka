import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { useListStores } from '@workspace/api-client-react';
import { resolveImageUrl } from '@/lib/image-url';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/context/auth-context';

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} م`;
  return `${km.toFixed(1)} كم`;
}

export default function StoresScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ type?: string }>();
  const type = typeof params.type === 'string' && params.type ? params.type : undefined;
  const { customer } = useAuth();
  const hasLocation = customer?.latitude != null && customer?.longitude != null;
  // The saved location (captured silently at login) drives "nearest first" —
  // the backend sorts by it directly, so the list here is already in order.
  const storesQuery = useListStores(
    hasLocation ? { lat: customer!.latitude!, lng: customer!.longitude! } : undefined,
  );

  const stores = useMemo(() => {
    const list = storesQuery.data ?? [];
    return type ? list.filter((s) => s.storeType === type) : list;
  }, [storesQuery.data, type]);

  const title = type ?? 'كل المتاجر';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title }} />
      {storesQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={stores}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListHeaderComponent={
            <Text style={[styles.intro, { color: colors.mutedForeground }]}>
              اختر المتجر اللي تريد تتسوق منه
            </Text>
          }
          ListEmptyComponent={
            <View style={{ marginTop: 40 }}>
              <EmptyState
                icon="shopping-bag"
                title="لا توجد متاجر بهذا النوع"
                subtitle={
                  type
                    ? `لازم نوع المتجر عند التسجيل يطابق الاسم بالضبط: "${type}"`
                    : undefined
                }
              />
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/store/${item.id}`)}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              {item.imageUrl ? (
                <Image
                  source={{ uri: resolveImageUrl(item.imageUrl) }}
                  style={styles.logo}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.logo, styles.logoFallback, { backgroundColor: colors.primary + '15' }]}>
                  <Feather name="shopping-bag" size={22} color={colors.primary} />
                </View>
              )}
              <View style={styles.info}>
                <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={[styles.typePill, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.typeText, { color: colors.secondaryForeground }]} numberOfLines={1}>
                    {item.storeType}
                  </Text>
                </View>
                <View style={styles.addressRow}>
                  <Feather name="map-pin" size={12} color={colors.mutedForeground} />
                  <Text
                    style={[styles.address, { color: colors.mutedForeground }]}
                    numberOfLines={1}
                  >
                    {item.address}
                  </Text>
                  {item.distanceKm != null ? (
                    <Text style={[styles.distance, { color: colors.primary }]} numberOfLines={1}>
                      · {formatDistance(item.distanceKm)}
                    </Text>
                  ) : null}
                </View>
              </View>
              <Feather name="chevron-left" size={20} color={colors.mutedForeground} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 16, paddingBottom: 40 },
  intro: {
    fontFamily: fonts.medium,
    fontSize: 13,
    textAlign: 'right',
    marginBottom: 14,
  },
  card: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 14,
  },
  logoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 5, alignItems: 'flex-end' },
  name: {
    fontFamily: fonts.bold,
    fontSize: 15,
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
  addressRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'stretch',
  },
  address: {
    fontFamily: fonts.regular,
    fontSize: 12,
    flexShrink: 1,
  },
  distance: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    flexShrink: 0,
  },
});
