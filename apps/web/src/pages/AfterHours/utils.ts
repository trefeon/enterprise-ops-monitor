// ---------------------------------------------------------------------------
// AfterHours — utility / helper functions
// ---------------------------------------------------------------------------
import type {
  NotificationTargetMap,
  NotificationTargetState,
  ScheduleTimes,
  StageTemplates,
  AfterHoursSettings,
  NotificationChannel,
} from './types';
import {
  TELEGRAM_STAGE_TEMPLATE_KEYS,
  WHATSAPP_STAGE_TEMPLATE_KEYS,
  DEFAULT_TELEGRAM_STAGE_TEMPLATES,
  DEFAULT_WHATSAPP_STAGE_TEMPLATES,
} from './constants';

/* ── Date / time formatters ────────────────────────────────────────── */

export function formatWibTime(isoStr?: string | null): string {
  if (!isoStr) return '—';
  try {
    return new Date(isoStr).toLocaleTimeString('en-US', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr + 'T00:00:00+07:00');
    return d.toLocaleDateString('en-US', {
      timeZone: 'Asia/Jakarta',
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/* ── HH:mm helpers ─────────────────────────────────────────────────── */

function isValidHhmm(value: string): boolean {
  return /^\d{2}:\d{2}$/.test(String(value || '').trim());
}

function parseWarningScheduleTimes(value: unknown): string[] {
  const raw = String(value || '').trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item || '').trim()).filter(Boolean);
    }
  } catch {
    // Not JSON; fallback to comma-separated parsing.
  }

  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeWarningScheduleTimes(
  times: string[] | undefined | null,
): ScheduleTimes {
  const values: string[] = [];
  for (const value of times || []) {
    if (values.length >= 4) break;
    values.push(String(value || '').trim());
  }

  while (values.length < 4) {
    values.push('');
  }

  return values as ScheduleTimes;
}

export function deriveWarningScheduleTimes(
  rawSettings: AfterHoursSettings | undefined | null,
): ScheduleTimes {
  const settings = rawSettings || ({} as AfterHoursSettings);
  const parsedFromNewKey = parseWarningScheduleTimes(
    settings.warning_schedule_times,
  );
  return normalizeWarningScheduleTimes(parsedFromNewKey);
}

export function validateWarningScheduleTimes(
  times: string[],
): { ok: false; message: string } | { ok: true; times: ScheduleTimes } {
  const normalized = normalizeWarningScheduleTimes(times);
  const invalidIndex = normalized.findIndex((value) => !isValidHhmm(value));
  if (invalidIndex !== -1) {
    return {
      ok: false,
      message: 'Provide 4 valid manual WIB schedule times before saving.',
    };
  }

  const uniqueCount = new Set(normalized).size;
  if (uniqueCount !== normalized.length) {
    return {
      ok: false,
      message: 'Schedules must be unique and cannot be duplicated.',
    };
  }

  return { ok: true, times: normalized };
}

/* ── Template resolution ───────────────────────────────────────────── */

export function resolveStageTemplates(
  rawSettings: AfterHoursSettings | undefined | null,
  channel: NotificationChannel,
): StageTemplates {
  const settings = rawSettings || ({} as AfterHoursSettings);
  const stageKeys =
    channel === 'telegram' ? TELEGRAM_STAGE_TEMPLATE_KEYS : WHATSAPP_STAGE_TEMPLATE_KEYS;
  const defaults =
    channel === 'telegram'
      ? DEFAULT_TELEGRAM_STAGE_TEMPLATES
      : DEFAULT_WHATSAPP_STAGE_TEMPLATES;
  const legacyInitialKey =
    channel === 'telegram' ? 'telegram_template_initial' : 'whatsapp_template_initial';
  const legacyFinalKey =
    channel === 'telegram' ? 'telegram_template_final' : 'whatsapp_template_final';
  const legacyBaseKey = channel === 'telegram' ? 'telegram_template' : 'whatsapp_template';

  const resolved: string[] = stageKeys.map((key, idx) => {
    const stageValue = String(settings[key] || '').trim();
    if (stageValue) return settings[key] as string;

    if (idx === stageKeys.length - 1) {
      return (settings[legacyFinalKey] as string) || defaults[idx];
    }

    return (settings[legacyInitialKey] as string) || (settings[legacyBaseKey] as string) || defaults[idx];
  });

  return resolved as StageTemplates;
}

/* ── WhatsApp credential normalisation ─────────────────────────────── */

export function normalizeWhatsappCredentials(
  rawSettings: AfterHoursSettings | undefined | null,
): AfterHoursSettings {
  const settings = { ...(rawSettings || ({} as AfterHoursSettings)) } as Record<string, unknown>;
  const apiKey = String(settings.whatsapp_api_key || '').trim();
  const apiSecret = String(settings.whatsapp_api_secret || '').trim();

  // Backward compatibility: split legacy "token.secret" format into separate fields.
  if (!apiSecret && apiKey.includes('.')) {
    const dotIdx = apiKey.indexOf('.');
    const token = apiKey.slice(0, dotIdx).trim();
    const secret = apiKey.slice(dotIdx + 1).trim();
    if (token && secret) {
      settings.whatsapp_api_key = token;
      settings.whatsapp_api_secret = secret;
    }
  }

  return settings as AfterHoursSettings;
}

/* ── Notification target map helpers ───────────────────────────────── */

export function normalizeNotificationTargetMap(
  rawValue: unknown,
): NotificationTargetMap {
  if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawValue)) {
      const normalizedKey = String(key || '').trim();
      const normalizedValue = String(value || '').trim();
      if (!normalizedKey || !normalizedValue) continue;
      normalized[normalizedKey] = normalizedValue;
    }
    return normalized;
  }

  const raw = String(rawValue || '').trim();
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return normalizeNotificationTargetMap(parsed);
    }
  } catch {
    // Backward compatibility: accept a single target string for all branches.
  }

  return { _all: raw };
}

export function serializeNotificationTargetMap(
  targetMap: NotificationTargetMap,
): string {
  return JSON.stringify(normalizeNotificationTargetMap(targetMap));
}

export function buildNotificationTargetState(
  rawValue: unknown,
): NotificationTargetState {
  const mapping = normalizeNotificationTargetMap(rawValue);
  return {
    mapping,
    draft: serializeNotificationTargetMap(mapping),
    error: '',
  };
}

export function getBranchNotificationValue(
  targetMap: NotificationTargetMap,
  branchId: string,
): string {
  if (branchId === '_all') {
    return String(targetMap?._all || '').trim();
  }

  return String(targetMap?.[branchId] || '').trim();
}
