import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { ImageViewerModal } from '@/components/ImageViewerModal';

/**
 * A swipeable image slider for product cards: the customer can flip through all
 * of a product's images as slides (with dot indicators), and tapping opens the
 * full-screen gallery viewer (with thumbnails) at the current image.
 *
 * Falls back to a single static image when there's only one picture.
 */
export function ProductImageSlider({
  uris,
  style,
  contentFit = 'cover',
}: {
  uris: string[];
  style?: StyleProp<ViewStyle>;
  contentFit?: 'cover' | 'contain';
}) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);

  const list = uris.filter(Boolean);
  const multiple = list.length > 1;

  return (
    <View
      style={[styles.container, style]}
      onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}
    >
      {multiple && width > 0 ? (
        <>
          <FlatList
            data={list}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(u, i) => `${u}-${i}`}
            onMomentumScrollEnd={(e) =>
              setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
            }
            renderItem={({ item }) => (
              <Pressable onPress={() => setOpen(true)} style={{ width, height: '100%' }}>
                <Image source={{ uri: item }} style={styles.image} contentFit={contentFit} />
              </Pressable>
            )}
          />
          <View style={styles.dots} pointerEvents="none">
            {list.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === index ? styles.dotActive : styles.dotInactive]}
              />
            ))}
          </View>
        </>
      ) : (
        <Pressable onPress={() => setOpen(true)} style={styles.image}>
          <Image source={{ uri: list[0] }} style={styles.image} contentFit={contentFit} transition={150} />
        </Pressable>
      )}

      <ImageViewerModal
        uris={list}
        visible={open}
        initialIndex={index}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  dots: {
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: '#fff',
  },
  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
});
