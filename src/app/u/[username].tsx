import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, GroupLabel } from '@/components/card';
import { ListingRow } from '@/components/listing-row';
import { StackScreen } from '@/components/stack-screen';
import { Empty, ErrorState, Loading } from '@/components/states';
import { mediaUrl } from '@/lib/api';
import { asRows } from '@/lib/listings';
import { publicProfile, userListings } from '@/lib/social';
import { color, radius, space, type, weight } from '@/theme/tokens';
import type { ListingCard, PublicProfile } from '@/types/api';

/** A seller's public face — the page they hand a buyer. */
export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [rows, setRows] = useState<ListingCard[]>([]);
  const [error, setError] = useState<string | null>(null);

  // A promise chain, not an `async` body — the state writes belong in
  // callbacks so an effect may call this (react-hooks/set-state-in-effect).
  const load = useCallback(() => {
    if (!username) return;
    Promise.all([publicProfile(username), userListings(username).catch(() => null)])
      .then(([p, l]) => {
        setProfile(p);
        setRows(asRows(l as never));
        setError(null);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Could not load this profile'),
      );
  }, [username]);

  useEffect(() => {
    load();
  }, [load]);

  const initials = (profile?.name ?? username ?? '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

  return (
    <StackScreen title={profile?.name ?? `@${username ?? ''}`}>
      {error ? (
        <ErrorState title="Couldn’t load this profile" message={error} onRetry={load} />
      ) : !profile ? (
        <Loading />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <Card>
            <View style={styles.head}>
              {profile.avatarUrl ? (
                <Image source={{ uri: mediaUrl(profile.avatarUrl) }} style={styles.face} />
              ) : (
                <View style={[styles.face, styles.faceFallback]}>
                  <Text style={styles.faceText}>{initials}</Text>
                </View>
              )}
              <View style={styles.headText}>
                <Text style={styles.name}>{profile.name ?? 'Seller'}</Text>
                {profile.username ? (
                  <Text style={styles.handle}>@{profile.username}</Text>
                ) : null}
                {profile.accountType ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{profile.accountType}</Text>
                  </View>
                ) : null}
              </View>
            </View>
            {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
          </Card>

          <View>
            <GroupLabel>Listings</GroupLabel>
            {rows.length === 0 ? (
              <Empty
                icon="home"
                title="No public listings"
                message="Nothing of theirs is on the market right now."
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
          </View>
        </ScrollView>
      )}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  body: { padding: space[4], gap: 14, paddingBottom: 30 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: 14 },
  face: { width: 56, height: 56, borderRadius: radius.pill, backgroundColor: color.field },
  faceFallback: { backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' },
  faceText: { fontSize: type.title2, fontWeight: weight.semibold, color: color.surface },
  headText: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontSize: type.title2, fontWeight: weight.bold, letterSpacing: -0.3, color: color.ink },
  handle: { fontSize: type.sub, color: color.muted },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: color.accentSoft,
    borderRadius: radius.xs,
    paddingHorizontal: space[2],
    paddingVertical: 3,
    marginTop: 2,
  },
  badgeText: {
    fontSize: type.caption,
    fontWeight: weight.semibold,
    color: color.accent,
    textTransform: 'capitalize',
  },
  bio: {
    fontSize: type.sub,
    lineHeight: 20,
    color: color.inkSoft,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
});
