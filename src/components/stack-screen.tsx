import { Feather } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Tap } from '@/components/tap';
import { color, space, type, weight } from '@/theme/tokens';

/** The chrome every pushed screen shares: back, centred title, optional action. */
export function StackScreen({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.bar, { paddingTop: insets.top + 6 }]}>
        <Tap
          haptic="none"
          scale={0.9}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}>
          <Feather name="arrow-left" size={21} color={color.ink} />
        </Tap>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.right}>{action}</View>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[4],
    paddingBottom: space[3],
    backgroundColor: color.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.line,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: type.title3,
    fontWeight: weight.bold,
    color: color.ink,
  },
  right: { minWidth: 21, alignItems: 'flex-end' },
});
