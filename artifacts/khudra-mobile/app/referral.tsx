import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Alert } from '@/lib/alert';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useGetReferral, useRedeemReferral } from '@workspace/api-client-react';
import { queryClient } from '@/lib/query-client';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { RequireAuth } from '@/components/RequireAuth';

// Where the app can be downloaded — update this once the app is published.
const APP_LINK = 'https://alaka.app';

function ReferralContent() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const referralQuery = useGetReferral();
  const redeem = useRedeemReferral();
  const [code, setCode] = useState('');

  const myCode = referralQuery.data?.code ?? '';
  const reward = referralQuery.data?.reward ?? 2000;
  const alreadyReferred = !!referralQuery.data?.referredBy;

  const shareApp = async () => {
    try {
      await Share.share({
        message:
          `حمّل تطبيق عـلاّكـة 🥬\n` +
          `استخدم كود الدعوة: ${myCode}\n` +
          `وياخذ كل واحد فينا ${reward} دينار رصيد بالمحفظة!\n${APP_LINK}`,
      });
    } catch {
      // user cancelled — nothing to do
    }
  };

  const submitRedeem = async () => {
    const c = code.trim();
    if (c.length < 4) {
      Alert.alert('كود غير صحيح', 'أدخل كود الدعوة كامل');
      return;
    }
    try {
      const res = await redeem.mutateAsync({ data: { code: c } });
      queryClient.invalidateQueries();
      Alert.alert('تهانينا 🎉', `تم إضافة ${res.credited} دينار لرصيدك`);
      setCode('');
      referralQuery.refetch();
    } catch (err: any) {
      Alert.alert('تعذر الاستخدام', err?.data?.error ?? 'حدث خطأ، حاول مرة أخرى');
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 8 }]}
    >
      <Stack.Screen options={{ title: 'دعوة الأصدقاء' }} />

      <View style={[styles.hero, { backgroundColor: colors.primary + '12' }]}>
        <Feather name="gift" size={30} color={colors.primary} />
        <Text style={[styles.heroTitle, { color: colors.foreground }]}>
          ادعُ أصدقاءك واربحوا سوا
        </Text>
        <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
          شارك كودك، وعند استخدامه ياخذ كل واحد منكم {reward} دينار رصيد.
        </Text>
      </View>

      {referralQuery.isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <>
          <Text style={[styles.label, { color: colors.foreground }]}>كودك الخاص</Text>
          <View style={[styles.codeBox, { backgroundColor: colors.card, borderColor: colors.primary + '40' }]}>
            <Text style={[styles.codeText, { color: colors.primary }]}>{myCode}</Text>
          </View>

          <Pressable
            onPress={shareApp}
            style={({ pressed }) => [
              styles.shareBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Feather name="share-2" size={18} color={colors.primaryForeground} />
            <Text style={[styles.shareBtnText, { color: colors.primaryForeground }]}>
              مشاركة التطبيق مع الأصدقاء
            </Text>
          </Pressable>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {alreadyReferred ? (
            <View style={[styles.doneBox, { backgroundColor: colors.success + '15' }]}>
              <Feather name="check-circle" size={18} color={colors.success} />
              <Text style={[styles.doneText, { color: colors.success }]}>
                سبق واستخدمت كود دعوة
              </Text>
            </View>
          ) : (
            <>
              <Text style={[styles.label, { color: colors.foreground }]}>عندك كود من صديق؟</Text>
              <TextInput
                value={code}
                onChangeText={(t) => setCode(t.toUpperCase())}
                placeholder="أدخل الكود هنا"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="characters"
                style={[
                  styles.input,
                  { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
                ]}
              />
              <Pressable
                onPress={submitRedeem}
                disabled={redeem.isPending}
                style={({ pressed }) => [
                  styles.redeemBtn,
                  { backgroundColor: colors.accent, opacity: pressed || redeem.isPending ? 0.85 : 1 },
                ]}
              >
                {redeem.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.redeemBtnText}>استخدام الكود</Text>
                )}
              </Pressable>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

export default function ReferralScreen() {
  return (
    <RequireAuth message="سجّل دخولك لدعوة أصدقائك">
      <ReferralContent />
    </RequireAuth>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40, gap: 14 },
  hero: { borderRadius: 18, padding: 20, alignItems: 'center', gap: 8 },
  heroTitle: { fontFamily: fonts.bold, fontSize: 18, textAlign: 'center' },
  heroSub: { fontFamily: fonts.medium, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  label: { fontFamily: fonts.bold, fontSize: 14, textAlign: 'right', marginTop: 4 },
  codeBox: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingVertical: 18,
    alignItems: 'center',
  },
  codeText: { fontFamily: fonts.bold, fontSize: 30, letterSpacing: 4 },
  shareBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  shareBtnText: { fontFamily: fonts.bold, fontSize: 15 },
  divider: { height: 1, marginVertical: 6 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.bold,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 2,
  },
  redeemBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  redeemBtnText: { fontFamily: fonts.bold, fontSize: 15, color: '#fff' },
  doneBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  doneText: { fontFamily: fonts.bold, fontSize: 14 },
});
