/** Threads, notifications and public profiles. */
import { api } from '@/lib/api';
import type { Message, PublicProfile, Thread } from '@/types/api';

export function threads() {
  return api.get<Thread[] | { threads: Thread[] }>('/api/v1/threads');
}

export function messages(threadId: string) {
  return api.get<Message[] | { messages: Message[] }>(`/api/v1/threads/${threadId}/messages`);
}

export function sendMessage(threadId: string, body: string) {
  return api.post<Message>(`/api/v1/threads/${threadId}/messages`, { body });
}

export function unreadCount() {
  return api.get<{ count?: number; unread?: number }>('/api/v1/notifications/unread-count');
}

export function markAllRead() {
  return api.request<unknown>('/api/v1/notifications/read-all', { method: 'PUT' });
}

export function activity() {
  return api.get<unknown[] | { items: unknown[] }>('/api/v1/activity');
}

export function publicProfile(username: string) {
  return api.get<PublicProfile>(`/api/v1/users/${username}`, { auth: false });
}

export function userListings(username: string) {
  return api.get<unknown>(`/api/v1/users/${username}/listings`, { auth: false });
}

/** These routes disagree about whether they wrap their array. */
export function asList<T>(result: T[] | Record<string, unknown> | null | undefined, key: string): T[] {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  const inner = (result as Record<string, unknown>)[key];
  return Array.isArray(inner) ? (inner as T[]) : [];
}
