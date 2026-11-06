import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, GroupLabel } from '@/components/card';
import { AppHeader } from '@/components/app-header';
import { mediaUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { unreadCount } from '@/lib/social';
import { color } from '@/theme/tokens';

type Row = { icon: any; label: string; href?: string; badge?: number };
type Group = { label: string; rows: Row[] };

/**
 * Mirrors the web menu (DashboardPage.mobileHub). A guest gets the public
 * groups only — Explore, Settings, Support — so the menu is still the way to
 * About / Terms / Contact without an account.
 *
 * No row fires a request just to decorate itself: the only badge is the unread
 * thread count, which the session already holds.
 */
function groupsFor(signedIn: boolean, unread: number): Group[] {
  const groups: Group[] = [];

  if (signedIn) {
    groups.push({
      label: 'Workspace',
      rows: [
        { icon: 'home', label: 'My listings', href: '/profile' },
        { icon: 'message-circle', label: 'Messages', href: '/messages', badge: unread },
        { icon: 'heart', label: 'Saved', href: '/saved' },
        { icon: 'bell', label: 'Alerts', href: '/alerts' },
        { icon: 'clock', label: 'Activity', href: '/notifications' },
        { icon: 'bell', label: 'Notifications', href: '/notifications' },
      ],
    });
  }

  groups.push({
    label: 'Explore',
    rows: [
      { icon: 'bar-chart-2', label: 'Market', href: '/(tabs)' },
      { icon: 'users', label: 'Sellers', href: '/sellers' },
    ],
  });

  groups.push(
    signedIn
      ? {
          label: 'Account',
          rows: [
            { icon: 'user', label: 'Profile', href: '/profile' },
            { icon: 'sliders', label: 'Preferences', href: '/preferences' },
            { icon: 'settings', label: 'Account', href: '/account' },
          ],
        }
      : { label: 'Settings', rows: [{ icon: 'sliders', label: 'Preferences' }] },
  );

  // Development builds only — the section does not exist in a release.
  if (__DEV__) {
    groups.push({
      label: 'Development',
      rows: [{ icon: 'tool', label: 'Server & sample data', href: '/development' }],
    });
  }

  groups.push({
    label: 'Support',
    rows: [
      { icon: 'info', label: 'About Plotmap', href: '/support?page=about' },
      { icon: 'lock', label: 'Privacy policy', href: '/support?page=privacy' },
      { icon: 'file-text', label: 'Terms of use', href: '/support?page=terms' },
      { icon: 'message-circle', label: 'Contact & feedback', href: '/support?page=contact' },
    ],
  });

  return groups;
}

export default function MenuScreen() {
  const { user, signedIn, signOut } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!signedIn) return setUnread(0);
    unreadCount()
      .then((r) => setUnread(r?.count ?? r?.unread ?? 0))
      .catch(() => setUnread(0));
  }, [signedIn]);

  function confirmSignOut() {
    Alert.alert('Sign out?', 'You will need your code again to sign back in.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  const initials =
    (user?.name ?? '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('') || '?';
  const handle = user?.username?.trim() ?? '';

  return (
    <View style={styles.screen}>
      <AppHeader title="Menu" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {signedIn ? (
          // Who you are, first: the public profile is what a seller hands a buyer.
          <Pressable
            style={styles.account}
            onPress={() => router.push(handle ? `/u/${handle}` : '/profile')}>
            {user?.avatarUrl ? (
              <Image source={{ uri: mediaUrl(user.avatarUrl) }} style={styles.face} />
            ) : (
              <View style={[styles.face, styles.faceFallback]}>
                <Text style={styles.faceText}>{initials}</Text>
              </View>
            )}
            <View style={styles.accountText}>
              <Text style={styles.accountName} numberOfLines={1}>
                {user?.name?.trim() || 'Your account'}
              </Text>
              <Text style={styles.accountHandle} numberOfLines={1}>
                {handle ? `@${handle} · View public profile` : 'View your profile'}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={color.muted} />
          </Pressable>
        ) : (
          <Pressable style={styles.guest} onPress={() => router.push('/sign-in')}>
            <Text style={styles.guestTitle}>The real estate market, mapped.</Text>
            <Text style={styles.guestBody}>
              Browse freely. Create a free account to list, save and message.
            </Text>
            <View style={styles.guestButton}>
              <Text style={styles.guestButtonText}>Sign up free</Text>
            </View>
          </Pressable>
        )}

        {groupsFor(signedIn, unread).map((group) => (
          <View key={group.label}>
            <GroupLabel>{group.label}</GroupLabel>
            <Card>
              {group.rows.map((row, i) => (
                <Pressable
                  key={row.label + i}
                  style={[styles.row, i > 0 && styles.rowDivided]}
                  onPress={() => row.href && router.push(row.href as never)}>
                  <View style={styles.rowIcon}>
                    <Feather name={row.icon} size={16} color="#3c6075" />
                  </View>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  {row.badge ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {row.badge > 99 ? '99+' : row.badge}
                      </Text>
                    </View>
                  ) : null}
                  <Feather name="chevron-right" size={16} color="#b4c3cd" />
                </Pressable>
              ))}
            </Card>
          </View>
        ))}

        {signedIn ? (
          <View>
            <Pressable onPress={confirmSignOut}>
              <Text style={styles.signOut}>Sign out</Text>
            </Pressable>
            <Text style={styles.wordmark}>plotmap</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  content: { padding: 16, paddingBottom: 30, gap: 10 },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    backgroundColor: color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.line,
    borderRadius: 12,
  },
  face: { width: 44, height: 44, borderRadius: 22, backgroundColor: color.field },
  faceFallback: { backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' },
  faceText: { fontSize: 16, fontWeight: '600', color: color.surface },
  accountText: { flex: 1, minWidth: 0 },
  accountName: { fontSize: 16, fontWeight: '600', letterSpacing: -0.16, color: color.ink },
  accountHandle: { fontSize: 12, color: '#7a8b97' },
  guest: {
    backgroundColor: color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.line,
    borderRadius: 12,
    padding: 15,
    gap: 4,
  },
  guestTitle: { fontSize: 14.5, fontWeight: '600', color: color.ink },
  guestBody: { fontSize: 12.5, color: color.muted },
  guestButton: {
    marginTop: 9,
    alignSelf: 'flex-start',
    backgroundColor: color.accent,
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  guestButtonText: { fontSize: 13.5, fontWeight: '600', color: color.surface },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13, height: 43 },
  rowDivided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.hair },
  rowIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: color.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: color.ink },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: color.surface },
  signOut: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: color.shiraz,
    paddingTop: 14,
  },
  wordmark: { textAlign: 'center', fontSize: 11, color: '#9aabb6', marginTop: 6 },
});
