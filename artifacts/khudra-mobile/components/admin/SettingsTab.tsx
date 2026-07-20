import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Alert } from '@/lib/alert';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { useAdminAuth } from '@/context/admin-context';
import { schemeForDomain, resolveApiDomain } from '@/lib/api-scheme';

export function SettingsTab() {
  const colors = useColors();
  const { token } = useAdminAuth();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!current || !next) {
      Alert.alert('تنبيه', 'أدخل كلمة المرور الحالية والجديدة');
      return;
    }
    if (next.length < 8) {
      Alert.alert('تنبيه', 'كلمة المرور الجديدة يجب أن تكون 8 خانات فأكثر');
      return;
    }
    if (next !== confirm) {
      Alert.alert('تنبيه', 'تأكيد كلمة المرور غير مطابق');
      return;
    }
    setSaving(true);
    try {
      const domain = resolveApiDomain();
      const base = `${schemeForDomain(domain)}://${domain}`;
      const res = await fetch(`${base}/api/admin/password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? 'تعذر تغيير كلمة المرور');
      }
      Alert.alert('تم', 'تم تغيير كلمة المرور بنجاح');
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err: any) {
      Alert.alert('خطأ', err?.message ?? 'تعذر تغيير كلمة المرور');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border },
  ];

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.header}>
          <Feather name="lock" size={16} color={colors.primary} />
          <Text style={[styles.title, { color: colors.foreground }]}>تغيير كلمة مرور المشرف</Text>
        </View>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          كلمة المرور محفوظة مشفّرة على الخادم ولا يمكن قراءتها. اختر كلمة قوية (8 خانات فأكثر).
        </Text>

        <TextInput
          value={current}
          onChangeText={setCurrent}
          placeholder="كلمة المرور الحالية"
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry={!show}
          style={inputStyle}
          textAlign="right"
        />
        <TextInput
          value={next}
          onChangeText={setNext}
          placeholder="كلمة المرور الجديدة"
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry={!show}
          style={inputStyle}
          textAlign="right"
        />
        <TextInput
          value={confirm}
          onChangeText={setConfirm}
          placeholder="تأكيد كلمة المرور الجديدة"
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry={!show}
          style={inputStyle}
          textAlign="right"
        />

        <Pressable onPress={() => setShow((s) => !s)} style={styles.showRow} hitSlop={8}>
          <Feather name={show ? 'eye-off' : 'eye'} size={14} color={colors.mutedForeground} />
          <Text style={[styles.showText, { color: colors.mutedForeground }]}>
            {show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
          </Text>
        </Pressable>

        <Pressable
          onPress={submit}
          disabled={saving}
          style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.saveText, { color: colors.primaryForeground }]}>حفظ كلمة المرور</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  card: { borderWidth: 1, borderRadius: 18, padding: 18, gap: 12 },
  header: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  title: { fontFamily: fonts.bold, fontSize: 16, textAlign: 'right' },
  hint: { fontFamily: fonts.regular, fontSize: 12.5, textAlign: 'right', lineHeight: 20 },
  input: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  showRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, alignSelf: 'flex-end' },
  showText: { fontFamily: fonts.medium, fontSize: 12 },
  saveBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  saveText: { fontFamily: fonts.bold, fontSize: 14 },
});
