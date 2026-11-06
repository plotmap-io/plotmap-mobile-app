import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';
import { unreadCount } from '@/lib/social';
import { color } from '@/theme/tokens';

/**
 * The standard top bar. A screen title sits centred — absolutely positioned so
 * the actions on the right cannot pull it off centre — or a screen hands in its
 * own `leading` content, as Search does with its location field.
 *
 * Each action is a real 40pt target with its own pressed state, so they read
 * and behave as buttons rather than decoration.
 */
function Action({
  icon,
  label,
  badge,
  onPress,
}: {
  icon: any;
  label: string;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label}, ${badge} unread` : label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
      <Feather name={icon} size={20} color="#4b5d6b" />
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function AppHeader({
  title,
  count,
  leading,
  showActions = true,
}: {
  title?: string;
  count?: number;
  leading?: ReactNode;
  showActions?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { signedIn } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!signedIn) return setUnread(0);
    unreadCount()
      .then((r) => setUnread(r?.count ?? r?.unread ?? 0))
      .catch(() => setUnread(0));
  }, [signedIn]);

  const open = (path: string) => router.push((signedIn ? path : '/sign-in') as never);

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        {title ? (
          <View pointerEvents="none" style={styles.centre}>
            <Text style={styles.title}>{title}</Text>
            {count != null ? <Text style={styles.count}>{count}</Text> : null}
          </View>
        ) : null}

        {leading ? <View style={styles.leading}>{leading}</View> : <View style={styles.filler} />}

        {showActions ? (
          <View style={styles.actions}>
            <Action icon="mail" label="Messages" badge={unread} onPress={() => open('/messages')} />
            <Action icon="bell" label="Notifications" onPress={() => open('/notifications')} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: color.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.line,
  },
  bar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 14,
    paddingRight: 10,
  },
  centre: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  title: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3, color: color.ink },
  count: { fontSize: 14.5, fontWeight: '500', color: color.faint },
  leading: { flex: 1, minWidth: 0 },
  filler: { flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  action: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPressed: { backgroundColor: color.field },
  badge: {
    position: 'absolute',
    top: 4,
    right: 3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: color.surface,
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: color.surface },
});
