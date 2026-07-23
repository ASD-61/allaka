import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Pressable,
  StyleSheet,
  FlatList,
  useWindowDimensions,
  Text,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Full-screen tap-to-close image viewer. Shows a single image, or — when
 * `uris` has more than one — a horizontally swipeable gallery with a counter
 * and a row of thumbnails at the bottom (tap a thumbnail to jump), so
 * product/refund photos can be inspected full and it's obvious there are
 * several images.
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
  const listRef = useRef<FlatList<string>>(null);
  useEffect(() => {
    if (visible) setIndex(initialIndex);
  }, [visible, initialIndex]);

  const goTo = (i: number) => {
    setIndex(i);
    listRef.current?.scrollToIndex({ index: i, animated: true });
  };

  const multiple = list.length > 1;

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

        {multiple ? (
          <>
            <FlatList
              ref={listRef}
              data={list}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, i) => `${item}-${i}`}
              initialScrollIndex={initialIndex}
              getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
              onScrollToIndexFailed={() => {}}
              onMomentumScrollEnd={(e) =>
                setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
              }
              renderItem={({ item }) => (
                <Pressable style={[styles.imageWrap, { width }]} onPress={onClose}>
                  <Image source={{ uri: item }} style={styles.image} contentFit="contain" />
                </Pressable>
              )}
            />
            <View style={[styles.counter, { top: insets.top + 16 }]}>
              <Text style={styles.counterText}>
                {index + 1} / {list.length}
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={[styles.thumbStrip, { bottom: insets.bottom + 16 }]}
              contentContainerStyle={styles.thumbStripContent}
            >
              {list.map((u, i) => (
                <Pressable key={`${u}-${i}`} onPress={() => goTo(i)}>
                  <Image
                    source={{ uri: u }}
                    style={[
                      styles.thumb,
                      i === index ? styles.thumbActive : styles.thumbInactive,
                    ]}
                    contentFit="cover"
                  />
                </Pressable>
              ))}
            </ScrollView>
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
    zIndex: 3,
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
  thumbStrip: {
    position: 'absolute',
    left: 0,
    right: 0,
    maxHeight: 76,
  },
  thumbStripContent: {
    paddingHorizontal: 12,
    gap: 8,
    alignItems: 'center',
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
  },
  thumbActive: {
    borderWidth: 2.5,
    borderColor: '#fff',
  },
  thumbInactive: {
    opacity: 0.55,
    borderWidth: 2.5,
    borderColor: 'transparent',
  },
});
