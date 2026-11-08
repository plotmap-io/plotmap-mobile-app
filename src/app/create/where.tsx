import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { CreateGate } from '@/components/create/gate';
import { PinMap, type PinMapHandle } from '@/components/create/pin-map';
import { StepScreen } from '@/components/create/step-screen';
import { Button, Tap } from '@/components/tap';
import { useCreateFlow } from '@/lib/create-flow';
import { addressFrom, reverseGeocode } from '@/lib/places';
import { color, radius, shadow, space, type, weight } from '@/theme/tokens';
import type { Coordinate } from '@/types/api';

/**
 * Step 2 — where it is.
 *
 * A pin, and the address the pin stands on. `validateForPublish` refuses a
 * listing at (0, 0), and for a plot the position IS most of the product: no
 * street number identifies it.
 *
 * The address comes from `GET /places/reverse-geocode`, which is BILLED
 * upstream. So: one call per SETTLED pin, debounced, and never for a pin that
 * has already been named. A drag fires nothing until the finger lifts.
 */
const SETTLE_MS = 700;

function keyOf(pin: Coordinate): string {
  return `${pin.latitude.toFixed(5)},${pin.longitude.toFixed(5)}`;
}

export default function WhereStep() {
  const { values, patch, save, saving } = useCreateFlow();
  const map = useRef<PinMapHandle>(null);

  const [naming, setNaming] = useState(false);
  const [locating, setLocating] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  // A resumed draft arrives with its address already written, so the pin it
  // came with must not be looked up again.
  const named = useRef<string | null>(
    values.pin && values.address.addressDisplay ? keyOf(values.pin) : null,
  );

  const pin = values.pin;

  useEffect(() => {
    if (!pin) return;
    const key = keyOf(pin);
    if (named.current === key) return;

    const timer = setTimeout(() => {
      named.current = key;
      setNaming(true);
      reverseGeocode(pin.latitude, pin.longitude)
        .then((result) => {
          patch({ address: addressFrom(result) });
          setNote(null);
        })
        .catch((e: unknown) => {
          // Say what the server said — "No address found for coordinates" is
          // a different problem from a missing provider key, and a pin in the
          // middle of a paddy field legitimately has no address.
          named.current = null;
          setNote(e instanceof Error ? e.message : 'Could not name this place');
        })
        .finally(() => setNaming(false));
    }, SETTLE_MS);

    return () => clearTimeout(timer);
  }, [pin, patch]);

  const locate = useCallback(() => {
    setLocating(true);
    setNote(null);
    Location.requestForegroundPermissionsAsync()
      .then((permission) => {
        if (!permission.granted) {
          setNote(
            permission.canAskAgain
              ? 'Location needs your permission. Tap Use my location again to allow it.'
              : 'Location is off for Plotmap. Turn it on in Settings, or drag the pin to the plot.',
          );
          return undefined;
        }
        return Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }).then(
          (position) => {
            const at = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            patch({ pin: at });
            map.current?.goTo(at);
          },
        );
      })
      .catch((e: unknown) =>
        setNote(e instanceof Error ? e.message : 'Could not read your location'),
      )
      .finally(() => setLocating(false));
  }, [patch]);

  const onwards = useCallback(() => {
    setNote(null);
    save()
      .then(() => router.push('/create/essentials'))
      .catch((e: unknown) =>
        setNote(e instanceof Error ? e.message : 'The location could not be saved'),
      );
  }, [save]);

  const line = values.address.addressDisplay;

  return (
    <CreateGate>
      <StepScreen
        step={2}
        title="Where it is"
        scroll={false}
        footer={
          <>
            {note ? <Text style={styles.warn}>{note}</Text> : null}
            <Button
              label="Continue"
              size="lg"
              busy={saving}
              accessibilityLabel="Continue to the essentials"
              onPress={onwards}
            />
          </>
        }>
        <View style={styles.map}>
          <PinMap ref={map} pin={pin} onMove={(at) => patch({ pin: at })} />

          <Tap
            haptic="light"
            scale={0.95}
            style={styles.locate}
            accessibilityRole="button"
            accessibilityLabel="Use my location"
            onPress={locate}>
            {locating ? (
              <ActivityIndicator color={color.accent} size="small" />
            ) : (
              <Feather name="navigation" size={15} color={color.accent} />
            )}
            <Text style={styles.locateText}>Use my location</Text>
          </Tap>

          <View style={styles.card}>
            <Feather
              name="map-pin"
              size={16}
              color={pin ? color.shiraz : color.faint}
              style={styles.cardIcon}
            />
            <View style={styles.cardText}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {pin
                  ? (line ?? (naming ? 'Looking up the address…' : 'This spot has no address'))
                  : 'Tap the map to drop the pin'}
              </Text>
              <Text style={styles.cardNote} numberOfLines={1}>
                {pin
                  ? `${pin.latitude.toFixed(5)}, ${pin.longitude.toFixed(5)} · drag the pin to adjust`
                  : 'Then drag it onto the plot'}
              </Text>
            </View>
            {naming ? <ActivityIndicator size="small" color={color.muted} /> : null}
          </View>
        </View>
      </StepScreen>
    </CreateGate>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, position: 'relative' },
  locate: {
    position: 'absolute',
    top: space[3],
    right: space[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    ...shadow.float,
  },
  locateText: { fontSize: type.sub, fontWeight: weight.semibold, color: color.accent },
  card: {
    position: 'absolute',
    left: space[3],
    right: space[3],
    bottom: space[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: space[3],
    borderRadius: radius.sm,
    backgroundColor: color.surface,
    ...shadow.float,
  },
  cardIcon: { marginTop: 1 },
  cardText: { flex: 1, minWidth: 0, gap: 2 },
  cardTitle: { fontSize: type.body, fontWeight: weight.semibold, color: color.ink, lineHeight: 20 },
  cardNote: { fontSize: type.footnote, color: color.muted },
  warn: {
    fontSize: type.footnote,
    lineHeight: 17,
    color: color.redInk,
    paddingHorizontal: 2,
    paddingBottom: space[2],
  },
});
