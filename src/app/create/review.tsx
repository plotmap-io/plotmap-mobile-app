import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { CreateGate } from '@/components/create/gate';
import { Group, StepScreen } from '@/components/create/step-screen';
import { Button, Tap } from '@/components/tap';
import { useCreateFlow } from '@/lib/create-flow';
import { addressLine, humanise, moneyLabel } from '@/lib/display';
import { haptic } from '@/lib/haptics';
import { formatArea, toSqm } from '@/services/area';
import { canPublish, impliedTotal, PRICE_BASIS_SUFFIX, type MissingKey } from '@/services/listing-draft';
import { color, radius, space, type, weight } from '@/theme/tokens';

/**
 * Step 4 — what the server is about to be told, and the one button.
 *
 * "Still needed" names the server's OWN rules in the broker's words, and each
 * line goes to the step that answers it; Publish stays disabled until the
 * list is empty. A 400 after the walk back from a plot is the worst possible
 * place to learn that the photo never uploaded.
 *
 * If publish is refused anyway, the server's text is shown verbatim — the
 * validator answers with `{field, message}` pairs and they are more use than
 * anything this screen could invent.
 */
const STEP_FOR: Record<MissingKey, '/create' | '/create/where' | '/create/essentials'> = {
  photo: '/create',
  location: '/create/where',
  type: '/create/essentials',
  price: '/create/essentials',
  area: '/create/essentials',
  details: '/create/essentials',
};

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, muted && styles.valueMuted]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

export default function ReviewStep() {
  const { draft, values, photos, missing, publish, publishing } = useCreateFlow();
  const [failed, setFailed] = useState<string | null>(null);

  const total = impliedTotal(values);
  const ready = canPublish(draft);
  const uploaded = photos.filter((p) => p.state === 'done').length;

  const go = useCallback(() => {
    setFailed(null);
    publish()
      .then((listingId) => {
        haptic.success();
        // `replace`, not push: the draft is published and Back must not
        // return into a flow that would start another one.
        router.replace(`/listing/${listingId}`);
      })
      .catch((e: unknown) => {
        haptic.error();
        setFailed(e instanceof Error ? e.message : 'The listing could not be published');
      });
  }, [publish]);

  const price =
    total == null
      ? 'Not set'
      : values.priceBasis === 'total'
        ? moneyLabel(total, values.currency)
        : `${moneyLabel(total, values.currency)} · ${moneyLabel(values.priceAmount, values.currency)} per ${PRICE_BASIS_SUFFIX[values.priceBasis]}`;

  return (
    <CreateGate>
      <StepScreen
        step={4}
        title="Review"
        lead="This is what goes on the map. A published listing is part of the market record — it can be taken off the market, but never deleted."
        footer={
          <>
            {failed ? <Text style={styles.failed}>{failed}</Text> : null}
            <Button
              label={values.status === 'ForRent' ? 'Publish for rent' : 'Publish listing'}
              size="lg"
              busy={publishing}
              disabled={!ready}
              onPress={go}
            />
          </>
        }>
        <Group label="The listing">
          <Card>
            <Row
              label="Photos"
              value={uploaded ? `${uploaded} uploaded` : 'None yet'}
              muted={uploaded === 0}
            />
            <View style={styles.rule} />
            <Row
              label="Where"
              value={
                addressLine(values.address.addressDisplay) ||
                (values.pin
                  ? `${values.pin.latitude.toFixed(5)}, ${values.pin.longitude.toFixed(5)}`
                  : 'No pin yet')
              }
              muted={!values.pin}
            />
            <View style={styles.rule} />
            <Row
              label="Type"
              value={
                values.propertySubType
                  ? `${humanise(values.propertySubType)} · ${values.status === 'ForRent' ? 'for rent' : 'for sale'}`
                  : 'Not chosen'
              }
              muted={!values.propertySubType}
            />
            <View style={styles.rule} />
            <Row label="Price" value={price} muted={total == null} />
            <View style={styles.rule} />
            <Row
              label="Area"
              value={
                values.areaValue > 0
                  ? formatArea(toSqm(values.areaValue, values.areaUnit), values.areaUnit)
                  : 'Not set'
              }
              muted={values.areaValue <= 0}
            />
          </Card>
        </Group>

        {ready ? (
          <View style={styles.ok}>
            <Feather name="check-circle" size={16} color={color.good} />
            <Text style={styles.okText}>Everything the server needs is here.</Text>
          </View>
        ) : (
          <Group label={`Still needed · ${missing.length}`}>
            <Card>
              {missing.map((item, i) => (
                <View key={item.key}>
                  {i > 0 ? <View style={styles.rule} /> : null}
                  <Tap
                    haptic="selection"
                    scale={0.99}
                    style={styles.missing}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${item.label}`}
                    onPress={() => {
                      setFailed(null);
                      router.push(STEP_FOR[item.key]);
                    }}>
                    <View style={styles.dot} />
                    <Text style={styles.missingText}>{item.label}</Text>
                    <Feather name="chevron-right" size={16} color={color.chevron} />
                  </Tap>
                </View>
              ))}
            </Card>
          </Group>
        )}
      </StepScreen>
    </CreateGate>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[3] },
  label: { width: 66, fontSize: type.sub, color: color.muted },
  value: { flex: 1, fontSize: type.body, fontWeight: weight.medium, color: color.ink },
  valueMuted: { color: color.faint, fontWeight: weight.regular },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: color.hair, marginLeft: space[3] },
  ok: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 2 },
  okText: { fontSize: type.sub, color: color.good, fontWeight: weight.medium },
  missing: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[3] },
  dot: { width: 6, height: 6, borderRadius: radius.pill, backgroundColor: color.warn },
  missingText: { flex: 1, fontSize: type.body, color: color.ink },
  failed: {
    fontSize: type.footnote,
    lineHeight: 17,
    color: color.redInk,
    paddingHorizontal: 2,
    paddingBottom: space[2],
  },
});
