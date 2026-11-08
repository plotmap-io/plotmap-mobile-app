import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  type ListRenderItemInfo,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  clamp,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { ListingRow, ROW_HEIGHT } from '@/components/listing-row';
import { MapCanvas, type MapCanvasHandle } from '@/components/map-canvas';
import { SheetHead } from '@/components/sheet-head';
import { SlidingSelector } from '@/components/sliding-selector';
import { Empty, ErrorState, SkeletonRows } from '@/components/states';
import { Tap } from '@/components/tap';
import { useFilters } from '@/lib/filters';
import { haptic } from '@/lib/haptics';
import { INITIAL_REGION, type MapRegion } from '@/lib/region';
import { useSearch } from '@/lib/use-search';
import { countActive } from '@/services/filters';
import { toPins } from '@/services/map-pins';
import { color, radius, shadow, type, weight } from '@/theme/tokens';
import type { ListingCard, StatusTab } from '@/types/api';

const SPRING = { damping: 26, stiffness: 240, mass: 0.7 };

/** From here the screen is a SMALL DESKTOP (the web's rule, 2026-11-05):
 *  list beside map, no drawer — a tablet, or a phone turned on its side. */
const WIDE = 700;
const PANEL_WIDTH = 380;

type Detent = 'full' | 'half' | 'peek' | 'bar';
const ORDER: Detent[] = ['full', 'half', 'peek', 'bar'];

const STATUS_TABS: [StatusTab, string][] = [
  ['ForSale', 'For sale'],
  ['ForRent', 'For rent'],
  ['History', 'History'],
];

/**
 * The phone's search is a HEADER and a list DRAWER on one axis.
 *
 * Three things, and only one moves: the header band (place · status ·
 * Filters) is fixed, the map fills everything under it, and the list is a
 * drawer that rests at four heights — bar, peek (the default), half, full.
 *
 * The drawer is a fixed-height view TRANSLATED into place. Animating its
 * `top` instead re-laid-out the whole list every frame of a drag, which is
 * where the stutter came from; a transform costs the compositor nothing.
 * The rows are a virtualised list: a Thrissur viewport returns hundreds and
 * mounting them all at once was the other half of the stutter.
 */
