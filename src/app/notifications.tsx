import { Feather } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { SignInPrompt } from '@/components/sign-in-prompt';
import { Empty, ErrorState, Loading } from '@/components/states';
import { useAuth } from '@/lib/auth';
import { activity, asList, markAllRead } from '@/lib/social';
import { color } from '@/theme/tokens';

type Item = Record<string, unknown>;

/** The activity feed is loosely typed; show whatever labels it carries. */
function line(item: Item): { title: string; when?: string } {
  const title =
    (item.title as string) ??
    (item.message as string) ??
    (item.description as string) ??
    (item.type as string) ??
    'Activity';
  const when = (item.createdAt as string) ?? (item.at as string);
  return { title, when };
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { signedIn, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!signedIn) return setLoading(false);
    setLoading(true);
    try {
      setRows(asList<Item>((await activity()) as Item[], 'items'));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load notifications');
    } finally {
      setLoading(false);
    }
  }, [signedIn]);

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, load]);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.bar, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={21} color={color.ink} />
        </Pressable>
        <Text style={styles.title}>Notifications</Text>
        <Pressable
          hitSlop={10}
          onPress={() => markAllRead().then(load).catch(() => {})}>
          <Text style={styles.action}>Mark read</Text>
        </Pressable>
      </View>

      {!signedIn && !authLoading ? (
        <SignInPrompt message="Sign in to see your alerts and activity." />
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
          {error ? (
            <ErrorState message={error} onRetry={load} />
          ) : loading && rows.length === 0 ? (
            <Loading />
          ) : rows.length === 0 ? (
            <Empty icon="bell" message="Nothing new." />
          ) : (
            <Card>
              {rows.map((item, i) => {
                const { title, when } = line(item);
                return (
                  <View key={i} style={[styles.row, i > 0 && styles.divided]}>
                    <View style={styles.disc}>
                      <Feather name="bell" size={15} color={color.accent} />
                    </View>
                    <View style={styles.text}>
                      <Text style={styles.headline}>{title}</Text>
                      {when ? (
                        <Text style={styles.when}>{new Date(when).toLocaleString()}</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </Card>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  bar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: color.surface,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.line,
  },
  title: { fontSize: 17, fontWeight: '700', color: color.ink },
  action: { fontSize: 13.5, fontWeight: '600', color: color.accent },
  body: { padding: 16, paddingBottom: 28 },
  row: { flexDirection: 'row', gap: 11, padding: 12, alignItems: 'flex-start' },
  divided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.hair },
  disc: {
    width: 28, height: 28, borderRadius: 9, backgroundColor: color.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  text: { flex: 1, minWidth: 0 },
  headline: { fontSize: 13.5, color: color.ink, lineHeight: 18 },
  when: { fontSize: 11.5, color: color.faint, marginTop: 2 },
});
