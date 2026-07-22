import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { Alert } from '@/lib/alert';
import { Feather } from '@expo/vector-icons';
import {
  useListRecipes,
  useCreateRecipe,
  useUpdateRecipe,
  useDeleteRecipe,
  type Recipe,
} from '@workspace/api-client-react';
import { useAdminRequest } from '@/hooks/useAdminRequest';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { EmptyState } from '@/components/EmptyState';

// Splits a free-text ingredients field into a clean keyword list. Accepts
// commas (both , and ،) and new lines as separators.
function parseKeywords(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of text.split(/[,،\n]/)) {
    const k = part.trim();
    if (k && !seen.has(k)) {
      seen.add(k);
      out.push(k);
    }
  }
  return out;
}

// Admin management for the "شنو نطبخ اليوم؟" recipes: add / edit name +
// ingredient keywords (the products belonging to a recipe) / delete.
export function RecipesTab() {
  const colors = useColors();
  const adminRequest = useAdminRequest();
  const query = useListRecipes();
  const createRecipe = useCreateRecipe({ request: adminRequest });
  const updateRecipe = useUpdateRecipe({ request: adminRequest });
  const deleteRecipe = useDeleteRecipe({ request: adminRequest });

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [keywords, setKeywords] = useState('');
  const [saving, setSaving] = useState(false);

  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editKeywords, setEditKeywords] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const recipes = query.data ?? [];

  const resetAdd = () => {
    setName('');
    setKeywords('');
    setShowForm(false);
  };

  const handleAdd = async () => {
    const n = name.trim();
    const kws = parseKeywords(keywords);
    if (!n) {
      Alert.alert('تنبيه', 'اكتب اسم الطبخة');
      return;
    }
    if (kws.length === 0) {
      Alert.alert('تنبيه', 'اكتب مكوّنات الطبخة (افصل بينها بفاصلة)');
      return;
    }
    setSaving(true);
    try {
      await createRecipe.mutateAsync({ data: { name: n, keywords: kws } });
      resetAdd();
      query.refetch();
    } catch (err: any) {
      Alert.alert('خطأ', err?.data?.error ?? 'تعذر إضافة الطبخة');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (r: Recipe) => {
    setEditId(r.id);
    setEditName(r.name);
    setEditKeywords((r.keywords ?? []).join('، '));
  };

  const handleSaveEdit = async () => {
    if (editId == null) return;
    const n = editName.trim();
    const kws = parseKeywords(editKeywords);
    if (!n) {
      Alert.alert('تنبيه', 'اكتب اسم الطبخة');
      return;
    }
    setEditSaving(true);
    try {
      await updateRecipe.mutateAsync({ id: editId, data: { name: n, keywords: kws } });
      setEditId(null);
      query.refetch();
    } catch (err: any) {
      Alert.alert('خطأ', err?.data?.error ?? 'تعذر حفظ التعديلات');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = (r: Recipe) => {
    Alert.alert('حذف الطبخة', `هل تريد حذف "${r.name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: () =>
          deleteRecipe.mutate(
            { id: r.id },
            {
              onSuccess: () => query.refetch(),
              onError: (err: any) =>
                Alert.alert('تعذر الحذف', err?.data?.error ?? 'تعذر حذف الطبخة'),
            },
          ),
      },
    ]);
  };

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border },
  ];

  return (
    <FlatList
      data={recipes}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.listContent}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      ListHeaderComponent={
        <View style={{ marginBottom: 16 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>الطبخات (شنو نطبخ اليوم؟)</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            أضف أو عدّل الطبخات ومكوّناتها. المكوّنات تُطابَق مع منتجات المتجر ليتمكن الزبون من إضافتها للسلة بضغطة واحدة.
          </Text>

          {showForm ? (
            <View style={[styles.addCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="اسم الطبخة (مثال: مرق بامية)"
                placeholderTextColor={colors.mutedForeground}
                style={inputStyle}
                textAlign="right"
              />
              <TextInput
                value={keywords}
                onChangeText={setKeywords}
                placeholder="المكوّنات مفصولة بفاصلة (مثال: بصل، طماطة، بامية)"
                placeholderTextColor={colors.mutedForeground}
                multiline
                style={[inputStyle, { minHeight: 70, paddingTop: 12 }]}
                textAlign="right"
              />
              <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
                <Pressable
                  onPress={handleAdd}
                  disabled={saving}
                  style={[styles.primaryBtn, { flex: 1, backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
                >
                  {saving ? (
                    <ActivityIndicator color={colors.primaryForeground} size="small" />
                  ) : (
                    <>
                      <Feather name="plus" size={16} color={colors.primaryForeground} />
                      <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>إضافة الطبخة</Text>
                    </>
                  )}
                </Pressable>
                <Pressable onPress={resetAdd} style={[styles.cancelBtn, { borderColor: colors.border }]}>
                  <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>إلغاء</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={() => setShowForm(true)}
              style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 8 }]}
            >
              <Feather name="plus" size={16} color={colors.primaryForeground} />
              <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>إضافة طبخة جديدة</Text>
            </Pressable>
          )}
        </View>
      }
      ListEmptyComponent={
        query.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <View style={{ marginTop: 20 }}>
            <EmptyState icon="coffee" title="لا توجد طبخات بعد" subtitle="أضف أول طبخة من الزر أعلاه" />
          </View>
        )
      }
      renderItem={({ item }) => {
        const isEditing = editId === item.id;
        if (isEditing) {
          return (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                placeholder="اسم الطبخة"
                placeholderTextColor={colors.mutedForeground}
                style={inputStyle}
                textAlign="right"
              />
              <TextInput
                value={editKeywords}
                onChangeText={setEditKeywords}
                placeholder="المكوّنات مفصولة بفاصلة"
                placeholderTextColor={colors.mutedForeground}
                multiline
                style={[inputStyle, { minHeight: 70, paddingTop: 12, marginTop: 8 }]}
                textAlign="right"
              />
              <View style={{ flexDirection: 'row-reverse', gap: 8, marginTop: 10 }}>
                <Pressable
                  onPress={handleSaveEdit}
                  disabled={editSaving}
                  style={[styles.primaryBtn, { flex: 1, backgroundColor: colors.primary, opacity: editSaving ? 0.6 : 1 }]}
                >
                  {editSaving ? (
                    <ActivityIndicator color={colors.primaryForeground} size="small" />
                  ) : (
                    <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>حفظ</Text>
                  )}
                </Pressable>
                <Pressable onPress={() => setEditId(null)} style={[styles.cancelBtn, { borderColor: colors.border }]}>
                  <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>إلغاء</Text>
                </Pressable>
              </View>
            </View>
          );
        }
        return (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.rowTop}>
              <View style={styles.cardActions}>
                <Pressable
                  hitSlop={8}
                  onPress={() => handleDelete(item)}
                  style={[styles.iconBtn, { backgroundColor: colors.destructive + '15' }]}
                >
                  <Feather name="trash-2" size={15} color={colors.destructive} />
                </Pressable>
                <Pressable
                  hitSlop={8}
                  onPress={() => startEdit(item)}
                  style={[styles.iconBtn, { backgroundColor: colors.primary + '15' }]}
                >
                  <Feather name="edit-2" size={14} color={colors.primary} />
                </Pressable>
              </View>
              <Text style={[styles.recipeName, { color: colors.foreground }]}>{item.name}</Text>
            </View>
            <View style={styles.chipsWrap}>
              {(item.keywords ?? []).map((kw, i) => (
                <View key={`${kw}-${i}`} style={[styles.chip, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.chipText, { color: colors.foreground }]}>{kw}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  listContent: { padding: 20, paddingBottom: 60 },
  title: { fontFamily: fonts.bold, fontSize: 18, textAlign: 'right' },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
    lineHeight: 18,
  },
  addCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10, marginTop: 12 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    minHeight: 48,
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  primaryBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 12,
  },
  primaryBtnText: { fontFamily: fonts.bold, fontSize: 13 },
  cancelBtn: {
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { fontFamily: fonts.semibold, fontSize: 13 },
  card: { borderRadius: 16, borderWidth: 1, padding: 14 },
  rowTop: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardActions: { flexDirection: 'row-reverse', gap: 8 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeName: { fontFamily: fonts.bold, fontSize: 15, textAlign: 'right', flex: 1, marginRight: 8 },
  chipsWrap: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    justifyContent: 'flex-end',
  },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  chipText: { fontFamily: fonts.medium, fontSize: 11.5 },
});
