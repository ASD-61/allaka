import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useListProducts } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { ProductCard } from '@/components/ProductCard';
import { EmptyState } from '@/components/EmptyState';

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
  if (hours >= 1) return `ينتهي بعد ${hours} ${hours === 1 ? 'ساعة' : hours <= 10 ? 'ساعات' : 'ساعة'}`;
  return `ينتهي بعد ${Math.max(minutes, 1)} دقيقة`;
}

export default function OffersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const productsQuery = useListProducts();

  const offers = useMemo(
    () =>
      (productsQuery.data ?? []).filter(
        (p) => p.originalPrice != null && p.originalPrice > p.price,
      ),
    [productsQuery.data],
  );

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
          أسعار مخفّضة لفترة محدودة — الحق العرض قبل ما يخلص
        </Text>
      </View>

      <FlatList
        data={offers}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={productsQuery.isRefetching}
            onRefresh={() => productsQuery.refetch()}
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
        renderItem={({ item }) => {
          const countdown = offerCountdown(item.discountExpiresAt);
          return (
            <View style={styles.cardWrap}>
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
        }}
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
    gap: 12,
  },
  row: {
    flexDirection: 'row-reverse',
    gap: 12,
  },
  cardWrap: {
    flex: 1,
    maxWidth: '48.5%',
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
