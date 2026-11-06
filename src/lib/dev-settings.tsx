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

interface DevSettings {
  /** Empty means "use whatever the bundle host implies". */
  apiUrl: string;
  sampleData: boolean;
}

const DEFAULTS: DevSettings = { apiUrl: '', sampleData: false };

interface DevState extends DevSettings {
  /** What the app would talk to with no override set. */
  inferredApiUrl: string;
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
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const stored = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<DevSettings>) };
          setSettings(stored);
          setApiBase(stored.apiUrl || null);
          setSampleData(stored.sampleData);
        }
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
    void AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const value = useMemo<DevState>(
    () => ({
      ...settings,
      inferredApiUrl: INFERRED_API_BASE,
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
