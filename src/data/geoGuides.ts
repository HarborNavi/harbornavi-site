export interface GeoGuideSource {
  id: string;
  publisher: string;
  title: string;
  href: string;
  supports: string;
  external?: boolean;
}

export interface GeoGuideSection {
  id: string;
  eyebrow: string;
  title: string;
  paragraphs: readonly string[];
  points?: readonly string[];
  sourceIds: readonly string[];
}

export interface GeoGuide {
  route: string;
  metaTitle: string;
  description: string;
  label: string;
  title: string;
  lede: string;
  directAnswer: string;
  image: string;
  socialImage: string;
  imageAlt: string;
  reviewedIso: string;
  reviewedLabel: string;
  keyPoints: readonly { label: string; value: string }[];
  stages: readonly { label: string; title: string; body: string }[];
  sections: readonly GeoGuideSection[];
  faqs: readonly { question: string; answer: string; sourceIds: readonly string[] }[];
  sources: readonly GeoGuideSource[];
  related: readonly { label: string; href: string }[];
}

const reviewedIso = "2026-09-23";
const reviewedLabel = "September 23, 2026";

const sharedSources: Record<string, GeoGuideSource> = {
  facts: { id: "facts", publisher: "HarborNavi", title: "HarborNavi product facts", href: "/facts", supports: "Current product status, compatibility boundaries, local-first direction, and component-certification scope." },
  comparison: { id: "comparison", publisher: "HarborNavi", title: "Smart-home AI approach comparison", href: "/compare", supports: "A sourced comparison of HarborNavi with camera AI, cloud assistants, local automation stacks, and professional systems." },
  haPrivacy: { id: "ha-privacy", publisher: "Home Assistant", title: "Is my smart home data private with Home Assistant?", href: "https://www.home-assistant.io/faq/is-my-data-private/", supports: "Home Assistant's description of local hardware, local storage, and direct local-network communication.", external: true },
  haAi: { id: "ha-ai", publisher: "Home Assistant", title: "Building the AI-powered local smart home", href: "https://www.home-assistant.io/blog/2025/09/11/ai-in-home-assistant/", supports: "Home Assistant's description of local and cloud model choices, exposed entities, AI Tasks, and owner control.", external: true },
  haOnvif: { id: "ha-onvif", publisher: "Home Assistant", title: "ONVIF integration documentation", href: "https://www.home-assistant.io/integrations/onvif/", supports: "Integration requirements and device-specific limits for ONVIF camera connections.", external: true },
  onvif: { id: "onvif", publisher: "ONVIF", title: "ONVIF Profiles", href: "https://www.onvif.org/profiles/", supports: "Profile-based interoperability and the need to verify conformant devices and clients.", external: true },
  rtsp: { id: "rtsp", publisher: "RFC Editor / IETF", title: "RFC 7826: Real-Time Streaming Protocol Version 2.0", href: "https://www.rfc-editor.org/info/rfc7826/", supports: "The standards-track scope of RTSP for controlling real-time media delivery.", external: true },
  frigate: { id: "frigate", publisher: "Frigate", title: "Frigate documentation", href: "https://docs.frigate.video/", supports: "Official description of a local NVR with camera recording, object detection, and Home Assistant integration.", external: true }
};

