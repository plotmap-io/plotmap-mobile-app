import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { StackScreen } from '@/components/stack-screen';
import { Empty } from '@/components/states';
import { Tap } from '@/components/tap';
import { useFilters } from '@/lib/filters';
import { autocomplete, decodePlaceId, type PlaceSuggestion } from '@/lib/places';
import { color, noOutline, radius, space, type } from '@/theme/tokens';

/** Change the search area. Picking a place moves the map and re-runs search. */
export default function PlaceScreen() {
  const { patch } = useFilters();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<PlaceSuggestion[]>([]);
  const [busy, setBusy] = useState(false);

  const term = q.trim();
  const asking = term.length >= 2;

  useEffect(() => {
    // Nothing is set in the effect body itself — a short query simply never
    // asks, and the render below treats "no rows" as the empty state.
    if (!asking) return;
    let alive = true;
    // Debounced: autocomplete is billed per request upstream.
    const t = setTimeout(() => {
      autocomplete(term)
        .then((r) => {
          if (alive) setRows(Array.isArray(r) ? r : []);
        })
        .catch(() => {
          if (alive) setRows([]);
        })
        .finally(() => {
          if (alive) setBusy(false);
        });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [term, asking]);

  function pick(row: PlaceSuggestion) {
    const place = decodePlaceId(row.placeId);
    if (!place) return;
    patch({ place: { ...place } });
    router.back();
  }

  const showing = asking ? rows : [];

  return (
    <StackScreen title="Change area">
      <View style={styles.searchWrap}>
        <View style={styles.search}>
          <Feather name="search" size={17} color={color.muted} />
          <TextInput
            style={[styles.input, noOutline]}
            value={q}
            onChangeText={(text) => {
              setBusy(text.trim().length >= 2);
              setQ(text);
            }}
            placeholder="Town, district or landmark"
            placeholderTextColor={color.placeholder}
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search for a place"
          />
          {busy ? <ActivityIndicator size="small" color={color.muted} /> : null}
        </View>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled">
        {showing.length === 0 && asking && !busy ? (
          <Empty icon="map-pin" title="No places match" message="Try a town or district name." />
        ) : (
          showing.map((row, i) => {
            const place = decodePlaceId(row.placeId);
            const label = place?.label || row.description || row.text || row.label || 'Place';
            return (
              <Tap
                key={i}
                haptic="none"
                scale={1}
                style={styles.row}
                accessibilityRole="button"
                accessibilityLabel={label}
                onPress={() => pick(row)}>
                <Feather name="map-pin" size={17} color={color.accent} />
                <Text style={styles.label} numberOfLines={2}>
                  {label}
                </Text>
              </Tap>
            );
          })
        )}
      </ScrollView>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  searchWrap: { padding: 14, backgroundColor: color.surface },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: color.field,
    paddingHorizontal: space[3],
  },
  input: { flex: 1, fontSize: type.body, color: color.ink },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingVertical: 15,
    backgroundColor: color.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.hair,
  },
  label: { flex: 1, fontSize: type.body, color: color.ink },
});
