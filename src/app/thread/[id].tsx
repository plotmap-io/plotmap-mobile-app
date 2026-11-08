import { Feather } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Empty, ErrorState, Loading } from '@/components/states';
import { Tap } from '@/components/tap';
import { asList, messages as fetchMessages, sendMessage } from '@/lib/social';
import { color, noOutline, radius, space, type, weight } from '@/theme/tokens';
import type { Message } from '@/types/api';

export default function ThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const scroller = useRef<ScrollViewInstance>(null);

  // A promise chain, not an `async` body — the state writes belong in
  // callbacks so an effect may call this (react-hooks/set-state-in-effect).
  const load = useCallback(() => {
    if (!id) return Promise.resolve();
    return fetchMessages(id)
      .then((r) => {
        setRows(asList<Message>(r, 'messages'));
        setError(null);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Could not load this conversation'),
      )
      .finally(() => setLoading(false));
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
        <Tap
          haptic="none"
          scale={0.9}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}>
          <Feather name="arrow-left" size={21} color={color.ink} />
        </Tap>
        <Text style={styles.title}>Conversation</Text>
        <View style={styles.filler} />
      </View>

      <ScrollView
        ref={scroller}
        contentContainerStyle={styles.body}
        onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })}>
        {error ? (
          <ErrorState title="Couldn’t load this conversation" message={error} onRetry={load} />
        ) : loading ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty icon="message-circle" title="No messages yet" message="Say hello." />
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
          style={[styles.input, noOutline]}
          value={draft}
          onChangeText={setDraft}
          placeholder="Write a message"
          placeholderTextColor={color.placeholder}
          multiline
        />
        <Tap
          haptic="light"
          scale={0.92}
          style={styles.send}
          disabled={!draft.trim()}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          onPress={send}>
          <Feather name="arrow-up" size={19} color={color.surface} />
        </Tap>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[4],
    paddingBottom: space[3],
    backgroundColor: color.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.line,
  },
  title: { fontSize: type.title3, fontWeight: weight.bold, color: color.ink },
  filler: { width: 21 },
  body: { padding: space[4], gap: space[2], flexGrow: 1 },
  bubble: {
    alignSelf: 'flex-start',
    maxWidth: '80%',
    backgroundColor: color.surface,
    borderRadius: radius.md,
    paddingHorizontal: space[3],
    paddingVertical: 9,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.line,
  },
  mine: { alignSelf: 'flex-end', backgroundColor: color.accent, borderColor: color.accent },
  msg: { fontSize: type.body, lineHeight: 21, color: color.ink },
  msgMine: { color: color.surface },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 9,
    paddingHorizontal: 14,
    paddingTop: space[3],
    backgroundColor: color.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.line,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderRadius: radius.md,
    backgroundColor: color.field,
    paddingHorizontal: space[3],
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: type.body,
    color: color.ink,
  },
  send: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
