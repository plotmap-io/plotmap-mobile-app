import { Feather } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color } from '@/theme/tokens';

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
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <View style={styles.grip} />
        <Text style={styles.title}>{title}</Text>
        <ScrollView style={styles.list} bounces={false}>
          {options.map((o) => {
            const on = o.value === value;
            return (
              <Pressable
                key={o.value}
                style={styles.row}
                accessibilityRole="button"
                accessibilityState={on ? { selected: true } : {}}
                onPress={() => {
                  onPick(o.value);
                  onClose();
                }}>
                <Text style={[styles.label, on && styles.labelOn]}>{o.label}</Text>
                {on ? <Feather name="check" size={18} color={color.accent} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(16,28,36,0.35)' },
  sheet: {
    backgroundColor: color.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 8,
    maxHeight: '70%',
  },
  grip: {
    alignSelf: 'center',
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#cfd8de',
    marginBottom: 10,
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#7e91a0',
    paddingBottom: 4,
  },
  list: { flexGrow: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.hair,
  },
  label: { fontSize: 15.5, color: color.ink },
  labelOn: { fontWeight: '600', color: color.accent },
});
