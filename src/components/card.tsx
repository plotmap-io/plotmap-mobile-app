import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color } from '@/theme/tokens';

export function Card({ children, style }: { children: ReactNode; style?: any }) {
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
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: 12,
    overflow: 'hidden',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    paddingBottom: 6,
  },
  title: { fontSize: 16, fontWeight: '700', letterSpacing: -0.16, color: color.ink },
  action: { fontSize: 13, fontWeight: '600', color: color.accent },
  group: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#7e91a0',
    paddingHorizontal: 2,
    paddingBottom: 6,
  },
});
