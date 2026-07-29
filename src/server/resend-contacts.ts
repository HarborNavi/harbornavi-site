import { getOptionalEnv } from "./config.js";

const resendApiBase = "https://api.resend.com";
const productionTopicName = "HarborNavi Kickstarter Updates";
const previewTopicName = "HarborNavi Preview Kickstarter Updates";

export type WaitlistContactConsentScope =
  | "kickstarter_and_road_updates"
  | "kickstarter_updates"
  | "none";

interface ResendTopic {
  id: string;
  name: string;
  description?: string;
  default_subscription?: "opt_in" | "opt_out";
  visibility?: "public" | "private";
}

let cachedKickstarterTopic: ResendTopic | null = null;

export function getResendContactSyncConfig() {
  const apiKey = getOptionalEnv("RESEND_API_KEY");
  const kickstarterTopicId = getOptionalEnv("RESEND_KICKSTARTER_TOPIC_ID");
  const roadTopicId = getOptionalEnv("RESEND_ROAD_TOPIC_ID");
  const isProduction = getOptionalEnv("VERCEL_ENV") === "production";
  const kickstarterTopicName = getOptionalEnv("RESEND_KICKSTARTER_TOPIC_NAME") ||
    (isProduction ? productionTopicName : previewTopicName);

  return {
    configured: Boolean(apiKey),
    apiKey,
    kickstarterTopicId,
    kickstarterTopicName,
    roadTopicId,
    variables: {
      RESEND_API_KEY: Boolean(apiKey),
      RESEND_KICKSTARTER_TOPIC_ID: Boolean(kickstarterTopicId)
    }
  };
}

async function resendRequest(path: string, apiKey: string, init: RequestInit = {}) {
  return fetch(`${resendApiBase}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      ...(init.headers || {})
    },
    signal: AbortSignal.timeout(8000)
  });
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

function assertOptOutTopic(topic: ResendTopic) {
  if (topic.default_subscription && topic.default_subscription !== "opt_out") {
    throw new Error(`Resend topic ${topic.name} must use opt_out as its default subscription`);
  }
  return topic;
}

async function findKickstarterTopic(apiKey: string, topicId: string | undefined, topicName: string) {
  if (topicId) {
    const response = await resendRequest(`/topics/${encodeURIComponent(topicId)}`, apiKey, { method: "GET" });
    if (!response.ok) throw await providerError("Resend topic lookup failed", response);
    return assertOptOutTopic(await response.json() as ResendTopic);
  }

  const response = await resendRequest("/topics", apiKey, { method: "GET" });
  if (!response.ok) throw await providerError("Resend topic list failed", response);
  const body = await response.json() as { data?: ResendTopic[] };
  const topic = body.data?.find((candidate) => candidate.name === topicName) || null;
  return topic ? assertOptOutTopic(topic) : null;
}

export async function getKickstarterTopic(options: { createIfMissing?: boolean } = {}) {
  const config = getResendContactSyncConfig();
  if (!config.apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  if (cachedKickstarterTopic) return cachedKickstarterTopic;

  const existing = await findKickstarterTopic(
    config.apiKey,
    config.kickstarterTopicId,
    config.kickstarterTopicName
  );
  if (existing) {
    cachedKickstarterTopic = existing;
    return existing;
  }
  if (!options.createIfMissing) return null;

  const created = await resendRequest("/topics", config.apiKey, {
    method: "POST",
    body: JSON.stringify({
      name: config.kickstarterTopicName,
      description: "Confirmed HarborNavi Kickstarter pre-launch subscribers.",
      default_subscription: "opt_out"
    })
  });
  if (!created.ok) throw await providerError("Resend topic creation failed", created);
  const body = await created.json() as { id?: string; object?: string };
  if (!body.id) throw new Error("Resend topic creation did not return an ID");

  cachedKickstarterTopic = {
    id: body.id,
    name: config.kickstarterTopicName,
    description: "Confirmed HarborNavi Kickstarter pre-launch subscribers.",
    default_subscription: "opt_out"
  };
  return cachedKickstarterTopic;
}

export async function probeResendContactSync() {
  const config = getResendContactSyncConfig();
  if (!config.apiKey) {
    return {
      provider_ready: false,
      topic_ready: false,
      error: "RESEND_API_KEY is missing"
    };
  }

  try {
    const topic = await getKickstarterTopic({ createIfMissing: false });
    return {
      provider_ready: true,
      topic_ready: Boolean(topic),
      topic: topic ? {
        id: topic.id,
        name: topic.name,
        default_subscription: topic.default_subscription || null,
        visibility: topic.visibility || null
      } : null,
      error: topic ? null : `Topic not found: ${config.kickstarterTopicName}`
    };
  } catch (error) {
    return {
      provider_ready: false,
      topic_ready: false,
      error: error instanceof Error ? error.message : "Resend provider check failed"
    };
  }
}

export async function syncWaitlistContact(email: string, consentScope: WaitlistContactConsentScope) {
  if (consentScope === "none") {
    return { skipped: true as const, reason: "consent_scope_not_enabled" as const };
  }

  const config = getResendContactSyncConfig();
  const needsRoadTopic = consentScope === "kickstarter_and_road_updates";
  if (!config.apiKey || (needsRoadTopic && !config.roadTopicId)) {
    return { skipped: true as const, reason: "not_configured" as const };
  }

  const kickstarterTopic = await getKickstarterTopic({ createIfMissing: true });
  if (!kickstarterTopic) {
    throw new Error("Unable to resolve the Resend Kickstarter topic");
  }

  const encodedEmail = encodeURIComponent(email);
  const topicIds = needsRoadTopic && config.roadTopicId
    ? [kickstarterTopic.id, config.roadTopicId]
    : [kickstarterTopic.id];
  const topics = topicSubscriptions(topicIds);
  const existing = await resendRequest(`/contacts/${encodedEmail}`, config.apiKey, { method: "GET" });

  if (existing.status === 404) {
    const created = await resendRequest("/contacts", config.apiKey, {
      method: "POST",
      body: JSON.stringify({ email, unsubscribed: false, topics })
    });
    if (created.ok) {
      return { skipped: false as const, action: "created" as const, topic_id: kickstarterTopic.id };
    }
    if (created.status !== 409) {
      throw await providerError("Resend contact creation failed", created);
    }
  } else if (!existing.ok) {
    throw await providerError("Resend contact lookup failed", existing);
  }

  const subscribed = await resendRequest(`/contacts/${encodedEmail}`, config.apiKey, {
    method: "PATCH",
    body: JSON.stringify({ unsubscribed: false })
  });
  if (!subscribed.ok) {
    throw await providerError("Resend contact subscription update failed", subscribed);
  }

  const updated = await resendRequest(`/contacts/${encodedEmail}/topics`, config.apiKey, {
    method: "PATCH",
    body: JSON.stringify({ topics })
  });
  if (!updated.ok) {
    throw await providerError("Resend contact topic sync failed", updated);
  }

  return { skipped: false as const, action: "updated" as const, topic_id: kickstarterTopic.id };
}
