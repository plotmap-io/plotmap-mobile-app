import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { INFERRED_API_BASE, setApiBase, setSampleData } from '@/lib/api';

/**
 * Development-only settings: which server the app talks to, and whether the
 * sample dataset answers instead of the network.
 *
 * Both are off in a release build. Nothing is read from storage and nothing is
 * applied unless __DEV__, so a value left behind on a device cannot follow the
 * app into production.
 */
const KEY = 'plotmap.dev-settings';

/** A host that answers nothing, so no test can reach a real backend by accident. */
export const UNREACHABLE_API = 'https://api.example.com';

/**
 * Set by the harness that drives the app: `EXPO_PUBLIC_TEST_MODE=1 npx expo start`.
 *
 * Under it the app starts pointed at nowhere with no sample data, and whatever
 * the last person left on the device is ignored. A run begins from the same
 * place every time, and cannot quietly spend money on a real server.
 */
const TEST_MODE = process.env.EXPO_PUBLIC_TEST_MODE === '1';

/**
 * Per-load overrides: `?sample=1`, `?api=https://…`.
 *
 * A test that needs data asks for it in the URL it navigates to. Nothing is
 * written down, so the next load is back to the default — the fixture is gone
 * when the test is, with no teardown to forget.
 */
function fromUrl(): Partial<DevSettings> | null {
  const search = globalThis.location?.search;
  if (!search) return null;
  const q = new URLSearchParams(search);
  const out: Partial<DevSettings> = {};
  if (q.has('api')) out.apiUrl = q.get('api') ?? '';
  if (q.has('sample')) out.sampleData = q.get('sample') !== '0';
  return Object.keys(out).length ? out : null;
}

interface DevSettings {
  /** Empty means "use whatever the bundle host implies". */
  apiUrl: string;
  sampleData: boolean;
}

const DEFAULTS: DevSettings = { apiUrl: '', sampleData: false };

interface DevState extends DevSettings {
  /** What the app would talk to with no override set. */
  inferredApiUrl: string;
  /** True when a harness is driving: settings are not persisted. */
  testMode: boolean;
  ready: boolean;
  setApiUrl: (url: string) => void;
  setSampleData: (on: boolean) => void;
}

const DevContext = createContext<DevState | null>(null);

export function DevSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<DevSettings>(DEFAULTS);
  // A release build has nothing to load, so it never waits a frame.
  const [ready, setReady] = useState(!__DEV__);

  useEffect(() => {
    if (!__DEV__) return;
    (async () => {
      try {
        // Under a harness the device's own settings are deliberately ignored.
        const stored = TEST_MODE
          ? { ...DEFAULTS, apiUrl: UNREACHABLE_API }
          : { ...DEFAULTS, ...(JSON.parse((await AsyncStorage.getItem(KEY)) ?? '{}') as Partial<DevSettings>) };
        const next = { ...stored, ...fromUrl() };
        setSettings(next);
        setApiBase(next.apiUrl || null);
        setSampleData(next.sampleData);
      } catch {
        // A corrupt or unreadable value is not worth failing a launch over.
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const persist = useCallback((next: DevSettings) => {
    setSettings(next);
    setApiBase(next.apiUrl || null);
    setSampleData(next.sampleData);
    // Nothing is written down under a harness, so one test cannot seed the next.
    if (!TEST_MODE) void AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const value = useMemo<DevState>(
    () => ({
      ...settings,
      inferredApiUrl: INFERRED_API_BASE,
      testMode: TEST_MODE,
      ready,
      setApiUrl: (apiUrl) => persist({ ...settings, apiUrl }),
      setSampleData: (sampleData) => persist({ ...settings, sampleData }),
    }),
    [settings, ready, persist],
  );

  // Hold the tree for the one storage read, so the first request already
  // goes to the chosen server rather than the inferred one.
  if (!ready) return null;

  return <DevContext.Provider value={value}>{children}</DevContext.Provider>;
}

export function useDevSettings() {
  const ctx = useContext(DevContext);
  if (!ctx) throw new Error('useDevSettings must be used inside DevSettingsProvider');
  return ctx;
}
