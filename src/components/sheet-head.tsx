import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { PickerSheet } from '@/components/picker-sheet';
import { useFilters } from '@/lib/filters';
import { metadata } from '@/lib/metadata';
import { color } from '@/theme/tokens';
import { SORTS, STATUS_LABEL, type Currency, type SortKey } from '@/types/api';

/**
 * The drawer's head, matching the web: three labelled columns — what you are
 * looking at and how many, the currency to restate prices in, and the order.
 * Conversion and sorting are the backend's job; this only sets the query.
 */
export function SheetHead({ total, loading, error }: { total: number; loading: boolean; error: boolean }) {
  const { filters, patch } = useFilters();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [picking, setPicking] = useState<'currency' | 'sort' | null>(null);

  useEffect(() => {
    metadata()
      .then((m) => setCurrencies(m.currencies ?? []))
      .catch(() => setCurrencies([]));
  }, []);

  const sortLabel = SORTS.find((s) => s.value === filters.sort)?.label ?? 'Nearest';
  const currency = currencies.find((c) => c.value === filters.displayCurrency);

  return (
    <View style={styles.head}>
      <View style={styles.column}>
        <Text style={styles.eyebrow}>{STATUS_LABEL[filters.status]}</Text>
        <Text style={styles.count} numberOfLines={1}>
          {loading && total === 0 ? '—' : error ? '!' : total.toLocaleString('en-IN')}
        </Text>
      </View>

      <View style={styles.column}>
        <Text style={styles.eyebrow}>Convert to</Text>
        <View style={styles.controlRow}>
          <Pressable
            style={styles.control}
            accessibilityRole="button"
            accessibilityLabel={`Currency, ${currency?.value ?? filters.displayCurrency}`}
            onPress={() => setPicking('currency')}>
            <Text style={styles.controlText} numberOfLines={1}>
              {currency?.symbol ? `${currency.symbol} ` : ''}
              {filters.displayCurrency}
            </Text>
            <Feather name="chevron-down" size={14} color={color.muted} />
          </Pressable>
          <Switch
            value={filters.convertPrices}
            onValueChange={(on) => patch({ convertPrices: on })}
            trackColor={{ true: color.accent, false: '#cfd8de' }}
            thumbColor="#fff"
            accessibilityLabel="Convert prices"
            style={styles.switch}
          />
        </View>
      </View>

      <View style={styles.column}>
        <Text style={styles.eyebrow}>Sort by</Text>
        <Pressable
          style={styles.control}
          accessibilityRole="button"
          accessibilityLabel={`Sort by ${sortLabel}`}
          onPress={() => setPicking('sort')}>
          <Text style={styles.controlText} numberOfLines={1}>
            {sortLabel}
          </Text>
          <Feather name="chevron-down" size={14} color={color.muted} />
        </Pressable>
      </View>

      <PickerSheet
        visible={picking === 'currency'}
        title="Convert prices to"
        options={currencies.map((c) => ({ value: c.value, label: c.label }))}
        value={filters.displayCurrency}
        onPick={(v) => patch({ displayCurrency: v, convertPrices: true })}
        onClose={() => setPicking(null)}
      />
      <PickerSheet
        visible={picking === 'sort'}
        title="Sort by"
        options={SORTS}
        value={filters.sort}
        onPick={(v) => patch({ sort: v as SortKey })}
        onClose={() => setPicking(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 15,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.hair,
  },
  column: { gap: 3 },
  eyebrow: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: '#7e91a0',
  },
  count: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, color: color.ink },
  controlRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  control: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 30,
    borderRadius: 9,
    paddingHorizontal: 9,
    backgroundColor: color.field,
  },
  controlText: { fontSize: 13.5, fontWeight: '600', color: color.ink },
  switch: { transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] },
});
