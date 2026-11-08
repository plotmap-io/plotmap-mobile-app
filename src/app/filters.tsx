import { Feather } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, GroupLabel } from '@/components/card';
import { PickerSheet } from '@/components/picker-sheet';
import { Button, Tap } from '@/components/tap';
import { useFilters } from '@/lib/filters';
import { metadata } from '@/lib/metadata';
import { clearFilters } from '@/services/filters';
import { color, noOutline, radius, space, type, weight } from '@/theme/tokens';
import type { Currency, Filters, PropertyType } from '@/types/api';

/**
 * Filters is an iOS-grouped screen: eyebrow labels over hairline cards, one
 * decision per row. The two number pairs are ONE card of two cells, so Min
 * and Max read as a range rather than as two unrelated boxes.
 *
 * Currency and "Convert prices" live HERE, with Price — the web moved them out
 * of the result list's head on 2026-11-04 for the same reason: they are a
 * filter decision, not a count.
 */
function Field({
  label,
  value,
  onChange,
  placeholder,
  first,
}: {
  label: string;
  value?: number;
  onChange: (n?: number) => void;
  placeholder: string;
  first?: boolean;
}) {
  return (
    <View style={[styles.cell, !first && styles.cellDivided]}>
      <Text style={styles.cellLabel}>{label}</Text>
      <TextInput
        style={[styles.input, noOutline]}
        value={value != null ? String(value) : ''}
        onChangeText={(t) => {
          const n = Number(t.replace(/[^0-9]/g, ''));
          onChange(t.trim() === '' || Number.isNaN(n) ? undefined : n);
        }}
        placeholder={placeholder}
        placeholderTextColor={color.placeholder}
        keyboardType="number-pad"
        accessibilityLabel={label}
      />
    </View>
  );
}

function Row({
  label,
  note,
  children,
  first,
}: {
  label: string;
  note?: string;
  children: React.ReactNode;
  first?: boolean;
}) {
  return (
    <View style={[styles.row, !first && styles.cellDivided]}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {note ? <Text style={styles.rowNote}>{note}</Text> : null}
      </View>
      {children}
    </View>
  );
}

