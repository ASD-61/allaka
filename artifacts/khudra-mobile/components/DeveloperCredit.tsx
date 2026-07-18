import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';

const DEVELOPER_TELEGRAM_USERNAME = 'asd_61';

export function DeveloperCredit() {
  const colors = useColors();
  return (
    <View style={styles.container}>
      <Text style={[styles.text, { color: colors.mutedForeground }]}>
        تطوير بواسطة المهندس فؤاد سالم
      </Text>
      <Pressable
        style={styles.contactRow}
        onPress={() =>
          Linking.openURL(`https://t.me/${DEVELOPER_TELEGRAM_USERNAME}`)
        }
      >
        <Text style={[styles.contactText, { color: colors.primary }]}>
          للتواصل مع المطور
        </Text>
        <Feather name="send" size={13} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  text: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  contactRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  contactText: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
});
