import { Feather } from '@expo/vector-icons';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Button } from '@/components/tap';
import { ROW_HEIGHT } from '@/components/listing-row';
import { color, radius, type, weight } from '@/theme/tokens';

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={color.accent} />
      <Text style={styles.body}>{label}</Text>
    </View>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.center}>
      <View style={[styles.disc, styles.discWarn]}>
        <Feather name="alert-circle" size={22} color={color.warn} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{message}</Text>
      {onRetry ? (
        <Button label="Try again" variant="secondary" size="md" onPress={onRetry} style={styles.action} />
      ) : null}
    </View>
  );
}

export function Empty({
  icon = 'inbox',
  title,
  message,
}: {
  icon?: keyof typeof Feather.glyphMap;
  title?: string;
  message: string;
}) {
  return (
    <View style={styles.center}>
      <View style={styles.disc}>
        <Feather name={icon} size={22} color={color.muted} />
      </View>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <Text style={styles.body}>{message}</Text>
    </View>
  );
}

/**
 * The shape of the rows to come, breathing. A spinner says "wait"; a
 * skeleton says "here is where it goes", and the list does not jump when the
 * real rows land because they are the same height.
 */
export function SkeletonRows({ count = 4 }: { count?: number }) {
  const pulse = useSharedValue(0.55);
  useEffect(() => {
    pulse.set(
      withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0.55, { duration: 700 })), -1),
    );
  }, [pulse]);
  const breathe = useAnimatedStyle(() => ({ opacity: pulse.get() }));

  return (
    <Animated.View style={breathe}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.skRow}>
          <View style={styles.skPhoto} />
          <View style={styles.skText}>
            <View style={[styles.skLine, { width: '45%', height: 14 }]} />
            <View style={[styles.skLine, { width: '70%' }]} />
            <View style={[styles.skLine, { width: '55%' }]} />
            <View style={[styles.skLine, { width: '30%', height: 9 }]} />
          </View>
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 32, paddingVertical: 40 },
  disc: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: color.field,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  discWarn: { backgroundColor: color.warnSoft },
  title: { fontSize: type.callout, fontWeight: weight.semibold, color: color.ink, textAlign: 'center' },
  body: { fontSize: type.sub, lineHeight: 19, color: color.muted, textAlign: 'center', maxWidth: 280 },
  action: { marginTop: 8 },
  skRow: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.hair,
  },
  skPhoto: { width: 112, height: 84, borderRadius: 8, backgroundColor: color.field },
  skText: { flex: 1, gap: 8 },
  skLine: { height: 11, borderRadius: 4, backgroundColor: color.field },
});
