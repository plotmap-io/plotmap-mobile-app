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
import { color } from '@/theme/tokens';
import type { ListingCard, PublicProfile } from '@/types/api';

/** A seller's public face — the page they hand a buyer. */
export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [rows, setRows] = useState<ListingCard[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!username) return;
    setError(null);
    try {
      const [p, l] = await Promise.all([
        publicProfile(username),
        userListings(username).catch(() => null),
      ]);
      setProfile(p);
      setRows(asRows(l as never));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load this profile');
    }
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
        <ErrorState message={error} onRetry={load} />
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
              <Empty icon="home" message="No public listings." />
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
  body: { padding: 16, gap: 14, paddingBottom: 30 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14 },
  face: { width: 56, height: 56, borderRadius: 28, backgroundColor: color.field },
  faceFallback: { backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' },
  faceText: { fontSize: 20, fontWeight: '600', color: color.surface },
  headText: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontSize: 18, fontWeight: '700', color: color.ink },
  handle: { fontSize: 13, color: color.muted },
  badge: {
    alignSelf: 'flex-start', backgroundColor: color.accentSoft, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3, marginTop: 2,
  },
  badgeText: { fontSize: 11, fontWeight: '600', color: color.accent, textTransform: 'capitalize' },
  bio: { fontSize: 14, color: '#45596a', paddingHorizontal: 14, paddingBottom: 14 },
});
