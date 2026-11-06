import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, SectionHead } from '@/components/card';
import { ListingRow } from '@/components/listing-row';
import { AppHeader } from '@/components/app-header';
import { SignInPrompt } from '@/components/sign-in-prompt';
import { Empty, ErrorState, Loading } from '@/components/states';
import { useAuth } from '@/lib/auth';
import { asRows, myListings } from '@/lib/listings';
import { color } from '@/theme/tokens';
import type { ListingCard } from '@/types/api';

/** Numbers are type, not tiles: label, figure, note, one named link. */
function Tile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileNote}>{note}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { user, signedIn, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<ListingCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!signedIn) {
      setLoading(false);
      return;
    }
    setLoading(true);
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

  const header = <AppHeader title="Home" />;

  if (authLoading) {
    return (
      <View style={styles.screen}>
        {header}
        <Loading />
      </View>
    );
  }

  if (!signedIn) {
    return (
      <View style={styles.screen}>
        {header}
        <SignInPrompt message="Sign in to see your listings, views and messages." />
      </View>
    );
  }

  const live = rows.filter((r) => r.status === 'ForSale' || r.status === 'ForRent');

  return (
    <View style={styles.screen}>
      {header}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.greeting}>
          {user?.name ? `Hello, ${user.name.split(' ')[0]}` : 'Hello'}
        </Text>

        <Pressable style={styles.primary} onPress={() => router.push('/create')}>
          <Feather name="plus" size={20} color={color.surface} />
          <Text style={styles.primaryText}>Create listing</Text>
        </Pressable>

        <View style={styles.tiles}>
          <Tile label="Live listings" value={String(live.length)} note="Published and visible" />
          <Tile
            label="All listings"
            value={String(rows.length)}
            note="Including drafts and closed"
          />
        </View>

        <View>
          <SectionHead title="My listings" />
          {error ? (
            <ErrorState message={error} onRetry={load} />
          ) : !loading && rows.length === 0 ? (
            <Empty icon="home" message="You have no listings yet." />
          ) : (
            <Card>
              {rows.map((listing) => (
                <ListingRow
                  key={listing.id}
                  listing={listing}
                  onPress={(id) => router.push(`/listing/${id}`)}
                />
              ))}
            </Card>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  content: { padding: 16, paddingBottom: 28, gap: 14 },

  greeting: { fontSize: 19, fontWeight: '700', letterSpacing: -0.38, color: color.ink },
  primary: {
    height: 46,
    borderRadius: 12,
    backgroundColor: color.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryText: { fontSize: 16, fontWeight: '600', color: color.surface },
  tiles: {
    flexDirection: 'row',
    backgroundColor: color.line,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: 12,
    overflow: 'hidden',
    gap: 1,
  },
  tile: { flex: 1, backgroundColor: color.surface, paddingHorizontal: 12, paddingVertical: 11 },
  tileLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.95,
    textTransform: 'uppercase',
    color: '#7e91a0',
  },
  tileValue: { fontSize: 27, fontWeight: '700', letterSpacing: -0.8, color: color.ink },
  tileNote: { fontSize: 11.5, color: color.muted, marginTop: 1 },
});
