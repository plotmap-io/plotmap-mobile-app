import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { ListingRow } from '@/components/listing-row';
import { SignInPrompt } from '@/components/sign-in-prompt';
import { Empty, ErrorState, Loading } from '@/components/states';
import { mediaUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { asRows, myListings } from '@/lib/listings';
import { color } from '@/theme/tokens';
import type { ListingCard } from '@/types/api';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signedIn, loading: authLoading, signOut } = useAuth();
  const [rows, setRows] = useState<ListingCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!signedIn) return setLoading(false);
    try {
      setRows(asRows(await myListings()));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your listings');
    } finally {
      setLoading(false);
    }
  }, [signedIn]);

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, load]);

  const initials = (user?.name ?? user?.username ?? '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.bar, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={21} color={color.ink} />
        </Pressable>
        <Text style={styles.title}>Profile</Text>
        <View style={{ width: 21 }} />
      </View>

      {authLoading ? (
        <Loading />
      ) : !signedIn ? (
        <SignInPrompt message="Sign in to see your profile." />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <Card>
            <View style={styles.head}>
              {user?.avatarUrl ? (
                <Image source={{ uri: mediaUrl(user.avatarUrl) }} style={styles.face} />
              ) : (
                <View style={[styles.face, styles.faceFallback]}>
                  <Text style={styles.faceText}>{initials}</Text>
                </View>
              )}
              <View style={styles.headText}>
                <Text style={styles.name}>{user?.name ?? 'Your account'}</Text>
                {user?.username ? (
                  <Pressable onPress={() => router.push(`/u/${user.username}`)}>
                    <Text style={styles.handleLink}>@{user.username} · View public profile</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
            {user?.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
          </Card>

          <Card>
            {[
              ['Email', user?.email, user?.emailVerified],
              ['Phone', user?.phone, user?.phoneVerified],
              ['Account', user?.accountType, undefined],
              ['Member since', user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : undefined, undefined],
            ].map(([label, value, verified], i) => (
              <View key={String(label)} style={[styles.row, i > 0 && styles.divided]}>
                <Text style={styles.label}>{String(label)}</Text>
                <View style={styles.valueWrap}>
                  <Text style={styles.value}>{value ? String(value) : '—'}</Text>
                  {verified === true ? (
                    <Feather name="check-circle" size={14} color={color.good} />
                  ) : null}
                </View>
              </View>
            ))}
          </Card>

          <Text style={styles.section}>My listings</Text>
          {error ? (
            <ErrorState message={error} onRetry={load} />
          ) : loading ? (
            <Loading />
          ) : rows.length === 0 ? (
            <Empty icon="home" message="You have no listings yet." />
          ) : (
            <Card>
              {rows.map((l) => (
                <ListingRow
                  key={l.id}
                  listing={l}
                  onPress={(id) => router.push(`/listing/${id}`)}
                />
              ))}
            </Card>
          )}

          <Pressable onPress={() => void signOut()}>
            <Text style={styles.signOut}>Sign out</Text>
          </Pressable>
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
  body: { padding: 16, gap: 14, paddingBottom: 30 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14 },
  face: { width: 54, height: 54, borderRadius: 27, backgroundColor: color.field },
  faceFallback: { backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' },
  faceText: { fontSize: 19, fontWeight: '600', color: color.surface },
  headText: { flex: 1, minWidth: 0 },
  name: { fontSize: 18, fontWeight: '700', color: color.ink },
  handle: { fontSize: 13, color: color.muted },
  handleLink: { fontSize: 13, color: color.accent },
  bio: { fontSize: 14, color: '#45596a', paddingHorizontal: 14, paddingBottom: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, padding: 13 },
  divided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.hair },
  label: { fontSize: 13.5, color: color.muted },
  valueWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  value: { fontSize: 13.5, fontWeight: '600', color: color.ink },
  section: {
    fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase',
    color: '#7e91a0', paddingHorizontal: 2,
  },
  signOut: {
    textAlign: 'center', fontSize: 14, fontWeight: '600',
    color: color.shiraz, paddingVertical: 14,
  },
});
