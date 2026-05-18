/**
 * Notification Service
 * Sends alerts via Telegram and WhatsApp APIs.
 *
 * Env vars:
 *   TELEGRAM_BOT_TOKEN           – Telegram bot token
 *   TELEGRAM_CHAT_IDS            – JSON: {"2":"<chatId>",...} or single string for all
 *   WHATSAPP_API_URL             – WhatsApp API endpoint
 *   WHATSAPP_API_KEY             – WhatsApp API key/token (Webhook Gateway: token or token.secret)
 *   WHATSAPP_API_SECRET          – Optional secret (Webhook Gateway only; used when API key is token only)
 *   WHATSAPP_PROVIDER            – Optional provider hint: "Webhook Gateway" | "generic"
 *   WHATSAPP_IS_GROUP            – Optional group mode: "true" | "false" | "auto" (default)
 *   WHATSAPP_WEBHOOK_GATEWAY_USE_V2      – Optional Webhook Gateway mode: true (default) / false (legacy v1)
 *   WHATSAPP_TARGETS             – JSON: {"2":"08xxx",...} or single string for all
 *   AFTERHOURS_NOTIFY_ENABLED    – "true" (default) or "false"
 */

const DEFAULT_INITIAL_TELEGRAM_TEMPLATE = [
  "<b>PERINGATAN AFTER-HOURS</b>",
  "Branch: {branch}",
  "Tanggal: {date}",
  "",
  "Terdeteksi <b>{count}</b> toko masih online setelah jam operasional:",
  "{stores}",
  "",
  "Mohon segera tindak lanjut: verifikasi perangkat dan lakukan shutdown jika diperlukan.",
].join("\n");

const DEFAULT_FINAL_TELEGRAM_TEMPLATE = [
  "<b>PERINGATAN TERAKHIR AFTER-HOURS</b>",
  "Branch: {branch}",
  "Tanggal: {date}",
  "",
  "Masih terdeteksi <b>{count}</b> toko online:",
  "{stores}",
  "",
  "Tindakan wajib: lakukan shutdown sekarang dan pastikan tidak ada perangkat yang tetap aktif.",
].join("\n");

const DEFAULT_INITIAL_WHATSAPP_TEMPLATE = [
  "PERINGATAN AFTER-HOURS",
  "Branch: {branch}",
  "Tanggal: {date}",
  "",
  "Terdeteksi {count} toko masih online setelah jam operasional:",
  "{stores}",
  "",
  "Mohon segera tindak lanjut: verifikasi perangkat dan lakukan shutdown jika diperlukan.",
].join("\n");

function pickStageTemplate({ stage, totalStages, stageTemplates, initialTemplate, finalTemplate }) {
  const safeStage = Number.isFinite(stage) && stage > 0 ? stage : 1;
  const safeTotal =
    Number.isFinite(totalStages) && totalStages >= safeStage ? totalStages : safeStage;

  if (Array.isArray(stageTemplates)) {
    const stageTemplate = String(stageTemplates[safeStage - 1] || "").trim();
    if (stageTemplate) return stageTemplate;
  }

  return safeStage >= safeTotal ? finalTemplate : initialTemplate;
}

const DEFAULT_FINAL_WHATSAPP_TEMPLATE = [
  "PERINGATAN TERAKHIR AFTER-HOURS",
  "Branch: {branch}",
  "Tanggal: {date}",
  "",
  "Masih terdeteksi {count} toko online:",
  "{stores}",
  "",
  "Tindakan wajib: lakukan shutdown sekarang dan pastikan tidak ada perangkat yang tetap aktif.",
].join("\n");

const TELEGRAM_MAX_SAFE_CHARS = 3800;
const WHATSAPP_MAX_SAFE_CHARS = 3800;

function parseJsonOrSingle(raw) {
  if (!raw) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;

  const value = String(raw).trim();
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
  } catch {
    // Not JSON — treat as a single value for all branches
  }
  return { _all: value };
}

function pickConfigValue(overrideValue, envValues, allowEnvFallback) {
  if (overrideValue && typeof overrideValue === "object" && !Array.isArray(overrideValue)) {
    return overrideValue;
  }

  const overrideStr = String(overrideValue ?? "").trim();
  if (overrideStr) return overrideValue;

  if (!allowEnvFallback) return "";

  for (const envValue of envValues) {
    const envStr = String(envValue ?? "").trim();
    if (envStr) return envValue;
  }
  return "";
}