export default function FiltersScreen() {
  const insets = useSafeAreaInsets();
  const { filters, setFilters } = useFilters();
  const [draft, setDraft] = useState<Filters>(filters);
  const [types, setTypes] = useState<PropertyType[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    let alive = true;
    metadata()
      .then((m) => {
        if (!alive) return;
        setTypes(m.propertyTypes ?? []);
        setCurrencies(m.currencies ?? []);
      })
      .catch(() => {
        if (alive) setTypes([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const patch = (part: Partial<Filters>) => setDraft((d) => ({ ...d, ...part }));
  const currencyLabel =
    currencies.find((c) => c.value === draft.displayCurrency)?.label ?? draft.displayCurrency;

  return (
    <>
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <View style={styles.bar}>
          <Tap
            haptic="none"
            scale={0.9}
            hitSlop={10}
            style={styles.close}
            accessibilityRole="button"
            accessibilityLabel="Close filters"
            onPress={() => router.back()}>
            <Feather name="x" size={21} color={color.inkSoft} />
          </Tap>
          <Text style={styles.title}>Filters</Text>
          <Button
            label="Clear"
            variant="ghost"
            size="md"
            haptic="selection"
            style={styles.clear}
            onPress={() => setDraft(clearFilters)}
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View>
            <GroupLabel>Property type</GroupLabel>
            <View style={styles.chips}>
              <Tap
                haptic="selection"
                scale={0.96}
                style={[styles.chip, !draft.propertyType && styles.chipOn]}
                accessibilityRole="radio"
                accessibilityState={{ selected: !draft.propertyType }}
                onPress={() => patch({ propertyType: undefined })}>
                <Text style={[styles.chipText, !draft.propertyType && styles.chipTextOn]}>Any</Text>
              </Tap>
              {types.map((t) => {
                const on = draft.propertyType === t.value;
                return (
                  <Tap
                    key={t.value}
                    haptic="selection"
                    scale={0.96}
                    style={[styles.chip, on && styles.chipOn]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    onPress={() => patch({ propertyType: on ? undefined : t.value })}>
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{t.label}</Text>
                  </Tap>
                );
              })}
            </View>
          </View>

          <View>
            <GroupLabel>Price</GroupLabel>
            <Card style={styles.pair}>
              <Field
                first
                label="Minimum"
                value={draft.minPrice}
                placeholder="0"
                onChange={(n) => patch({ minPrice: n })}
              />
              <Field
                label="Maximum"
                value={draft.maxPrice}
                placeholder="Any"
                onChange={(n) => patch({ maxPrice: n })}
              />
            </Card>
          </View>

          <View>
            <GroupLabel>Area (sq.m)</GroupLabel>
            <Card style={styles.pair}>
              <Field
                first
                label="Minimum"
                value={draft.minArea}
                placeholder="0"
                onChange={(n) => patch({ minArea: n })}
              />
              <Field
                label="Maximum"
                value={draft.maxArea}
                placeholder="Any"
                onChange={(n) => patch({ maxArea: n })}
              />
            </Card>
            <Text style={styles.hint}>1 cent ≈ 40.5 sq.m</Text>
          </View>

          <View>
            <GroupLabel>Prices</GroupLabel>
            <Card>
              <Row
                first
                label="Convert prices"
                note="Restate every price in one currency">
                <Switch
                  value={draft.convertPrices}
                  onValueChange={(convertPrices) => patch({ convertPrices })}
                  trackColor={{ false: color.line, true: color.accent }}
                  thumbColor={color.surface}
                  accessibilityLabel="Convert prices"
                />
              </Row>
              <Row label="Currency" note="What converted prices are shown in">
                <Tap
                  haptic="selection"
                  scale={0.95}
                  style={styles.picker}
                  accessibilityRole="button"
                  accessibilityLabel={`Currency, ${currencyLabel}`}
                  onPress={() => setPicking(true)}>
                  <Text style={styles.pickerText}>{currencyLabel}</Text>
                  <Feather name="chevron-down" size={14} color={color.muted} />
                </Tap>
              </Row>
            </Card>
          </View>
        </ScrollView>

        <View style={[styles.foot, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Button
            label="Show results"
            size="lg"
            onPress={() => {
              setFilters(draft);
              router.back();
            }}
          />
        </View>

        <PickerSheet
          visible={picking}
          title="Currency"
          options={currencies.length ? currencies : [{ value: draft.displayCurrency, label: currencyLabel }]}
          value={draft.displayCurrency}
          onPick={(displayCurrency) => patch({ displayCurrency })}
          onClose={() => setPicking(false)}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[4],
    paddingBottom: space[3],
    backgroundColor: color.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.line,
  },
  close: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: type.title3, fontWeight: weight.semibold, color: color.ink },
  clear: { paddingHorizontal: 0, minWidth: 56 },

  body: { padding: space[4], paddingBottom: 32, gap: space[5] },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  chip: {
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radius.sm,
    backgroundColor: color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.line,
  },
  chipOn: { backgroundColor: color.accent, borderColor: color.accent },
  chipText: { fontSize: type.sub, fontWeight: weight.medium, color: color.ink },
  chipTextOn: { color: color.surface, fontWeight: weight.semibold },

  pair: { flexDirection: 'row' },
  cell: { flex: 1, paddingHorizontal: space[3], paddingTop: space[2], paddingBottom: space[1] },
  cellDivided: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: color.hair },
  cellLabel: { fontSize: type.caption, fontWeight: weight.medium, color: color.muted },
  input: { height: 34, fontSize: type.title3, color: color.ink, padding: 0 },
  hint: { fontSize: type.footnote, color: color.faint, marginTop: space[2], paddingHorizontal: 2 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[3],
    paddingVertical: space[3],
    minHeight: 54,
  },
  rowText: { flex: 1, minWidth: 0 },
  rowLabel: { fontSize: type.body, fontWeight: weight.medium, color: color.ink },
  rowNote: { fontSize: type.footnote, color: color.muted, marginTop: 1 },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 32,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: radius.sm,
    backgroundColor: color.field,
  },
  pickerText: { fontSize: type.sub, fontWeight: weight.semibold, color: color.ink },

  foot: {
    paddingHorizontal: space[4],
    paddingTop: space[3],
    backgroundColor: color.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.line,
  },
});
