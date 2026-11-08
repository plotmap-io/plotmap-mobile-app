import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Card, GroupLabel } from '@/components/card';
import { Button, Tap } from '@/components/tap';
import { mediaUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { unreadCount } from '@/lib/social';
import { color, radius, space, type, weight } from '@/theme/tokens';

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
        { icon: 'bookmark', label: 'Saved', href: '/saved' },
        { icon: 'bell', label: 'Alerts', href: '/alerts' },
        { icon: 'clock', label: 'Activity', href: '/notifications' },
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
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!signedIn) return;
    let alive = true;
    unreadCount()
      .then((r) => alive && setCount(r?.count ?? r?.unread ?? 0))
      .catch(() => alive && setCount(0));
    return () => {
      alive = false;
    };
  }, [signedIn]);
  // A guest has no inbox, so the badge is not merely hidden — it is zero.
  const unread = signedIn ? count : 0;

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
          <Tap
            haptic="none"
            scale={0.99}
            style={styles.account}
            accessibilityRole="link"
            accessibilityLabel="Your profile"
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
            <Feather name="chevron-right" size={18} color={color.chevron} />
          </Tap>
        ) : (
          <View style={styles.guest}>
            <Text style={styles.guestTitle}>The real estate market, mapped.</Text>
            <Text style={styles.guestBody}>
              Browse freely. Create a free account to list, save and message.
            </Text>
            <Button
              label="Sign up free"
              size="md"
              style={styles.guestButton}
              onPress={() => router.push('/sign-in')}
            />
          </View>
        )}

        {groupsFor(signedIn, unread).map((group) => (
          <View key={group.label}>
            <GroupLabel>{group.label}</GroupLabel>
            <Card>
              {group.rows.map((row, i) => (
                <Tap
                  key={row.label + i}
                  haptic="none"
                  scale={1}
                  style={[styles.row, i > 0 && styles.rowDivided]}
                  accessibilityRole="link"
                  accessibilityLabel={row.label}
                  onPress={() => row.href && router.push(row.href as never)}>
                  <View style={styles.rowIcon}>
                    <Feather name={row.icon} size={16} color={color.accent} />
                  </View>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  {row.badge ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {row.badge > 99 ? '99+' : row.badge}
                      </Text>
                    </View>
                  ) : null}
                  <Feather name="chevron-right" size={16} color={color.chevron} />
                </Tap>
              ))}
            </Card>
          </View>
        ))}

        {signedIn ? (
          <View>
            <Tap
              haptic="light"
              scale={0.98}
              accessibilityRole="button"
              accessibilityLabel="Sign out"
              onPress={confirmSignOut}>
              <Text style={styles.signOut}>Sign out</Text>
            </Tap>
            <Text style={styles.wordmark}>plotmap</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  content: { padding: space[4], paddingBottom: 30, gap: space[3] },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: space[3],
    backgroundColor: color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.line,
    borderRadius: radius.sm,
  },
  face: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: color.field },
  faceFallback: { backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' },
  faceText: { fontSize: type.callout, fontWeight: weight.semibold, color: color.surface },
  accountText: { flex: 1, minWidth: 0 },
  accountName: {
    fontSize: type.callout,
    fontWeight: weight.semibold,
    letterSpacing: -0.2,
    color: color.ink,
  },
  accountHandle: { fontSize: type.footnote, color: color.muted, marginTop: 1 },
  guest: {
    backgroundColor: color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.line,
    borderRadius: radius.sm,
    padding: space[4],
    gap: space[1],
  },
  guestTitle: { fontSize: type.body, fontWeight: weight.semibold, color: color.ink },
  guestBody: { fontSize: type.footnote, lineHeight: 17, color: color.muted },
  guestButton: { marginTop: space[2], alignSelf: 'flex-start' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[3],
    height: 46,
  },
  rowDivided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.hair },
  rowIcon: {
    width: 26,
    height: 26,
    borderRadius: radius.xs,
    backgroundColor: color.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontSize: type.body, fontWeight: weight.medium, color: color.ink },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: radius.pill,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { fontSize: type.caption, fontWeight: weight.bold, color: color.surface },
  signOut: {
    textAlign: 'center',
    fontSize: type.body,
    fontWeight: weight.semibold,
    color: color.shiraz,
    paddingTop: space[4],
  },
  wordmark: { textAlign: 'center', fontSize: type.caption, color: color.placeholder, marginTop: space[2] },
});
