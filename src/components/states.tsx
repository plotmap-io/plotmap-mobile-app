import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { color } from '@/theme/tokens';

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={color.accent} />
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Feather name="alert-circle" size={24} color={color.warn} />
      <Text style={styles.muted}>{message}</Text>
      {onRetry ? (
        <Pressable style={styles.retry} onPress={onRetry}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Empty({ icon = 'inbox', message }: { icon?: any; message: string }) {
  return (
    <View style={styles.center}>
      <Feather name={icon} size={24} color={color.faint} />
      <Text style={styles.muted}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', gap: 10, padding: 36 },
  muted: { fontSize: 13.5, color: color.muted, textAlign: 'center' },
  retry: {
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: color.accent,
  },
  retryText: { color: color.surface, fontWeight: '600', fontSize: 13.5 },
});
