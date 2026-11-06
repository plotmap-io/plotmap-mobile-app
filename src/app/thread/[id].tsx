import { Feather } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView,
  type ScrollViewInstance, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Empty, ErrorState, Loading } from '@/components/states';
import { asList, messages as fetchMessages, sendMessage } from '@/lib/social';
import { color } from '@/theme/tokens';
import type { Message } from '@/types/api';

export default function ThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const scroller = useRef<ScrollViewInstance>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setRows(asList<Message>(await fetchMessages(id), 'messages'));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load this conversation');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const send = useCallback(async () => {
    const body = draft.trim();
    if (!body || !id) return;
    setDraft('');
    try {
      await sendMessage(id, body);
      await load();
      scroller.current?.scrollToEnd({ animated: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Message not sent');
      setDraft(body);
    }
  }, [draft, id, load]);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.bar, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={21} color={color.ink} />
        </Pressable>
        <Text style={styles.title}>Conversation</Text>
        <View style={{ width: 21 }} />
      </View>

      <ScrollView
        ref={scroller}
        contentContainerStyle={styles.body}
        onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })}>
        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : loading ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty icon="message-circle" message="No messages yet. Say hello." />
        ) : (
          rows.map((m) => (
            <View key={m.id} style={[styles.bubble, m.mine && styles.mine]}>
              <Text style={[styles.msg, m.mine && styles.msgMine]}>{m.body ?? m.text}</Text>
            </View>
          ))
        )}
      </ScrollView>

      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Write a message"
          placeholderTextColor="#9aabb6"
          multiline
        />
        <Pressable style={styles.send} onPress={send} disabled={!draft.trim()}>
          <Feather name="arrow-up" size={19} color={color.surface} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  bar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: color.surface,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.line,
  },
  title: { fontSize: 17, fontWeight: '700', color: color.ink },
  body: { padding: 16, gap: 8, flexGrow: 1 },
  bubble: {
    alignSelf: 'flex-start', maxWidth: '80%', backgroundColor: color.surface,
    borderRadius: 14, paddingHorizontal: 13, paddingVertical: 9,
    borderWidth: StyleSheet.hairlineWidth, borderColor: color.line,
  },
  mine: { alignSelf: 'flex-end', backgroundColor: color.accent, borderColor: color.accent },
  msg: { fontSize: 14.5, color: color.ink },
  msgMine: { color: color.surface },
  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 9,
    paddingHorizontal: 14, paddingTop: 10, backgroundColor: color.surface,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.line,
  },
  input: {
    flex: 1, minHeight: 42, maxHeight: 120, borderRadius: 14,
    backgroundColor: color.field, paddingHorizontal: 13, paddingTop: 11, paddingBottom: 11,
    fontSize: 15, color: color.ink,
  },
  send: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: color.accent,
    alignItems: 'center', justifyContent: 'center',
  },
});
