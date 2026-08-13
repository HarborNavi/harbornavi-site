interface WaitlistMetricEnvironment {
  WAITLIST_PRIVATE_BASELINE?: string;
  WAITLIST_PRIVATE_BASELINE_STARTED_AT?: string;
}

export function resolvePrivateWaitlistConfig(environment: WaitlistMetricEnvironment = process.env) {
  const baselineValue = environment.WAITLIST_PRIVATE_BASELINE?.trim();
  const baseline = Number(baselineValue);
  if (!baselineValue || !/^\d+$/.test(baselineValue) || !Number.isSafeInteger(baseline)) {
    throw new Error("WAITLIST_PRIVATE_BASELINE must be a non-negative integer");
  }

  const startedAt = environment.WAITLIST_PRIVATE_BASELINE_STARTED_AT?.trim();
  if (!startedAt || !Number.isFinite(Date.parse(startedAt))) {
    throw new Error("WAITLIST_PRIVATE_BASELINE_STARTED_AT must be a valid ISO timestamp");
  }

  return { baseline, startedAt };
}

export function privateWaitlistPeople(baseline: number, newPeople: unknown) {
  const count = Number(newPeople);
  return baseline + (Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0);
}
