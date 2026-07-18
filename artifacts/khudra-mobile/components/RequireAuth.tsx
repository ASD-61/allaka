import React, { ReactNode } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/auth-context';
import { fonts } from '@/constants/fonts';

export function RequireAuth({
  children,
  message = 'سجّل دخولك للمتابعة',
}: {
  children: ReactNode;
  message?: string;
}) {
  const colors = useColors();
  const { isAuthenticated, isReady } = useAuth();

  if (!isReady) return null;

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={[styles.iconCircle, { backgroundColor: colors.secondary }]}>
          <Feather name="user" size={28} color={colors.accent} />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>{message}</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          سجّل عبر رقم واتساب الخاص بك لمتابعة طلباتك ونقاطك
        </Text>
        <Pressable
          onPress={() => router.push('/login')}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Feather name="log-in" size={16} color={colors.primaryForeground} />
          <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
            تسجيل الدخول
          </Text>
        </Pressable>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  button: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  buttonText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
});
