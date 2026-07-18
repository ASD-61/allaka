import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput } from 'react-native';
import { Alert } from '@/lib/alert';
import { Feather } from '@expo/vector-icons';
import { useListCategories, useCreateCategory, useDeleteCategory } from '@workspace/api-client-react';
import { useAdminRequest } from '@/hooks/useAdminRequest';
import { useAdminStoreId } from '@/hooks/useAdminStoreIds';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { EmptyState } from '@/components/EmptyState';

export function CategoriesTab() {
  const colors = useColors();
  const adminRequest = useAdminRequest();
  const storeId = useAdminStoreId();
  // Categories are scoped to the admin's own store — a merchant's categories
  // never appear here, and vice versa.
  const query = useListCategories(storeId != null ? { storeId } : undefined, {
    request: adminRequest,
  });
  const createCategory = useCreateCategory({ request: adminRequest });
  const deleteCategory = useDeleteCategory({ request: adminRequest });
  const [name, setName] = useState('');

  const handleAdd = async () => {
    if (!name.trim() || storeId == null) return;
    try {
      await createCategory.mutateAsync({ data: { name: name.trim(), storeId } });
      setName('');
      query.refetch();
    } catch {
      Alert.alert('خطأ', 'تعذر إضافة الفئة');
    }
  };

  return (
    <FlatList
      data={query.data ?? []}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.listContent}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      ListHeaderComponent={
        <View style={[styles.addCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.foreground }]}>
          <Text style={[styles.addTitle, { color: colors.foreground }]}>إضافة فئة جديدة</Text>
          <View style={[styles.inputRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="مثال: ورقيات، فواكه موسمية..."
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
                { backgroundColor: colors.primary, opacity: createCategory.isPending || !name.trim() ? 0.5 : 1 }
              ]}
            >
              <Feather name="plus" size={20} color={colors.primaryForeground} />
            </Pressable>
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={{ marginTop: 40 }}>
          <EmptyState icon="grid" title="لا توجد فئات" />
        </View>
      }
      renderItem={({ item }) => (
        <View style={[styles.categoryRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.categoryInfo}>
            <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
              <Feather name="tag" size={16} color={colors.primary} />
            </View>
            <Text style={[styles.categoryName, { color: colors.foreground }]}>{item.name}</Text>
          </View>
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
                        onError: (err: any) => {
                          const message = err?.data?.error ?? 'تعذر حذف الفئة';
                          Alert.alert('تعذر الحذف', message);
                        },
                      },
                    ),
                },
              ])
            }
            style={({ pressed }) => [
              styles.deleteBtn,
              { backgroundColor: colors.destructive + '15', opacity: pressed ? 0.7 : 1 }
            ]}
          >
            <Feather name="trash-2" size={16} color={colors.destructive} />
          </Pressable>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 20,
    paddingBottom: 60,
  },
  addCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  addTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    textAlign: 'right',
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingLeft: 6,
    paddingRight: 16,
    height: 56,
  },
  input: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 15,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  categoryInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});