const blockedPropertyFragments = [
  "email",
  "password",
  "first_name",
  "last_name",
  "full_name",
  "name",
  "phone",
  "address",
  "street",
  "postal",
  "zip",
  "city",
  "metro",
  "region",
  "location",
  "token",
  "secret",
  "api_key",
  "apikey",
  "camera",
  "model",
  "device",
  "credential",
  "footage",
  "filming",
  "recording",
  "consent",
  "application",
  "answer",
  "form_data",
  "household_member",
  "child",
  "stripe",
  "payment"
];

export function sanitizeAnalyticsProperties(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const clean: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();
    if (blockedPropertyFragments.some((fragment) => normalizedKey.includes(fragment))) {
      continue;
    }
    if (typeof entry === "string") {
      clean[key] = entry.slice(0, 300);
    } else if (typeof entry === "number" || typeof entry === "boolean" || entry === null) {
      clean[key] = entry;
    }
  }
  return clean;
}
