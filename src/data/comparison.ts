export interface ComparisonProduct {
  key: "harbornavi" | "camera" | "cloud" | "local" | "professional";
  name: string;
  note: string;
  examples: string;
  bestFor: string;
  featured?: boolean;
}

export interface ComparisonSource {
  label: string;
  publisher: string;
  href: string;
  supports: string;
}

export const comparisonLastReviewedIso = "2026-09-23";
export const comparisonLastReviewedLabel = "September 23, 2026";

export const comparisonProducts: readonly ComparisonProduct[] = [
  {
    key: "harbornavi",
    name: "HarborNavi",
    note: "Private household intelligence",
    examples: "HarborNavi",
    bestFor: "Households that want local context across selected cameras, devices, permissions, and conversations.",
    featured: true
  },
  {
    key: "camera",
    name: "Camera AI",
    note: "Video events and security search",
    examples: "Reolink, Tapo, eufy",
    bestFor: "Households primarily focused on camera recording, detection, video search, and security alerts."
  },
  {
    key: "cloud",
    name: "Cloud home AI",
    note: "Assistant-led home services",
    examples: "Gemini for Home, Alexa+",
    bestFor: "Households that prioritize broad voice assistance, online services, and an established account ecosystem."
  },
  {
    key: "local",
    name: "Local automation stacks",
    note: "Owner-built control and local AI",
    examples: "Home Assistant, Frigate, Homey Pro",
    bestFor: "Owners who want broad control and are comfortable selecting hardware, integrations, models, and automations."
  },
  {
    key: "professional",
    name: "Professional whole-home",
    note: "Integrator-designed control",
    examples: "Josh.ai, Control4",
    bestFor: "Homes that want a professionally designed, installed, and maintained control system."
  }
];

export const comparisonRows: readonly (readonly string[])[] = [
  ["Built around", "Understanding home context, remembering what matters, and coordinating allowed actions", "Video and security events", "Conversation, summaries, and control inside an account ecosystem", "Devices, entities, rules, and owner-built automations", "Dealer-designed whole-home control"],
  ["Who pieces it together", "HarborNavi keeps the household context together locally", "The camera vendor's event history", "The vendor cloud and supported services", "The owner or integrator", "The dealer or integrator"],
  ["When the routine changes", "Clarify, wait, notify, or act from local household context", "Detect, search, or summarize video", "AI behavior inside supported services", "The owner adds conditions, helpers, and exceptions", "The dealer updates scenes and policies"],
  ["Context and follow-up", "Local household context across events, devices, and conversations", "Footage and event history", "Account and service memory", "Possible with owner-built components", "System state and configured scenes"],
  ["From understanding to action", "Conversation, clarification, permission, then coordinated action", "Alerts and vendor-specific responses", "Voice and actions inside supported ecosystems", "Broad actions through user-built automations", "Broad dealer-configured actions"],
  ["Setup and maintenance", "Designed for self-install with supported paths made clear", "Vendor app", "Consumer account and cloud setup", "DIY or self-managed stack", "Professional installation"],
  ["Data path and subscription", "Core local features without a required subscription", "Varies by vendor and model", "Advanced features and plans vary", "Local core is possible; add-ons vary", "Vendor, dealer, and service terms vary"]
];

export const comparisonSources: readonly ComparisonSource[] = [
  { label: "Reolink AI Box", publisher: "Reolink", href: "https://reolink.com/blog/reolink-new-products-at-ces/", supports: "Vendor description of local camera analysis, search, summaries, and Reolink ecosystem compatibility." },
  { label: "Tapo H500", publisher: "TP-Link", href: "https://www.tp-link.com/us/home-networking/smart-hub/tapo-h500/", supports: "Vendor description of the camera hub, local storage, AI features, and supported Tapo devices." },
  { label: "eufy HomeBase S380", publisher: "eufy", href: "https://www.eufy.com/products/t80301d1", supports: "Vendor description of local storage, on-device recognition, and eufy camera ecosystem features." },
  { label: "Gemini for Home", publisher: "Google", href: "https://blog.google/products-and-platforms/devices/google-nest/gemini-for-home/", supports: "Google's description of Gemini-based conversation, smart-home control, and household assistance." },
  { label: "Alexa+", publisher: "Amazon", href: "https://www.aboutamazon.com/what-we-do/devices-services/alexa-plus", supports: "Amazon's description of its generative-AI assistant, smart-home control, and connected services." },
  { label: "AI in Home Assistant", publisher: "Home Assistant", href: "https://www.home-assistant.io/blog/2025/09/11/ai-in-home-assistant/", supports: "Home Assistant's official description of local and cloud models, exposed entities, and owner control." },
  { label: "Frigate documentation", publisher: "Frigate", href: "https://docs.frigate.video/", supports: "Official documentation for a local NVR with camera recording and AI object detection." },
  { label: "Homey Pro", publisher: "Homey", href: "https://homey.app/en-us/homey-pro/", supports: "Vendor description of on-premise processing, device protocols, Flows, and optional cloud services." },
  { label: "Josh Core", publisher: "Josh.ai", href: "https://www.josh.ai/core/", supports: "Vendor description of local device control, edge voice processing, scale, and professional installation." },
  { label: "Control4 voice control", publisher: "Control4", href: "https://www.control4.com/solutions/voice-control", supports: "Vendor description of integrator-configured scenes, whole-home control, and voice-assistant integrations." }
];

export const comparisonFaqItems: readonly (readonly [string, string])[] = [
  ["What category is HarborNavi in?", "HarborNavi is being developed as local-first household intelligence. It is intended to connect selected camera events, device state, permissions, conversations, and home history rather than operate only as a camera recorder, voice assistant, or automation hub."],
  ["Does HarborNavi replace Home Assistant or Frigate?", "No. Home Assistant can remain the device and automation layer, while Frigate can remain a local camera NVR and detector. HarborNavi is intended to add household context, permissions, conversation, timelines, and reviewable cross-device responses."],
  ["When is a camera AI system the better fit?", "A camera-focused product may be the better fit when the main need is recording, object detection, video search, and security alerts within one camera ecosystem, without broader household context or device coordination."],
  ["When is a professional whole-home system the better fit?", "A professionally installed system may be the better fit for a large or complex property that needs an integrator to design, install, configure, and maintain whole-home control."],
  ["Does this comparison prove that one option is more private?", "No. Privacy depends on the specific model, configuration, enabled services, account terms, remote access, and data path. This page compares product approaches and links to first-party sources; it does not certify any complete system."],
  ["Is HarborNavi available to buy now?", "No. HarborNavi is still in development and is not currently offered for public purchase on this site. The current public action is to join the waitlist for launch updates."]
];

export const comparisonCitationUrls = comparisonSources.map((source) => source.href);