function normalizeHttpUrl(rawUrl) {
  const raw = String(rawUrl ?? "").trim();
  if (!raw) return "";

  const withoutTrailingNote = raw.replace(/\s*\([^)]*\)\s*$/, "").trim();
  const candidate = withoutTrailingNote.split(/\s+/)[0].trim();
  if (!candidate) return "";

  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(candidate)
    ? candidate
    : `https://${candidate}`;

  try {
    return new URL(withProtocol).toString().replace(/\/+$/, "");
  } catch {
    return withProtocol.replace(/\/+$/, "");
  }
}

function normalizeConfig(overrides = {}) {
  const allowEnvFallback = overrides.allowEnvFallback !== false;

  const telegramBotToken = pickConfigValue(
    overrides.telegramBotToken,
    [process.env.TELEGRAM_BOT_TOKEN, process.env.BOT_TOKEN],
    allowEnvFallback
  );
  const whatsappApiUrl = pickConfigValue(
    overrides.whatsappApiUrl,
    [process.env.WHATSAPP_API_URL],
    allowEnvFallback
  );
  const whatsappApiKey = pickConfigValue(
    overrides.whatsappApiKey,
    [process.env.WHATSAPP_API_KEY],
    allowEnvFallback
  );
  const whatsappApiSecret = pickConfigValue(
    overrides.whatsappApiSecret,
    [process.env.WHATSAPP_API_SECRET],
    allowEnvFallback
  );
  const whatsappProvider = pickConfigValue(
    overrides.whatsappProvider,
    [process.env.WHATSAPP_PROVIDER],
    allowEnvFallback
  );
  const whatsappIsGroupRaw = pickConfigValue(
    overrides.whatsappIsGroup,
    [process.env.WHATSAPP_IS_GROUP],
    allowEnvFallback
  );
  const whatsappIsGroup = whatsappIsGroupRaw || "auto";
  const whatsappWebhookGatewayUseV2 = pickConfigValue(
    overrides.whatsappWebhookGatewayUseV2,
    [process.env.WHATSAPP_WEBHOOK_GATEWAY_USE_V2],
    allowEnvFallback
  );
  const telegramChatIds = parseJsonOrSingle(
    pickConfigValue(
      overrides.telegramChatIds,
      [process.env.TELEGRAM_CHAT_IDS, process.env.NOTIF_TARGET_CHAT_ID],
      allowEnvFallback
    )
  );
  const whatsappTargets = parseJsonOrSingle(
    pickConfigValue(overrides.whatsappTargets, [process.env.WHATSAPP_TARGETS], allowEnvFallback)
  );
  return {
    allowEnvFallback,
    telegramBotToken,
    whatsappApiUrl,
    whatsappApiKey,
    whatsappApiSecret,
    whatsappProvider,
    whatsappIsGroup,
    whatsappWebhookGatewayUseV2,
    telegramChatIds,
    whatsappTargets,
  };
}

function toBool(value, fallback = false) {
  if (value == null || value === "") return fallback;
  const v = String(value).trim().toLowerCase();
  if (v === "1" || v === "true" || v === "yes" || v === "on") return true;
  if (v === "0" || v === "false" || v === "no" || v === "off") return false;
  return fallback;
}

function isWebhookGatewayProvider(config) {
  const provider = String(config.whatsappProvider || "")
    .trim()
    .toLowerCase();
  if (provider === "webhook gateway") return true;
  const apiUrl = String(config.whatsappApiUrl || "").toLowerCase();
  return /webhook-gateway\.example\.com/.test(apiUrl);
}

function resolveWebhookGatewayApiUrl(rawUrl, useV2) {
  const source = normalizeHttpUrl(rawUrl);
  if (!source) return source;

  let url;
  try {
    url = new URL(source);
  } catch {
    if (/\/api\/v2\/send-message$/i.test(source) || /\/api\/send-message$/i.test(source)) {
      return source;
    }
    if (/\/api\/v2$/i.test(source)) {
      return `${source}/send-message`;
    }
    if (/\/api$/i.test(source)) {
      return `${source}${useV2 ? "/v2/send-message" : "/send-message"}`;
    }
    return `${source}${useV2 ? "/api/v2/send-message" : "/api/send-message"}`;
  }

  const pathname = url.pathname.replace(/\/+$/, "");
  if (pathname.endsWith("/api/v2/send-message") || pathname.endsWith("/api/send-message")) {
    return url.toString().replace(/\/+$/, "");
  }
  if (pathname.endsWith("/api/v2")) {
    url.pathname = `${pathname}/send-message`;
  } else if (pathname.endsWith("/api")) {
    url.pathname = `${pathname}${useV2 ? "/v2/send-message" : "/send-message"}`;
  } else {
    url.pathname = `${pathname}${useV2 ? "/api/v2/send-message" : "/api/send-message"}`;
  }

  return url.toString().replace(/\/+$/, "");
}

