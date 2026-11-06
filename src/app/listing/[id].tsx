import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { ErrorState, Loading } from '@/components/states';
import { mediaUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { addFavourite, inquire, listingDetail, removeFavourite } from '@/lib/listings';
import { color } from '@/theme/tokens';
import type { ListingDetail } from '@/types/api';

export default function ListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { signedIn } = useAuth();

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      setListing(await listingDetail(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load this listing');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleSave = useCallback(async () => {
    if (!signedIn) {
      router.push('/sign-in');
      return;
    }
    const next = !saved;
    setSaved(next);
    try {
      await (next ? addFavourite(id!) : removeFavourite(id!));
    } catch {
      setSaved(!next);
    }
  }, [id, saved, signedIn]);

  const contact = useCallback(async () => {
    if (!signedIn) {
      router.push('/sign-in');
      return;
    }
    try {
      await inquire(id!, 'Hi, is this still available?');
      Alert.alert('Message sent', 'The seller will see it in their inbox.');
    } catch (e) {
      Alert.alert('Could not send', e instanceof Error ? e.message : 'Try again later.');
    }
  }, [id, signedIn]);

  const header = (
    <View style={[styles.bar, { paddingTop: insets.top + 6 }]}>
      <Pressable onPress={() => router.back()} hitSlop={12} style={styles.round}>
        <Feather name="arrow-left" size={20} color={color.ink} />
      </Pressable>
      <Pressable onPress={toggleSave} hitSlop={12} style={styles.round}>
        <Feather name="heart" size={20} color={saved ? color.shiraz : color.ink} />
      </Pressable>
    </View>
  );

  if (error) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        {header}
        <ErrorState message={error} onRetry={load} />
      </View>
    );
  }
  if (!listing) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        {header}
        <Loading />
      </View>
    );
  }

  const [place, ...rest] = (listing.location?.addressDisplay ?? '').split('\n');
  const photos = listing.listingMedia ?? [];

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      {header}
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {photos.length > 0 ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {photos.map((m) => (
              <Image
                key={m.id}
                source={{ uri: mediaUrl(m.url) }}
                style={{ width, height: 260 }}
                contentFit="cover"
                transition={150}
              />
            ))}
          </ScrollView>
        ) : (
          <View style={[styles.noPhoto, { width, height: 200 }]}>
            <Feather name="image" size={28} color="#a9bac6" />
            <Text style={styles.muted}>No photos yet</Text>
          </View>
        )}

        <View style={styles.pad}>
          <Text style={styles.price}>{listing.displayPrice}</Text>
          <Text style={styles.place}>{place}</Text>
          {rest.length ? <Text style={styles.sub}>{rest.join(', ')}</Text> : null}
          <View style={styles.badges}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{listing.status}</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{listing.propertySubType?.replace(/_/g, ' ')}</Text>
            </View>
            {listing.offMarket ? (
              <View style={[styles.badge, styles.badgeWarn]}>
                <Text style={[styles.badgeText, styles.badgeWarnText]}>Off market</Text>
              </View>
            ) : null}
          </View>
        </View>

        {listing.description ? (
          <View style={styles.pad}>
            <Text style={styles.h2}>About</Text>
            <Text style={styles.body2}>{listing.description}</Text>
          </View>
        ) : null}

        {listing.fields?.length ? (
          <View style={styles.pad}>
            <Text style={styles.h2}>Details</Text>
            <Card>
              {listing.fields.map((f, i) => (
                <View key={f.key + i} style={[styles.fieldRow, i > 0 && styles.divided]}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <Text style={styles.fieldValue}>{String(f.value)}</Text>
                </View>
              ))}
            </Card>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.foot, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable style={styles.contact} onPress={contact}>
          <Feather name="message-circle" size={18} color={color.surface} />
          <Text style={styles.contactText}>Contact seller</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 8,
    backgroundColor: color.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.line,
  },
  round: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center', backgroundColor: color.field,
  },
  body: { paddingBottom: 28 },
  noPhoto: { alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: color.field },
  muted: { color: color.muted, fontSize: 13 },
  pad: { paddingHorizontal: 16, paddingTop: 14, gap: 3 },
  price: { fontSize: 25, fontWeight: '700', letterSpacing: -0.5, color: color.ink },
  place: { fontSize: 16, fontWeight: '600', color: color.ink },
  sub: { fontSize: 14, color: color.muted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 8 },
  badge: { backgroundColor: color.accentSoft, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '600', color: color.accent, textTransform: 'capitalize' },
  badgeWarn: { backgroundColor: color.warnSoft },
  badgeWarnText: { color: color.warn },
  h2: { fontSize: 16, fontWeight: '700', color: color.ink, marginTop: 10, marginBottom: 6 },
  body2: { fontSize: 14.5, lineHeight: 21, color: '#45596a' },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 14, padding: 12 },
  divided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.hair },
  fieldLabel: { fontSize: 13.5, color: color.muted, flex: 1 },
  fieldValue: { fontSize: 13.5, fontWeight: '600', color: color.ink, flex: 1, textAlign: 'right' },
  foot: {
    paddingHorizontal: 16, paddingTop: 10, backgroundColor: color.surface,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.line,
  },
  contact: {
    height: 48, borderRadius: 12, backgroundColor: color.accent,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  contactText: { fontSize: 16, fontWeight: '600', color: color.surface },
});
