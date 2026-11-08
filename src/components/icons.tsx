import Svg, { Path } from 'react-native-svg';

import { color } from '@/theme/tokens';

/**
 * The save mark is a BOOKMARK in slate — Ajay's 2026-11-05 call on the web
 * ("Save Mark Options", option D). The path is the web's `Icons.savePath`
 * verbatim so the two never drift; there is no heart in the app.
 */
const SAVE_PATH = 'M6.5 3h11a1 1 0 0 1 1 1v16.2l-6.5-3.9-6.5 3.9V4a1 1 0 0 1 1-1z';

export function SaveIcon({
  size = 20,
  tint = color.accent,
  filled = false,
  strokeWidth = 1.75,
}: {
  size?: number;
  tint?: string;
  filled?: boolean;
  strokeWidth?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d={SAVE_PATH}
        fill={filled ? tint : 'none'}
        stroke={tint}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
