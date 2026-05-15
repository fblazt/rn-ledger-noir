import { Platform } from 'react-native';

const ledgerBlueLight = '#123044';
const ledgerBlueDark = '#9fbfd0';

export const Colors = {
  light: {
    background: '#f4efe6',
    icon: '#776f61',
    tabIconDefault: '#776f61',
    tabIconSelected: ledgerBlueLight,
    text: '#17201a',
    tint: ledgerBlueLight,
  },
  dark: {
    background: '#10130f',
    icon: '#b3a78f',
    tabIconDefault: '#b3a78f',
    tabIconSelected: ledgerBlueDark,
    text: '#f6ecd8',
    tint: ledgerBlueDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    mono: 'ui-monospace',
    rounded: 'ui-rounded',
    sans: 'system-ui',
    serif: 'ui-serif',
  },
  default: {
    mono: 'monospace',
    rounded: 'normal',
    sans: 'normal',
    serif: 'serif',
  },
  web: {
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    sans: "Avenir Next, ui-sans-serif, system-ui, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
  },
});
