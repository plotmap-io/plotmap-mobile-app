/**
 * Side-effect imports of stylesheets (the web map pulls in Leaflet's CSS).
 *
 * Expo generates `expo-env.d.ts` with the same declaration, but that file is
 * git-ignored and only appears once the dev server has run — so `npm run
 * typecheck` would fail on a fresh clone without this.
 */
declare module '*.css';
