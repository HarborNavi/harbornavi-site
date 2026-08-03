export const publicWaitlistBaseline = 509;
export const publicWaitlistBaselineStartedAt = "2026-08-03T09:08:53Z";

export function publicWaitlistPeople(newPeople: unknown) {
  const count = Number(newPeople);
  return publicWaitlistBaseline + (Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0);
}
