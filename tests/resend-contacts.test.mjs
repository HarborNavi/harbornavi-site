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

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

async function freshContactsModule(label) {
  return import(`../src/server/resend-contacts.ts?test=${label}-${Date.now()}-${Math.random()}`);
}

test("contact sync skips routes without marketing consent", async () => {
  const { syncWaitlistContact } = await freshContactsModule("no-consent");
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    throw new Error("fetch should not be called");
  };

  try {
    assert.deepEqual(await syncWaitlistContact("person@example.com", "none"), {
      skipped: true,
      reason: "consent_scope_not_enabled"
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(fetchCalled, false);
});

test("contact sync creates an opt-out topic and explicitly opts in a new contact", async () => {
  const { syncWaitlistContact } = await freshContactsModule("create");
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (url === "https://api.resend.com/topics" && init.method === "GET") {
      return jsonResponse({ data: [] });
    }
    if (url === "https://api.resend.com/topics" && init.method === "POST") {
      return jsonResponse({ id: "topic-123", object: "topic" });
    }
    if (url === "https://api.resend.com/contacts/person%40example.com" && init.method === "GET") {
      return jsonResponse({ message: "not found" }, 404);
    }
    if (url === "https://api.resend.com/contacts" && init.method === "POST") {
      return jsonResponse({ id: "contact-123" });
    }
    throw new Error(`Unexpected Resend request: ${init.method} ${url}`);
  };

  try {
    await withEnvironment({
      RESEND_API_KEY: "re_test_key",
      RESEND_KICKSTARTER_TOPIC_ID: undefined,
      RESEND_KICKSTARTER_TOPIC_NAME: undefined,
      RESEND_ROAD_TOPIC_ID: undefined,
      VERCEL_ENV: "production"
    }, async () => {
      assert.deepEqual(await syncWaitlistContact("person@example.com", "kickstarter_updates"), {
        skipped: false,
        action: "created",
        topic_id: "topic-123"
      });
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(calls.length, 4);
  const topicPayload = JSON.parse(calls[1].init.body);
  assert.deepEqual(topicPayload, {
    name: "HarborNavi Kickstarter Updates",
    description: "Confirmed HarborNavi Kickstarter pre-launch subscribers.",
    default_subscription: "opt_out"
  });
  const contactPayload = JSON.parse(calls[3].init.body);
  assert.deepEqual(contactPayload, {
    email: "person@example.com",
    unsubscribed: false,
    topics: [{ id: "topic-123", subscription: "opt_in" }]
  });
});

test("contact sync updates an existing contact and its topic subscription", async () => {
  const { syncWaitlistContact } = await freshContactsModule("update");
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (url === "https://api.resend.com/topics/topic-existing" && init.method === "GET") {
      return jsonResponse({
        id: "topic-existing",
        name: "HarborNavi Kickstarter Updates",
        default_subscription: "opt_out"
      });
    }
    if (url === "https://api.resend.com/contacts/person%40example.com" && init.method === "GET") {
      return jsonResponse({ id: "contact-existing", email: "person@example.com" });
    }
    if (url === "https://api.resend.com/contacts/person%40example.com" && init.method === "PATCH") {
      return jsonResponse({ id: "contact-existing" });
    }
    if (url === "https://api.resend.com/contacts/person%40example.com/topics" && init.method === "PATCH") {
      return jsonResponse({ id: "contact-existing" });
    }
    throw new Error(`Unexpected Resend request: ${init.method} ${url}`);
  };

  try {
    await withEnvironment({
      RESEND_API_KEY: "re_test_key",
      RESEND_KICKSTARTER_TOPIC_ID: "topic-existing",
      RESEND_KICKSTARTER_TOPIC_NAME: undefined,
      RESEND_ROAD_TOPIC_ID: undefined,
      VERCEL_ENV: "production"
    }, async () => {
      assert.deepEqual(await syncWaitlistContact("person@example.com", "kickstarter_updates"), {
        skipped: false,
        action: "updated",
        topic_id: "topic-existing"
      });
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(calls.length, 4);
  assert.deepEqual(JSON.parse(calls[2].init.body), { unsubscribed: false });
  assert.deepEqual(JSON.parse(calls[3].init.body), {
    topics: [{ id: "topic-existing", subscription: "opt_in" }]
  });
});
