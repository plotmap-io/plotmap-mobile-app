import { memo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { INITIAL_REGION, type MapRegion } from '@/lib/region';
import { color } from '@/theme/tokens';
import type { ListingCard } from '@/types/api';

/**
 * Apple Maps on iOS, Google on Android — both free on the native SDKs.
 * tracksViewChanges={false} is not optional: leave it on and every marker
 * re-rasterises each frame, which is what makes RN map screens stutter.
 */
const PriceMarker = memo(function PriceMarker({
  listing,
  active,
  onPress,
}: {
  listing: ListingCard;
  active: boolean;
  onPress: (id: string) => void;
}) {
  return (
    <Marker
      coordinate={listing.coordinates}
      tracksViewChanges={false}
      onPress={() => onPress(listing.id)}
      anchor={{ x: 0.5, y: 1 }}>
      <View style={[styles.pin, active && styles.pinOn]}>
        <Text style={[styles.pinText, active && styles.pinTextOn]}>{listing.markerPrice}</Text>
      </View>
    </Marker>
  );
});

export function MapCanvas({
  progress,
  listings,
  activeId,
  onSelect,
  onRegionSettled,
}: {
  progress: SharedValue<number>;
  listings: ListingCard[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onRegionSettled?: (region: MapRegion) => void;
}) {
  // The map fades to flat ground as the sheet docks — same progress value that
  // drives the sheet's radius and the Map pill.
  const fade = useAnimatedStyle(() => ({ opacity: progress.value }));

  return (
    <View style={styles.wrap}>
      <MapView
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        initialRegion={INITIAL_REGION}
        onRegionChangeComplete={onRegionSettled}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}>
        {listings.map((listing) => (
          <PriceMarker
            key={listing.id}
            listing={listing}
            active={listing.id === activeId}
            onPress={onSelect}
          />
        ))}
      </MapView>

      {/* A scrim, not marker opacity — animating markers would defeat
          tracksViewChanges={false}. */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.veil, fade]} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', inset: 0, overflow: 'hidden', backgroundColor: color.mapLand },
  veil: { backgroundColor: color.mapLand },
  pin: {
    backgroundColor: color.surface,
    borderWidth: 1.5,
    borderColor: color.accent,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    shadowColor: '#142838',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  pinOn: { backgroundColor: color.accent },
  pinText: { fontSize: 13, fontWeight: '700', color: color.accent },
  pinTextOn: { color: color.surface },
});
