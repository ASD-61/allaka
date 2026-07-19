import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Alert } from '@/lib/alert';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useGetOrderRatingStatus,
  useCreateRating,
} from '@workspace/api-client-react';
import { queryClient } from '@/lib/query-client';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { RequireAuth } from '@/components/RequireAuth';

function RateContent() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const id = Number(orderId);
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const statusQuery = useGetOrderRatingStatus(id);
  const createRating = useCreateRating();
  const [stars, setStars] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const data = statusQuery.data;
  const alreadyRated = data?.stars != null;
  const effectiveStars = alreadyRated ? (data?.stars ?? 0) : stars;

  const handleSubmit = async () => {
    if (stars < 1) {
      Alert.alert('تنبيه', 'اختر عدد النجوم أولاً');
      return;
    }
    setSubmitting(true);
    try {
      await createRating.mutateAsync({ data: { orderId: id, stars } });
      queryClient.invalidateQueries({ queryKey: ['/api/stores'] });
      Alert.alert('شكراً لك 🌟', 'تم تسجيل تقييمك، نقدّر وقتك!');
      router.back();
    } catch (err: any) {
      Alert.alert('تعذر التقييم', err?.data?.error ?? 'حدث خطأ، حاول مرة أخرى');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <Stack.Screen options={{ title: 'تقييم المتجر' }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Feather name="chevron-right" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>تقييم المتجر</Text>
      </View>

      {statusQuery.isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : statusQuery.isError || !data ? (
        <View style={styles.centerBox}>
          <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
          <Text style={[styles.msg, { color: colors.mutedForeground }]}>
            تعذر تحميل الطلب. تأكد من تسجيل الدخول بنفس الرقم.
          </Text>
        </View>
      ) : !data.delivered ? (
        <View style={styles.centerBox}>
          <Feather name="clock" size={40} color={colors.mutedForeground} />
          <Text style={[styles.msg, { color: colors.mutedForeground }]}>
            يمكنك تقييم المتجر بعد استلام الطلب.
          </Text>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={[styles.iconCircle, { backgroundColor: colors.accent + '18' }]}>
            <Feather name="award" size={30} color={colors.accent} />
          </View>
          <Text style={[styles.storeName, { color: colors.foreground }]}>
            {data.storeName ?? 'المتجر'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {alreadyRated
              ? 'سبق وقيّمت هذا الطلب، شكراً لك!'
              : 'شلون كانت تجربتك مع هذا المتجر؟'}
          </Text>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                disabled={alreadyRated}
                hitSlop={6}
                onPress={() => setStars(n)}
              >
                <Feather
                  name="star"
                  size={44}
                  color={n <= effectiveStars ? colors.accent : colors.muted}
                  style={{ opacity: n <= effectiveStars ? 1 : 0.7 }}
                />
              </Pressable>
            ))}
          </View>

          {!alreadyRated ? (
            <Pressable
              onPress={handleSubmit}
              disabled={submitting || stars < 1}
              style={[
                styles.btn,
                { backgroundColor: colors.primary, opacity: submitting || stars < 1 ? 0.6 : 1 },
              ]}
            >
              {submitting ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.btnText, { color: colors.primaryForeground }]}>إرسال التقييم</Text>
              )}
            </Pressable>
          ) : (
            <Pressable
              onPress={() => router.back()}
              style={[styles.btn, { backgroundColor: colors.muted }]}
            >
              <Text style={[styles.btnText, { color: colors.foreground }]}>رجوع</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

export default function RateScreen() {
  return (
    <RequireAuth>
      <RateContent />
    </RequireAuth>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  title: { fontFamily: fonts.bold, fontSize: 18 },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 30 },
  msg: { fontFamily: fonts.medium, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  content: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 30, gap: 14 },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeName: { fontFamily: fonts.bold, fontSize: 20, textAlign: 'center' },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, textAlign: 'center' },
  starsRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginVertical: 20,
  },
  btn: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  btnText: { fontFamily: fonts.bold, fontSize: 16 },
});
