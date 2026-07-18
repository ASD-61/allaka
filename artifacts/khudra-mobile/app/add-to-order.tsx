import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { Alert } from '@/lib/alert';
import { useLocalSearchParams, router } from 'expo-router';
import { useListProducts, useAddOrderItems } from '@workspace/api-client-react';
import { queryClient } from '@/lib/query-client';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { resolveImageUrl } from '@/lib/image-url';
import { formatIQD } from '@/lib/format';
import { qtyStepForUnit } from '@/lib/quantity';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AddToOrderScreen() {
  const { orderId } = useLocalSearchParams();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const productsQuery = useListProducts();
  const addItems = useAddOrderItems();
  
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Record<number, number>>({});
  
  const products = useMemo(() => {
    const list = productsQuery.data ?? [];
    if (!search) return list;
    return list.filter(p => p.name.includes(search));
  }, [productsQuery.data, search]);
  
  const handleAdd = async () => {
    const items = Object.entries(selected).map(([idStr, qty]) => {
      const id = parseInt(idStr, 10);
      const p = productsQuery.data?.find(x => x.id === id);
      return p && qty > 0 ? { id: p.id, name: p.name, price: p.price, unit: p.unit, qty } : null;
    }).filter(Boolean) as any[];
    
    if (items.length === 0) return;
    
    try {
      await addItems.mutateAsync({
        id: Number(orderId),
        data: { items }
      });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      Alert.alert('تمت الإضافة', 'تم إضافة المنتجات لطلبك بنجاح');
      router.back();
    } catch (err: any) {
      Alert.alert('فشل', err?.data?.error || 'انتهى الوقت المسموح للتعديل أو تغيرت حالة الطلب.');
      router.back();
    }
  };
  
  const totalItems = Object.values(selected).filter(q => q > 0).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Feather name="chevron-right" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>إضافة منتجات للطلب #{orderId}</Text>
      </View>
      
      <TextInput 
        style={[styles.search, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
        placeholder="ابحث عن منتج..."
        placeholderTextColor={colors.mutedForeground}
        value={search}
        onChangeText={setSearch}
        textAlign="right"
      />
      
      <FlatList 
        data={products}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 12 }}
        renderItem={({ item }) => {
          const qty = selected[item.id] || 0;
          const step = qtyStepForUnit(item.unit);
          const outOfStock = item.inStock === false;
          
          return (
            <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Image source={{ uri: resolveImageUrl(item.imageUrl) }} style={styles.img} />
              <View style={styles.info}>
                <Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text>
                <Text style={[styles.price, { color: colors.primary }]}>{formatIQD(item.price)} / {item.unit}</Text>
              </View>
              {outOfStock ? (
                <Text style={{ color: colors.destructive, fontFamily: fonts.medium, fontSize: 12 }}>نفذت الكمية</Text>
              ) : (
                <View style={[styles.stepper, { backgroundColor: colors.muted }]}>
                  <Pressable onPress={() => setSelected(s => ({ ...s, [item.id]: Math.max(0, qty - step) }))} hitSlop={8} style={styles.stepBtn}>
                    <Feather name="minus" size={14} color={colors.foreground} />
                  </Pressable>
                  <Text style={[styles.qty, { color: colors.foreground }]}>{qty}</Text>
                  <Pressable onPress={() => setSelected(s => ({ ...s, [item.id]: qty + step }))} hitSlop={8} style={styles.stepBtn}>
                    <Feather name="plus" size={14} color={colors.foreground} />
                  </Pressable>
                </View>
              )}
            </View>
          );
        }}
      />
      
      {totalItems > 0 && (
        <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Pressable onPress={handleAdd} disabled={addItems.isPending} style={[styles.btn, { backgroundColor: colors.primary }]}>
            {addItems.isPending ? <ActivityIndicator color={colors.primaryForeground} /> : (
              <Text style={[styles.btnText, { color: colors.primaryForeground }]}>إضافة {totalItems} منتج للطلب</Text>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  title: { fontFamily: fonts.bold, fontSize: 18 },
  search: { marginHorizontal: 16, borderWidth: 1, borderRadius: 12, padding: 10, fontFamily: fonts.regular, fontSize: 14 },
  row: { flexDirection: 'row-reverse', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 10, gap: 10 },
  img: { width: 50, height: 50, borderRadius: 8 },
  info: { flex: 1 },
  name: { fontFamily: fonts.semibold, fontSize: 14, textAlign: 'right' },
  price: { fontFamily: fonts.bold, fontSize: 12, textAlign: 'right' },
  stepper: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingHorizontal: 8, height: 32, borderRadius: 16 },
  stepBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  qty: { fontFamily: fonts.bold, fontSize: 14, minWidth: 16, textAlign: 'center' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, padding: 16 },
  btn: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: fonts.bold, fontSize: 16 }
});
