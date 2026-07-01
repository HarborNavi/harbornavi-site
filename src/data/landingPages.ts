export type DemoKey = "package" | "pet" | "unusual";
export type RouteKey = "home" | "package" | "pets";

export interface TimelineDemo {
  key: DemoKey;
  label: string;
  timeline: string[];
  cta: string;
}

export interface UseCase {
  label?: string;
  title: string;
  body: string;
}

export interface ProofPoint {
  label: string;
  title: string;
  body: string;
}

export interface WorkflowStep {
  title: string;
  body: string;
}

export interface NarrativeStage {
  id: string;
  phrase: string;
  eyebrow: string;
  title: string;
  problem: string;
  product: string;
  image: string;
  imageAlt: string;
  signals: string[];
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
  proofPoints: ProofPoint[];
  workflowSteps: WorkflowStep[];
  narrativeStages?: NarrativeStage[];
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
      "2:42 PM - Highlight clip kept",
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
      "8:13 PM - Kept in your home timeline"
    ],
    cta: "Tell me when beta opens"
  }
};

export const faqItems = [
  {
    question: "Does HarborNavi replace my current camera?",
    answer:
      "No. HarborNavi is being designed for homes that already use cameras and smart-home devices. The first beta focuses on turning selected signals into useful events, alerts, moments worth keeping, and reviewable actions."
  },
  {
    question: "Does HarborNavi replace Home Assistant?",
    answer:
      "Home Assistant remains a strong integration layer. HarborNavi focuses on making selected HA, Zigbee, and IR workflows easier to create, review, approve, and explain in plain language."
  },
  {
    question: "Does HarborNavi upload all my video?",
    answer:
      "HarborNavi is being designed local-first. The useful workflow is selected events, alerts, and moments worth keeping, with raw camera video kept local by default."
  },
  {
    question: "Can HarborNavi stop a package from being taken?",
    answer:
      "No product can promise that. HarborNavi is intended to help detect and summarize when a delivered package may have gone missing, so you can respond faster and avoid manually reviewing hours of footage."
  },
  {
    question: "Is this available now?",
    answer:
      "HarborNavi is preparing for early access before the planned October 2026 launch window. Join the waitlist if you want beta updates or launch progress."
  }
];

const packageUseCase: UseCase = {
  label: "Know your space",
  title: "Know when a package goes missing.",
  body:
    "A front door camera records the clip. HarborNavi turns the delivery, nearby motion, and missing-box moment into one event you can review."
};

const petUseCase: UseCase = {
  label: "Keep your moments",
  title: "Keep your pet's best moments.",
  body:
    "Pet moments usually disappear into hours of routine footage. HarborNavi finds the short clips that feel worth keeping."
};

const usefulEventsUseCase: UseCase = {
  label: "Less camera noise",
  title: "Reduce camera noise.",
  body:
    "Choose the events that matter, then review alerts and clips without scrubbing through hours of routine footage."
};

const deviceActionUseCase: UseCase = {
  label: "Connect your devices",
  title: "Create home workflows in plain language.",
  body:
    "Say the scene in normal language. HarborNavi turns selected Home Assistant, Zigbee, or IR workflows into reviewable rules."
};

const homeProofPoints: ProofPoint[] = [
  {
    label: "Know your space",
    title: "Your home already has signals. They are scattered.",
    body:
      "Door cameras, pet cameras, sensors, Home Assistant states, Zigbee, IR, and device history all describe the same space. HarborNavi brings selected signals into one local timeline."
  },
  {
    label: "Keep your moments",
    title: "The good parts are usually buried in footage.",
    body:
      "A pet jump, a visitor, a package event, a small household change: these moments matter because they have context. HarborNavi keeps the useful part while routine footage stays in the background."
  },
  {
    label: "Connect your devices",
    title: "Smart devices still need easier workflows.",
    body:
      "Home automation should start from the scene you describe. HarborNavi turns that request into readable conditions, actions, exceptions, and review steps before it runs."
  }
];

const packageProofPoints: ProofPoint[] = [
  {
    label: "Front door context",
    title: "A package is an event with context.",
    body:
      "The flow looks for delivery, stillness, nearby motion, and whether the package remains visible."
  },
  {
    label: "Reviewable timeline",
    title: "See the useful sequence faster.",
    body:
      "The beta concept summarizes the event chain so you do not start with hours of footage."
  },
  {
    label: "Honest boundary",
    title: "Detection help, not recovery promises.",
    body:
      "HarborNavi is intended to help notice and summarize a possible missing-package event."
  }
];

const petProofPoints: ProofPoint[] = [
  {
    label: "Pet highlights",
    title: "Keep the parts your camera already saw.",
    body:
      "HarborNavi looks for playful, funny, or unusual pet moments and organizes them into short clips."
  },
  {
    label: "Home timeline",
    title: "Moments belong with household context.",
    body:
      "The same timeline can hold camera clips, event summaries, and device state changes."
  },
  {
    label: "Low-noise review",
    title: "Less scrolling through routine footage.",
    body:
      "The goal is to surface clips worth checking without turning every movement into a notification."
  }
];

const homeWorkflowSteps: WorkflowStep[] = [
  {
    title: "Connect selected sources.",
    body: "Start with existing cameras, then add Home Assistant states, Zigbee sensors, IR devices, or household screens."
  },
  {
    title: "Describe the scene.",
    body: "Say what matters at home: package changes, pet moments, unusual events, or a device workflow."
  },
  {
    title: "Review the result.",
    body: "Check the timeline, summary, rule conditions, exceptions, and actions before anything sensitive runs."
  },
  {
    title: "Keep the useful part.",
    body: "Get the alert, clip, or workflow record without treating every camera frame as equally important."
  }
];

