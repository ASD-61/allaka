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
        q: 'شلون أطلب من عـلاّكـة؟',
        a: 'تصفح المنتجات من الصفحة الرئيسية، أضف الي تريده إلى السلة، بعدها افتح السلة، اختر نوع التوصيل ووقته وأكمل الطلب. توصلك السلعة على العنوان الي محدده.',
      },
      {
        q: 'شنو أنواع التوصيل وأسعارها؟',
        a: 'التوصيل العادي بـ ٢٠٠٠ دينار ويوصل خلال ساعة. التوصيل السريع بـ ٣٠٠٠ دينار ويوصل خلال نص ساعة تقريباً.',
      },
      {
        q: 'شلون أدفع؟',
        a: 'الدفع نقداً عند استلام الطلب. تكدر تستخدم رصيد محفظتك أو خصم النقاط لتقليل المبلغ قبل ما تأكد الطلب.',
      },
      {
        q: 'شلون أحدد وقت التوصيل؟',
        a: 'وكت تأكيد الطلب تكدر تختار وقت الاستلام المناسب إلك (مثلاً اليوم عصراً أو غداً صباحاً) حتى يوصلك بالوقت الي يناسبك.',
      },
      {
        q: 'شلون أتابع حالة طلبي؟',
        a: 'افتح صفحة "الطلبات" وراح تشوف حالة كل طلب، من "قيد التحضير" لحد ما يوصلك ويصير "تم التسليم".',
      },
      {
        q: 'أگدر ألغي أو أعدل طلبي؟',
        a: 'إذا الطلب بعده "قيد التحضير" تواصل ويانا بأسرع وقت عبر واتساب أو الاتصال ونساعدك. بعد ما يخرج للتوصيل يصير صعب التعديل.',
      },
      {
        q: 'أگدر أعيد طلب سابق؟',
        a: 'إي، من صفحة الطلبات تكدر تعيد أي طلب سابق بضغطة وحدة، فتنضاف نفس السلع للسلة بسرعة.',
      },
    ],
  },
  {
    title: 'الحساب وتسجيل الدخول',
    items: [
      {
        q: 'شلون أسوي حساب أو أسجل دخول؟',
        a: 'تدخل رقم موبايلك، ويوصلك رمز تحقق عبر واتساب، تدخل الرمز وتصير داخل حسابك. رقم الموبايل هو مفتاح حسابك.',
      },
      {
        q: 'شلون أحدد أو أغير عنوان التوصيل؟',
        a: 'تكدر تحدد موقعك على الخريطة وتحفظ عنوانك حتى يوصلك الطلب بدون لبس. تكدر تغيره وكت ما تريد.',
      },
    ],
  },
  {
    title: 'النقاط والمحفظة والتعويض',
    items: [
      {
        q: 'شلون أكسب نقاط الولاء؟',
        a: 'تحصل على نقطة عن كل وحدة تشتريها. لمن توصل ١٠٠ نقطة تكدر تستبدلها بخصم ٢٠٠٠ دينار أو توصيل سريع مجاني.',
      },
      {
        q: 'شنو محفظتي وشلون أستخدم رصيدها؟',
        a: 'المحفظة تجمع رصيدك من التعويضات الي توافق عليها المحل. تكدر تستخدم الرصيد لتقليل مبلغ أي طلب جاي عند الدفع.',
      },
      {
        q: 'وصلتني سلعة بيها خلل، شنو أسوي؟',
        a: 'من الطلب المُسلَّم اضغط زر التعويض، اختر السلعة التالفة وأرفق صورة واضحة للخلل. راح توصل الصورة للتاجر وهو يراجعها ويقرر الموافقة ويحدد مبلغ التعويض (كامل أو جزء منه) الي ينضاف لرصيد محفظتك.',
      },
    ],
  },
  {
    title: 'الأقسام والعروض',
    items: [
      {
        q: 'شنو قسم الجملة؟',
        a: 'قسم مخصص لأسعار الجملة للي يريد يشتري كميات أكبر بسعر أوفر.',
      },
      {
        q: 'شنو قسم التصفية والعروض؟',
        a: 'قسم يعرض السلع المخفّضة والعروض الخاصة، فتلگه أسعار مميزة على منتجات مختارة.',
      },
      {
        q: 'شنو المنتجات المحلية والوصفات؟',
        a: 'المنتجات المحلية تجمعلك منتجات المنطقة الطازجة، وقسم الوصفات يقترحلك أفكار أكلات ويساعدك تجمع مكوّناتها بالسلة بسرعة.',
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
