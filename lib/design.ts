import { Dimensions, Platform } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Colors ───
export const C = {
  bg: '#0a0a0a',
  surface: '#141414',
  elevated: '#1c1c1e',
  card: '#1a1a1a',
  border: 'rgba(255,255,255,0.06)',
  text: '#FFFFFF',
  text2: 'rgba(255,255,255,0.55)',
  text3: 'rgba(255,255,255,0.25)',
  accent: '#E50914',
  accentDark: '#B20710',
  yellow: '#FFD60A',
  green: '#30D158',
  separator: 'rgba(255,255,255,0.04)',
} as const;

// ─── Spacing (8pt grid) ───
export const S = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  // Screen padding — ALWAYS use this for horizontal padding
  screen: 20,
} as const;

// ─── Radius ───
export const R = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 100,
} as const;

// ─── Layout ───
export const Layout = {
  screenW: SCREEN_W,
  screenH: SCREEN_H,
  // Safe area top padding (accounts for notch + status bar)
  safeTop: Platform.OS === 'ios' ? 60 : 44,
  // Header height
  headerH: 56,
  // Tab bar estimated height
  tabBarH: 85,
  // Content card sizes
  posterW: (SCREEN_W - S.screen * 2 - 10 * 2) / 3, // 3 columns
  posterH: ((SCREEN_W - S.screen * 2 - 10 * 2) / 3) * 1.5,
  // Carousel card
  carouselW: SCREEN_W * 0.36,
  carouselH: SCREEN_W * 0.36 * 1.5,
} as const;

// ─── Typography ───
export const T = {
  hero: { fontSize: 34, fontWeight: '800' as const, color: C.text, letterSpacing: -0.5 },
  h1: { fontSize: 28, fontWeight: '800' as const, color: C.text },
  h2: { fontSize: 20, fontWeight: '700' as const, color: C.text },
  h3: { fontSize: 17, fontWeight: '600' as const, color: C.text },
  body: { fontSize: 15, fontWeight: '400' as const, color: C.text2, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '500' as const, color: C.text3 },
  small: { fontSize: 11, fontWeight: '600' as const, color: C.text3 },
  badge: { fontSize: 10, fontWeight: '700' as const },
} as const;
