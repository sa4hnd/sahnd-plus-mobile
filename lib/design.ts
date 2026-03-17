import { Platform } from 'react-native';

// ─── TV Detection ───
export const isTV = Platform.isTV;

// ─── Netflix Exact Colors ───
export const C = {
  bg: '#141414',          // Netflix uses #141414, NOT pure black
  black: '#000000',       // Tab bar, player
  surface: '#282828',     // Cards, modal backgrounds
  elevated: '#3D3D3D',    // Dividers, inactive elements
  text: '#FFFFFF',        // Primary text
  text2: '#999999',       // Secondary/metadata text
  text3: '#808080',       // Inactive, muted
  text4: '#505050',       // Very muted, separators
  accent: '#E50914',      // Netflix red
  accentDark: '#B20710',  // Pressed state red
  green: '#46D369',       // Match percentage
  separator: 'rgba(255,255,255,0.08)',
  focus: '#E50914',       // TV focus ring color
} as const;

// ─── Spacing ───
const tvScale = isTV ? 2 : 1;

export const S = {
  xs: 4 * tvScale,
  sm: 8 * tvScale,
  md: 16 * tvScale,
  lg: 24 * tvScale,
  xl: 32 * tvScale,
  screen: isTV ? 48 : 16,        // TV needs wider margins
  rowGap: isTV ? 16 : 8,         // Gap between cards in a row
  sectionGap: isTV ? 40 : 20,    // Vertical gap between content rows
} as const;

// ─── Radius ───
export const R = {
  xs: 4,
  sm: isTV ? 10 : 6,
  md: isTV ? 12 : 8,
  lg: isTV ? 16 : 12,
  xl: isTV ? 20 : 16,
  pill: 100,
} as const;

// ─── Layout ───
export const Layout = {
  screenW: 0, // Set at runtime
  screenH: 0,
  safeTop: Platform.OS === 'ios' ? 56 : isTV ? 24 : 44,
  tabBarH: isTV ? 0 : 84,       // No tab bar on TV
  // Netflix card: ~3 visible + peek, 2:3 ratio
  cardW: isTV ? 220 : 110,
  cardH: isTV ? 330 : 165,
  // Continue watching: landscape 16:9
  thumbW: isTV ? 320 : 170,
  thumbH: isTV ? 180 : 96,
  // TV focus target minimum
  focusMin: isTV ? 80 : 44,
} as const;

// ─── Typography (Netflix uses SF Pro on iOS) ───
const fontScale = isTV ? 1.5 : 1;

export const T = {
  heroTitle: { fontSize: Math.round(32 * fontScale), fontWeight: '700' as const, color: C.text, letterSpacing: -0.3 },
  sectionTitle: { fontSize: Math.round(16 * fontScale), fontWeight: '600' as const, color: C.text },
  cardTitle: { fontSize: Math.round(12 * fontScale), fontWeight: '500' as const, color: C.text2 },
  body: { fontSize: Math.round(14 * fontScale), fontWeight: '400' as const, color: C.text, lineHeight: Math.round(20 * fontScale) },
  caption: { fontSize: Math.round(12 * fontScale), fontWeight: '400' as const, color: C.text2 },
  small: { fontSize: Math.round(11 * fontScale), fontWeight: '400' as const, color: C.text3 },
  button: { fontSize: Math.round(15 * fontScale), fontWeight: '600' as const },
  tabLabel: { fontSize: Math.round(10 * fontScale), fontWeight: '400' as const },
  pageTitle: { fontSize: Math.round(28 * fontScale), fontWeight: '700' as const, color: C.text },
  metadata: { fontSize: Math.round(12 * fontScale), fontWeight: '400' as const, color: C.text2 },
} as const;

// ─── TV Focus Styles ───
export const TVFocus = {
  scale: 1.08,
  borderWidth: 3,
  borderColor: C.focus,
  borderRadius: R.md,
} as const;
