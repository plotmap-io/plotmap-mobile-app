import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { SaveIcon } from '@/components/icons';
import { ErrorState, Loading } from '@/components/states';
import { Button, Tap } from '@/components/tap';
import { mediaUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { humanise, statusLabel } from '@/lib/display';
import { haptic } from '@/lib/haptics';
import { addFavourite, inquire, listingDetail, removeFavourite } from '@/lib/listings';
import { color, radius, space, type, weight } from '@/theme/tokens';
import type { ListingDetail } from '@/types/api';

/** The hero is a wide 3:2 band, never taller than half a phone. */
function heroHeight(width: number, height: number): number {
  return Math.round(Math.min(width * 0.68, height * 0.46));
}

/** A dark wash at the top so white discs stay legible over any photo. */
const WASH = ['rgba(14,24,32,0.45)', 'rgba(14,24,32,0.16)', 'rgba(14,24,32,0)'] as const;

export default function ListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { signedIn } = useAuth();

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [page, setPage] = useState(0);
  const [sending, setSending] = useState(false);

  // A promise chain, not an `async` body: the state writes live in callbacks,
  // which is what the React Compiler's lint means by "no setState inside an
  // effect".
  const load = useCallback(() => {
    if (!id) return;
    listingDetail(id)
      .then((next) => {
        setListing(next);
        setError(null);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Could not load this listing'),
      );
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
    haptic.light();
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
    setSending(true);
    try {
      await inquire(id!, 'Hi, is this still available?');
      haptic.success();
      Alert.alert('Message sent', 'The seller will see it in their inbox.');
    } catch (e) {
      haptic.error();
      Alert.alert('Could not send', e instanceof Error ? e.message : 'Try again later.');
    } finally {
      setSending(false);
    }
  }, [id, signedIn]);

  const hero = heroHeight(width, height);
  const photos = listing?.listingMedia ?? [];

  /* The two discs float over the photos at every scroll position: a listing
     is looked at for a while, and the way back must not be scrolled away. */
  const chrome = (
    <>
      <LinearGradient colors={WASH} style={[styles.wash, { height: insets.top + 72 }]} pointerEvents="none" />
      <View style={[styles.discs, { top: insets.top + 6 }]}>
        <Tap
          haptic="none"
          scale={0.92}
          style={styles.disc}
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={color.ink} />
        </Tap>
        {listing ? (
          <Tap
            haptic="none"
            scale={0.92}
            style={styles.disc}
            accessibilityRole="button"
            accessibilityLabel={saved ? 'Remove from saved' : 'Save listing'}
            accessibilityState={{ selected: saved }}
            onPress={toggleSave}>
            <SaveIcon size={19} tint={color.accent} filled={saved} />
          </Tap>
        ) : null}
      </View>
    </>
  );

  if (error) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.plainTop, { height: insets.top + 56 }]} />
        {chrome}
        <ErrorState title="Couldn’t load this listing" message={error} onRetry={load} />
      </View>
    );
  }
  if (!listing) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.plainTop, { height: insets.top + 56 }]} />
        {chrome}
        <Loading label="Opening listing…" />
      </View>
    );
  }

  const [place, ...rest] = (listing.location?.addressDisplay ?? '').split(/\n|,\s*/);
  const onPaged = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width));
    if (next !== page) setPage(next);
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ top: insets.top }}>
        <View style={{ height: hero }}>
          {photos.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={onPaged}
              scrollEventThrottle={32}>
              {photos.map((m) => (
                <Image
                  key={m.id}
                  source={{ uri: mediaUrl(m.url) }}
                  style={{ width, height: hero }}
                  contentFit="cover"
                  transition={180}
                  recyclingKey={m.id}
                />
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.noPhoto, { height: hero }]}>
              <Feather name="image" size={26} color={color.placeholder} />
              <Text style={styles.noPhotoText}>No photos yet</Text>
            </View>
          )}

          {photos.length > 1 ? (
            <>
              <View style={styles.dots} pointerEvents="none">
                {photos.map((m, i) => (
                  <View key={m.id} style={[styles.dot, i === page && styles.dotOn]} />
                ))}
              </View>
              <View style={styles.counter} pointerEvents="none">
                <Text style={styles.counterText}>
                  {page + 1} / {photos.length}
                </Text>
              </View>
            </>
          ) : null}
        </View>

        {/* The body overlaps the hero: the photo runs under its corners. */}
        <View style={styles.body}>
          <View style={styles.priceRow}>
            <Text style={styles.price} numberOfLines={1}>
              {listing.displayPrice}
            </Text>
            <View style={[styles.status, listing.status === 'ForRent' && styles.statusRent]}>
              <Text style={styles.statusText}>{statusLabel(listing.status)}</Text>
            </View>
          </View>

          <Text style={styles.place} numberOfLines={2}>
            {place}
          </Text>
          {rest.length ? (
            <Text style={styles.sub} numberOfLines={2}>
              {rest.join(', ')}
            </Text>
          ) : null}

          <View style={styles.chips}>
            <Chip label={humanise(listing.propertySubType || listing.propertyType)} />
            {listing.listedByOwner != null ? (
              <Chip label={listing.listedByOwner ? 'Listed by owner' : 'Listed by broker'} />
            ) : null}
            {listing.offMarket ? <Chip label="Off market" tone="warn" /> : null}
          </View>

          {listing.description ? (
            <View style={styles.section}>
              <Text style={styles.h2}>About</Text>
              <Text style={styles.prose}>{listing.description}</Text>
            </View>
          ) : null}

          {listing.fields?.length ? (
            <View style={styles.section}>
              <Text style={styles.h2}>Details</Text>
              <Card>
                {listing.fields.map((f, i) => (
                  <View key={f.key + i} style={[styles.fieldRow, i > 0 && styles.divided]}>
                    <Text style={styles.fieldLabel} numberOfLines={2}>
                      {f.label}
                    </Text>
                    <Text style={styles.fieldValue} numberOfLines={2}>
                      {String(f.value)}
                    </Text>
                  </View>
                ))}
              </Card>
            </View>
          ) : null}

          {listing.contactUsername ? (
            <View style={styles.section}>
              <Text style={styles.h2}>Listed by</Text>
              <Card>
                <Tap
                  haptic="none"
                  scale={1}
                  style={styles.seller}
                  accessibilityRole="link"
                  accessibilityLabel={`See @${listing.contactUsername}'s listings`}
                  onPress={() => router.push(`/u/${listing.contactUsername}`)}>
                  <View style={styles.sellerDisc}>
                    <Feather name="user" size={17} color={color.accent} />
                  </View>
                  <View style={styles.sellerText}>
                    <Text style={styles.sellerName} numberOfLines={1}>
                      @{listing.contactUsername}
                    </Text>
                    <Text style={styles.sellerNote} numberOfLines={1}>
                      See their other listings
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={color.chevron} />
                </Tap>
              </Card>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {chrome}

      <View style={[styles.foot, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Button label="Message seller" size="lg" busy={sending} onPress={contact} haptic="light" />
      </View>
    </View>
  );
}

function Chip({ label, tone = 'accent' }: { label: string; tone?: 'accent' | 'warn' }) {
  return (
    <View style={[styles.chip, tone === 'warn' && styles.chipWarn]}>
      <Text style={[styles.chipText, tone === 'warn' && styles.chipWarnText]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  plainTop: { backgroundColor: color.accentSoft },

  wash: { position: 'absolute', left: 0, right: 0, top: 0, zIndex: 4 },
  discs: {
    position: 'absolute',
    left: space[3],
    right: space[3],
    zIndex: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  disc: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  noPhoto: { alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: color.field },
  noPhotoText: { fontSize: type.sub, color: color.muted },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  dot: { width: 5, height: 5, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotOn: { width: 16, backgroundColor: color.surface },
  counter: {
    position: 'absolute',
    right: space[3],
    bottom: 24,
    paddingHorizontal: 8,
    height: 22,
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: 'rgba(14,24,32,0.55)',
  },
  counterText: { fontSize: type.caption, fontWeight: weight.semibold, color: color.surface },

  body: {
    marginTop: -radius.lg,
    paddingTop: space[5],
    paddingHorizontal: space[4],
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: color.surface,
  },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  price: {
    flex: 1,
    minWidth: 0,
    fontSize: type.large,
    fontWeight: weight.bold,
    letterSpacing: -0.8,
    color: color.ink,
  },
  status: {
    height: 24,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: color.iceSoft,
  },
  statusRent: { backgroundColor: color.goodSoft },
  statusText: { fontSize: type.footnote, fontWeight: weight.semibold, color: color.iceInk },

  place: {
    fontSize: type.title3,
    fontWeight: weight.semibold,
    letterSpacing: -0.2,
    color: color.ink,
    marginTop: space[2],
  },
  sub: { fontSize: type.sub, color: color.muted, marginTop: 2 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[3] },
  chip: {
    backgroundColor: color.accentSoft,
    borderRadius: radius.xs,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  chipText: { fontSize: type.footnote, fontWeight: weight.semibold, color: color.accent },
  chipWarn: { backgroundColor: color.warnSoft },
  chipWarnText: { color: color.warn },

  section: { marginTop: space[6] },
  h2: {
    fontSize: type.callout,
    fontWeight: weight.semibold,
    letterSpacing: -0.2,
    color: color.ink,
    marginBottom: space[2],
  },
  prose: { fontSize: type.body, lineHeight: 23, color: color.inkSoft },

  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', gap: space[4], padding: space[3] },
  divided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.hair },
  fieldLabel: { flex: 1, fontSize: type.sub, color: color.muted },
  fieldValue: { flex: 1, fontSize: type.sub, fontWeight: weight.semibold, color: color.ink, textAlign: 'right' },

  seller: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[3] },
  sellerDisc: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: color.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerText: { flex: 1, minWidth: 0 },
  sellerName: { fontSize: type.body, fontWeight: weight.semibold, color: color.ink },
  sellerNote: { fontSize: type.footnote, color: color.muted, marginTop: 1 },

  foot: {
    paddingHorizontal: space[4],
    paddingTop: space[3],
    backgroundColor: color.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.line,
  },
});