export default function SearchScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;
  const insets = useSafeAreaInsets();

  const { filters, patch } = useFilters();
  const { listings, total, loading, error, search } = useSearch(INITIAL_REGION, filters);
  const [region, setRegion] = useState<MapRegion>(INITIAL_REGION);
  const [mapWidth, setMapWidth] = useState(width);
  const [activeId, setActiveId] = useState<string | null>(null);

  const mapRef = useRef<MapCanvasHandle>(null);
  const listRef = useRef<FlatList<ListingCard>>(null);

  // The map is handed pins, not listings: what belongs on it is decided in
  // `services/map-pins`, where a test can reach it.
  const pins = useMemo(
    () => toPins(listings, { longitudeDelta: region.longitudeDelta, widthPx: mapWidth }),
    [listings, region.longitudeDelta, mapWidth],
  );

  const onRegionSettled = useCallback(
    (r: MapRegion) => {
      setRegion(r);
      search(r);
    },
    [search],
  );

  // A newly picked area flies the map there; the map's own settle re-runs the search.
  const place = filters.place;
  useEffect(() => {
    if (!place) return;
    mapRef.current?.animateTo(place);
    search(place);
  }, [place, search]);

  /* ---------- the drawer ---------- */

  const [screenHeight, setScreenHeight] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [headHeight, setHeadHeight] = useState(0);
  const sheetHeight = Math.max(0, screenHeight - headerHeight);

  // Each stop is how far DOWN the sheet sits from docked, measured never
  // assumed: bar shows the head, peek a row and a half, half splits the rest.
  const stops = useMemo(() => {
    const bar = Math.max(0, sheetHeight - headHeight - 6);
    const peek = Math.max(0, sheetHeight - headHeight - ROW_HEIGHT * 1.6);
    const half = Math.min(sheetHeight * 0.42, Math.max(0, peek - 40));
    return { full: 0, half, peek, bar };
  }, [sheetHeight, headHeight]);
  const ready = sheetHeight > 0 && headHeight > 0;

  const offset = useSharedValue(0);
  const atTop = useSharedValue(false);
  const [detent, setDetent] = useState<Detent>('peek');
  // Where the sheet rests, as a SHARED value rather than a ref: the gesture
  // callbacks are built during render, and reading a ref from one of them is
  // a render-time ref access as far as the compiler can tell. A shared value
  // reads on both threads, which is what these callbacks actually need.
  const resting = useSharedValue<Detent>('peek');
  const docked = detent === 'full';

  const snapTo = useCallback(
    (name: Detent) => {
      resting.set(name);
      atTop.set(name === 'full');
      setDetent(name);
      offset.set(withSpring(stops[name], SPRING));
    },
    [atTop, offset, resting, stops],
  );

  // First layout places the sheet without a spring; a later change in the
  // measurements (rotation, a header that grew) re-seats it at its stop.
  const placed = useRef(false);
  useEffect(() => {
    if (!ready) return;
    const target = stops[resting.get()];
    if (!placed.current) {
      placed.current = true;
      offset.set(target);
    } else {
      offset.set(withSpring(target, SPRING));
    }
  }, [ready, stops, offset, resting]);

  /** Nearest stop to where the drag would have ended; a flick goes ONE stop. */
  const settle = useCallback(
    (projected: number, velocity: number) => {
      let best: Detent = ORDER[0];
      for (const name of ORDER) {
        if (Math.abs(stops[name] - projected) < Math.abs(stops[best] - projected)) best = name;
      }
      const current = resting.get();
      if (best === current && Math.abs(velocity) > 500) {
        const i = ORDER.indexOf(current) + (velocity > 0 ? 1 : -1);
        best = ORDER[clamp(i, 0, ORDER.length - 1)];
      }
      if (best !== current) haptic.selection();
      snapTo(best);
    },
    [resting, snapTo, stops],
  );

  // On native the list's own scroll position decides who owns a drag while
  // docked: rows still above means the list scrolls; at the top, a pull down
  // takes the sheet with it. Both gestures run at once and this decides.
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.set(e.contentOffset.y);
    },
  });

  const startOffset = useSharedValue(0);
  const engaged = useSharedValue(false);
  const baseY = useSharedValue(0);
  const nativeScroll = Gesture.Native();
  const pan = Gesture.Pan()
    .simultaneousWithExternalGesture(nativeScroll)
    .activeOffsetY([-6, 6])
    .failOffsetX([-16, 16])
    .onStart(() => {
      startOffset.set(offset.get());
      engaged.set(false);
      baseY.set(0);
    })
    .onUpdate((e) => {
      if (!engaged.get()) {
        // Docked with rows to scroll: the drag belongs to the list until it
        // is pulled past the top.
        if (atTop.get() && (scrollY.get() > 0 || e.translationY <= 0)) return;
        engaged.set(true);
        startOffset.set(offset.get());
        baseY.set(e.translationY);
      }
      offset.set(clamp(startOffset.get() + e.translationY - baseY.get(), stops.full, stops.bar));
    })
    .onEnd((e) => {
      if (!engaged.get()) return;
      runOnJS(settle)(offset.get() + e.velocityY * 0.15, e.velocityY);
    });

  const toggle = useCallback(() => {
    haptic.selection();
    snapTo(resting.get() === 'full' ? 'peek' : 'full');
  }, [resting, snapTo]);
  const gripTap = Gesture.Tap().onEnd(() => {
    runOnJS(toggle)();
  });

  // 0 at half and below, 1 when docked. One value drives the map's fade, the
  // sheet's corner radius and the Map pill, so they cannot disagree.
  const progress = useDerivedValue(() =>
    stops.half > 0 ? 1 - clamp(offset.get() / stops.half, 0, 1) : 0,
  );
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.get() }],
    borderTopLeftRadius: radius.lg * (1 - progress.get()),
    borderTopRightRadius: radius.lg * (1 - progress.get()),
  }));
  const pillStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ translateY: 12 * (1 - progress.get()) }],
  }));
  const wideProgress = useSharedValue(0);

  /** A pin tap scrolls the list to that listing's row, so the map needs no
   *  card of its own. From the bar it opens to peek first. */
  const selectPin = useCallback(
    (id: string) => {
      haptic.light();
      setActiveId(id);
      if (!wide && resting.get() === 'bar') snapTo('peek');
      const index = listings.findIndex((l) => l.id === id);
      if (index >= 0) listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0 });
    },
    [listings, resting, snapTo, wide],
  );

  const locate = useCallback(() => {
    haptic.light();
    mapRef.current?.locate();
  }, []);

  /* ---------- pieces both layouts share ---------- */

  const placeField = (
    <Tap
      style={styles.place}
      scale={0.985}
      accessibilityRole="search"
      accessibilityLabel="Change search area"
      onPress={() => router.push('/place')}>
      <Feather name="search" size={17} color={color.muted} />
      <Text style={styles.placeText} numberOfLines={1}>
        {filters.place?.label ?? 'Thrissur, Kerala'}
      </Text>
    </Tap>
  );

  const active = countActive(filters);
  const controls = (
    <View style={styles.controls}>
      <SlidingSelector
        count={STATUS_TABS.length}
        activeIndex={Math.max(
          0,
          STATUS_TABS.findIndex(([v]) => v === filters.status),
        )}
        onSelect={(i) => {
          if (STATUS_TABS[i][0] !== filters.status) patch({ status: STATUS_TABS[i][0] });
        }}
        chipInset={3}
        style={styles.segment}
        chipStyle={styles.segmentChip}
        liftScale={0.03}
        renderItem={(i, on) => (
          <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{STATUS_TABS[i][1]}</Text>
        )}
      />
      <Tap
        haptic="selection"
        scale={0.95}
        style={styles.filter}
        accessibilityRole="button"
        accessibilityLabel={active ? `Filters, ${active} on` : 'Filters'}
        onPress={() => router.push('/filters')}>
        <Feather name="sliders" size={15} color={color.surface} />
        <Text style={styles.filterText}>Filters</Text>
        {active > 0 ? (
          <View style={styles.filterCount}>
            <Text style={styles.filterCountText}>{active}</Text>
          </View>
        ) : null}
      </Tap>
    </View>
  );

  const locateButton = (top: number) => (
    <Tap
      haptic="none"
      scale={0.92}
      style={[styles.locate, { top }]}
      accessibilityRole="button"
      accessibilityLabel="Go to my location"
      onPress={locate}>
      <Feather name="navigation" size={18} color={color.inkSoft} />
    </Tap>
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ListingCard>) => (
      <ListingRow
        listing={item}
        active={item.id === activeId}
        onPress={(id) => router.push(`/listing/${id}`)}
      />
    ),
    [activeId],
  );
  const keyExtractor = useCallback((item: ListingCard) => item.id, []);
  const getItemLayout = useCallback(
    (_: ArrayLike<ListingCard> | null | undefined, index: number) => ({
      length: ROW_HEIGHT,
      offset: ROW_HEIGHT * index,
      index,
    }),
    [],
  );

  const listEmpty = error ? (
    <ErrorState title="Couldn’t load listings" message={error} onRetry={() => search(region)} />
  ) : loading ? (
    <SkeletonRows />
  ) : (
    <Empty icon="map-pin" title="Nothing here yet" message="Pan or zoom out to see more of the market." />
  );

  const listProps = {
    data: listings,
    renderItem,
    keyExtractor,
    getItemLayout,
    ListEmptyComponent: listEmpty,
    initialNumToRender: 8,
    maxToRenderPerBatch: 8,
    windowSize: 7,
    removeClippedSubviews: Platform.OS !== 'web',
    extraData: activeId,
  } as const;

  /* ---------- wide: list beside map ---------- */

  if (wide) {
    return (
      <View style={styles.screen}>
        <AppHeader leading={placeField} />
        <View style={styles.wideBody}>
          <View style={[styles.panel, { width: PANEL_WIDTH }]}>
            <View style={styles.panelControls}>{controls}</View>
            <SheetHead total={total} loading={loading} error={error != null} />
            <FlatList
              ref={listRef}
              {...listProps}
              contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
              showsVerticalScrollIndicator={false}
            />
          </View>
          <View style={styles.wideMap} onLayout={(e) => setMapWidth(e.nativeEvent.layout.width)}>
            <MapCanvas
              ref={mapRef}
              progress={wideProgress}
              pins={pins}
              activeId={activeId}
              onSelect={selectPin}
              onRegionSettled={onRegionSettled}
            />
            {locateButton(12)}
          </View>
        </View>
      </View>
    );
  }

  /* ---------- phone: header, map, drawer ---------- */

  return (
    <View style={styles.screen} onLayout={(e) => setScreenHeight(e.nativeEvent.layout.height)}>
      <View style={StyleSheet.absoluteFill} onLayout={(e) => setMapWidth(e.nativeEvent.layout.width)}>
        <MapCanvas
          ref={mapRef}
          progress={progress}
          pins={pins}
          activeId={activeId}
          onSelect={selectPin}
          onRegionSettled={onRegionSettled}
          topInset={headerHeight}
          bottomInset={headHeight + 24}
        />
      </View>

      {/* The header never changes at any drawer height. It floats on a blur
          over the map (solid where blur is costly); its real height is
          measured, because the brand bar above it varies with the notch. */}
      <View style={styles.header} onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />
        ) : null}
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, Platform.OS === 'ios' ? styles.headerGlass : styles.headerSolid]}
        />
        <AppHeader transparent leading={placeField} />
        <View style={styles.headerBody}>{controls}</View>
      </View>

      {locateButton(headerHeight + 12)}

      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.sheet, { top: headerHeight, height: sheetHeight }, sheetStyle]}>
          <View onLayout={(e) => setHeadHeight(e.nativeEvent.layout.height)}>
            <GestureDetector gesture={gripTap}>
              <View style={styles.handle} accessibilityRole="button" accessibilityLabel={docked ? 'Show map' : 'Show list'}>
                <View style={styles.grip} />
              </View>
            </GestureDetector>
            <SheetHead total={total} loading={loading} error={error != null} onPressCount={toggle} />
          </View>

          <GestureDetector gesture={nativeScroll}>
            <Animated.FlatList
              ref={listRef}
              {...listProps}
              onScroll={onScroll}
              scrollEventThrottle={16}
              scrollEnabled={docked}
              bounces={false}
              overScrollMode="never"
              showsVerticalScrollIndicator={docked}
              contentContainerStyle={styles.listContent}
              style={styles.list}
            />
          </GestureDetector>
        </Animated.View>
      </GestureDetector>

      <Animated.View
        style={[styles.pillWrap, { bottom: 14 }, pillStyle]}
        pointerEvents={docked ? 'box-none' : 'none'}>
        <Tap
          haptic="selection"
          scale={0.94}
          style={styles.pill}
          accessibilityRole="button"
          accessibilityLabel="Show map"
          onPress={() => snapTo('peek')}>
          <Feather name="map" size={15} color={color.surface} />
          <Text style={styles.pillText}>Map</Text>
        </Tap>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.mapLand },

  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 7,
    overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(29,42,51,0.12)',
  },
  headerGlass: { backgroundColor: 'rgba(255,255,255,0.72)' },
  headerSolid: { backgroundColor: color.surface },
  headerBody: { paddingHorizontal: 16, paddingTop: 2, paddingBottom: 10 },

  place: {
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: color.field,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  placeText: { flex: 1, fontSize: type.body, fontWeight: weight.semibold, color: color.ink },

  controls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  segment: {
    flex: 1,
    flexDirection: 'row',
    height: 34,
    backgroundColor: color.field,
    borderRadius: radius.sm,
    padding: 3,
  },
  segmentChip: {
    top: 3,
    bottom: 3,
    borderRadius: 7,
    backgroundColor: color.surface,
    ...shadow.card,
  },
  segmentText: { fontSize: type.sub, fontWeight: weight.medium, color: color.inkSoft },
  segmentTextOn: { color: color.ink, fontWeight: weight.semibold },
  filter: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    backgroundColor: color.accent,
  },
  filterText: { fontSize: type.sub, fontWeight: weight.semibold, color: color.surface },
  filterCount: {
    minWidth: 18,
    height: 18,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  filterCountText: { fontSize: type.caption, fontWeight: weight.bold, color: color.accent },

  locate: {
    position: 'absolute',
    right: 12,
    zIndex: 3,
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.float,
  },

  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: color.surface,
    zIndex: 6,
    ...shadow.sheet,
  },
  handle: { height: 20, alignItems: 'center', justifyContent: 'center' },
  grip: { width: 36, height: 5, borderRadius: 3, backgroundColor: color.grip },
  list: { flex: 1 },
  listContent: { paddingBottom: 32 },

  pillWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 8,
  },
  // Small and quiet: it is a way back, not the point of the screen
  // (Ajay 2026-11-05: "make it smaller and less in-your-face").
  pill: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: color.ink,
    ...shadow.float,
  },
  pillText: { fontSize: type.sub, fontWeight: weight.semibold, color: color.surface },

  wideBody: { flex: 1, flexDirection: 'row' },
  panel: {
    backgroundColor: color.surface,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: color.line,
  },
  panelControls: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 },
  wideMap: { flex: 1 },
});
