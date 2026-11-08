import { StyleSheet, Text, View } from 'react-native';

import { SlidingSelector } from '@/components/sliding-selector';
import { Tap } from '@/components/tap';
import { color, radius, shadow, space, type, weight } from '@/theme/tokens';

export interface Choice {
  value: string;
  label: string;
}

/**
 * Pick one of a handful — the app's radio. Same chip as the Filters screen,
 * and the same `accessibilityRole="radio"`, so a screen reader and a test
 * driver both read it as a choice rather than as a button that did something.
 *
 * `clearable` lets a tap on the chosen chip un-choose it: "Listed by" is
 * optional and silence must stay possible, because an unstated owner is not
 * claimable as one.
 */
export function Chips({
  options,
  value,
  onPick,
  clearable = false,
  label,
}: {
  options: Choice[];
  value?: string;
  onPick: (value: string | undefined) => void;
  clearable?: boolean;
  label?: string;
}) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((option) => {
        const on = option.value === value;
        return (
          <Tap
            key={option.value}
            haptic="selection"
            scale={0.96}
            style={[styles.chip, on && styles.chipOn]}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={option.label}
            onPress={() => onPick(on && clearable ? undefined : option.value)}>
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{option.label}</Text>
          </Tap>
        );
      })}
    </View>
  );
}

/**
 * The same choice as a segment, for the two or four cases that belong on one
 * line: For sale | For rent, and the area unit beside the number it applies
 * to. One idiom, borrowed from the search header.
 */
export function Segment({
  options,
  value,
  onPick,
  label,
}: {
  options: Choice[];
  value: string;
  onPick: (value: string) => void;
  label?: string;
}) {
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  return (
    <SlidingSelector
      count={options.length}
      activeIndex={index}
      onSelect={(i) => {
        if (options[i] && options[i].value !== value) onPick(options[i].value);
      }}
      chipInset={3}
      style={styles.segment}
      chipStyle={styles.segmentChip}
      liftScale={0.03}
      renderItem={(i, on) => (
        <Text
          style={[styles.segmentText, on && styles.segmentTextOn]}
          accessibilityRole="radio"
          accessibilityState={{ selected: on }}
          accessibilityLabel={`${label ? `${label}: ` : ''}${options[i].label}`}
          numberOfLines={1}>
          {options[i].label}
        </Text>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  chip: {
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radius.sm,
    backgroundColor: color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.line,
  },
  chipOn: { backgroundColor: color.accent, borderColor: color.accent },
  chipText: { fontSize: type.sub, fontWeight: weight.medium, color: color.ink },
  chipTextOn: { color: color.surface, fontWeight: weight.semibold },

  segment: {
    flexDirection: 'row',
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: color.field,
    padding: 0,
  },
  segmentChip: {
    top: 3,
    bottom: 3,
    borderRadius: radius.xs,
    backgroundColor: color.surface,
    ...shadow.card,
  },
  segmentText: { fontSize: type.sub, fontWeight: weight.medium, color: color.muted },
  segmentTextOn: { color: color.ink, fontWeight: weight.semibold },
});
