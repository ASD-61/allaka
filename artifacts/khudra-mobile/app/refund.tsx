import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image as RNImage, ActivityIndicator, TextInput, ScrollView } from 'react-native';
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

const MAX_IMAGES = 6;

export default function RefundScreen() {
  const { orderId, items } = useLocalSearchParams();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const createRefund = useCreateRefund();
  const requestUploadUrl = useRequestUploadUrl();
  
  const parsedItems = items ? JSON.parse(items as string) : [];
  
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [images, setImages] = useState<PickedImage[]>([]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  
  const handleAddImage = () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert('الحد الأقصى', `يمكنك إرفاق حتى ${MAX_IMAGES} صور.`);
      return;
    }
    Alert.alert('صورة الخلل', 'اختر مصدر الصورة', [
      {
        text: 'التقاط بالكاميرا',
        onPress: async () => {
          const picked = await takePhoto();
          if (picked) setImages((prev) => [...prev, picked]);
        },
      },
      {
        text: 'اختيار من المعرض',
        onPress: async () => {
          const picked = await pickImage();
          if (picked) setImages((prev) => [...prev, picked]);
        },
      },
      { text: 'إلغاء', style: 'cancel' },
    ]);
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };
  
  const handleSubmit = async () => {
    if (!selectedItem || images.length === 0) {
      Alert.alert('تنبيه', 'يرجى اختيار المنتج التالف وإرفاق صورة واحدة على الأقل للخلل.');
      return;
    }
    
    setSubmitting(true);
    try {
      const imageUrls: string[] = [];
      for (const img of images) {
        imageUrls.push(await uploadPickedImage(img, requestUploadUrl.mutateAsync));
      }
      await createRefund.mutateAsync({
        data: {
          orderId: Number(orderId),
          productName: selectedItem.name,
          imageUrl: imageUrls[0],
          imageUrls,
          note: note.trim() || undefined,
        } as any
      });

      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });

      Alert.alert(
        'تم إرسال الطلب',
        'استلمنا صورك وراح يراجعها التاجر. راح يوصلك إشعار داخل التطبيق بنتيجة التعويض (قبول مع المبلغ أو رفض مع السبب).'
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
      
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          اختر السلعة التالفة وأرفق صور واضحة للخلل (تكدر تضيف أكثر من صورة) واكتب ملاحظتك. راح يراجعها التاجر ويحدد مبلغ التعويض المناسب.
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
        
        <Text style={[styles.label, { color: colors.foreground, marginTop: 24 }]}>صور الخلل ({images.length}/{MAX_IMAGES})</Text>
        <View style={styles.imageGrid}>
          {images.map((img, idx) => (
            <View key={img.uri + idx} style={[styles.thumbWrap, { borderColor: colors.border }]}>
              <Pressable onPress={() => setViewerUri(img.uri)} style={{ flex: 1 }}>
                <RNImage source={{ uri: img.uri }} style={styles.thumb} />
              </Pressable>
              <Pressable onPress={() => removeImage(idx)} style={styles.thumbRemove} hitSlop={6}>
                <Feather name="x" size={14} color="#fff" />
              </Pressable>
            </View>
          ))}
          {images.length < MAX_IMAGES ? (
            <Pressable
              onPress={handleAddImage}
              style={[styles.addTile, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Feather name="camera" size={26} color={colors.mutedForeground} />
              <Text style={[styles.addTileText, { color: colors.mutedForeground }]}>إضافة صورة</Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={[styles.label, { color: colors.foreground, marginTop: 24 }]}>ملاحظة (اختياري)</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={1000}
          placeholder="اكتب تفاصيل الخلل، مثال: المنتج منتهي الصلاحية أو مكسور…"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.noteInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
          textAlign="right"
          textAlignVertical="top"
        />
        
        <Pressable 
          onPress={handleSubmit} 
          disabled={submitting} 
          style={[styles.btn, { backgroundColor: colors.primary, marginTop: 24, marginBottom: 20 }]}
        >
          {submitting ? <ActivityIndicator color={colors.primaryForeground} /> : (
            <Text style={[styles.btnText, { color: colors.primaryForeground }]}>تقديم طلب التعويض</Text>
          )}
        </Pressable>
      </ScrollView>

      <ImageViewerModal
        uri={viewerUri}
        visible={viewerUri != null}
        onClose={() => setViewerUri(null)}
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
  imageGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
  thumbWrap: { width: 90, height: 90, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  thumb: { width: '100%', height: '100%', resizeMode: 'cover' },
  thumbRemove: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  addTile: {
    width: 90,
    height: 90,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addTileText: { fontFamily: fonts.medium, fontSize: 11 },
  noteInput: {
    minHeight: 90,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  btn: { height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: fonts.bold, fontSize: 16 }
});
