import React from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { Alert } from '@/lib/alert';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { resolveImageUrl } from '@/lib/image-url';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { useAuth } from '@/context/auth-context';
import { useTheme, type ThemeMode } from '@/context/theme-context';
import { DeveloperCredit } from '@/components/DeveloperCredit';

const THEME_OPTIONS: { key: ThemeMode; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: 'light', label: 'فاتح', icon: 'sun' },
  { key: 'dark', label: 'غامق', icon: 'moon' },
  { key: 'system', label: 'تلقائي', icon: 'smartphone' },
];

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { customer, isAuthenticated, isReady, logout } = useAuth();
  const { mode, setMode } = useTheme();

  const handleLogout = () => {
    Alert.alert('تسجيل الخروج', 'هل تريد تسجيل الخروج من حسابك؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'خروج', style: 'destructive', onPress: logout },
    ]);
  };

  if (!isReady) return null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120 }}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>حسابي</Text>

      {isAuthenticated && customer ? (
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            {customer.avatarUrl ? (
              <Image
                source={{ uri: resolveImageUrl(customer.avatarUrl) }}
                style={styles.avatarImage}
                contentFit="cover"
              />
            ) : (
              <Feather name="user" size={26} color={colors.primaryForeground} />
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.name, { color: colors.foreground }]}>
              {customer.name || 'عميل عـلاّكـة'}
            </Text>
            <Text style={[styles.phone, { color: colors.mutedForeground }]}>{customer.phone}</Text>
          </View>
          <View style={styles.badgesCol}>
            <View style={[styles.pointsBadge, { backgroundColor: colors.secondary }]}>
              <Feather name="award" size={12} color={colors.accent} />
              <Text style={[styles.pointsText, { color: colors.secondaryForeground }]}>
                {customer.points} نقطة
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/wallet')}
              style={({ pressed }) => [
                styles.pointsBadge,
                { backgroundColor: colors.primary + '15', opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="credit-card" size={12} color={colors.primary} />
              <Text style={[styles.pointsText, { color: colors.primary }]}>
                المحفظة: {customer.walletBalance ?? 0} د.ع
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={() => router.push('/login')}
          style={[styles.loginCard, { backgroundColor: colors.primary }]}
        >
          <Feather name="log-in" size={20} color={colors.primaryForeground} />
          <View>
            <Text style={[styles.loginTitle, { color: colors.primaryForeground }]}>سجّل دخولك</Text>
            <Text style={[styles.loginSubtitle, { color: colors.primaryForeground }]}>
              عبر رقم الواتساب لحفظ طلباتك ونقاطك
            </Text>
          </View>
        </Pressable>
      )}

      <View style={styles.menuGroup}>
        {isAuthenticated ? (
          <MenuItem
            icon="edit-3"
            label="تعديل معلوماتي"
            onPress={() => router.push('/profile-setup?edit=1')}
          />
        ) : null}
        <MenuItem
          icon="map-pin"
          label="عناوين التوصيل"
          onPress={() => (isAuthenticated ? router.push('/addresses') : router.push('/login'))}
        />
        <MenuItem
          icon="credit-card"
          label="محفظتي"
          onPress={() => (isAuthenticated ? router.push('/wallet') : router.push('/login'))}
        />
        <MenuItem
          icon="gift"
          label="دعوة الأصدقاء"
          onPress={() => (isAuthenticated ? router.push('/referral') : router.push('/login'))}
        />
        <MenuItem
          icon="bell"
          label="الإشعارات"
          onPress={() => (isAuthenticated ? router.push('/notifications') : router.push('/login'))}
        />
        <MenuItem
          icon="shopping-bag"
          label="متجري"
          onPress={() => (isAuthenticated ? router.push('/my-store' as any) : router.push('/login'))}
        />
        <MenuItem icon="help-circle" label="المساعدة والدعم" onPress={() => router.push('/help')} />
      </View>

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>مظهر التطبيق</Text>
      <View style={[styles.themeRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {THEME_OPTIONS.map((opt) => (
          <Pressable
            key={opt.key}
            onPress={() => setMode(opt.key)}
            style={[
              styles.themeOption,
              { backgroundColor: mode === opt.key ? colors.primary : 'transparent' },
            ]}
          >
            <Feather
              name={opt.icon}
              size={16}
              color={mode === opt.key ? colors.primaryForeground : colors.mutedForeground}
            />
            <Text
              style={[
                styles.themeLabel,
                { color: mode === opt.key ? colors.primaryForeground : colors.mutedForeground },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {isAuthenticated ? (
        <Pressable
          onPress={handleLogout}
          style={[styles.logoutBtn, { backgroundColor: colors.destructive + '15' }]}
        >
          <Feather name="log-out" size={16} color={colors.destructive} />
          <Text style={[styles.logoutText, { color: colors.destructive }]}>تسجيل الخروج</Text>
        </Pressable>
      ) : null}

      <View style={styles.footer}>
        {/* لوحة تحكم الإدارة صارت مخفية: تظهر فقط عند الضغط على شعار التطبيق
            في الصفحة الرئيسية ١٠ مرات متتالية. */}
        <DeveloperCredit />
      </View>
    </ScrollView>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Feather name="chevron-left" size={18} color={colors.mutedForeground} />
      <View style={styles.menuLabelRow}>
        <Text style={[styles.menuLabel, { color: colors.foreground }]}>{label}</Text>
        <Feather name={icon} size={18} color={colors.primary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: {
    fontFamily: fonts.bold,
    fontSize: 20,
    textAlign: 'right',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  profileCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: fonts.bold,
    fontSize: 15,
    textAlign: 'right',
  },
  phone: {
    fontFamily: fonts.regular,
    fontSize: 12,
    textAlign: 'right',
  },
  badgesCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  pointsBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pointsText: {
    fontFamily: fonts.bold,
    fontSize: 11,
  },
  loginCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 18,
  },
  loginTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    textAlign: 'right',
  },
  loginSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 11,
    textAlign: 'right',
    marginTop: 2,
  },
  menuGroup: {
    marginTop: 20,
    marginHorizontal: 16,
    gap: 10,
  },
  sectionLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    textAlign: 'right',
    marginHorizontal: 16,
    marginTop: 22,
    marginBottom: 8,
  },
  themeRow: {
    flexDirection: 'row-reverse',
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  themeLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  menuItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  menuLabelRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  menuLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  logoutBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 13,
    borderRadius: 16,
  },
  logoutText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  footer: {
    alignItems: 'center',
    marginTop: 28,
    gap: 4,
  },
  adminLink: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
  },
  adminIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminLinkText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
});
