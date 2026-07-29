import { jsonResponse } from "../../src/server/config.js";
import {
  markReservationExpired,
  markReservationPaid,
  markReservationRefunded
} from "../../src/server/reservations.js";
import { createStripeRefund, verifyStripeWebhook } from "../../src/server/stripe.js";

function text(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function metadata(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const event = verifyStripeWebhook(rawBody, request.headers.get("stripe-signature"));
  if (!event) {
    return jsonResponse({ error: "Invalid Stripe signature" }, { status: 400 });
  }

  try {
    const object = event.data.object;
    if (event.type === "checkout.session.completed") {
      const sessionId = text(object.id);
      const paymentIntentId = text(object.payment_intent);
      const paymentStatus = text(object.payment_status);
      const reservationId = text(metadata(object.metadata).reservation_id) || text(object.client_reference_id);
      if (sessionId && paymentIntentId && reservationId && paymentStatus === "paid") {
        const result = await markReservationPaid({
          reservationId,
          sessionId,
          paymentIntentId,
          customerId: text(object.customer)
        });
        if (result.duplicate_payment_intent) {
          await createStripeRefund(paymentIntentId);
        }
      }
    } else if (event.type === "checkout.session.expired") {
      const sessionId = text(object.id);
      if (sessionId) {
        await markReservationExpired(sessionId);
      }
    } else if (event.type === "charge.refunded") {
      const paymentIntentId = text(object.payment_intent);
      if (paymentIntentId) {
        await markReservationRefunded({ paymentIntentId, refundId: null, status: "refunded" });
      }
    } else if (event.type === "refund.updated") {
      const paymentIntentId = text(object.payment_intent);
      const refundStatus = text(object.status);
      if (paymentIntentId && refundStatus === "succeeded") {
        await markReservationRefunded({
          paymentIntentId,
          refundId: text(object.id),
          status: "refunded"
        });
      }
    }

    return jsonResponse({ received: true });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Webhook processing failed" }, { status: 500 });
  }
}
