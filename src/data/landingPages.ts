export type DemoKey = "package" | "pet" | "unusual";
export type RouteKey = "home" | "package" | "pets";

export interface TimelineDemo {
  key: DemoKey;
  label: string;
  timeline: string[];
  cta: string;
}

export interface UseCase {
  title: string;
  body: string;
}

export interface LandingPageContent {
  route: RouteKey;
  path: string;
  metaTitle: string;
  metaDescription: string;
  heroImage: string;
  heroAlt: string;
  eyebrow: string;
  headline: string;
  body: string;
  supportLine: string;
  cta: string;
  defaultDemo: DemoKey;
  useCases: UseCase[];
}

export const demoOptions: Record<DemoKey, TimelineDemo> = {
  package: {
    key: "package",
    label: "A package disappears after delivery",
    timeline: [
      "10:14 AM - Package delivered",
      "10:37 AM - Motion near front door",
      "10:38 AM - Package no longer visible",
      "10:38 AM - Alert: Package may be missing"
    ],
    cta: "I want this for my front door"
  },
  pet: {
    key: "pet",
    label: "My pet does something funny",
    timeline: [
      "2:41 PM - Dog jumps onto the sofa",
      "2:41 PM - Playful movement detected",
      "2:42 PM - Highlight clip saved",
      "2:42 PM - Moment ready to share"
    ],
    cta: "I want this for my pet camera"
  },
  unusual: {
    key: "unusual",
    label: "Something unusual happens at home",
    timeline: [
      "8:12 PM - Motion in the driveway",
      "8:13 PM - Event summarized",
      "8:13 PM - Saved as a home timeline moment"
    ],
    cta: "Tell me when beta opens"
  }
};

export const faqItems = [
  {
    question: "Does HarborNavi replace my current camera?",
    answer:
      "No. HarborNavi is being designed for homes that already use cameras. The first beta will focus on turning selected camera footage into useful events, alerts, and saved moments."
  },
  {
    question: "Does HarborNavi upload all my video?",
    answer:
      "That is not the product direction. HarborNavi is being designed as a local-first home AI system focused on useful events, not default cloud video upload."
  },
  {
    question: "Can HarborNavi prevent package theft?",
    answer:
      "No product can guarantee that. HarborNavi is intended to help detect and summarize when a delivered package may have gone missing, so you can respond faster and avoid manually reviewing hours of footage."
  },
  {
    question: "Is this available now?",
    answer:
      "HarborNavi is preparing for early testing before the planned October 2026 launch window. Join the waitlist if you want to try the beta or follow progress."
  }
];

const packageUseCase: UseCase = {
  title: "Know when a package goes missing.",
  body:
    "HarborNavi can help detect when a delivered package disappears and create a useful alert from your home camera footage."
};

const petUseCase: UseCase = {
  title: "Save your pet's best moments.",
  body:
    "HarborNavi can find playful, funny, or unusual pet moments and save short clips worth keeping."
};

const usefulEventsUseCase: UseCase = {
  title: "Reduce camera noise.",
  body:
    "Choose the events that matter, then review alerts and clips without scrubbing through hours of routine footage."
};

export const pages: Record<RouteKey, LandingPageContent> = {
  home: {
    route: "home",
    path: "/home",
    metaTitle: "HarborNavi catches what matters at home",
    metaDescription:
      "Join the HarborNavi early access list for local-first home video AI that helps turn everyday camera footage into useful alerts and saved moments.",
    heroImage: "/assets/hero-home.png",
    heroAlt:
      "Storyboard of a home video dashboard with a package scene and a pet highlight scene.",
    eyebrow: "Prelaunch beta concept",
    headline: "HarborNavi catches what matters at home.",
    body:
      "From missing packages to pet highlights, HarborNavi turns everyday home video into useful alerts and moments worth saving.",
    supportLine:
      "Preparing for early testing before the October 2026 launch window.",
    cta: "Join early access",
    defaultDemo: "package",
    useCases: [packageUseCase, petUseCase]
  },
  package: {
    route: "package",
    path: "/package",
    metaTitle: "Know when a package goes missing",
    metaDescription:
      "Join the HarborNavi package alert beta list and help test local-first home video AI for front door package events.",
    heroImage: "/assets/hero-package.png",
    heroAlt:
      "Storyboard of a front porch camera view with a delivered package and an event timeline.",
    eyebrow: "Package alert beta",
    headline: "Know when a package goes missing.",
    body:
      "HarborNavi helps detect when a delivered package disappears, so you do not have to scrub through hours of home camera footage.",
    supportLine:
      "Most home cameras can record the moment. HarborNavi is designed to help turn that footage into a useful event.",
    cta: "Join the package alert beta",
    defaultDemo: "package",
    useCases: [packageUseCase, usefulEventsUseCase]
  },
  pets: {
    route: "pets",
    path: "/pets",
    metaTitle: "Save your pet's best moments automatically",
    metaDescription:
      "Join the HarborNavi pet highlights beta list and help test local-first home video AI for moments worth saving.",
    heroImage: "/assets/hero-pets.png",
    heroAlt:
      "Storyboard of a pet moment captured by a home camera and organized into highlight clips.",
    eyebrow: "Pet highlights beta",
    headline: "Save your pet's best moments automatically.",
    body:
      "HarborNavi helps find playful, funny, or unusual pet moments and turn them into short clips worth keeping.",
    supportLine:
      "Your camera already sees the moment. HarborNavi helps you keep the part you actually care about.",
    cta: "Join the pet highlights beta",
    defaultDemo: "pet",
    useCases: [petUseCase, usefulEventsUseCase]
  }
};
