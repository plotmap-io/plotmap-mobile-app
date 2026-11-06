/** Preferences, linked methods, sessions, alerts and drafts. */
import { api } from '@/lib/api';
import type { ListingDetail, SearchQuery } from '@/types/api';

export interface Preferences {
  userId?: string;
  country?: string;
  areaUnit?: string;
  distanceUnit?: string;
  theme?: string;
}

export interface LoginMethod {
  id: number;
  providerId: string;
  providerKey: string;
  verified: boolean;
  isPrimary: boolean;
  linkedAt?: string;
}

export interface Session {
  id: string;
  deviceName?: string;
  browserName?: string;
  osName?: string;
  ipAddress?: string;
  location?: string;
  lastActiveAt?: string;
  current?: boolean;
}

export interface Alert {
  id: string;
  name?: string;
  label?: string;
  frequency?: string;
  createdAt?: string;
  query?: SearchQuery;
}

export const getPreferences = () => api.get<Preferences>('/api/v1/user/preferences');
export const savePreferences = (next: Preferences) =>
  api.request<Preferences>('/api/v1/user/preferences', {
    method: 'PUT',
    body: JSON.stringify(next),
  });

export const loginMethods = () =>
  api.get<{ methods: LoginMethod[]; canUnlink?: boolean }>('/api/v1/auth/account/methods');

export const sessions = () => api.get<{ sessions: Session[] }>('/api/v1/auth/sessions');
export const revokeSession = (id: string) => api.delete(`/api/v1/auth/sessions/${id}`);
export const revokeAllSessions = () => api.post('/api/v1/auth/sessions/revoke-all');

export const listAlerts = () => api.get<{ alerts: Alert[] }>('/api/v1/alerts');
export const createAlert = (body: Record<string, unknown>) => api.post<Alert>('/api/v1/alerts', body);
export const deleteAlert = (id: string) => api.delete(`/api/v1/alerts/${id}`);
export const runAlert = (id: string) => api.post(`/api/v1/alerts/${id}/run`);

export const emptyDraft = () => api.post<ListingDetail>('/api/v1/drafts/empty', {});
export const saveDraft = (id: string, body: Record<string, unknown>) =>
  api.request<ListingDetail>(`/api/v1/drafts/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const publishDraft = (id: string) => api.post<ListingDetail>(`/api/v1/drafts/${id}/publish`);
