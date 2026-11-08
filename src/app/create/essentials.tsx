import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Card } from '@/components/card';
import { Chips, Segment, type Choice } from '@/components/create/chips';
import { CreateGate } from '@/components/create/gate';
import { Group, StepScreen } from '@/components/create/step-screen';
import { Button } from '@/components/tap';
import { useCreateFlow } from '@/lib/create-flow';
import { moneyLabel } from '@/lib/display';
import { AREA_UNITS, isAreaUnit, type AreaUnit } from '@/services/area';
import {
  allowedPriceBases,
  impliedTotal,
  isPriceBasis,
  PRICE_BASIS_LABEL,
  PRICE_BASIS_SUFFIX,
} from '@/services/listing-draft';
import { color, noOutline, space, type, weight } from '@/theme/tokens';

/**
 * Step 3 — what it is and what it costs.
 *
 * The two things that were wrong before any of this existed:
 *
 *  - The area was asked in SQUARE METRES. A Kerala broker thinks in cents;
 *    the unit tabs are his, and the conversion to `lotSizeSqm` is ours.
 *  - A per-cent rate was stored as the TOTAL. It is a rate: the total line
 *    under the price is the multiplication, shown before it is saved, and
 *    `askAmountTotal` carries exactly that number.
 */
const STATUS_OPTIONS: Choice[] = [
  { value: 'ForSale', label: 'For sale' },
  { value: 'ForRent', label: 'For rent' },
];

const LISTED_BY: Choice[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'broker', label: 'Broker' },
];

