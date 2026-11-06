import { Feather } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { Empty, ErrorState, Loading } from '@/components/states';
import { SignInPrompt } from '@/components/sign-in-prompt';
import { useAuth } from '@/lib/auth';
import { asList, threads } from '@/lib/social';
import { color } from '@/theme/tokens';
import type { Thread } from '@/types/api';

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const { signedIn, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!signedIn) return setLoading(false);
    setLoading(true);
    try {
      setRows(asList<Thread>(await threads(), 'threads'));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load messages');
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
        <Text style={styles.title}>Messages</Text>
        <View style={{ width: 21 }} />
      </View>

      {!signedIn && !authLoading ? (
        <SignInPrompt message="Sign in to read and reply to your messages." />
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
          {error ? (
            <ErrorState message={error} onRetry={load} />
          ) : loading && rows.length === 0 ? (
            <Loading />
          ) : rows.length === 0 ? (
            <Empty icon="mail" message="No conversations yet." />
          ) : (
            <Card>
              {rows.map((t, i) => (
                <Pressable
                  key={t.id}
                  style={[styles.row, i > 0 && styles.divided]}
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
                    <Feather name="chevron-right" size={16} color="#b4c3cd" />
                  )}
                </Pressable>
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: color.surface,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.line,
  },
  title: { fontSize: 17, fontWeight: '700', color: color.ink },
  body: { padding: 16, paddingBottom: 28 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12 },
  divided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.hair },
  avatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: color.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 13, fontWeight: '600', color: color.surface },
  text: { flex: 1, minWidth: 0 },
  name: { fontSize: 14, fontWeight: '600', color: color.ink },
  preview: { fontSize: 12.5, color: color.muted },
  pill: {
    minWidth: 20, height: 20, borderRadius: 10, backgroundColor: color.accent,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  pillText: { fontSize: 11, fontWeight: '700', color: color.surface },
});
