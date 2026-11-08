import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import { Button, Tap } from '@/components/tap';
import { emptyDraft, publishDraft, saveDraft } from '@/lib/account';
import { useAuth } from '@/lib/auth';
import { metadata } from '@/lib/metadata';
import { color, noOutline, radius, space, type, weight } from '@/theme/tokens';
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

  // A promise chain, not an `async` body: the state writes live in callbacks,
  // which is what the React Compiler's lint means by "no setState inside an
  // effect".
  const start = useCallback(() => {
    Promise.all([emptyDraft(), metadata().catch(() => null)])
      .then(([d, m]) => {
        setDraft(d);
        setSubType(d.propertySubType ?? '');
        setTypes(m?.propertyTypes ?? []);
        setError(null);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Could not start a draft'),
      );
  }, []);

  useEffect(() => {
    if (authLoading || !signedIn) return;
    start();
  }, [authLoading, signedIn, start]);

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
        <ErrorState title="Couldn’t start a draft" message={error} onRetry={start} />
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
                    <Tap
                      key={s.value}
                      haptic="selection"
                      scale={0.96}
                      style={[styles.chip, on && styles.chipOn]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                      onPress={() => setSubType(s.value)}>
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{s.label}</Text>
                    </Tap>
                  );
                })}
              </View>
            </View>

            <View>
              <GroupLabel>Asking price (₹)</GroupLabel>
              <Card>
                <TextInput
                  style={[styles.input, noOutline]}
                  value={price}
                  onChangeText={setPrice}
                  placeholder="4200000"
                  placeholderTextColor={color.placeholder}
                  keyboardType="number-pad"
                  accessibilityLabel="Asking price"
                />
              </Card>
            </View>

            <View>
              <GroupLabel>Area (sq.m)</GroupLabel>
              <Card>
                <TextInput
                  style={[styles.input, noOutline]}
                  value={area}
                  onChangeText={setArea}
                  placeholder="400"
                  placeholderTextColor={color.placeholder}
                  keyboardType="decimal-pad"
                  accessibilityLabel="Area in square metres"
                />
              </Card>
              <Text style={styles.hint}>1 cent ≈ 40.5 sq.m</Text>
            </View>

            <View>
              <GroupLabel>Description</GroupLabel>
              <Card>
                <TextInput
                  style={[styles.input, styles.multiline]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Road frontage, nearby landmarks, what makes it worth seeing."
                  placeholderTextColor={color.placeholder}
                  multiline
                  accessibilityLabel="Description"
                />
              </Card>
            </View>

            <Text style={styles.note}>
              Photos and the plot boundary can be added from the listing once it is live.
            </Text>
          </ScrollView>

          <View style={styles.foot}>
            <Button label="Publish listing" size="lg" busy={busy} onPress={publish} />
          </View>
        </KeyboardAvoidingView>
      )}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { padding: space[4], gap: 14, paddingBottom: space[6] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  chip: {
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: space[3],
    borderRadius: radius.sm,
    backgroundColor: color.field,
  },
  chipOn: { backgroundColor: color.accent },
  chipText: { fontSize: type.sub, fontWeight: weight.medium, color: color.ink },
  chipTextOn: { color: color.surface, fontWeight: weight.semibold },
  input: { padding: space[3], fontSize: type.callout, color: color.ink },
  multiline: { minHeight: 110, textAlignVertical: 'top' },
  hint: { fontSize: type.footnote, color: color.faint, paddingHorizontal: 2, paddingTop: 5 },
  note: { fontSize: type.footnote, color: color.muted, paddingHorizontal: 2 },
  foot: {
    padding: space[4],
    paddingTop: space[3],
    backgroundColor: color.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.line,
  },
});
