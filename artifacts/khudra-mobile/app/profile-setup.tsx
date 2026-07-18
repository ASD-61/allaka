import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Alert } from '@/lib/alert';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRequestUploadUrl } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { useAuth } from '@/context/auth-context';
import { pickImage, uploadPickedImage } from '@/lib/upload';
import { resolveImageUrl } from '@/lib/image-url';

export default function ProfileSetupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { updateProfile, customer } = useAuth();
  const params = useLocalSearchParams<{ edit?: string }>();
  const isEdit = params.edit === '1';

  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestUploadUrl = useRequestUploadUrl();

  // Prefill from the saved profile (edit mode, or re-login with existing data).
  useEffect(() => {
    if (customer) {
      setName((prev) => prev || customer.name || '');
      setAvatarUrl((prev) => prev ?? customer.avatarUrl ?? null);
    }
  }, [customer]);

  // First-time setup auto-skips once a profile exists — but never in edit mode.
  useEffect(() => {
    if (!isEdit && customer?.hasProfile) {
      router.replace('/(tabs)');
    }
  }, [isEdit, customer?.hasProfile]);

  const handlePickAvatar = async () => {
    try {
      const picked = await pickImage();
      if (!picked) return;
      setUploading(true);
      const path = await uploadPickedImage(picked, (args) =>
        requestUploadUrl.mutateAsync(args),
      );
      setAvatarUrl(path);
    } catch {
      Alert.alert('تعذر رفع الصورة', 'حاول مرة أخرى');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('يرجى إدخال اسمك');
      return;
    }
    setError(null);
    setLoading(true);
    const result = await updateProfile({ name: name.trim(), avatarUrl });
    setLoading(false);
    if (result.ok) {
      if (isEdit) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    } else {
      setError(result.error ?? 'تعذر حفظ المعلومات');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 20 }]}>
      {isEdit ? (
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Feather name="arrow-right" size={22} color={colors.foreground} />
        </Pressable>
      ) : null}

      <Pressable
        onPress={handlePickAvatar}
        disabled={uploading}
        style={[styles.avatarWrap, { backgroundColor: colors.secondary, borderColor: colors.border }]}
      >
        {avatarUrl ? (
          <Image
            source={{ uri: resolveImageUrl(avatarUrl) }}
            style={styles.avatarImage}
            contentFit="cover"
          />
        ) : (
          <Feather name="user" size={32} color={colors.accent} />
        )}
        <View style={[styles.avatarBadge, { backgroundColor: colors.primary, borderColor: colors.background }]}>
          {uploading ? (
            <ActivityIndicator size={10} color={colors.primaryForeground} />
          ) : (
            <Feather name="camera" size={12} color={colors.primaryForeground} />
          )}
        </View>
      </Pressable>
      <Text style={[styles.avatarHint, { color: colors.mutedForeground }]}>
        {avatarUrl ? 'اضغط لتغيير الصورة' : 'أضف صورة شخصية (اختياري)'}
      </Text>

      <Text style={[styles.title, { color: colors.foreground }]}>
        {isEdit ? 'تعديل معلوماتي' : 'أهلًا بك في عـلاّكـة'}
      </Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        {isEdit ? 'عدّل اسمك أو صورتك الشخصية' : 'أخبرنا باسمك لإكمال إعداد حسابك'}
      </Text>

      <View style={[styles.inputBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        <Feather name="user" size={16} color={colors.mutedForeground} />
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="الاسم الكامل"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { color: colors.foreground }]}
          textAlign="right"
        />
      </View>

      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}

      <Pressable
        onPress={handleSave}
        disabled={loading || uploading}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.primary, opacity: pressed || loading || uploading ? 0.85 : 1 },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
            {isEdit ? 'حفظ التعديلات' : 'متابعة'}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  backBtn: {
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  avatarWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 8,
    overflow: 'visible',
  },
  avatarImage: {
    width: 86,
    height: 86,
    borderRadius: 43,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHint: {
    fontFamily: fonts.regular,
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 14,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 19,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
  },
  inputBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 52,
  },
  input: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 15,
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
  button: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  buttonText: {
    fontFamily: fonts.bold,
    fontSize: 15,
  },
});
