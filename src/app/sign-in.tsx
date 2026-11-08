import { Feather } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/components/logo';
import { Button, Tap } from '@/components/tap';
import { useAuth } from '@/lib/auth';
import { color, noOutline, radius, space, type, weight } from '@/theme/tokens';

/** Two steps: ask for the identifier, then verify the code the backend sent. */
export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { requestOtp, register, verifyOtp } = useAuth();
  const [step, setStep] = useState<'identify' | 'register' | 'verify'>('identify');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    if (!identifier.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await requestOtp(identifier.trim());
      setStep('verify');
    } catch (e) {
      // A new email or phone has no account yet — collect a name and sign up.
      const message = e instanceof Error ? e.message : '';
      if (/not found/i.test(message)) {
        setStep('register');
      } else {
        setError(message || 'Could not send the code');
      }
    } finally {
      setBusy(false);
    }
  }

  async function createAccount() {
    if (!name.trim() || !username.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await register(identifier.trim(), name.trim(), username.trim());
      setStep('verify');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the account');
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!otp.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await verifyOtp(identifier.trim(), otp.trim());
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That code did not work');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.screen, { paddingTop: insets.top + 12 }]}>
        <Tap
          haptic="none"
          scale={0.9}
          hitSlop={10}
          style={styles.close}
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => router.back()}>
          <Feather name="x" size={22} color={color.muted} />
        </Tap>

        <View style={styles.body}>
          <View style={styles.logo}><Logo size={46} /></View>
          <Text style={styles.title}>
            {step === 'identify'
              ? 'Sign in to Plotmap'
              : step === 'register'
                ? 'Create your account'
                : 'Enter your code'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 'identify'
              ? 'We’ll send a one-time code to your email or phone.'
              : step === 'register'
                ? `No account for ${identifier} yet. Pick a name and handle.`
                : `Sent to ${identifier}.`}
          </Text>

          {step === 'register' ? (
            <>
              <TextInput
                style={[styles.input, noOutline]}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={color.placeholder}
                autoCapitalize="words"
                autoFocus
                accessibilityLabel="Your name"
              />
              <TextInput
                style={[styles.input, noOutline]}
                value={username}
                onChangeText={(v) => setUsername(v.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
                placeholder="username"
                placeholderTextColor={color.placeholder}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={createAccount}
                accessibilityLabel="Username"
              />
            </>
          ) : step === 'identify' ? (
            <TextInput
              style={[styles.input, noOutline]}
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="Email or phone number"
              placeholderTextColor={color.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="go"
              onSubmitEditing={sendCode}
              autoFocus
              accessibilityLabel="Email or phone number"
            />
          ) : (
            <TextInput
              style={[styles.input, styles.code]}
              value={otp}
              onChangeText={setOtp}
              placeholder="000000"
              placeholderTextColor={color.placeholder}
              keyboardType="number-pad"
              returnKeyType="go"
              onSubmitEditing={confirm}
              autoFocus
              accessibilityLabel="One-time code"
            />
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            label={
              step === 'identify' ? 'Continue' : step === 'register' ? 'Create account' : 'Sign in'
            }
            size="lg"
            busy={busy}
            style={styles.submit}
            onPress={step === 'identify' ? sendCode : step === 'register' ? createAccount : confirm}
          />

          {step !== 'identify' ? (
            <Button
              label="Use a different email or phone"
              variant="ghost"
              size="md"
              haptic="selection"
              onPress={() => setStep('identify')}
            />
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface, paddingHorizontal: space[6] },
  close: { alignSelf: 'flex-start', padding: 6 },
  body: { flex: 1, justifyContent: 'center', gap: space[3], paddingBottom: 80 },
  logo: { marginBottom: 6 },
  title: { fontSize: type.title1, fontWeight: weight.bold, letterSpacing: -0.6, color: color.ink },
  subtitle: { fontSize: type.body, lineHeight: 21, color: color.muted, marginBottom: space[2] },
  input: {
    height: 50,
    borderRadius: radius.md,
    backgroundColor: color.field,
    paddingHorizontal: 14,
    fontSize: type.callout,
    color: color.ink,
  },
  code: {
    letterSpacing: 6,
    fontSize: type.title2,
    fontWeight: weight.semibold,
    textAlign: 'center',
  },
  error: { fontSize: type.sub, color: color.shiraz },
  submit: { marginTop: space[1] },
});
