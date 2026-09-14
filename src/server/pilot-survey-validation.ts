export const pilotSurveyScoreVersion = "2026-09-14-v3";

export const pilotSurveyRubric = {
  scenario_match: { weight: 15, max: 2 },
  pain_frequency: { weight: 10, max: 3 },
  equipment: { weight: 10, max: 2 },
  camera_comfort: { weight: 5, max: 2 },
  filming: { weight: 10, max: 2 },
  content_presence: { weight: 5, max: 2 },
  story_quality: { weight: 10, max: 3 },
  availability: { weight: 10, max: 3 },
  scheduling_confidence: { weight: 10, max: 2 },
  milestones: { weight: 10, max: 2 },
  experience: { weight: 5, max: 2 }
} as const;

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
  scenario_frequency: unknown;
  household_context: unknown;
  device_categories: unknown;
  available_windows: unknown;
  scheduling_confidence: unknown;
  completion_commitment: unknown;
  visit_comfort: unknown;
  past_participation_level: unknown;
  anything_else: unknown;
  referral_source?: unknown;
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
const scenarioFrequencyKeys = [
  "deliveries_visitors",
  "pets",
  "multiple_users",
  "work_study_home",
  "often_away",
  "multiple_apps_brands",
  "other"
] as const;
const scenarioFrequencyOptions = ["rarely", "monthly", "weekly", "daily"] as const;
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
const visitComfortOptions = ["not_comfortable", "hesitant", "open", "happy"] as const;
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

const frequencyScoreMap = { rarely: 0, monthly: 1, weekly: 2, daily: 3 } as const;
const primaryFrequencyByScenario = {
  security: "deliveries_visitors",
  automation: "multiple_users",
  privacy: "multiple_apps_brands",
  family_memory: "pets"
} as const;

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

function normalizeScenarioFrequency(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  return Object.fromEntries(
    scenarioFrequencyKeys
      .map((key) => [key, oneOf(source[key], scenarioFrequencyOptions)] as const)
      .filter(([, answer]) => answer)
  );
}

function storyQualityEstimate(story: string) {
  const normalized = story.trim();
  if (!normalized) return 0;
  const specific = /(last|yesterday|this week|package|delivery|camera|sensor|door|alert|room|pet|app|notification)/i.test(normalized);
  const showable = /(show|record|film|compare|explain|demonstrate|notification)/i.test(normalized);
  const relevant = /(why|care|matter|useful|help|another household)/i.test(normalized);
  if (specific && showable && relevant) return 3;
  if (specific && showable) return 2;
  return normalized.length >= 40 ? 1 : 0;
}

function primaryFrequencyScore(application: { core_scenarios: string[]; scenario_frequency: Record<string, string> }) {
  const primaryScenario = application.core_scenarios[0] as keyof typeof primaryFrequencyByScenario | undefined;
  const frequencyKey = primaryScenario ? primaryFrequencyByScenario[primaryScenario] : undefined;
  const answer = frequencyKey ? application.scenario_frequency[frequencyKey] : undefined;
  if (answer && answer in frequencyScoreMap) return frequencyScoreMap[answer as keyof typeof frequencyScoreMap];
  return Math.max(...Object.values(application.scenario_frequency).map((value) => frequencyScoreMap[value as keyof typeof frequencyScoreMap] ?? 0), 0);
}

function scenarioMatchScore(scenarios: string[]) {
  const configured = (typeof process !== "undefined" ? process.env.PILOT_PRIORITY_SCENARIOS : "")
    ?.split(",")
    .map((scenario) => scenario.trim())
    .filter(Boolean) || [];
  if (configured.length) return Math.min(scenarios.filter((scenario) => configured.includes(scenario)).length, 2);
  return Math.min(scenarios.filter((scenario) => scenario !== "none").length, 2);
}

function roundScore(value: number) {
  return Math.round(value * 10) / 10;
}

