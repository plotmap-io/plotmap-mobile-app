import { memo, type Ref, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { haptic } from '@/lib/haptics';
import { INITIAL_REGION, type MapRegion } from '@/lib/region';
import type { ClusterPin, ListingPin, MapPin } from '@/services/map-pins';
import { color, radius, shadow, type, weight } from '@/theme/tokens';
import type { Coordinate } from '@/types/api';

/** What a screen may ask the map to do. */
export interface MapCanvasHandle {
  /** Fly to the user's position, if the map has one yet. Returns whether it did. */
  locate(): boolean;
  /** Frame an area, as a tap on a pile does. */
  fit(bounds: ClusterPin['bounds']): void;
  /** Fly to a region — a picked place, say. */
  animateTo(region: MapRegion): void;
}

/**
 * Apple Maps on iOS, Google on Android — both free on the native SDKs.
 *
 * `tracksViewChanges` is the whole performance story of a marker: left on,
 * every marker re-rasterises each frame and the map stutters. It is on for
 * the first 300ms after a marker mounts or changes (so the label is drawn —
 * Android snapshots an empty view otherwise) and off the rest of the time.
 */
function useTracking(key: string): boolean {
  // Which key has finished drawing, rather than a flag flipped on and off —
  // a setState in the effect BODY is a cascading render, one inside the
  // timeout is not, and a new key is untracked until its timer says so.
  const [drawn, setDrawn] = useState<string | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setDrawn(key), 300);
    return () => clearTimeout(t);
  }, [key]);
  return drawn !== key;
}

const PriceMarker = memo(function PriceMarker({
  pin,
  active,
  onPress,
}: {
  pin: ListingPin;
  active: boolean;
  onPress: (id: string) => void;
}) {
  const tracking = useTracking(`${pin.label}:${active}`);
  return (
    <Marker
      coordinate={pin.coordinate}
      tracksViewChanges={tracking}
      onPress={() => onPress(pin.listingId)}
      anchor={{ x: 0.5, y: 1 }}
      zIndex={active ? 2 : 1}>
      <View style={styles.stand}>
        <View style={[styles.pill, active && styles.pillOn]}>
          <Text style={[styles.pillText, active && styles.pillTextOn]}>{pin.label}</Text>
        </View>
        <View style={[styles.tail, active && styles.tailOn]} />
      </View>
    </Marker>
  );
});

const PileMarker = memo(function PileMarker({
  pin,
  onPress,
}: {
  pin: ClusterPin;
  onPress: (pin: ClusterPin) => void;
}) {
  const tracking = useTracking(`${pin.label}:${pin.count}`);
  return (
    <Marker
      coordinate={pin.coordinate}
      tracksViewChanges={tracking}
      onPress={() => onPress(pin)}
      anchor={{ x: 0.5, y: 1 }}>
      <View style={styles.stand}>
        <View style={styles.pile}>
          <View style={[styles.pill, styles.pillInPile]}>
            <Text style={styles.pillText}>{pin.label}</Text>
          </View>
          <View style={styles.count}>
            <Text style={styles.countText}>{pin.count > 999 ? `${(pin.count / 1000).toFixed(1)}k` : pin.count}</Text>
          </View>
        </View>
        <View style={styles.tail} />
      </View>
    </Marker>
  );
});

function regionFor(bounds: ClusterPin['bounds']): MapRegion {
  const latitudeDelta = Math.max((bounds.north - bounds.south) * 1.8, 0.004);
  const longitudeDelta = Math.max((bounds.east - bounds.west) * 1.8, 0.004);
  return {
    latitude: (bounds.north + bounds.south) / 2,
    longitude: (bounds.east + bounds.west) / 2,
    latitudeDelta,
    longitudeDelta,
  };
}

/** The canvas draws the pins it is handed; `services/map-pins` decides them. */
export function MapCanvas({
  ref,
  progress,
  pins,
  activeId,
  onSelect,
  onRegionSettled,
  topInset = 0,
  bottomInset = 0,
}: {
  ref?: Ref<MapCanvasHandle>;
  progress: SharedValue<number>;
  pins: MapPin[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onRegionSettled?: (region: MapRegion) => void;
  /** Chrome over the map's top/bottom edge, so the map's own badges clear it. */
  topInset?: number;
  bottomInset?: number;
}) {
  const map = useRef<MapView>(null);
  const userLocation = useRef<Coordinate | null>(null);

  useImperativeHandle(ref, () => ({
    locate() {
      const here = userLocation.current;
      if (!here) return false;
      map.current?.animateToRegion({ ...here, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 600);
      return true;
    },
    fit(bounds) {
      map.current?.animateToRegion(regionFor(bounds), 450);
    },
    animateTo(region) {
      map.current?.animateToRegion(region, 500);
    },
  }));

  // The map fades to flat ground as the sheet docks — same progress value that
  // drives the sheet's radius and the Map pill.
  const fade = useAnimatedStyle(() => ({ opacity: progress.get() }));

  const openPile = (pin: ClusterPin) => {
    haptic.selection();
    map.current?.animateToRegion(regionFor(pin.bounds), 450);
  };

  return (
    <View style={styles.wrap}>
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        initialRegion={INITIAL_REGION}
        onRegionChangeComplete={onRegionSettled}
        onUserLocationChange={(e) => {
          const c = e.nativeEvent.coordinate;
          userLocation.current = c ? { latitude: c.latitude, longitude: c.longitude } : null;
        }}
        mapPadding={{ top: topInset, bottom: bottomInset, left: 0, right: 0 }}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        showsPointsOfInterests={false}
        showsBuildings={false}
        moveOnMarkerPress={false}
        toolbarEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}>
        {pins.map((pin) =>
          pin.kind === 'listing' ? (
            <PriceMarker
              key={pin.id}
              pin={pin}
              active={pin.listingId === activeId}
              onPress={onSelect}
            />
          ) : (
            <PileMarker key={pin.id} pin={pin} onPress={openPile} />
          ),
        )}
      </MapView>

      {/* A scrim, not marker opacity — animating markers would defeat
          tracksViewChanges={false}. */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.veil, fade]} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  // `zIndex: 0` makes the map a stacking context, which is what keeps the web
  // map's internal panes under the controls a screen floats over it.
  wrap: {
    position: 'absolute',
    inset: 0,
    zIndex: 0,
    overflow: 'hidden',
    backgroundColor: color.mapLand,
  },
  veil: { backgroundColor: color.mapLand },
  stand: { alignItems: 'center' },
  pill: {
    backgroundColor: color.accent,
    borderRadius: radius.xs,
    paddingHorizontal: 8,
    height: 26,
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: color.surface,
    ...shadow.float,
  },
  pillOn: { backgroundColor: color.ink, transform: [{ scale: 1.08 }] },
  pillText: { fontSize: type.sub, fontWeight: weight.bold, color: color.surface, letterSpacing: -0.2 },
  pillTextOn: { color: color.surface },
  tail: {
    width: 8,
    height: 8,
    marginTop: -5,
    backgroundColor: color.accent,
    transform: [{ rotate: '45deg' }],
    borderBottomRightRadius: 2,
  },
  tailOn: { backgroundColor: color.ink },
  pile: { flexDirection: 'row', alignItems: 'center' },
  pillInPile: { paddingRight: 14, borderTopRightRadius: radius.pill, borderBottomRightRadius: radius.pill },
  count: {
    marginLeft: -12,
    minWidth: 28,
    height: 28,
    paddingHorizontal: 6,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    borderWidth: 2,
    borderColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  countText: { fontSize: type.footnote, fontWeight: weight.bold, color: color.accent },
});
