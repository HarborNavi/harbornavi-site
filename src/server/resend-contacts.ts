import { getOptionalEnv } from "./config.js";

const resendApiBase = "https://api.resend.com";

export type WaitlistContactConsentScope =
  | "kickstarter_and_road_updates"
  | "kickstarter_updates"
  | "none";

export function getResendContactSyncConfig() {
  const apiKey = getOptionalEnv("RESEND_API_KEY");
  const kickstarterTopicId = getOptionalEnv("RESEND_KICKSTARTER_TOPIC_ID");
  const roadTopicId = getOptionalEnv("RESEND_ROAD_TOPIC_ID");

  return {
    configured: Boolean(apiKey && kickstarterTopicId && roadTopicId),
    apiKey,
    kickstarterTopicId,
    roadTopicId,
    variables: {
      RESEND_API_KEY: Boolean(apiKey),
      RESEND_KICKSTARTER_TOPIC_ID: Boolean(kickstarterTopicId),
      RESEND_ROAD_TOPIC_ID: Boolean(roadTopicId)
    }
  };
}

async function resendRequest(path: string, apiKey: string, init: RequestInit = {}) {
  const response = await fetch(`${resendApiBase}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      ...(init.headers || {})
    },
    signal: AbortSignal.timeout(6000)
  });
  return response;
}

function topicSubscriptions(topicIds: string[]) {
  return [...new Set(topicIds)].map((id) => ({
    id,
    subscription: "opt_in"
  }));
}

async function providerError(prefix: string, response: Response) {
  const detail = (await response.text()).slice(0, 500);
  return new Error(`${prefix}: ${response.status} ${detail}`);
}

export async function syncWaitlistContact(email: string, consentScope: WaitlistContactConsentScope) {
  const config = getResendContactSyncConfig();
  if (consentScope === "none") {
    return { skipped: true as const, reason: "consent_scope_not_enabled" as const };
  }

  const needsRoadTopic = consentScope === "kickstarter_and_road_updates";
  if (!config.apiKey || !config.kickstarterTopicId || (needsRoadTopic && !config.roadTopicId)) {
    return { skipped: true as const, reason: "not_configured" as const };
  }

  const encodedEmail = encodeURIComponent(email);
  const topicIds = needsRoadTopic && config.roadTopicId
    ? [config.kickstarterTopicId, config.roadTopicId]
    : [config.kickstarterTopicId];
  const topics = topicSubscriptions(topicIds);
  const existing = await resendRequest(`/contacts/${encodedEmail}`, config.apiKey, { method: "GET" });

  if (existing.status === 404) {
    const created = await resendRequest("/contacts", config.apiKey, {
      method: "POST",
      body: JSON.stringify({ email, unsubscribed: false, topics })
    });
    if (!created.ok) {
      throw await providerError("Resend contact creation failed", created);
    }
    return { skipped: false as const, action: "created" as const };
  }

  if (!existing.ok) {
    throw await providerError("Resend contact lookup failed", existing);
  }

  const updated = await resendRequest(`/contacts/${encodedEmail}/topics`, config.apiKey, {
    method: "PATCH",
    body: JSON.stringify({ topics })
  });
  if (!updated.ok) {
    throw await providerError("Resend contact topic sync failed", updated);
  }

  return { skipped: false as const, action: "updated" as const };
}
