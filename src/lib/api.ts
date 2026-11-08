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

import { devRespond } from '@/lib/dev-data';

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

const INFERRED_BASE = inferBaseUrl();

/** Set from the Development screen; empty falls back to what Metro implies. */
let baseOverride: string | null = null;

export function setApiBase(url: string | null) {
  const trimmed = url?.trim();
  baseOverride = trimmed ? trimmed.replace(/\/+$/, '') : null;
}

export function apiBase(): string {
  return baseOverride ?? INFERRED_BASE;
}

/** The URL the app would use with no override — shown as the placeholder. */
export const INFERRED_API_BASE = INFERRED_BASE;

/**
 * While on, requests the sample dataset can answer never touch the network.
 * Development builds only; `setSampleData` is called from nowhere else.
 */
let sampleData = false;

export function setSampleData(on: boolean) {
  sampleData = on;
}

export function sampleDataOn(): boolean {
  return sampleData;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Per-field failures, when the route reported any (publish does). */
    readonly fields: { field?: string; message: string }[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * The server's own words for a failure, never a generic message.
 *
 * Three shapes reach here: `{error}` from the auth routes,
 * `{errors:[{code,message}]}` from a not-found, and
 * `{errors:[{field,message}]}` from the publish validator — which can report
 * four rules at once. `String(entry)` on the last two printed
 * "[object Object]", which told the broker nothing about the photo he is
 * missing.
 */
function failureOf(body: unknown): { message: string | null; fields: { field?: string; message: string }[] } {
  const envelope = (body ?? {}) as { error?: unknown; errors?: unknown };
  const fields: { field?: string; message: string }[] = [];

  if (Array.isArray(envelope.errors)) {
    for (const entry of envelope.errors) {
      if (typeof entry === 'string') {
        fields.push({ message: entry });
        continue;
      }
      if (entry && typeof entry === 'object') {
        const e = entry as { field?: unknown; message?: unknown; code?: unknown };
        const message =
          typeof e.message === 'string'
            ? e.message
            : typeof e.code === 'string'
              ? e.code
              : null;
        if (message) fields.push({ field: typeof e.field === 'string' ? e.field : undefined, message });
      }
    }
  }

  const direct = typeof envelope.error === 'string' ? envelope.error : null;
  const joined = fields.length ? [...new Set(fields.map((f) => f.message))].join(' ') : null;
  return { message: direct ?? joined, fields };
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

  if (sampleData) {
    const method = (rest.method ?? 'GET').toUpperCase();
    let parsed: unknown;
    try {
      parsed = typeof rest.body === 'string' ? JSON.parse(rest.body) : undefined;
    } catch {
      parsed = undefined;
    }
    const canned = devRespond(path, method, parsed, auth && authToken != null);
    // undefined means "the sample data has no answer" — fall through to the
    // network so a real failure still looks like a real failure.
    if (canned !== undefined) return canned as T;
  }

  const res = await fetch(`${apiBase()}${path}`, {
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
    const { message, fields } = failureOf(body);
    throw new ApiError(message ?? `${res.status} on ${path}`, res.status, fields);
  }

  // Wrapped routes expose `data`; flat routes are the resource itself.
  if (envelope && typeof envelope === 'object' && 'data' in envelope) {
    return envelope.data as T;
  }
  return body as T;
}

/**
 * A file, not JSON — one photo per call.
 *
 * The media route reads the body as raw bytes and, when the request is
 * `multipart/*`, takes the first part that carries a `filename=`. A
 * `FormData` is therefore the one body that works the same on a phone (where
 * React Native uploads a `file://` URI natively, without reading it into JS)
 * and on the web (where the picker hands over a real `File`).
 *
 * The Content-Type header is deliberately NOT set: fetch has to add its own
 * boundary, and `request`'s `application/json` default would make the server
 * read a JPEG as a JSON document.
 */
export async function upload<T>(path: string, body: FormData): Promise<T> {
  if (sampleData) {
    const canned = devRespond(path, 'POST', { upload: true }, authToken != null);
    if (canned !== undefined) return canned as T;
  }

  const res = await fetch(`${apiBase()}${path}`, {
    method: 'POST',
    body,
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
  });

  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    // A proxy or a gateway can answer HTML. Say what it was, not "failed".
    throw new ApiError(text.trim().slice(0, 140) || `${res.status} on ${path}`, res.status);
  }

  if (!res.ok) {
    const { message, fields } = failureOf(parsed);
    throw new ApiError(message ?? `${res.status} on ${path}`, res.status, fields);
  }

  const envelope = parsed as Envelope<T>;
  if (envelope && typeof envelope === 'object' && 'data' in envelope) return envelope.data as T;
  return parsed as T;
}

export const api = {
  request,
  upload,
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
  return path.startsWith('http') ? path : `${apiBase()}${path}`;
}
