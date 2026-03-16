import { Platform } from 'react-native';

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
} as const;

// ─── Spacing ───
export const S = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  screen: 16,             // Netflix uses 16pt screen margins
  rowGap: 8,              // Gap between cards in a row
  sectionGap: 20,         // Vertical gap between content rows
} as const;

// ─── Radius ───
export const R = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 100,
} as const;

// ─── Layout ───
export const Layout = {
  screenW: 0, // Set at runtime
  screenH: 0,
  safeTop: Platform.OS === 'ios' ? 56 : 44,
  tabBarH: 84,
  // Netflix card: ~3 visible + peek, 2:3 ratio
  cardW: 110,
  cardH: 165,
  // Continue watching: landscape 16:9
  thumbW: 170,
  thumbH: 96,
} as const;

// ─── Typography (Netflix uses SF Pro on iOS) ───
export const T = {
  heroTitle: { fontSize: 32, fontWeight: '700' as const, color: C.text, letterSpacing: -0.3 },
  sectionTitle: { fontSize: 16, fontWeight: '600' as const, color: C.text },
  cardTitle: { fontSize: 12, fontWeight: '500' as const, color: C.text2 },
  body: { fontSize: 14, fontWeight: '400' as const, color: C.text, lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '400' as const, color: C.text2 },
  small: { fontSize: 11, fontWeight: '400' as const, color: C.text3 },
  button: { fontSize: 15, fontWeight: '600' as const },
  tabLabel: { fontSize: 10, fontWeight: '400' as const },
  pageTitle: { fontSize: 28, fontWeight: '700' as const, color: C.text },
  metadata: { fontSize: 12, fontWeight: '400' as const, color: C.text2 },
} as const;
