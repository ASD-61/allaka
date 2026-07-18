import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image as RNImage, ActivityIndicator } from 'react-native';
import { Alert } from '@/lib/alert';
import { useLocalSearchParams, router } from 'expo-router';
import { useCreateRefund, useRequestUploadUrl } from '@workspace/api-client-react';
import { queryClient } from '@/lib/query-client';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { Feather } from '@expo/vector-icons';
import { pickImage, takePhoto, uploadPickedImage } from '@/lib/upload';
import type { PickedImage } from '@/lib/upload';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ImageViewerModal } from '@/components/ImageViewerModal';

export default function RefundScreen() {
  const { orderId, items } = useLocalSearchParams();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const createRefund = useCreateRefund();
  const requestUploadUrl = useRequestUploadUrl();
  
  const parsedItems = items ? JSON.parse(items as string) : [];
  
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [image, setImage] = useState<PickedImage | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  
  const handleAddImage = () => {
    Alert.alert('صورة الخلل', 'اختر مصدر الصورة', [
      {
        text: 'التقاط بالكاميرا',
        onPress: async () => {
          const picked = await takePhoto();
          if (picked) setImage(picked);
        },
      },
      {
        text: 'اختيار من المعرض',
        onPress: async () => {
          const picked = await pickImage();
          if (picked) setImage(picked);
        },
      },
      { text: 'إلغاء', style: 'cancel' },
    ]);
  };
  
  const handleSubmit = async () => {
    if (!selectedItem || !image) {
      Alert.alert('تنبيه', 'يرجى اختيار المنتج التالف وإرفاق صورة للخلل.');
      return;
    }
    
    setSubmitting(true);
    try {
      const imageUrl = await uploadPickedImage(image, requestUploadUrl.mutateAsync);
      await createRefund.mutateAsync({
        data: {
          orderId: Number(orderId),
          productName: selectedItem.name,
          imageUrl,
        }
      });

      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });

      Alert.alert(
        'تم إرسال الطلب',
        'استلمنا صورتك وراح يراجعها التاجر. إذا تمت الموافقة يضاف مبلغ التعويض إلى رصيد محفظتك ونعلمك بالنتيجة.'
      );
      router.back();
    } catch (err: any) {
      Alert.alert('تعذر تقديم الطلب', err?.data?.error || 'حدث خطأ، يرجى المحاولة لاحقاً');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Feather name="chevron-right" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>تعويض الجودة</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          اختر السلعة التالفة وأرفق صورة واضحة للخلل. راح يراجعها التاجر ويحدد مبلغ التعويض المناسب.
        </Text>
        <Text style={[styles.label, { color: colors.foreground }]}>يا غرض بي خلل؟</Text>
        <View style={styles.itemsRow}>
          {parsedItems.map((item: any) => (
            <Pressable
              key={item.id}
              onPress={() => setSelectedItem(item)}
              style={[
                styles.itemChip,
                { 
                  backgroundColor: selectedItem?.id === item.id ? colors.primary : colors.card,
                  borderColor: selectedItem?.id === item.id ? colors.primary : colors.border
                }
              ]}
            >
              <Text style={[styles.itemText, { color: selectedItem?.id === item.id ? colors.primaryForeground : colors.foreground }]}>
                {item.name}
              </Text>
            </Pressable>
          ))}
        </View>
        
        <Text style={[styles.label, { color: colors.foreground, marginTop: 24 }]}>صورة للخلل</Text>
        <Pressable 
          onPress={image ? () => setViewerOpen(true) : handleAddImage}
          style={[styles.imageUpload, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          {image ? (
            <>
              <RNImage source={{ uri: image.uri }} style={styles.imagePreview} />
              <View style={styles.expandHint}>
                <Feather name="maximize-2" size={16} color="#fff" />
              </View>
            </>
          ) : (
            <View style={styles.uploadPlaceholder}>
              <Feather name="camera" size={32} color={colors.mutedForeground} />
              <Text style={[styles.uploadText, { color: colors.mutedForeground }]}>اضغط لالتقاط صورة بالكاميرا أو اختيارها من المعرض</Text>
            </View>
          )}
        </Pressable>
        {image ? (
          <Pressable onPress={handleAddImage} style={styles.changeImageBtn} hitSlop={6}>
            <Feather name="refresh-ccw" size={14} color={colors.primary} />
            <Text style={[styles.changeImageText, { color: colors.primary }]}>تغيير الصورة</Text>
          </Pressable>
        ) : null}
        
        <Pressable 
          onPress={handleSubmit} 
          disabled={submitting} 
          style={[styles.btn, { backgroundColor: colors.primary, marginTop: 'auto', marginBottom: 20 }]}
        >
          {submitting ? <ActivityIndicator color={colors.primaryForeground} /> : (
            <Text style={[styles.btnText, { color: colors.primaryForeground }]}>تقديم طلب التعويض</Text>
          )}
        </Pressable>
      </View>

      <ImageViewerModal
        uri={image?.uri ?? null}
        visible={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  title: { fontFamily: fonts.bold, fontSize: 18 },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  hint: { fontFamily: fonts.regular, fontSize: 13, textAlign: 'right', lineHeight: 20, marginBottom: 18 },
  label: { fontFamily: fonts.semibold, fontSize: 16, textAlign: 'right', marginBottom: 12 },
  itemsRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
  itemChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, borderWidth: 1 },
  itemText: { fontFamily: fonts.medium, fontSize: 14 },
  imageUpload: { height: 200, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', overflow: 'hidden' },
  uploadPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 20 },
  uploadText: { fontFamily: fonts.medium, fontSize: 14, textAlign: 'center' },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  expandHint: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  changeImageBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 6,
    marginTop: 10,
  },
  changeImageText: { fontFamily: fonts.semibold, fontSize: 13 },
  btn: { height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: fonts.bold, fontSize: 16 }
});
