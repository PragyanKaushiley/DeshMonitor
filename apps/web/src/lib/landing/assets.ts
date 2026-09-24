export type LandingAssetType = "image" | "font" | "data";

export interface LandingAsset {
  scene: string;
  type: LandingAssetType;
  src: string;
  critical: boolean;
}

// Declarative manifest — every image/data file the landing page loads, with
// which are required before the loader can complete (critical) vs. which
// stream in afterward (progressive). Keep asset paths out of components; add
// here.
export const landingAssets: LandingAsset[] = [
  { scene: "globe", type: "data", src: "/landing/globe/countries-110m.geojson", critical: true },
  { scene: "globe", type: "data", src: "/landing/globe/india-boundary.geojson", critical: true },
  { scene: "globe", type: "image", src: "/landing/globe/poster.webp", critical: false },
  { scene: "india", type: "image", src: "/landing/india/india-outline.svg", critical: false },
];

export const criticalAssets = landingAssets.filter((asset) => asset.critical);
export const progressiveAssets = landingAssets.filter((asset) => !asset.critical);
