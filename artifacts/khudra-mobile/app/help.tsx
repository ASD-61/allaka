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
        a: 'اختر نوع المتجر من الشاشة الرئيسية، ادخل على المتجر، أضف المنتجات إلى السلة، ثم افتح "السلة"، حدّد نوع التوصيل ووقت الاستلام، وأكمل الطلب.',
      },
      {
        q: 'أنواع التوصيل',
        a: 'توصيل عادي، وتوصيل سريع، أو تحديد وقت استلام مخصص يناسبك. تظهر رسوم التوصيل ووقته قبل تأكيد الطلب.',
      },
      {
        q: 'طريقة الدفع',
        a: 'الدفع نقداً عند الاستلام. وقبل التأكيد يمكنك استخدام رصيد محفظتك أو استبدال نقاطك في نفس المتجر للحصول على خصم أو توصيل مجاني.',
      },
      {
        q: 'متابعة حالة الطلب',
        a: 'من صفحة "طلباتي" تتابع طلبك مرحلة بمرحلة: قيد التحضير ← في الطريق ← تم التسليم، ويصلك إشعار عند تسليم الطلب من المتجر.',
      },
      {
        q: 'كتابة ملاحظة على الطلب',
        a: 'عند إتمام الطلب يمكنك إضافة ملاحظة اختيارية للتاجر (مثل: اتصل قبل الوصول)، وتصل الملاحظة مع تفاصيل طلبك مباشرة.',
      },
    ],
  },
  {
    title: '٢) العثور على المتاجر والبحث',
    items: [
      {
        q: 'أقرب المتاجر إليّ',
        a: 'عند السماح بخدمة الموقع تظهر المتاجر مرتّبة من الأقرب إليك مع عرض المسافة، لتختار الأنسب والأسرع.',
      },
      {
        q: 'البحث عن سلعة معيّنة',
        a: 'اضغط "ابحث عن متجر" أو ابحث باسم السلعة، فتظهر المتاجر التي توفّرها مرتّبة بالأقرب مع السعر ورقم المتجر وموقعه.',
      },
      {
        q: 'متابعة متجر مفضّل',
        a: 'ادخل على المتجر واضغط "متابعة"، فتُجمع متاجرك في مكان واحد وتصلك عروضها وإشعاراتها.',
      },
      {
        q: 'مشاركة منتج مع صديق',
        a: 'اضغط ضغطة مطوّلة على أي منتج (أو من صفحة المنتج اضغط زر المشاركة) لإرسال رابطه عبر واتساب. عند فتح الرابط يفتح التطبيق مباشرة على نفس المنتج.',
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
        a: 'تأكد أن واتساب مفعّل على نفس الرقم وأعد المحاولة بعد قليل، وإن استمرت المشكلة تواصل مع الدعم عبر الأزرار أعلى الصفحة.',
      },
      {
        q: 'عنوان التوصيل وموقعي',
        a: 'حدّد موقعك على الخريطة واحفظه من صفحة العناوين، ويمكنك تعديله في أي وقت. يُرسَل موقعك مع الطلب ليصل التوصيل بسهولة.',
      },
    ],
  },
  {
    title: '٤) النقاط والمحفظة والتقييم',
    items: [
      {
        q: 'نقاط الولاء (لكل متجر)',
        a: 'تجمع نقاطاً مستقلة لكل متجر تشتري منه. عند وصولك إلى ١٠٠ نقطة في متجر معيّن تستبدلها — عند الشراء من نفس المتجر — بخصم أو توصيل سريع مجاني.',
      },
      {
        q: 'رصيد المحفظة',
        a: 'لكل متجر رصيد محفظة خاص به يتكوّن من تعويضاته ويُستخدم عند الشراء منه. أما رصيد الدعوات فهو عام ويُستخدم في أي متجر.',
      },
      {
        q: 'دعوة الأصدقاء',
        a: 'شارك رمز الدعوة من صفحة حسابك؛ عند استخدام صديقك للرمز يحصل كل منكما على رصيد يُضاف تلقائياً للمحفظة.',
      },
      {
        q: 'تقييم المتجر',
        a: 'بعد استلام طلبك يمكنك تقييم المتجر بالنجوم من صفحة الطلب أو من رابط التقييم الذي يصلك. تظهر تقييماتك للزبائن الآخرين على صفحة المتجر.',
      },
      {
        q: 'استلمت سلعة فيها خلل',
        a: 'إذا فعّل المتجر هذه الخاصية يظهر زر "البضاعة بيها خلل؟" على الطلب المُسلَّم. اختر السلعة، أرفق صوراً واكتب ملاحظتك؛ يراجعها التاجر ويعتمد تعويضاً يُضاف لمحفظتك في ذلك المتجر أو يرفضه مع ذكر السبب، ويصلك إشعار بالنتيجة.',
      },
    ],
  },
  {
    title: '٥) إدارة المتاجر (للتجّار)',
    items: [
      {
        q: 'تسجيل متجر جديد وتجربة مجانية',
        a: 'من حسابك افتح "تسجيل متجر"، اختر النوع، عبّئ البيانات وحدّد الموقع وارفع صورة. يمكنك بدء تجربة مجانية ١٠ أيام (لمتجرين كحد أقصى لكل رقم)، أو إرسال طلب اشتراك دائم ثم مراسلة الإدارة على واتساب لدفع الرسوم إلكترونياً.',
      },
      {
        q: 'إدارة المنتجات والفئات',
        a: 'أضف المنتجات مع السعر والوحدة وعدة صور، وأنشئ فئاتك الخاصة، وحدّد أسعار الجملة والعروض وقسم التصفية وسعراً خاصاً (مثل: ٣ قطع بسعر)، وعلّم نفاد الكمية.',
      },
      {
        q: 'التوصيل والمندوبون',
        a: 'أضف مندوبيك من تبويب "المندوبين" واطلب توثيق بياناتهم (صورة شخصية وبطاقة)، وأرسل لهم الطلب على واتساب بضغطة واحدة مع تفاصيله وموقع الزبون، وتابع من هو متاح.',
      },
      {
        q: 'حالة الطلب والإشعارات',
        a: 'حدّث حالة كل طلب (قيد التحضير / في الطريق / تم التسليم)، وأرسل إشعارات لعملاء متجرك، وتحكّم بخاصية التعويضات من الإعدادات.',
      },
    ],
  },
  {
    title: '٦) نظام التوصيل (للمندوبين)',
    items: [
      {
        q: 'لوحة تحكم المندوب',
        a: 'يصل المندوب رابطاً خاصاً من التاجر يفتح لوحته: يتحكم بحالة توفّره، ويرى الطلبات المتاحة وموقع الزبون، وأرباح اليوم وعدد الطلبات المُسلَّمة، وقائمة المتاجر التي يعمل معها.',
      },
      {
        q: 'تسليم الطلب',
        a: 'يعلّم المندوب الطلب "في الطريق" ثم "تم التسليم" من لوحته، فيصل إشعار للتاجر والزبون تلقائياً مع دعوة الزبون لتقييم المتجر.',
      },
    ],
  },
  {
    title: '٧) معلومات تهمّك',
    items: [
      {
        q: 'التطبيق يعمل بدون إنترنت',
        a: 'يحفظ التطبيق المتاجر والمنتجات التي زرتها، فتظهر فوراً حتى عند ضعف الشبكة. تظهر رسالة عند انقطاع الإنترنت وأخرى عند عودته، وتبقى بياناتك محفوظة.',
      },
      {
        q: 'تحديثات التطبيق',
        a: 'يُحدَّث التطبيق تلقائياً عند توفّر نسخة جديدة، ويصلك إشعار داخل التطبيق بذلك — دون الحاجة لإعادة التثبيت يدوياً في أغلب الأحيان.',
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
