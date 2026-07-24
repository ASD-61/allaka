import React, { useState, useRef } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRequestUploadUrl } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { useAuth } from '@/context/auth-context';
import { pickImageWithChoice, uploadPickedImage } from '@/lib/upload';
import { resolveImageUrl } from '@/lib/image-url';
import { waMeLink } from '@/lib/phone';

type Step = 'phone' | 'code' | 'name';

// The WhatsApp number that SENDS the OTP (the WasenderAPI session number).
// WhatsApp blocks a fresh sender's first message to strangers, so if the code
// doesn't arrive the user messages this number once — that opens a 2-way window
// and the resent code goes through. Update this if the sender number changes.
const OTP_WHATSAPP = '9647770867660';

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { requestOtp, verifyOtp, updateProfile } = useAuth();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestUploadUrl = useRequestUploadUrl();
  const codeInputRef = useRef<TextInput>(null);
  const nameInputRef = useRef<TextInput>(null);

  const finishLogin = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const handleSendCode = async () => {
    if (phone.trim().length < 8) {
      setError('أدخل رقم واتساب صحيح');
      return;
    }
    setError(null);
    setLoading(true);
    const result = await requestOtp(phone.trim());
    setLoading(false);
    if (result.ok) {
      setStep('code');
      setTimeout(() => codeInputRef.current?.focus(), 300);
    } else {
      setError(result.error ?? 'تعذر إرسال رمز التحقق');
    }
  };

  const handleVerify = async () => {
    if (code.trim().length < 4) {
      setError('أدخل الرمز المكوّن من 6 أرقام');
      return;
    }
    setError(null);
    setLoading(true);
    const result = await verifyOtp(phone.trim(), code.trim());
    setLoading(false);
    if (result.ok) {
      if (result.hasProfile) {
        finishLogin();
      } else {
        setStep('name');
        setTimeout(() => nameInputRef.current?.focus(), 300);
      }
    } else {
      setError(result.error ?? 'رمز التحقق غير صحيح');
    }
  };

  const handlePickAvatar = async () => {
    try {
      const picked = await pickImageWithChoice();
      if (!picked) return;
      setUploading(true);
      const path = await uploadPickedImage(picked, (args) =>
        requestUploadUrl.mutateAsync(args),
      );
      setAvatarUrl(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر رفع الصورة، حاول مرة أخرى');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveName = async () => {
    if (name.trim().length < 2) {
      setError('أدخل اسمك الثلاثي أو الاسم الذي تفضله');
      return;
    }
    setError(null);
    setLoading(true);
    const result = await updateProfile({ name: name.trim(), avatarUrl });
    setLoading(false);
    if (result.ok) {
      finishLogin();
    } else {
      setError(result.error ?? 'تعذر حفظ الاسم');
    }
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 40, paddingHorizontal: 20 }}
      bottomOffset={40}
    >
      <View style={[styles.iconCircle, { backgroundColor: colors.secondary }]}>
        <Feather name="message-circle" size={30} color={colors.accent} />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>
        {step === 'phone'
          ? 'تسجيل الدخول عبر واتساب'
          : step === 'code'
            ? 'أدخل رمز التحقق'
            : 'ما اسمك؟'}
      </Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        {step === 'phone'
          ? 'سنرسل لك رمز تحقق عبر واتساب لتأكيد رقمك'
          : step === 'code'
            ? `تم إرسال رمز إلى ${phone}`
            : 'أضف اسمك ليظهر في طلباتك ويسهّل تواصلنا معك'}
      </Text>

      {step === 'phone' ? (
        <View style={[styles.inputBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="phone" size={16} color={colors.mutedForeground} />
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="07xxxxxxxxx"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="phone-pad"
            style={[styles.input, { color: colors.foreground }]}
            textAlign="right"
          />
        </View>
      ) : step === 'code' ? (
        <View style={[styles.inputBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="lock" size={16} color={colors.mutedForeground} />
          <TextInput
            ref={codeInputRef}
            value={code}
            onChangeText={setCode}
            placeholder="------"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="number-pad"
            maxLength={6}
            style={[styles.input, styles.codeInput, { color: colors.foreground }]}
            textAlign="center"
          />
        </View>
      ) : (
        <>
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
              <Feather name="user" size={30} color={colors.accent} />
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
        <View style={[styles.inputBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="user" size={16} color={colors.mutedForeground} />
          <TextInput
            ref={nameInputRef}
            value={name}
            onChangeText={setName}
            placeholder="مثال: أحمد محمد"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.foreground }]}
            textAlign="right"
            returnKeyType="done"
            onSubmitEditing={handleSaveName}
          />
        </View>
        </>
      )}

      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}

      <Pressable
        onPress={step === 'phone' ? handleSendCode : step === 'code' ? handleVerify : handleSaveName}
        disabled={loading}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.primary, opacity: pressed || loading ? 0.85 : 1 },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
            {step === 'phone' ? 'إرسال الرمز' : step === 'code' ? 'تأكيد' : 'حفظ ومتابعة'}
          </Text>
        )}
      </Pressable>

      {step === 'name' ? (
        <Pressable onPress={finishLogin} style={styles.backLink}>
          <Text style={[styles.backLinkText, { color: colors.mutedForeground }]}>تخطي الآن</Text>
        </Pressable>
      ) : null}

      {step === 'code' ? (
        <>
          <View style={[styles.waHelper, { backgroundColor: '#25D366' + '14', borderColor: '#25D366' + '55' }]}>
            <Text style={[styles.waHelperTitle, { color: colors.foreground }]}>
              ما وصلك الرمز؟
            </Text>
            <Text style={[styles.waHelperText, { color: colors.mutedForeground }]}>
              إذا رقمك جديد، راسلنا مرة وحدة على واتساب (يكفي "مرحبا") بعدها اضغط "إعادة إرسال الرمز".
            </Text>
            <Pressable
              onPress={() =>
                Linking.openURL(
                  waMeLink(OTP_WHATSAPP, 'مرحبا، أرغب باستلام رمز الدخول لتطبيق علّاكة'),
                ).catch(() => setError('تعذر فتح واتساب'))
              }
              style={({ pressed }) => [
                styles.waButton,
                { backgroundColor: '#25D366', opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Feather name="message-circle" size={16} color="#FFFFFF" />
              <Text style={styles.waButtonText}>مراسلتنا على واتساب</Text>
            </Pressable>
          </View>

          <Pressable onPress={handleSendCode} disabled={loading} style={styles.backLink}>
            <Text style={[styles.backLinkText, { color: colors.primary }]}>إعادة إرسال الرمز</Text>
          </Pressable>
          <Pressable onPress={() => setStep('phone')} style={styles.backLink}>
            <Text style={[styles.backLinkText, { color: colors.mutedForeground }]}>تغيير الرقم</Text>
          </Pressable>
        </>
      ) : null}
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
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
    lineHeight: 20,
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
  avatarWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 8,
  },
  avatarImage: {
    width: 82,
    height: 82,
    borderRadius: 41,
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
  input: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 15,
  },
  codeInput: {
    fontSize: 20,
    letterSpacing: 8,
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
  backLink: {
    alignItems: 'center',
    marginTop: 16,
  },
  backLinkText: {
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  waHelper: {
    marginTop: 22,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  waHelperTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    textAlign: 'right',
  },
  waHelperText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'right',
  },
  waButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 12,
    marginTop: 6,
  },
  waButtonText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
