import React, { useEffect, useState } from 'react';
import { Modal, View, Pressable, StyleSheet, FlatList, useWindowDimensions, Text } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Full-screen tap-to-close image viewer. Shows a single image, or — when
 * `uris` has more than one — a horizontally swipeable gallery with a counter,
 * so product/refund photos can be inspected full and in full detail.
 */
export function ImageViewerModal({
  uri,
  uris,
  visible,
  onClose,
  initialIndex = 0,
}: {
  uri?: string | null;
  uris?: string[];
  visible: boolean;
  onClose: () => void;
  initialIndex?: number;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Normalise to a list of image URIs.
  const list = (uris && uris.length > 0 ? uris : uri ? [uri] : []).filter(Boolean);

  const [index, setIndex] = useState(initialIndex);
  useEffect(() => {
    if (visible) setIndex(initialIndex);
  }, [visible, initialIndex]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          style={[styles.closeBtn, { top: insets.top + 12 }]}
          onPress={onClose}
          hitSlop={12}
        >
          <Feather name="x" size={26} color="#fff" />
        </Pressable>

        {list.length > 1 ? (
          <>
            <FlatList
              data={list}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, i) => `${item}-${i}`}
              initialScrollIndex={initialIndex}
              getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
              onMomentumScrollEnd={(e) =>
                setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
              }
              renderItem={({ item }) => (
                <Pressable style={[styles.imageWrap, { width }]} onPress={onClose}>
                  <Image source={{ uri: item }} style={styles.image} contentFit="contain" />
                </Pressable>
              )}
            />
            <View style={[styles.counter, { bottom: insets.bottom + 24 }]}>
              <Text style={styles.counterText}>
                {index + 1} / {list.length}
              </Text>
            </View>
          </>
        ) : (
          <Pressable style={styles.imageWrap} onPress={onClose}>
            {list[0] ? (
              <Image source={{ uri: list[0] }} style={styles.image} contentFit="contain" />
            ) : null}
          </Pressable>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.94)',
  },
  closeBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 2,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  imageWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  counter: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  counterText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
