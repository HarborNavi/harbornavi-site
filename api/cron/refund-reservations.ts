import { getOptionalEnv, jsonResponse } from "../../src/server/config.js";
import {
  claimReservationRefund,
  listPaidReservationsForRefund,
  markReservationRefunded,
  releaseReservationRefund
} from "../../src/server/reservations.js";
import { createStripeRefund, getFounderReservationConfig } from "../../src/server/stripe.js";

export async function GET(request: Request) {
  const cronSecret = getOptionalEnv("CRON_SECRET");
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
  }

  const config = getFounderReservationConfig();
  if (!config.secret_key_ready) {
    return jsonResponse({ error: "Stripe is not configured" }, { status: 503 });
  }
  if (!config.refund_at) {
    return jsonResponse({ ok: true, skipped: true, reason: "Refund date is not configured" });
  }

  const refundAt = new Date(config.refund_at);
  if (!Number.isFinite(refundAt.getTime())) {
    return jsonResponse({ error: "Invalid FOUNDER_RESERVATION_REFUND_AT" }, { status: 500 });
  }
  if (Date.now() < refundAt.getTime()) {
    return jsonResponse({ ok: true, skipped: true, refund_at: refundAt.toISOString() });
  }

  const candidates = await listPaidReservationsForRefund();
  const results: Array<{ id: string; status: string }> = [];
  for (const candidate of candidates) {
    const claimed = await claimReservationRefund(candidate.id);
    if (!claimed?.stripe_payment_intent_id) continue;
    try {
      const refund = await createStripeRefund(claimed.stripe_payment_intent_id);
      const status = refund.status === "succeeded" ? "refunded" : "refund_pending";
      await markReservationRefunded({
        paymentIntentId: claimed.stripe_payment_intent_id,
        refundId: refund.id,
        status
      });
      results.push({ id: candidate.id, status });
    } catch (error) {
      console.error(error);
      await releaseReservationRefund(candidate.id);
      results.push({ id: candidate.id, status: "error" });
    }
  }

  return jsonResponse({ ok: true, processed: results.length, results });
}
