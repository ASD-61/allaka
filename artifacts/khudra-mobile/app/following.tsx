import React from 'react';
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
import { router, Stack } from 'expo-router';
import { useListFollows } from '@workspace/api-client-react';
import { resolveImageUrl } from '@/lib/image-url';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { EmptyState } from '@/components/EmptyState';
import { RequireAuth } from '@/components/RequireAuth';

export default function FollowingScreen() {
  return (
    <RequireAuth message="سجّل دخولك حتى تشوف المتاجر التي تتابعها">
      <FollowingContent />
    </RequireAuth>
  );
}

function FollowingContent() {
  const colors = useColors();
  const followsQuery = useListFollows();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'المتاجر التي أتابعها' }} />
      {followsQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={followsQuery.data ?? []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <View style={{ marginTop: 40 }}>
              <EmptyState
                icon="heart"
                title="لا تتابع أي متجر بعد"
                subtitle="ادخل على أي متجر واضغط «متابعة المتجر» ليظهر هنا"
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
                  <Text style={[styles.address, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {item.address}
                  </Text>
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
});
