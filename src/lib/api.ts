/**
 * Plotmap API client.
 *
 * The backend does the heavy lifting: it formats prices, builds address lines
 * and labels highlight fields. This client's only jobs are to attach the token,
 * unwrap the envelope, and hand typed rows to the screens.
 *
 * Response shapes are NOT uniform. Most routes wrap
 * `{ data, errors, meta }`; auth/session routes return the resource directly,
 * or `{ error }` on failure. `request` normalises both.
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * A phone on the LAN cannot reach the Mac's "localhost", so derive the host
 * from the Metro server the app was loaded by. Falls back to localhost on web.
 */
function inferBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants.expoGoConfig as { debuggerHost?: string } | undefined)?.debuggerHost;
  const host = hostUri?.split(':')[0];

  if (Platform.OS === 'web') return 'http://localhost:9000';

  // Metro advertises 127.0.0.1 unless it is started on the LAN. On a device
  // that points at the device itself, so every request fails silently — say so
  // rather than leaving an empty list to explain.
  if (!host || host === 'localhost' || host === '127.0.0.1') {
    console.warn(
      '[api] Metro is advertising ' +
        (host ?? 'no host') +
        ', which a phone cannot reach. Set EXPO_PUBLIC_API_URL in .env to your LAN IP, ' +
        'or start Metro with: npx expo start --lan',
    );
    return 'http://localhost:9000';
  }
  return `http://${host}:9000`;
}

export const API_BASE = inferBaseUrl();

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let authToken: string | null = null;
export function setAuthToken(token: string | null) {
  authToken = token;
}

type Envelope<T> = { data?: T; errors?: unknown[]; meta?: unknown; error?: string };

export async function request<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, headers, ...rest } = init;
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(auth && authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...headers,
    },
  });

  const text = await res.text();
  let body: Envelope<T> | T | null = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new ApiError(`Bad JSON from ${path}`, res.status);
  }

  const envelope = body as Envelope<T>;

  if (!res.ok) {
    const message =
      envelope?.error ??
      (Array.isArray(envelope?.errors) && envelope.errors.length
        ? String(envelope.errors[0])
        : `${res.status} on ${path}`);
    throw new ApiError(message, res.status);
  }

  // Wrapped routes expose `data`; flat routes are the resource itself.
  if (envelope && typeof envelope === 'object' && 'data' in envelope) {
    return envelope.data as T;
  }
  return body as T;
}

export const api = {
  request,
  get: <T>(path: string, init?: RequestInit & { auth?: boolean }) =>
    request<T>(path, { ...init, method: 'GET' }),
  post: <T>(path: string, body?: unknown, init?: RequestInit & { auth?: boolean }) =>
    request<T>(path, { ...init, method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string, init?: RequestInit & { auth?: boolean }) =>
    request<T>(path, { ...init, method: 'DELETE' }),
};

/** Media paths come back relative; the app needs absolute URLs. */
export function mediaUrl(path: string | undefined | null): string | undefined {
  if (!path) return undefined;
  return path.startsWith('http') ? path : `${API_BASE}${path}`;
}
