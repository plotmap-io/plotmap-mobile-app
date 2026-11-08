import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/**
 * Design tokens for the Plotmap phone app.
 *
 * Mirrors the web (`frontend/static/styles/plotmap.css`): slate `#2f556a` is
 * the one accent, Shiraz `#a13348` belongs to the logo and the save mark's
 * ACTIVE state alone. Everything a screen needs to look like the others is
 * here — a screen that reaches for a hex of its own is a bug.
 */
export const color = {
  bg: '#f2f5f7',
  surface: '#ffffff',
  ink: '#1d2a33',
  /** Body copy and secondary titles — darker than `muted`, lighter than ink. */
  inkSoft: '#45596a',
  muted: '#66798a',
  faint: '#8aa0b0',
  placeholder: '#9aabb6',
  eyebrow: '#7e91a0',
  chevron: '#b4c3cd',
  grip: '#cfd8de',
  line: '#e3e9ee',
  hair: '#eef2f5',
  field: '#f1f4f6',
  /** Pressed state of a row or a plain control. */
  pressed: '#e9eef2',
  accent: '#2f556a',
  accentDeep: '#244151',
  accentSoft: '#e9f1f7',
  shiraz: '#a13348',
  good: '#2a7f62',
  goodSoft: '#e2f2ea',
  warn: '#b4761f',
  warnSoft: '#fbf2e4',
  iceSoft: '#e4f0f8',
  iceInk: '#2b5068',
  redSoft: '#f8e9ec',
  redInk: '#8b2c3e',
  mapLand: '#e9eee6',
  mapBlock: '#dfe6da',
  mapWater: '#dbe4e8',
  scrim: 'rgba(16,28,36,0.42)',
  shadow: '#142838',
  /** Tab bar: inactive lifted from #5b6e7c, which failed contrast at 11pt. */
  tabInactive: '#7a8d9b',
  tabActive: '#24455a',
} as const;

/**
 * One type ramp, whole points only — the platform text engines snap half
 * points and the result was 22 distinct sizes that never lined up.
 */
export const type = {
  caption: 11,
  footnote: 12,
  sub: 13,
  body: 15,
  callout: 16,
  title3: 17,
  title2: 20,
  title1: 24,
  large: 28,
} as const;

export const weight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const satisfies Record<string, TextStyle['fontWeight']>;

/** Section eyebrows: small caps, tracked, in the eyebrow grey. */
export const eyebrow: TextStyle = {
  fontSize: type.caption,
  fontWeight: weight.semibold,
  letterSpacing: 0.9,
  textTransform: 'uppercase',
  color: color.eyebrow,
};

/** Four radii. Cards and photos 6 / 10, controls 10, sheets 20, pills 999. */
export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  pill: 999,
} as const;

/** The 4-point grid. */
export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
} as const;

function elevation(ios: ViewStyle, android: number): ViewStyle {
  return Platform.select({
    ios,
    web: ios,
    default: { elevation: android, shadowColor: color.shadow },
  }) as ViewStyle;
}

/**
 * Three shadows. `card` lifts a chip off the ground, `float` is a control
 * over the map, `sheet` is the drawer's edge. Nothing else casts one.
 */
export const shadow = {
  card: elevation(
    { shadowColor: color.shadow, shadowOpacity: 0.1, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
    2,
  ),
  float: elevation(
    { shadowColor: color.shadow, shadowOpacity: 0.22, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
    5,
  ),
  sheet: elevation(
    { shadowColor: color.shadow, shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: -8 } },
    12,
  ),
} as const;

/** Sheet detents, in px from the top of a 844pt screen. */
export const DETENT = { full: 146, half: 392, peek: 556, bar: 698 } as const;
export type DetentName = keyof typeof DETENT;

export const CHROME = { statusBar: 44, header: 50, tabBar: 84 } as const;

/**
 * react-native-web draws the browser's focus ring on every field, which is an
 * orange box the design does not have — the field's own fill is its focus
 * treatment. Spread this into a TextInput's style; it is nothing on native.
 */
export const noOutline = (
  Platform.OS === 'web' ? { outlineStyle: 'none' } : null
) as TextStyle | null;

export const photoGradient = [
  ['#6f8a5a', '#a9b98a', '#d8cf9f'],
  ['#5f7f66', '#8fae8a', '#cfd9b4'],
  ['#7b6f5a', '#b3a48a', '#dad1bd'],
  ['#567a7a', '#87adaa', '#c9dcd6'],
  ['#7e6a4e', '#b89a73', '#e0d0b4'],
] as const;
