export const geoContentRoutes = [
  "facts",
  "compare",
  "local-first-home-ai",
  "home-assistant-local-ai",
  "package",
  "pets"
] as const;

const aiReferralMatchers = [
  { label: "ChatGPT", domains: ["chatgpt.com", "chat.openai.com"], sources: ["chatgpt", "openai"] },
  { label: "Perplexity", domains: ["perplexity.ai"], sources: ["perplexity"] },
  { label: "Gemini", domains: ["gemini.google.com"], sources: ["gemini", "google_ai"] },
  { label: "Microsoft Copilot", domains: ["copilot.microsoft.com"], sources: ["copilot", "microsoft_copilot"] },
  { label: "Claude", domains: ["claude.ai"], sources: ["claude", "anthropic"] },
  { label: "Poe", domains: ["poe.com"], sources: ["poe"] },
  { label: "You.com", domains: ["you.com"], sources: ["you.com", "youcom"] }
] as const;

function normalizedSource(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/[\s-]+/g, "_") : "";
}

function referrerHostname(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function classifyAiReferral(referrer: unknown, utmSource: unknown) {
  const hostname = referrerHostname(referrer);
  const source = normalizedSource(utmSource);

  for (const matcher of aiReferralMatchers) {
    if (matcher.domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) {
      return matcher.label;
    }
    if (matcher.sources.some((candidate) => candidate === source)) return matcher.label;
  }

  return null;
}