function buildWebhookGatewayAuthorization(config) {
  const tokenOrCombined = String(config.whatsappApiKey || "").trim();
  if (!tokenOrCombined) return "";
  if (tokenOrCombined.includes(".")) return tokenOrCombined;
  const secret = String(config.whatsappApiSecret || "").trim();
  return secret ? `${tokenOrCombined}.${secret}` : tokenOrCombined;
}

function inferWebhookGatewayGroupTarget(target) {
  const raw = String(target || "").trim();
  return raw.startsWith("120") || raw.includes("-") || raw.endsWith("@g.us");
}

function resolveWebhookGatewayGroupFlag(target, config) {
  const mode = String(config.whatsappIsGroup || "auto")
    .trim()
    .toLowerCase();
  if (mode === "auto") return inferWebhookGatewayGroupTarget(target);
  return toBool(mode, false);
}

function isNotifyEnabled(config = {}, options = {}) {
  const allowEnvFallback = options.allowEnvFallback !== false;

  if (config.notifyEnabled != null && String(config.notifyEnabled).trim() !== "") {
    const v = String(config.notifyEnabled).trim().toLowerCase();
    return v !== "0" && v !== "false" && v !== "no" && v !== "off";
  }

  if (!allowEnvFallback) return false;

  const v = (process.env.AFTERHOURS_NOTIFY_ENABLED ?? "true").trim().toLowerCase();
  return v !== "0" && v !== "false" && v !== "no" && v !== "off";
}

function applyTemplate(template, vars) {
  const source = String(template || "");
  return source
    .replaceAll("{branch}", String(vars.branch || "Unknown Branch"))
    .replaceAll("{date}", String(vars.date || "-"))
    .replaceAll("{count}", String(vars.count || 0))
    .replaceAll("{stage}", String(vars.stage || 1))
    .replaceAll("{totalStages}", String(vars.totalStages || 1))
    .replaceAll("{stores}", String(vars.stores || "-"));
}

function toPositiveInt(value, fallback) {
  const n = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

function normalizeRetryableWhatsAppMessage(data, error) {
  return String(data?.message || data?.error || data?.description || error?.message || error || "")
    .trim()
    .toLowerCase();
}

function isRetryableWhatsAppFailure({ status, data, error }) {
  const message = normalizeRetryableWhatsAppMessage(data, error);

  if (message.includes("device disconnected")) return true;
  if (message.includes("need to scan qr code again")) return true;
  if (message.includes("temporarily unavailable")) return true;
  if (message.includes("timeout")) return true;
  if (message.includes("rate limit")) return true;

  if (status === 408 || status === 425 || status === 429) return true;
  if (typeof status === "number" && status >= 500) return true;

  return false;
}

async function sendWhatsAppWithRetry(sendAttempt, label) {
  let lastResult = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    lastResult = await sendAttempt();
    if (lastResult?.ok) return lastResult;

    if (!lastResult?.retryable || attempt === 2) {
      break;
    }

    console.warn(
      `[notifyService] ${label} retryable failure on attempt ${attempt}/2; retrying once more`
    );
  }

  return lastResult || { ok: false, reason: "send_failed" };
}

/**
 * Cap message length by truncating only the store-list portion.
 * The template is used to split the message into prefix (before {stores})
 * and suffix (after {stores}), so the footer with action items is always preserved.
 *
 * @param {string} str - The fully rendered message
 * @param {number} maxChars - Character limit
 * @param {string} [template] - The original template containing {stores}
 * @param {Object} [vars] - Template variables (branch, date, count) for re-rendering
 * @returns {string}
 */
