export const pilotSurveyScoreVersion = "2026-09-09-v1";

export interface PilotSurveyInput {
  name: unknown;
  email: unknown;
  adult_confirmed: unknown;
  stable_wifi_confirmed: unknown;
  compatible_device_confirmed: unknown;
  pilot_commitment_confirmed: unknown;
  selection_acknowledged: unknown;
  on_camera_willingness: unknown;
  filming_ability: unknown;
  audience_level: unknown;
  story_sample: unknown;
  core_scenarios: unknown;
  household_context: unknown;
  device_categories: unknown;
  available_windows: unknown;
  scheduling_confidence: unknown;
  completion_commitment: unknown;
  past_participation_level: unknown;
  referral_source: unknown;
  accuracy_confirmed: unknown;
  review_contact_confirmed: unknown;
  disclosure_confirmed: unknown;
  no_marketing_acknowledged: unknown;
  route?: unknown;
  path?: unknown;
  referrer?: unknown;
  session_id?: unknown;
  visitor_id?: unknown;
  utm_source?: unknown;
  utm_medium?: unknown;
  utm_campaign?: unknown;
  utm_content?: unknown;
  utm_term?: unknown;
  metadata?: Record<string, string>;
}

const onCameraOptions = ["comfortable", "depends", "off_camera"] as const;
const filmingOptions = ["experienced", "phone", "none"] as const;
const audienceOptions = ["consistent", "limited", "none"] as const;
const coreScenarioOptions = ["security", "automation", "privacy", "family_memory", "none"] as const;
const householdContextOptions = [
  "deliveries_visitors",
  "pets",
  "multiple_users",
  "work_study_home",
  "often_away",
  "multiple_apps_brands",
  "prefer_not_to_say",
  "other"
] as const;
const deviceCategoryOptions = [
  "home_assistant",
  "rtsp_onvif_camera",
  "other_camera",
  "sensors",
  "smart_devices",
  "zigbee",
  "infrared",
  "nas_server",
  "other"
] as const;
const availableWindowOptions = [
  "weekday_morning",
  "weekday_afternoon",
  "weekday_evening",
  "weekend_morning",
  "weekend_afternoon",
  "weekend_evening",
  "flexible"
] as const;
const schedulingOptions = ["reliable", "coordinate", "unreliable"] as const;
const completionOptions = ["full", "adjustment", "uncertain"] as const;
const pastParticipationOptions = ["formal", "comparable", "none"] as const;
const referralOptions = [
  "search",
  "reddit",
  "facebook_instagram",
  "youtube",
  "tiktok",
  "kickstarter",
  "community_event",
  "friend_family",
  "other"
] as const;

type PilotSurveyApplication = ReturnType<typeof normalizePilotSurvey>;

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function email(value: unknown) {
  const normalized = text(value, 254).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : "";
}

function confirmed(value: unknown) {
  return value === true;
}

function oneOf<T extends readonly string[]>(value: unknown, options: T) {
  const normalized = text(value, 80);
  return options.includes(normalized as T[number]) ? normalized : "";
}

function manyOf<T extends readonly string[]>(value: unknown, options: T) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string" && options.includes(item as T[number])))];
}

function normalizePilotSurvey(input: PilotSurveyInput) {
  return {
    name: text(input.name, 120),
    email: email(input.email),
    adult_confirmed: confirmed(input.adult_confirmed),
    stable_wifi_confirmed: confirmed(input.stable_wifi_confirmed),
    compatible_device_confirmed: confirmed(input.compatible_device_confirmed),
    pilot_commitment_confirmed: confirmed(input.pilot_commitment_confirmed),
    selection_acknowledged: confirmed(input.selection_acknowledged),
    on_camera_willingness: oneOf(input.on_camera_willingness, onCameraOptions),
    filming_ability: oneOf(input.filming_ability, filmingOptions),
    audience_level: oneOf(input.audience_level, audienceOptions),
    story_sample: text(input.story_sample, 5000),
    core_scenarios: manyOf(input.core_scenarios, coreScenarioOptions),
    household_context: manyOf(input.household_context, householdContextOptions),
    device_categories: manyOf(input.device_categories, deviceCategoryOptions),
    available_windows: manyOf(input.available_windows, availableWindowOptions),
    scheduling_confidence: oneOf(input.scheduling_confidence, schedulingOptions),
    completion_commitment: oneOf(input.completion_commitment, completionOptions),
    past_participation_level: oneOf(input.past_participation_level, pastParticipationOptions),
    referral_source: oneOf(input.referral_source, referralOptions),
    accuracy_confirmed: confirmed(input.accuracy_confirmed),
    review_contact_confirmed: confirmed(input.review_contact_confirmed),
    disclosure_confirmed: confirmed(input.disclosure_confirmed),
    no_marketing_acknowledged: confirmed(input.no_marketing_acknowledged),
    route: text(input.route, 80),
    path: text(input.path, 300),
    referrer: text(input.referrer, 500),
    session_id: text(input.session_id, 120),
    visitor_id: text(input.visitor_id, 120),
    utm_source: text(input.utm_source, 120),
    utm_medium: text(input.utm_medium, 120),
    utm_campaign: text(input.utm_campaign, 160),
    utm_content: text(input.utm_content, 160),
    utm_term: text(input.utm_term, 160),
    metadata: input.metadata || {}
  };
}

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function scenarioCoverageScore(scenarios: string[]) {
  const count = scenarios.filter((scenario) => scenario !== "none").length;
  return [0, 6, 13, 20, 25][Math.min(count, 4)];
}

