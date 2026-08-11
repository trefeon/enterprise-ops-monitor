// @ts-nocheck
// ---------------------------------------------------------------------------
// AfterHours — main hook (state + handlers + derived values)
// ---------------------------------------------------------------------------
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { apiGet, apiPost, apiPut } from '../../../lib/api/client';
import { useAuth } from '../../../context/AuthContext';
import type {
  Violation,
  AfterHoursSummary,
  PaginationInfo,
  AfterHoursSettings,
  NotificationTargetMap,
  NotificationEditorMode,
  ScheduleTimes,
  StageTemplates,
  ActiveTab,
  AvailableDate,
} from '../types';
import {
  DEFAULT_TELEGRAM_STAGE_TEMPLATES,
  DEFAULT_WHATSAPP_STAGE_TEMPLATES,
  EMPTY_WARNING_SCHEDULE_TIMES,
  BRANCH_OPTIONS,
  PAGE_SIZE,
  TELEGRAM_STAGE_TEMPLATE_KEYS,
  WHATSAPP_STAGE_TEMPLATE_KEYS,
} from '../constants';
import {
  normalizeWhatsappCredentials,
  buildNotificationTargetState,
  serializeNotificationTargetMap,
  normalizeNotificationTargetMap,
  deriveWarningScheduleTimes,
  resolveStageTemplates,
  normalizeWarningScheduleTimes,
  validateWarningScheduleTimes,
  formatWibTime,
} from '../utils';
import { demoBlocked } from '@/components/base/demo-toast';

export interface AfterHoursDerived {
  totalViolations: number;
  branchSummaries: AfterHoursSummary['byBranch'];
  branchCount: number;
  latestSyncTime: string;
  notifyEnabled: boolean;
  normalizedScheduleTimes: ScheduleTimes;
  totalItems: number;
  totalPages: number;
  rangeStart: number;
  rangeEnd: number;
  selectedBranchLabel: string;
  isDemoUser: boolean;
}

export interface AfterHoursState {
  violations: Violation[];
  summary: AfterHoursSummary | null;
  loading: boolean;
  checking: boolean;
  date: string;
  branch: string;
  search: string;
  page: number;
  pagination: PaginationInfo | null;
  availableDates: AvailableDate[];
  showSettings: boolean;
  settings: AfterHoursSettings;
  notificationEditorMode: NotificationEditorMode;
  telegramTargetMap: NotificationTargetMap;
  whatsappTargetMap: NotificationTargetMap;
  telegramTargetsDraft: string;
  whatsappTargetsDraft: string;
  telegramTargetsError: string;
  whatsappTargetsError: string;
  savingSettings: boolean;
  warningScheduleTimes: ScheduleTimes;
  telegramStageTemplates: StageTemplates;
  whatsappStageTemplates: StageTemplates;
  activeTab: ActiveTab;
}

export interface AfterHoursActions {
  setBranch: React.Dispatch<React.SetStateAction<string>>;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  setDate: React.Dispatch<React.SetStateAction<string>>;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  setShowSettings: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveTab: React.Dispatch<React.SetStateAction<ActiveTab>>;
  setNotificationEditorMode: React.Dispatch<React.SetStateAction<NotificationEditorMode>>;
  loadData: () => Promise<void>;
  loadDates: () => Promise<void>;
  loadSettings: () => Promise<boolean>;
  updateSetting: (key: string, value: unknown) => void;
  syncTelegramTargets: (nextMap: NotificationTargetMap, nextDraft?: string) => void;
  syncWhatsappTargets: (nextMap: NotificationTargetMap, nextDraft?: string) => void;
  handleNotificationModeChange: (nextMode: NotificationEditorMode) => void;
  updateNotificationBranchTarget: (
    channel: 'telegram' | 'whatsapp',
    branchId: string,
    value: string
  ) => void;
  updateNotificationDraft: (channel: 'telegram' | 'whatsapp', value: string) => void;
  updateScheduleTime: (index: number, value: string) => void;
  updateTemplateByStage: (
    channel: 'telegram' | 'whatsapp',
    stageIndex: number,
    value: string
  ) => void;
  handleSaveSettings: () => Promise<void>;
  handleDiscardSettings: () => Promise<void>;
  handleRunCheck: () => Promise<void>;
}