function capMessage(str, maxChars, template, vars) {
  if (str.length <= maxChars) return str;

  // If we have the template, do a smart truncation that preserves the footer
  if (template && vars) {
    // Find {stores} in the template to split prefix/suffix
    const storesIdx = template.indexOf("{stores}");
    if (storesIdx !== -1) {
      const templatePrefix = template.slice(0, storesIdx);
      const templateSuffix = template.slice(storesIdx + "{stores}".length);

      // Render prefix and suffix (without stores)
      const renderedPrefix = applyTemplate(templatePrefix, { ...vars, stores: "" });
      const renderedSuffix = applyTemplate(templateSuffix, { ...vars, stores: "" });

      // Budget for the store lines
      const ellipsisSuffix = "\n...\n(daftar dipersingkat)";
      const overhead = renderedPrefix.length + renderedSuffix.length + ellipsisSuffix.length;
      const storeBudget = Math.max(0, maxChars - overhead);

      // Extract actual store block from the rendered message
      const storesBlock = String(vars.stores || "");
      if (storesBlock.length > storeBudget) {
        // Truncate store lines from the bottom (keep as many full lines as fit)
        const storeLines = storesBlock.split("\n");
        let truncated = "";
        let includedCount = 0;
        for (const line of storeLines) {
          const candidate = includedCount === 0 ? line : `${truncated}\n${line}`;
          if (candidate.length > storeBudget) break;
          truncated = candidate;
          includedCount++;
        }
        const totalStoreCount = storeLines.length;
        const remainingCount = totalStoreCount - includedCount;
        const truncatedStores =
          remainingCount > 0 ? `${truncated}\n• ... dan ${remainingCount} toko lainnya` : truncated;
        return `${renderedPrefix}${truncatedStores}${renderedSuffix}`;
      }
    }
  }

  // Fallback: dumb truncation (no template available)
  return `${str.slice(0, Math.max(0, maxChars - 64)).trim()}\n...\n(daftar dipersingkat)`;
}

// ─── Telegram ────────────────────────────────────────────────────────────────

async function sendTelegram(chatId, message, options = {}) {
  const config = normalizeConfig(options);
  if (!config.telegramBotToken || !chatId) return { ok: false, reason: "missing_config" };

  const url = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      console.warn("[notifyService] Telegram error:", data.description);
    }
    return { ok: data.ok, data };
  } catch (err) {
    console.warn("[notifyService] Telegram send failed:", err?.message || err);
    return { ok: false, error: err?.message };
  }
}

// ─── WhatsApp ────────────────────────────────────────────────────────────────

async function sendWhatsAppGenericOnce(target, message, config) {
  const url = normalizeHttpUrl(config.whatsappApiUrl);
  if (!url) return { ok: false, reason: "missing_config" };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: config.whatsappApiKey,
    },
    body: JSON.stringify({
      target,
      message,
    }),
  });

  const data = await res.json().catch(() => ({ status: res.status }));
  const retryable = isRetryableWhatsAppFailure({ status: res.status, data });

  if (!res.ok || (data && data.status === false)) {
    const logFn = retryable ? console.info : console.warn;
    logFn(
      `[notifyService] WhatsApp ${retryable ? "retryable failure" : "response not ok"}: provider=generic status=${res.status} retryable=${retryable} body=${JSON.stringify(data)}`
    );
  }

  return { ok: res.ok && !(data && data.status === false), data, retryable, provider: "generic" };
}

async function sendWhatsAppWebhookGatewayOnce(target, message, config, useV2) {
  const url = resolveWebhookGatewayApiUrl(config.whatsappApiUrl, useV2);
  const authorization = buildWebhookGatewayAuthorization(config);
  const isGroup = resolveWebhookGatewayGroupFlag(target, config) ? "true" : "false";

  let res;
  if (useV2) {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authorization,
      },
      body: JSON.stringify({
        data: [
          {
            phone: String(target),
            message: String(message),
            isGroup,
          },
        ],
      }),
    });
  } else {
    const body = new URLSearchParams({
      phone: String(target),
      message: String(message),
      isGroup,
    });
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: authorization,
      },
      body,
    });
  }

  const data = await res.json().catch(() => ({ status: res.status }));

  // Webhook Gateway returns HTTP 200 but with status: false in the JSON body for errors
  const isWebhookGatewayError = res.ok && data && data.status === false;
  const retryable = isRetryableWhatsAppFailure({ status: res.status, data });

  if (!res.ok || isWebhookGatewayError) {
    const logFn = retryable ? console.info : console.warn;
    logFn(
      `[notifyService] WhatsApp ${retryable ? "retryable failure" : "response not ok"}: provider=${useV2 ? "Webhook Gateway-v2" : "Webhook Gateway-v1"} status=${res.status} retryable=${retryable} body=${JSON.stringify(data)}`
    );
  }

  return {
    ok: res.ok && !isWebhookGatewayError,
    data,
    retryable,
    provider: useV2 ? "Webhook Gateway-v2" : "Webhook Gateway-v1",
  };
}

