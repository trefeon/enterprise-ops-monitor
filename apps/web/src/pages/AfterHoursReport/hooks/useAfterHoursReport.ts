// @ts-nocheck
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { apiGet, apiPost, apiPut } from '../../../lib/api/client';
import { toast } from 'sonner';
import { useAuth } from '../../../context/AuthContext';
import type {
  AfterHoursRankingItem,
  AfterHoursSummary,
  AvailableMonth,
} from '../types';
import {
  getDefaultMonth,
  shiftMonth,
  buildRecentMonthList,
  formatMonthLabel,
  formatWindowLabel,
  normalizeReportExportFileName,
  normalizeMonthlyReportWhatsappTargets,
  base64ToBlob,
} from '../utils';
import { DEFAULT_WINDOW_START, MONTHLY_REPORT_WHATSAPP_TARGETS_SAMPLE } from '../types';

export function useAfterHoursReport() {
  const [ranking, setRanking] = useState<AfterHoursRankingItem[]>([]);
  const [summary, setSummary] = useState<AfterHoursSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [month, setMonth] = useState(getDefaultMonth);
  const [branch, setBranch] = useState('');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState('20');
  const [windowStart, setWindowStart] = useState(DEFAULT_WINDOW_START);
  const [availableMonths, setAvailableMonths] = useState<AvailableMonth[]>([]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [monthlyReportWhatsappTargets, setMonthlyReportWhatsappTargets] = useState('');
  const [loadingMonthlyReportSettings, setLoadingMonthlyReportSettings] = useState(false);
  const [savingMonthlyReportSettings, setSavingMonthlyReportSettings] = useState(false);

  const { user } = useAuth();
  const isDemoUser = user?.isDemo || user?.roleNames?.includes('demo') || user?.role === 'demo';
  const currentMonth = getDefaultMonth();
  const reportRequestIdRef = useRef(0);
  const windowStartEditedRef = useRef(false);

  const monthOptions = useMemo(() => {
    const values = new Set(buildRecentMonthList(currentMonth, 12));
    values.add(month);

    for (const item of availableMonths || []) {
      const raw =
        typeof item.report_month === 'string'
          ? item.report_month
          : new Date(item.report_month).toISOString().slice(0, 10);
      const monthStr = raw.slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(monthStr)) values.add(monthStr);
    }

    return Array.from(values).sort((a, b) => b.localeCompare(a));
  }, [availableMonths, currentMonth, month]);

  const loadReport = useCallback(async () => {
    const requestId = ++reportRequestIdRef.current;
    setLoading(true);
    try {
      const params = new URLSearchParams({ month, limit });
      if (branch) params.set('branch', branch);
      if (search.trim()) params.set('search', search.trim());

      const res = await apiGet(`/afterhours/report?${params}`);
      if (requestId !== reportRequestIdRef.current) return;
      if (res.ok) {
        setRanking(res.data.ranking || []);
        setSummary(res.data.summary || null);
        const reportWindowStart = String(res.data?.summary?.reportWindowStart || '').trim();
        if (!windowStartEditedRef.current && /^\d{2}:\d{2}/.test(reportWindowStart)) {
          setWindowStart(reportWindowStart.slice(0, 5));
        }
      }
    } catch {
      if (requestId !== reportRequestIdRef.current) return;
      toast.error('Error', { description: 'Failed to load monthly report' });
    } finally {
      if (requestId === reportRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [month, branch, search, limit]);

  const loadMonths = useCallback(async () => {
    try {
      const res = await apiGet('/afterhours/report/months?limit=12');
      if (res.ok) setAvailableMonths(res.data.months || []);
    } catch {
      // silent
    }
  }, []);

  const loadMonthlyReportSettings = useCallback(async () => {
    setLoadingMonthlyReportSettings(true);
    try {
      const res = await apiGet('/afterhours/settings');
      if (res.ok) {
        setMonthlyReportWhatsappTargets(
          normalizeMonthlyReportWhatsappTargets(
            res.data?.settings?.monthly_report_whatsapp_targets || ''
          )
        );
      }
    } catch {
      // silent
    } finally {
      setLoadingMonthlyReportSettings(false);
    }
  }, []);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  useEffect(() => {
    loadMonths();
  }, [loadMonths]);

  useEffect(() => {
    loadMonthlyReportSettings();
  }, [loadMonthlyReportSettings]);

  const handleSaveMonthlyReportSettings = async () => {
    if (isDemoUser) {
      toast.warning('Demo Account', { description: 'This action is not available in the demo account.' });
      return;
    }
    setSavingMonthlyReportSettings(true);
    try {
      const normalizedTargets = normalizeMonthlyReportWhatsappTargets(monthlyReportWhatsappTargets);
      const res = await apiPut('/afterhours/settings', {
        settings: {
          monthly_report_whatsapp_targets: normalizedTargets,
        },
      });

      if (res.ok) {
        setMonthlyReportWhatsappTargets(normalizedTargets);
        toast.success('Saved', {
          description: normalizedTargets
            ? 'Monthly report WhatsApp target updated'
            : 'Monthly report WhatsApp target cleared',
        });
      } else {
        toast.error('Save Failed', { description: res.error?.message || 'Failed to save monthly report target' });
      }
    } catch {
      toast.error('Error', { description: 'Failed to save monthly report target' });
    } finally {
      setSavingMonthlyReportSettings(false);
    }
  };

  const handleGenerate = async () => {
    if (isDemoUser) {
      toast.warning('Demo Account', { description: 'This action is not available in the demo account.' });
      return;
    }
    setGenerating(true);
    try {
      const res = await apiPost('/afterhours/report/generate', {
        month,
        windowStart,
      });
      if (res.ok) {
        toast.success('Report Generated', {
          description: `Generated report for ${formatMonthLabel(res.data.reportMonth)} (${formatWindowLabel(res.data.reportWindowStart || windowStart)}): ${res.data.totalStores} store(s), ${res.data.totalViolationDays} violation day(s)`,
        });
        loadReport();
        loadMonths();
      } else {
        toast.error('Generation Failed', { description: res.error?.message || 'Failed to generate report' });
      }
    } catch {
      toast.error('Error', { description: 'Failed to generate report' });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadReport = async () => {
    if (isDemoUser) {
      toast.warning('Demo Account', { description: 'This action is not available in the demo account.' });
      return;
    }
    setDownloading(true);
    try {
      const params = new URLSearchParams({ month, windowStart });
      if (branch) params.set('branch', branch);
      if (search.trim()) params.set('search', search.trim());

      const res = await apiGet(`/afterhours/report/export?${params}`);
      if (!res.ok) {
        throw new Error(res.error?.message || 'Failed to export report');
      }

      const exportData = res.data || {};
      const contentBase64 = String(exportData.contentBase64 || exportData.content || '');
      if (!contentBase64) {
        throw new Error('Export content unavailable');
      }

      const blob = base64ToBlob(
        contentBase64,
        exportData.contentType ||
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      const downloadFileName = normalizeReportExportFileName(
        exportData.fileName,
        exportData.contentType,
        month
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadFileName;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success('Download Ready', {
        description: `Monthly report exported for ${formatMonthLabel(month + '-01')}`,
      });
      loadReport();
      loadMonths();
    } catch (error) {
      toast.error('Download Failed', { description: (error as Error)?.message || 'Failed to download report' });
    } finally {
      setDownloading(false);
    }
  };

  const handleResetFilters = () => {
    setBranch('');
    setSearch('');
    setLimit('20');
    windowStartEditedRef.current = false;
    setWindowStart(DEFAULT_WINDOW_START);
    setMonth(getDefaultMonth());
    setExpandedRow(null);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setExpandedRow(null);
  };

  const handleBranchChange = (val: string | null) => {
    setBranch(val ?? '');
    setExpandedRow(null);
  };

  const handleLimitChange = (val: string | null) => {
    setLimit(val ?? '20');
    setExpandedRow(null);
  };

  const handleWindowStartChange = (val: string) => {
    windowStartEditedRef.current = true;
    setWindowStart(val);
    setExpandedRow(null);
  };

  const handleMonthChange = (val: string | null) => {
    setMonth(val ?? getDefaultMonth());
  };

  const handlePrevMonth = () => setMonth((prev) => shiftMonth(prev, -1));
  const handleNextMonth = () => setMonth((prev) => shiftMonth(prev, 1));

  const totalStores = summary?.totalStores || 0;
  const totalViolationDays = summary?.totalViolationDays || 0;

  const normalizedSearch = search.trim();
  const hasExportableReport = Boolean(summary);
  const monthlyReportBroadcastEnabled = monthlyReportWhatsappTargets.trim().length > 0;

  const canGoNextMonth = month < currentMonth;
  const isBusy = loading || generating || downloading;

  return {
    // State
    ranking,
    summary,
    loading,
    generating,
    downloading,
    month,
    branch,
    search,
    limit,
    windowStart,
    availableMonths,
    expandedRow,
    monthlyReportWhatsappTargets,
    loadingMonthlyReportSettings,
    savingMonthlyReportSettings,

    // Computed
    isDemoUser,
    currentMonth,
    monthOptions,
    totalStores,
    totalViolationDays,
    normalizedSearch,
    hasExportableReport,
    monthlyReportBroadcastEnabled,
    canGoNextMonth,
    isBusy,

    // Refs exposed
    windowStartEditedRef,

    // Actions
    setExpandedRow,
    setMonthlyReportWhatsappTargets,
    handleSaveMonthlyReportSettings,
    handleGenerate,
    handleDownloadReport,
    handleResetFilters,
    handleSearchChange,
    handleBranchChange,
    handleLimitChange,
    handleWindowStartChange,
    handleMonthChange,
    handlePrevMonth,
    handleNextMonth,
    loadReport,
    loadMonths,
  };
}