function weightedScore(raw: number, max: number, weight: number) {
  return (raw / max) * weight;
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
    scenario_frequency: normalizeScenarioFrequency(input.scenario_frequency),
    household_context: manyOf(input.household_context, householdContextOptions),
    device_categories: manyOf(input.device_categories, deviceCategoryOptions),
    available_windows: manyOf(input.available_windows, availableWindowOptions),
    scheduling_confidence: oneOf(input.scheduling_confidence, schedulingOptions),
    completion_commitment: oneOf(input.completion_commitment, completionOptions),
    visit_comfort: oneOf(input.visit_comfort, visitComfortOptions),
    past_participation_level: oneOf(input.past_participation_level, pastParticipationOptions),
    anything_else: text(input.anything_else, 2000),
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

function equipmentScore(devices: string[]) {
  const deviceSet = new Set(devices);
  const hasHomeAssistant = deviceSet.has("home_assistant");
  const hasLocalCamera = deviceSet.has("rtsp_onvif_camera");
  if (hasHomeAssistant || hasLocalCamera) return 2;
  if (deviceSet.has("other_camera") || devices.length >= 2) return 1;
  return 0;
}

function availabilityScore(windows: string[]) {
  const count = Math.min(windows.length, 7);
  if (count <= 1) return 0;
  if (count <= 3) return 1;
  if (count <= 5) return 2;
  return 3;
}

function scoreBand(total: number) {
  if (total >= 80) return "priority";
  if (total >= 65) return "qualified";
  if (total >= 50) return "conditional";
  return "not_priority";
}

export function scorePilotSurvey(application: PilotSurveyApplication) {
  const itemScores = {
    scenario_match: scenarioMatchScore(application.core_scenarios),
    pain_frequency: primaryFrequencyScore(application),
    equipment: equipmentScore(application.device_categories),
    camera_comfort: ({ off_camera: 0, depends: 1, comfortable: 2 }[application.on_camera_willingness] || 0),
    filming: ({ none: 0, phone: 1, experienced: 2 }[application.filming_ability] || 0),
    content_presence: ({ none: 0, limited: 1, consistent: 2 }[application.audience_level] || 0),
    story_quality: storyQualityEstimate(application.story_sample),
    availability: availabilityScore(application.available_windows),
    scheduling_confidence: ({ unreliable: 0, coordinate: 1, reliable: 2 }[application.scheduling_confidence] || 0),
    milestones: ({ uncertain: 0, adjustment: 1, full: 2 }[application.completion_commitment] || 0),
    experience: ({ none: 0, comparable: 1, formal: 2 }[application.past_participation_level] || 0)
  };
  const contentWeighted =
    weightedScore(itemScores.camera_comfort, pilotSurveyRubric.camera_comfort.max, pilotSurveyRubric.camera_comfort.weight) +
    weightedScore(itemScores.filming, pilotSurveyRubric.filming.max, pilotSurveyRubric.filming.weight) +
    weightedScore(itemScores.content_presence, pilotSurveyRubric.content_presence.max, pilotSurveyRubric.content_presence.weight) +
    weightedScore(itemScores.story_quality, pilotSurveyRubric.story_quality.max, pilotSurveyRubric.story_quality.weight);
  const scenarioWeighted =
    weightedScore(itemScores.scenario_match, pilotSurveyRubric.scenario_match.max, pilotSurveyRubric.scenario_match.weight) +
    weightedScore(itemScores.pain_frequency, pilotSurveyRubric.pain_frequency.max, pilotSurveyRubric.pain_frequency.weight) +
    weightedScore(itemScores.equipment, pilotSurveyRubric.equipment.max, pilotSurveyRubric.equipment.weight);
  const reliabilityWeighted =
    weightedScore(itemScores.availability, pilotSurveyRubric.availability.max, pilotSurveyRubric.availability.weight) +
    weightedScore(itemScores.scheduling_confidence, pilotSurveyRubric.scheduling_confidence.max, pilotSurveyRubric.scheduling_confidence.weight) +
    weightedScore(itemScores.milestones, pilotSurveyRubric.milestones.max, pilotSurveyRubric.milestones.weight) +
    weightedScore(itemScores.experience, pilotSurveyRubric.experience.max, pilotSurveyRubric.experience.weight);
  const contentScore = roundScore(contentWeighted);
  const scenarioScore = roundScore(scenarioWeighted);
  const reliabilityScore = roundScore(reliabilityWeighted);
  const totalScore = roundScore(contentWeighted + scenarioWeighted + reliabilityWeighted);
  const band = scoreBand(totalScore);
  const concreteWindows = application.available_windows.filter((window) => window !== "flexible").length;
  const frequencySummary = scenarioFrequencyKeys
    .map((key) => `${label(key)}: ${label(application.scenario_frequency[key] || "not answered")}`)
    .join(", ");
  const automaticSummary = [
    `Content: ${contentScore}/30. Camera ${label(application.on_camera_willingness)}, ${label(application.filming_ability)} filming, ${label(application.audience_level)} audience. Story quality estimate ${itemScores.story_quality}/3; paired human review recommended.`,
    `Fit: ${scenarioScore}/35. ${application.core_scenarios.filter((scenario) => scenario !== "none").map(label).join(", ") || "No core scenario"}; devices: ${application.device_categories.map(label).join(", ") || "none"}. Frequency: ${frequencySummary}.`,
    `Reliability: ${reliabilityScore}/35. ${label(application.scheduling_confidence)} scheduling with ${concreteWindows} stated window${concreteWindows === 1 ? "" : "s"}, ${label(application.completion_commitment)} completion, ${label(application.past_participation_level)} prior participation. Visit setup: ${label(application.visit_comfort)}.`,
    `Item scores: ${Object.entries(itemScores).map(([key, value]) => `${label(key)} ${value}/${pilotSurveyRubric[key as keyof typeof pilotSurveyRubric].max}`).join(", ")}.`
  ].join("\n");

  return {
    content_score: contentScore,
    scenario_score: scenarioScore,
    reliability_score: reliabilityScore,
    total_score: totalScore,
    score_band: band,
    score_version: pilotSurveyScoreVersion,
    item_scores: itemScores,
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
  if (application.core_scenarios.length > 2) return { error: "Please select up to two HarborNavi scenarios." } as const;
  if (application.core_scenarios.includes("none") && application.core_scenarios.length > 1) {
    return { error: "Choose either a HarborNavi scenario or none of these." } as const;
  }
  if (application.core_scenarios.includes("none")) return { error: "This round is not the right match for this household." } as const;
  if (Object.keys(application.scenario_frequency).length !== scenarioFrequencyKeys.length) {
    return { error: "Please choose a frequency for each household situation." } as const;
  }
  if (application.household_context.includes("prefer_not_to_say") && application.household_context.length > 1) {
    return { error: "Choose either household situations or prefer not to say." } as const;
  }
  if (!application.device_categories.length) return { error: "Please select at least one device category." } as const;
  if (!application.available_windows.length) return { error: "Please select at least one availability window." } as const;
  if (!application.scheduling_confidence) return { error: "Please select your scheduling confidence." } as const;
  if (!application.completion_commitment) return { error: "Please select your milestone commitment." } as const;
  if (!application.visit_comfort) return { error: "Please select your home visit comfort." } as const;
  if (application.visit_comfort === "not_comfortable") return { error: "This round is not the right match for this household." } as const;
  if (!application.past_participation_level) return { error: "Please select your past participation experience." } as const;
  if (!application.accuracy_confirmed || !application.review_contact_confirmed || !application.disclosure_confirmed || !application.no_marketing_acknowledged) {
    return { error: "Please complete all final confirmations." } as const;
  }
  return { application, score: scorePilotSurvey(application) } as const;
}
