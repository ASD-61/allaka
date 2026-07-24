import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { Feather } from '@expo/vector-icons';

/**
 * A small, self-dismissing banner that slides down from the top:
 *  - when the connection drops → "لا يوجد اتصال بالإنترنت" (stays until restored)
 *  - when the connection returns → "تمت استعادة الاتصال بالإنترنت" (auto-hides)
 *
 * It never blocks interaction — the user can keep using the app (cached data)
 * the whole time.
 */
export function NetworkStatusBanner() {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [online, setOnline] = useState(true);
  const translateY = useRef(new Animated.Value(-80)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track the previous state so we only react to real transitions (not the
  // initial "online" reading on launch).
  const wasOnline = useRef<boolean | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const clearHide = () => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
    };

    const show = () =>
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 6,
      }).start();

    const hide = () =>
      Animated.timing(translateY, {
        toValue: -80,
        duration: 250,
        useNativeDriver: true,
      }).start(() => setVisible(false));

    const sub = NetInfo.addEventListener((state) => {
      const isOnline =
        state.isConnected === true && state.isInternetReachable !== false;

      // First reading — remember it, and only surface a banner if we launch
      // while offline (nice heads-up that then disappears once back online).
      if (wasOnline.current === null) {
        wasOnline.current = isOnline;
        if (!isOnline) {
          setOnline(false);
          setVisible(true);
          requestAnimationFrame(show);
        }
        return;
      }

      if (isOnline === wasOnline.current) return;
      wasOnline.current = isOnline;

      clearHide();
      setOnline(isOnline);
      setVisible(true);
      requestAnimationFrame(show);

      if (isOnline) {
        // "restored" message auto-dismisses after a moment
        hideTimer.current = setTimeout(hide, 2500);
      }
      // when offline we keep it visible until the connection is back
    });

    return () => {
      clearHide();
      sub();
    };
  }, [translateY]);

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          paddingTop: insets.top + 8,
          backgroundColor: online ? '#0f9d58' : '#d93025',
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.row}>
        <Feather
          name={online ? 'wifi' : 'wifi-off'}
          size={16}
          color="#fff"
        />
        <Text style={styles.text}>
          {online
            ? 'تمت استعادة الاتصال بالإنترنت'
            : 'لا يوجد اتصال بالإنترنت'}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    color: '#fff',
    fontFamily: 'Cairo_600SemiBold',
    fontSize: 13,
  },
});
