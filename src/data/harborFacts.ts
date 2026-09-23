export interface HarborFactQuestion {
  id: string;
  question: string;
  answer: string;
  sourceIds: readonly string[];
}

export interface HarborFactSource {
  id: string;
  publisher: string;
  title: string;
  href: string;
  supports: string;
  external?: boolean;
}

export const factsLastReviewedIso = "2026-09-23";
export const factsLastReviewedLabel = "September 23, 2026";

export const harborFactQuestions: readonly HarborFactQuestion[] = [
  {
    id: "what-is-harbornavi",
    question: "What is HarborNavi?",
    answer: "HarborNavi is a local-first household AI product in development by Harbor Innovations. It is designed to connect selected camera events, device state, household permissions, and plain-language requests into useful context and reviewable actions.",
    sourceIds: ["product-overview", "about-harbor"]
  },
  {
    id: "availability",
    question: "Is HarborNavi available to buy now?",
    answer: "No. HarborNavi is not currently offered for public purchase on this site. The first Pilot Families program has ended, and the current public action is to join the waitlist for launch updates.",
    sourceIds: ["product-overview", "pilot-program"]
  },
  {
    id: "existing-cameras",
    question: "Does HarborNavi replace existing cameras?",
    answer: "No. HarborNavi is being designed to work with selected cameras and smart-home devices that a household already uses. A camera remains the video source; HarborNavi adds local context, summaries, timelines, and reviewable responses.",
    sourceIds: ["product-overview", "home-assistant-onvif"]
  },
  {
    id: "home-assistant",
    question: "Does HarborNavi replace Home Assistant?",
    answer: "No. Home Assistant remains the device and integration layer. HarborNavi is intended to add household context, plain-language interaction, permissions, and simpler temporary plans on top of selected Home Assistant entities, scenes, and automations.",
    sourceIds: ["product-overview", "home-assistant-local"]
  },
  {
    id: "local-processing",
    question: "Where is household data intended to be processed?",
    answer: "The product direction is to keep core household context, selected camera events, permissions, and device workflows on HarborNavi in the home. Optional external-model requests are intended to require authorization and redaction. This is a product design target, not a claim that every future integration will be fully local.",
    sourceIds: ["product-overview", "privacy"]
  },
  {
    id: "camera-compatibility",
    question: "Which camera connections are planned first?",
    answer: "The planned starting paths are selected RTSP and ONVIF cameras. Support depends on each device's protocols, profiles, codecs, credentials, and network setup; HarborNavi does not claim universal camera compatibility.",
    sourceIds: ["product-overview", "onvif-profiles", "rtsp-rfc"]
  },
  {
    id: "planned-integrations",
    question: "Are Zigbee and infrared integrations available now?",
    answer: "They are planned integrations, not current shipping promises. The present product direction starts with supported Home Assistant paths and selected camera paths, with Zigbee and infrared support planned for later compatibility work.",
    sourceIds: ["product-overview", "zigbee-standard"]
  },
  {
    id: "local-compute",
    question: "What local AI processor is planned?",
    answer: "The current hardware direction uses K3-class local compute. SpacemiT's K3 product brief states up to 60 TOPS for the processor family; that is a vendor component specification, not a measured HarborNavi performance result, and final hardware remains subject to validation.",
    sourceIds: ["product-overview", "spacemit-k3"]
  },
  {
    id: "security-certification",
    question: "Is HarborNavi itself security-certified?",
    answer: "HarborNavi is not presented as a certified complete product. Goodix states that its eSE family has SOGIS CC EAL6+ certification and its COS has SOGIS CC EAL5+ certification. Those certifications apply to the security components, not to HarborNavi as a whole.",
    sourceIds: ["goodix-ese"]
  },
  {
    id: "website-data",
    question: "Is website signup data part of the local home-data path?",
    answer: "No. Waitlist, campaign, and pilot application data are website operations and are separate from the planned local-first product data path. The Privacy page documents the current website data flows and deletion contact.",
    sourceIds: ["privacy"]
  }
];

export const harborFactSources: readonly HarborFactSource[] = [
  {
    id: "product-overview",
    publisher: "HarborNavi",
    title: "Product overview and current positioning",
    href: "/",
    supports: "Product definition, local-first direction, compatibility boundaries, and waitlist status."
  },
  {
    id: "about-harbor",
    publisher: "Harbor Innovations",
    title: "Company and product background",
    href: "/about-harbor",
    supports: "Company identity, product motivation, and local AI background."
  },
  {
    id: "privacy",
    publisher: "HarborNavi",
    title: "Website privacy and product-data boundary",
    href: "/privacy",
    supports: "Current website collection, campaign measurement, deletion contact, and separation from product data."
  },
  {
    id: "pilot-program",
    publisher: "HarborNavi",
    title: "Pilot Families program status",
    href: "/pilot-families",
    supports: "Pilot status, participation scope, and current waitlist route."
  },
  {
    id: "home-assistant-local",
    publisher: "Home Assistant",
    title: "Is my smart home data private with Home Assistant?",
    href: "https://www.home-assistant.io/faq/is-my-data-private/",
    supports: "Home Assistant's own description of local hardware, local storage, and direct local-network communication.",
    external: true
  },
  {
    id: "home-assistant-onvif",
    publisher: "Home Assistant",
    title: "ONVIF integration documentation",
    href: "https://www.home-assistant.io/integrations/onvif/",
    supports: "ONVIF Profile S integration requirements, RTSP transport options, profiles, events, and device-specific limits.",
    external: true
  },
  {
    id: "onvif-profiles",
    publisher: "ONVIF",
    title: "ONVIF Profiles",
    href: "https://www.onvif.org/profiles/",
    supports: "Profile-based interoperability and the requirement to verify conformant devices and clients.",
    external: true
  },
  {
    id: "rtsp-rfc",
    publisher: "RFC Editor / IETF",
    title: "RFC 7826: Real-Time Streaming Protocol Version 2.0",
    href: "https://www.rfc-editor.org/info/rfc7826/",
    supports: "The standards-track definition and scope of RTSP for controlling real-time media delivery.",
    external: true
  },
  {
    id: "zigbee-standard",
    publisher: "Connectivity Standards Alliance",
    title: "Zigbee standard overview",
    href: "https://csa-iot.org/all-solutions/zigbee/",
    supports: "Zigbee's standardized device model, interoperability goals, mesh topology, and certification boundary.",
    external: true
  },
  {
    id: "goodix-ese",
    publisher: "Goodix",
    title: "Goodix embedded Secure Element product overview",
    href: "https://www.goodix.com/en/product/security_products/ese",
    supports: "Vendor-stated eSE and COS certification levels and component capabilities.",
    external: true
  },
  {
    id: "spacemit-k3",
    publisher: "SpacemiT",
    title: "Key Stone K3 Series product brief",
    href: "https://cdn-resource.spacemit.com/file/chip/K3/K3_brief_en.pdf",
    supports: "Vendor-stated K3 processor architecture and up-to-60-TOPS AI compute specification.",
    external: true
  }
];

export const harborFactCitationUrls = harborFactSources.map((source) => source.href);
