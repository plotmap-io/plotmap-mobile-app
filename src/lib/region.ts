/**
 * Shared between the native map and the web stub, so it must not live in a
 * platform-specific file — a `.web.tsx` sibling would not export it and the
 * import would resolve to undefined on web.
 *
 * Structurally identical to react-native-maps' Region, declared locally so web
 * never pulls that module in.
 */
export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

/** Opens on Thrissur town, wide enough to hold the district. */
export const INITIAL_REGION: MapRegion = {
  latitude: 10.5276,
  longitude: 76.2144,
  latitudeDelta: 0.28,
  longitudeDelta: 0.28,
};
