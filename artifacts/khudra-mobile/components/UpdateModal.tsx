import React, { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { checkForUpdate, type UpdateInfo } from '@/lib/appUpdate';

// Key remembers the last version the user has already dismissed, so the modal
// only pops up once per newly-published version (a permanent reminder still
// lives on the notifications screen).
const SEEN_KEY = 'update-prompt-version';

/**
 * A polished, centered "new update available" dialog that appears
 * automatically on launch (no need to open the notifications screen). It shows
 * the new version number, the admin's message and a clear "download" action —
 * far more professional than a bare native alert.
 */
export function UpdateModal() {
  const colors = useColors();
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const info = await checkForUpdate();
      if (!alive || !info) return;
      const seen = await AsyncStorage.getItem(SEEN_KEY);
      if (seen === info.latestVersion) return; // already dismissed this version
      setUpdate(info);
      setVisible(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const dismiss = async () => {
    if (update) await AsyncStorage.setItem(SEEN_KEY, update.latestVersion).catch(() => {});
    setVisible(false);
  };

  const doUpdate = () => {
    if (update) Linking.openURL(update.apkUrl).catch(() => {});
    void dismiss();
  };

  if (!update) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
            <Feather name="download-cloud" size={30} color={colors.primary} />
          </View>

          <Text style={[styles.title, { color: colors.foreground }]}>تحديث جديد متوفر</Text>

          <View style={[styles.versionPill, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.versionText, { color: colors.primary }]}>
              النسخة {update.latestVersion}
            </Text>
          </View>

          <Text style={[styles.message, { color: colors.mutedForeground }]}>{update.message}</Text>

          <Text style={[styles.current, { color: colors.mutedForeground }]}>
            نسختك الحالية: {update.currentVersion}
          </Text>

          <Pressable
            onPress={doUpdate}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Feather name="download" size={18} color={colors.primaryForeground} />
            <Text style={[styles.primaryText, { color: colors.primaryForeground }]}>تحديث الآن</Text>
          </Pressable>

          <Pressable onPress={dismiss} hitSlop={8} style={styles.laterBtn}>
            <Text style={[styles.laterText, { color: colors.mutedForeground }]}>لاحقاً</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 19,
    textAlign: 'center',
  },
  versionPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  versionText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  message: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  current: {
    fontFamily: fonts.regular,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 6,
  },
  primaryBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: 50,
    borderRadius: 16,
  },
  primaryText: {
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  laterBtn: {
    paddingVertical: 6,
  },
  laterText: {
    fontFamily: fonts.medium,
    fontSize: 14,
  },
});
