import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';

type Faq = { q: string; a: string };
type FaqSection = { title: string; items: Faq[] };

const SECTIONS: FaqSection[] = [
  {
    title: '١) طريقة الشراء والطلب',
    items: [
      {
        q: 'كيف أطلب من المتجر؟',
        a: 'اختر نوع المتجر من الشاشة الرئيسية، ادخل على المتجر المناسب، أضف المنتجات إلى السلة، ثم افتح "السلة" وحدّد نوع التوصيل ووقت الاستلام وأكمل الطلب.',
      },
      {
        q: 'أنواع التوصيل وأسعاره',
        a: 'توصيل عادي: ٢٠٠٠ دينار خلال ساعة تقريباً. توصيل سريع: ٣٠٠٠ دينار خلال نصف ساعة. كما يمكنك تحديد وقت استلام مخصص يناسبك.',
      },
      {
        q: 'طريقة الدفع',
        a: 'الدفع نقداً عند الاستلام. ويمكنك قبل التأكيد استخدام رصيد محفظتك في المتجر أو استبدال نقاطك للحصول على خصم أو توصيل مجاني.',
      },
      {
        q: 'متابعة حالة الطلب',
        a: 'من صفحة "طلباتي" تتابع طلبك مرحلة بمرحلة: قيد التحضير ← في الطريق ← تم التسليم. ويصلك إشعار عند تسليم الطلب من المتجر.',
      },
      {
        q: 'إضافة غرض نسيته أو التعديل',
        a: 'خلال أول ١٥ دقيقة من الطلب وطالما هو "قيد التحضير"، تقدر تضيف غرضاً نسيته من زر "أضف للطلب" بدون رسوم توصيل إضافية. للإلغاء تواصل مع الدعم بسرعة.',
      },
    ],
  },
  {
    title: '٢) العثور على المتاجر والبحث',
    items: [
      {
        q: 'أقرب المتاجر إليّ',
        a: 'عند السماح بخدمة الموقع، تظهر المتاجر مرتبة من الأقرب إليك مع عرض المسافة، لتختار الأنسب والأسرع للتوصيل.',
      },
      {
        q: 'البحث عن سلعة معيّنة',
        a: 'من الشاشة الرئيسية اضغط "ابحث عن متجر" أو ابحث عن سلعة، فتظهر المتاجر التي توفّرها مرتبة بالأقرب مع السعر ورقم المتجر وموقعه.',
      },
      {
        q: 'متابعة متجر مفضّل',
        a: 'ادخل على المتجر واضغط "متابعة"، فتُضاف المتاجر التي تتابعها في مكان واحد لتصل إليها بسرعة وتصلك إشعاراتها وعروضها.',
      },
    ],
  },
  {
    title: '٣) الحساب وتسجيل الدخول',
    items: [
      {
        q: 'كيف أسجّل الدخول؟',
        a: 'أدخل رقم موبايلك، يصلك رمز تحقق عبر واتساب، أدخله لتدخل حسابك مباشرة — بدون كلمة مرور.',
      },
      {
        q: 'لم يصلني رمز التحقق',
        a: 'تأكد أن واتساب مفعّل على نفس الرقم وأعد المحاولة بعد قليل. إذا استمرت المشكلة تواصل مع الدعم عبر الأزرار في أعلى الصفحة.',
      },
      {
        q: 'عنوان التوصيل وموقعي',
        a: 'حدّد موقعك على الخريطة واحفظه من صفحة العناوين، ويمكنك تعديله في أي وقت. يُرسَل موقعك مع الطلب ليصل التوصيل بسهولة.',
      },
    ],
  },
  {
    title: '٤) النقاط والمحفظة والتعويضات',
    items: [
      {
        q: 'نقاط الولاء (لكل متجر)',
        a: 'تجمع نقاطاً مستقلة لكل متجر تشتري منه (نقطة عن كل وحدة شراء). عند وصولك إلى ١٠٠ نقطة في متجر معيّن، تستبدلها عند الشراء من نفس المتجر بخصم ٢٠٠٠ دينار أو توصيل سريع مجاني.',
      },
      {
        q: 'رصيد المحفظة',
        a: 'لكل متجر رصيد محفظة خاص به يتكوّن من تعويضات ذلك المتجر، ويُستخدم عند الشراء منه. أما رصيد الدعوات فهو عام ويُستخدم في أي متجر.',
      },
      {
        q: 'استلمت سلعة فيها خلل',
        a: 'إذا فعّل المتجر هذه الخاصية، يظهر زر "البضاعة بيها خلل؟" على الطلب المُسلَّم. اختر السلعة، أرفق صوراً واكتب ملاحظتك؛ يراجعها التاجر ويوافق على تعويض يُضاف لرصيد محفظتك في ذلك المتجر، أو يرفضه مع ذكر السبب — ويصلك إشعار بالنتيجة.',
      },
      {
        q: 'دعوة الأصدقاء',
        a: 'شارك رمز الدعوة من صفحة حسابك. عند استخدام صديقك للرمز يحصل كل منكما على ١٠٠٠ دينار رصيد يُضاف تلقائياً للمحفظة.',
      },
    ],
  },
  {
    title: '٥) إدارة المتاجر (للتجّار)',
    items: [
      {
        q: 'تسجيل متجر جديد',
        a: 'من حسابك افتح "تسجيل متجر"، اختر نوع المتجر من القائمة، عبّئ البيانات وحدّد الموقع وارفع صورة واختر مدة الاشتراك. بعد الإرسال يظهر زر لمراسلة الإدارة على واتساب لدفع رسوم الاشتراك إلكترونياً.',
      },
      {
        q: 'إدارة المنتجات والفئات',
        a: 'من لوحة متجرك تضيف المنتجات مع السعر والوحدة (مع أزرار وحدات سريعة تناسب نوع متجرك)، وتنشئ فئاتك الخاصة، وتحدّد أسعار الجملة، والعروض، وقسم التصفية، وتعلّم نفاد الكمية.',
      },
      {
        q: 'التوصيل والمندوبون',
        a: 'تضيف مندوبي التوصيل من تبويب "المندوبين"، وتُرسل لهم الطلب على واتساب بضغطة واحدة مع تفاصيله وموقع الزبون، وتتابع من هو متاح ومن هو مشغول.',
      },
      {
        q: 'حالة الطلب والإشعارات',
        a: 'تحدّث حالة كل طلب (قيد التحضير / في الطريق / تم التسليم)، وترسل إشعارات لعملاء متجرك، وتتحكم بخاصية التعويضات من الإعدادات.',
      },
    ],
  },
  {
    title: '٦) نظام التوصيل (للمندوبين)',
    items: [
      {
        q: 'لوحة تحكم المندوب',
        a: 'يصل المندوب رابطاً خاصاً به من التاجر يفتح لوحة تحكمه: يتحكم بحالة توفّره اليوم، ويرى الطلبات المتاحة وتفاصيلها وموقع الزبون، وأرباح اليوم وعدد الطلبات المُسلَّمة، وقائمة المتاجر التي يعمل معها.',
      },
      {
        q: 'تسليم الطلب',
        a: 'يعلّم المندوب الطلب "في الطريق" ثم "تم التسليم" من لوحته، فيصل إشعار للتاجر والزبون تلقائياً مع دعوة الزبون لتقييم المتجر.',
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
      <View style={[styles.introCard, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
        <Text style={[styles.introTitle, { color: colors.foreground }]}>مرحباً بك في عـلاّكـة</Text>
        <Text style={[styles.introText, { color: colors.mutedForeground }]}>
          منصّة تجمع متاجرك المحلية في مكان واحد: تتصفّح المتاجر القريبة منك، تطلب منتجاتها ويوصلها المندوب إلى بابك.
          هذه الصفحة تشرح كل ميزات التطبيق للزبون والتاجر والمندوب. لأي استفسار تواصل معنا مباشرة عبر الأزرار أدناه.
        </Text>
      </View>

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
  introCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  introTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    textAlign: 'right',
  },
  introText: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    lineHeight: 21,
    textAlign: 'right',
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
