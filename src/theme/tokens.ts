/** Design tokens for the Plotmap phone app. Mirrors the approved mockups. */
export const color = {
  bg: '#f2f5f7',
  surface: '#ffffff',
  ink: '#1d2a33',
  muted: '#66798a',
  faint: '#8aa0b0',
  line: '#e3e9ee',
  hair: '#eef2f5',
  field: '#f1f4f6',
  accent: '#2f556a',
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
  /** Tab bar: inactive lifted from #5b6e7c, which failed contrast at 10.5pt. */
  tabInactive: '#7a8d9b',
  tabActive: '#24455a',
} as const;

/** Sheet detents, in px from the top of a 844pt screen. */
export const DETENT = { full: 146, half: 392, peek: 556, bar: 698 } as const;
export type DetentName = keyof typeof DETENT;

export const CHROME = { statusBar: 44, header: 50, tabBar: 84 } as const;

export const photoGradient = [
  ['#6f8a5a', '#a9b98a', '#d8cf9f'],
  ['#5f7f66', '#8fae8a', '#cfd9b4'],
  ['#7b6f5a', '#b3a48a', '#dad1bd'],
  ['#567a7a', '#87adaa', '#c9dcd6'],
  ['#7e6a4e', '#b89a73', '#e0d0b4'],
] as const;
