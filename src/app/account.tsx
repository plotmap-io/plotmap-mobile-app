import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, GroupLabel } from '@/components/card';
import { StackScreen } from '@/components/stack-screen';
import { Empty, ErrorState, Loading } from '@/components/states';
import {
  loginMethods,
  revokeAllSessions,
  revokeSession,
  sessions as fetchSessions,
  type LoginMethod,
  type Session,
} from '@/lib/account';
import { color } from '@/theme/tokens';

export default function AccountScreen() {
  const [methods, setMethods] = useState<LoginMethod[]>([]);
  const [rows, setRows] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, s] = await Promise.all([loginMethods(), fetchSessions()]);
      setMethods(m?.methods ?? []);
      setRows(s?.sessions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your account');
    } finally {
      setLoading(false);
    }
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
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <Loading />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <View>
            <GroupLabel>How you sign in</GroupLabel>
            <Card>
              {methods.length === 0 ? (
                <Empty icon="key" message="No sign-in methods linked." />
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
                <Empty icon="monitor" message="No other devices." />
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
                    <Pressable onPress={() => endSession(s.id)} hitSlop={8}>
                      <Text style={styles.revoke}>Sign out</Text>
                    </Pressable>
                  </View>
                ))
              )}
            </Card>
          </View>

          <Pressable onPress={endAll}>
            <Text style={styles.danger}>Sign out of all devices</Text>
          </Pressable>
        </ScrollView>
      )}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 14, paddingBottom: 30 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12 },
  divided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.hair },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: color.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, minWidth: 0 },
  primary: { fontSize: 14, fontWeight: '600', color: color.ink },
  secondary: { fontSize: 12, color: color.muted },
  revoke: { fontSize: 13, fontWeight: '600', color: color.accent },
  danger: { textAlign: 'center', fontSize: 14, fontWeight: '600', color: color.shiraz, paddingVertical: 12 },
});
