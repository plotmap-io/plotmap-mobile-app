import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Card } from '@/components/card';
import { ListingRow } from '@/components/listing-row';
import { Empty, ErrorState, Loading } from '@/components/states';
import { SignInPrompt } from '@/components/sign-in-prompt';
import { useAuth } from '@/lib/auth';
import { asRows, favouriteListings, removeFavourite } from '@/lib/listings';
import { color, space } from '@/theme/tokens';
import type { ListingCard } from '@/types/api';

export default function SavedScreen() {
  const { signedIn, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<ListingCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // A promise chain, not an `async` body: every state write then lives in a
  // callback rather than in the function the effect calls, which is what the
  // React Compiler's lint means by "no setState inside an effect".
  const load = useCallback(() => {
    favouriteListings()
      .then((r) => {
        setRows(asRows(r));
        setError(null);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Could not load saved listings'),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (authLoading || !signedIn) return;
    load();
  }, [authLoading, signedIn, load]);

  const refresh = useCallback(() => {
    setLoading(true);
    load();
  }, [load]);

  const unsave = useCallback(async (id: string) => {
    // Optimistic: the row leaves at once, and comes back if the call fails.
    const before = rows;
    setRows((current) => current.filter((row) => row.id !== id));
    try {
      await removeFavourite(id);
    } catch {
      setRows(before);
    }
  }, [rows]);

  if (authLoading) return <Shell><Loading /></Shell>;
  if (!signedIn) {
    return (
      <Shell>
        <SignInPrompt message="Sign in to see the listings you've saved." />
      </Shell>
    );
  }

  return (
    <Shell count={rows.length}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
        showsVerticalScrollIndicator={false}>
        {error ? (
          <ErrorState title="Couldn’t load your saved listings" message={error} onRetry={load} />
        ) : !loading && rows.length === 0 ? (
          <Empty
            icon="bookmark"
            title="Nothing saved yet"
            message="Tap the bookmark on a listing and it waits for you here."
          />
        ) : (
          <Card>
            {rows.map((listing) => (
              <ListingRow
                key={listing.id}
                listing={listing}
                saved
                onToggleSave={unsave}
                onPress={(id) => router.push(`/listing/${id}`)}
              />
            ))}
          </Card>
        )}
      </ScrollView>
    </Shell>
  );
}

function Shell({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <View style={styles.screen}>
      <AppHeader title="Saved" count={count} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  content: { padding: space[4], paddingBottom: 28, gap: space[4] },
});
