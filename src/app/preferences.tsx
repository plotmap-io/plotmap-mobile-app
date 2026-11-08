import { useCallback, useEffect, useState } from 'react';
import { Alert as RNAlert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, GroupLabel } from '@/components/card';
import { StackScreen } from '@/components/stack-screen';
import { ErrorState, Loading } from '@/components/states';
import { Tap } from '@/components/tap';
import { getPreferences, savePreferences, type Preferences } from '@/lib/account';
import { metadata } from '@/lib/metadata';
import { color, radius, space, type, weight } from '@/theme/tokens';
import type { Option } from '@/types/api';

const DISTANCE: Option[] = [
  { value: 'metric', label: 'Kilometres' },
  { value: 'imperial', label: 'Miles' },
];
const THEMES: Option[] = [
  { value: 'system', label: 'Match device' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

function Choice({
  options,
  value,
  onPick,
}: {
  options: Option[];
  value?: string;
  onPick: (v: string) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Tap
            key={o.value}
            haptic="selection"
            scale={0.96}
            style={[styles.chip, on && styles.chipOn]}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onPick(o.value)}>
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{o.label}</Text>
          </Tap>
        );
      })}
    </View>
  );
}

export default function PreferencesScreen() {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [areaUnits, setAreaUnits] = useState<Option[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // A promise chain, not an `async` body — the state writes belong in
  // callbacks so an effect may call this (react-hooks/set-state-in-effect).
  const load = useCallback(() => {
    Promise.all([getPreferences(), metadata().catch(() => null)])
      .then(([p, m]) => {
        setPrefs(p);
        setAreaUnits(m?.areaUnits ?? []);
        setError(null);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Could not load preferences'),
      );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = useCallback(
    async (part: Preferences) => {
      if (!prefs) return;
      const next = { ...prefs, ...part };
      setPrefs(next);
      setSaving(true);
      try {
        await savePreferences(next);
      } catch (e) {
        setPrefs(prefs);
        RNAlert.alert('Not saved', e instanceof Error ? e.message : 'Try again.');
      } finally {
        setSaving(false);
      }
    },
    [prefs],
  );

  return (
    <StackScreen
      title="Preferences"
      action={saving ? <Text style={styles.saving}>Saving…</Text> : null}>
      {error ? (
        <ErrorState title="Couldn’t load your preferences" message={error} onRetry={load} />
      ) : !prefs ? (
        <Loading />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <View>
            <GroupLabel>Area unit</GroupLabel>
            <Card>
              <View style={styles.pad}>
                <Choice
                  options={areaUnits}
                  value={prefs.areaUnit}
                  onPick={(v) => update({ areaUnit: v })}
                />
              </View>
            </Card>
          </View>

          <View>
            <GroupLabel>Distance</GroupLabel>
            <Card>
              <View style={styles.pad}>
                <Choice
                  options={DISTANCE}
                  value={prefs.distanceUnit}
                  onPick={(v) => update({ distanceUnit: v })}
                />
              </View>
            </Card>
          </View>

          <View>
            <GroupLabel>Theme</GroupLabel>
            <Card>
              <View style={styles.pad}>
                <Choice options={THEMES} value={prefs.theme} onPick={(v) => update({ theme: v })} />
              </View>
            </Card>
          </View>

          <Text style={styles.note}>
            Preferences are stored on your account, so they follow you to the web.
          </Text>
        </ScrollView>
      )}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  body: { padding: space[4], gap: 14, paddingBottom: 30 },
  pad: { padding: space[3] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  chip: {
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radius.sm,
    backgroundColor: color.field,
  },
  chipOn: { backgroundColor: color.accent },
  chipText: { fontSize: type.sub, fontWeight: weight.medium, color: color.ink },
  chipTextOn: { color: color.surface, fontWeight: weight.semibold },
  note: { fontSize: type.footnote, color: color.muted, paddingHorizontal: 2 },
  saving: { fontSize: type.footnote, color: color.muted },
});
