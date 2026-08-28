export interface SiteMediaPlacement {
  key: string;
  page: string;
  pagePath: string;
  label: string;
  description: string;
  defaultUrl: string;
  defaultAlt: string;
  recommendedSize: string;
  aspectRatio: string;
}

export const siteMediaPlacements: SiteMediaPlacement[] = [
  {
    key: "site-header-logo",
    page: "Site-wide branding",
    pagePath: "All V7 pages",
    label: "Header logo mark",
    description: "The HarborNavi symbol shown at the left side of every navigation bar and in the V7 footer.",
    defaultUrl: "/harbornavi-logo-mark.png",
    defaultAlt: "HarborNavi logo mark",
    recommendedSize: "600 x 300 px",
    aspectRatio: "2:1"
  },
  {
    key: "site-favicon",
    page: "Site-wide branding",
    pagePath: "Browser tab",
    label: "Browser tab icon",
    description: "The square icon shown in browser tabs and bookmarks.",
    defaultUrl: "/favicon.png",
    defaultAlt: "HarborNavi browser icon",
    recommendedSize: "512 x 512 px",
    aspectRatio: "1:1"
  },
  {
    key: "home-carousel-pilot",
    page: "Home V7 / V8",
    pagePath: "/home-v7 and /home-v8 - Top carousel, slide 1",
    label: "Banner 1 - Pilot Families campaign",
    description: "The first rotating banner that links to the Pilot Families application page.",
    defaultUrl: "/assets/home-v7-v8-pilot-families-id.webp",
    defaultAlt: "A family trying HarborNavi together during an early pilot experience.",
    recommendedSize: "1920 x 760 px",
    aspectRatio: "About 5:2"
  },
  {
    key: "home-carousel-memory",
    page: "Home V7 / V8",
    pagePath: "/home-v7 and /home-v8 - Top carousel, slide 2",
    label: "Banner 2 - Private home memory",
    description: "The second rotating banner about keeping family moments private and local.",
    defaultUrl: "/assets/home-v7-v8-memory-hero-id.webp",
    defaultAlt: "A family sharing a small moment at home while HarborNavi keeps the memory private.",
    recommendedSize: "1920 x 760 px",
    aspectRatio: "About 5:2"
  },
  {
    key: "home-carousel-movie",
    page: "Home V7 / V8",
    pagePath: "/home-v7 and /home-v8 - Top carousel, slide 3",
    label: "Banner 3 - Movie night",
    description: "The third rotating banner about coordinating a movie-night routine.",
    defaultUrl: "/assets/home-v7-v8-movie-night-id.webp",
    defaultAlt: "A movie night moment coordinated across supported home devices.",
    recommendedSize: "1920 x 760 px",
    aspectRatio: "About 5:2"
  },
  {
    key: "home-hero-family",
    page: "Home V7 / V8",
    pagePath: "/home-v7 and /home-v8 - Intro section",
    label: "Intro family image",
    description: "The large family image beside the opening HarborNavi introduction.",
    defaultUrl: "/assets/home-v7-v8-memory-hero-id.webp",
    defaultAlt: "A child sharing a drawing with family as HarborNavi keeps selected memories local.",
    recommendedSize: "1536 x 1024 px",
    aspectRatio: "3:2"
  },
  {
    key: "home-memory-moment",
    page: "Home V7 / V8",
    pagePath: "/home-v7#memory and /home-v8#intelligence - Primary story",
    label: "Family memory image",
    description: "The image showing a small family achievement becoming an easy-to-find memory.",
    defaultUrl: "/assets/home-v7-v8-family-moment-id.webp",
    defaultAlt: "A child's small achievement becoming an easy-to-find family memory.",
    recommendedSize: "1536 x 1024 px",
    aspectRatio: "3:2"
  },
  {
    key: "home-briefing",
    page: "Home V7 / V8",
    pagePath: "/home-v7#memory and /home-v8#intelligence - Home briefing",
    label: "Return-home briefing image",
    description: "The image beside the section about receiving a calm summary of the day.",
    defaultUrl: "/assets/home-v7-v8-homecoming-briefing-id.webp",
    defaultAlt: "A family member coming home with HarborNavi ready to share the short version of the day.",
    recommendedSize: "1536 x 1024 px",
    aspectRatio: "3:2"
  },
  {
    key: "home-package-response",
    page: "Home V7 / V8",
    pagePath: "/home-v7#how-it-works and /home-v8#how-it-works - Package response",
    label: "Package response image",
    description: "The package-removal example in the How it works section.",
    defaultUrl: "/assets/home-v4-package-response.webp",
    defaultAlt: "A package-removal event prompting an owner notification and supported porch response.",
    recommendedSize: "1536 x 1024 px",
    aspectRatio: "3:2"
  },
  {
    key: "home-movie-night",
    page: "Home V7 / V8",
    pagePath: "/home-v7#how-it-works and /home-v8#how-it-works - Movie night",
    label: "Movie-night workflow image",
    description: "The detailed movie-night example below the package-response story.",
    defaultUrl: "/assets/home-v7-v8-movie-night-id.webp",
    defaultAlt: "A movie-night request coordinating lighting, television, and climate devices.",
    recommendedSize: "1536 x 1024 px",
    aspectRatio: "3:2"
  },
  {
    key: "home-trust-boundary",
    page: "Home V7 / V8",
    pagePath: "/home-v7#how-it-works and /home-v8#how-it-works - Sensitive changes",
    label: "Trust and fingerprint image",
    description: "The image explaining local confirmation for sensitive household changes.",
    defaultUrl: "/assets/home-v7-v8-trust-boundary-id.webp",
    defaultAlt: "Local fingerprint confirmation for a sensitive household access change.",
    recommendedSize: "1536 x 1024 px",
    aspectRatio: "3:2"
  },
  {
    key: "home-hardware",
    page: "Home V7 / V8",
    pagePath: "/home-v7#hardware and /home-v8#hardware",
    label: "HarborNavi hardware image",
    description: "The primary product hardware image in the dedicated hardware section.",
    defaultUrl: "/assets/home-v7-v8-hardware-id.webp",
    defaultAlt: "HarborNavi local home hardware with a forged-carbon-fiber top, fingerprint control, front infrared window, and purple status light.",
    recommendedSize: "1536 x 1024 px",
    aspectRatio: "3:2"
  },
  {
    key: "pilot-hero",
    page: "Pilot Families",
    pagePath: "/pilot-families - Hero",
    label: "Pilot program hero image",
    description: "The full-width image behind the Pilot Families headline and application call to action.",
    defaultUrl: "/assets/home-v7-v8-pilot-families-id.webp",
    defaultAlt: "A family trying HarborNavi together during an early pilot experience.",
    recommendedSize: "1920 x 930 px",
    aspectRatio: "About 2:1"
  },
  {
    key: "about-hero",
    page: "About Harbor",
    pagePath: "/about-harbor - Hero",
    label: "About Harbor hero image",
    description: "The full-width image behind the Harbor Innovations introduction.",
    defaultUrl: "/assets/home-v7-v8-memory-hero-id.webp",
    defaultAlt: "A family sharing an everyday moment while HarborNavi keeps selected memories local.",
    recommendedSize: "1920 x 1080 px",
    aspectRatio: "16:9"
  },
  {
    key: "about-story-speaker-privacy",
    page: "About Harbor",
    pagePath: "/about-harbor#founding-story - Smart speaker privacy scenario",
    label: "Visitor asking the smart speaker",
    description: "The first founding-story image showing a visitor asking for the homeowner's schedule.",
    defaultUrl: "/assets/about-story-speaker-privacy-v1.jpg",
    defaultAlt: "An unfamiliar visitor asking a smart speaker about the homeowner's schedule while the home is empty.",
    recommendedSize: "1536 x 1024 px",
    aspectRatio: "3:2"
  },
  {
    key: "about-story-package-recorded",
    page: "About Harbor",
    pagePath: "/about-harbor#founding-story - Package camera scenario",
    label: "Package theft recorded without an alert",
    description: "The second founding-story image showing a camera recording package theft without a useful alert.",
    defaultUrl: "/assets/about-story-package-recorded-v1.jpg",
    defaultAlt: "A porch camera recording a stranger opening a delivered package without sending a useful alert.",
    recommendedSize: "1536 x 1024 px",
    aspectRatio: "3:2"
  },
  {
    key: "about-nexus",
    page: "About Harbor",
    pagePath: "/about-harbor - Project 01",
    label: "Nexus AI Workstation image",
    description: "The image used for the Nexus AI Workstation project story.",
    defaultUrl: "/assets/about-nexus-workstation-v1.jpg",
    defaultAlt: "The Nexus AI Workstation installed in a warm home workspace.",
    recommendedSize: "1600 x 900 px",
    aspectRatio: "16:9"
  },
  {
    key: "about-harbor-os",
    page: "About Harbor",
    pagePath: "/about-harbor - Project 02",
    label: "Harbor OS image",
    description: "The image used for the Harbor OS project story.",
    defaultUrl: "/assets/home-v7-v8-hardware-id.webp",
    defaultAlt: "HarborNavi hardware with a forged-carbon-fiber top running the local Harbor OS intelligence layer.",
    recommendedSize: "1536 x 1024 px",
    aspectRatio: "3:2"
  }
];

export const siteMediaPlacementKeys = siteMediaPlacements.map((placement) => placement.key);
