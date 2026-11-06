import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, GroupLabel } from '@/components/card';
import { StackScreen } from '@/components/stack-screen';
import { devListings } from '@/lib/dev-data';
import { UNREACHABLE_API, useDevSettings } from '@/lib/dev-settings';
import { color } from '@/theme/tokens';

const edgeCount = devListings.filter((l) => l.id.startsWith('edge-')).length;
const currencyCount = new Set(devListings.map((l) => l.askCurrency)).size;
const cityCount = new Set(devListings.filter((l) => l.city).map((l) => l.city)).size;

function Action({
  icon,
  label,
  hint,
  tone = 'normal',
  disabled,
  onPress,
  divided,
}: {
  icon: any;
  label: string;
  hint?: string;
  tone?: 'normal' | 'danger';
  disabled?: boolean;
  onPress: () => void;
  divided?: boolean;
}) {
  return (
    <Pressable
      style={[styles.row, divided && styles.rowDivided, disabled && styles.rowOff]}
      disabled={disabled}
      onPress={onPress}>
      <View style={styles.rowIcon}>
        <Feather name={icon} size={16} color={tone === 'danger' ? color.shiraz : '#3c6075'} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, tone === 'danger' && styles.rowLabelDanger]}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
    </Pressable>
  );
}

/**
 * Development only — the Menu does not offer this screen in a release build.
 *
 * Two switches, and between them the three states worth testing: a real server,
 * a server that cannot be reached, and a populated app with no server at all.
 */
export default function DevelopmentScreen() {
  const { apiUrl, sampleData, inferredApiUrl, testMode, setApiUrl, setSampleData } =
    useDevSettings();
  const [draft, setDraft] = useState(apiUrl);

  // Derived from state, never read back from the api module. React Compiler
  // memoises this subtree, and an impure getter called during render has no
  // dependency for it to track — the line would keep showing the old server.
  const effective = apiUrl || inferredApiUrl;

  const commit = (value: string) => {
    setDraft(value);
    setApiUrl(value.trim());
  };

  return (
    <StackScreen title="Development">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <GroupLabel>API server</GroupLabel>
        <Card>
          <View style={styles.field}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              onBlur={() => commit(draft)}
              onSubmitEditing={() => commit(draft)}
              placeholder={inferredApiUrl}
              placeholderTextColor="#9aabb6"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
            />
            <Text style={styles.hint}>
              Leave it empty to follow the machine serving the bundle. Requests go to{' '}
              <Text style={styles.hintStrong}>{effective}</Text>.
            </Text>
          </View>
          <Action
            divided
            icon="wifi-off"
            label={`Point at ${UNREACHABLE_API}`}
            hint="Nothing answers, so every request fails — a dropped backend on demand."
            disabled={apiUrl === UNREACHABLE_API}
            onPress={() => commit(UNREACHABLE_API)}
          />
          <Action
            divided
            icon="rotate-ccw"
            label="Use the default server"
            hint={inferredApiUrl}
            disabled={apiUrl === ''}
            onPress={() => commit('')}
          />
        </Card>

        <GroupLabel>Sample data</GroupLabel>
        <Card>
          <View style={styles.field}>
            <Text style={styles.status}>
              {sampleData ? 'Answering from sample data' : 'Talking to the server'}
            </Text>
            <Text style={styles.hint}>
              {devListings.length} generated listings — half around Thrissur and Kerala, half
              across {cityCount} cities worldwide in {currencyCount} currencies. {edgeCount} are
              awkward on purpose: two pins on one coordinate, a knot too tight to draw apart,
              money at both extremes, a hundredth floor, thirty photos and none, the
              antimeridian from both sides.
            </Text>
            <Text style={styles.hint}>
              Place search is answered here too, so it never reaches Google or Mapbox. Photos
              load from picsum.photos and need internet, nothing else does. Requests the sample
              data cannot answer still go to the network, so signing in fails honestly.
            </Text>
          </View>
          <Action
            divided
            icon="database"
            label="Insert fake data"
            hint="The map, list, filters and listing pages fill in with no server running."
            disabled={sampleData}
            onPress={() => setSampleData(true)}
          />
          <Action
            divided
            icon="trash-2"
            tone="danger"
            label="Remove fake data"
            hint="Back to the real server, whatever it answers."
            disabled={!sampleData}
            onPress={() => setSampleData(false)}
          />
        </Card>

        <Text style={styles.foot}>
          {testMode
            ? 'Test mode: nothing is saved, and every load starts pointed at nowhere with no sample data.'
            : 'These settings live on this device and are ignored by a release build.'}
        </Text>
      </ScrollView>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 30, gap: 10 },
  field: { padding: 13, gap: 7 },
  input: {
    height: 44,
    borderRadius: 10,
    backgroundColor: color.field,
    paddingHorizontal: 12,
    fontSize: 15,
    color: color.ink,
  },
  status: { fontSize: 14.5, fontWeight: '600', color: color.ink },
  hint: { fontSize: 12, lineHeight: 17, color: color.muted },
  hintStrong: { fontWeight: '600', color: color.ink },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, padding: 13 },
  rowDivided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.hair },
  rowOff: { opacity: 0.4 },
  rowIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: color.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 14, fontWeight: '500', color: color.ink },
  rowLabelDanger: { color: color.shiraz },
  rowHint: { fontSize: 12, lineHeight: 16, color: color.muted },
  foot: { fontSize: 11.5, color: '#9aabb6', textAlign: 'center', paddingTop: 4 },
});
