import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Touch feedback, in four words. `selection` is a tick as a control changes
 * under the finger (tabs, pickers); `light` is a tap that did something
 * (save, pin); `success` / `error` close an action. Nothing fires on the
 * web, and a device without a motor fails silently.
 */
const native = Platform.OS === 'ios' || Platform.OS === 'android';

const quiet = () => {};

export const haptic = {
  selection: () => {
    if (native) Haptics.selectionAsync().catch(quiet);
  },
  light: () => {
    if (native) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(quiet);
  },
  medium: () => {
    if (native) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(quiet);
  },
  success: () => {
    if (native) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(quiet);
  },
  error: () => {
    if (native) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(quiet);
  },
} as const;

export type HapticKind = keyof typeof haptic;
