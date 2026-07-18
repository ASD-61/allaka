import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, KeyboardAvoidingView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { useAdminAuth } from '@/context/admin-context';

export default function AdminLoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAdminAuth();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!password) {
      setError('يرجى إدخال كلمة المرور');
      return;
    }
    setError(null);
    setLoading(true);
    const result = await login(password);
    setLoading(false);
    if (result.ok) {
      router.replace('/admin');
    } else {
      setError(result.error ?? 'كلمة المرور غير صحيحة');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={[styles.content, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.header}>
          <View style={[styles.iconWrapper, { backgroundColor: '#ffffff' }]}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.logoImg}
              contentFit="cover"
            />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>عـلاّكـة</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            نظام إدارة المتجر والعمليات
          </Text>
        </View>

        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.foreground }]}>
          <Text style={[styles.formTitle, { color: colors.foreground }]}>تسجيل الدخول</Text>
          
          <View style={[styles.inputBox, { backgroundColor: colors.muted, borderColor: error ? colors.destructive : colors.border }]}>
            <Pressable onPress={handleLogin} disabled={loading} style={styles.iconBtn}>
              <Feather name="arrow-left" size={20} color={colors.primary} />
            </Pressable>
            <TextInput
              value={password}
              onChangeText={(val) => { setPassword(val); setError(null); }}
              placeholder="كلمة المرور"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry
              style={[styles.input, { color: colors.foreground }]}
              textAlign="right"
              onSubmitEditing={handleLogin}
              returnKeyType="go"
            />
            <Feather name="lock" size={18} color={colors.mutedForeground} style={styles.inputIcon} />
          </View>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.destructive + '10' }]}>
              <Feather name="alert-circle" size={14} color={colors.destructive} />
              <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={handleLogin}
            disabled={loading}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.primary, opacity: pressed || loading ? 0.85 : 1 },
            ]}
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>دخول للوحة</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Feather name="shield" size={14} color={colors.mutedForeground} />
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            الوصول مصرّح للإدارة فقط
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  logoImg: {
    width: 72,
    height: 72,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 28,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  formCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  formTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    textAlign: 'right',
    marginBottom: 20,
  },
  inputBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingLeft: 6,
    paddingRight: 16,
    height: 56,
  },
  inputIcon: {
    marginLeft: 12,
  },
  input: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 16,
    paddingVertical: 0,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  button: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  buttonText: {
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
  },
  footerText: {
    fontFamily: fonts.medium,
    fontSize: 12,
  },
});
