import { Feather } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs/types';
import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SaveIcon } from '@/components/icons';
import { SlidingSelector } from '@/components/sliding-selector';
import { color, radius, shadow, type, weight } from '@/theme/tokens';

/**
 * The bar sits on the page ground behind a hairline — a straight edge, no fade.
 * Selection is a SlidingSelector, so touching a tab brings the chip to your
 * finger and releasing commits it.
 *
 * Order and glyphs follow the web's `BottomNav` (Ajay 2026-11-01/05): Search
 * (a globe), Saved (the bookmark), Home (the grid), Menu. The Home tab wears a
 * DOT for anything waiting — people or the app — never a number.
 */
const TABS: Record<string, { icon: 'globe' | 'save' | 'grid' | 'menu'; label: string }> = {
  index: { icon: 'globe', label: 'Search' },
  saved: { icon: 'save', label: 'Saved' },
  home: { icon: 'grid', label: 'Home' },
  menu: { icon: 'menu', label: 'Menu' },
};

function Glyph({ name, on }: { name: 'globe' | 'save' | 'grid' | 'menu'; on: boolean }) {
  const tint = on ? color.tabActive : color.tabInactive;
  if (name === 'save') return <SaveIcon size={22} tint={tint} strokeWidth={on ? 2 : 1.75} />;
  return <Feather name={name} size={21} color={tint} />;
}

export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const tabs = state.routes.filter((r) => TABS[r.name]);
  const activeIndex = Math.max(
    0,
    tabs.findIndex((r) => r.key === state.routes[state.index]?.key),
  );

  const select = useCallback(
    (index: number) => {
      const route = tabs[index];
      if (route && route.key !== state.routes[state.index]?.key) navigateToTab(route.key);
    },
    [navigateToTab, state.index, state.routes, tabs],
  );

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) + 4 }]}>
      <SlidingSelector
        count={tabs.length}
        activeIndex={activeIndex}
        onSelect={select}
        chipInset={12}
        liftScale={0.03}
        style={styles.row}
        chipStyle={styles.chip}
        renderItem={(i, on) => {
          const route = tabs[i];
          const tab = TABS[route.name];
          return (
            <View
              style={styles.tab}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              accessibilityState={on ? { selected: true } : {}}>
              <Glyph name={tab.icon} on={on} />
              <Text style={[styles.label, on && styles.labelOn]}>{tab.label}</Text>
              {route.name === 'home' ? <View style={styles.dot} /> : null}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: color.bg,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.line,
  },
  row: { flexDirection: 'row', height: 50 },
  chip: {
    top: 1,
    bottom: 1,
    borderRadius: radius.md,
    backgroundColor: color.surface,
    ...shadow.card,
  },
  tab: { alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { fontSize: type.caption, fontWeight: weight.medium, color: color.tabInactive },
  labelOn: { color: color.tabActive, fontWeight: weight.semibold },
  dot: {
    position: 'absolute',
    top: 3,
    right: '50%',
    marginRight: -17,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: color.shiraz,
    borderWidth: 1.5,
    borderColor: color.surface,
  },
});
