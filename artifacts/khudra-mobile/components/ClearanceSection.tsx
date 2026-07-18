import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ProductCard } from './ProductCard';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import type { Product } from '@workspace/api-client-react';

export function ClearanceSection({ products }: { products: Product[] }) {
  const colors = useColors();
  const clearanceProducts = products.filter(p => p.isClearance);
  
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (clearanceProducts.length === 0) return null;

  const currentHour = now.getHours();
  const isOpen = currentHour >= 18;

  const nextOpen = new Date(now);
  if (currentHour >= 18) {
    nextOpen.setDate(nextOpen.getDate() + 1);
  }
  nextOpen.setHours(18, 0, 0, 0);

  const diff = nextOpen.getTime() - now.getTime();
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
           <Feather name="sunset" size={18} color={colors.warning} />
           <Text style={[styles.title, { color: colors.foreground }]}>تصفية المحل</Text>
        </View>
        {!isOpen && (
           <Text style={[styles.lockedText, { color: colors.mutedForeground }]}>
             يفتح الساعة ٦ العصر ({hours}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')})
           </Text>
        )}
      </View>
      
      {isOpen ? (
        <FlatList
          data={clearanceProducts}
          horizontal
          inverted
          showsHorizontalScrollIndicator={false}
          keyExtractor={p => String(p.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
             <View style={styles.cardWrapper}>
               <ProductCard product={item} />
             </View>
          )}
        />
      ) : (
        <View style={[styles.lockedBox, { backgroundColor: colors.muted }]}>
           <Feather name="lock" size={24} color={colors.mutedForeground} />
           <Text style={[styles.lockedSubtitle, { color: colors.mutedForeground }]}>
             خصومات نهاية اليوم تفتح الساعة ٦ عصراً
           </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 10, marginBottom: 16 },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 },
  titleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  title: { fontFamily: fonts.bold, fontSize: 16 },
  lockedText: { fontFamily: fonts.medium, fontSize: 12 },
  list: { paddingHorizontal: 16, gap: 12 },
  cardWrapper: { width: 150 },
  lockedBox: { marginHorizontal: 16, height: 100, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 8 },
  lockedSubtitle: { fontFamily: fonts.regular, fontSize: 13 }
});
