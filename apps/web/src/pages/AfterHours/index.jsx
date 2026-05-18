import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { apiGet, apiPost, apiPut } from '../../lib/api/client';
import PageShell from '../../components/ui/PageShell';
import PageHeader from '../../components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import StatCard from '../../components/shared/StatCard';
import EmptyState from '../../components/shared/EmptyState';
import FeatureStoryBanner from '../../components/FeatureStoryBanner';
import { DatePicker } from '../../components/shared/DatePicker';
import { SearchBar } from '../../components/shared/SearchBar';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { useToast } from '../../components/ui/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { getFeatureStory } from '../../data/stories';
import {
  Loader2,
  RefreshCw,
  Clock,
  CheckCircle2,
  Monitor,
  Store,
  Globe,
  Moon,
  FileText,
  BellRing as NotificationsActive,
  LayoutDashboard,
  Code,
  Send,
  MessageSquare,
  Key,
  Users,
  Link,
  Lock,
  Phone,
  ChevronDown,
  ChevronUp,
  Play,
  Hourglass,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const AfterHoursReport = lazy(() => import('../AfterHoursReport'));

const BRANCH_OPTIONS = [
  { id: '', label: 'All Branches' },
  { id: '2', label: 'North Hub' },
  { id: '3', label: 'East Hub' },
  { id: '4', label: 'Central Hub' },
  { id: '5', label: 'Coastal Hub' },
  { id: '6', label: 'Highland Hub' },
  { id: '7', label: 'West Hub' },
  { id: '8', label: 'River Hub' },
  { id: '9', label: 'South Hub' },
];

const NOTIFICATION_BRANCH_OPTIONS = BRANCH_OPTIONS.filter((branch) => branch.id);

const DEFAULT_TELEGRAM_STAGE_TEMPLATES = [
  [
    '<b>AFTER-HOURS WARNING STAGE 1</b>',
    'Branch: {branch}',
    'Date: {date}',
    '',
    'Detected <b>{count}</b> store(s) still online after operational hours:',
    '{stores}',
    '',
    'Please take immediate action and shutdown any active devices.',
  ].join('\n'),
  [
    '<b>AFTER-HOURS WARNING STAGE 2</b>',
    'Branch: {branch}',
    'Date: {date}',
    '',
    'Still <b>{count}</b> store(s) online:',
    '{stores}',
    '',
    'Please expedite action. Ensure devices are shut down immediately.',
  ].join('\n'),
  [
    '<b>AFTER-HOURS WARNING STAGE 3</b>',
    'Branch: {branch}',
    'Date: {date}',
    '',
    'Still detected <b>{count}</b> store(s) online:',
    '{stores}',
    '',
    'Escalation: Shutdown now to prevent operational violations.',
  ].join('\n'),
  [
    '<b>FINAL AFTER-HOURS WARNING (STAGE 4)</b>',
    'Branch: {branch}',
    'Date: {date}',
    '',
    'Still detected <b>{count}</b> store(s) online:',
    '{stores}',
    '',
    'MANDATORY ACTION REQUIRED: Shutdown immediately and ensure no devices remain active.',
  ].join('\n'),
];

const DEFAULT_WHATSAPP_STAGE_TEMPLATES = [
  [
    'AFTER-HOURS WARNING STAGE 1',
    'Branch: {branch}',
    'Date: {date}',
    '',
    'Detected {count} store(s) still online after operational hours:',
    '{stores}',
    '',
    'Please take immediate action and shutdown any active devices.',
  ].join('\n'),
  [
    'AFTER-HOURS WARNING STAGE 2',
    'Branch: {branch}',
    'Date: {date}',
    '',
    'Still {count} store(s) online:',
    '{stores}',
    '',
    'Please expedite action. Ensure devices are shut down immediately.',
  ].join('\n'),
  [
    'AFTER-HOURS WARNING STAGE 3',
    'Branch: {branch}',
    'Date: {date}',
    '',
    'Still detected {count} store(s) online:',
    '{stores}',
    '',
    'Escalation: Shutdown now to prevent operational violations.',
  ].join('\n'),
  [
    'FINAL AFTER-HOURS WARNING (STAGE 4)',
    'Branch: {branch}',
    'Date: {date}',
    '',
    'Still detected {count} store(s) online:',
    '{stores}',
    '',
    'MANDATORY ACTION REQUIRED: Shutdown immediately and ensure no devices remain active.',
  ].join('\n'),
];

const TELEGRAM_STAGE_TEMPLATE_KEYS = [
  'telegram_template_stage_1',
  'telegram_template_stage_2',
  'telegram_template_stage_3',
  'telegram_template_stage_4',
];

const WHATSAPP_STAGE_TEMPLATE_KEYS = [
  'whatsapp_template_stage_1',
  'whatsapp_template_stage_2',
  'whatsapp_template_stage_3',
  'whatsapp_template_stage_4',
];

const TELEGRAM_CHAT_IDS_SAMPLE_BRANCH =
  '{"2":"-1002100000002","3":"-1002100000003","6":"-1002100000006"}';
const TELEGRAM_CHAT_IDS_SAMPLE_ALL = '{"_all":"-1002100000999"}';
const TELEGRAM_CHAT_ID_SAMPLE_VALUE = '-1002100000002';
const TELEGRAM_CHAT_ID_SAMPLE_FALLBACK = '-1002100000999';
const WHATSAPP_TARGETS_SAMPLE_GROUP_BRANCH =
  '{"2":"120000000000002","3":"120000000000003","6":"120000000000006"}';
const WHATSAPP_TARGETS_SAMPLE_PERSONAL_BRANCH =
  '{"2":"6200000000002","3":"6200000000003","6":"6200000000006"}';
const WHATSAPP_TARGET_SAMPLE_GROUP_VALUE = '120000000000002';
const WHATSAPP_TARGET_SAMPLE_FALLBACK = '120000000000099';
const WHATSAPP_API_KEY_SAMPLE = 'demo-api-key';
const WHATSAPP_API_SECRET_SAMPLE = 'demo-api-secret';
const EMPTY_WARNING_SCHEDULE_TIMES = ['', '', '', ''];

const TOOLBAR_FIELD_CLASS = '!h-10 !rounded-xl !bg-background shadow-sm';
const TOOLBAR_BUTTON_CLASS =
  'w-full justify-center !rounded-xl border border-border/70 bg-background text-foreground shadow-sm hover:bg-muted sm:w-auto';
const NOTIFICATION_FIELD_CLASS = '!h-10 !rounded-xl !bg-background shadow-sm';
const NOTIFICATION_TEXTAREA_CLASS =
  'min-h-56 w-full rounded-2xl border border-input bg-background px-4 py-3 font-mono text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function isValidHhmm(value) {
  return /^\d{2}:\d{2}$/.test(String(value || '').trim());
}

