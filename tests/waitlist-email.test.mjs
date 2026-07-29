import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && specifier.endsWith(".js")) {
      try {
        return nextResolve(`${specifier.slice(0, -3)}.ts`, context);
      } catch {}
    }
    return nextResolve(specifier, context);
  }
});

const {
  createWaitlistConfirmationToken,
  sendWaitlistConfirmation,
  verifyWaitlistConfirmationToken,
  waitlistConfirmationBaseUrl
} = await import("../src/server/waitlist-email.ts");

const secret = "0123456789abcdef0123456789abcdef";
const requestedAt = "2026-07-15T00:00:00.000Z";

async function withEnvironment(values, callback) {
  const previous = new Map();
  for (const [name, value] of Object.entries(values)) {
    previous.set(name, process.env[name]);
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }

  try {
    return await callback();
  } finally {
    for (const [name, value] of previous) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

test("confirmation tokens verify before expiry and reject tampering or expiry", () => {
  const token = createWaitlistConfirmationToken({
    email: "person@example.com",
    version: "home_v6_2026_07",
    requested_at: requestedAt
  }, secret);

  assert.deepEqual(verifyWaitlistConfirmationToken(token, secret, new Date("2026-07-21T23:59:59.000Z")), {
    email: "person@example.com",
    version: "home_v6_2026_07",
    requested_at: requestedAt,
    exp: 1784678400
  });
  const replacement = token.endsWith("a") ? "b" : "a";
  assert.equal(verifyWaitlistConfirmationToken(`${token.slice(0, -1)}${replacement}`, secret), null);
  assert.equal(verifyWaitlistConfirmationToken(token, secret, new Date("2026-07-22T00:00:01.000Z")), null);
});

test("confirmation base URL accepts owned and local hosts and rejects arbitrary hosts", async () => {
  assert.equal(waitlistConfirmationBaseUrl("https://harbornavi.com/api/waitlist"), "https://harbornavi.com");
  assert.equal(waitlistConfirmationBaseUrl("https://www.harbornavi.com/api/waitlist"), "https://www.harbornavi.com");
  assert.equal(waitlistConfirmationBaseUrl("http://127.0.0.1:4321/api/waitlist"), "http://127.0.0.1:4321");
  assert.equal(waitlistConfirmationBaseUrl("https://harbornavi-preview.vercel.app/api/waitlist"), "https://harbornavi-preview.vercel.app");

  await withEnvironment({ WAITLIST_PUBLIC_ORIGIN: "https://preview.harbornavi.example" }, () => {
    assert.equal(
      waitlistConfirmationBaseUrl("https://attacker.example/api/waitlist"),
      "https://preview.harbornavi.example"
    );
  });
});

test("subscriber confirmation sends the signed link with a stable idempotency key", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ id: "email_123" }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };

  try {
    await withEnvironment({
      RESEND_API_KEY: "re_test_key",
      WAITLIST_CONFIRMATION_FROM_EMAIL: "HarborNavi <launch@harbornavi.com>",
      NOTIFY_FROM_EMAIL: undefined,
      NOTIFY_TO_EMAIL: "team@harbornavi.com",
      WAITLIST_CONFIRMATION_SECRET: secret
    }, async () => {
      const input = {
        leadId: "lead-123",
        email: "person@example.com",
        consentVersion: "home_v6_2026_07",
        requestedAt,
        baseUrl: "https://harbornavi.com"
      };
      assert.deepEqual(await sendWaitlistConfirmation(input), { skipped: false, id: "email_123" });
      assert.deepEqual(await sendWaitlistConfirmation(input), { skipped: false, id: "email_123" });
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, "https://api.resend.com/emails");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.headers.authorization, "Bearer re_test_key");
  assert.match(calls[0].init.headers["idempotency-key"], /^waitlist-confirmation\/lead-123\/[a-f0-9]{24}\/[a-f0-9]{16}$/);
  assert.equal(calls[1].init.headers["idempotency-key"], calls[0].init.headers["idempotency-key"]);

  const payload = JSON.parse(calls[0].init.body);
  assert.equal(payload.from, "HarborNavi <launch@harbornavi.com>");
  assert.equal(payload.to, "person@example.com");
  assert.equal(payload.reply_to, "team@harbornavi.com");
  assert.equal(payload.subject, "Confirm your HarborNavi launch-list email");
  assert.match(payload.text, /https:\/\/harbornavi\.com\/api\/waitlist\/confirm\?token=/);
  assert.match(payload.html, /Confirm my email/);
  assert.deepEqual(payload.tags, [
    { name: "message_type", value: "waitlist_confirmation" },
    { name: "consent_version", value: "home_v6_2026_07" }
  ]);
});

test("subscriber confirmation skips delivery when required configuration is missing", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    throw new Error("fetch should not be called");
  };

  try {
    await withEnvironment({
      RESEND_API_KEY: undefined,
      WAITLIST_CONFIRMATION_FROM_EMAIL: undefined,
      NOTIFY_FROM_EMAIL: undefined,
      WAITLIST_CONFIRMATION_SECRET: undefined
    }, async () => {
      assert.deepEqual(await sendWaitlistConfirmation({
        leadId: "lead-123",
        email: "person@example.com",
        consentVersion: "home_v6_2026_07",
        requestedAt,
        baseUrl: "https://harbornavi.com"
      }), { skipped: true, reason: "not_configured" });
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(fetchCalled, false);
});
