import { type ReactNode, useCallback, useEffect, useState } from 'react';
import {
  type LayoutChangeEvent,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  clamp,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

/**
 * A row of equal slots with one chip that carries the selection.
 *
 * The touch is ABSOLUTE, not a drag offset: put a finger down anywhere and the
 * chip comes to it, follows while you slide, and commits to whatever slot you
 * release over. Relative dragging — moving the chip by the gesture's
 * translation — is the wrong model here, because touching a far tab would
 * nudge the chip a little instead of bringing it over.
 *
 * Position lives in a shared value so tracking runs on the UI thread; React is
 * only told when the highlighted slot actually changes.
 */
const SPRING = { damping: 20, stiffness: 190, mass: 0.6 };
const CATCH = { damping: 18, stiffness: 260, mass: 0.5 };

export function SlidingSelector({
  count,
  activeIndex,
  onSelect,
  renderItem,
  chipInset = 0,
  style,
  chipStyle,
  liftScale = 0.05,
}: {
  count: number;
  activeIndex: number;
  onSelect: (index: number) => void;
  /** `active` follows the finger during a drag, not just the committed tab. */
  renderItem: (index: number, active: boolean) => ReactNode;
  chipInset?: number;
  style?: StyleProp<ViewStyle>;
  chipStyle?: StyleProp<ViewStyle>;
  liftScale?: number;
}) {
  const [width, setWidth] = useState(0);
  const slot = width > 0 ? width / count : 0;

  const [hover, setHover] = useState(activeIndex);
  useEffect(() => setHover(activeIndex), [activeIndex]);

  const x = useSharedValue(0);
  const lift = useSharedValue(0);
  const reported = useSharedValue(activeIndex);
  const dragging = useSharedValue(false);

  // Follow selection changed from elsewhere, but never yank the chip mid-drag.
  useEffect(() => {
    if (slot === 0 || dragging.value) return;
    const target = activeIndex * slot;
    if (x.value === 0 && activeIndex === 0) x.value = target;
    else x.value = withSpring(target, SPRING);
  }, [activeIndex, slot, dragging, x]);

  const commit = useCallback(
    (index: number) => {
      setHover(index);
      onSelect(index);
    },
    [onSelect],
  );

  const pan = Gesture.Pan()
    .enabled(slot > 0)
    // React to the touch itself, so the chip arrives before any movement.
    .onBegin((e) => {
      dragging.value = true;
      lift.value = withTiming(1, { duration: 90 });
      const i = clamp(Math.floor(e.x / slot), 0, count - 1);
      x.value = withSpring(clamp(e.x - slot / 2, 0, (count - 1) * slot), CATCH);
      if (i !== reported.value) {
        reported.value = i;
        runOnJS(setHover)(i);
      }
    })
    .onUpdate((e) => {
      // Track the finger directly — no spring, or it lags behind the touch.
      x.value = clamp(e.x - slot / 2, 0, (count - 1) * slot);
      const i = clamp(Math.floor(e.x / slot), 0, count - 1);
      if (i !== reported.value) {
        reported.value = i;
        runOnJS(setHover)(i);
      }
    })
    // Finalize, not End: a tap never activates the pan, and must still commit.
    .onFinalize(() => {
      dragging.value = false;
      const i = reported.value;
      x.value = withSpring(i * slot, SPRING);
      lift.value = withTiming(0, { duration: 140 });
      runOnJS(commit)(i);
    });

  const chip = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { scale: 1 + lift.value * liftScale }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <View style={style} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
        {slot > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.chip,
              { width: slot - chipInset * 2, left: chipInset },
              chipStyle,
              chip,
            ]}
          />
        ) : null}
        {Array.from({ length: count }, (_, i) => (
          <View key={i} style={styles.slot}>
            {renderItem(i, i === hover)}
          </View>
        ))}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  chip: { position: 'absolute', top: 0, bottom: 0 },
  slot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
