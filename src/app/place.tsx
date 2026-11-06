import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { StackScreen } from '@/components/stack-screen';
import { Empty } from '@/components/states';
import { useFilters } from '@/lib/filters';
import { autocomplete, decodePlaceId, type PlaceSuggestion } from '@/lib/places';
import { color } from '@/theme/tokens';

/** Change the search area. Picking a place moves the map and re-runs search. */
export default function PlaceScreen() {
  const { patch } = useFilters();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<PlaceSuggestion[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setRows([]);
      return;
    }
    // Debounced: autocomplete is billed per request upstream.
    const t = setTimeout(() => {
      setBusy(true);
      autocomplete(term)
        .then((r) => setRows(Array.isArray(r) ? r : []))
        .catch(() => setRows([]))
        .finally(() => setBusy(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  function pick(row: PlaceSuggestion) {
    const place = decodePlaceId(row.placeId);
    if (!place) return;
    patch({ place: { ...place } });
    router.back();
  }

  return (
    <StackScreen title="Change area">
      <View style={styles.searchWrap}>
        <View style={styles.search}>
          <Feather name="search" size={17} color={color.muted} />
          <TextInput
            style={styles.input}
            value={q}
            onChangeText={setQ}
            placeholder="Town, district or landmark"
            placeholderTextColor="#9aabb6"
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
          />
          {busy ? <ActivityIndicator size="small" color={color.muted} /> : null}
        </View>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled">
        {rows.length === 0 && q.trim().length >= 2 && !busy ? (
          <Empty icon="map-pin" message="No places match that." />
        ) : (
          rows.map((row, i) => {
            const place = decodePlaceId(row.placeId);
            const label = place?.label || row.description || row.text || row.label || 'Place';
            return (
              <Pressable key={i} style={styles.row} onPress={() => pick(row)}>
                <Feather name="map-pin" size={17} color={color.accent} />
                <Text style={styles.label} numberOfLines={2}>
                  {label}
                </Text>
              </Pressable>
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
    borderRadius: 12,
    backgroundColor: color.field,
    paddingHorizontal: 13,
  },
  input: { flex: 1, fontSize: 15.5, color: color.ink },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: color.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.hair,
  },
  label: { flex: 1, fontSize: 15, color: color.ink },
});