export const localFirstHomeAiGuide: GeoGuide = {
  route: "/local-first-home-ai",
  metaTitle: "What Is Local-First Home AI? | HarborNavi Guide",
  description: "A sourced guide to local-first home AI: what stays in the home, where cloud services can fit, how cameras and devices connect, and which trade-offs matter.",
  label: "HarborNavi guide",
  title: "What is local-first home AI?",
  lede: "A practical architecture for useful household intelligence without making the cloud the default home for private context.",
  directAnswer: "Local-first home AI processes the core household context, permissions, and supported device workflows on hardware in the home. It may use optional cloud services for selected tasks, but those services are not the default owner of the home's full history or control path.",
  image: "/assets/home-v7-v8-trust-boundary-id.webp",
  socialImage: "/assets/home-v7-v8-trust-boundary-id.png",
  imageAlt: "A HarborNavi trust-boundary scene showing household context kept inside the home",
  reviewedIso,
  reviewedLabel,
  keyPoints: [
    { label: "Default data path", value: "Core context stays on hardware in the home" },
    { label: "Cloud role", value: "Optional, scoped, and authorized when needed" },
    { label: "Control model", value: "Permissions before sensitive actions" },
    { label: "Compatibility", value: "Verified paths, not universal device claims" }
  ],
  stages: [
    { label: "01", title: "Signals", body: "Selected cameras, sensors, devices, and requests provide bounded inputs." },
    { label: "02", title: "Local context", body: "The in-home system connects events over time and keeps household history near its source." },
    { label: "03", title: "Reviewable response", body: "The system can clarify, notify, wait, or coordinate an allowed action." }
  ],
  sections: [
    {
      id: "definition",
      eyebrow: "Definition",
      title: "Local-first describes the default boundary, not an absolute ban on networks.",
      paragraphs: [
        "A local-first system is designed so its essential home functions and private context can live on hardware the household controls. That is different from a cloud-only service whose primary intelligence, history, or control path depends on a vendor account and remote infrastructure.",
        "The term should not be used as a shortcut for perfect privacy. Remote access, notifications, third-party integrations, model downloads, backups, and optional cloud AI can still create external data flows. A credible product should name those flows instead of claiming that every future feature is fully local."
      ],
      points: ["State which functions work without the internet.", "Separate required cloud services from optional ones.", "Document what leaves the home and why.", "Avoid treating a component claim as a complete-system guarantee."],
      sourceIds: ["facts", "ha-privacy"]
    },
    {
      id: "architecture",
      eyebrow: "Architecture",
      title: "Useful home AI needs context, permissions, and an action boundary.",
      paragraphs: [
        "A model alone does not make a household system useful. The system also needs a device graph, event history, identity and permission rules, and a clear way to decide whether to answer, ask, notify, or act.",
        "HarborNavi's product direction is to connect selected home signals into local household context, then keep sensitive actions reviewable. It is not a promise to control every device, and it does not replace the need to secure the underlying network, accounts, cameras, and automation platform."
      ],
      sourceIds: ["facts", "ha-ai"]
    },
    {
      id: "connections",
      eyebrow: "Connections",
      title: "Interoperability is verified path by path.",
      paragraphs: [
        "Camera compatibility depends on protocols, profiles, codecs, credentials, event support, and network configuration. RTSP can provide a media-control path, while ONVIF profiles define sets of interoperable functions; neither label means that every feature on every camera will work.",
        "The same discipline applies to smart-home devices. A local controller can expose entities and actions, but the reliability and privacy of the whole workflow still depend on each integration and the services it uses."
      ],
      points: ["Verify the exact camera model and ONVIF profile.", "Check whether events and audio are exposed, not only video.", "Keep credentials and device permissions scoped.", "Test failure behavior when the network or an integration is unavailable."],
      sourceIds: ["ha-onvif", "onvif", "rtsp"]
    },
    {
      id: "tradeoffs",
      eyebrow: "Trade-offs",
      title: "Local-first shifts responsibility as well as control.",
      paragraphs: [
        "Keeping more work at home can reduce routine data exposure and cloud dependency, but it also makes hardware capacity, updates, backups, network quality, and recovery planning more visible to the owner or product maker.",
        "The right choice depends on the household. A camera appliance can be simpler for video-only needs, a cloud assistant can offer broader online services, a DIY stack can provide maximum flexibility, and a professional system can transfer design and maintenance to an integrator."
      ],
      sourceIds: ["comparison", "ha-ai"]
    }
  ],
  faqs: [
    { question: "Does local-first mean the system never connects to the internet?", answer: "No. Local-first means the essential private context and core workflows are designed to stay in the home by default. Updates, remote access, notifications, third-party integrations, and explicitly authorized model requests may still use external services.", sourceIds: ["ha-privacy", "facts"] },
    { question: "Is local AI automatically private and secure?", answer: "No. Local processing can reduce routine data transfer, but privacy and security still depend on credentials, software updates, network configuration, permissions, backups, integrations, and the exact data path of each feature.", sourceIds: ["facts"] },
    { question: "Can local-first home AI work with existing cameras?", answer: "Potentially, through verified paths such as selected RTSP or ONVIF devices. Compatibility must be checked by model, profile, codec, events, credentials, and network setup; protocol labels do not guarantee every feature.", sourceIds: ["ha-onvif", "onvif", "rtsp"] },
    { question: "Does HarborNavi already support every feature described here?", answer: "No. HarborNavi is in development. This guide explains the product direction and architectural boundaries; current status and planned integrations are maintained on the HarborNavi fact sheet.", sourceIds: ["facts"] }
  ],
  sources: [sharedSources.facts, sharedSources.comparison, sharedSources.haPrivacy, sharedSources.haAi, sharedSources.haOnvif, sharedSources.onvif, sharedSources.rtsp],
  related: [
    { label: "HarborNavi facts", href: "/facts" },
    { label: "Compare smart-home AI approaches", href: "/compare" },
    { label: "Home Assistant and local AI", href: "/home-assistant-local-ai" },
    { label: "Package detection", href: "/package" }
  ]
};

