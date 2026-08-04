// Base greens (primary/primaryLight/accent) are taken verbatim from the recovered bundle
// (decompiled Hermes bytecode, module #494) — kept as-is so the app still reads as
// unmistakably "WhatsApp Status Saver". Everything else here (gradients, shadow, gold)
// is new: layering depth and a restrained warm accent onto the flat original palette
// without changing the underlying brand colors themselves.

export const LIGHT = {
  primary: '#075E54',
  primaryLight: '#128C7E',
  accent: '#25D366',
  // Diagonal header/hero gradient — deep teal into the brand green, rather than a flat fill.
  headerGradient: ['#054A42', '#0C7A6A', '#128C7E'],
  // Warm gold used sparingly for premium touches (icon accents, dividers) — never for
  // status-meaning color (expiry badges keep their own red/orange/green semantics).
  gold: '#D4A24C',
  goldSoft: '#F5E6C8',
  background: '#F4F6F5',
  card: '#FFFFFF',
  cardAlt: '#F9FAF9',
  text: '#151A18',
  textSecondary: '#6B7570',
  border: '#E4E9E6',
  tabBg: '#FFFFFF',
  tabActive: '#128C7E',
  tabInactive: '#A6B0AC',
  downloadBtn: 'rgba(0,0,0,0.55)',
  white: '#FFFFFF',
  shadow: '#0B2E27',
};

export const DARK = {
  primary: '#075E54',
  primaryLight: '#128C7E',
  accent: '#25D366',
  headerGradient: ['#03231F', '#0B5A4F', '#0F7A69'],
  gold: '#E0B366',
  goldSoft: '#3A2F1C',
  background: '#0E1210',
  card: '#181D1B',
  cardAlt: '#1F2523',
  text: '#EEF2F0',
  textSecondary: '#8FA098',
  border: '#262E2B',
  tabBg: '#141917',
  tabActive: '#25D366',
  tabInactive: '#5C6863',
  downloadBtn: 'rgba(0,0,0,0.7)',
  white: '#FFFFFF',
  shadow: '#000000',
};

export const COLORS = LIGHT;

// Shared elevation presets so shadows are consistent across screens instead of each one
// hand-rolling slightly different shadowRadius/opacity values. `color` should be
// `colors.shadow` from the active theme (near-black in dark mode reads as a shadow;
// a very dark green in light mode reads as a soft tinted shadow rather than flat black).
export function elevation(color: string, level: 'sm' | 'md' | 'lg' = 'md') {
  const presets = {
    sm: { shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
    md: { shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
    lg: { shadowOpacity: 0.2, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  };
  return { shadowColor: color, ...presets[level] };
}
