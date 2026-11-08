import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PickerSheet } from '@/components/picker-sheet';
import { Tap } from '@/components/tap';
import { useFilters } from '@/lib/filters';
import { color, radius, type, weight } from '@/theme/tokens';
import { SORTS, type SortKey, type StatusTab } from '@/types/api';

/** "322 for sale" — the status, lower-cased, as the noun's qualifier. */
const QUALIFIER: Record<StatusTab, string> = {
  ForSale: 'for sale',
  ForRent: 'for rent',
  History: 'sold or rented',
};

/**
 * The drawer's head is ONE line, as on the web (2026-11-05): how many and
 * what on the left, the order on the right. Currency conversion is not here
 * and never was on the web — it lives with Price in the Filters screen.
 */
export function SheetHead({
  total,
  loading,
  error,
  onPressCount,
}: {
  total: number;
  loading: boolean;
  error: boolean;
  /** Tapping the count walks the drawer between docked and peek. */
  onPressCount?: () => void;
}) {
  const { filters, patch } = useFilters();
  const [picking, setPicking] = useState(false);

  const sortLabel = SORTS.find((s) => s.value === filters.sort)?.label ?? 'Nearest';

  const count = (
    <Text style={styles.count} numberOfLines={1} accessibilityLiveRegion="polite">
      {error ? (
        <Text style={styles.qualifier}>Couldn’t load listings</Text>
      ) : loading && total === 0 ? (
        <Text style={styles.qualifier}>Searching…</Text>
      ) : (
        <>
          <Text style={styles.number}>{total.toLocaleString('en-IN')}</Text>
          <Text style={styles.qualifier}> {QUALIFIER[filters.status]}</Text>
        </>
      )}
    </Text>
  );

  return (
    <View style={styles.head}>
      {onPressCount ? (
        <Tap
          haptic="none"
          scale={1}
          style={styles.countTap}
          accessibilityRole="button"
          accessibilityLabel="Show the list"
          onPress={onPressCount}>
          {count}
        </Tap>
      ) : (
        count
      )}

      <Tap
        haptic="selection"
        scale={0.95}
        style={styles.sort}
        accessibilityRole="button"
        accessibilityLabel={`Sort by ${sortLabel}`}
        onPress={() => setPicking(true)}>
        <Text style={styles.sortText} numberOfLines={1}>
          {sortLabel}
        </Text>
        <Feather name="chevron-down" size={14} color={color.muted} />
      </Tap>

      <PickerSheet
        visible={picking}
        title="Sort by"
        options={SORTS}
        value={filters.sort}
        onPick={(v) => patch({ sort: v as SortKey })}
        onClose={() => setPicking(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 16,
    paddingRight: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.hair,
  },
  countTap: { flex: 1, minWidth: 0, justifyContent: 'center', alignSelf: 'stretch' },
  count: { flex: 1, minWidth: 0, fontSize: type.body },
  number: { fontSize: type.title3, fontWeight: weight.bold, letterSpacing: -0.3, color: color.ink },
  qualifier: { fontSize: type.body, fontWeight: weight.regular, color: color.muted },
  sort: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 32,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: radius.sm,
    backgroundColor: color.field,
  },
  sortText: { fontSize: type.sub, fontWeight: weight.semibold, color: color.ink },
});