function parseWarningScheduleTimes(value) {
  const raw = String(value || '').trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item || '').trim()).filter(Boolean);
    }
  } catch {
    // Not JSON; fallback to CSV parsing.
  }

  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeWarningScheduleTimes(times) {
  const values = [];
  for (const value of times || []) {
    if (values.length >= 4) break;
    values.push(String(value || '').trim());
  }

  while (values.length < 4) {
    values.push('');
  }

  return values;
}

function deriveWarningScheduleTimes(rawSettings) {
  const settings = rawSettings || {};
  const parsedFromNewKey = parseWarningScheduleTimes(settings.warning_schedule_times);
  return normalizeWarningScheduleTimes(parsedFromNewKey);
}

function validateWarningScheduleTimes(times) {
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

function resolveStageTemplates(rawSettings, channel) {
  const settings = rawSettings || {};
  const stageKeys =
    channel === 'telegram' ? TELEGRAM_STAGE_TEMPLATE_KEYS : WHATSAPP_STAGE_TEMPLATE_KEYS;
  const defaults =
    channel === 'telegram' ? DEFAULT_TELEGRAM_STAGE_TEMPLATES : DEFAULT_WHATSAPP_STAGE_TEMPLATES;
  const legacyInitialKey =
    channel === 'telegram' ? 'telegram_template_initial' : 'whatsapp_template_initial';
  const legacyFinalKey =
    channel === 'telegram' ? 'telegram_template_final' : 'whatsapp_template_final';
  const legacyBaseKey = channel === 'telegram' ? 'telegram_template' : 'whatsapp_template';

  return stageKeys.map((key, idx) => {
    const stageValue = String(settings[key] || '').trim();
    if (stageValue) return settings[key];

    if (idx === stageKeys.length - 1) {
      return settings[legacyFinalKey] || defaults[idx];
    }

    return settings[legacyInitialKey] || settings[legacyBaseKey] || defaults[idx];
  });
}

function normalizeWhatsappCredentials(rawSettings) {
  const settings = { ...(rawSettings || {}) };
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

  return settings;
}

function normalizeNotificationTargetMap(rawValue) {
  if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
    const normalized = {};
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

function serializeNotificationTargetMap(targetMap) {
  return JSON.stringify(normalizeNotificationTargetMap(targetMap));
}

function buildNotificationTargetState(rawValue) {
  const mapping = normalizeNotificationTargetMap(rawValue);
  return {
    mapping,
    draft: serializeNotificationTargetMap(mapping),
    error: '',
  };
}

function getBranchNotificationValue(targetMap, branchId) {
  if (branchId === '_all') {
    return String(targetMap?._all || '').trim();
  }

  return String(targetMap?.[branchId] || '').trim();
}

function NotificationTargetRow({ label, helperText, value, onChange, placeholder, icon: Icon }) {
  return (
    <div className="grid gap-3 rounded-2xl border border-border/60 bg-muted/20 p-3 lg:grid-cols-2 lg:items-center">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{helperText}</p>
      </div>
      <div className="relative w-full min-w-0">
        <div className="absolute left-3 inset-y-0 flex items-center text-muted-foreground pointer-events-none">
          {typeof Icon === 'function' ? <Icon className="size-5" /> : Icon}
        </div>
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${NOTIFICATION_FIELD_CLASS} font-mono pl-10`}
        />
      </div>
    </div>
  );
}

function NotificationTargetEditor({
  icon: Icon,
  description,
  mode,
  branchOptions,
  targetMap,
  targetDraft,
  targetError,
  onBranchTargetChange,
  onDraftChange,
  fallbackPlaceholder,
  branchPlaceholder,
  advancedPlaceholder,
  sampleHint,
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{description}</p>

      {mode === 'branch' ? (
        <div className="space-y-3 rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Branch form menyimpan mapping sebagai JSON di belakang layar. Target yang kosong akan
              memakai fallback <span className="font-medium text-foreground">All Branches</span>.
            </p>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Branch ID → Target
            </span>
          </div>

          <NotificationTargetRow
            label="All Branches fallback"
            helperText="Used when a branch does not have an explicit target."
            value={getBranchNotificationValue(targetMap, '_all')}
            onChange={(value) => onBranchTargetChange('_all', value)}
            placeholder={fallbackPlaceholder}
            icon={<Globe className="size-5" />}
          />

          {branchOptions.map((branchItem) => {
            const branchId = String(branchItem.id);
            return (
              <NotificationTargetRow
                key={branchId}
                label={`${branchItem.label} (${branchId})`}
                helperText={`Leave blank to use the All Branches fallback. Branch ${branchId} data only uses this target when filled.`}
                value={getBranchNotificationValue(targetMap, branchId)}
                onChange={(value) => onBranchTargetChange(branchId, value)}
                placeholder={branchPlaceholder}
                icon={Icon}
              />
            );
          })}

          <p className="text-xs text-muted-foreground">
            {sampleHint} Keep branch-specific values in the matching row; the backend will send only
            that branch&apos;s data to the configured target.
          </p>
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Advanced JSON mode. Use branch IDs as keys and{' '}
              <span className="font-medium text-foreground">_all</span> as fallback. Existing custom
              keys are preserved.
            </p>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Raw JSON
            </span>
          </div>

          <textarea
            value={targetDraft}
            onChange={(e) => onDraftChange(e.target.value)}
            rows={12}
            placeholder={advancedPlaceholder}
            className={NOTIFICATION_TEXTAREA_CLASS}
          />

          {targetError ? (
            <p className="text-xs text-status-danger">{targetError}</p>
          ) : (
            <p className="text-xs text-muted-foreground">{sampleHint}</p>
          )}
        </div>
      )}
    </div>
  );
}

function formatWibTime(isoStr) {
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

function formatDate(dateStr) {
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

export default function AfterHours() {
  const [violations, setViolations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [date, setDate] = useState(() => {
    const now = new Date();
    const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    return wib.toISOString().slice(0, 10);
  });
  const [branch, setBranch] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  /** @type {any} */
  const [settings, setSettings] = useState({});
  const [notificationEditorMode, setNotificationEditorMode] = useState('branch');
  const [telegramTargetMap, setTelegramTargetMap] = useState({});
  const [whatsappTargetMap, setWhatsappTargetMap] = useState({});
  const [telegramTargetsDraft, setTelegramTargetsDraft] = useState('');
  const [whatsappTargetsDraft, setWhatsappTargetsDraft] = useState('');
  const [telegramTargetsError, setTelegramTargetsError] = useState('');
  const [whatsappTargetsError, setWhatsappTargetsError] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [warningScheduleTimes, setWarningScheduleTimes] = useState(EMPTY_WARNING_SCHEDULE_TIMES);
  const [telegramStageTemplates, setTelegramStageTemplates] = useState(
    DEFAULT_TELEGRAM_STAGE_TEMPLATES
  );
  const [whatsappStageTemplates, setWhatsappStageTemplates] = useState(
    DEFAULT_WHATSAPP_STAGE_TEMPLATES
  );
  const { push } = useToast();
  const { user } = useAuth();
  const isDemoUser = user?.isDemo || user?.roleNames?.includes('demo') || user?.role === 'demo';
  const [activeTab, setActiveTab] = useState('monitor');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date, page: String(page), pageSize: '50' });
      if (branch) params.set('branch', branch);
      if (search) params.set('search', search);

      const [listRes, summaryRes] = await Promise.all([
        apiGet(`/afterhours?${params}`),
        apiGet(`/afterhours/summary?date=${date}`),
      ]);

      if (listRes.ok) {
        setViolations(listRes.data.violations || []);
        setPagination(listRes.data.pagination || null);
      }
      if (summaryRes.ok) {
        setSummary(summaryRes.data);
      }
    } catch {
      push({ variant: 'error', title: 'Error', message: 'Failed to load after-hours data' });
    } finally {
      setLoading(false);
    }
  }, [date, branch, search, page, push]);

  const loadDates = useCallback(async () => {
    try {
      const res = await apiGet('/afterhours/dates?limit=60');
      if (res.ok) setAvailableDates(res.data.dates || []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadDates();
  }, [loadDates]);

  // Load notification settings
  const loadSettings = useCallback(async () => {
    try {
      const res = await apiGet('/afterhours/settings');
      if (res.ok) {
        const normalizedSettings = normalizeWhatsappCredentials(res.data.settings);
        setSettings(normalizedSettings);
        const telegramState = buildNotificationTargetState(normalizedSettings.telegram_chat_ids);
        const whatsappState = buildNotificationTargetState(normalizedSettings.whatsapp_targets);
        setTelegramTargetMap(telegramState.mapping);
        setWhatsappTargetMap(whatsappState.mapping);
        setTelegramTargetsDraft(telegramState.draft);
        setWhatsappTargetsDraft(whatsappState.draft);
        setTelegramTargetsError('');
        setWhatsappTargetsError('');
        setWarningScheduleTimes(deriveWarningScheduleTimes(normalizedSettings));
        setTelegramStageTemplates(resolveStageTemplates(normalizedSettings, 'telegram'));
        setWhatsappStageTemplates(resolveStageTemplates(normalizedSettings, 'whatsapp'));
        return true;
      }
    } catch {
      // silent
    }
    return false;
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const syncTelegramTargets = (nextMap, nextDraft = serializeNotificationTargetMap(nextMap)) => {
    setTelegramTargetMap(nextMap);
    setTelegramTargetsDraft(nextDraft);
    setTelegramTargetsError('');
    setSettings((prev) => ({ ...prev, telegram_chat_ids: nextDraft }));
  };

  const syncWhatsappTargets = (nextMap, nextDraft = serializeNotificationTargetMap(nextMap)) => {
    setWhatsappTargetMap(nextMap);
    setWhatsappTargetsDraft(nextDraft);
    setWhatsappTargetsError('');
    setSettings((prev) => ({ ...prev, whatsapp_targets: nextDraft }));
  };

  const handleNotificationModeChange = (nextMode) => {
    if (nextMode === notificationEditorMode) return;
    const nextTelegramDraft = serializeNotificationTargetMap(telegramTargetMap);
    const nextWhatsappDraft = serializeNotificationTargetMap(whatsappTargetMap);
    setTelegramTargetsDraft(nextTelegramDraft);
    setWhatsappTargetsDraft(nextWhatsappDraft);
    setTelegramTargetsError('');
    setWhatsappTargetsError('');
    setNotificationEditorMode(nextMode);
  };

  const updateNotificationBranchTarget = (channel, branchId, value) => {
    if (channel === 'telegram') {
      const nextMap = normalizeNotificationTargetMap({ ...telegramTargetMap, [branchId]: value });
      syncTelegramTargets(nextMap);
      return;
    }

    const nextMap = normalizeNotificationTargetMap({ ...whatsappTargetMap, [branchId]: value });
    syncWhatsappTargets(nextMap);
  };

  const updateNotificationDraft = (channel, value) => {
    const draftValue = String(value ?? '');
    const raw = draftValue.trim();

    if (channel === 'telegram') {
      setTelegramTargetsDraft(draftValue);
      setSettings((prev) => ({ ...prev, telegram_chat_ids: draftValue }));

      if (!raw) {
        setTelegramTargetMap({});
        setTelegramTargetsError('');
        return;
      }

      try {
        const parsed = JSON.parse(draftValue);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          setTelegramTargetMap(normalizeNotificationTargetMap(parsed));
          setTelegramTargetsError('');
          return;
        }
      } catch {
        // fall through to validation error below
      }

      setTelegramTargetsError('JSON must be an object like {"2":"-100...","_all":"-100..."}');
      return;
    }

    setWhatsappTargetsDraft(draftValue);
    setSettings((prev) => ({ ...prev, whatsapp_targets: draftValue }));

    if (!raw) {
      setWhatsappTargetMap({});
      setWhatsappTargetsError('');
      return;
    }

    try {
      const parsed = JSON.parse(draftValue);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        setWhatsappTargetMap(normalizeNotificationTargetMap(parsed));
        setWhatsappTargetsError('');
        return;
      }
    } catch {
      // fall through to validation error below
    }

    setWhatsappTargetsError('JSON must be an object like {"2":"120...","_all":"120..."}');
  };

  const updateScheduleTime = (index, value) => {
    setWarningScheduleTimes((prev) => {
      const next = normalizeWarningScheduleTimes(prev);
      next[index] = value;
      return next;
    });
  };

  const updateTemplateByStage = (channel, stageIndex, value) => {
    if (channel === 'telegram') {
      setTelegramStageTemplates((prev) => {
        const next = [...prev];
        next[stageIndex] = value;
        return next;
      });
      return;
    }

    setWhatsappStageTemplates((prev) => {
      const next = [...prev];
      next[stageIndex] = value;
      return next;
    });
  };

  const handleSaveSettings = async () => {
    if (isDemoUser) {
      push({
        variant: 'warning',
        title: 'Demo Account',
        message: 'This action is not available in the demo account.',
      });
      return;
    }
    setSavingSettings(true);
    try {
      const scheduleValidation = validateWarningScheduleTimes(warningScheduleTimes);
      if (!scheduleValidation.ok) {
        push({
          variant: 'error',
          title: 'Error',
          message: scheduleValidation.message,
        });
        return;
      }

      const normalizedSchedule = scheduleValidation.times;
      const normalizedTelegramTemplates = TELEGRAM_STAGE_TEMPLATE_KEYS.map(
        (_, idx) => telegramStageTemplates[idx] || DEFAULT_TELEGRAM_STAGE_TEMPLATES[idx]
      );
      const normalizedWhatsappTemplates = WHATSAPP_STAGE_TEMPLATE_KEYS.map(
        (_, idx) => whatsappStageTemplates[idx] || DEFAULT_WHATSAPP_STAGE_TEMPLATES[idx]
      );
      const telegramChatIdsValue = serializeNotificationTargetMap(telegramTargetMap);
      const whatsappTargetsValue = serializeNotificationTargetMap(whatsappTargetMap);

      if (notificationEditorMode === 'advanced' && (telegramTargetsError || whatsappTargetsError)) {
        push({
          variant: 'error',
          title: 'Error',
          message: 'Fix the JSON mapping error before saving notification settings',
        });
        return;
      }

      const settingsToSave = {
        ...settings,
        warning_schedule_times: JSON.stringify(normalizedSchedule),
        first_warning_time: normalizedSchedule[0],
        final_warning_time: normalizedSchedule[normalizedSchedule.length - 1],
        telegram_template_initial: normalizedTelegramTemplates[0],
        telegram_template_final: normalizedTelegramTemplates[3],
        whatsapp_template_initial: normalizedWhatsappTemplates[0],
        whatsapp_template_final: normalizedWhatsappTemplates[3],
        telegram_chat_ids: telegramChatIdsValue,
        whatsapp_targets: whatsappTargetsValue,
        monthly_report_whatsapp_targets: String(
          settings.monthly_report_whatsapp_targets || ''
        ).trim(),
      };

      TELEGRAM_STAGE_TEMPLATE_KEYS.forEach((key, idx) => {
        settingsToSave[key] = normalizedTelegramTemplates[idx];
      });
      WHATSAPP_STAGE_TEMPLATE_KEYS.forEach((key, idx) => {
        settingsToSave[key] = normalizedWhatsappTemplates[idx];
      });

      const res = await apiPut('/afterhours/settings', { settings: settingsToSave });
      if (res.ok) {
        setSettings(settingsToSave);
        setTelegramTargetMap(normalizeNotificationTargetMap(settingsToSave.telegram_chat_ids));
        setWhatsappTargetMap(normalizeNotificationTargetMap(settingsToSave.whatsapp_targets));
        setTelegramTargetsDraft(settingsToSave.telegram_chat_ids);
        setWhatsappTargetsDraft(settingsToSave.whatsapp_targets);
        setWarningScheduleTimes(normalizedSchedule);
        setTelegramStageTemplates(normalizedTelegramTemplates);
        setWhatsappStageTemplates(normalizedWhatsappTemplates);
        push({ variant: 'success', title: 'Saved', message: 'Notification settings saved' });
      } else {
        push({ variant: 'error', title: 'Error', message: res.error?.message || 'Failed to save' });
      }
    } catch {
      push({ variant: 'error', title: 'Error', message: 'Failed to save settings' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDiscardSettings = async () => {
    const restored = await loadSettings();
    if (restored) {
      push({
        variant: 'success',
        title: 'Restored',
        message: 'Settings restored from server values',
      });
    }
  };

  const handleRunCheck = async () => {
    if (isDemoUser) {
      push({
        variant: 'warning',
        title: 'Demo Account',
        message: 'This action is not available in the demo account.',
      });
      return;
    }
    setChecking(true);
    try {
      const res = await apiPost('/afterhours/check', {
        runAllStages: true,
        stageDelayMs: 2000,
      });
      if (res.ok) {
        const stageResults = Array.isArray(res.data?.stageResults) ? res.data.stageResults : [];
        const stageSummary =
          stageResults.length > 0
            ? stageResults
                .map(
                  (stage) =>
                    `S${stage.warningStage}(${stage.scheduledTime}) TG ${stage.telegramSuccess || 0}/${stage.telegramAttempt || 0}`
                )
                .join(' | ')
            : null;

        push({
          variant: 'success',
          title: 'Check Complete',
          message: stageSummary
            ? `Run test 4 tahap selesai. ${stageSummary}`
            : `Found ${res.data.totalViolations || 0} violation(s) across ${res.data.branchCount || 0} branch(es)`,
        });
        loadData();
        loadDates();
      } else {
        push({
          variant: 'error',
          title: 'Check Failed',
          message: res.error?.message || 'Failed to run after-hours check',
        });
      }
    } catch {
      push({ variant: 'error', title: 'Error', message: 'Failed to run check' });
    } finally {
      setChecking(false);
    }
  };

  const totalViolations = summary?.totalViolations || 0;
  const branchSummaries = summary?.byBranch || [];
  const branchCount = branchSummaries.length;
  const latestSyncIso = branchSummaries.reduce((latest, row) => {
    if (!row?.latest_sync) return latest;
    if (!latest) return row.latest_sync;
    return new Date(row.latest_sync).getTime() > new Date(latest).getTime()
      ? row.latest_sync
      : latest;
  }, null);
  const latestSyncTime = formatWibTime(latestSyncIso);

  const notifyEnabled = settings.notify_enabled === 'true' || settings.notify_enabled === true;
  const normalizedScheduleTimes = normalizeWarningScheduleTimes(warningScheduleTimes);

  const totalItems = pagination?.total || violations.length || 0;
  const totalPages = pagination?.totalPages || 1;
  const rangeStart = totalItems === 0 ? 0 : (page - 1) * 50 + 1;
  const rangeEnd = Math.min(page * 50, totalItems);
  const selectedBranchLabel =
    BRANCH_OPTIONS.find((item) => item.id === branch)?.label ||
    branchSummaries.find((row) => String(row.branch_id) === String(branch))?.branch_name ||
    'All Branches';

  return (
    <PageShell>
      <FeatureStoryBanner story={getFeatureStory('after-hours')} />
      <PageHeader
        title="After-Hours PC Monitor"
        subtitle="Detect store computers still online after operational hours"
        actions={
          activeTab === 'monitor' ? (
            <Button onClick={handleRunCheck}>
              {checking ? (
                <Hourglass className="animate-spin mr-2 size-4" />
              ) : (
                <Play className="mr-2 size-4" />
              )}
              {checking ? 'Running...' : 'Run Check Now'}
            </Button>
          ) : null
        }
      />
      {/* Tab Bar */}
      <div className="flex items-center gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab('monitor')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'monitor'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Moon className="size-4" />
          Daily Monitor
        </button>
        <button
          onClick={() => setActiveTab('report')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'report'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="size-4" />
          Monthly Report
        </button>
      </div>
      {activeTab === 'report' ? (
        <Suspense
          fallback={
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          }
        >
          <AfterHoursReport />
        </Suspense>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-border bg-muted/20 px-6 py-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <NotificationsActive className="size-5 text-primary" />
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Automation & Notification Settings
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Configure Telegram and WhatsApp alerts for after-hours violations.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notifyEnabled}
                  onClick={() => updateSetting('notify_enabled', notifyEnabled ? 'false' : 'true')}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                    notifyEnabled
                      ? 'bg-status-success focus-visible:ring-status-success'
                      : 'bg-secondary-foreground/20 focus-visible:ring-secondary-foreground/50'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      notifyEnabled ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
                <span
                  className={`text-xs font-semibold ${
                    notifyEnabled ? 'text-status-success' : 'text-muted-foreground'
                  }`}
                >
                  {notifyEnabled ? 'ENABLED' : 'DISABLED'}
                </span>
                <Button variant="ghost" size="sm" onClick={() => setShowSettings((prev) => !prev)}>
                  {showSettings ? (
                    <ChevronUp className="mr-2 size-4" />
                  ) : (
                    <ChevronDown className="mr-2 size-4" />
                  )}
                  {showSettings ? 'Hide' : 'Configure'}
                </Button>
              </div>
            </div>
            {showSettings && (
              <>
                <div className="flex flex-col gap-3 border-b border-border bg-muted/10 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <p className="text-xs text-muted-foreground">
                    Branch form adalah mode default. Advanced JSON dipakai kalau mau custom penuh
                    atau bulk edit mapping.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant={notificationEditorMode === 'branch' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => handleNotificationModeChange('branch')}
                    >
                      <LayoutDashboard className="mr-2 size-4" />
                      Per Branch Form
                    </Button>
                    <Button
                      variant={notificationEditorMode === 'advanced' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => handleNotificationModeChange('advanced')}
                    >
                      <Code className="mr-2 size-4" />
                      Advanced JSON
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-8 px-6 py-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <h4 className="mb-2 flex items-center gap-2 border-b border-border/30 pb-2 text-sm font-semibold text-foreground">
                      <Send className="size-4 text-status-info" />
                      Telegram Configuration
                    </h4>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                        Bot Token
                      </label>
                      <div className="relative w-full">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                        <Input
                          type="password"
                          value={settings.telegram_bot_token || ''}
                          onChange={(e) => updateSetting('telegram_bot_token', e.target.value)}
                          placeholder="demo-telegram-bot-token"
                          className="pl-10"
                        />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Isi token bot Telegram dari BotFather. Contoh dummy:{' '}
                        <code className="text-foreground">demo-telegram-bot-token</code>
                      </p>
                    </div>

                    <div>
                      <NotificationTargetEditor
                        icon={Users}
                        description="Map each branch to a Telegram chat or group. Branch data is only sent to the target keyed by that branch ID, with _all as fallback."
                        mode={notificationEditorMode}
                        branchOptions={NOTIFICATION_BRANCH_OPTIONS}
                        targetMap={telegramTargetMap}
                        targetDraft={telegramTargetsDraft}
                        targetError={telegramTargetsError}
                        onBranchTargetChange={(branchId, value) =>
                          updateNotificationBranchTarget('telegram', branchId, value)
                        }
                        onDraftChange={(value) => updateNotificationDraft('telegram', value)}
                        fallbackPlaceholder={TELEGRAM_CHAT_ID_SAMPLE_FALLBACK}
                        branchPlaceholder={TELEGRAM_CHAT_ID_SAMPLE_VALUE}
                        advancedPlaceholder='{"2":"-1002100000002","3":"-1002100000003","_all":"-1002100000999"}'
                        sampleHint="Example: branch 2 to group A, branch 3 to group B. If a branch is blank, _all will be used."
                      />
                    </div>

                    {normalizedScheduleTimes.map((timeValue, idx) => {
                      const stageLabel =
                        idx === normalizedScheduleTimes.length - 1 ? 'Strict' : 'Early';
                      return (
                        <div key={`telegram-template-stage-${idx}`}>
                          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                            {`Telegram Stage ${idx + 1} Template (${stageLabel} - ${timeValue})`}
                          </label>
                          <textarea
                            value={
                              telegramStageTemplates[idx] || DEFAULT_TELEGRAM_STAGE_TEMPLATES[idx]
                            }
                            onChange={(e) => updateTemplateByStage('telegram', idx, e.target.value)}
                            rows={4}
                            className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                        </div>
                      );
                    })}

                    <p className="mt-1.5 inline-block rounded bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
                      Variables: <code className="text-foreground">{'{branch}'}</code>,{' '}
                      <code className="text-foreground">{'{date}'}</code>,{' '}
                      <code className="text-foreground">{'{count}'}</code>,{' '}
                      <code className="text-foreground">{'{stores}'}</code>,{' '}
                      <code className="text-foreground">{'{stage}'}</code>,{' '}
                      <code className="text-foreground">{'{totalStages}'}</code>
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="mb-2 flex items-center gap-2 border-b border-border/30 pb-2 text-sm font-semibold text-foreground">
                      <MessageSquare className="size-4 text-status-success" />
                      WhatsApp Gateway (API)
                    </h4>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                        API URL
                      </label>
                      <div className="relative w-full">
                        <Link className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                        <Input
                          type="text"
                          value={settings.whatsapp_api_url || ''}
                          onChange={(e) => updateSetting('whatsapp_api_url', e.target.value)}
                          placeholder="https://notifications.example.com/"
                          className="pl-10"
                        />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Untuk Webhook Gateway cukup isi host. Sistem akan otomatis pakai endpoint
                        API yang sesuai.
                      </p>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                        API Key
                      </label>
                      <div className="relative w-full">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                        <Input
                          type="password"
                          value={settings.whatsapp_api_key || ''}
                          onChange={(e) => updateSetting('whatsapp_api_key', e.target.value)}
                          placeholder={WHATSAPP_API_KEY_SAMPLE}
                          className="pl-10"
                        />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Isi token API key saja (tanpa digabung secret). Contoh dummy API key:{' '}
                        <code className="text-foreground">{WHATSAPP_API_KEY_SAMPLE}</code>
                      </p>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                        Secret Key
                      </label>
                      <div className="relative w-full">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                        <Input
                          type="password"
                          value={settings.whatsapp_api_secret || ''}
                          onChange={(e) => updateSetting('whatsapp_api_secret', e.target.value)}
                          placeholder={WHATSAPP_API_SECRET_SAMPLE}
                          className="pl-10"
                        />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Isi secret key terpisah. Sistem akan menggabungkan otomatis saat request ke
                        Webhook Gateway.
                      </p>
                    </div>

                    <div>
                      <NotificationTargetEditor
                        icon={Phone}
                        description="Map each branch to a WhatsApp target. The target can be a group ID or a personal number, and only the matching branch payload will be sent there."
                        mode={notificationEditorMode}
                        branchOptions={NOTIFICATION_BRANCH_OPTIONS}
                        targetMap={whatsappTargetMap}
                        targetDraft={whatsappTargetsDraft}
                        targetError={whatsappTargetsError}
                        onBranchTargetChange={(branchId, value) =>
                          updateNotificationBranchTarget('whatsapp', branchId, value)
                        }
                        onDraftChange={(value) => updateNotificationDraft('whatsapp', value)}
                        fallbackPlaceholder={WHATSAPP_TARGET_SAMPLE_FALLBACK}
                        branchPlaceholder={WHATSAPP_TARGET_SAMPLE_GROUP_VALUE}
                        advancedPlaceholder='{"2":"120000000000002","3":"120000000000003","_all":"120000000000099"}'
                        sampleHint="Use a group ID for groups or a personal number for one-to-one delivery. Blank rows fall back to _all."
                      />
                    </div>

                    {normalizedScheduleTimes.map((timeValue, idx) => {
                      const stageLabel =
                        idx === normalizedScheduleTimes.length - 1 ? 'Strict' : 'Early';
                      return (
                        <div key={`whatsapp-template-stage-${idx}`}>
                          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                            {`WhatsApp Stage ${idx + 1} Template (${stageLabel} - ${timeValue})`}
                          </label>
                          <textarea
                            value={
                              whatsappStageTemplates[idx] || DEFAULT_WHATSAPP_STAGE_TEMPLATES[idx]
                            }
                            onChange={(e) => updateTemplateByStage('whatsapp', idx, e.target.value)}
                            rows={4}
                            className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                        </div>
                      );
                    })}

                    <p className="mt-1.5 inline-block rounded bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
                      Variables: <code className="text-foreground">{'{branch}'}</code>,{' '}
                      <code className="text-foreground">{'{date}'}</code>,{' '}
                      <code className="text-foreground">{'{count}'}</code>,{' '}
                      <code className="text-foreground">{'{stores}'}</code>,{' '}
                      <code className="text-foreground">{'{stage}'}</code>,{' '}
                      <code className="text-foreground">{'{totalStages}'}</code>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-4 border-t border-border bg-muted/10 px-6 py-4 md:flex-row md:items-end md:justify-between">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
                    <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {normalizedScheduleTimes.map((timeValue, idx) => (
                        <div key={`schedule-stage-${idx}`} className="w-full md:w-44">
                          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                            <Clock className="size-3.5" />
                            {`Schedule ${idx + 1} (WIB)`}
                          </label>
                          <div className="relative">
                            <div className="pointer-events-none absolute left-3 inset-y-0 flex items-center text-muted-foreground/50">
                              <Clock className="size-4" />
                            </div>
                            <Input
                              type="time"
                              value={timeValue}
                              onChange={(e) => updateScheduleTime(idx, e.target.value)}
                              className="!pl-11"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={handleDiscardSettings}>
                      Discard
                    </Button>
                    <Button onClick={handleSaveSettings}>
                      {savingSettings ? (
                        <Loader2 className="animate-spin mr-2 size-4" />
                      ) : (
                        <FileText className="mr-2 size-4" />
                      )}
                      {savingSettings ? 'Saving...' : 'Save Settings'}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>
          <Card className="py-2 overflow-hidden rounded-[2rem] bg-muted/5 border-border/40 shadow-sm">
            <CardContent className="py-2 px-4">
              <div className="flex flex-col xl:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <span className="absolute left-10 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 pointer-events-none hidden md:block">
                    SEARCH FOR
                  </span>
                  <SearchBar
                    value={search}
                    onValueChange={(val) => {
                      setSearch(val);
                      setPage(1);
                    }}
                    placeholder="Search by store code or name..."
                    className="rounded-full h-11 border-border/60 bg-background/50 hover:bg-background transition-colors md:pl-28"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 w-full xl:w-auto">
                  <div className="relative w-full sm:w-auto">
                    <Select
                      value={branch}
                      onValueChange={(val) => {
                        setBranch(val);
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="w-full md:w-60 h-11 rounded-full border-border/60 bg-background/50 hover:bg-background transition-colors px-4 flex items-center justify-start gap-2">
                        <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                          BRANCH:
                        </span>
                        <SelectValue placeholder="All Branches">
                          <span className="font-bold text-foreground">
                            {branch
                              ? BRANCH_OPTIONS.find((b) => b.id === String(branch))?.label
                              : 'ALL'}
                          </span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {BRANCH_OPTIONS.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="relative w-full sm:w-auto">
                    <span className="absolute left-10 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 pointer-events-none hidden md:block z-10">
                      FOR
                    </span>
                    <DatePicker
                      value={date}
                      onValueChange={(val) => {
                        setDate(val);
                        setPage(1);
                      }}
                      className="rounded-full h-11 border-border/60 bg-background/50 hover:bg-background transition-colors w-full md:w-52 md:pl-20"
                    />
                  </div>

                  <Button
                    variant="ghost"
                    size="md"
                    className="h-11 rounded-full border border-border/60 bg-background/50 hover:bg-foreground hover:text-background transition-all px-6 w-full sm:w-auto group/reset"
                    onClick={() => {
                      setSearch('');
                      setBranch('');
                      setPage(1);
                    }}
                  >
                    <RefreshCw className="mr-2 size-4 group-hover/reset:rotate-180 transition-transform duration-500" />
                    Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          {availableDates.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Recent Checks:</span>
              {availableDates.slice(0, 7).map((d) => (
                <button
                  key={d.check_date}
                  onClick={() => {
                    setDate(d.check_date);
                    setPage(1);
                  }}
                  className={`rounded-full px-3 py-1 text-xs transition-colors ${
                    d.check_date === date
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {d.check_date} ({d.violation_count})
                </button>
              ))}
            </div>
          )}
          {branchSummaries.length > 0 && (
            <Card className="py-3">
              <CardContent>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Violations by Branch</h3>
                  <span className="text-xs text-muted-foreground">
                    {branchCount} branch(es) affected on {formatDate(date)}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBranch('');
                      setPage(1);
                    }}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      !branch
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    All Branches ({totalViolations})
                  </button>
                  {branchSummaries.map((b) => {
                    const branchId = String(b.branch_id);
                    return (
                      <button
                        key={b.branch_id}
                        type="button"
                        onClick={() => {
                          setBranch(branch === branchId ? '' : branchId);
                          setPage(1);
                        }}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          branch === branchId
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                        }`}
                      >
                        {b.branch_name || `Branch ${b.branch_id}`} ({b.violation_count})
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
          {/* Data Table */}
          <Card className="p-0 overflow-hidden">
            <CardContent className="p-0">
              {!loading && violations.length > 0 && (
                <div className="flex flex-col gap-1 border-b border-border bg-muted/20 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-medium text-foreground">
                    {selectedBranchLabel} • {formatDate(date)}
                  </span>
                  <span className="text-muted-foreground">
                    {totalItems} violation(s){' '}
                    {branch ? 'in selected branch' : 'across all branches'}
                  </span>
                </div>
              )}
              {loading ? (
                <div className="flex justify-center items-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : violations.length === 0 ? (
                <EmptyState
                  title="No violations found"
                  description={`No after-hours violations detected for ${formatDate(date)}.`}
                  icon={<CheckCircle2 className="size-8 text-status-success/40" />}
                />
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>PC Identification</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead>Last Active (WIB)</TableHead>
                        <TableHead>Detected At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {violations.map((v) => {
                        const statusLabel = v.notified ? 'NOTIFIED' : 'PENDING';
                        const statusTextClass = v.notified
                          ? 'text-status-success'
                          : 'text-status-warning';
                        const statusDotClass = v.notified
                          ? 'bg-status-success'
                          : 'bg-status-warning animate-pulse';
                        return (
                          <TableRow key={v.id}>
                            <TableCell>
                              <span
                                className={`inline-flex items-center gap-1.5 text-xs font-semibold ${statusTextClass}`}
                              >
                                <span className={`h-2 w-2 rounded-full ${statusDotClass}`} />
                                {statusLabel}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-xs text-foreground tabular-nums">
                                  {v.store_code}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {v.store_name || '—'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                                {v.branch_name || v.branch_id}
                              </span>
                            </TableCell>
                            <TableCell
                              className={`text-xs tabular-nums ${
                                v.last_sync_at ? 'text-status-warning' : 'text-muted-foreground'
                              }`}
                            >
                              {formatWibTime(v.last_sync_at)}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground tabular-nums">
                              {formatWibTime(v.detected_at)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {pagination && totalPages > 1 && (
                    <div className="flex flex-col gap-3 border-t border-border bg-card px-cell-x py-cell-y text-xs sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-muted-foreground">
                        Showing <span className="font-medium text-foreground">{rangeStart}</span> to{' '}
                        <span className="font-medium text-foreground">{rangeEnd}</span> of{' '}
                        <span className="font-medium text-foreground">{totalItems}</span> results
                      </span>
                      <div className="flex w-full gap-2 sm:w-auto">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={page <= 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          className="flex-1 sm:flex-none"
                        >
                          Previous
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={page >= totalPages}
                          onClick={() => setPage((p) => p + 1)}
                          className="flex-1 sm:flex-none"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <StatCard
              title="PCs Still Online"
              value={totalViolations}
              icon={<Monitor className="size-5" />}
              status={totalViolations > 0 ? 'error' : 'success'}
              subtext={formatDate(date)}
              className={
                totalViolations > 0
                  ? 'border-destructive/30 bg-destructive/5'
                  : 'border-status-success/30 bg-status-success/5'
              }
            />
            <StatCard
              title="Branches Affected"
              value={branchCount}
              icon={<Store className="size-5" />}
              status={branchCount > 0 ? 'warning' : 'success'}
              subtext={branch ? `Filtered: ${selectedBranchLabel}` : 'All monitored branches'}
              className={
                branchCount > 0
                  ? 'border-status-warning/30 bg-status-warning/5'
                  : 'border-status-success/30 bg-status-success/5'
              }
            />
            <StatCard
              title="Latest Last Sync"
              value={latestSyncTime}
              icon={<Clock className="size-5" />}
              status="info"
              className="border-status-info/30 bg-status-info/5"
            />
          </div>
        </> /* end monitor tab */
      )}
    </PageShell>
  );
}
