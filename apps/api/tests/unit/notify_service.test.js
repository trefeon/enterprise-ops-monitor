const test = require("node:test");
const assert = require("node:assert/strict");

const { sendWhatsApp, notifyAfterhoursAlerts } = require("../../services/notifyService");

function makeResponse({ ok, status, body }) {
  return {
    ok,
    status,
    async json() {
      return body;
    },
  };
}

test("sendWhatsApp normalizes Webhook Gateway URLs before retrying v2 then falling back to v1", async () => {
  const originalFetch = global.fetch;
  const calls = [];

  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });

    if (calls.length <= 2) {
      return makeResponse({
        ok: false,
        status: 500,
        body: { status: false, message: "device disconnected, need to scan qr code again" },
      });
    }

    return makeResponse({
      ok: true,
      status: 200,
      body: { status: true, message: "ok" },
    });
  };

  try {
    const result = await sendWhatsApp(
      "120000000000001",
      "TEST MESSAGE",
      {
        whatsappProvider: "Webhook Gateway",
        whatsappApiUrl: "https://notifications.example.com/",
        whatsappApiKey: "token.secret",
        whatsappIsGroup: "auto",
      }
    );

    assert.equal(result.ok, true);
    assert.equal(calls.length, 3);
    assert.match(calls[0].url, /\/api\/v2\/send-message$/);
    assert.match(calls[1].url, /\/api\/v2\/send-message$/);
    assert.match(calls[2].url, /\/api\/send-message$/);
  } finally {
    global.fetch = originalFetch;
  }
});

test("sendWhatsApp retries generic provider on retryable failure", async () => {
  const originalFetch = global.fetch;
  const calls = [];

  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });

    if (calls.length === 1) {
      return makeResponse({
        ok: false,
        status: 503,
        body: { message: "temporarily unavailable" },
      });
    }

    return makeResponse({
      ok: true,
      status: 200,
      body: { status: true, message: "ok" },
    });
  };

  try {
    const result = await sendWhatsApp(
      "000000000000",
      "TEST MESSAGE",
      {
        whatsappProvider: "generic",
        whatsappApiUrl: "https://example.com/send",
        whatsappApiKey: "api-key",
      }
    );

    assert.equal(result.ok, true);
    assert.equal(calls.length, 2);
    assert.equal(calls[0].url, "https://example.com/send");
    assert.equal(calls[1].url, "https://example.com/send");
  } finally {
    global.fetch = originalFetch;
  }
});

test("notifyAfterhoursAlerts caps long WhatsApp messages before delivery", async () => {
  const originalFetch = global.fetch;
  const calls = [];

  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });

    const payload = JSON.parse(String(options.body || "{}"));
    const message = payload?.data?.[0]?.message || "";

    if (message.length > 3800) {
      return makeResponse({
        ok: false,
        status: 413,
        body: { status: false, message: "message too long" },
      });
    }

    return makeResponse({
      ok: true,
      status: 200,
      body: { status: true, message: "ok" },
    });
  };

  const stores = Array.from({ length: 120 }, (_, index) => ({
    storeCode: `30${String(index).padStart(4, "0")}`,
    storeName: `DEMO STORE ${index + 1} FOR MESSAGE LIMIT TEST`,
    lastSyncAt: "2026-04-12T16:55:00+07:00",
  }));

  try {
    const result = await notifyAfterhoursAlerts(
      {
        4: {
          branchName: "CENTRAL HUB",
          stores,
        },
      },
      "2026-04-12",
      {
        warningType: "initial",
        warningStage: 1,
        totalStages: 4,
        config: {
          notifyEnabled: true,
          whatsappApiUrl: "https://notifications.example.com/",
          whatsappApiKey: "token.secret",
          whatsappIsGroup: "auto",
          whatsappTargets: {
            4: "120000000000004",
          },
        },
      }
    );

    assert.equal(calls.length > 0, true);
    const payload = JSON.parse(String(calls[0].options.body || "{}"));
    const message = payload?.data?.[0]?.message || "";
    assert.equal(message.length <= 3800, true);
    assert.equal(result[4].whatsapp.ok, true);
  } finally {
    global.fetch = originalFetch;
  }
});
