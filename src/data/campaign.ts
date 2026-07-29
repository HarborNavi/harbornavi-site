export const campaignPhases = [
  "before_prelaunch",
  "prelaunch_live",
  "road_live",
  "replay"
] as const;

export type CampaignPhase = (typeof campaignPhases)[number];

function optionalPublicUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function campaignPhase(value: unknown): CampaignPhase {
  return typeof value === "string" && campaignPhases.includes(value as CampaignPhase)
    ? (value as CampaignPhase)
    : "before_prelaunch";
}

const roadHomesFormUrl = optionalPublicUrl(import.meta.env.PUBLIC_ROAD_HOMES_FORM_URL);
const roadHomesPrivacyReady = import.meta.env.PUBLIC_ROAD_HOMES_PRIVACY_READY === "true";

export const campaign = Object.freeze({
  name: "15 Homes Across America",
  hook: "Ask your home what happened.",
  roadHomesPath: "/15-homes",
  roadHomesThanksPath: "/15-homes/thanks",
  kickstarterPrelaunchDate: "2026-09-15",
  kickstarterPrelaunchDateLabel: "September 15, 2026",
  roadEventStart: "2026-11-12",
  roadEventEnd: "2026-12-05",
  roadEventDateLabel: "November 12–December 5, 2026",
  roadHomeScreeningDateLabel: "August 1–October 2026",
  recruitmentCorridor: [
    "New Haven",
    "Philadelphia",
    "Northern Virginia",
    "Nashville",
    "Memphis",
    "Oklahoma City",
    "Albuquerque",
    "Phoenix",
    "Los Angeles",
    "Bay Area"
  ],
  finalReportDate: "2026-12-12",
  finalReportDateLabel: "December 12, 2026",
  kickstarterLaunchDate: "2027-01-12",
  kickstarterLaunchDateLabel: "January 12, 2027",
  routeLabel: "New Haven → Los Angeles → Palo Alto",
  phase: campaignPhase(import.meta.env.PUBLIC_CAMPAIGN_PHASE),
  roadHomesFormUrlConfigured: Boolean(roadHomesFormUrl),
  roadHomesPrivacyReady,
  roadHomesFormUrl: roadHomesPrivacyReady ? roadHomesFormUrl : null,
  kickstarterPrelaunchUrl: optionalPublicUrl(import.meta.env.PUBLIC_KICKSTARTER_PRELAUNCH_URL),
  youtubeChannelUrl: optionalPublicUrl(import.meta.env.PUBLIC_YOUTUBE_CHANNEL_URL),
  youtubePlaylistUrl: optionalPublicUrl(import.meta.env.PUBLIC_YOUTUBE_PLAYLIST_URL)
});
