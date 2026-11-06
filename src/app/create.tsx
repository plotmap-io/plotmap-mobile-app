import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Card, GroupLabel } from '@/components/card';
import { SignInPrompt } from '@/components/sign-in-prompt';
import { StackScreen } from '@/components/stack-screen';
import { ErrorState, Loading } from '@/components/states';
import { emptyDraft, publishDraft, saveDraft } from '@/lib/account';
import { useAuth } from '@/lib/auth';
import { metadata } from '@/lib/metadata';
import { color } from '@/theme/tokens';
import type { ListingDetail, PropertyType } from '@/types/api';

/**
 * Creates a draft on the server first, then edits it — the backend owns the
 * listing's shape, so there is no local draft to keep in sync. Photos and
 * boundaries come later; this gets a listing live.
 */
export default function CreateListingScreen() {
  const { signedIn, loading: authLoading } = useAuth();
  const [draft, setDraft] = useState<ListingDetail | null>(null);
  const [types, setTypes] = useState<PropertyType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [price, setPrice] = useState('');
  const [area, setArea] = useState('');
  const [description, setDescription] = useState('');
  const [subType, setSubType] = useState<string>('');

  const start = useCallback(async () => {
    if (!signedIn) return;
    setError(null);
    try {
      const [d, m] = await Promise.all([emptyDraft(), metadata().catch(() => null)]);
      setDraft(d);
      setSubType(d.propertySubType ?? '');
      setTypes(m?.propertyTypes ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start a draft');
    }
  }, [signedIn]);

  useEffect(() => {
    if (!authLoading) start();
  }, [authLoading, start]);

  const publish = useCallback(async () => {
    if (!draft) return;
    const amount = Number(price.replace(/[^0-9]/g, ''));
    if (!amount) {
      Alert.alert('Add a price', 'A listing needs an asking price before it can go live.');
      return;
    }
    setBusy(true);
    try {
      await saveDraft(draft.id, {
        ...draft,
        propertySubType: subType || draft.propertySubType,
        askAmount: amount,
        askAmountTotal: amount,
        askCurrency: 'INR',
        lotSizeSqm: Number(area.replace(/[^0-9.]/g, '')) || draft.lotSizeSqm || 0,
        description: description.trim() || draft.description,
      });
      await publishDraft(draft.id);
      Alert.alert('Published', 'Your listing is live.', [
        { text: 'OK', onPress: () => router.replace(`/listing/${draft.id}`) },
      ]);
    } catch (e) {
      Alert.alert('Not published', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }, [area, description, draft, price, subType]);

  const subtypes = types.flatMap((t) => t.subtypes.map((s) => ({ ...s, group: t.label })));

  return (
    <StackScreen title="Create listing">
      {!signedIn && !authLoading ? (
        <SignInPrompt message="Sign in to list your land or property." />
      ) : error ? (
        <ErrorState message={error} onRetry={start} />
      ) : !draft ? (
        <Loading label="Starting a draft…" />
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <View>
              <GroupLabel>What are you listing?</GroupLabel>
              <View style={styles.chips}>
                {subtypes.slice(0, 12).map((s) => {
                  const on = s.value === subType;
                  return (
                    <Pressable
                      key={s.value}
                      style={[styles.chip, on && styles.chipOn]}
                      onPress={() => setSubType(s.value)}>
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{s.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View>
              <GroupLabel>Asking price (₹)</GroupLabel>
              <Card>
                <TextInput
                  style={styles.input}
                  value={price}
                  onChangeText={setPrice}
                  placeholder="4200000"
                  placeholderTextColor="#9aabb6"
                  keyboardType="number-pad"
                />
              </Card>
            </View>

            <View>
              <GroupLabel>Area (sq.m)</GroupLabel>
              <Card>
                <TextInput
                  style={styles.input}
                  value={area}
                  onChangeText={setArea}
                  placeholder="400"
                  placeholderTextColor="#9aabb6"
                  keyboardType="decimal-pad"
                />
              </Card>
              <Text style={styles.hint}>1 cent is about 40.5 sq.m.</Text>
            </View>

            <View>
              <GroupLabel>Description</GroupLabel>
              <Card>
                <TextInput
                  style={[styles.input, styles.multiline]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Road frontage, nearby landmarks, what makes it worth seeing."
                  placeholderTextColor="#9aabb6"
                  multiline
                />
              </Card>
            </View>

            <Text style={styles.note}>
              Photos and the plot boundary can be added from the listing once it is live.
            </Text>
          </ScrollView>

          <View style={styles.foot}>
            <Pressable style={[styles.publish, busy && styles.busy]} disabled={busy} onPress={publish}>
              {busy ? (
                <ActivityIndicator color={color.surface} />
              ) : (
                <Text style={styles.publishText}>Publish listing</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { padding: 16, gap: 14, paddingBottom: 24 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 10, backgroundColor: color.field },
  chipOn: { backgroundColor: color.accent },
  chipText: { fontSize: 13, fontWeight: '500', color: color.ink },
  chipTextOn: { color: color.surface, fontWeight: '600' },
  input: { padding: 13, fontSize: 16, color: color.ink },
  multiline: { minHeight: 110, textAlignVertical: 'top' },
  hint: { fontSize: 12, color: color.faint, paddingHorizontal: 2, paddingTop: 5 },
  note: { fontSize: 12.5, color: color.muted, paddingHorizontal: 2 },
  foot: {
    padding: 16,
    paddingTop: 10,
    backgroundColor: color.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.line,
  },
  publish: {
    height: 48, borderRadius: 12, backgroundColor: color.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  busy: { opacity: 0.7 },
  publishText: { fontSize: 16, fontWeight: '600', color: color.surface },
});
