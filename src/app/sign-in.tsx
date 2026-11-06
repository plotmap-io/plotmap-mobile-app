import { Feather } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/components/logo';
import { useAuth } from '@/lib/auth';
import { color } from '@/theme/tokens';

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
        <Pressable style={styles.close} onPress={() => router.back()} hitSlop={10}>
          <Feather name="x" size={22} color={color.muted} />
        </Pressable>

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
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor="#9aabb6"
                autoCapitalize="words"
                autoFocus
              />
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={(v) => setUsername(v.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
                placeholder="username"
                placeholderTextColor="#9aabb6"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={createAccount}
              />
            </>
          ) : step === 'identify' ? (
            <TextInput
              style={styles.input}
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="Email or phone number"
              placeholderTextColor="#9aabb6"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="go"
              onSubmitEditing={sendCode}
              autoFocus
            />
          ) : (
            <TextInput
              style={[styles.input, styles.code]}
              value={otp}
              onChangeText={setOtp}
              placeholder="000000"
              placeholderTextColor="#9aabb6"
              keyboardType="number-pad"
              returnKeyType="go"
              onSubmitEditing={confirm}
              autoFocus
            />
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.primary, busy && styles.primaryBusy]}
            disabled={busy}
            onPress={
              step === 'identify' ? sendCode : step === 'register' ? createAccount : confirm
            }>
            {busy ? (
              <ActivityIndicator color={color.surface} />
            ) : (
              <Text style={styles.primaryText}>
                {step === 'identify'
                  ? 'Continue'
                  : step === 'register'
                    ? 'Create account'
                    : 'Sign in'}
              </Text>
            )}
          </Pressable>

          {step !== 'identify' ? (
            <Pressable onPress={() => setStep('identify')}>
              <Text style={styles.link}>Use a different email or phone</Text>
            </Pressable>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface, paddingHorizontal: 24 },
  close: { alignSelf: 'flex-start', padding: 6 },
  body: { flex: 1, justifyContent: 'center', gap: 12, paddingBottom: 80 },
  logo: { marginBottom: 6 },
  title: { fontSize: 25, fontWeight: '700', letterSpacing: -0.6, color: color.ink },
  subtitle: { fontSize: 14.5, color: color.muted, marginBottom: 8 },
  input: {
    height: 50,
    borderRadius: 12,
    backgroundColor: color.field,
    paddingHorizontal: 14,
    fontSize: 16,
    color: color.ink,
  },
  code: { letterSpacing: 6, fontSize: 20, fontWeight: '600', textAlign: 'center' },
  error: { fontSize: 13.5, color: color.shiraz },
  primary: {
    height: 50,
    borderRadius: 12,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryBusy: { opacity: 0.7 },
  primaryText: { fontSize: 16, fontWeight: '600', color: color.surface },
  link: { fontSize: 13.5, color: color.accent, textAlign: 'center', paddingVertical: 10 },
});