export const homeAssistantLocalAiGuide: GeoGuide = {
  route: "/home-assistant-local-ai",
  metaTitle: "Home Assistant and Local AI | Where HarborNavi Fits",
  description: "A sourced guide to Home Assistant, local AI, Frigate, and HarborNavi: what each layer does, where they overlap, and how planned integration boundaries work.",
  label: "Integration guide",
  title: "Home Assistant and local AI: where HarborNavi fits.",
  lede: "Home Assistant can remain the device and automation layer. HarborNavi is being designed to add household context, permissions, conversation, and reviewable plans.",
  directAnswer: "HarborNavi is not intended to replace Home Assistant. Home Assistant connects devices, entities, scenes, and automations; HarborNavi's planned role is to interpret selected household context across time and turn plain-language requests into bounded, reviewable workflows.",
  image: "/assets/home-v7-v8-hardware-id.webp",
  socialImage: "/assets/home-v7-v8-hardware-id.png",
  imageAlt: "HarborNavi local home hardware beside a screen showing connected household intelligence",
  reviewedIso,
  reviewedLabel,
  keyPoints: [
    { label: "Home Assistant", value: "Device graph, entities, scenes, and automations" },
    { label: "Frigate", value: "Local camera recording and object detection" },
    { label: "HarborNavi", value: "Planned household context and permission layer" },
    { label: "Integration status", value: "Selected paths in development" }
  ],
  stages: [
    { label: "01", title: "Home Assistant", body: "Exposes selected entities, scenes, automations, and device state." },
    { label: "02", title: "HarborNavi", body: "Connects approved signals with household history, requests, and permissions." },
    { label: "03", title: "Action", body: "Clarifies or proposes a bounded workflow before sensitive changes run." }
  ],
  sections: [
    {
      id: "home-assistant-role",
      eyebrow: "Platform role",
      title: "Home Assistant already provides the local device foundation.",
      paragraphs: [
        "Home Assistant runs on hardware in the home, stores its data locally, and can communicate directly with supported devices over the local network. Its core abstraction is the device and entity graph, with scenes, scripts, automations, dashboards, and integrations built around that state.",
        "That foundation is valuable precisely because it should remain independently useful. HarborNavi's planned integration should consume only selected entities and allowed actions rather than turn Home Assistant into a hidden dependency that owners cannot inspect."
      ],
      sourceIds: ["ha-privacy", "facts"]
    },
    {
      id: "ai-role",
      eyebrow: "AI role",
      title: "Home Assistant supports AI agents; the distinction is product scope.",
      paragraphs: [
        "Home Assistant can connect local or cloud language models and control the entities an owner exposes through its Assist and AI APIs. It also supports AI Tasks for work such as summarization and image analysis.",
        "HarborNavi is being designed as a consumer household-intelligence product around that broader local context: selected camera events, device state, permissions, conversation, timelines, and temporary plans. The distinction is not that Home Assistant lacks AI; it is that the products organize the experience around different jobs."
      ],
      sourceIds: ["ha-ai", "comparison", "facts"]
    },
    {
      id: "camera-layer",
      eyebrow: "Camera layer",
      title: "Frigate and ONVIF solve different parts of the camera path.",
      paragraphs: [
        "Frigate is a local NVR designed around real-time object detection and Home Assistant integration. ONVIF is an interoperability framework, while RTSP is a media-control protocol. A household may use one or more of these layers depending on its cameras and desired events.",
        "HarborNavi does not claim to replace every NVR or make every camera compatible. The planned starting point is selected RTSP and ONVIF paths, with support verified against real devices and network conditions."
      ],
      points: ["Keep recording and retention requirements explicit.", "Verify events, profiles, codecs, and credentials by model.", "Avoid duplicate camera connections when a restream can be used.", "Treat camera detection as one signal, not the whole household situation."],
      sourceIds: ["frigate", "ha-onvif", "facts"]
    },
    {
      id: "fit",
      eyebrow: "Fit",
      title: "Choose the layer according to the job you want done.",
      paragraphs: [
        "Use Home Assistant directly when you want to build and maintain the automations yourself. Add Frigate when local camera recording and detection are central. Consider HarborNavi's product direction when the missing layer is household context, plain-language clarification, memory over time, and permission-aware coordination.",
        "Because HarborNavi is still in development, households should evaluate it by supported integrations and tested workflows rather than assume compatibility from a logo or protocol name."
      ],
      sourceIds: ["comparison", "facts"]
    }
  ],
  faqs: [
    { question: "Does HarborNavi replace Home Assistant?", answer: "No. Home Assistant remains the device and automation layer. HarborNavi is intended to use selected Home Assistant entities, scenes, and automations while adding household context, permissions, conversation, and temporary plans.", sourceIds: ["facts", "ha-privacy"] },
    { question: "Does Home Assistant already support local AI?", answer: "Yes. Home Assistant documents support for local and cloud models, exposed entities, Assist APIs, and AI Tasks. HarborNavi's planned distinction is a product experience centered on cross-signal household context rather than a claim that Home Assistant lacks AI.", sourceIds: ["ha-ai"] },
    { question: "Does HarborNavi replace Frigate?", answer: "Not necessarily. Frigate is a local NVR and object-detection system. HarborNavi can treat selected camera events as one input to broader household context, while recording and detection may remain in the camera or NVR layer.", sourceIds: ["frigate", "facts"] },
    { question: "Will every Home Assistant integration work with HarborNavi?", answer: "No universal compatibility is claimed. Support depends on the entity, service, permissions, reliability, and the product's tested integration path. Planned support should be verified against the current compatibility list.", sourceIds: ["facts"] }
  ],
  sources: [sharedSources.facts, sharedSources.comparison, sharedSources.haPrivacy, sharedSources.haAi, sharedSources.haOnvif, sharedSources.frigate],
  related: [
    { label: "HarborNavi facts", href: "/facts" },
    { label: "What is local-first home AI?", href: "/local-first-home-ai" },
    { label: "Compare smart-home AI approaches", href: "/compare" },
    { label: "Pet camera highlights", href: "/pets" }
  ]
};
