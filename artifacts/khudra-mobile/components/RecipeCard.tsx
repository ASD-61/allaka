import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Alert } from '@/lib/alert';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { RECIPES } from '@/constants/recipes';
import { useCart } from '@/context/cart-context';
import { useListRecipes, type Product } from '@workspace/api-client-react';

interface RecipeLike {
  id: string;
  name: string;
  keywords: string[];
}

export function RecipeCard({ products }: { products: Product[] }) {
  const colors = useColors();
  const { addItem } = useCart();

  // Recipes are admin-managed on the server; fall back to the bundled static
  // list while loading or if the API returns nothing.
  const recipesQuery = useListRecipes();
  const recipes: RecipeLike[] = useMemo(() => {
    const fromApi = recipesQuery.data;
    if (fromApi && fromApi.length > 0) {
      return fromApi.map((r) => ({
        id: String(r.id),
        name: r.name,
        keywords: r.keywords ?? [],
      }));
    }
    return RECIPES;
  }, [recipesQuery.data]);

  const [recipeIndex, setRecipeIndex] = useState(() =>
    Math.floor(Math.random() * RECIPES.length),
  );
  const recipe = recipes[recipeIndex % recipes.length] ?? recipes[0];

  const handleShuffle = () => {
    if (recipes.length <= 1) return;
    let next = recipeIndex;
    while (next % recipes.length === recipeIndex % recipes.length) {
      next = Math.floor(Math.random() * recipes.length);
    }
    setRecipeIndex(next);
  };

  const handleAdd = () => {
    if (!recipe) return;
    const added: string[] = [];
    const skipped: string[] = [];
    
    recipe.keywords.forEach(kw => {
      const product = products.find(p => p.name.includes(kw) && p.inStock !== false);
      if (product) {
        addItem({
          id: product.id,
          name: product.name,
          price: product.price,
          unit: product.unit,
          imageUrl: product.imageUrl,
        }, 1);
        added.push(product.name);
      } else {
        skipped.push(kw);
      }
    });

    if (skipped.length > 0) {
      Alert.alert('مكونات ناقصة', `تم إضافة المكونات المتوفرة. لم نتمكن من إيجاد:\n${skipped.join('، ')}`);
    } else {
      Alert.alert('تمت الإضافة', 'تم تنزيل كل مكونات الطبخة بالسلة!');
    }
  };

  if (!recipe) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Feather name="coffee" size={16} color={colors.primary} />
          <Text style={[styles.title, { color: colors.foreground }]}>شنو نطبخ اليوم؟</Text>
        </View>
        <Pressable onPress={handleShuffle} hitSlop={8}>
          <Feather name="refresh-cw" size={16} color={colors.mutedForeground} />
        </Pressable>
      </View>
      
      <Text style={[styles.recipeName, { color: colors.foreground }]}>{recipe.name}</Text>
      <Text style={[styles.ingredients, { color: colors.mutedForeground }]}>
        المكونات: {recipe.keywords.join('، ')}
      </Text>
      
      <Pressable onPress={handleAdd} style={[styles.btn, { backgroundColor: colors.primary }]}>
        <Feather name="shopping-cart" size={14} color={colors.primaryForeground} />
        <Text style={[styles.btnText, { color: colors.primaryForeground }]}>نزّل المكونات بالسلة</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginHorizontal: 16, marginTop: 10, marginBottom: 6, padding: 14, borderRadius: 16, borderWidth: 1, gap: 8 },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  titleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  title: { fontFamily: fonts.bold, fontSize: 14 },
  recipeName: { fontFamily: fonts.bold, fontSize: 18, textAlign: 'right', marginTop: 4 },
  ingredients: { fontFamily: fonts.regular, fontSize: 12, textAlign: 'right' },
  btn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, marginTop: 4 },
  btnText: { fontFamily: fonts.semibold, fontSize: 13 }
});
