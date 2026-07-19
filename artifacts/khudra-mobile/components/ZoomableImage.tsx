import React, { useState } from 'react';
import { Pressable, type StyleProp, type ViewStyle, type ImageStyle } from 'react-native';
import { Image, type ImageContentFit } from 'expo-image';
import { ImageViewerModal } from '@/components/ImageViewerModal';

/**
 * A drop-in replacement for expo-image's <Image> that opens the picture
 * full-screen (tap-to-close) when tapped. Used everywhere images are shown so
 * customers/merchants can inspect any product/store/refund photo up close.
 * Pass the already-resolved `uri` (e.g. resolveImageUrl(...)). If there's no
 * uri it renders a plain, non-interactive image.
 */
export function ZoomableImage({
  uri,
  style,
  contentFit = 'cover',
  transition,
  wrapperStyle,
}: {
  uri: string | null | undefined;
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  transition?: number;
  wrapperStyle?: StyleProp<ViewStyle>;
}) {
  const [open, setOpen] = useState(false);
  const hasUri = !!uri;

  return (
    <>
      <Pressable
        style={wrapperStyle}
        disabled={!hasUri}
        onPress={() => setOpen(true)}
      >
        <Image source={hasUri ? { uri } : undefined} style={style} contentFit={contentFit} transition={transition} />
      </Pressable>
      <ImageViewerModal uri={uri ?? null} visible={open} onClose={() => setOpen(false)} />
    </>
  );
}
