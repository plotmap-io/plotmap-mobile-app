import { type Ref, useImperativeHandle, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';

import { haptic } from '@/lib/haptics';
import { INITIAL_REGION } from '@/lib/region';
import { color, radius, shadow } from '@/theme/tokens';
import type { Coordinate } from '@/types/api';

export interface PinMapHandle {
  /** Fly the camera to a coordinate — after "Use my location", say. */
  goTo(coordinate: Coordinate, close?: boolean): void;
}

/**
 * The plot's position: one pin, moved by dragging it or by tapping the map.
 *
 * Satellite imagery, not streets — `hybrid` keeps the labels. A plot has no
 * building and often no named road; what identifies it is the shape of the
 * ground, the trees and the neighbour's roof, which a street map does not
 * draw. (Apple Maps on iOS, Google on Android: both free on the native SDKs,
 * same provider rule as the search map.)
 *
 * The pin only ever moves on a settled gesture — a drag's END, or a tap —
 * because every move costs one billed reverse-geocode upstream.
 */
export function PinMap({
  ref,
  pin,
  onMove,
}: {
  ref?: Ref<PinMapHandle>;
  pin: Coordinate | null;
  onMove: (coordinate: Coordinate) => void;
}) {
  const map = useRef<MapView>(null);

  useImperativeHandle(ref, () => ({
    goTo(coordinate, close = true) {
      map.current?.animateToRegion(
        {
          ...coordinate,
          latitudeDelta: close ? 0.0025 : 0.02,
          longitudeDelta: close ? 0.0025 : 0.02,
        },
        600,
      );
    },
  }));

  const settle = (coordinate: Coordinate) => {
    haptic.light();
    onMove(coordinate);
  };

  return (
    <View style={styles.wrap}>
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        initialRegion={
          pin ? { ...pin, latitudeDelta: 0.0025, longitudeDelta: 0.0025 } : INITIAL_REGION
        }
        mapType="hybrid"
        onPress={(e) => settle(e.nativeEvent.coordinate)}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        showsPointsOfInterests={false}
        toolbarEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}>
        {pin ? (
          <Marker
            coordinate={pin}
            draggable
            onDragEnd={(e) => settle(e.nativeEvent.coordinate)}
            anchor={{ x: 0.5, y: 1 }}
            accessibilityLabel="The plot's pin. Drag it onto the plot.">
            <View style={styles.stand}>
              <View style={styles.head} />
              <View style={styles.tail} />
            </View>
          </Marker>
        ) : null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, overflow: 'hidden', backgroundColor: color.mapLand },
  stand: { alignItems: 'center' },
  head: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: color.shiraz,
    borderWidth: 3,
    borderColor: color.surface,
    ...shadow.float,
  },
  tail: {
    width: 8,
    height: 8,
    marginTop: -4,
    backgroundColor: color.shiraz,
    transform: [{ rotate: '45deg' }],
  },
});
