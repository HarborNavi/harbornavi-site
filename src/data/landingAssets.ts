export interface LandingAsset {
  key: LandingAssetKey;
  url: string;
  alt: string;
  width: number;
  height: number;
}

export const landingAssets = {
  homeHero: {
    key: "homeHero",
    url: "/assets/hero-home.png",
    alt: "Storyboard of a home dashboard with camera events, moments worth keeping, and smart-home action suggestions.",
    width: 1600,
    height: 900
  },
  packageHero: {
    key: "packageHero",
    url: "/assets/hero-package.png",
    alt: "Storyboard of a front porch camera view with a delivered package and an event timeline.",
    width: 1600,
    height: 900
  },
  petHero: {
    key: "petHero",
    url: "/assets/hero-pets.png",
    alt: "Storyboard of a pet moment captured by a home camera and organized into highlight clips.",
    width: 1600,
    height: 900
  }
} as const;

export type LandingAssetKey = keyof typeof landingAssets;
