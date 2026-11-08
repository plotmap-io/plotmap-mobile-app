import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Card } from '@/components/card';
import { StackScreen } from '@/components/stack-screen';
import { Empty } from '@/components/states';
import { Tap } from '@/components/tap';
import { api, mediaUrl } from '@/lib/api';
import { asList } from '@/lib/social';
import { color, noOutline, radius, space, type, weight } from '@/theme/tokens';
import type { PublicProfile } from '@/types/api';

export default function SellersScreen() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<PublicProfile[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      api
        .get<PublicProfile[]>(
          `/api/v1/search/sellers?q=${encodeURIComponent(q.trim())}&limit=25`,
          { auth: false },
        )
        .then((r) => {
          if (alive) setRows(asList<PublicProfile>(r, 'sellers'));
        })
        .catch(() => {
          if (alive) setRows([]);
        })
        .finally(() => {
          if (alive) setBusy(false);
        });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);

  return (
    <StackScreen title="Sellers">
      <View style={styles.searchWrap}>
        <View style={styles.search}>
          <Feather name="search" size={17} color={color.muted} />
          <TextInput
            style={[styles.input, noOutline]}
            value={q}
            onChangeText={(text) => {
              setBusy(true);
              setQ(text);
            }}
            placeholder="Name or handle"
            placeholderTextColor={color.placeholder}
            autoCorrect={false}
          />
          {busy ? <ActivityIndicator size="small" color={color.muted} /> : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {rows.length === 0 && !busy ? (
          <Empty icon="users" title="No sellers to show" message="Try a different name or handle." />
        ) : (
          <Card>
            {rows.map((s, i) => (
              <Tap
                key={s.username ?? i}
                haptic="none"
                scale={1}
                style={[styles.row, i > 0 && styles.divided]}
                accessibilityRole="button"
                accessibilityLabel={`See ${s.name ?? s.username ?? 'this seller'}`}
                onPress={() => s.username && router.push(`/u/${s.username}`)}>
                {s.avatarUrl ? (
                  <Image source={{ uri: mediaUrl(s.avatarUrl) }} style={styles.face} />
                ) : (
                  <View style={[styles.face, styles.faceFallback]}>
                    <Text style={styles.faceText}>
                      {(s.name ?? s.username ?? '?').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.text}>
                  <Text style={styles.primary}>{s.name ?? s.username}</Text>
                  {s.username ? <Text style={styles.secondary}>@{s.username}</Text> : null}
                </View>
                <Feather name="chevron-right" size={16} color={color.chevron} />
              </Tap>
            ))}
          </Card>
        )}
      </ScrollView>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  searchWrap: { padding: 14, backgroundColor: color.surface },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: color.field,
    paddingHorizontal: space[3],
  },
  input: { flex: 1, fontSize: type.body, color: color.ink },
  body: { padding: space[4], paddingBottom: 30 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: space[3] },
  divided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.hair },
  face: { width: 38, height: 38, borderRadius: radius.pill, backgroundColor: color.field },
  faceFallback: { backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' },
  faceText: { fontSize: type.sub, fontWeight: weight.semibold, color: color.surface },
  text: { flex: 1, minWidth: 0 },
  primary: { fontSize: type.sub, fontWeight: weight.semibold, color: color.ink },
  secondary: { fontSize: type.footnote, color: color.muted },
});
