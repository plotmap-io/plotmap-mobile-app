import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';

import { api, setAuthToken } from '@/lib/api';
import type { LoginResponse, MyProfile } from '@/types/api';

const TOKEN_KEY = 'plotmap.token';

/** SecureStore has no web implementation; fall back to localStorage there. */
const store = {
  async get(key: string) {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) ?? null;
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string) {
    if (Platform.OS === 'web') return void globalThis.localStorage?.setItem(key, value);
    return SecureStore.setItemAsync(key, value);
  },
  async remove(key: string) {
    if (Platform.OS === 'web') return void globalThis.localStorage?.removeItem(key);
    return SecureStore.deleteItemAsync(key);
  },
};

interface AuthState {
  user: MyProfile | null;
  loading: boolean;
  signedIn: boolean;
  requestOtp: (identifier: string) => Promise<void>;
  register: (identifier: string, name: string, username: string) => Promise<void>;
  verifyOtp: (identifier: string, otp: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore a stored session on launch, and drop it if the server disagrees.
  useEffect(() => {
    (async () => {
      try {
        const token = await store.get(TOKEN_KEY);
        if (token) {
          setAuthToken(token);
          setUser(await api.get<MyProfile>('/api/v1/auth/me'));
        }
      } catch {
        setAuthToken(null);
        await store.remove(TOKEN_KEY);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const requestOtp = useCallback(async (identifier: string) => {
    await api.post<{ message: string }>(
      '/api/v1/auth/otp/request',
      { identifier },
      { auth: false },
    );
  }, []);

  const register = useCallback(
    async (identifier: string, name: string, username: string) => {
      await api.post<{ userId: string }>(
        '/api/v1/auth/register',
        { identifier, name, username },
        { auth: false },
      );
    },
    [],
  );

  const verifyOtp = useCallback(async (identifier: string, otp: string) => {
    const res = await api.post<LoginResponse>(
      '/api/v1/auth/verify',
      { identifier, otp },
      { auth: false },
    );
    setAuthToken(res.token);
    await store.set(TOKEN_KEY, res.token);
    setUser(res.user);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.post('/api/v1/auth/logout');
    } catch {
      // A failed logout still ends the session on this device.
    }
    setAuthToken(null);
    await store.remove(TOKEN_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, signedIn: user != null, requestOtp, register, verifyOtp, signOut }),
    [user, loading, requestOtp, register, verifyOtp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
