import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { SaveIcon } from '@/components/icons';
import { mediaUrl } from '@/lib/api';
import { haptic } from '@/lib/haptics';
import { ageLabel, metaLine, rateLabel } from '@/lib/display';
import { color, radius, type, weight } from '@/theme/tokens';
import type { ListingCard } from '@/types/api';

/**
 * The one dense listing row — Search, Saved and Home all render this. It is
 * the web's `PropertyCard.listRow`: thumbnail · price · place · type and
 * facts · age on its own line, a bookmark at the right.
 *
 * Fixed height, so a list can lay it out without measuring (`getItemLayout`)
 * and scroll to any row by index.
 */
export const ROW_HEIGHT = 108;

export const ListingRow = memo(function ListingRow({
  listing,
  saved,
  active = false,
  onPress,
  onToggleSave,
}: {
  listing: ListingCard;
  saved?: boolean;
  /** The row the map's selected pin belongs to. */
  active?: boolean;
  onPress?: (id: string) => void;
  onToggleSave?: (id: string) => void;
}) {
  const [place, district] = listing.addressDisplay?.split('\n') ?? ['', ''];
  const thumb = mediaUrl(listing.images?.[0]);
  const rate = rateLabel(listing);

  // A tap, not a press: a press fires on release wherever the finger has been,
  // so swiping sideways across a row opened the listing (Ajay 2026-11-06).
  // Moving more than a few points now cancels it. The row tints while the
  // finger is down and fades back on release — the pressed state a Pressable
  // cannot give us inside a gesture-driven sheet.
  const pressed = useSharedValue(0);
  const open = () => onPress?.(listing.id);
  const save = () => {
    haptic.light();
    onToggleSave?.(listing.id);
  };

  const saveTap = Gesture.Tap()
    .maxDistance(12)
    .onEnd((_e, ok) => {
      if (ok) runOnJS(save)();
    });

  const rowTap = Gesture.Tap()
    .maxDistance(12)
    .requireExternalGestureToFail(saveTap)
    .onBegin(() => {
      pressed.set(withTiming(1, { duration: 60 }));
    })
    .onFinalize(() => {
      pressed.set(withTiming(0, { duration: 240 }));
    })
    .onEnd((_e, ok) => {
      if (ok) runOnJS(open)();
    });

  const tint = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      pressed.get(),
      [0, 1],
      [active ? color.accentSoft : color.surface, color.pressed],
    ),
  }));

  return (
    <GestureDetector gesture={rowTap}>
      <Animated.View
        style={[styles.row, tint]}
        accessibilityRole="button"
        accessibilityLabel={`${listing.displayPrice}, ${place}`}>
        {thumb ? (
          <Image
            source={{ uri: thumb }}
            style={styles.photo}
            contentFit="cover"
            transition={160}
            recyclingKey={listing.id}
          />
        ) : (
          <View style={[styles.photo, styles.photoEmpty]}>
            <Feather name="image" size={18} color={color.placeholder} />
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
            {metaLine(listing, null)}
          </Text>
          <Text style={styles.age} numberOfLines={1}>
            {ageLabel(listing)}
          </Text>
        </View>

        {onToggleSave ? (
          <GestureDetector gesture={saveTap}>
            <View
              hitSlop={8}
              style={styles.save}
              accessibilityRole="button"
              accessibilityLabel={saved ? 'Remove from saved' : 'Save listing'}
              accessibilityState={{ selected: !!saved }}>
              <SaveIcon size={18} tint={color.accent} filled={!!saved} />
            </View>
          </GestureDetector>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.hair,
    backgroundColor: color.surface,
  },
  photo: {
    width: 112,
    height: 84,
    borderRadius: 8,
    backgroundColor: color.field,
  },
  photoEmpty: { alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0, paddingRight: 36 },
  price: {
    fontSize: type.title3,
    fontWeight: weight.semibold,
    letterSpacing: -0.3,
    color: color.ink,
  },
  rate: { fontSize: type.footnote, fontWeight: weight.regular, color: color.muted },
  place: { fontSize: type.sub, color: color.inkSoft, marginTop: 2 },
  meta: { fontSize: type.sub, color: color.muted, marginTop: 3 },
  age: { fontSize: type.caption, color: color.faint, marginTop: 3 },
  save: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: color.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
