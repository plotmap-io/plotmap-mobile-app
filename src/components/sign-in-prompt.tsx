import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Logo } from '@/components/logo';
import { Button } from '@/components/tap';
import { color, type, weight } from '@/theme/tokens';

/** A guest's view of a signed-in screen: what it holds, and the one way in. */
export function SignInPrompt({
  title = 'Sign in to Plotmap',
  message,
}: {
  title?: string;
  message: string;
}) {
  return (
    <View style={styles.wrap}>
      <Logo size={40} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <Button label="Sign in" size="md" onPress={() => router.push('/sign-in')} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 32, paddingVertical: 48 },
  title: { fontSize: type.title3, fontWeight: weight.semibold, color: color.ink, marginTop: 8 },
  message: { fontSize: type.sub, lineHeight: 19, color: color.muted, textAlign: 'center', maxWidth: 280 },
  button: { marginTop: 10, paddingHorizontal: 24 },
});
