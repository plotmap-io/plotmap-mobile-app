import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, GroupLabel } from '@/components/card';
import { StackScreen } from '@/components/stack-screen';
import { Empty, ErrorState, Loading } from '@/components/states';
import { Button, Tap } from '@/components/tap';
import {
  loginMethods,
  revokeAllSessions,
  revokeSession,
  sessions as fetchSessions,
  type LoginMethod,
  type Session,
} from '@/lib/account';
import { color, radius, space, type, weight } from '@/theme/tokens';

export default function AccountScreen() {
  const [methods, setMethods] = useState<LoginMethod[]>([]);
  const [rows, setRows] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // A promise chain, not an `async` body: every state write then lives in a
  // callback rather than in the function the effect calls, which is what the
  // React Compiler's lint means by "no setState inside an effect".
  const load = useCallback(() => {
    Promise.all([loginMethods(), fetchSessions()])
      .then(([m, s]) => {
        setMethods(m?.methods ?? []);
        setRows(s?.sessions ?? []);
        setError(null);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Could not load your account'),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const endSession = (id: string) =>
    Alert.alert('Sign this device out?', 'It will need a new code to sign back in.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => void revokeSession(id).then(load).catch(() => {}),
      },
    ]);

  const endAll = () =>
    Alert.alert('Sign out everywhere?', 'Every device, including this one.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out all',
        style: 'destructive',
        onPress: () => void revokeAllSessions().then(load).catch(() => {}),
      },
    ]);

  return (
    <StackScreen title="Account">
      {error ? (
        <ErrorState title="Couldn’t load your account" message={error} onRetry={load} />
      ) : loading ? (
        <Loading />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <View>
            <GroupLabel>How you sign in</GroupLabel>
            <Card>
              {methods.length === 0 ? (
                <Empty icon="key" title="Nothing linked" message="No sign-in methods linked." />
              ) : (
                methods.map((m, i) => (
                  <View key={m.id} style={[styles.row, i > 0 && styles.divided]}>
                    <View style={styles.icon}>
                      <Feather
                        name={m.providerId === 'email' ? 'mail' : m.providerId === 'phone' ? 'phone' : 'globe'}
                        size={15}
                        color={color.accent}
                      />
                    </View>
                    <View style={styles.text}>
                      <Text style={styles.primary}>{m.providerKey}</Text>
                      <Text style={styles.secondary}>
                        {m.isPrimary ? 'Primary · ' : ''}
                        {m.verified ? 'Verified' : 'Unverified'}
                      </Text>
                    </View>
                    {m.verified ? (
                      <Feather name="check-circle" size={16} color={color.good} />
                    ) : null}
                  </View>
                ))
              )}
            </Card>
          </View>

          <View>
            <GroupLabel>Signed-in devices</GroupLabel>
            <Card>
              {rows.length === 0 ? (
                <Empty icon="monitor" title="This device only" message="No other devices." />
              ) : (
                rows.map((s, i) => (
                  <View key={s.id} style={[styles.row, i > 0 && styles.divided]}>
                    <View style={styles.icon}>
                      <Feather name="smartphone" size={15} color={color.accent} />
                    </View>
                    <View style={styles.text}>
                      <Text style={styles.primary}>
                        {s.deviceName ?? 'Device'}
                        {s.browserName ? ` · ${s.browserName}` : ''}
                      </Text>
                      <Text style={styles.secondary}>
                        {[s.osName, s.location].filter(Boolean).join(' · ') || s.ipAddress}
                      </Text>
                    </View>
                    <Tap
                      haptic="light"
                      scale={0.94}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Sign out ${s.deviceName ?? 'this device'}`}
                      onPress={() => endSession(s.id)}>
                      <Text style={styles.revoke}>Sign out</Text>
                    </Tap>
                  </View>
                ))
              )}
            </Card>
          </View>

          <Button
            label="Sign out of all devices"
            variant="ghost"
            size="md"
            haptic="light"
            style={styles.danger}
            onPress={endAll}
          />
        </ScrollView>
      )}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  body: { padding: space[4], gap: 14, paddingBottom: 30 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: space[3] },
  divided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.hair },
  icon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: color.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, minWidth: 0 },
  primary: { fontSize: type.sub, fontWeight: weight.semibold, color: color.ink },
  secondary: { fontSize: type.footnote, color: color.muted },
  revoke: { fontSize: type.sub, fontWeight: weight.semibold, color: color.accent },
  danger: { marginTop: space[1] },
});
