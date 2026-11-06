import { Feather } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFilters } from '@/lib/filters';
import { clearFilters } from '@/services/filters';
import { metadata } from '@/lib/metadata';
import { color } from '@/theme/tokens';
import type { Filters, PropertyType } from '@/types/api';

function Num({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value?: number;
  onChange: (n?: number) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.numWrap}>
      <Text style={styles.numLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value != null ? String(value) : ''}
        onChangeText={(t) => {
          const n = Number(t.replace(/[^0-9]/g, ''));
          onChange(t.trim() === '' || Number.isNaN(n) ? undefined : n);
        }}
        placeholder={placeholder}
        placeholderTextColor="#9aabb6"
        keyboardType="number-pad"
      />
    </View>
  );
}

export default function FiltersScreen() {
  const insets = useSafeAreaInsets();
  const { filters, setFilters } = useFilters();
  const [draft, setDraft] = useState<Filters>(filters);
  const [types, setTypes] = useState<PropertyType[]>([]);

  useEffect(() => {
    metadata()
      .then((m) => setTypes(m.propertyTypes ?? []))
      .catch(() => setTypes([]));
  }, []);

  const patch = (part: Partial<Filters>) => setDraft((d) => ({ ...d, ...part }));

  return (
    <>
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <View style={styles.bar}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Feather name="x" size={22} color={color.muted} />
          </Pressable>
          <Text style={styles.title}>Filters</Text>
          <Pressable onPress={() => setDraft(clearFilters)} hitSlop={10}>
            <Text style={styles.clear}>Clear</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.group}>Property type</Text>
          <View style={styles.chips}>
            <Pressable
              style={[styles.chip, !draft.propertyType && styles.chipOn]}
              onPress={() => patch({ propertyType: undefined })}>
              <Text style={[styles.chipText, !draft.propertyType && styles.chipTextOn]}>Any</Text>
            </Pressable>
            {types.map((t) => {
              const on = draft.propertyType === t.value;
              return (
                <Pressable
                  key={t.value}
                  style={[styles.chip, on && styles.chipOn]}
                  onPress={() => patch({ propertyType: on ? undefined : t.value })}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.group}>Price (₹)</Text>
          <View style={styles.pair}>
            <Num label="Min" value={draft.minPrice} placeholder="0" onChange={(n) => patch({ minPrice: n })} />
            <Num label="Max" value={draft.maxPrice} placeholder="Any" onChange={(n) => patch({ maxPrice: n })} />
          </View>

          <Text style={styles.group}>Area (sq.m)</Text>
          <View style={styles.pair}>
            <Num label="Min" value={draft.minArea} placeholder="0" onChange={(n) => patch({ minArea: n })} />
            <Num label="Max" value={draft.maxArea} placeholder="Any" onChange={(n) => patch({ maxArea: n })} />
          </View>
          <Text style={styles.hint}>
            The backend filters on square metres. 1 cent is about 40.5 sq.m.
          </Text>
        </ScrollView>

        <View style={[styles.foot, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Pressable
            style={styles.apply}
            onPress={() => {
              setFilters(draft);
              router.back();
            }}>
            <Text style={styles.applyText}>Show results</Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.line,
  },
  title: { fontSize: 17, fontWeight: '700', color: color.ink },
  clear: { fontSize: 14, fontWeight: '600', color: color.accent },
  body: { padding: 16, gap: 10, paddingBottom: 30 },
  group: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#7e91a0',
    marginTop: 10,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: color.field,
  },
  chipOn: { backgroundColor: color.accent },
  chipText: { fontSize: 13.5, fontWeight: '500', color: color.ink },
  chipTextOn: { color: color.surface, fontWeight: '600' },
  pair: { flexDirection: 'row', gap: 10 },
  numWrap: { flex: 1, gap: 5 },
  numLabel: { fontSize: 12, color: color.muted },
  input: {
    height: 46,
    borderRadius: 11,
    backgroundColor: color.field,
    paddingHorizontal: 12,
    fontSize: 16,
    color: color.ink,
  },
  hint: { fontSize: 12, color: color.faint, marginTop: 4 },
  foot: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.line,
  },
  apply: {
    height: 48,
    borderRadius: 12,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: { fontSize: 16, fontWeight: '600', color: color.surface },
});
