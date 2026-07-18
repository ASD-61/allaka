import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useListMyStores } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { resolveImageUrl } from '@/lib/image-url';
import { EmptyState } from '@/components/EmptyState';
import { RequireAuth } from '@/components/RequireAuth';

export default function MyStoresScreen() {
  return (
    <RequireAuth message="سجّل دخولك حتى تشوف متجرك">
      <MyStoresContent />
    </RequireAuth>
  );
}

function MyStoresContent() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const query = useListMyStores();

  const statusColor = (status: string) =>
    status === 'مفعّل'
      ? colors.primary
      : status === 'مرفوض'
        ? colors.destructive
        : status === 'موقوف مؤقتاً'
          ? colors.warning
          : colors.accent;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={query.data ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListHeaderComponent={
          <View style={{ marginBottom: 16 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>متاجري</Text>
            <Pressable
              onPress={() => router.push('/register-store')}
              style={[styles.registerBtn, { backgroundColor: colors.primary }]}
            >
              <Feather name="plus" size={20} color={colors.primaryForeground} />
              <Text style={[styles.registerText, { color: colors.primaryForeground }]}>
                تسجيل متجر جديد
              </Text>
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          query.isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <View style={{ marginTop: 20 }}>
              <EmptyState
                icon="shopping-bag"
                title="ما عندك متاجر بعد"
                subtitle="سجّل متجرك على علاّكة وابدأ البيع"
              />
            </View>
          )
        }
        renderItem={({ item }) => {
          const sc = statusColor(item.status);
          const isActive = item.status === 'مفعّل';
          const isSuspended = item.status === 'موقوف مؤقتاً';
          const isPending = item.status === 'قيد المراجعة';
          const isRejected = item.status === 'مرفوض';
          const canOpen = isActive || isSuspended;
          const thumb = resolveImageUrl(item.imageUrl);

          const Card = (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardRow}>
                {canOpen ? (
                  <Feather name="chevron-left" size={20} color={colors.mutedForeground} />
                ) : null}
                <View style={{ flex: 1, alignItems: 'flex-end', gap: 6 }}>
                  <View style={styles.nameRow}>
                    <View style={[styles.statusPill, { backgroundColor: sc + '20' }]}>
                      <Text style={[styles.statusText, { color: sc }]}>{item.status}</Text>
                    </View>
                    <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>
                  <Text style={[styles.meta, { color: colors.mutedForeground }]}>{item.storeType}</Text>
                  {isActive && item.subscriptionExpiresAt ? (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detail, { color: colors.primary }]}>
                        ينتهي الاشتراك: {String(item.subscriptionExpiresAt).slice(0, 10)}
                      </Text>
                      <Feather name="calendar" size={12} color={colors.primary} />
                    </View>
                  ) : null}
                  {isPending ? (
                    <Text style={[styles.note, { color: colors.accent }]}>قيد المراجعة من الإدارة</Text>
                  ) : null}
                  {isRejected ? (
                    <Text style={[styles.note, { color: colors.destructive }]}>تم رفض الطلب</Text>
                  ) : null}
                </View>
                <View style={[styles.thumbBox, { backgroundColor: colors.muted }]}>
                  {thumb ? (
                    <Image source={{ uri: thumb }} style={styles.thumbImg} contentFit="cover" />
                  ) : (
                    <Feather name="shopping-bag" size={24} color={colors.mutedForeground} />
                  )}
                </View>
              </View>
            </View>
          );

          if (canOpen) {
            return (
              <Pressable onPress={() => router.push(('/my-store/' + item.id) as any)}>
                {Card}
              </Pressable>
            );
          }
          return Card;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 20 },
  title: {
    fontFamily: fonts.bold,
    fontSize: 22,
    textAlign: 'right',
    marginBottom: 16,
  },
  registerBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
  },
  registerText: {
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  cardRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  nameRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  thumbBox: {
    width: 60,
    height: 60,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImg: {
    width: 60,
    height: 60,
    borderRadius: 14,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontFamily: fonts.bold,
    fontSize: 10,
  },
  name: {
    fontFamily: fonts.bold,
    fontSize: 16,
    textAlign: 'right',
  },
  meta: {
    fontFamily: fonts.medium,
    fontSize: 12,
    textAlign: 'right',
  },
  detailRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
  },
  detail: {
    fontFamily: fonts.medium,
    fontSize: 12,
    textAlign: 'right',
  },
  note: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    textAlign: 'right',
  },
});