async function sendWhatsApp(target, message, options = {}) {
  const config = normalizeConfig(options);
  if (!config.whatsappApiUrl || !config.whatsappApiKey || !target) {
    return { ok: false, reason: "missing_config" };
  }

  try {
    if (isWebhookGatewayProvider(config)) {
      const explicitV1 = /\/api\/send-message\/?$/i.test(
        String(config.whatsappApiUrl || "").trim()
      );
      const useV2 = toBool(config.whatsappWebhookGatewayUseV2, !explicitV1);
      const attemptModes = useV2 ? [true, false] : [false];
      let lastResult = { ok: false, reason: "send_failed" };

      for (const currentUseV2 of attemptModes) {
        const label = currentUseV2 ? "Webhook Gateway v2" : "Webhook Gateway v1";
        lastResult = await sendWhatsAppWithRetry(
          () => sendWhatsAppWebhookGatewayOnce(target, message, config, currentUseV2),
          `${label} target ${target}`
        );

        if (lastResult?.ok) return lastResult;

        if (currentUseV2 && attemptModes.length > 1) {
          console.warn(
            `[notifyService] Webhook Gateway v2 failed for target ${target}; falling back to legacy v1`
          );
        }
      }

      if (!lastResult?.ok) {
        console.warn(
          `[notifyService] WhatsApp send failed after retries: provider=${lastResult?.provider || "Webhook Gateway"} target=${target} retryable=${Boolean(lastResult?.retryable)} body=${JSON.stringify(lastResult?.data || {})}`
        );
      }

      return lastResult;
    }

    const result = await sendWhatsAppWithRetry(
      () => sendWhatsAppGenericOnce(target, message, config),
      `WhatsApp generic target ${target}`
    );

    if (!result?.ok) {
      console.warn(
        `[notifyService] WhatsApp send failed after retries: provider=${result?.provider || "generic"} target=${target} retryable=${Boolean(result?.retryable)} body=${JSON.stringify(result?.data || {})}`
      );
    }

    return result;
  } catch (err) {
    console.warn("[notifyService] WhatsApp send failed:", err?.message || err);
    return { ok: false, error: err?.message };
  }
}

// ─── After-Hours Alert Dispatcher ────────────────────────────────────────────

/**
 * Send after-hours PC alerts grouped by branch.
 * @param {Object} violationsByBranch - { branchId: { branchName, stores: [{storeCode, storeName, lastSyncAt}] } }
 * @param {string} checkDate - Date string (YYYY-MM-DD)
 * @param {Object} options - Runtime config and template overrides.
 * @returns {Object} results per branch
 */
