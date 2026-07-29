import { sql } from "./db.js";

export interface ReservationLead {
  id: string;
  email: string;
  price_intent: string | null;
  founder_reservation_status: string;
}

export interface FounderReservation {
  id: string;
  lead_id: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_customer_id: string | null;
  stripe_refund_id: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  refunded_at: string | null;
}

const reservationColumns = `
  id,
  lead_id,
  stripe_checkout_session_id,
  stripe_payment_intent_id,
  stripe_customer_id,
  stripe_refund_id,
  amount_cents,
  currency,
  status,
  created_at,
  updated_at,
  paid_at,
  refunded_at
`;

export async function getReservationLead(email: string) {
  const db = sql();
  const rows = (await db`
    select id, email, price_intent, founder_reservation_status
    from waitlist_leads
    where email = ${email}
    limit 1
  `) as unknown as ReservationLead[];
  return rows[0] || null;
}

export async function getOrCreateReservation(leadId: string) {
  const db = sql();
  const rows = (await db.query(
    `
      insert into founder_reservations (lead_id)
      values ($1)
      on conflict (lead_id) do update set updated_at = now()
      returning ${reservationColumns}
    `,
    [leadId]
  )) as unknown as FounderReservation[];
  return rows[0];
}

export async function getReservationBySessionId(sessionId: string) {
  const db = sql();
  const rows = (await db.query(
    `select ${reservationColumns} from founder_reservations where stripe_checkout_session_id = $1 limit 1`,
    [sessionId]
  )) as unknown as FounderReservation[];
  return rows[0] || null;
}

export async function getReservationById(id: string) {
  const db = sql();
  const rows = (await db.query(
    `select ${reservationColumns} from founder_reservations where id = $1 limit 1`,
    [id]
  )) as unknown as FounderReservation[];
  return rows[0] || null;
}

export async function setReservationCheckoutSession(reservationId: string, sessionId: string) {
  const db = sql();
  const rows = (await db.query(
    `
      update founder_reservations
      set
        stripe_checkout_session_id = $2,
        status = case
          when status in ('paid', 'refund_pending', 'refunded') then status
          else 'checkout_started'
        end,
        updated_at = now()
      where id = $1
      returning ${reservationColumns}
    `,
    [reservationId, sessionId]
  )) as unknown as FounderReservation[];
  const reservation = rows[0];
  if (reservation) {
    await db`
      update waitlist_leads
      set founder_reservation_status = ${reservation.status}, updated_at = now()
      where id = ${reservation.lead_id}
    `;
  }
  return reservation;
}

export async function markReservationPaid(input: {
  reservationId: string;
  sessionId: string;
  paymentIntentId: string;
  customerId: string | null;
}) {
  const db = sql();
  const rows = (await db.query(
    `
      update founder_reservations
      set
        stripe_checkout_session_id = $2,
        stripe_payment_intent_id = $3,
        stripe_customer_id = $4,
        status = 'paid',
        paid_at = coalesce(paid_at, now()),
        updated_at = now()
      where id = $1
        and (
          stripe_payment_intent_id is null
          or stripe_payment_intent_id = $3
          or status not in ('paid', 'refund_pending', 'refunded')
        )
      returning ${reservationColumns}
    `,
    [input.reservationId, input.sessionId, input.paymentIntentId, input.customerId]
  )) as unknown as FounderReservation[];

  const reservation = rows[0] || (await getReservationById(input.reservationId));
  if (!reservation) {
    return { reservation: null, duplicate_payment_intent: false };
  }

  const duplicatePaymentIntent =
    reservation.stripe_payment_intent_id !== null &&
    reservation.stripe_payment_intent_id !== input.paymentIntentId &&
    ["paid", "refund_pending", "refunded"].includes(reservation.status);

  if (!duplicatePaymentIntent) {
    await db`
      update waitlist_leads
      set founder_reservation_status = 'paid', updated_at = now()
      where id = ${reservation.lead_id}
    `;
  }

  return { reservation, duplicate_payment_intent: duplicatePaymentIntent };
}

export async function markReservationExpired(sessionId: string) {
  const db = sql();
  const rows = (await db.query(
    `
      update founder_reservations
      set status = 'expired', updated_at = now()
      where stripe_checkout_session_id = $1 and status = 'checkout_started'
      returning ${reservationColumns}
    `,
    [sessionId]
  )) as unknown as FounderReservation[];
  const reservation = rows[0];
  if (reservation) {
    await db`
      update waitlist_leads
      set founder_reservation_status = 'expired', updated_at = now()
      where id = ${reservation.lead_id}
    `;
  }
  return reservation || null;
}

export async function listPaidReservationsForRefund(limit = 25) {
  const db = sql();
  const rows = (await db.query(
    `
      select ${reservationColumns}
      from founder_reservations
      where status = 'paid' and stripe_payment_intent_id is not null
      order by paid_at asc nulls last
      limit $1
    `,
    [limit]
  )) as unknown as FounderReservation[];
  return rows;
}

export async function claimReservationRefund(id: string) {
  const db = sql();
  const rows = (await db.query(
    `
      update founder_reservations
      set status = 'refund_pending', updated_at = now()
      where id = $1 and status = 'paid'
      returning ${reservationColumns}
    `,
    [id]
  )) as unknown as FounderReservation[];
  const reservation = rows[0];
  if (reservation) {
    await db`
      update waitlist_leads
      set founder_reservation_status = 'refund_pending', updated_at = now()
      where id = ${reservation.lead_id}
    `;
  }
  return reservation || null;
}

export async function releaseReservationRefund(id: string) {
  const db = sql();
  const rows = (await db.query(
    `
      update founder_reservations
      set status = 'paid', updated_at = now()
      where id = $1 and status = 'refund_pending'
      returning ${reservationColumns}
    `,
    [id]
  )) as unknown as FounderReservation[];
  const reservation = rows[0];
  if (reservation) {
    await db`
      update waitlist_leads
      set founder_reservation_status = 'paid', updated_at = now()
      where id = ${reservation.lead_id}
    `;
  }
  return reservation || null;
}

export async function markReservationRefunded(input: {
  paymentIntentId: string;
  refundId: string | null;
  status: "refund_pending" | "refunded";
}) {
  const db = sql();
  const rows = (await db.query(
    `
      update founder_reservations
      set
        stripe_refund_id = coalesce($2, stripe_refund_id),
        status = $3,
        refunded_at = case when $3 = 'refunded' then coalesce(refunded_at, now()) else refunded_at end,
        updated_at = now()
      where stripe_payment_intent_id = $1
      returning ${reservationColumns}
    `,
    [input.paymentIntentId, input.refundId, input.status]
  )) as unknown as FounderReservation[];
  const reservation = rows[0];
  if (reservation) {
    await db`
      update waitlist_leads
      set founder_reservation_status = ${input.status}, updated_at = now()
      where id = ${reservation.lead_id}
    `;
  }
  return reservation || null;
}
