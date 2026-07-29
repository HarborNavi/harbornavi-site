import { jsonResponse } from "../src/server/config.js";
import {
  getOrCreateReservation,
  getReservationBySessionId,
  getReservationLead,
  setReservationCheckoutSession
} from "../src/server/reservations.js";
import {
  createFounderCheckoutSession,
  getFounderReservationConfig,
  retrieveCheckoutSession
} from "../src/server/stripe.js";
import { normalizeEmail } from "../src/server/waitlist.js";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("action") === "session") {
    const sessionId = url.searchParams.get("session_id")?.trim();
    if (!sessionId || sessionId.length > 255) {
      return jsonResponse({ error: "Missing checkout session" }, { status: 400 });
    }
    try {
      const reservation = await getReservationBySessionId(sessionId);
      if (!reservation) {
        return jsonResponse({ ok: true, status: "processing" });
      }
      return jsonResponse({
        ok: true,
        status: reservation.status,
        amount_cents: reservation.amount_cents,
        currency: reservation.currency
      });
    } catch (error) {
      console.error(error);
      return jsonResponse({ error: "Unable to check reservation" }, { status: 500 });
    }
  }

  const config = getFounderReservationConfig();
  return jsonResponse({
    ok: true,
    reservation: {
      enabled: config.enabled,
      amount_cents: config.amount_cents,
      currency: config.currency,
      founder_price: config.founder_price,
      kickstarter_price: config.kickstarter_price,
      expected_retail_price: config.expected_retail_price,
      founder_quantity: config.founder_quantity
    }
  });
}

export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, { status: 400 });
  }

  const config = getFounderReservationConfig();
  if (!config.enabled) {
    return jsonResponse({ error: "Founder reservations are not open yet" }, { status: 503 });
  }

  const email = normalizeEmail(payload.email);
  if (!email) {
    return jsonResponse({ error: "A valid email is required" }, { status: 400 });
  }

  try {
    const lead = await getReservationLead(email);
    if (!lead) {
      return jsonResponse({ error: "Join the launch list before reserving Founder access" }, { status: 404 });
    }
    if (!lead.price_intent || !["definitely", "probably"].includes(lead.price_intent)) {
      return jsonResponse({ error: "Complete the price question before reserving Founder access" }, { status: 403 });
    }

    const reservation = await getOrCreateReservation(lead.id);
    if (["paid", "refund_pending", "refunded"].includes(reservation.status)) {
      return jsonResponse({ ok: true, complete: true, status: reservation.status });
    }

    if (reservation.stripe_checkout_session_id && reservation.status === "checkout_started") {
      try {
        const existingSession = await retrieveCheckoutSession(reservation.stripe_checkout_session_id);
        if (existingSession.status === "open" && existingSession.url) {
          return jsonResponse({ ok: true, checkout_url: existingSession.url, resumed: true });
        }
        if (existingSession.status === "complete" && existingSession.payment_status === "paid") {
          return jsonResponse({ ok: true, complete: true, status: "processing" });
        }
      } catch (error) {
        console.error(error);
      }
    }

    const checkout = await createFounderCheckoutSession({
      reservationId: reservation.id,
      leadId: lead.id,
      email: lead.email,
      origin: new URL(request.url).origin
    });
    if (!checkout.url) {
      throw new Error("Stripe did not return a checkout URL");
    }
    await setReservationCheckoutSession(reservation.id, checkout.id);

    return jsonResponse({ ok: true, checkout_url: checkout.url, resumed: false });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Unable to start Founder reservation" }, { status: 500 });
  }
}
