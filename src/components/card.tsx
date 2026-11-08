import { type ReactNode } from 'react';
import { type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { color, eyebrow, radius, type, weight } from '@/theme/tokens';

/** A white card on the grey ground: a hairline edge, 10pt corners, no shadow. */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionHead({ title, action }: { title: string; action?: string }) {
  return (
    <View style={styles.head}>
      <Text style={styles.title}>{title}</Text>
      {action ? <Text style={styles.action}>{action} ›</Text> : null}
    </View>
  );
}

export function GroupLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.group}>{children}</Text>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.line,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    paddingBottom: 8,
  },
  title: { fontSize: type.title3, fontWeight: weight.semibold, letterSpacing: -0.2, color: color.ink },
  action: { fontSize: type.sub, fontWeight: weight.semibold, color: color.accent },
  group: { ...eyebrow, paddingHorizontal: 2, paddingBottom: 8 },
});
