import { type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StackScreen } from '@/components/stack-screen';
import { color, eyebrow, radius, space, type } from '@/theme/tokens';

export const CREATE_STEPS = ['Photos', 'Where it is', 'Essentials', 'Review'] as const;

/**
 * One step of Create listing: the shared chrome every step wears.
 *
 * Four steps, a bar that fills as they are answered, and one action at the
 * bottom within thumb reach — a broker standing in a field holds the phone in
 * one hand, so the thing to press next is never halfway up the screen.
 */
export function StepScreen({
  step,
  title,
  lead,
  children,
  footer,
  scroll = true,
}: {
  /** 1-based, so the bar and the "Step 2 of 4" line agree. */
  step: number;
  title: string;
  lead?: string;
  children: ReactNode;
  footer: ReactNode;
  /** A full-bleed step (the map) lays itself out instead. */
  scroll?: boolean;
}) {
  const insets = useSafeAreaInsets();

  return (
    <StackScreen title={title}>
      <View style={styles.progress}>
        {CREATE_STEPS.map((name, i) => (
          <View key={name} style={[styles.segment, i < step && styles.segmentOn]} />
        ))}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View>
              <Text style={styles.step}>
                Step {step} of {CREATE_STEPS.length}
              </Text>
              {lead ? <Text style={styles.lead}>{lead}</Text> : null}
            </View>
            {children}
          </ScrollView>
        ) : (
          <View style={styles.flex}>{children}</View>
        )}

        <View style={[styles.foot, { paddingBottom: Math.max(insets.bottom, 12) }]}>{footer}</View>
      </KeyboardAvoidingView>
    </StackScreen>
  );
}

/** A labelled group inside a step — the eyebrow, then whatever answers it. */
export function Group({
  label,
  note,
  children,
}: {
  label: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      {children}
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  progress: {
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: space[4],
    paddingTop: space[3],
    paddingBottom: space[1],
    backgroundColor: color.surface,
  },
  segment: { flex: 1, height: 3, borderRadius: radius.pill, backgroundColor: color.line },
  segmentOn: { backgroundColor: color.accent },
  body: { padding: space[4], paddingBottom: space[6], gap: 18 },
  step: { ...eyebrow, color: color.faint },
  lead: { fontSize: type.body, lineHeight: 21, color: color.inkSoft, marginTop: 5 },
  group: { gap: space[2] },
  groupLabel: { ...eyebrow, paddingHorizontal: 2 },
  note: { fontSize: type.footnote, lineHeight: 17, color: color.muted, paddingHorizontal: 2 },
  foot: {
    paddingHorizontal: space[4],
    paddingTop: space[3],
    backgroundColor: color.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.line,
  },
});
