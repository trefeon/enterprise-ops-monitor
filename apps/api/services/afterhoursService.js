/**
 * After-Hours PC Detection Service
 *
 * Fetches sync_aud data and identifies stores whose computers
 * are still online around configured after-hours warning times.
 *
 * Warning stages are driven by `warning_schedule_times` in afterhours_config.
 * The settings UI can still surface a 4-stage preset, but runtime no longer invents a fallback.
 */
const { fetchStoreSyncAllBranches } = require("./dataClient");
const { STALE_THRESHOLD_MS } = require("./dataClient");
const { notifyAfterhoursAlerts } = require("./notifyService");
const { toWibDate } = require("../utils/time");

function parsePositiveMs(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

const DEFAULT_INITIAL_ONLINE_THRESHOLD_MS = parsePositiveMs(
  process.env.AFTERHOURS_ONLINE_THRESHOLD_MS_INITIAL ||
    process.env.AFTERHOURS_ONLINE_THRESHOLD_MS ||
    String(STALE_THRESHOLD_MS || 10 * 60 * 1000),
  10 * 60 * 1000
);
const DEFAULT_FINAL_ONLINE_THRESHOLD_MS = parsePositiveMs(
  process.env.AFTERHOURS_ONLINE_THRESHOLD_MS_FINAL,
  5 * 60 * 1000
);

const CONFIG_KEYS = [
  "notify_enabled",
  "telegram_bot_token",
  "telegram_chat_ids",
  "telegram_template",
  "telegram_template_initial",
  "telegram_template_final",
  "telegram_template_stage_1",
  "telegram_template_stage_2",
  "telegram_template_stage_3",
  "telegram_template_stage_4",
  "whatsapp_api_url",
  "whatsapp_api_key",
  "whatsapp_api_secret",
  "whatsapp_targets",
  "whatsapp_template",
  "whatsapp_template_initial",
  "whatsapp_template_final",
  "whatsapp_template_stage_1",
  "whatsapp_template_stage_2",
  "whatsapp_template_stage_3",
  "whatsapp_template_stage_4",
  "monthly_report_whatsapp_targets",
  "first_warning_time",
  "final_warning_time",
  "warning_schedule_times",
  "max_store_lines",
  "max_message_chars",
];

/**
 * Determine if a store is likely still online near a check timestamp.
 * Online signal = last sync is recent (within threshold minutes).
 *
 * @param {string|null} lastSyncAt - ISO timestamp
 * @param {Date} checkAt - current check timestamp
 * @param {number} thresholdMs - freshness threshold in ms
 * @returns {boolean}
 */
function isActiveNearCheckTime(
  lastSyncAt,
  checkAt,
  thresholdMs = DEFAULT_INITIAL_ONLINE_THRESHOLD_MS
) {
  if (!lastSyncAt) return false;
  const syncDate = new Date(lastSyncAt);
  if (Number.isNaN(syncDate.getTime())) return false;
  const ageMs = checkAt.getTime() - syncDate.getTime();
  if (ageMs < 0) return false;
  return ageMs <= thresholdMs;
}

function resolveThresholdMs(warningType, thresholdMs) {
  const fallback =
    warningType === "final"
      ? DEFAULT_FINAL_ONLINE_THRESHOLD_MS
      : DEFAULT_INITIAL_ONLINE_THRESHOLD_MS;
  return parsePositiveMs(thresholdMs, fallback);
}

function isFinalViolationStage(warningType, warningStage, totalStages) {
  return warningType === "final" || warningStage >= totalStages;
}

function resolveWarningMeta(options = {}) {
  const warningStageRaw = Number.parseInt(String(options.warningStage ?? "1"), 10);
  const warningStage =
    Number.isFinite(warningStageRaw) && warningStageRaw > 0 ? warningStageRaw : 1;

  const totalStagesRaw = Number.parseInt(String(options.totalStages ?? String(warningStage)), 10);
  const totalStages =
    Number.isFinite(totalStagesRaw) && totalStagesRaw >= warningStage
      ? totalStagesRaw
      : warningStage;

  let warningType = options.warningType === "final" ? "final" : "initial";
  if (options.warningType == null && warningStage >= totalStages) {
    warningType = "final";
  }

  return {
    warningType,
    warningStage,
    totalStages,
  };
}

async function loadAfterhoursRuntimeConfig(sequelize) {
  if (!sequelize) return {};
  try {
    const [rows] = await sequelize.query(
      `SELECT key, value FROM afterhours_config WHERE key = ANY($1)`,
      { bind: [CONFIG_KEYS] }
    );
    const config = {};
    for (const row of rows) config[row.key] = row.value;
    return config;
  } catch {
    return {};
  }
}

function buildNotifyConfig(runtimeConfig = {}) {
  const telegramTemplateBase = runtimeConfig.telegram_template || "";
  const whatsappTemplateBase = runtimeConfig.whatsapp_template || "";
  return {
    allowEnvFallback: false,
    notifyEnabled: runtimeConfig.notify_enabled,
    telegramBotToken: runtimeConfig.telegram_bot_token || "",
    telegramChatIds: runtimeConfig.telegram_chat_ids || "",
    whatsappApiUrl: runtimeConfig.whatsapp_api_url || "",
    whatsappApiKey: runtimeConfig.whatsapp_api_key || "",
    whatsappApiSecret: runtimeConfig.whatsapp_api_secret || "",
    whatsappTargets: runtimeConfig.whatsapp_targets || "",
    telegramTemplateInitial:
      runtimeConfig.telegram_template_initial || telegramTemplateBase || undefined,
    telegramTemplateFinal:
      runtimeConfig.telegram_template_final || telegramTemplateBase || undefined,
    telegramTemplateStage1: runtimeConfig.telegram_template_stage_1 || undefined,
    telegramTemplateStage2: runtimeConfig.telegram_template_stage_2 || undefined,
    telegramTemplateStage3: runtimeConfig.telegram_template_stage_3 || undefined,
    telegramTemplateStage4: runtimeConfig.telegram_template_stage_4 || undefined,
    whatsappTemplateInitial:
      runtimeConfig.whatsapp_template_initial || whatsappTemplateBase || undefined,
    whatsappTemplateFinal:
      runtimeConfig.whatsapp_template_final || whatsappTemplateBase || undefined,
    whatsappTemplateStage1: runtimeConfig.whatsapp_template_stage_1 || undefined,
    whatsappTemplateStage2: runtimeConfig.whatsapp_template_stage_2 || undefined,
    whatsappTemplateStage3: runtimeConfig.whatsapp_template_stage_3 || undefined,
    whatsappTemplateStage4: runtimeConfig.whatsapp_template_stage_4 || undefined,
    maxStoreLines: runtimeConfig.max_store_lines || undefined,
    maxMessageChars: runtimeConfig.max_message_chars || undefined,
  };
}

/**
 * Run the after-hours check for all branches.
 * @param {import('sequelize').Sequelize} sequelize
 * @param {Object} options
 * @param {'initial'|'final'} [options.warningType]
 * @param {Date} [options.now]
 * @param {number} [options.thresholdMs]
 * @returns {Object} { checkDate, totalViolations, byBranch, notifyResults }
 */
async function runAfterhoursCheck(sequelize, options = {}) {
  const { warningType, warningStage, totalStages } = resolveWarningMeta(options);
  const checkAt = options.now instanceof Date ? options.now : new Date();
  const thresholdMs = resolveThresholdMs(warningType, options.thresholdMs);
  const finalViolationStage = isFinalViolationStage(warningType, warningStage, totalStages);
  const checkDate = toWibDate(checkAt);
  const scheduledTime = String(options.scheduledTime || "").trim() || null;

  console.log(
    `[afterhours] Running ${warningType} after-hours check stage=${warningStage}/${totalStages} for ${checkDate} thresholdMs=${thresholdMs}${scheduledTime ? ` scheduledTime=${scheduledTime}` : ""}`
  );

  // Fetch fresh sync data (bypass cache)
  const syncData = await fetchStoreSyncAllBranches({ bypassCache: true });

  // Group all active stores for notifications and persist the latest active stage per store.
  const activeByBranch = {};
  const finalViolationsByBranch = {};
  let totalViolations = 0;
  let finalViolationCount = 0;

  for (const row of syncData.rows) {
    if (!isActiveNearCheckTime(row.lastSyncAt, checkAt, thresholdMs)) continue;

    const branchId = row.branchId || "0";
    if (!activeByBranch[branchId]) {
      activeByBranch[branchId] = {
        branchName: row.branchName || `Branch ${branchId}`,
        stores: [],
      };
    }

    activeByBranch[branchId].stores.push({
      storeCode: row.storeCode,
      storeName: row.storeName,
      lastSyncAt: row.lastSyncAt,
    });
    totalViolations++;

    if (!finalViolationStage) continue;

    if (!finalViolationsByBranch[branchId]) {
      finalViolationsByBranch[branchId] = {
        branchName: row.branchName || `Branch ${branchId}`,
        stores: [],
      };
    }

    finalViolationsByBranch[branchId].stores.push({
      storeCode: row.storeCode,
      storeName: row.storeName,
      lastSyncAt: row.lastSyncAt,
    });
    finalViolationCount++;
  }

  console.log(
    `[afterhours] Found ${totalViolations} active store(s) across ${Object.keys(activeByBranch).length} branch(es)`
  );

  // Persist every active stage so the stored detected_at reflects the latest stage
  // where the store was still online. Later stages upsert over earlier ones.
  if (totalViolations > 0 && sequelize) {
    try {
      for (const [branchId, data] of Object.entries(activeByBranch)) {
        for (const store of data.stores) {
          await sequelize.query(
            `INSERT INTO afterhours_pc_log
               (check_date, store_code, store_name, branch_id, branch_name, last_sync_at, detected_at, notified)
             VALUES ($1, $2, $3, $4, $5, $6, NOW(), FALSE)
             ON CONFLICT (check_date, store_code) DO UPDATE SET
               store_name = COALESCE(EXCLUDED.store_name, afterhours_pc_log.store_name),
               last_sync_at = EXCLUDED.last_sync_at,
               detected_at = NOW()`,
            {
              bind: [
                checkDate,
                store.storeCode,
                store.storeName,
                branchId,
                data.branchName,
                store.lastSyncAt,
              ],
            }
          );
        }
      }

      console.log(
        `[afterhours] Persisted ${totalViolations} active violation(s) to afterhours_pc_log`
      );
    } catch (err) {
      console.error("[afterhours] Failed to persist violations:", err?.message || err);
    }
  }

  // Send notifications based on all active stores at this stage.
  let notifyResults = {};
  if (totalViolations > 0) {
    try {
      const runtimeConfig = await loadAfterhoursRuntimeConfig(sequelize);
      notifyResults = await notifyAfterhoursAlerts(activeByBranch, checkDate, {
        warningType,
        warningStage,
        totalStages,
        config: buildNotifyConfig(runtimeConfig),
      });

      // Mark as notified only for branches with at least one successful delivery.
      if (sequelize && notifyResults && !notifyResults.skipped) {
        const successfulBranchIds = Object.entries(notifyResults)
          .filter(([, branchResult]) => branchResult?.telegram?.ok || branchResult?.whatsapp?.ok)
          .map(([branchId]) => String(branchId));

        if (successfulBranchIds.length > 0) {
          await sequelize
            .query(
              `UPDATE afterhours_pc_log
               SET notified = TRUE
               WHERE check_date = $1
                 AND notified = FALSE
                 AND branch_id = ANY($2::text[])`,
              { bind: [checkDate, successfulBranchIds] }
            )
            .catch(() => {});
        } else {
          console.warn(
            "[afterhours] No successful notification delivery; notified flag not updated"
          );
        }
      }
    } catch (err) {
      console.error("[afterhours] Notification failed:", err?.message || err);
    }
  }

  return {
    checkDate,
    warningType,
    warningStage,
    totalStages,
    scheduledTime,
    totalViolations,
    finalViolations: finalViolationCount,
    branchCount: Object.keys(activeByBranch).length,
    finalBranchCount: Object.keys(finalViolationsByBranch).length,
    byBranch: activeByBranch,
    reportedViolationsByBranch: finalViolationsByBranch,
    notifyResults,
    syncFetchedAt: syncData.fetchedAt,
    branchErrors: syncData.branchErrors,
  };
}

module.exports = {
  runAfterhoursCheck,
  isActiveNearCheckTime,
  resolveThresholdMs,
  isFinalViolationStage,
  loadAfterhoursRuntimeConfig,
  buildNotifyConfig,
};
