/**
 * Bayou colour roles, taken from the web app's src/app/theme.css so both
 * products read as one brand. Light-mode actions are evergreen (mint fills are
 * 1.4:1 on the mint-white canvas); dark mode uses mint actions (11.8:1).
 */
export const palette = {
  light: {
    canvas: "#F0FDFA",
    surface: "#FCFEFD",
    surfaceMuted: "#EAF3EF",
    surfaceRaised: "#FFFFFF",
    ink: "#102E29",
    secondary: "#34564A",
    muted: "#516E64",
    line: "#CBDED6",
    lineStrong: "#6A8A7C",
    accent: "#5EEAD4",
    accentInk: "#086858",
    accentSoft: "#D3F7EF",
    action: "#102E29",
    actionPressed: "#086858",
    onAction: "#F0FDFA",
    strandOpen: "#D8E8E1",
    strandHeld: "#1F8A78",
    strandGiven: "#102E29",
    success: "#176B43",
    successSurface: "#E5F4EA",
    warning: "#83450C",
    warningSurface: "#FFF2D8",
    error: "#A52D26",
    errorSurface: "#FCEBE8",
    scrim: "rgba(16, 46, 41, 0.32)",
    tabBar: "rgba(252, 254, 253, 0.94)",
    shadow: "#102E29",
  },
  dark: {
    canvas: "#0B1D19",
    surface: "#112B25",
    surfaceMuted: "#193B31",
    surfaceRaised: "#16332C",
    ink: "#E8F4EE",
    secondary: "#CCDFD5",
    muted: "#A5BFB2",
    line: "#345B4C",
    lineStrong: "#6E9783",
    accent: "#5EEAD4",
    accentInk: "#5EEAD4",
    accentSoft: "#163A30",
    action: "#5EEAD4",
    actionPressed: "#8DF0E0",
    onAction: "#102E29",
    strandOpen: "#24463C",
    strandHeld: "#3F9886",
    strandGiven: "#5EEAD4",
    success: "#83DCA6",
    successSurface: "#15372D",
    warning: "#F1C488",
    warningSurface: "#3B2D19",
    error: "#FFB4AC",
    errorSurface: "#43231F",
    scrim: "rgba(0, 0, 0, 0.5)",
    tabBar: "rgba(17, 43, 37, 0.94)",
    shadow: "#000000",
  },
} as const;

export type Colors = { [K in keyof typeof palette.light]: string };

export const space = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;

/** Figtree for the interface; Fraunces only for personal moments (a list's name, a gift without a photo). */
export const fonts = {
  regular: "Figtree_400Regular",
  medium: "Figtree_500Medium",
  semibold: "Figtree_600SemiBold",
  bold: "Figtree_700Bold",
  display: "Fraunces_600SemiBold",
  displayItalic: "Fraunces_400Regular_Italic",
} as const;

export const type = {
  largeTitle: { fontFamily: fonts.bold, fontSize: 32, lineHeight: 38, letterSpacing: -0.6 },
  title: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 30, letterSpacing: -0.4 },
  heading: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 23 },
  label: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 19 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  overline: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.4 },
  display: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36, letterSpacing: -0.3 },
  displaySmall: { fontFamily: fonts.display, fontSize: 21, lineHeight: 26 },
} as const;

/** One motion language: quick, decelerating, never bouncy on content. */
export const motion = {
  spring: { damping: 22, stiffness: 240, mass: 0.9 },
  press: { damping: 18, stiffness: 420 },
  stagger: 45,
  enter: 260,
} as const;

/** Minimum touch target, per platform accessibility guidance. */
export const hit = 44;
