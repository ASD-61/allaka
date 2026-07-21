import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { Alert } from '@/lib/alert';
import { Feather } from '@expo/vector-icons';
import {
  useListProducts,
  useListCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { EmptyState } from '@/components/EmptyState';

// Categories screen scoped to THIS store only: the merchant manages their own
// category list here (so they have options to pick from when adding a
// product — a grocery or pharmacy store isn't stuck with the vegetable-store
// categories), and sees usage stats derived from their own products. Every
// store's category list is independent — nothing here ever mixes with
// another merchant's or the admin's own store.
export function MerchantCategories({ storeId }: { storeId: number }) {
  const colors = useColors();
  const productsQuery = useListProducts({ storeId });
  const categoriesQuery = useListCategories({ storeId });
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  const startEdit = (id: number, current: string) => {
    setEditingId(id);
    setEditingName(current);
  };

  const saveEdit = async (id: number) => {
    const next = editingName.trim();
    if (!next) return;
    try {
      await updateCategory.mutateAsync({ id, data: { name: next, storeId } });
      setEditingId(null);
      setEditingName('');
      categoriesQuery.refetch();
      productsQuery.refetch();
    } catch (err: any) {
      Alert.alert('خطأ', err?.data?.error ?? 'تعذر تعديل اسم الفئة');
    }
  };

  const handleAdd = async () => {
    if (!name.trim()) return;
    try {
      await createCategory.mutateAsync({ data: { name: name.trim(), storeId } });
      setName('');
      categoriesQuery.refetch();
    } catch (err: any) {
      Alert.alert('خطأ', err?.data?.error ?? 'تعذر إضافة الفئة');
    }
  };

  const products = productsQuery.data ?? [];
  const countByName = new Map<string, { total: number; available: number }>();
  for (const p of products) {
    const key = p.category || 'بدون فئة';
    const cur = countByName.get(key) ?? { total: 0, available: 0 };
    cur.total += 1;
    if (p.inStock) cur.available += 1;
    countByName.set(key, cur);
  }

  const categories = categoriesQuery.data ?? [];

  return (
    <FlatList
      data={categories}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.listContent}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      ListHeaderComponent={
        <View style={{ marginBottom: 16 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>فئات متجرك</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            أضف الفئات التي تناسب نوع متجرك حتى تقدر تختارها عند إضافة منتج
          </Text>
          <View style={[styles.addCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.inputRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="مثال: أدوية، معلبات، ورقيات..."
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { color: colors.foreground }]}
                textAlign="right"
                onSubmitEditing={handleAdd}
              />
              <Pressable
                onPress={handleAdd}
                disabled={createCategory.isPending || !name.trim()}
                style={[
                  styles.addBtn,
                  { backgroundColor: colors.primary, opacity: createCategory.isPending || !name.trim() ? 0.5 : 1 },
                ]}
              >
                <Feather name="plus" size={20} color={colors.primaryForeground} />
              </Pressable>
            </View>
          </View>
        </View>
      }
      ListEmptyComponent={
        categoriesQuery.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <View style={{ marginTop: 20 }}>
            <EmptyState icon="grid" title="لا توجد فئات بعد" subtitle="أضف أول فئة من الحقل أعلاه" />
          </View>
        )
      }
      renderItem={({ item }) => {
        const stats = countByName.get(item.name);
        const isEditing = editingId === item.id;
        if (isEditing) {
          return (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.primary }]}>
              <Pressable
                hitSlop={8}
                onPress={() => saveEdit(item.id)}
                disabled={updateCategory.isPending || !editingName.trim()}
                style={[styles.deleteBtn, { backgroundColor: colors.primary + '18', opacity: !editingName.trim() ? 0.5 : 1 }]}
              >
                <Feather name="check" size={16} color={colors.primary} />
              </Pressable>
              <Pressable
                hitSlop={8}
                onPress={() => setEditingId(null)}
                style={[styles.deleteBtn, { backgroundColor: colors.muted }]}
              >
                <Feather name="x" size={16} color={colors.mutedForeground} />
              </Pressable>
              <TextInput
                value={editingName}
                onChangeText={setEditingName}
                autoFocus
                placeholder="اسم الفئة"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.editInput, { color: colors.foreground, backgroundColor: colors.muted, borderColor: colors.border }]}
                textAlign="right"
                onSubmitEditing={() => saveEdit(item.id)}
              />
            </View>
          );
        }
        return (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Pressable
              hitSlop={8}
              onPress={() =>
                Alert.alert('حذف الفئة', `هل أنت متأكد من حذف فئة "${item.name}"؟`, [
                  { text: 'إلغاء', style: 'cancel' },
                  {
                    text: 'حذف',
                    style: 'destructive',
                    onPress: () =>
                      deleteCategory.mutate(
                        { id: item.id },
                        {
                          onSuccess: () => categoriesQuery.refetch(),
                          onError: (err: any) =>
                            Alert.alert('تعذر الحذف', err?.data?.error ?? 'تعذر حذف الفئة'),
                        },
                      ),
                  },
                ])
              }
              style={({ pressed }) => [
                styles.deleteBtn,
                { backgroundColor: colors.destructive + '15', opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="trash-2" size={16} color={colors.destructive} />
            </Pressable>
            <Pressable
              hitSlop={8}
              onPress={() => startEdit(item.id, item.name)}
              style={({ pressed }) => [
                styles.deleteBtn,
                { backgroundColor: colors.primary + '15', opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="edit-2" size={16} color={colors.primary} />
            </Pressable>
            <View style={{ flex: 1, alignItems: 'flex-end', gap: 3 }}>
              <Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text>
              {stats ? (
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                  {stats.available} متوفر من أصل {stats.total}
                </Text>
              ) : (
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>لا يوجد منتجات بهذه الفئة بعد</Text>
              )}
            </View>
            <View style={[styles.iconWrap, { backgroundColor: colors.muted }]}>
              <Feather name="tag" size={18} color={colors.mutedForeground} />
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 20, paddingBottom: 60 },
  title: {
    fontFamily: fonts.bold,
    fontSize: 18,
    textAlign: 'right',
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 18,
  },
  addCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  inputRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingLeft: 6,
    paddingRight: 14,
    height: 52,
  },
  input: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editInput: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontFamily: fonts.bold,
    fontSize: 15,
    textAlign: 'right',
  },
  meta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    textAlign: 'right',
  },
});
