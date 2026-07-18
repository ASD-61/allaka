import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Alert } from '@/lib/alert';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCreateStore, useListMyStores, useListStoreTypes } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { RequireAuth } from '@/components/RequireAuth';

export default function RegisterStoreScreen() {
  return (
    <RequireAuth message="سجّل دخولك حتى تقدر تسجّل متجرك">
      <RegisterStoreContent />
    </RequireAuth>
  );
}

const STATUS_COLORS = (colors: ReturnType<typeof useColors>) => ({
  'قيد المراجعة': colors.accent,
  'مفعّل': colors.primary,
  'مرفوض': colors.destructive,
});

function RegisterStoreContent() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const myStores = useListMyStores();
  const storeTypes = useListStoreTypes();
  const createStore = useCreateStore();

  const [name, setName] = useState('');
  const [storeType, setStoreType] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');

  const canSubmit =
    name.trim().length > 0 &&
    storeType.trim().length > 0 &&
    address.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      await createStore.mutateAsync({
        data: {
          name: name.trim(),
          storeType: storeType.trim(),
          address: address.trim(),
          description: description.trim() || null,
        },
      });
      setName('');
      setStoreType('');
      setAddress('');
      setDescription('');
      myStores.refetch();
      Alert.alert(
        'تم إرسال الطلب',
        'متجرك قيد المراجعة من الإدارة. راح نعلمك عند التفعيل.',
      );
    } catch (err: any) {
      Alert.alert('تعذر التسجيل', err?.data?.error ?? 'صار خطأ، حاول مرة ثانية');
    }
  };

  const statusColor = STATUS_COLORS(colors);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.hero, { backgroundColor: colors.primary + '12' }]}>
        <Feather name="shopping-bag" size={22} color={colors.primary} />
        <Text style={[styles.heroText, { color: colors.foreground }]}>
          سجّل متجرك ويا علاّكة
        </Text>
      </View>

      {(myStores.data?.length ?? 0) > 0 ? (
        <View style={{ marginBottom: 22 }}>
          <Text style={[styles.sectionLabel, { color: colors.foreground }]}>متاجري</Text>
          {myStores.data!.map((s) => (
            <View
              key={s.id}
              style={[styles.storeRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.statusPill, { backgroundColor: statusColor[s.status as keyof typeof statusColor] + '20' }]}>
                <Text style={[styles.statusText, { color: statusColor[s.status as keyof typeof statusColor] ?? colors.foreground }]}>
                  {s.status}
                </Text>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end', gap: 3 }}>
                <Text style={[styles.storeName, { color: colors.foreground }]}>{s.name}</Text>
                <Text style={[styles.storeMeta, { color: colors.mutedForeground }]}>
                  {s.storeType} · {s.address}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={[styles.sectionLabel, { color: colors.foreground }]}>معلومات المتجر</Text>

      <Field label="اسم المتجر" value={name} onChangeText={setName} placeholder="مثال: بقالية النور" colors={colors} />

      {(storeTypes.data?.length ?? 0) > 0 ? (
        <View style={{ marginBottom: 14 }}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>نوع المتجر</Text>
          <View style={styles.chipsWrap}>
            {storeTypes.data!.map((t) => {
              const selected = storeType === t.name;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => setStoreType(t.name)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? colors.primary : colors.card,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: selected ? colors.primaryForeground : colors.foreground }]}>
                    {t.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.chipHint, { color: colors.mutedForeground }]}>
            اختر النوع الذي يطابق متجرك حتى يظهر ضمن القسم الصحيح للزبائن
          </Text>
        </View>
      ) : (
        <Field label="نوع المتجر" value={storeType} onChangeText={setStoreType} placeholder="مثال: بقالة، لحوم، مخبز، خضار" colors={colors} />
      )}

      <Field label="العنوان" value={address} onChangeText={setAddress} placeholder="المدينة والمنطقة" colors={colors} />
      <Field
        label="تفاصيل إضافية (اختياري)"
        value={description}
        onChangeText={setDescription}
        placeholder="وصف قصير عن المتجر ومنتجاته"
        colors={colors}
        multiline
      />

      <Pressable
        onPress={handleSubmit}
        disabled={!canSubmit || createStore.isPending}
        style={({ pressed }) => [
          styles.submitBtn,
          { backgroundColor: colors.primary, opacity: !canSubmit || createStore.isPending ? 0.5 : pressed ? 0.85 : 1 },
        ]}
      >
        {createStore.isPending ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <>
            <Feather name="send" size={16} color={colors.primaryForeground} />
            <Text style={[styles.submitText, { color: colors.primaryForeground }]}>إرسال طلب التسجيل</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  colors,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  colors: ReturnType<typeof useColors>;
  multiline?: boolean;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        multiline={multiline}
        style={[
          styles.input,
          multiline ? styles.inputMultiline : null,
          { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
        ]}
        textAlign="right"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    marginBottom: 22,
  },
  heroText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'right',
  },
  sectionLabel: {
    fontFamily: fonts.bold,
    fontSize: 15,
    textAlign: 'right',
    marginBottom: 12,
  },
  storeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusText: {
    fontFamily: fonts.bold,
    fontSize: 11,
  },
  storeName: {
    fontFamily: fonts.bold,
    fontSize: 14,
    textAlign: 'right',
  },
  storeMeta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    textAlign: 'right',
  },
  fieldLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    textAlign: 'right',
    marginBottom: 6,
  },
  chipsWrap: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  chipHint: {
    fontFamily: fonts.regular,
    fontSize: 11,
    textAlign: 'right',
    marginTop: 8,
    lineHeight: 17,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  inputMultiline: {
    height: 90,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  submitBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
    marginTop: 8,
  },
  submitText: {
    fontFamily: fonts.bold,
    fontSize: 15,
  },
});
