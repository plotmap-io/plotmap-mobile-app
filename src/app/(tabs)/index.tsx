import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  clamp,
  runOnJS,
  useAnimatedRef,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDecay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "@/components/app-header";
import { ListingRow } from "@/components/listing-row";
import { MapCanvas } from "@/components/map-canvas";
import { SheetHead } from "@/components/sheet-head";
import { SlidingSelector } from "@/components/sliding-selector";
import { useFilters } from "@/lib/filters";
import { INITIAL_REGION } from "@/lib/region";
import { useSearch } from "@/lib/use-search";
import { color } from "@/theme/tokens";
import { countActive } from "@/services/filters";
import { toPins } from "@/services/map-pins";
import type { StatusTab } from "@/types/api";

const SPRING = { damping: 24, stiffness: 220, mass: 0.6 };

const NATIVE = Platform.OS !== "web";

/** A dense row. The sheet's head is measured, not assumed — it has changed
 *  shape twice and each time the detents silently went wrong. */
const ROW_HEIGHT = 104;

const STATUS_TABS: [StatusTab, string][] = [
  ["ForSale", "For sale"],
  ["ForRent", "For rent"],
  ["History", "History"],
];

export default function SearchScreen() {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // The tab navigator already sizes this screen ABOVE the tab bar, so the
  // screen's own height is the floor. Subtracting a tab-bar guess from the
  // window height on top of that left a dead band between the list and the
  // bar (Ajay 2026-11-05: "fix the gap"). Measured, never assumed.
  const [screenHeight, setScreenHeight] = useState(windowHeight);
  const [headerHeight, setHeaderHeight] = useState(insets.top + 150);
  const [headHeight, setHeadHeight] = useState(70);
  const onScreenLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0) setScreenHeight(h);
  }, []);

  const detents = useMemo(() => {
    const full = headerHeight;
    const floor = screenHeight;

    // Each detent is "how much sheet is visible", so they stay honest on any
    // screen: bar shows the head, peek shows a card and a half, half splits
    // what is left, full parks under the header.
    const bar = floor - (headHeight + 8);
    const peek = floor - (headHeight + ROW_HEIGHT * 1.5);
    const half = full + (floor - full) * 0.42;

    return { full, half: Math.min(half, peek - 40), peek, bar, floor };
  }, [screenHeight, headerHeight, headHeight]);

  const top = useSharedValue(detents.peek);
  const startTop = useSharedValue(detents.peek);
  // Where in the drag the sheet took over, so handing the drag from the list to
  // the sheet does not jump by everything scrolled before it.
  const baseY = useSharedValue(0);
  const engaged = useSharedValue(false);

  // On native the pan owns the list's scroll position as well as the sheet's
  // height (see the pan below). On the web the browser still owns it.
  const scrollY = useSharedValue(0);
  const startScroll = useSharedValue(0);
  const maxScroll = useSharedValue(0);
  // Mirrors `docked` on the UI thread. Comparing floats to a detent is not
  // reliable once a spring has settled, so the flag is set explicitly.
  const atTop = useSharedValue(false);
  const [docked, setDocked] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const listRef = useAnimatedRef<Animated.ScrollView>();
  const rowTops = useRef<Record<string, number>>({});

  const { filters, patch } = useFilters();
  const { listings, total, loading, error, search } = useSearch(
    INITIAL_REGION,
    filters,
  );
  const [centre, setCentre] = useState({
    latitude: INITIAL_REGION.latitude,
    longitude: INITIAL_REGION.longitude,
  });

  // 0 at half and below, 1 when docked. One value drives the pin fade, the
  // sheet's corner radius and the Map pill, so they cannot disagree.
  const progress = useDerivedValue(() =>
    clamp((detents.half - top.value) / (detents.half - detents.full), 0, 1),
  );

  /** Plain JS: gestures call it through runOnJS so `docked` stays in step. */
  const snapTo = useCallback(
    (target: number) => {
      const isFull = target === detents.full;
      atTop.value = isFull;
      setDocked(isFull);
      top.value = withSpring(target, SPRING);
    },
    [detents.full, atTop, top],
  );

  // How far the rows can travel: everything below the head, when docked.
  const [contentHeight, setContentHeight] = useState(0);
  const viewport = Math.max(0, detents.floor - detents.full - headHeight);
  useEffect(() => {
    maxScroll.value = Math.max(0, contentHeight - viewport);
    if (scrollY.value > maxScroll.value) scrollY.value = maxScroll.value;
  }, [contentHeight, viewport, maxScroll, scrollY]);

  const settle = (projected: number) => {
    "worklet";
    const order = [detents.full, detents.half, detents.peek, detents.bar];
    let best = order[0];
    for (const d of order) {
      if (Math.abs(d - projected) < Math.abs(best - projected)) best = d;
    }
    return best;
  };

  /**
   * One pan governs the sheet at every height, and on native the rows as well.
   *
   * Handing the drag back and forth with the ScrollView's own gesture never
   * held up: on the web a mouse drag does not scroll a ScrollView at all, so a
   * scrolled list swallowed every drag and the sheet could not be pulled down;
   * on a phone the hand-off depended on scroll-view interop that behaves
   * differently on each platform (Ajay 2026-11-06: "i cant drag it down").
   *
   * So native stops asking. The list is not scrollable by itself — this pan
   * moves it, with `withDecay` for the flick — which makes the rule simple and
   * the same everywhere: while rows remain above, a drag scrolls them; the
   * moment they run out, the same drag keeps going and takes the sheet with it.
   * The web keeps browser scrolling (the wheel needs it) and gives every drag
   * to the sheet.
   */
  const pan = (
    NATIVE
      ? Gesture.Pan()
      : // Only the web has a scroll view to share the touch with. (An animated
        // ref IS the ScrollView's ref; only RNGH's typing is narrower.)
        Gesture.Pan().simultaneousWithExternalGesture(
          listRef as unknown as React.RefObject<never>,
        )
  )
    .activeOffsetY([-8, 8])
    .onStart(() => {
      startTop.value = top.value;
      startScroll.value = scrollY.value;
      baseY.value = 0;
      engaged.value = false;
    })
    .onUpdate((e) => {
      // Docked, with rows still to scroll: the drag belongs to the list until
      // it is pulled past the top.
      if (NATIVE && atTop.value && !engaged.value) {
        const want = startScroll.value - e.translationY;
        if (want >= 0) {
          scrollY.value = Math.min(want, maxScroll.value);
          return;
        }
        scrollY.value = 0;
      }
      // Nothing exists above full, so an upward drag there is not ours — until
      // the sheet is already moving, when it is the way back up.
      if (atTop.value && !engaged.value && e.translationY < 0) return;
      if (!engaged.value) {
        engaged.value = true;
        startTop.value = top.value;
        baseY.value = e.translationY;
      }
      top.value = clamp(
        startTop.value + (e.translationY - baseY.value),
        detents.full,
        detents.bar,
      );
    })
    .onEnd((e) => {
      if (!engaged.value) {
        // The drag stayed with the rows, so let them carry on under their own
        // momentum rather than stopping dead under the finger.
        if (NATIVE && atTop.value) {
          scrollY.value = withDecay({
            velocity: -e.velocityY,
            clamp: [0, maxScroll.value],
            deceleration: 0.996,
          });
        }
        return;
      }
      if (Math.abs(top.value - startTop.value) < 1) return;
      runOnJS(snapTo)(settle(top.value + e.velocityY * 0.12));
    });

  /** Map drops the sheet to peek, keeping the scroll offset so the rows you
   *  were reading are the ones that peek. */
  const onPill = useCallback(
    () => snapTo(detents.peek),
    [detents.peek, snapTo],
  );

  /** The grip and the count line are always a handle, at any height. */
  const tapGrip = Gesture.Tap().onEnd(() => {
    runOnJS(snapTo)(atTop.value ? detents.peek : detents.full);
  });

  /** A pin tap scrolls the widget to that listing's row, so the map needs no
   *  card of its own. From the bar it opens to peek first. */
  const selectPin = useCallback(
    (id: string) => {
      setActiveId(id);
      if (top.value > detents.peek) snapTo(detents.peek);
      const y = rowTops.current[id];
      if (y == null) return;
      if (NATIVE)
        scrollY.value = withTiming(Math.min(y, maxScroll.value), {
          duration: 260,
        });
      else listRef.current?.scrollTo({ y, animated: true });
    },
    [detents.peek, snapTo, top, scrollY, maxScroll],
  );

  // A newly picked area moves the map, which re-runs the search via onRegionSettled.
  const place = filters.place;
  useEffect(() => {
    if (!place) return;
    setCentre({ latitude: place.latitude, longitude: place.longitude });
    search(place);
  }, [place, search]);

  // Native has no scroll view to ask: the rows ARE the scroll position.
  const listSlide = useAnimatedStyle(() => ({
    transform: [{ translateY: -scrollY.value }],
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    top: top.value,
    borderTopLeftRadius: 18 * (1 - progress.value),
    borderTopRightRadius: 18 * (1 - progress.value),
  }));

  // It fades in as the sheet docks and is gone by the time the map shows.
  const pillStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: 10 * (1 - progress.value) }],
  }));

  // The map is handed pins, not listings: what belongs on it is decided in
  // `services/map-pins`, where a test can reach it.
  const pins = useMemo(() => toPins(listings), [listings]);

  const rows = error ? (
    <Text style={styles.empty}>{error}</Text>
  ) : !loading && listings.length === 0 ? (
    <Text style={styles.empty}>No listings in this area. Pan or zoom out.</Text>
  ) : (
    listings.map((listing) => (
      <View
        key={listing.id}
        onLayout={(e) => {
          rowTops.current[listing.id] = e.nativeEvent.layout.y;
        }}
      >
        <ListingRow
          listing={listing}
          centre={centre}
          onPress={(id) => router.push(`/listing/${id}`)}
        />
      </View>
    ))
  );

  return (
    <View style={styles.screen} onLayout={onScreenLayout}>
      <View style={[styles.mapLayer, { top: detents.full, bottom: 0 }]}>
        <MapCanvas
          progress={progress}
          pins={pins}
          activeId={activeId}
          onSelect={selectPin}
          onRegionSettled={(region) => {
            setCentre({
              latitude: region.latitude,
              longitude: region.longitude,
            });
            search(region);
          }}
        />
      </View>

      {/* The header never changes at any drawer height. Its real height is
          measured, because the brand bar above it varies with the notch. */}
      <View
        style={styles.header}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
      >
        <AppHeader
          leading={
            <Pressable
              style={styles.place}
              accessibilityRole="search"
              accessibilityLabel="Change search area"
              onPress={() => router.push("/place")}
            >
              <Feather name="search" size={16} color={color.muted} />
              <Text style={styles.placeText} numberOfLines={1}>
                {filters.place?.label ?? "Thrissur, Kerala"}
              </Text>
            </Pressable>
          }
        />
        <View style={styles.headerBody}>
          <View style={styles.controls}>
            <SlidingSelector
              count={STATUS_TABS.length}
              activeIndex={STATUS_TABS.findIndex(([v]) => v === filters.status)}
              onSelect={(i) => patch({ status: STATUS_TABS[i][0] })}
              chipInset={3}
              style={styles.segment}
              chipStyle={styles.segmentChip}
              liftScale={0.03}
              renderItem={(i, on) => (
                <Text style={[styles.segmentText, on && styles.segmentTextOn]}>
                  {STATUS_TABS[i][1]}
                </Text>
              )}
            />
            <Pressable
              style={styles.filter}
              onPress={() => router.push("/filters")}
            >
              <Feather name="sliders" size={16} color={color.surface} />
              <Text style={styles.filterText}>Filters</Text>
              {countActive(filters) > 0 ? (
                <View style={styles.filterCount}>
                  <Text style={styles.filterCountText}>
                    {countActive(filters)}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          </View>
        </View>
      </View>

      <Pressable style={[styles.locate, { top: detents.full + 14 }]}>
        <Feather name="crosshair" size={20} color="#45596a" />
      </Pressable>

      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.sheet, { bottom: 0 }, sheetStyle]}>
          <View onLayout={(e) => setHeadHeight(e.nativeEvent.layout.height)}>
            <GestureDetector gesture={tapGrip}>
              <View style={styles.handle}>
                <View style={styles.grip} />
              </View>
            </GestureDetector>
            <SheetHead total={total} loading={loading} error={error != null} />
          </View>

          {NATIVE ? (
            // The pan owns the scroll position, so the rows are simply moved.
            // Asking a ScrollView to hand a drag over behaved differently on
            // each platform; a transform behaves the same everywhere.
            <View style={styles.clip}>
              <Animated.View
                style={[styles.listContent, listSlide]}
                onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}
              >
                {rows}
              </Animated.View>
            </View>
          ) : (
            <Animated.ScrollView
              ref={listRef}
              scrollEnabled={docked}
              bounces={false}
              showsVerticalScrollIndicator={docked}
              onContentSizeChange={(_w, h) => setContentHeight(h)}
              contentContainerStyle={styles.listContent}
            >
              {rows}
            </Animated.ScrollView>
          )}
        </Animated.View>
      </GestureDetector>

      <Animated.View
        style={[styles.pillWrap, { bottom: 14 }, pillStyle]}
        pointerEvents={docked ? "box-none" : "none"}
      >
        <Pressable
          style={styles.pill}
          accessibilityRole="button"
          accessibilityLabel="Show map"
          onPress={onPill}
        >
          <Feather name="map" size={15} color={color.surface} />
          <Text style={styles.pillText}>Map</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.mapLand },
  mapLayer: { position: "absolute", left: 0, right: 0 },
  header: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 7,
    backgroundColor: color.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.line,
  },
  headerBody: { paddingHorizontal: 14, paddingTop: 2, paddingBottom: 9 },
  place: {
    height: 38,
    borderRadius: 19,
    backgroundColor: color.field,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 13,
  },

  placeText: { flex: 1, fontSize: 14.5, fontWeight: "600", color: color.ink },
  controls: { flexDirection: "row", alignItems: "center", gap: 8 },
  segment: {
    flex: 1,
    flexDirection: "row",
    height: 32,
    backgroundColor: color.field,
    borderRadius: 9,
    padding: 3,
  },
  segmentChip: {
    top: 3,
    bottom: 3,
    borderRadius: 7,
    backgroundColor: color.surface,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentText: { fontSize: 12.5, fontWeight: "500", color: "#4b5d6b" },
  segmentTextOn: { color: color.ink, fontWeight: "600" },
  filter: {
    height: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 9,
    backgroundColor: color.accent,
  },
  filterText: { fontSize: 12.5, fontWeight: "600", color: color.surface },
  filterCount: {
    backgroundColor: color.surface,
    borderRadius: 9,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  filterCountText: { fontSize: 10.5, fontWeight: "700", color: color.accent },
  locate: {
    position: "absolute",
    right: 12,
    zIndex: 3,
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: color.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#142838",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: color.surface,
    zIndex: 6,
    shadowColor: "#142838",
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 10,
  },
  handle: { height: 17, alignItems: "center", justifyContent: "center" },
  grip: { width: 38, height: 5, borderRadius: 3, backgroundColor: "#cfd8de" },
  clip: { flex: 1, overflow: "hidden" },
  listContent: { paddingBottom: 24 },
  empty: {
    padding: 24,
    textAlign: "center",
    fontSize: 13.5,
    color: color.muted,
  },
  pillWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 8,
    pointerEvents: "box-none",
  },
  // Small and quiet: it is a way back, not the point of the screen
  // (Ajay 2026-11-05: "make it smaller and less in-your-face").
  pill: {
    height: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 13,
    borderRadius: 16,
    backgroundColor: color.ink,
    opacity: 0.92,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  pillText: { fontSize: 13, fontWeight: "600", color: color.surface },
});