/** Only digits: a price field that accepts "1,00,000" cannot be parsed. */
function digits(text: string): number {
  const n = Number(text.replace(/[^0-9]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function decimals(text: string): number {
  const n = Number(text.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export default function EssentialsStep() {
  const { values, patch, metadata, save, saving } = useCreateFlow();
  const [note, setNote] = useState<string | null>(null);
  const [priceText, setPriceText] = useState(values.priceAmount ? String(values.priceAmount) : '');
  const [areaText, setAreaText] = useState(values.areaValue ? String(values.areaValue) : '');

  const types: Choice[] = (metadata?.propertyTypes ?? []).map((t) => ({
    value: t.value,
    label: t.label,
  }));
  const subtypes: Choice[] =
    metadata?.propertyTypes.find((t) => t.value === values.propertyType)?.subtypes ?? [];

  const bases = allowedPriceBases(metadata?.pricingRules, values.propertySubType, values.status);
  const basisOptions: Choice[] = bases.map((b) => ({ value: b, label: PRICE_BASIS_LABEL[b] }));

  // The server's own units and labels ("Cents", "sq.ft"); the hard-coded list
  // is only the fallback for a metadata call that failed.
  const fromServer = (metadata?.areaUnits ?? []).filter((u) => isAreaUnit(u.value));
  const areaOptions: Choice[] = fromServer.length
    ? fromServer
    : AREA_UNITS.map((u) => ({ value: u, label: u }));

  const total = impliedTotal(values);
  const rentSuffix = values.status === 'ForRent' ? ' a month' : '';

  const pickType = useCallback(
    (value: string | undefined) => {
      // A sub-type belongs to its category: changing the category drops it,
      // and so does the price basis, which the sub-type decides.
      patch({ propertyType: value ?? '', propertySubType: '', priceBasis: 'total' });
    },
    [patch],
  );

  const pickSubType = useCallback(
    (value: string | undefined) => {
      const next = value ?? '';
      const allowed = allowedPriceBases(metadata?.pricingRules, next, values.status);
      patch({
        propertySubType: next,
        // Keep the rate if the new sub-type allows it; a house has no
        // per-cent price and the server would refuse it at publish.
        priceBasis: allowed.includes(values.priceBasis) ? values.priceBasis : 'total',
      });
    },
    [metadata?.pricingRules, patch, values.priceBasis, values.status],
  );

  const onwards = useCallback(() => {
    setNote(null);
    save()
      .then(() => router.push('/create/review'))
      .catch((e: unknown) =>
        setNote(e instanceof Error ? e.message : 'The details could not be saved'),
      );
  }, [save]);

  return (
    <CreateGate>
      <StepScreen
        step={3}
        title="Essentials"
        footer={
          <>
            {note ? <Text style={styles.warn}>{note}</Text> : null}
            <Button
              label="Continue"
              size="lg"
              busy={saving}
              accessibilityLabel="Continue to the review"
              onPress={onwards}
            />
          </>
        }>
        <Group label="Sale or rent">
          <Segment
            options={STATUS_OPTIONS}
            value={values.status}
            label="Listing"
            onPick={(value) => {
              const status = value === 'ForRent' ? 'ForRent' : 'ForSale';
              const allowed = allowedPriceBases(
                metadata?.pricingRules,
                values.propertySubType,
                status,
              );
              patch({
                status,
                priceBasis: allowed.includes(values.priceBasis) ? values.priceBasis : 'total',
              });
            }}
          />
        </Group>

        <Group label="What are you listing?">
          <Chips options={types} value={values.propertyType} onPick={pickType} label="Category" />
          {subtypes.length ? (
            <View style={styles.sub}>
              <Chips
                options={subtypes}
                value={values.propertySubType}
                onPick={pickSubType}
                label="Property type"
              />
            </View>
          ) : null}
        </Group>

        <Group
          label={`Asking price${rentSuffix}`}
          note={
            total != null && values.priceBasis !== 'total'
              ? `${moneyLabel(values.priceAmount, values.currency)} per ${PRICE_BASIS_SUFFIX[values.priceBasis]} × ${values.areaValue} = the total above.`
              : 'A rate per cent or per sq.ft is recorded as a rate, and the total is worked out from the area.'
          }>
          <Card>
            <View style={styles.amountRow}>
              <Text style={styles.symbol}>₹</Text>
              <TextInput
                style={styles.amount}
                value={priceText}
                onChangeText={(text) => {
                  setPriceText(text);
                  patch({ priceAmount: digits(text) });
                }}
                placeholder="0"
                placeholderTextColor={color.placeholder}
                keyboardType="number-pad"
                accessibilityLabel="Asking price in rupees"
              />
              {values.priceBasis !== 'total' ? (
                <Text style={styles.per}>/ {PRICE_BASIS_SUFFIX[values.priceBasis]}</Text>
              ) : null}
            </View>
          </Card>

          <View style={styles.basis}>
            <Chips
              options={basisOptions}
              value={values.priceBasis}
              label="Price per"
              onPick={(value) =>
                patch({ priceBasis: isPriceBasis(value) ? value : 'total' })
              }
            />
          </View>

          <Text style={styles.total}>
            {total != null
              ? `${moneyLabel(total, values.currency)}${rentSuffix} in total`
              : values.priceBasis === 'total'
                ? 'The total asking price'
                : 'Add the area below to see the total'}
          </Text>
        </Group>

        <Group
          label="Area"
          note="Stored in square metres, shown in the unit you chose. 1 cent is 40.47 sq.m.">
          <Card>
            <View style={styles.amountRow}>
              <TextInput
                style={styles.amount}
                value={areaText}
                onChangeText={(text) => {
                  setAreaText(text);
                  patch({ areaValue: decimals(text) });
                }}
                placeholder="0"
                placeholderTextColor={color.placeholder}
                keyboardType="decimal-pad"
                accessibilityLabel={`Area in ${values.areaUnit}`}
              />
            </View>
          </Card>
          <View style={styles.basis}>
            <Segment
              options={areaOptions}
              value={values.areaUnit}
              label="Area unit"
              onPick={(value) =>
                patch({ areaUnit: (isAreaUnit(value) ? value : 'cent') as AreaUnit })
              }
            />
          </View>
        </Group>

        <Group
          label="Listed by"
          note="Optional. Leave it unsaid if you would rather not say — it is never assumed.">
          <Chips
            options={LISTED_BY}
            value={
              values.listedByOwner === true
                ? 'owner'
                : values.listedByOwner === false
                  ? 'broker'
                  : undefined
            }
            clearable
            label="Listed by"
            onPick={(value) =>
              patch({ listedByOwner: value == null ? undefined : value === 'owner' })
            }
          />
        </Group>

        <Group label="Description" note="Optional, but it is what a buyer reads first.">
          <Card>
            <TextInput
              style={styles.multiline}
              value={values.description}
              onChangeText={(description) => patch({ description })}
              placeholder="Road frontage, nearby landmarks, what makes it worth seeing."
              placeholderTextColor={color.placeholder}
              multiline
              accessibilityLabel="Description"
            />
          </Card>
        </Group>
      </StepScreen>
    </CreateGate>
  );
}

const styles = StyleSheet.create({
  sub: { marginTop: space[2] },
  amountRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[3] },
  symbol: { fontSize: type.title2, fontWeight: weight.semibold, color: color.muted, marginRight: 6 },
  amount: {
    flex: 1,
    height: 52,
    fontSize: type.title2,
    fontWeight: weight.semibold,
    color: color.ink,
    padding: 0,
    ...(noOutline ?? {}),
  },
  per: { fontSize: type.body, fontWeight: weight.medium, color: color.muted },
  basis: { marginTop: space[2] },
  total: {
    fontSize: type.body,
    fontWeight: weight.semibold,
    color: color.accent,
    paddingHorizontal: 2,
    paddingTop: space[1],
  },
  multiline: {
    minHeight: 104,
    padding: space[3],
    fontSize: type.callout,
    lineHeight: 22,
    color: color.ink,
    textAlignVertical: 'top',
    ...(noOutline ?? {}),
  },
  warn: {
    fontSize: type.footnote,
    lineHeight: 17,
    color: color.redInk,
    paddingHorizontal: 2,
    paddingBottom: space[2],
  },
});
