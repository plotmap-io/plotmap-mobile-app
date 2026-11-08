import { Feather } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { SignInPrompt } from '@/components/sign-in-prompt';
import { Empty, ErrorState, Loading } from '@/components/states';
import { Tap } from '@/components/tap';
import { useAuth } from '@/lib/auth';
import { activity, asList, markAllRead } from '@/lib/social';
import { color, radius, space, type, weight } from '@/theme/tokens';

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

  // A promise chain, not an `async` body — the state writes belong in
  // callbacks so an effect may call this (react-hooks/set-state-in-effect).
  const load = useCallback(() => {
    activity()
      .then((r) => {
        setRows(asList<Item>(r as Item[], 'items'));
        setError(null);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Could not load notifications'),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (authLoading || !signedIn) return;
    load();
  }, [authLoading, signedIn, load]);

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
        <Text style={styles.title}>Notifications</Text>
        <Tap
          haptic="light"
          scale={0.94}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Mark everything read"
          onPress={() => markAllRead().then(load).catch(() => {})}>
          <Text style={styles.action}>Mark read</Text>
        </Tap>
      </View>

      {!signedIn && !authLoading ? (
        <SignInPrompt message="Sign in to see your alerts and activity." />
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
          {error ? (
            <ErrorState title="Couldn’t load your notifications" message={error} onRetry={load} />
          ) : loading && rows.length === 0 ? (
            <Loading />
          ) : rows.length === 0 ? (
            <Empty icon="bell" title="Nothing new" message="Activity on your listings shows up here." />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[4],
    paddingBottom: space[3],
    backgroundColor: color.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.line,
  },
  title: { fontSize: type.title3, fontWeight: weight.bold, color: color.ink },
  action: { fontSize: type.sub, fontWeight: weight.semibold, color: color.accent },
  body: { padding: space[4], paddingBottom: 28 },
  row: { flexDirection: 'row', gap: 11, padding: space[3], alignItems: 'flex-start' },
  divided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.hair },
  disc: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: color.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, minWidth: 0 },
  headline: { fontSize: type.sub, color: color.ink, lineHeight: 18 },
  when: { fontSize: type.footnote, color: color.faint, marginTop: 2 },
});
