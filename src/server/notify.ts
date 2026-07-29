import { createHash } from "node:crypto";

import { getOptionalEnv } from "./config.js";

interface NotifyLead {
  id?: string;
  email: string;
  route?: string;
  form_location?: string;
  path?: string;
  referrer?: string;
  utm_source?: string;
  utm_campaign?: string;
}

export async function sendLeadNotification(lead: NotifyLead) {
  const apiKey = getOptionalEnv("RESEND_API_KEY");
  const to = getOptionalEnv("NOTIFY_TO_EMAIL");
  const from = getOptionalEnv("NOTIFY_FROM_EMAIL");
  if (!apiKey || !to || !from) {
    return { skipped: true };
  }

  const text = [
    "New HarborNavi early access lead",
    "",
    `Email: ${lead.email}`,
    `Route: ${lead.route || ""}`,
    `Form: ${lead.form_location || ""}`,
    `Path: ${lead.path || ""}`,
    `UTM source: ${lead.utm_source || ""}`,
    `UTM campaign: ${lead.utm_campaign || ""}`,
    `Referrer: ${lead.referrer || ""}`
  ].join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "idempotency-key": `operator-lead/${lead.id || createHash("sha256").update(lead.email).digest("hex").slice(0, 32)}`
    },
    body: JSON.stringify({
      from,
      to,
      subject: `New HarborNavi lead: ${lead.email}`,
      text
    }),
    signal: AbortSignal.timeout(8000)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Resend notification failed: ${response.status} ${message}`);
  }

  return { skipped: false };
}
