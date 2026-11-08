import { Feather } from '@expo/vector-icons';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Tap } from '@/components/tap';
import { color, eyebrow, radius, space, type, weight } from '@/theme/tokens';

/** A bottom sheet of options — one tap picks and closes. */
export function PickerSheet<T extends string>({
  visible,
  title,
  options,
  value,
  onPick,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: { value: T; label: string }[];
  value: T;
  onPick: (value: T) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Tap
        haptic="none"
        scale={1}
        dim={1}
        style={styles.backdrop}
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={onClose}
      />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <View style={styles.grip} />
        <Text style={styles.title}>{title}</Text>
        <ScrollView style={styles.list} bounces={false}>
          {options.map((o) => {
            const on = o.value === value;
            return (
              <Tap
                key={o.value}
                haptic="selection"
                scale={1}
                style={styles.row}
                accessibilityRole="button"
                accessibilityState={on ? { selected: true } : {}}
                onPress={() => {
                  onPick(o.value);
                  onClose();
                }}>
                <Text style={[styles.label, on && styles.labelOn]}>{o.label}</Text>
                {on ? <Feather name="check" size={18} color={color.accent} /> : null}
              </Tap>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: color.scrim },
  sheet: {
    backgroundColor: color.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: space[4],
    paddingTop: space[2],
    maxHeight: '70%',
  },
  grip: {
    alignSelf: 'center',
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: color.grip,
    marginBottom: space[3],
  },
  title: { ...eyebrow, paddingBottom: space[1] },
  list: { flexGrow: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.hair,
  },
  label: { fontSize: type.body, color: color.ink },
  labelOn: { fontWeight: weight.semibold, color: color.accent },
});
