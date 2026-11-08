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
import { asList, threads } from '@/lib/social';
import { color, radius, space, type, weight } from '@/theme/tokens';
import type { Thread } from '@/types/api';

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const { signedIn, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // A promise chain, not an `async` body — the state writes belong in
  // callbacks so an effect may call this (react-hooks/set-state-in-effect).
  const load = useCallback(() => {
    threads()
      .then((r) => {
        setRows(asList<Thread>(r, 'threads'));
        setError(null);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Could not load messages'),
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
        <Text style={styles.title}>Messages</Text>
        <View style={styles.filler} />
      </View>

      {!signedIn && !authLoading ? (
        <SignInPrompt message="Sign in to read and reply to your messages." />
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
          {error ? (
            <ErrorState title="Couldn’t load your messages" message={error} onRetry={load} />
          ) : loading && rows.length === 0 ? (
            <Loading />
          ) : rows.length === 0 ? (
            <Empty
              icon="mail"
              title="No conversations yet"
              message="Message a seller from a listing and the thread lives here."
            />
          ) : (
            <Card>
              {rows.map((t, i) => (
                <Tap
                  key={t.id}
                  haptic="none"
                  scale={1}
                  style={[styles.row, i > 0 && styles.divided]}
                  accessibilityRole="button"
                  accessibilityLabel={`Conversation with ${t.counterpartName ?? t.title ?? 'someone'}`}
                  onPress={() => router.push(`/thread/${t.id}`)}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(t.counterpartName ?? t.title ?? '?').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.text}>
                    <Text style={styles.name} numberOfLines={1}>
                      {t.counterpartName ?? t.title ?? 'Conversation'}
                    </Text>
                    <Text style={styles.preview} numberOfLines={1}>
                      {t.lastMessage ?? 'No messages yet'}
                    </Text>
                  </View>
                  {t.unreadCount ? (
                    <View style={styles.pill}>
                      <Text style={styles.pillText}>{t.unreadCount}</Text>
                    </View>
                  ) : (
                    <Feather name="chevron-right" size={16} color={color.chevron} />
                  )}
                </Tap>
              ))}
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
  filler: { width: 21 },
  body: { padding: space[4], paddingBottom: 28 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: space[3] },
  divided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.hair },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: type.sub, fontWeight: weight.semibold, color: color.surface },
  text: { flex: 1, minWidth: 0 },
  name: { fontSize: type.sub, fontWeight: weight.semibold, color: color.ink },
  preview: { fontSize: type.footnote, color: color.muted },
  pill: {
    minWidth: 20,
    height: 20,
    borderRadius: radius.pill,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  pillText: { fontSize: type.caption, fontWeight: weight.bold, color: color.surface },
});
