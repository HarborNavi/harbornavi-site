export const pilotApplicationDeadline = "2026-09-16T00:00:00-07:00";
export const pilotApplicationDeadlineLabel = "September 15, 2026 at 24:00 PDT";
export const pilotApplicationDeadlineShortLabel = "September 15, 2026";
export const pilotSpotCount = 10;
export const pilotOfferAdvertisingCopy = "Yours to keep plus $300.";
export const pilotRewardAdvertisingCopy = "Receive $300 after completing the agreed milestones.";
export const pilotDisclosureExample = "HarborNavi provided this device for our pilot. If we complete the agreed milestones, we may keep it, receive lifetime subscription-free access for it, and receive $300.";

export function arePilotApplicationsOpen(now = Date.now()) {
  return now < Date.parse(pilotApplicationDeadline);
}
