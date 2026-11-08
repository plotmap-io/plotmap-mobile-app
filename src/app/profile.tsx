import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { ListingRow } from '@/components/listing-row';
import { SignInPrompt } from '@/components/sign-in-prompt';
import { Empty, ErrorState, Loading } from '@/components/states';
import { Button, Tap } from '@/components/tap';
import { mediaUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { asRows, myListings } from '@/lib/listings';
import { color, eyebrow, radius, space, type, weight } from '@/theme/tokens';
import type { ListingCard } from '@/types/api';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signedIn, loading: authLoading, signOut } = useAuth();
  const [rows, setRows] = useState<ListingCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // A promise chain, not an `async` body — the state writes belong in
  // callbacks so an effect may call this (react-hooks/set-state-in-effect).
  const load = useCallback(() => {
    myListings()
      .then((r) => {
        setRows(asRows(r));
        setError(null);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Could not load your listings'),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (authLoading || !signedIn) return;
    load();
  }, [authLoading, signedIn, load]);

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
        <Tap
          haptic="none"
          scale={0.9}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}>
          <Feather name="arrow-left" size={21} color={color.ink} />
        </Tap>
        <Text style={styles.title}>Profile</Text>
        <View style={styles.filler} />
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
                  <Tap
                    haptic="none"
                    scale={0.98}
                    accessibilityRole="link"
                    accessibilityLabel="View your public profile"
                    onPress={() => router.push(`/u/${user.username}`)}>
                    <Text style={styles.handleLink}>@{user.username} · View public profile</Text>
                  </Tap>
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
            <ErrorState title="Couldn’t load your listings" message={error} onRetry={load} />
          ) : loading ? (
            <Loading />
          ) : rows.length === 0 ? (
            <Empty
              icon="home"
              title="No listings yet"
              message="Your first listing takes a photo, a pin and a price."
            />
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

          <Button
            label="Sign out"
            variant="ghost"
            size="md"
            haptic="light"
            onPress={() => void signOut()}
          />
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
  body: { padding: space[4], gap: 14, paddingBottom: 30 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: 14 },
  face: { width: 54, height: 54, borderRadius: radius.pill, backgroundColor: color.field },
  faceFallback: { backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' },
  faceText: { fontSize: type.title2, fontWeight: weight.semibold, color: color.surface },
  headText: { flex: 1, minWidth: 0 },
  name: { fontSize: type.title2, fontWeight: weight.bold, letterSpacing: -0.3, color: color.ink },
  handleLink: { fontSize: type.sub, color: color.accent },
  bio: {
    fontSize: type.sub,
    lineHeight: 20,
    color: color.inkSoft,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space[3], padding: space[3] },
  divided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.hair },
  label: { fontSize: type.sub, color: color.muted },
  valueWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  value: { fontSize: type.sub, fontWeight: weight.semibold, color: color.ink },
  section: { ...eyebrow, paddingHorizontal: 2 },
});