function deviceReadinessScore(devices: string[]) {
  const deviceSet = new Set(devices);
  const hasHomeAssistant = deviceSet.has("home_assistant");
  const hasLocalCamera = deviceSet.has("rtsp_onvif_camera");
  const hasOtherCamera = deviceSet.has("other_camera");
  const hasActionableDevice = ["sensors", "smart_devices", "zigbee", "infrared"].some((device) => deviceSet.has(device));
  const hasAdditionalDevice = devices.some((device) => !["home_assistant", "rtsp_onvif_camera", "other_camera", "other"].includes(device));

  if (hasHomeAssistant && hasLocalCamera && hasActionableDevice) return 20;
  if ((hasHomeAssistant || hasLocalCamera) && hasAdditionalDevice) return 16;
  if (hasHomeAssistant || hasLocalCamera) return 12;
  if (hasOtherCamera && hasAdditionalDevice) return 8;
  if (hasOtherCamera) return 6;
  return devices.length ? 4 : 0;
}

function scheduleScore(confidence: string, windows: string[]) {
  if (confidence === "unreliable") return 0;
  const concreteWindows = windows.filter((window) => window !== "flexible").length;
  return confidence === "reliable" && concreteWindows >= 2 ? 10 : 5;
}

function scoreBand(total: number) {
  if (total >= 80) return "priority";
  if (total >= 65) return "qualified";
  if (total >= 50) return "conditional";
  return "not_priority";
}

export function scorePilotSurvey(application: PilotSurveyApplication) {
  const contentScore =
    ({ comfortable: 10, depends: 5, off_camera: 0 }[application.on_camera_willingness] || 0) +
    ({ experienced: 10, phone: 6, none: 0 }[application.filming_ability] || 0) +
    ({ consistent: 10, limited: 5, none: 0 }[application.audience_level] || 0);
  const scenarioScore =
    scenarioCoverageScore(application.core_scenarios) + deviceReadinessScore(application.device_categories);
  const reliabilityScore =
    scheduleScore(application.scheduling_confidence, application.available_windows) +
    ({ full: 10, adjustment: 5, uncertain: 0 }[application.completion_commitment] || 0) +
    ({ formal: 5, comparable: 3, none: 0 }[application.past_participation_level] || 0);
  const totalScore = contentScore + scenarioScore + reliabilityScore;
  const band = scoreBand(totalScore);
  const concreteWindows = application.available_windows.filter((window) => window !== "flexible").length;
  const automaticSummary = [
    `Content: ${label(application.on_camera_willingness)}, ${label(application.filming_ability)} filming, ${label(application.audience_level)} audience. Story response provided for human review.`,
    `Fit: ${application.core_scenarios.filter((scenario) => scenario !== "none").map(label).join(", ") || "No core scenario"}; devices: ${application.device_categories.map(label).join(", ") || "none"}.`,
    `Reliability: ${label(application.scheduling_confidence)} scheduling with ${concreteWindows} stated window${concreteWindows === 1 ? "" : "s"}, ${label(application.completion_commitment)} completion, ${label(application.past_participation_level)} prior participation.`
  ].join("\n");

  return {
    content_score: contentScore,
    scenario_score: scenarioScore,
    reliability_score: reliabilityScore,
    total_score: totalScore,
    score_band: band,
    score_version: pilotSurveyScoreVersion,
    automatic_summary: automaticSummary
  };
}

export function validatePilotSurvey(input: PilotSurveyInput) {
  const application = normalizePilotSurvey(input);
  if (!application.name) return { error: "Name is required." } as const;
  if (!application.email) return { error: "A valid email is required." } as const;
  if (!application.adult_confirmed) return { error: "Please confirm that you are the adult responsible for this assessment." } as const;
  if (!application.stable_wifi_confirmed) return { error: "Stable home Wi-Fi is required for this pilot." } as const;
  if (!application.compatible_device_confirmed) return { error: "A camera or Home Assistant device is required for compatibility review." } as const;
  if (!application.pilot_commitment_confirmed) return { error: "Please confirm the two-week pilot commitment." } as const;
  if (!application.selection_acknowledged) return { error: "Please acknowledge that submitting does not guarantee selection." } as const;
  if (!application.on_camera_willingness) return { error: "Please select an on-camera preference." } as const;
  if (!application.filming_ability) return { error: "Please select a filming ability." } as const;
  if (!application.audience_level) return { error: "Please select a public content presence." } as const;
  if (!application.story_sample) return { error: "Please share a real household moment." } as const;
  if (!application.core_scenarios.length) return { error: "Please select at least one HarborNavi scenario." } as const;
  if (application.core_scenarios.includes("none") && application.core_scenarios.length > 1) {
    return { error: "Choose either a HarborNavi scenario or none of these." } as const;
  }
  if (application.household_context.includes("prefer_not_to_say") && application.household_context.length > 1) {
    return { error: "Choose either household situations or prefer not to say." } as const;
  }
  if (!application.device_categories.length) return { error: "Please select at least one device category." } as const;
  if (!application.available_windows.length) return { error: "Please select at least one availability window." } as const;
  if (!application.scheduling_confidence) return { error: "Please select your scheduling confidence." } as const;
  if (!application.completion_commitment) return { error: "Please select your milestone commitment." } as const;
  if (!application.past_participation_level) return { error: "Please select your past participation experience." } as const;
  if (!application.referral_source) return { error: "Please tell us how you heard about HarborNavi." } as const;
  if (!application.accuracy_confirmed || !application.review_contact_confirmed || !application.disclosure_confirmed || !application.no_marketing_acknowledged) {
    return { error: "Please complete all final confirmations." } as const;
  }
  return { application, score: scorePilotSurvey(application) } as const;
}
