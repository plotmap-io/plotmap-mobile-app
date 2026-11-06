import { api } from '@/lib/api';
import type { Metadata } from '@/types/api';

/** Cached for the session: the taxonomy does not change while the app is open. */
let cache: Promise<Metadata> | null = null;

export function metadata(): Promise<Metadata> {
  cache ??= api.get<Metadata>('/api/v1/metadata', { auth: false });
  return cache;
}
