export const pilotApplicationDeadline = "2026-09-15T23:59:59-07:00";
export const pilotApplicationDeadlineLabel = "September 15, 2026 at 11:59 PM PT";
export const pilotApplicationDeadlineShortLabel = "September 15, 2026";
export const pilotSpotCount = 5;

export function arePilotApplicationsOpen(now = Date.now()) {
  return now < Date.parse(pilotApplicationDeadline);
}
