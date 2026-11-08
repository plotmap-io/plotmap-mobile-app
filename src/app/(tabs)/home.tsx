import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Card, SectionHead } from '@/components/card';
import { ListingRow } from '@/components/listing-row';
import { SignInPrompt } from '@/components/sign-in-prompt';
import { Empty, ErrorState, Loading } from '@/components/states';
import { Button } from '@/components/tap';
import { useAuth } from '@/lib/auth';
import { asRows, myListings } from '@/lib/listings';
import { color, eyebrow, radius, space, type, weight } from '@/theme/tokens';
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

  // A promise chain, not an `async` body: every state write then lives in a
  // callback rather than in the function the effect calls, which is what the
  // React Compiler's lint means by "no setState inside an effect".
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

  // A pull is an event, where setting state is fine — and the control needs
  // the flag back on or it snaps shut the moment the finger lifts.
  const refresh = useCallback(() => {
    setLoading(true);
    load();
  }, [load]);

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
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.greeting}>
          {user?.name ? `Hello, ${user.name.split(' ')[0]}` : 'Hello'}
        </Text>

        <Button
          label="Create listing"
          size="lg"
          icon={<Feather name="plus" size={19} color={color.surface} />}
          onPress={() => router.push('/create')}
        />

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
            <ErrorState title="Couldn’t load your listings" message={error} onRetry={load} />
          ) : !loading && rows.length === 0 ? (
            <Empty
              icon="home"
              title="No listings yet"
              message="Your first listing takes a photo, a pin and a price."
            />
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
  content: { padding: space[4], paddingBottom: 28, gap: space[4] },

  greeting: {
    fontSize: type.title2,
    fontWeight: weight.bold,
    letterSpacing: -0.4,
    color: color.ink,
  },
  tiles: {
    flexDirection: 'row',
    backgroundColor: color.line,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.line,
    borderRadius: radius.sm,
    overflow: 'hidden',
    gap: StyleSheet.hairlineWidth,
  },
  tile: { flex: 1, backgroundColor: color.surface, paddingHorizontal: space[3], paddingVertical: space[3] },
  tileLabel: eyebrow,
  tileValue: {
    fontSize: type.large,
    fontWeight: weight.bold,
    letterSpacing: -0.9,
    color: color.ink,
    marginTop: 2,
  },
  tileNote: { fontSize: type.footnote, color: color.muted, marginTop: 1 },
});
