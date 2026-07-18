import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { Alert } from '@/lib/alert';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import {
  useListStoreTypes,
  useCreateStoreType,
  useUpdateStoreType,
  useDeleteStoreType,
  useRequestUploadUrl,
  type StoreType,
} from '@workspace/api-client-react';
import { useAdminRequest } from '@/hooks/useAdminRequest';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { resolveImageUrl } from '@/lib/image-url';
import { pickImage, uploadPickedImage } from '@/lib/upload';
import { EmptyState } from '@/components/EmptyState';

export function StoreTypesTab() {
  const colors = useColors();
  const adminRequest = useAdminRequest();
  const query = useListStoreTypes();
  const createStoreType = useCreateStoreType({ request: adminRequest });
  const updateStoreType = useUpdateStoreType({ request: adminRequest });
  const deleteStoreType = useDeleteStoreType({ request: adminRequest });
  const requestUploadUrl = useRequestUploadUrl();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState('');
  const [showRecipes, setShowRecipes] = useState(false);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editSortOrder, setEditSortOrder] = useState('');
  const [editShowRecipes, setEditShowRecipes] = useState(false);
  const [editImagePath, setEditImagePath] = useState<string | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editUploading, setEditUploading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  const handlePickImage = async () => {
    const picked = await pickImage();
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
    setSortOrder('');
    setShowRecipes(false);
    setImagePath(null);
    setImagePreview(null);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم النوع');
      return;
    }
    const data: Record<string, unknown> = {
      name: name.trim(),
      showRecipes,
    };
    if (imagePath) data.imageUrl = imagePath;
    if (sortOrder.trim()) data.sortOrder = Math.round(Number(sortOrder));
    setSaving(true);
    try {
      await createStoreType.mutateAsync({ data: data as any });
      resetForm();
      setShowForm(false);
      query.refetch();
    } catch (err: any) {
      Alert.alert('خطأ', err?.data?.error ?? 'تعذر حفظ النوع');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: StoreType) => {
    setEditId(item.id);
    setEditName(item.name);
    setEditSortOrder(String(item.sortOrder));
    setEditShowRecipes(!!item.showRecipes);
    setEditImagePath(null);
    setEditImagePreview(null);
  };

  const handleEditPickImage = async () => {
    const picked = await pickImage();
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

  const handleSaveEdit = async (item: StoreType) => {
    if (!editName.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم النوع');
      return;
    }
    const data: Record<string, unknown> = {
      name: editName.trim(),
      showRecipes: editShowRecipes,
    };
    if (editImagePath) data.imageUrl = editImagePath;
    if (editSortOrder.trim()) data.sortOrder = Math.round(Number(editSortOrder));
    setEditSaving(true);
    try {
      await updateStoreType.mutateAsync({ id: item.id, data: data as any });
      setEditId(null);
      query.refetch();
    } catch (err: any) {
      Alert.alert('خطأ', err?.data?.error ?? 'تعذر حفظ التعديلات');
    } finally {
      setEditSaving(false);
    }
  };

  const confirmDelete = (item: StoreType) => {
    Alert.alert('حذف النوع', `هل تريد حذف نوع "${item.name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteStoreType.mutateAsync({ id: item.id });
            query.refetch();
          } catch (err: any) {
            Alert.alert('خطأ', err?.data?.error ?? 'تعذر حذف النوع');
          }
        },
      },
    ]);
  };

  if (query.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={query.data ?? []}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.listContent}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      ListHeaderComponent={
        <View style={{ marginBottom: 20 }}>
          <View style={[styles.hintBox, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '25' }]}>
            <Feather name="info" size={16} color={colors.primary} />
            <Text style={[styles.hintText, { color: colors.foreground }]}>
              هذي الأنواع تظهر فوراً بالصفحة الرئيسية كبطاقات. حتى تظهر متاجر تحت البطاقة، لازم اسم النوع يطابق "نوع المتجر" حرفياً (مثلاً إذا النوع "غذائية" لازم المتجر مسجّل بنفس الكلمة مو "بقالة"). من التعديل فعّل "شنو نطبخ اليوم؟" لأنواع الخضار فقط.
            </Text>
          </View>

          <Pressable
            onPress={() => setShowForm((v) => !v)}
            style={[styles.addBtn, { backgroundColor: showForm ? colors.muted : colors.primary, borderColor: showForm ? colors.border : colors.primary }]}
          >
            <Feather name={showForm ? 'x' : 'plus'} size={20} color={showForm ? colors.foreground : colors.primaryForeground} />
            <Text style={[styles.addBtnText, { color: showForm ? colors.foreground : colors.primaryForeground }]}>
              {showForm ? 'إلغاء الإضافة' : 'إضافة نوع جديد'}
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
                    <Text style={[styles.imagePickerText, { color: colors.mutedForeground }]}>إضافة صورة للنوع</Text>
                  </View>
                )}
                {uploading ? (
                  <View style={styles.uploadOverlay}>
                    <ActivityIndicator size="large" color="#fff" />
                  </View>
                ) : null}
              </Pressable>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>اسم النوع</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="مثال: خضار وفواكه"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                  textAlign="right"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>ترتيب العرض (اختياري)</Text>
                <TextInput
                  value={sortOrder}
                  onChangeText={setSortOrder}
                  placeholder="مثال: 1"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                  textAlign="right"
                />
              </View>

              <Pressable
                onPress={() => setShowRecipes((v) => !v)}
                style={[styles.toggleRow, { backgroundColor: colors.muted, borderColor: colors.border }]}
              >
                <Feather
                  name={showRecipes ? 'toggle-right' : 'toggle-left'}
                  size={26}
                  color={showRecipes ? colors.primary : colors.mutedForeground}
                />
                <View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}>
                  <Text style={[styles.toggleTitle, { color: colors.foreground }]}>شنو نطبخ اليوم؟</Text>
                  <Text style={[styles.toggleHint, { color: colors.mutedForeground }]}>
                    فعّلها لأنواع الخضار/الغذائية فقط
                  </Text>
                </View>
              </Pressable>

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
                    <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>حفظ النوع</Text>
                  </>
                )}
              </Pressable>
            </View>
          ) : null}
        </View>
      }
      ListEmptyComponent={<EmptyState icon="grid" title="لا توجد أنواع بعد" subtitle="أضف نوع متجر ليظهر للزبائن بالصفحة الرئيسية" />}
      renderItem={({ item }) => {
        const isEditing = editId === item.id;
        return (
          <View style={[styles.typeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.typeRow}>
              <View style={styles.actionsBox}>
                <Pressable
                  hitSlop={8}
                  onPress={() => confirmDelete(item)}
                  style={[styles.iconBtn, { backgroundColor: colors.destructive + '15' }]}
                >
                  <Feather name="trash-2" size={16} color={colors.destructive} />
                </Pressable>
                <Pressable
                  hitSlop={8}
                  onPress={() => (isEditing ? setEditId(null) : startEdit(item))}
                  style={[styles.iconBtn, { backgroundColor: isEditing ? colors.primary + '15' : colors.muted }]}
                >
                  <Feather name="edit-2" size={16} color={isEditing ? colors.primary : colors.mutedForeground} />
                </Pressable>
              </View>

              <View style={styles.infoBox}>
                <Text style={[styles.typeName, { color: colors.foreground }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.typeMeta, { color: colors.mutedForeground }]}>
                  الترتيب: {item.sortOrder}
                  {item.showRecipes ? ' · شنو نطبخ ✓' : ''}
                </Text>
              </View>

              <View style={styles.thumbBox}>
                {item.imageUrl ? (
                  <Image source={{ uri: resolveImageUrl(item.imageUrl) }} style={styles.thumbImg} contentFit="cover" />
                ) : (
                  <View style={[styles.thumbPlaceholder, { backgroundColor: colors.muted }]}>
                    <Feather name="image" size={20} color={colors.mutedForeground} />
                  </View>
                )}
              </View>
            </View>

            {isEditing ? (
              <View style={[styles.editBox, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '25' }]}>
                <View style={styles.editHeader}>
                  <Feather name="edit-2" size={14} color={colors.primary} />
                  <Text style={[styles.editTitle, { color: colors.primary }]}>تعديل النوع</Text>
                </View>

                <View style={styles.editImageRow}>
                  <Pressable
                    onPress={handleEditPickImage}
                    style={[styles.editThumb, { backgroundColor: colors.muted, borderColor: colors.border }]}
                  >
                    {editImagePreview || item.imageUrl ? (
                      <Image
                        source={{ uri: editImagePreview ?? resolveImageUrl(item.imageUrl) }}
                        style={styles.editThumbImg}
                        contentFit="cover"
                      />
                    ) : (
                      <Feather name="camera" size={20} color={colors.mutedForeground} />
                    )}
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
                    placeholder="اسم النوع"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.editInput, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border, flex: 1 }]}
                    textAlign="right"
                  />
                </View>

                <TextInput
                  value={editSortOrder}
                  onChangeText={setEditSortOrder}
                  placeholder="ترتيب العرض"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  style={[styles.editInput, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
                  textAlign="right"
                />

                <Pressable
                  onPress={() => setEditShowRecipes((v) => !v)}
                  style={[styles.toggleRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Feather
                    name={editShowRecipes ? 'toggle-right' : 'toggle-left'}
                    size={26}
                    color={editShowRecipes ? colors.primary : colors.mutedForeground}
                  />
                  <View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}>
                    <Text style={[styles.toggleTitle, { color: colors.foreground }]}>شنو نطبخ اليوم؟</Text>
                    <Text style={[styles.toggleHint, { color: colors.mutedForeground }]}>
                      تظهر داخل متاجر هذا النوع فقط
                    </Text>
                  </View>
                </Pressable>

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
                    onPress={() => setEditId(null)}
                    style={[styles.applyBtn, { backgroundColor: colors.muted }]}
                  >
                    <Text style={[styles.applyBtnText, { color: colors.foreground }]}>إلغاء</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 20, paddingBottom: 60 },
  hintBox: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  hintText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    textAlign: 'right',
    lineHeight: 20,
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
  toggleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  toggleTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    textAlign: 'right',
  },
  toggleHint: {
    fontFamily: fonts.regular,
    fontSize: 11,
    textAlign: 'right',
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
  typeCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  typeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  thumbBox: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBox: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
  },
  typeName: {
    fontFamily: fonts.bold,
    fontSize: 15,
    textAlign: 'right',
  },
  typeMeta: {
    fontFamily: fonts.medium,
    fontSize: 12,
    textAlign: 'right',
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
  editHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  editTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
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
    alignItems: 'center',
    justifyContent: 'center',
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
  editActionsRow: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  applyBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  applyBtnText: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
});
