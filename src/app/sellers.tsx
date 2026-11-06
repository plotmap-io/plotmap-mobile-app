import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card } from '@/components/card';
import { StackScreen } from '@/components/stack-screen';
import { Empty } from '@/components/states';
import { api, mediaUrl } from '@/lib/api';
import { asList } from '@/lib/social';
import { color } from '@/theme/tokens';
import type { PublicProfile } from '@/types/api';

export default function SellersScreen() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<PublicProfile[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setBusy(true);
      api
        .get<PublicProfile[]>(
          `/api/v1/search/sellers?q=${encodeURIComponent(q.trim())}&limit=25`,
          { auth: false },
        )
        .then((r) => setRows(asList<PublicProfile>(r, 'sellers')))
        .catch(() => setRows([]))
        .finally(() => setBusy(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <StackScreen title="Sellers">
      <View style={styles.searchWrap}>
        <View style={styles.search}>
          <Feather name="search" size={17} color={color.muted} />
          <TextInput
            style={styles.input}
            value={q}
            onChangeText={setQ}
            placeholder="Name or handle"
            placeholderTextColor="#9aabb6"
            autoCorrect={false}
          />
          {busy ? <ActivityIndicator size="small" color={color.muted} /> : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {rows.length === 0 && !busy ? (
          <Empty icon="users" message="No sellers to show." />
        ) : (
          <Card>
            {rows.map((s, i) => (
              <Pressable
                key={s.username ?? i}
                style={[styles.row, i > 0 && styles.divided]}
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
                <Feather name="chevron-right" size={16} color="#b4c3cd" />
              </Pressable>
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
    flexDirection: 'row', alignItems: 'center', gap: 9, height: 44,
    borderRadius: 12, backgroundColor: color.field, paddingHorizontal: 13,
  },
  input: { flex: 1, fontSize: 15.5, color: color.ink },
  body: { padding: 16, paddingBottom: 30 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12 },
  divided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.hair },
  face: { width: 38, height: 38, borderRadius: 19, backgroundColor: color.field },
  faceFallback: { backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' },
  faceText: { fontSize: 13, fontWeight: '600', color: color.surface },
  text: { flex: 1, minWidth: 0 },
  primary: { fontSize: 14, fontWeight: '600', color: color.ink },
  secondary: { fontSize: 12, color: color.muted },
});
