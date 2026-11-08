import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { type ReactNode, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Tap } from '@/components/tap';
import { useAuth } from '@/lib/auth';
import { unreadCount } from '@/lib/social';
import { color, radius, type, weight } from '@/theme/tokens';

/**
 * The standard top bar. A screen title sits centred — absolutely positioned so
 * the actions on the right cannot pull it off centre — or a screen hands in its
 * own `leading` content, as Search does with its location field.
 *
 * Each action is a real 40pt target that presses, so they read and behave as
 * buttons rather than decoration. `transparent` drops the surface and the
 * hairline for a screen that paints its own ground behind the bar (Search
 * puts a blur over the map).
 */
function Action({
  icon,
  label,
  badge,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label}, ${badge} unread` : label}
      onPress={onPress}
      hitSlop={4}
      scale={0.9}
      style={styles.action}>
      <Feather name={icon} size={21} color={color.inkSoft} />
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
    </Tap>
  );
}

export function AppHeader({
  title,
  count: total,
  leading,
  showActions = true,
  transparent = false,
}: {
  title?: string;
  count?: number;
  leading?: ReactNode;
  showActions?: boolean;
  transparent?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { signedIn } = useAuth();
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
  // A guest has no inbox: the badge is zero, not merely hidden.
  const unread = signedIn ? count : 0;

  const open = (path: string) => router.push((signedIn ? path : '/sign-in') as never);

  return (
    <View style={[styles.wrap, !transparent && styles.surface, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        {title ? (
          <View pointerEvents="none" style={styles.centre}>
            <Text style={styles.title}>{title}</Text>
            {total != null ? <Text style={styles.count}>{total}</Text> : null}
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
  wrap: {},
  surface: {
    backgroundColor: color.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.line,
  },
  bar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 16,
    paddingRight: 8,
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
  title: { fontSize: type.title3, fontWeight: weight.semibold, letterSpacing: -0.3, color: color.ink },
  count: { fontSize: type.body, fontWeight: weight.medium, color: color.faint },
  leading: { flex: 1, minWidth: 0 },
  filler: { flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  action: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 3,
    minWidth: 16,
    height: 16,
    borderRadius: radius.pill,
    backgroundColor: color.shiraz,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: color.surface,
  },
  badgeText: { fontSize: type.caption - 1, fontWeight: weight.bold, color: color.surface },
});
