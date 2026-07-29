import { getBearerToken, verifyAdminToken } from "../../src/server/auth.js";
import { getOptionalEnv, jsonResponse } from "../../src/server/config.js";
import { getResendContactSyncConfig } from "../../src/server/resend-contacts.js";
import { getFounderReservationConfig } from "../../src/server/stripe.js";
import { getWaitlistHealth } from "../../src/server/waitlist.js";

function configured(name: string) {
  return Boolean(getOptionalEnv(name));
}

export async function GET(request: Request) {
  if (!verifyAdminToken(getBearerToken(request))) {
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
  }

  const requiredEnv = {
    DATABASE_URL: configured("DATABASE_URL"),
    ADMIN_PASSWORD: configured("ADMIN_PASSWORD"),
    ADMIN_SESSION_SECRET: configured("ADMIN_SESSION_SECRET")
  };

  const notificationEnv = {
    RESEND_API_KEY: configured("RESEND_API_KEY"),
    NOTIFY_TO_EMAIL: configured("NOTIFY_TO_EMAIL"),
    NOTIFY_FROM_EMAIL: configured("NOTIFY_FROM_EMAIL")
  };

  let database:
    | Awaited<ReturnType<typeof getWaitlistHealth>>
    | {
        connected: false;
        table_ready: false;
        analytics_table_ready: false;
        reservations_table_ready: false;
        lead_count: null;
        reservation_count: null;
        error: string;
      };

  if (!requiredEnv.DATABASE_URL) {
    database = {
      connected: false,
      table_ready: false,
      analytics_table_ready: false,
      reservations_table_ready: false,
      lead_count: null,
      reservation_count: null,
      error: "DATABASE_URL is missing"
    };
  } else {
    try {
      database = await getWaitlistHealth();
    } catch (error) {
      database = {
        connected: false,
        table_ready: false,
        analytics_table_ready: false,
        reservations_table_ready: false,
        lead_count: null,
        reservation_count: null,
        error: error instanceof Error ? error.message : "Database check failed"
      };
    }
  }

  const reservations = getFounderReservationConfig();
  const contactSync = getResendContactSyncConfig();

  return jsonResponse({
    ok: true,
    environment: requiredEnv,
    database,
    notifications: {
      configured: Object.values(notificationEnv).every(Boolean),
      variables: notificationEnv
    },
    contact_sync: {
      configured: contactSync.configured,
      variables: contactSync.variables
    },
    reservations: {
      enabled: reservations.enabled,
      variables: {
        FOUNDER_RESERVATION_ENABLED: reservations.enabled_flag,
        STRIPE_SECRET_KEY: reservations.secret_key_ready,
        STRIPE_WEBHOOK_SECRET: reservations.webhook_ready,
        CRON_SECRET: configured("CRON_SECRET"),
        FOUNDER_RESERVATION_REFUND_AT: Boolean(reservations.refund_at)
      },
      refund_at: reservations.refund_at
    }
  });
}