async function notifyAfterhoursAlerts(violationsByBranch, checkDate, options = {}) {
  const warningStageRaw = Number.parseInt(String(options.warningStage ?? "1"), 10);
  const warningStage =
    Number.isFinite(warningStageRaw) && warningStageRaw > 0 ? warningStageRaw : 1;
  const totalStagesRaw = Number.parseInt(String(options.totalStages ?? String(warningStage)), 10);
  const totalStages =
    Number.isFinite(totalStagesRaw) && totalStagesRaw >= warningStage
      ? totalStagesRaw
      : warningStage;
  const warningType = options.warningType === "final" ? "final" : "initial";
  const runtimeConfig = normalizeConfig({
    ...(options.config || {}),
    allowEnvFallback: false,
  });

  if (!isNotifyEnabled(options.config || {}, { allowEnvFallback: false })) {
    console.log("[notifyService] Notifications disabled (afterhours_config.notify_enabled)");
    return { skipped: true };
  }

  const telegramTemplateInitial =
    options.config?.telegramTemplateInitial || DEFAULT_INITIAL_TELEGRAM_TEMPLATE;
  const telegramTemplateFinal =
    options.config?.telegramTemplateFinal || DEFAULT_FINAL_TELEGRAM_TEMPLATE;
  const whatsappTemplateInitial =
    options.config?.whatsappTemplateInitial || DEFAULT_INITIAL_WHATSAPP_TEMPLATE;
  const whatsappTemplateFinal =
    options.config?.whatsappTemplateFinal || DEFAULT_FINAL_WHATSAPP_TEMPLATE;

  const telegramStageTemplates = [
    options.config?.telegramTemplateStage1,
    options.config?.telegramTemplateStage2,
    options.config?.telegramTemplateStage3,
    options.config?.telegramTemplateStage4,
  ];
  const whatsappStageTemplates = [
    options.config?.whatsappTemplateStage1,
    options.config?.whatsappTemplateStage2,
    options.config?.whatsappTemplateStage3,
    options.config?.whatsappTemplateStage4,
  ];

  const selectedTelegramTemplate = pickStageTemplate({
    stage: warningStage,
    totalStages,
    stageTemplates: telegramStageTemplates,
    initialTemplate: warningType === "final" ? telegramTemplateFinal : telegramTemplateInitial,
    finalTemplate: telegramTemplateFinal,
  });
  const selectedWhatsAppTemplate = pickStageTemplate({
    stage: warningStage,
    totalStages,
    stageTemplates: whatsappStageTemplates,
    initialTemplate: warningType === "final" ? whatsappTemplateFinal : whatsappTemplateInitial,
    finalTemplate: whatsappTemplateFinal,
  });
  const maxStoreLines = toPositiveInt(
    options.config?.maxStoreLines || process.env.AFTERHOURS_MAX_STORE_LINES,
    500
  );
  const maxMessageChars = toPositiveInt(
    options.config?.maxMessageChars || process.env.AFTERHOURS_MAX_MESSAGE_CHARS,
    15000
  );
  const maxTelegramChars = Math.min(maxMessageChars, TELEGRAM_MAX_SAFE_CHARS);
  const maxWhatsAppChars = Math.min(maxMessageChars, WHATSAPP_MAX_SAFE_CHARS);

  const results = {};

  for (const [branchId, data] of Object.entries(violationsByBranch)) {
    const { branchName, stores } = data;
    if (!stores || stores.length === 0) continue;

    // Build message
    const storeLines = stores
      .slice(0, maxStoreLines)
      .map((s) => {
        const syncTime = s.lastSyncAt
          ? new Date(s.lastSyncAt).toLocaleTimeString("id-ID", {
              timeZone: "Asia/Jakarta",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "N/A";
        return `• ${s.storeCode} - ${s.storeName || "Unknown"} (last sync: ${syncTime} WIB)`;
      })
      .join("\n");
    const extraCount = Math.max(0, stores.length - maxStoreLines);
    const storesBlock =
      extraCount > 0 ? `${storeLines}\n• ... dan ${extraCount} toko lainnya` : storeLines;

    const vars = {
      branch: branchName || `Branch ${branchId}`,
      date: checkDate,
      count: stores.length,
      stage: warningStage,
      totalStages,
      stores: storesBlock,
    };
    const textMessage = capMessage(
      applyTemplate(selectedWhatsAppTemplate, vars),
      maxWhatsAppChars,
      selectedWhatsAppTemplate,
      vars
    );
    const htmlMessage = capMessage(
      applyTemplate(selectedTelegramTemplate, vars),
      maxTelegramChars,
      selectedTelegramTemplate,
      vars
    );

    const branchResults = { telegram: null, whatsapp: null };
    const branchTasks = [];

    // Telegram
    const tgChatId = runtimeConfig.telegramChatIds[branchId] || runtimeConfig.telegramChatIds._all;
    if (tgChatId) {
      branchTasks.push(
        sendTelegram(tgChatId, htmlMessage, runtimeConfig).then((result) => {
          branchResults.telegram = result;
        })
      );
    }

    // WhatsApp
    const waTarget = runtimeConfig.whatsappTargets[branchId] || runtimeConfig.whatsappTargets._all;
    if (waTarget) {
      branchTasks.push(
        sendWhatsApp(waTarget, textMessage, runtimeConfig).then((result) => {
          branchResults.whatsapp = result;
        })
      );
    }

    await Promise.allSettled(branchTasks);

    const telegramStatus = tgChatId ? (branchResults.telegram?.ok ? "ok" : "fail") : "skip";
    const whatsappStatus = waTarget ? (branchResults.whatsapp?.ok ? "ok" : "fail") : "skip";
    const branchLog =
      `[notifyService] afterhours branch=${branchId} stage=${warningStage}/${totalStages} ` +
      `telegram=${telegramStatus} whatsapp=${whatsappStatus} stores=${stores.length}`;
    if ((tgChatId && telegramStatus === "fail") || (waTarget && whatsappStatus === "fail")) {
      console.warn(branchLog);
    } else {
      console.log(branchLog);
    }

    results[branchId] = branchResults;
  }

  return results;
}

module.exports = {
  sendTelegram,
  sendWhatsApp,
  notifyAfterhoursAlerts,
  isNotifyEnabled,
};