export function useAfterHours(): {
  state: AfterHoursState;
  derived: AfterHoursDerived;
  actions: AfterHoursActions;
} {
  // ── Core state ────────────────────────────────────────────────────
  const [violations, setViolations] = useState<Violation[]>([]);
  const [summary, setSummary] = useState<AfterHoursSummary | null>(null);
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
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<AfterHoursSettings>({});
  const [notificationEditorMode, setNotificationEditorMode] =
    useState<NotificationEditorMode>('branch');
  const [telegramTargetMap, setTelegramTargetMap] = useState<NotificationTargetMap>({});
  const [whatsappTargetMap, setWhatsappTargetMap] = useState<NotificationTargetMap>({});
  const [telegramTargetsDraft, setTelegramTargetsDraft] = useState('');
  const [whatsappTargetsDraft, setWhatsappTargetsDraft] = useState('');
  const [telegramTargetsError, setTelegramTargetsError] = useState('');
  const [whatsappTargetsError, setWhatsappTargetsError] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [warningScheduleTimes, setWarningScheduleTimes] = useState<ScheduleTimes>(
    EMPTY_WARNING_SCHEDULE_TIMES
  );
  const [telegramStageTemplates, setTelegramStageTemplates] = useState<StageTemplates>(
    DEFAULT_TELEGRAM_STAGE_TEMPLATES
  );
  const [whatsappStageTemplates, setWhatsappStageTemplates] = useState<StageTemplates>(
    DEFAULT_WHATSAPP_STAGE_TEMPLATES
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>('monitor');

  const { user } = useAuth();
  const isDemoUser = user?.isDemo || user?.roleNames?.includes('demo') || user?.role === 'demo';

  // ── Data loading ──────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        date,
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
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
      toast.error('Error', {
        description: 'Failed to load after-hours data',
      });
    } finally {
      setLoading(false);
    }
  }, [date, branch, search, page]);

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

  // ── Settings loading ──────────────────────────────────────────────
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

  // ── Setting helpers ───────────────────────────────────────────────
  const updateSetting = (key: string, value: unknown) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const syncTelegramTargets = (
    nextMap: NotificationTargetMap,
    nextDraft = serializeNotificationTargetMap(nextMap)
  ) => {
    setTelegramTargetMap(nextMap);
    setTelegramTargetsDraft(nextDraft);
    setTelegramTargetsError('');
    setSettings((prev) => ({ ...prev, telegram_chat_ids: nextDraft }));
  };

  const syncWhatsappTargets = (
    nextMap: NotificationTargetMap,
    nextDraft = serializeNotificationTargetMap(nextMap)
  ) => {
    setWhatsappTargetMap(nextMap);
    setWhatsappTargetsDraft(nextDraft);
    setWhatsappTargetsError('');
    setSettings((prev) => ({ ...prev, whatsapp_targets: nextDraft }));
  };

  const handleNotificationModeChange = (nextMode: NotificationEditorMode) => {
    if (nextMode === notificationEditorMode) return;
    const nextTelegramDraft = serializeNotificationTargetMap(telegramTargetMap);
    const nextWhatsappDraft = serializeNotificationTargetMap(whatsappTargetMap);
    setTelegramTargetsDraft(nextTelegramDraft);
    setWhatsappTargetsDraft(nextWhatsappDraft);
    setTelegramTargetsError('');
    setWhatsappTargetsError('');
    setNotificationEditorMode(nextMode);
  };

  const updateNotificationBranchTarget = (
    channel: 'telegram' | 'whatsapp',
    branchId: string,
    value: string
  ) => {
    if (channel === 'telegram') {
      const nextMap = normalizeNotificationTargetMap({
        ...telegramTargetMap,
        [branchId]: value,
      });
      syncTelegramTargets(nextMap);
      return;
    }

    const nextMap = normalizeNotificationTargetMap({
      ...whatsappTargetMap,
      [branchId]: value,
    });
    syncWhatsappTargets(nextMap);
  };

  const updateNotificationDraft = (channel: 'telegram' | 'whatsapp', value: string) => {
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

  const updateScheduleTime = (index: number, value: string) => {
    setWarningScheduleTimes((prev) => {
      const next = normalizeWarningScheduleTimes(prev);
      next[index] = value;
      return next;
    });
  };

  const updateTemplateByStage = (
    channel: 'telegram' | 'whatsapp',
    stageIndex: number,
    value: string
  ) => {
    if (channel === 'telegram') {
      setTelegramStageTemplates((prev) => {
        const next = [...prev] as StageTemplates;
        next[stageIndex] = value;
        return next;
      });
      return;
    }

    setWhatsappStageTemplates((prev) => {
      const next = [...prev] as StageTemplates;
      next[stageIndex] = value;
      return next;
    });
  };

  // ── Save / Discard ───────────────────────────────────────────────
  const handleSaveSettings = async () => {
    if (isDemoUser) {
      demoBlocked();
      return;
    }
    setSavingSettings(true);
    try {
      const scheduleValidation = validateWarningScheduleTimes(warningScheduleTimes);
      if (!scheduleValidation.ok) {
        toast.error('Error', { description: scheduleValidation.message });
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
        toast.error('Error', {
          description: 'Fix the JSON mapping error before saving notification settings',
        });
        return;
      }

      const settingsToSave: Record<string, unknown> = {
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

      const res = await apiPut('/afterhours/settings', {
        settings: settingsToSave,
      });
      if (res.ok) {
        setSettings(settingsToSave as AfterHoursSettings);
        setTelegramTargetMap(normalizeNotificationTargetMap(settingsToSave.telegram_chat_ids));
        setWhatsappTargetMap(normalizeNotificationTargetMap(settingsToSave.whatsapp_targets));
        setTelegramTargetsDraft(settingsToSave.telegram_chat_ids as string);
        setWhatsappTargetsDraft(settingsToSave.whatsapp_targets as string);
        setWarningScheduleTimes(normalizedSchedule);
        setTelegramStageTemplates(normalizedTelegramTemplates as StageTemplates);
        setWhatsappStageTemplates(normalizedWhatsappTemplates as StageTemplates);
        toast.success('Saved', {
          description: 'Notification settings saved',
        });
      } else {
        toast.error('Error', {
          description: (res as any).error?.message || 'Failed to save',
        });
      }
    } catch {
      toast.error('Error', {
        description: 'Failed to save settings',
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDiscardSettings = async () => {
    const restored = await loadSettings();
    if (restored) {
      toast.success('Restored', {
        description: 'Settings restored from server values',
      });
    }
  };

  // ── Run check ─────────────────────────────────────────────────────
  const handleRunCheck = async () => {
    if (isDemoUser) {
      demoBlocked();
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
                  (stage: any) =>
                    `S${stage.warningStage}(${stage.scheduledTime}) TG ${stage.telegramSuccess || 0}/${stage.telegramAttempt || 0}`
                )
                .join(' | ')
            : null;

        toast.success('Check Complete', {
          description: stageSummary
            ? `Run test 4 tahap selesai. ${stageSummary}`
            : `Found ${res.data.totalViolations || 0} violation(s) across ${res.data.branchCount || 0} branch(es)`,
        });
        loadData();
        loadDates();
      } else {
        toast.error('Check Failed', {
          description: (res as any).error?.message || 'Failed to run after-hours check',
        });
      }
    } catch {
      toast.error('Error', {
        description: 'Failed to run check',
      });
    } finally {
      setChecking(false);
    }
  };

  // ── Derived values ───────────────────────────────────────────────
  const totalViolations = summary?.totalViolations || 0;
  const branchSummaries = summary?.byBranch || [];
  const branchCount = branchSummaries.length;
  const latestSyncIso = branchSummaries.reduce<string | null>((latest, row) => {
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
  const rangeStart = totalItems === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalItems);
  const selectedBranchLabel =
    BRANCH_OPTIONS.find((item) => String(item.id) === String(branch))?.label ||
    branchSummaries.find((row) => String(row.branch_id) === String(branch))?.branch_name ||
    'All Branches';

  return {
    state: {
      violations,
      summary,
      loading,
      checking,
      date,
      branch,
      search,
      page,
      pagination,
      availableDates,
      showSettings,
      settings,
      notificationEditorMode,
      telegramTargetMap,
      whatsappTargetMap,
      telegramTargetsDraft,
      whatsappTargetsDraft,
      telegramTargetsError,
      whatsappTargetsError,
      savingSettings,
      warningScheduleTimes,
      telegramStageTemplates,
      whatsappStageTemplates,
      activeTab,
    },
    derived: {
      totalViolations,
      branchSummaries,
      branchCount,
      latestSyncTime,
      notifyEnabled,
      normalizedScheduleTimes,
      totalItems,
      totalPages,
      rangeStart,
      rangeEnd,
      selectedBranchLabel,
      isDemoUser,
    },
    actions: {
      setBranch,
      setSearch,
      setDate,
      setPage,
      setShowSettings,
      setActiveTab,
      setNotificationEditorMode,
      loadData,
      loadDates,
      loadSettings,
      updateSetting,
      syncTelegramTargets,
      syncWhatsappTargets,
      handleNotificationModeChange,
      updateNotificationBranchTarget,
      updateNotificationDraft,
      updateScheduleTime,
      updateTemplateByStage,
      handleSaveSettings,
      handleDiscardSettings,
      handleRunCheck,
    },
  };
}
