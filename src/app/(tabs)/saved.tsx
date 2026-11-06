import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { ListingRow } from '@/components/listing-row';
import { AppHeader } from '@/components/app-header';
import { Empty, ErrorState, Loading } from '@/components/states';
import { SignInPrompt } from '@/components/sign-in-prompt';
import { useAuth } from '@/lib/auth';
import { asRows, favouriteListings, removeFavourite } from '@/lib/listings';
import { color } from '@/theme/tokens';
import type { ListingCard } from '@/types/api';

export default function SavedScreen() {
  const { signedIn, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<ListingCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!signedIn) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setRows(asRows(await favouriteListings()));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load saved listings');
    } finally {
      setLoading(false);
    }
  }, [signedIn]);

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, load]);

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
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        showsVerticalScrollIndicator={false}>
        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : !loading && rows.length === 0 ? (
          <Empty icon="heart" message="Nothing saved yet. Tap the heart on a listing." />
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
  content: { padding: 16, paddingBottom: 28, gap: 14 },
});
