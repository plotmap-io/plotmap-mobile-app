import { Feather } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { color } from '@/theme/tokens';

export function SignInPrompt({ message }: { message: string }) {
  return (
    <View style={styles.wrap}>
      <Feather name="lock" size={24} color={color.faint} />
      <Text style={styles.message}>{message}</Text>
      <Link href="/sign-in" asChild>
        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Sign in</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', gap: 12, padding: 36 },
  message: { fontSize: 14, color: color.muted, textAlign: 'center', maxWidth: 260 },
  button: {
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 11,
    backgroundColor: color.accent,
  },
  buttonText: { color: color.surface, fontWeight: '600', fontSize: 15 },
});
