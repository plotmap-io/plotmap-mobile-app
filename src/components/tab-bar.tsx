import { Feather } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs/types';
import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SlidingSelector } from '@/components/sliding-selector';
import { color } from '@/theme/tokens';

/**
 * The bar sits on the page ground behind a hairline — a straight edge, no fade.
 * Selection is a SlidingSelector, so touching a tab brings the chip to your
 * finger and releasing commits it.
 */
const TABS: Record<string, { icon: any; label: string }> = {
  home: { icon: 'home', label: 'Home' },
  index: { icon: 'search', label: 'Search' },
  saved: { icon: 'heart', label: 'Saved' },
  menu: { icon: 'menu', label: 'Menu' },
};

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
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) + 8 }]}>
      <SlidingSelector
        count={tabs.length}
        activeIndex={activeIndex}
        onSelect={select}
        chipInset={14}
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
              <Feather name={tab.icon} size={21} color={on ? color.tabActive : color.tabInactive} />
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
    paddingTop: 5,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.line,
  },
  row: { flexDirection: 'row', height: 52 },
  chip: {
    top: 2,
    bottom: 2,
    borderRadius: 14,
    backgroundColor: color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(201,214,223,0.75)',
    shadowColor: '#152936',
    shadowOpacity: 0.13,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  tab: { alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { fontSize: 10.5, fontWeight: '500', color: color.tabInactive },
  labelOn: { color: color.tabActive, fontWeight: '600' },
  dot: {
    position: 'absolute',
    top: -2,
    right: '50%',
    marginRight: -16,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: color.shiraz,
  },
});
