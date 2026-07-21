import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { Alert } from '@/lib/alert';
import { Feather } from '@expo/vector-icons';
import { useSendBroadcast, useSendStoreBroadcast } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { useAdminRequest } from '@/hooks/useAdminRequest';

// Start empty: the composer is shared by all kinds of stores, so pre-filling a
// vegetable-shop message would be wrong for most of them. The merchant writes
// their own announcement; a neutral placeholder just hints at the format.
const DEFAULT_BROADCAST = '';

// Shared composer for both broadcast scopes: with no `storeId` it's the
// admin's global announcement (reaches every customer); with a `storeId`
// it's a merchant's own announcement (reaches only customers who have
// ordered from THIS store) — same UI, different endpoint underneath.
export function BroadcastComposer({ storeId }: { storeId?: number } = {}) {
  const colors = useColors();
  const adminRequest = useAdminRequest();
  const sendGlobalBroadcast = useSendBroadcast({ request: adminRequest });
  const sendStoreBroadcast = useSendStoreBroadcast();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(DEFAULT_BROADCAST);

  const isPending = storeId != null ? sendStoreBroadcast.isPending : sendGlobalBroadcast.isPending;

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    const onSuccess = () => {
      setOpen(false);
      setMessage(DEFAULT_BROADCAST);
      Alert.alert('تم الإرسال', storeId != null ? 'وصل الإشعار لعملاء متجرك' : 'وصل الإشعار لجميع المشتركين');
    };
    const onError = (err: any) => {
      Alert.alert('تعذر الإرسال', err?.data?.error ?? 'حدث خطأ غير متوقع، حاول مرة أخرى');
    };
    if (storeId != null) {
      sendStoreBroadcast.mutate({ id: storeId, data: { message: trimmed } }, { onSuccess, onError });
    } else {
      sendGlobalBroadcast.mutate({ data: { message: trimmed } }, { onSuccess, onError });
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => [
          styles.toggleBtn,
          {
            backgroundColor: open ? colors.primary : colors.card,
            borderColor: colors.border,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <View style={[styles.iconBox, { backgroundColor: open ? colors.primaryForeground + '20' : colors.primary + '10' }]}>
          <Feather name="radio" size={14} color={open ? colors.primaryForeground : colors.primary} />
        </View>
        <Text style={[styles.toggleText, { color: open ? colors.primaryForeground : colors.foreground }]}>
          إرسال إشعار للعملاء
        </Text>
        <Feather name={open ? "chevron-up" : "chevron-down"} size={14} color={open ? colors.primaryForeground : colors.mutedForeground} style={{ marginRight: 'auto' }} />
      </Pressable>

      {open ? (
        <View style={[styles.composerBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {storeId != null ? (
            <Text style={[styles.scopeHint, { color: colors.mutedForeground }]}>
              راح يوصل هذا الإشعار فقط لعملائك الذين طلبوا من متجرك سابقاً
            </Text>
          ) : null}
          <TextInput
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={500}
            placeholder="اكتب إشعارك للعملاء هنا... (مثال: وصلت بضاعة جديدة، أو عرض خاص اليوم)"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]}
            textAlign="right"
          />
          <View style={styles.actions}>
            <Text style={[styles.charCount, { color: colors.mutedForeground }]}>
              {message.length} / 500
            </Text>
            <Pressable
              onPress={handleSend}
              disabled={isPending || !message.trim()}
              style={[
                styles.sendBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: isPending || !message.trim() ? 0.5 : 1,
                },
              ]}
            >
              {isPending ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <>
                  <Text style={[styles.sendText, { color: colors.primaryForeground }]}>نشر الإشعار</Text>
                  <Feather name="send" size={12} color={colors.primaryForeground} />
                </>
              )}
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  toggleBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: {
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  composerBox: {
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  scopeHint: {
    fontFamily: fonts.regular,
    fontSize: 11,
    textAlign: 'right',
    marginBottom: 10,
    lineHeight: 16,
  },
  input: {
    fontFamily: fonts.medium,
    fontSize: 14,
    minHeight: 100,
    borderRadius: 12,
    padding: 16,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  charCount: {
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  sendBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  sendText: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
});