import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  type StyleProp,
  StyleSheet,
  Text,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { haptic, type HapticKind } from '@/lib/haptics';
import { color, radius, type, weight } from '@/theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Every tappable thing presses: it shrinks a hair and dims while the finger
 * is down, on the UI thread, and springs back on release. A `Pressable`
 * with no pressed state reads as a label that happened to work, and that
 * is most of what made the app feel like a web page.
 *
 * `haptic` names the tick to play on press — `none` for rows and links,
 * `selection` for controls, `light` for actions that change something.
 */
export function Tap({
  children,
  style,
  haptic: kind = 'none',
  scale = 0.97,
  dim = 0.88,
  onPress,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  haptic?: HapticKind | 'none';
  /** Scale while pressed; 1 keeps the size and only dims. */
  scale?: number;
  /** Opacity while pressed. */
  dim?: number;
}) {
  const pressed = useSharedValue(0);

  // The dimming of a DISABLED control has to live in the animated style too:
  // an animated `opacity` overrides a static one, so a disabled button was
  // painted at full strength and looked pressable. A disabled Publish that
  // looks live is a promise the screen cannot keep.
  const anim = useAnimatedStyle(() => {
    const p = pressed.get();
    return {
      transform: [{ scale: 1 - (1 - scale) * p }],
      opacity: (disabled ? 0.45 : 1) * (1 - (1 - dim) * p),
    };
  });

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        pressed.set(withTiming(1, { duration: 70 }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.set(withTiming(0, { duration: 180 }));
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (kind !== 'none') haptic[kind]();
        onPress?.(e);
      }}
      style={[style, anim]}>
      {children}
    </AnimatedPressable>
  );
}

/**
 * The one button. `primary` is the slate fill, `secondary` the soft slate
 * tint, `ghost` text only. `lg` is 50pt for a screen's main action, `md`
 * 40pt for one inside a card or a bar.
 */
export function Button({
  label,
  icon,
  variant = 'primary',
  size = 'lg',
  busy = false,
  disabled,
  style,
  onPress,
  haptic: kind = 'light',
  accessibilityLabel,
}: {
  label: string;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'md' | 'lg';
  busy?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  haptic?: HapticKind | 'none';
  accessibilityLabel?: string;
}) {
  const tint = variant === 'primary' ? color.surface : color.accent;
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      haptic={kind}
      scale={0.98}
      onPress={onPress}
      style={[
        styles.button,
        size === 'md' ? styles.md : styles.lg,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        style,
      ]}>
      {busy ? (
        <ActivityIndicator color={tint} />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.label,
              size === 'md' && styles.labelMd,
              { color: tint },
              variant === 'ghost' && styles.labelGhost,
            ]}>
            {label}
          </Text>
        </>
      )}
    </Tap>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
    borderRadius: radius.md,
  },
  lg: { height: 50 },
  md: { height: 40, borderRadius: radius.sm, paddingHorizontal: 14 },
  primary: { backgroundColor: color.accent },
  secondary: { backgroundColor: color.accentSoft },
  label: { fontSize: type.callout, fontWeight: weight.semibold, letterSpacing: -0.1 },
  labelMd: { fontSize: type.body },
  labelGhost: { fontWeight: weight.semibold },
});
