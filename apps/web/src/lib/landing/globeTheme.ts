// Three.js materials read plain color values, not CSS variables — this is
// the bridge between next-themes' resolved theme and the globe's palette.
// Colors are applied in place (material.color.set(...)) on theme change,
// never by remounting the scene.
export interface GlobeThemeColors {
  background: string;
  wireframe: string;
  graticule: string;
  atmosphere: string;
  accent: string;
}

const DARK: GlobeThemeColors = {
  background: "#020617",
  wireframe: "#2dd4bf",
  graticule: "#134e4a",
  atmosphere: "#2dd4bf",
  accent: "#5eead4",
};

const LIGHT: GlobeThemeColors = {
  background: "#f8fafc",
  wireframe: "#0f766e",
  graticule: "#99f6e4",
  atmosphere: "#0d9488",
  accent: "#0f766e",
};

export function getGlobeTheme(resolvedTheme: string | undefined): GlobeThemeColors {
  return resolvedTheme === "light" ? LIGHT : DARK;
}