const homeNarrativeStages: NarrativeStage[] = [
  {
    id: "know-space",
    phrase: "Know your space.",
    eyebrow: "01 / Space",
    title: "The home already knows a lot. The signals live in separate places.",
    problem:
      "A front door camera sees a delivery. A sensor knows the door opened. Home Assistant knows the porch light state. Today those facts usually stay in separate apps.",
    product:
      "HarborNavi brings selected camera events, sensor changes, and device state into one local timeline, so the space becomes easier to understand.",
    image: "/assets/hero-home.png",
    imageAlt:
      "Concept storyboard of a home timeline combining camera events, device state, and household context.",
    signals: ["Camera event", "Door sensor", "HA state", "Zigbee", "IR device", "Local timeline"]
  },
  {
    id: "keep-moments",
    phrase: "Keep your moments.",
    eyebrow: "02 / Moments",
    title: "The clips worth keeping usually disappear into routine footage.",
    problem:
      "A pet jump, a visitor, a package leaving the frame, a small household change: each one is short. The camera records it, then it gets buried.",
    product:
      "HarborNavi keeps the useful part with the context around it, so moments can be found later without replaying the day.",
    image: "/assets/hero-pets.png",
    imageAlt:
      "Concept storyboard of a pet highlight kept as a short household moment.",
    signals: ["Pet highlight", "Visitor moment", "Package change", "Short clip", "Context kept"]
  },
  {
    id: "connect-devices",
    phrase: "Connect your devices.",
    eyebrow: "03 / Devices",
    title: "Smart-home rules are still too manual.",
    problem:
      "People think in scenes: if the package is gone, remind me; when the pet is on the sofa for a while, keep a clip; movie mode should lower lights and quiet noisy alerts.",
    product:
      "HarborNavi turns plain language into readable conditions, actions, exceptions, and approval steps before anything sensitive runs.",
    image: "/assets/hero-home.png",
    imageAlt:
      "Concept storyboard of smart-home actions connected to a reviewable local workflow.",
    signals: ["Plain language", "Conditions", "Actions", "Exceptions", "Approval step"]
  }
];

const packageWorkflowSteps: WorkflowStep[] = [
  {
    title: "Watch the delivery window.",
    body: "Use selected front-door footage and event context to build a package timeline."
  },
  {
    title: "Summarize the change.",
    body: "HarborNavi highlights when a delivered package may no longer be visible."
  },
  {
    title: "Respond faster.",
    body: "Review the relevant moments first instead of starting from raw footage."
  }
];

const petWorkflowSteps: WorkflowStep[] = [
  {
    title: "Choose the pet camera.",
    body: "Start with the indoor camera that already sees the couch, crate, room, or play area."
  },
  {
    title: "Find moments worth keeping.",
    body: "HarborNavi looks for playful, funny, or unusual pet activity."
  },
  {
    title: "Review short highlights.",
    body: "Keep the clip and context without scrolling through routine hours."
  }
];

export const pages: Record<RouteKey, LandingPageContent> = {
  home: {
    route: "home",
    path: "/home",
    metaTitle: "Know your space. Keep your moments. Connect your devices.",
    metaDescription:
      "Join the HarborNavi early access list for package alerts, pet highlights, unusual-event summaries, home moments worth keeping, and plain-language smart-home workflows.",
    heroImage: "/assets/hero-home.png",
    heroAlt:
      "Storyboard of a home dashboard with camera events, moments worth keeping, and smart-home action suggestions.",
    eyebrow: "Private beta",
    headline: "Know your space. Keep your moments. Connect your devices.",
    body:
      "Your home already has cameras, sensors, device states, and routines. HarborNavi turns those scattered signals into a local timeline, moments worth keeping, and workflows you can review before they run.",
    supportLine:
      "Privacy is the baseline: HarborNavi is designed local-first, with cloud fallback only for authorized and redacted workflows.",
    cta: "Join early access",
    defaultDemo: "package",
    useCases: [packageUseCase, petUseCase, deviceActionUseCase],
    proofPoints: homeProofPoints,
    workflowSteps: homeWorkflowSteps,
    narrativeStages: homeNarrativeStages
  },
  package: {
    route: "package",
    path: "/package",
    metaTitle: "Know when a package goes missing",
    metaDescription:
      "Join the HarborNavi package alert beta list for local-first home video AI focused on front door package events.",
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
    useCases: [packageUseCase, usefulEventsUseCase],
    proofPoints: packageProofPoints,
    workflowSteps: packageWorkflowSteps
  },
  pets: {
    route: "pets",
    path: "/pets",
    metaTitle: "Keep your pet's best moments automatically",
    metaDescription:
      "Join the HarborNavi pet highlights beta list for local-first home video AI focused on moments worth keeping.",
    heroImage: "/assets/hero-pets.png",
    heroAlt:
      "Storyboard of a pet moment captured by a home camera and organized into highlight clips.",
    eyebrow: "Pet highlights beta",
    headline: "Keep your pet's best moments automatically.",
    body:
      "HarborNavi helps find playful, funny, or unusual pet moments and turn them into short clips worth keeping.",
    supportLine:
      "Your camera already sees the moment. HarborNavi helps you keep the part you actually care about.",
    cta: "Join the pet highlights beta",
    defaultDemo: "pet",
    useCases: [petUseCase, usefulEventsUseCase],
    proofPoints: petProofPoints,
    workflowSteps: petWorkflowSteps
  }
};
