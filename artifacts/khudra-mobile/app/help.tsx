import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';

type Faq = { q: string; a: string };
type FaqSection = { title: string; items: Faq[] };

const SECTIONS: FaqSection[] = [
  {
    title: 'الطلب والتوصيل',
    items: [
      {
        q: 'كيف أطلب؟',
        a: 'اختر المتجر، أضف المنتجات للسلة، افتح السلة وحدد نوع التوصيل والوقت وأكمل الطلب.',
      },
      {
        q: 'أنواع التوصيل والأسعار',
        a: 'عادي: ٢٠٠٠ دينار خلال ساعة. سريع: ٣٠٠٠ دينار خلال نص ساعة.',
      },
      {
        q: 'الدفع',
        a: 'نقداً عند الاستلام، مع إمكانية استخدام رصيد المحفظة أو خصم النقاط قبل التأكيد.',
      },
      {
        q: 'متابعة الطلب',
        a: 'من صفحة "طلباتي" تتابع الحالة: قيد التحضير ← في الطريق ← تم التسليم.',
      },
      {
        q: 'إلغاء أو تعديل الطلب',
        a: 'تواصل مع الدعم بأسرع وقت وهو "قيد التحضير". خلال أول ١٥ دقيقة تقدر تضيف غرض نسيته من زر "أضف للطلب".',
      },
    ],
  },
  {
    title: 'الموقع والبحث',
    items: [
      {
        q: 'أقرب المتاجر',
        a: 'إذا سمحت بخدمة الموقع، تظهر المتاجر مرتبة من الأقرب إليك مع المسافة.',
      },
      {
        q: 'البحث عن سلعة',
        a: 'من الرئيسية اضغط "بحث عن سلعة" واكتب اسمها، تظهر المتاجر المتوفرة عندها مرتبة بالأقرب مع السعر والرقم.',
      },
    ],
  },
  {
    title: 'الحساب',
    items: [
      {
        q: 'تسجيل الدخول',
        a: 'أدخل رقم موبايلك، يوصلك رمز تحقق على واتساب، تدخله وتصير داخل حسابك.',
      },
      {
        q: 'ما وصلني الرمز',
        a: 'تأكد أن واتساب فعّال على نفس الرقم وأعد الطلب بعد قليل. إذا استمرت المشكلة تواصل مع الدعم.',
      },
      {
        q: 'عنوان التوصيل',
        a: 'حدد موقعك على الخريطة واحفظه من صفحة العناوين، وتقدر تغيّره وقت ما تريد.',
      },
    ],
  },
  {
    title: 'النقاط والمحفظة',
    items: [
      {
        q: 'نقاط الولاء',
        a: 'نقطة عن كل وحدة تشتريها، وعند ١٠٠ نقطة تستبدلها بخصم ٢٠٠٠ دينار أو توصيل سريع مجاني.',
      },
      {
        q: 'المحفظة',
        a: 'رصيد المحفظة لكل متجر على حدة (من تعويضات ذلك المتجر)، ويُستخدم عند الشراء من نفس المتجر. رصيد الدعوات عام ويُستخدم بأي متجر.',
      },
      {
        q: 'سلعة فيها خلل',
        a: 'إذا فعّل المتجر الخاصية، يظهر زر "البضاعة بيها خلل؟" على الطلب المُسلَّم. اختر السلعة وأرفق صورة، ويراجعها التاجر ويحدد التعويض لرصيد محفظتك من ذلك المتجر.',
      },
      {
        q: 'دعوة الأصدقاء',
        a: 'شارك رمزك من صفحة حسابك، وعند استخدام صديقك للرمز يوصل كل واحد منكم ١٠٠٠ دينار رصيد.',
      },
    ],
  },
  {
    title: 'للتجّار',
    items: [
      {
        q: 'تسجيل متجر',
        a: 'من حسابك افتح "تسجيل متجر"، عبّي البيانات وحدد نوع الاشتراك والموقع وارفع صورة، وبعد الإرسال راسل الإدارة على واتساب لدفع الاشتراك.',
      },
      {
        q: 'المندوبون وحالة الطلب',
        a: 'من لوحة متجرك تضيف المندوبين وترسل لهم الطلبات على واتساب، وتحدّث حالة كل طلب، وتتحكم بخاصية التعويض من الإعدادات.',
      },
    ],
  },
];

export default function HelpScreen() {
  const colors = useColors();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.contactRow}>
        <Pressable
          onPress={() => Linking.openURL('https://wa.me/9647731355623')}
          style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={[styles.iconCircle, { backgroundColor: colors.secondary }]}>
            <Feather name="message-circle" size={18} color={colors.primary} />
          </View>
          <Text style={[styles.contactLabel, { color: colors.foreground }]}>واتساب</Text>
        </Pressable>
        <Pressable
          onPress={() => Linking.openURL('tel:+9647731355623')}
          style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={[styles.iconCircle, { backgroundColor: colors.secondary }]}>
            <Feather name="phone-call" size={18} color={colors.primary} />
          </View>
          <Text style={[styles.contactLabel, { color: colors.foreground }]}>اتصال مباشر</Text>
        </Pressable>
      </View>

      {SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{section.title}</Text>
          <View style={styles.faqList}>
            {section.items.map((item) => (
              <View
                key={item.q}
                style={[styles.faqCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Text style={[styles.faqQ, { color: colors.foreground }]}>{item.q}</Text>
                <Text style={[styles.faqA, { color: colors.mutedForeground }]}>{item.a}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 24,
  },
  contactRow: {
    flexDirection: 'row-reverse',
    gap: 12,
  },
  contactCard: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    textAlign: 'right',
  },
  faqList: {
    gap: 10,
  },
  faqCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  faqQ: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    textAlign: 'right',
  },
  faqA: {
    fontFamily: fonts.regular,
    fontSize: 12,
    textAlign: 'right',
    lineHeight: 20,
  },
});
