// Aldwych European Capital — design system tokens
// Navy + Gold brand identity, dark-first mobile banking UI

export const Colors = {
  // Primary brand
  navy: "#0d2440",
  navyLight: "#1a3358",
  navyDark: "#081a30",
  gold: "#c9a962",
  goldLight: "#d4ba7a",
  goldDark: "#b5944e",
  goldMuted: "rgba(201, 169, 98, 0.15)",

  // Backgrounds (dark theme)
  bg: "#0a0e1a",
  bgCard: "#111827",
  bgCardElevated: "#1a2235",
  bgSurface: "#0f1629",
  bgInput: "#1a2235",
  bgModal: "#111827",

  // Text
  textPrimary: "#f1f5f9",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
  textInverse: "#0d2440",

  // Semantic
  success: "#10b981",
  successBg: "rgba(16, 185, 129, 0.12)",
  error: "#ef4444",
  errorBg: "rgba(239, 68, 68, 0.12)",
  warning: "#f59e0b",
  warningBg: "rgba(245, 158, 11, 0.12)",
  info: "#3b82f6",
  infoBg: "rgba(59, 130, 246, 0.12)",

  // Borders & dividers
  border: "rgba(148, 163, 184, 0.12)",
  borderLight: "rgba(148, 163, 184, 0.06)",
  divider: "rgba(148, 163, 184, 0.08)",

  // Overlay
  overlay: "rgba(0, 0, 0, 0.6)",
  shimmer: "rgba(255, 255, 255, 0.03)",

  white: "#ffffff",
  black: "#000000",
  transparent: "transparent",
} as const;

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 40,
  section: 48,
} as const;

export const FontSize = {
  caption: 11,
  label: 12,
  body: 14,
  bodyLarge: 15,
  subtitle: 16,
  title: 18,
  heading: 22,
  display: 28,
  hero: 34,
} as const;

export const FontWeight = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
  heavy: "800" as const,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
} as const;

export const Shadow = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  gold: {
    shadowColor: "#c9a962",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;
