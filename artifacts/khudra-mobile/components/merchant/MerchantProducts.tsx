import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { Alert } from '@/lib/alert';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import {
  useListProducts,
  useListCategories,
  useListMyStores,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useRequestUploadUrl,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { formatIQD } from '@/lib/format';
import { resolveImageUrl } from '@/lib/image-url';
import { pickImageWithChoice, uploadPickedImage } from '@/lib/upload';
import { EmptyState } from '@/components/EmptyState';

// Quick-pick unit suggestions that adapt to the kind of store. The merchant can
// still type any unit freely; these are just one-tap shortcuts. Matching is by
// keyword so free-text store types ("خضار وفواكه", "محل ملابس", …) still map.
function quickUnitsForStoreType(storeType: string): string[] {
  const t = storeType || '';
  const has = (keywords: string[]) => keywords.some((k) => t.includes(k));
  // Groceries / produce / meat / fish → weight & bundle units.
  if (
    has(['خضار', 'فواكه', 'فاكهة', 'لحم', 'لحوم', 'دجاج', 'سمك', 'أسماك', 'اسماك', 'بقال', 'مواد', 'عطار', 'ألبان', 'البان', 'جبن'])
  ) {
    return ['كيلو', 'غرام', 'صندوق', 'باقة'];
  }
  // Electronics / clothes / accessories → piece / set / carton.
  if (
    has(['الكترون', 'إلكترون', 'ملاب', 'موبايل', 'هاتف', 'اكسسوار', 'إكسسوار', 'أحذية', 'احذية', 'حقائب', 'عطور', 'تجميل'])
  ) {
    return ['قطعة', 'سيت', 'كارتون'];
  }
  // Carpenter / blacksmith / everything else → length / piece / custom.
  return ['متر', 'قطعة', 'تفصيل'];
}

export function MerchantProducts({ storeId }: { storeId: number }) {
  const colors = useColors();
  const query = useListProducts({ storeId });
  // Only this store's own categories — never another merchant's.
  const categoriesQuery = useListCategories({ storeId });
  const myStores = useListMyStores();
  const storeType = myStores.data?.find((s) => s.id === storeId)?.storeType ?? '';
  const quickUnits = quickUnitsForStoreType(storeType);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const requestUploadUrl = useRequestUploadUrl();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('');
  const [priceNote, setPriceNote] = useState('');
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [inStock, setInStock] = useState(true);
  const [isLocal, setIsLocal] = useState(false);
  const [isClearance, setIsClearance] = useState(false);
  const [isWholesale, setIsWholesale] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [offerProductId, setOfferProductId] = useState<number | null>(null);
  const [offerPrice, setOfferPrice] = useState('');
  const [editProductId, setEditProductId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editImagePath, setEditImagePath] = useState<string | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editUploading, setEditUploading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editIsLocal, setEditIsLocal] = useState(false);
  const [editIsClearance, setEditIsClearance] = useState(false);
  const [editIsWholesale, setEditIsWholesale] = useState(false);
  const [editPriceNote, setEditPriceNote] = useState('');
  const [editWholesalePrice, setEditWholesalePrice] = useState('');

  const startEdit = (item: {
    id: number;
    name: string;
    category: string;
    price: number;
    originalPrice?: number | null;
    unit: string;
    isLocal?: boolean;
    isClearance?: boolean;
    isWholesale?: boolean;
    priceNote?: string | null;
    wholesalePrice?: number | null;
  }) => {
    setOfferProductId(null);
    setEditProductId(item.id);
    setEditName(item.name);
    setEditCategory(item.category);
    setEditPrice(String(item.originalPrice ?? item.price));
    setEditUnit(item.unit);
    setEditImagePath(null);
    setEditImagePreview(null);
    setEditIsLocal(!!item.isLocal);
    setEditIsClearance(!!item.isClearance);
    setEditIsWholesale(!!item.isWholesale);
    setEditPriceNote(item.priceNote ?? '');
    setEditWholesalePrice(item.wholesalePrice != null ? String(item.wholesalePrice) : '');
  };

  const renderFlag = (
    label: string,
    value: boolean,
    onToggle: () => void,
    icon: React.ComponentProps<typeof Feather>['name'],
  ) => (
    <Pressable
      onPress={onToggle}
      style={[styles.stockToggle, { backgroundColor: colors.muted, borderColor: colors.border }]}
    >
      <Feather name={icon} size={16} color={value ? colors.primary : colors.mutedForeground} />
      <Text style={[styles.toggleText, { color: colors.foreground }]}>{label}</Text>
      <Feather
        name={value ? 'toggle-right' : 'toggle-left'}
        size={24}
        color={value ? colors.primary : colors.mutedForeground}
        style={{ marginRight: 'auto' }}
      />
    </Pressable>
  );

  const handleEditPickImage = async () => {
    const picked = await pickImageWithChoice();
    if (!picked) return;
    setEditImagePreview(picked.uri);
    setEditUploading(true);
    try {
      const path = await uploadPickedImage(picked, (args) => requestUploadUrl.mutateAsync(args));
      setEditImagePath(path);
    } catch {
      Alert.alert('خطأ', 'تعذر رفع الصورة');
    } finally {
      setEditUploading(false);
    }
  };

  const handleSaveEdit = async (item: { id: number; price: number; originalPrice?: number | null }) => {
    const newBase = Math.round(Number(editPrice));
    if (!editName.trim() || !editCategory.trim() || !newBase || newBase <= 0) {
      Alert.alert('تنبيه', 'يرجى تعبئة الاسم والفئة والسعر');
      return;
    }
    const hasOffer = item.originalPrice != null && item.originalPrice > item.price;
    const data: Record<string, unknown> = {
      name: editName.trim(),
      category: editCategory.trim(),
      unit: editUnit.trim() || '1 كغم',
      isLocal: editIsLocal,
      isClearance: editIsClearance,
      isWholesale: editIsWholesale,
      priceNote: editPriceNote.trim() || null,
      wholesalePrice:
        editIsWholesale && editWholesalePrice.trim()
          ? Math.round(Number(editWholesalePrice))
          : null,
    };
    if (editImagePath) data.imageUrl = editImagePath;
    if (hasOffer) {
      if (newBase > item.price) {
        data.originalPrice = newBase;
        data.discountPercent = Math.round((1 - item.price / newBase) * 100);
      } else {
        data.price = newBase;
        data.originalPrice = null;
        data.discountPercent = null;
        data.discountExpiresAt = null;
      }
    } else {
      data.price = newBase;
    }
    setEditSaving(true);
    try {
      await updateProduct.mutateAsync({ id: item.id, data: data as any });
      setEditProductId(null);
      query.refetch();
    } catch (err: any) {
      Alert.alert('خطأ', err?.data?.error ?? 'تعذر حفظ التعديلات');
    } finally {
      setEditSaving(false);
    }
  };

  const handleToggleStock = (id: number, next: boolean) => {
    updateProduct.mutate(
      { id, data: { inStock: next } },
      {
        onSuccess: () => query.refetch(),
        onError: (err: any) => Alert.alert('خطأ', err?.data?.error ?? 'تعذر تحديث حالة التوفر'),
      },
    );
  };

  const handleApplyOffer = (item: { id: number; price: number; originalPrice?: number | null }) => {
    const newPrice = Math.round(Number(offerPrice));
    if (!newPrice || newPrice <= 0) {
      Alert.alert('تنبيه', 'أدخل سعر العرض');
      return;
    }
    const basePrice = item.originalPrice ?? item.price;
    if (newPrice >= basePrice) {
      Alert.alert('تنبيه', 'سعر العرض يجب أن يكون أقل من السعر الأصلي');
      return;
    }
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 0);
    updateProduct.mutate(
      {
        id: item.id,
        data: {
          price: newPrice,
          originalPrice: basePrice,
          discountPercent: Math.round((1 - newPrice / basePrice) * 100),
          discountExpiresAt: endOfDay.toISOString(),
        },
      },
      {
        onSuccess: () => {
          setOfferProductId(null);
          setOfferPrice('');
          query.refetch();
        },
        onError: (err: any) => Alert.alert('خطأ', err?.data?.error ?? 'تعذر تفعيل العرض'),
      },
    );
  };

  const handleCancelOffer = (item: { id: number; price: number; originalPrice?: number | null }) => {
    updateProduct.mutate(
      {
        id: item.id,
        data: {
          price: item.originalPrice ?? item.price,
          originalPrice: null,
          discountPercent: null,
          discountExpiresAt: null,
        },
      },
      {
        onSuccess: () => {
          setOfferProductId(null);
          setOfferPrice('');
          query.refetch();
        },
        onError: (err: any) => Alert.alert('خطأ', err?.data?.error ?? 'تعذر إلغاء العرض'),
      },
    );
  };

  const handlePickImage = async () => {
    const picked = await pickImageWithChoice();
    if (!picked) return;
    setImagePreview(picked.uri);
    setUploading(true);
    try {
      const path = await uploadPickedImage(picked, (args) => requestUploadUrl.mutateAsync(args));
      setImagePath(path);
    } catch {
      Alert.alert('خطأ', 'تعذر رفع الصورة');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setCategory('');
    setPrice('');
    setUnit('1 كغم');
    setPriceNote('');
    setWholesalePrice('');
    setImagePath(null);
    setImagePreview(null);
    setInStock(true);
    setIsLocal(false);
    setIsClearance(false);
    setIsWholesale(false);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !category.trim() || !price || !imagePath) {
      Alert.alert('تنبيه', 'يرجى تعبئة الاسم والفئة والسعر والصورة');
      return;
    }
    setSaving(true);
    try {
      await createProduct.mutateAsync({
        data: {
          storeId,
          name: name.trim(),
          category: category.trim(),
          price: Math.round(Number(price)),
          unit: unit.trim() || '1 كغم',
          imageUrl: imagePath,
          inStock,
          isLocal,
          isClearance,
          isWholesale,
          priceNote: priceNote.trim() || null,
          wholesalePrice:
            isWholesale && wholesalePrice.trim()
              ? Math.round(Number(wholesalePrice))
              : null,
        } as any,
      });
      resetForm();
      setShowForm(false);
      query.refetch();
    } catch (err: any) {
      Alert.alert('خطأ', err?.data?.error ?? 'تعذر حفظ المنتج');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FlatList
      data={query.data ?? []}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.listContent}
      ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
      ListHeaderComponent={
        <View style={{ marginBottom: 24 }}>
          <Pressable
            onPress={() => setShowForm((v) => !v)}
            style={[styles.addBtn, { backgroundColor: showForm ? colors.muted : colors.primary, borderColor: showForm ? colors.border : colors.primary }]}
          >
            <Feather name={showForm ? 'x' : 'plus'} size={20} color={showForm ? colors.foreground : colors.primaryForeground} />
            <Text style={[styles.addBtnText, { color: showForm ? colors.foreground : colors.primaryForeground }]}>
              {showForm ? 'إلغاء الإضافة' : 'إضافة منتج جديد'}
            </Text>
          </Pressable>

          {showForm ? (
            <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Pressable onPress={handlePickImage} style={[styles.imagePicker, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                {imagePreview ? (
                  <Image source={{ uri: imagePreview }} style={styles.previewImg} contentFit="cover" />
                ) : (
                  <View style={styles.imagePickerPlaceholder}>
                    <View style={[styles.iconCircle, { backgroundColor: colors.primary + '15' }]}>
                      <Feather name="camera" size={24} color={colors.primary} />
                    </View>
                    <Text style={[styles.imagePickerText, { color: colors.mutedForeground }]}>إضافة صورة للمنتج</Text>
                  </View>
                )}
                {uploading ? (
                  <View style={styles.uploadOverlay}>
                    <ActivityIndicator size="large" color="#fff" />
                  </View>
                ) : null}
              </Pressable>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>معلومات المنتج</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="اسم المنتج (مثال: طماطم كرزية)"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                  textAlign="right"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>الفئة</Text>
                <View style={styles.chipsWrap}>
                  {(categoriesQuery.data ?? []).map((c) => {
                    const isSelected = category === c.name;
                    return (
                      <Pressable
                        key={c.id}
                        onPress={() => setCategory(c.name)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.muted,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Text style={[styles.chipText, { color: isSelected ? colors.primaryForeground : colors.foreground }]}>
                          {c.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                  {(categoriesQuery.data ?? []).length === 0 ? (
                    <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                      لا توجد فئات متاحة حالياً
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.foreground }]}>السعر (د.ع)</Text>
                  <TextInput
                    value={price}
                    onChangeText={setPrice}
                    placeholder="مثال: 1500"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="number-pad"
                    style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                    textAlign="right"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.foreground }]}>الوحدة</Text>
                  <TextInput
                    value={unit}
                    onChangeText={setUnit}
                    placeholder="اكتب الوحدة"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                    textAlign="right"
                  />
                </View>
              </View>

              <View style={styles.unitQuickRow}>
                {quickUnits.map((u) => {
                  const active = unit.trim() === u;
                  return (
                    <Pressable
                      key={u}
                      onPress={() => setUnit(u)}
                      style={[
                        styles.unitQuickChip,
                        {
                          backgroundColor: active ? colors.primary : colors.muted,
                          borderColor: active ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.unitQuickChipText,
                          { color: active ? colors.primaryForeground : colors.foreground },
                        ]}
                      >
                        {u}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                onPress={() => setInStock((v) => !v)}
                style={[styles.stockToggle, { backgroundColor: colors.muted, borderColor: colors.border }]}
              >
                <View style={[styles.toggleIndicator, { backgroundColor: inStock ? colors.success : colors.destructive }]} />
                <Text style={[styles.toggleText, { color: colors.foreground }]}>
                  {inStock ? 'متوفر في المخزون' : 'نفذت الكمية'}
                </Text>
                <Feather
                  name={inStock ? 'toggle-right' : 'toggle-left'}
                  size={24}
                  color={inStock ? colors.success : colors.mutedForeground}
                  style={{ marginRight: 'auto' }}
                />
              </Pressable>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>سعر خاص (اختياري)</Text>
                <TextInput
                  value={priceNote}
                  onChangeText={setPriceNote}
                  placeholder="مثال: ٣ كيلو بـ٢٠٠٠ · الحبة بـ٢٥٠"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                  textAlign="right"
                />
                <Text style={[styles.editHint, { color: colors.mutedForeground }]}>
                  يظهر تحت السعر للزبون — لأي تسعيرة ما يعبّر عنها رقم واحد
                </Text>
              </View>

              {renderFlag('منتج محلي', isLocal, () => setIsLocal((v) => !v), 'map-pin')}
              {renderFlag('تصفية المحل (بيع نهاية اليوم)', isClearance, () => setIsClearance((v) => !v), 'zap')}
              {renderFlag('بيع بالجملة (گوني/صندوق)', isWholesale, () => setIsWholesale((v) => !v), 'box')}

              {isWholesale ? (
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.foreground }]}>سعر الجملة (د.ع)</Text>
                  <TextInput
                    value={wholesalePrice}
                    onChangeText={setWholesalePrice}
                    placeholder="سعر البيع بالجملة (گوني/صندوق)"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="number-pad"
                    style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                    textAlign="right"
                  />
                  <Text style={[styles.editHint, { color: colors.mutedForeground }]}>
                    يظهر بقسم الجملة بدل السعر العادي
                  </Text>
                </View>
              ) : null}

              <Pressable
                onPress={handleSubmit}
                disabled={saving || uploading}
                style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: saving || uploading ? 0.7 : 1 }]}
              >
                {saving ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <>
                    <Feather name="check" size={20} color={colors.primaryForeground} />
                    <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>حفظ المنتج</Text>
                  </>
                )}
              </Pressable>
            </View>
          ) : null}
        </View>
      }
      ListEmptyComponent={<EmptyState icon="package" title="لا توجد منتجات" subtitle="أضف أول منتج لمتجرك" />}
      renderItem={({ item }) => {
        const hasOffer = item.originalPrice != null && item.originalPrice > item.price;
        const isEditingOffer = offerProductId === item.id;

        return (
          <View style={[styles.productCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.productRow}>
              <View style={styles.actionsBox}>
                <Pressable
                  hitSlop={8}
                  onPress={() =>
                    Alert.alert('حذف المنتج', `هل تريد حذف "${item.name}"؟`, [
                      { text: 'إلغاء', style: 'cancel' },
                      {
                        text: 'حذف',
                        style: 'destructive',
                        onPress: () =>
                          deleteProduct.mutate(
                            { id: item.id },
                            {
                              onSuccess: () => query.refetch(),
                              onError: (err: any) => Alert.alert('خطأ', err?.data?.error ?? 'تعذر حذف المنتج'),
                            },
                          ),
                      },
                    ])
                  }
                  style={[styles.iconBtn, { backgroundColor: colors.destructive + '15' }]}
                >
                  <Feather name="trash-2" size={16} color={colors.destructive} />
                </Pressable>
                <Pressable
                  hitSlop={8}
                  onPress={() => (editProductId === item.id ? setEditProductId(null) : startEdit(item))}
                  style={[
                    styles.iconBtn,
                    { backgroundColor: editProductId === item.id ? colors.primary + '15' : colors.muted },
                  ]}
                >
                  <Feather name="edit-2" size={16} color={editProductId === item.id ? colors.primary : colors.mutedForeground} />
                </Pressable>
                <Pressable
                  hitSlop={8}
                  onPress={() => {
                    setEditProductId(null);
                    setOfferProductId(isEditingOffer ? null : item.id);
                    setOfferPrice('');
                  }}
                  style={[
                    styles.iconBtn,
                    { backgroundColor: hasOffer || isEditingOffer ? colors.warning + '15' : colors.muted },
                  ]}
                >
                  <Feather name="percent" size={16} color={hasOffer || isEditingOffer ? colors.warning : colors.mutedForeground} />
                </Pressable>
                <Pressable
                  hitSlop={8}
                  onPress={() => handleToggleStock(item.id, !item.inStock)}
                  style={[
                    styles.iconBtn,
                    { backgroundColor: item.inStock ? colors.success + '18' : colors.destructive + '18' },
                  ]}
                >
                  <Feather
                    name={item.inStock ? 'check-circle' : 'slash'}
                    size={16}
                    color={item.inStock ? colors.success : colors.destructive}
                  />
                </Pressable>
              </View>

              <View style={styles.infoBox}>
                <Text style={[styles.productName, { color: colors.foreground }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.productMeta, { color: colors.mutedForeground }]}>
                  {item.category} · {item.unit}
                </Text>
                <View style={styles.priceRow}>
                  <Text style={[styles.productPrice, { color: hasOffer ? colors.warning : colors.primary }]}>
                    {formatIQD(item.price)}
                  </Text>
                  {hasOffer && (
                    <Text style={[styles.oldPrice, { color: colors.mutedForeground }]}>
                      {formatIQD(item.originalPrice!)}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.thumbBox}>
                <Image source={{ uri: resolveImageUrl(item.imageUrl) }} style={styles.thumbImg} contentFit="cover" />
                {!item.inStock ? (
                  <View style={styles.outOfStockOverlay}>
                    <Text style={styles.outOfStockText}>نفذت</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {editProductId === item.id ? (
              <View style={[styles.editBox, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '25' }]}>
                <View style={styles.offerHeader}>
                  <Feather name="edit-2" size={14} color={colors.primary} />
                  <Text style={[styles.offerTitle, { color: colors.primary }]}>تعديل المنتج</Text>
                </View>

                <View style={styles.editImageRow}>
                  <Pressable
                    onPress={handleEditPickImage}
                    style={[styles.editThumb, { backgroundColor: colors.muted, borderColor: colors.border }]}
                  >
                    <Image
                      source={{ uri: editImagePreview ?? resolveImageUrl(item.imageUrl) }}
                      style={styles.editThumbImg}
                      contentFit="cover"
                    />
                    {editUploading ? (
                      <View style={styles.uploadOverlay}>
                        <ActivityIndicator size="small" color="#fff" />
                      </View>
                    ) : (
                      <View style={[styles.editThumbBadge, { backgroundColor: colors.primary }]}>
                        <Feather name="camera" size={10} color={colors.primaryForeground} />
                      </View>
                    )}
                  </Pressable>
                  <TextInput
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="اسم المنتج"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.editInput, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border, flex: 1 }]}
                    textAlign="right"
                  />
                </View>

                <View style={styles.chipsWrap}>
                  {(categoriesQuery.data ?? []).map((c) => {
                    const isSelected = editCategory === c.name;
                    return (
                      <Pressable
                        key={c.id}
                        onPress={() => setEditCategory(c.name)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.card,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Text style={[styles.chipText, { color: isSelected ? colors.primaryForeground : colors.foreground }]}>
                          {c.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.formRow}>
                  <TextInput
                    value={editPrice}
                    onChangeText={setEditPrice}
                    placeholder="السعر الأساسي (د.ع)"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="number-pad"
                    style={[styles.editInput, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border, flex: 1 }]}
                    textAlign="right"
                  />
                  <TextInput
                    value={editUnit}
                    onChangeText={setEditUnit}
                    placeholder="الوحدة"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.editInput, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border, flex: 1 }]}
                    textAlign="right"
                  />
                </View>
                <View style={styles.unitQuickRow}>
                  {quickUnits.map((u) => {
                    const active = editUnit.trim() === u;
                    return (
                      <Pressable
                        key={u}
                        onPress={() => setEditUnit(u)}
                        style={[
                          styles.unitQuickChip,
                          {
                            backgroundColor: active ? colors.primary : colors.card,
                            borderColor: active ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.unitQuickChipText,
                            { color: active ? colors.primaryForeground : colors.foreground },
                          ]}
                        >
                          {u}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {hasOffer ? (
                  <Text style={[styles.editHint, { color: colors.mutedForeground }]}>
                    هذا المنتج عليه عرض حاليًا — السعر هنا هو السعر الأساسي قبل الخصم
                  </Text>
                ) : null}

                <TextInput
                  value={editPriceNote}
                  onChangeText={setEditPriceNote}
                  placeholder="سعر خاص (مثال: ٣ كيلو بـ٢٠٠٠)"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.editInput, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
                  textAlign="right"
                />

                {renderFlag('منتج محلي', editIsLocal, () => setEditIsLocal((v) => !v), 'map-pin')}
                {renderFlag('تصفية المحل (بيع نهاية اليوم)', editIsClearance, () => setEditIsClearance((v) => !v), 'zap')}
                {renderFlag('بيع بالجملة (گوني/صندوق)', editIsWholesale, () => setEditIsWholesale((v) => !v), 'box')}

                {editIsWholesale ? (
                  <TextInput
                    value={editWholesalePrice}
                    onChangeText={setEditWholesalePrice}
                    placeholder="سعر الجملة (د.ع)"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="number-pad"
                    style={[styles.editInput, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
                    textAlign="right"
                  />
                ) : null}

                <View style={styles.editActionsRow}>
                  <Pressable
                    onPress={() => handleSaveEdit(item)}
                    disabled={editSaving || editUploading}
                    style={[styles.applyBtn, { backgroundColor: colors.primary, flex: 1, opacity: editSaving || editUploading ? 0.7 : 1 }]}
                  >
                    {editSaving ? (
                      <ActivityIndicator size="small" color={colors.primaryForeground} />
                    ) : (
                      <Text style={[styles.applyBtnText, { color: colors.primaryForeground }]}>حفظ التعديلات</Text>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={() => setEditProductId(null)}
                    style={[styles.applyBtn, { backgroundColor: colors.muted }]}
                  >
                    <Text style={[styles.applyBtnText, { color: colors.foreground }]}>إلغاء</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {isEditingOffer ? (
              <View style={[styles.offerBox, { backgroundColor: colors.warning + '10', borderColor: colors.warning + '30' }]}>
                <View style={styles.offerHeader}>
                  <Feather name="clock" size={14} color={colors.warning} />
                  <Text style={[styles.offerTitle, { color: colors.warning }]}>
                    عرض يومي (ينتهي منتصف الليل)
                  </Text>
                </View>

                <View style={styles.offerInputRow}>
                  <Pressable
                    onPress={() => handleApplyOffer(item)}
                    style={[styles.applyBtn, { backgroundColor: colors.warning }]}
                  >
                    <Text style={[styles.applyBtnText, { color: '#fff' }]}>تفعيل العرض</Text>
                  </Pressable>
                  <TextInput
                    value={offerPrice}
                    onChangeText={setOfferPrice}
                    placeholder={`سعر العرض (أقل من ${formatIQD(item.originalPrice ?? item.price)})`}
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="number-pad"
                    style={[styles.offerInput, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
                    textAlign="right"
                  />
                </View>

                {hasOffer ? (
                  <Pressable onPress={() => handleCancelOffer(item)} style={styles.cancelOfferBtn}>
                    <Text style={[styles.cancelOfferText, { color: colors.destructive }]}>
                      إلغاء العرض والعودة للسعر الأصلي
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 20,
    paddingBottom: 60,
  },
  addBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  addBtnText: {
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  formCard: {
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 20,
  },
  imagePicker: {
    height: 160,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImg: {
    width: '100%',
    height: '100%',
  },
  imagePickerPlaceholder: {
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerText: {
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 14,
    textAlign: 'right',
  },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  chipsWrap: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  formRow: {
    flexDirection: 'row-reverse',
    gap: 12,
  },
  unitQuickRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  unitQuickChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  unitQuickChipText: {
    fontFamily: fonts.semibold,
    fontSize: 12.5,
  },
  stockToggle: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  toggleIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  toggleText: {
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  submitBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
  },
  submitBtnText: {
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  productCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  productRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  thumbBox: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    overflow: 'hidden',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  outOfStockText: {
    color: '#fff',
    fontFamily: fonts.bold,
    fontSize: 11,
  },
  infoBox: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
  },
  productName: {
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  productMeta: {
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  priceRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  productPrice: {
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  oldPrice: {
    fontFamily: fonts.regular,
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
  actionsBox: {
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBox: {
    borderTopWidth: 1,
    padding: 16,
    gap: 12,
  },
  editImageRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  editThumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  editThumbImg: {
    width: '100%',
    height: '100%',
  },
  editThumbBadge: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  editHint: {
    fontFamily: fonts.regular,
    fontSize: 11,
    textAlign: 'right',
  },
  editActionsRow: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  offerBox: {
    borderTopWidth: 1,
    padding: 16,
    gap: 12,
  },
  offerHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  offerTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  offerInputRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  offerInput: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  applyBtn: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  cancelOfferBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  cancelOfferText: {
    fontFamily: fonts.medium,
    fontSize: 13,
  },
});
