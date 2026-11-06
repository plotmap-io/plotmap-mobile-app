import { useCallback, useEffect, useState } from 'react';
import { Alert as RNAlert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, GroupLabel } from '@/components/card';
import { StackScreen } from '@/components/stack-screen';
import { ErrorState, Loading } from '@/components/states';
import { getPreferences, savePreferences, type Preferences } from '@/lib/account';
import { metadata } from '@/lib/metadata';
import { color } from '@/theme/tokens';
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
          <Pressable
            key={o.value}
            style={[styles.chip, on && styles.chipOn]}
            onPress={() => onPick(o.value)}>
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{o.label}</Text>
          </Pressable>
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

  const load = useCallback(async () => {
    setError(null);
    try {
      const [p, m] = await Promise.all([getPreferences(), metadata().catch(() => null)]);
      setPrefs(p);
      setAreaUnits(m?.areaUnits ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load preferences');
    }
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
        <ErrorState message={error} onRetry={load} />
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
  body: { padding: 16, gap: 14, paddingBottom: 30 },
  pad: { padding: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: color.field },
  chipOn: { backgroundColor: color.accent },
  chipText: { fontSize: 13.5, fontWeight: '500', color: color.ink },
  chipTextOn: { color: color.surface, fontWeight: '600' },
  note: { fontSize: 12.5, color: color.muted, paddingHorizontal: 2 },
  saving: { fontSize: 12.5, color: color.muted },
});
