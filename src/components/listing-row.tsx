import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { mediaUrl } from '@/lib/api';
import { ageLabel, metaLine, rateLabel } from '@/lib/display';
import { color } from '@/theme/tokens';
import type { Coordinate, ListingCard } from '@/types/api';

/**
 * The one dense listing row — Search, Saved and Home all render this.
 * Four lines: price with the per-cent rate, place, type · size · distance, age.
 */
export const ListingRow = memo(function ListingRow({
  listing,
  centre = null,
  saved,
  onPress,
  onToggleSave,
}: {
  listing: ListingCard;
  centre?: Coordinate | null;
  saved?: boolean;
  onPress?: (id: string) => void;
  onToggleSave?: (id: string) => void;
}) {
  const [place, district] = listing.addressDisplay?.split('\n') ?? ['', ''];
  const thumb = mediaUrl(listing.images?.[0]);
  const rate = rateLabel(listing);

  return (
    <Pressable style={styles.row} onPress={() => onPress?.(listing.id)}>
      {thumb ? (
        <Image source={{ uri: thumb }} style={styles.photo} contentFit="cover" transition={120} />
      ) : (
        <View style={[styles.photo, styles.photoEmpty]}>
          <Feather name="image" size={18} color="#a9bac6" />
        </View>
      )}

      <View style={styles.text}>
        <Text style={styles.price} numberOfLines={1}>
          {listing.displayPrice}
          {rate ? <Text style={styles.rate}>  {rate}</Text> : null}
        </Text>
        <Text style={styles.place} numberOfLines={1}>
          {place}
          {district ? `, ${district}` : ''}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {metaLine(listing, centre)}
        </Text>
        <Text style={styles.age} numberOfLines={1}>
          {ageLabel(listing)}
        </Text>
      </View>

      <Pressable
        hitSlop={10}
        style={styles.heart}
        onPress={() => onToggleSave?.(listing.id)}
        accessibilityRole="button"
        accessibilityLabel={saved ? 'Remove from saved' : 'Save listing'}>
        <Feather name="heart" size={20} color={saved ? color.shiraz : '#7a8b97'} />
      </Pressable>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.hair,
    backgroundColor: color.surface,
  },
  photo: { width: 104, height: 80, borderRadius: 7, backgroundColor: color.field },
  photoEmpty: { alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0, paddingRight: 26 },
  price: { fontSize: 16.5, fontWeight: '700', letterSpacing: -0.2, color: color.ink },
  rate: { fontSize: 12.5, fontWeight: '500', color: color.muted },
  place: { fontSize: 13.5, fontWeight: '500', color: color.ink, marginTop: 1 },
  meta: { fontSize: 12.5, color: color.muted },
  age: { fontSize: 11.5, color: color.faint, marginTop: 1 },
  heart: { position: 'absolute', right: 12, top: 11 },
});
