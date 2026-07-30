export interface PilotApplicationInput {
  name: unknown;
  email: unknown;
  zip_code: unknown;
  smart_devices: unknown;
  interest_reason: unknown;
  referral_source: unknown;
  metadata?: Record<string, string>;
}

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function email(value: unknown) {
  const normalized = text(value, 254).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : "";
}

export function validatePilotApplication(input: PilotApplicationInput) {
  const application = {
    name: text(input.name, 120),
    email: email(input.email),
    zip_code: text(input.zip_code, 10),
    smart_devices: text(input.smart_devices, 1200),
    interest_reason: text(input.interest_reason, 1200),
    referral_source: text(input.referral_source, 120),
    metadata: input.metadata || {}
  };
  if (!application.name) return { error: "Name is required." } as const;
  if (!application.email) return { error: "A valid email is required." } as const;
  if (!/^\d{5}(?:-\d{4})?$/.test(application.zip_code)) return { error: "Enter a valid ZIP Code." } as const;
  if (!application.smart_devices) return { error: "Tell us which smart devices you use." } as const;
  if (!application.interest_reason) return { error: "Tell us why you are interested." } as const;
  if (!application.referral_source) return { error: "Tell us how you heard about HarborNavi." } as const;
  return { application } as const;
}
