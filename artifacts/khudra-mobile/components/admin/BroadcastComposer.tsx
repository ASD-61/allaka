import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { Alert } from '@/lib/alert';
import { Feather } from '@expo/vector-icons';
import { useSendBroadcast } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { useAdminRequest } from '@/hooks/useAdminRequest';

const DEFAULT_BROADCAST = 'وصلت خضار وفواكه طازجة جديدة، اطلبوا الآن';

export function BroadcastComposer() {
  const colors = useColors();
  const adminRequest = useAdminRequest();
  const sendBroadcast = useSendBroadcast({ request: adminRequest });
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(DEFAULT_BROADCAST);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    sendBroadcast.mutate(
      { data: { message: trimmed } },
      {
        onSuccess: () => {
          setOpen(false);
          setMessage(DEFAULT_BROADCAST);
          Alert.alert('تم الإرسال', 'وصل الإشعار لجميع المشتركين');
        },
        onError: (err: any) => {
          Alert.alert('تعذر الإرسال', err?.data?.error ?? 'حدث خطأ غير متوقع، حاول مرة أخرى');
        },
      },
    );
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
          <TextInput
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={500}
            placeholder="اكتب الإشعار هنا..."
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
              disabled={sendBroadcast.isPending || !message.trim()}
              style={[
                styles.sendBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: sendBroadcast.isPending || !message.trim() ? 0.5 : 1,
                },
              ]}
            >
              {sendBroadcast.isPending ? (
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