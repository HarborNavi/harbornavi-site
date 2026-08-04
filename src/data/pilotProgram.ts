export const pilotApplicationDeadline = "2026-09-15T23:59:59-07:00";
export const pilotApplicationDeadlineLabel = "September 15, 2026 at 11:59 PM PT";
export const pilotApplicationDeadlineShortLabel = "September 15, 2026";
export const pilotSpotCount = 5;
export const pilotRewardAdvertisingCopy = "Earn up to $500 after completing the agreed milestones.";
export const pilotDisclosureExample = "HarborNavi provided this device for our pilot. If we complete the agreed milestones, we may keep it, receive lifetime subscription-free access for it, and earn up to $500.";

export function arePilotApplicationsOpen(now = Date.now()) {
  return now < Date.parse(pilotApplicationDeadline);
}
