// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { apiGet, apiPost, apiPut } from '../../lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Toolbar } from '@/components/shared/Toolbar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatCard } from '@/components/shared/StatCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { SearchBar } from '@/components/shared/SearchBar';
import {
  Loader2,
  Clock,
  Save,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Calendar,
  RotateCw,
  RefreshCw,
  Download,
  Trophy,
  FileText,
  Store,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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

const LIMIT_OPTIONS = [
  { value: '10', label: 'Top 10' },
  { value: '20', label: 'Top 20' },
  { value: '50', label: 'Top 50' },
  { value: '100', label: 'All' },
];

const MONTHLY_REPORT_WHATSAPP_TARGETS_SAMPLE = '120000000000099,000000000000';
const DEFAULT_WINDOW_START = '23:15';

const TOOLBAR_FIELD_CLASS = 'w-full';
const TOOLBAR_BUTTON_CLASS = 'w-full justify-center sm:w-auto';
const TOOLBAR_ICON_BUTTON_CLASS = '!w-10 shrink-0 !px-0';
const TOOLBAR_PRIMARY_BUTTON_CLASS = '!h-11 w-full justify-center !rounded-md sm:w-auto';
const TOOLBAR_META_PILL_CLASS =
  'rounded-sm border border-border bg-background/80 px-3 py-1 text-xs text-muted-foreground';

function getDefaultMonth() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

function toMonthString(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function shiftMonth(monthValue, delta) {
  const match = String(monthValue || '').match(/^(\d{4})-(\d{2})$/);
  if (!match) return getDefaultMonth();
  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return getDefaultMonth();
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
  return toMonthString(shifted);
}

function buildRecentMonthList(anchorMonth, total = 12) {
  const list = [];
  for (let idx = 0; idx < total; idx += 1) {
    list.push(shiftMonth(anchorMonth, -idx));
  }
  return list;
}

function formatMonthLabel(reportMonth) {
  if (!reportMonth) return '—';
  try {
    const d = new Date(reportMonth + 'T00:00:00+07:00');
    return d.toLocaleDateString('en-US', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: 'long',
    });
  } catch {
    return reportMonth;
  }
}

function formatGeneratedAt(isoStr) {
  return formatWibDateTime(isoStr);
}

function formatWindowLabel(value) {
  if (!value) return '—';
  const normalized = String(value).trim().slice(0, 5);
  return /^\d{2}:\d{2}$/.test(normalized) ? `${normalized} WIB` : String(value);
}

function formatWibDateTime(value) {
  if (!value) return '—';

  const raw = String(value).trim();
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date);
    const map = {};
    for (const part of parts) {
      map[part.type] = part.value;
    }

    const hour = map.hour === '24' ? '00' : map.hour;
    return `${map.day} ${map.month} ${map.year} ${hour}:${map.minute} WIB`;
  } catch {
    return raw;
  }
}

function formatWibDateOnly(value) {
  if (!value) return '—';

  const raw = String(value).trim();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T00:00:00+07:00`) : new Date(raw);

  if (Number.isNaN(date.getTime())) return raw;

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).formatToParts(date);
    const map = {};
    for (const part of parts) {
      map[part.type] = part.value;
    }

    return `${map.day} ${map.month} ${map.year}`;
  } catch {
    return raw;
  }
}

function formatReportTimelineItem(value) {
  const raw = String(value || '').trim();
  if (!raw) return '—';

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return formatWibDateOnly(raw);
  }

  return formatWibDateTime(raw);
}

function base64ToBlob(base64, contentType) {
  const binary = atob(String(base64 || ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: contentType });
}

function normalizeReportExportFileName(fileName, contentType, month) {
  const fallbackName = `afterhours_report_${month}.xlsx`;
  const rawName = String(fileName || '').trim() || fallbackName;
  const isWorkbook = String(contentType || '').includes('spreadsheetml.sheet');

  if (!isWorkbook) {
    return rawName.toLowerCase().endsWith('.xls') ? rawName : rawName;
  }

  if (rawName.toLowerCase().endsWith('.xlsx')) {
    return rawName;
  }

  if (rawName.toLowerCase().endsWith('.xls')) {
    return `${rawName.slice(0, -4)}.xlsx`;
  }

  return `${rawName}.xlsx`;
}

function normalizeMonthlyReportWhatsappTargets(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .join(',');
}

export default function AfterHoursReport() {
  const [ranking, setRanking] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [month, setMonth] = useState(getDefaultMonth);
  const [branch, setBranch] = useState('');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState('20');
  const [windowStart, setWindowStart] = useState(DEFAULT_WINDOW_START);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);
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
        toast.success('Saved', { description: normalizedTargets
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
        toast.success('Report Generated', { description: `Generated report for ${formatMonthLabel(res.data.reportMonth)} (${formatWindowLabel(res.data.reportWindowStart || windowStart)}): ${res.data.totalStores} store(s), ${res.data.totalViolationDays} violation day(s)` });
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

      toast.success('Download Ready', { description: `Monthly report exported for ${formatMonthLabel(month + '-01')}` });
      loadReport();
      loadMonths();
    } catch (error) {
      toast.error('Download Failed', { description: error?.message || 'Failed to download report' });
    } finally {
      setDownloading(false);
    }
  };

  const totalStores = summary?.totalStores || 0;
  const totalViolationDays = summary?.totalViolationDays || 0;
  const selectedBranchLabel =
    BRANCH_OPTIONS.find((b) => String(b.id) === String(branch))?.label || 'All Branches';
  const selectedLimitLabel = LIMIT_OPTIONS.find((opt) => opt.value === limit)?.label || 'Top 20';
  const selectedWindowLabel = formatWindowLabel(windowStart);
  const normalizedSearch = search.trim();
  const hasExportableReport = Boolean(summary);
  const monthlyReportBroadcastEnabled = monthlyReportWhatsappTargets.trim().length > 0;
  const activeFilters = [
    `Month: ${formatMonthLabel(month + '-01')}`,
    `Branch: ${selectedBranchLabel}`,
    `Limit: ${selectedLimitLabel}`,
    `Window: ${selectedWindowLabel}`,
  ];

  if (normalizedSearch) {
    activeFilters.push(`Search: ${normalizedSearch}`);
  }

  // Medal colors for top 3
  const medalClasses = ['text-status-warning', 'text-muted-foreground', 'text-status-warning/70'];

  return (
    <div className="space-y-6">
      <Card className="p-0">
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-sm border border-border bg-background/70 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <FileText className="size-3 text-status-info" />
                Monthly Report Delivery
              </div>
              <h2 className="text-lg font-semibold tracking-normal text-foreground">
                WhatsApp broadcast target
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                Configure the target list used when monthly after-hours reports are generated and
                sent automatically at 09:00 WIB.
              </p>
            </div>
            <StatusBadge variant={monthlyReportBroadcastEnabled ? 'success' : 'neutral'} size="lg">
              {monthlyReportBroadcastEnabled ? 'Enabled' : 'Disabled'}
            </StatusBadge>
          </div>

          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-start">
            <div className="relative w-full lg:flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                <Save className="size-4" />
              </div>
              <Input
                type="text"
                value={monthlyReportWhatsappTargets}
                onChange={(e) => setMonthlyReportWhatsappTargets(e.target.value)}
                placeholder={MONTHLY_REPORT_WHATSAPP_TARGETS_SAMPLE}
                disabled={loadingMonthlyReportSettings}
                className="!pl-11"
              />
            </div>
            <Button
              size="sm"
              onClick={handleSaveMonthlyReportSettings}
              disabled={loadingMonthlyReportSettings}
            >
              {savingMonthlyReportSettings && <Loader2 className="size-4 animate-spin" />}
              <Save className="size-4" />
              Save Target
            </Button>
          </div>

          <p className="mt-2 text-xs text-muted-foreground">
            Separate multiple targets with commas. Example:{' '}
            <code className="text-foreground">{MONTHLY_REPORT_WHATSAPP_TARGETS_SAMPLE}</code>
          </p>
        </CardContent>
      </Card>

      <Toolbar>
        <div className="flex w-full flex-col gap-3">
          <div className="grid gap-2 lg:grid-cols-3">
            <SearchBar
              value={search}
              onValueChange={(val) => {
                setSearch(val);
                setExpandedRow(null);
              }}
              placeholder="Search violating store code or name..."
              className="w-full"
            />
            <Select
              value={branch ? String(branch) : ''}
              onValueChange={(val) => {
                setBranch(val);
                setExpandedRow(null);
              }}
            >
              <SelectTrigger className="w-full sm:w-full">
                <SelectValue placeholder="Branch: All">
                  {branch
                    ? `Branch: ${BRANCH_OPTIONS.find((b) => String(b.id) === String(branch))?.label || branch}`
                    : undefined}
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
            <Select
              value={limit}
              onValueChange={(val) => {
                setLimit(val);
                setExpandedRow(null);
              }}
            >
              <SelectTrigger className="w-full sm:w-full">
                <SelectValue placeholder="Limit: Top 20" />
              </SelectTrigger>
              <SelectContent>
                {LIMIT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2 border-t border-border/60 pt-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex w-full min-w-0 gap-2 sm:w-auto">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className={TOOLBAR_ICON_BUTTON_CLASS}
                  onClick={() => setMonth((prev) => shiftMonth(prev, -1))}
                  aria-label="Previous month"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Select value={month} onValueChange={(val) => setMonth(val)}>
                  <SelectTrigger className="min-w-0 flex-1 sm:w-52">
                    <SelectValue placeholder="Select Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((value) => (
                      <SelectItem key={value} value={value}>
                        {formatMonthLabel(`${value}-01`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className={TOOLBAR_ICON_BUTTON_CLASS}
                  onClick={() => setMonth((prev) => shiftMonth(prev, 1))}
                  disabled={month >= currentMonth}
                  aria-label="Next month"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
              <div className="relative w-full sm:w-40">
                <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                  <Clock className="size-4" />
                </div>
                <Input
                  type="time"
                  value={windowStart}
                  onChange={(e) => {
                    windowStartEditedRef.current = true;
                    setWindowStart(e.target.value);
                    setExpandedRow(null);
                  }}
                  step="300"
                  className={cn(TOOLBAR_FIELD_CLASS, '!pl-11')}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <Button
                variant="ghost"
                size="sm"
                className={TOOLBAR_BUTTON_CLASS}
                onClick={() => {
                  setBranch('');
                  setSearch('');
                  setLimit('20');
                  windowStartEditedRef.current = false;
                  setWindowStart(DEFAULT_WINDOW_START);
                  setMonth(getDefaultMonth());
                  setExpandedRow(null);
                }}
              >
                <RefreshCw className="size-4" />
                Reset
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className={TOOLBAR_BUTTON_CLASS}
                onClick={() => setMonth(currentMonth)}
              >
                <Calendar className="size-4" />
                This Month
              </Button>
              {hasExportableReport && (
                <Button
                  variant="secondary"
                  size="sm"
                  className={TOOLBAR_BUTTON_CLASS}
                  onClick={handleDownloadReport}
                  disabled={loading || generating || downloading}
                >
                  {downloading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Download className="size-4" />
                  )}
                  {downloading ? 'Downloading...' : 'Download Excel'}
                </Button>
              )}
              <Button
                onClick={handleGenerate}
                size="sm"
                className={TOOLBAR_PRIMARY_BUTTON_CLASS}
                disabled={loading || generating || downloading}
              >
                {generating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <FileText className="size-4" />
                )}
                {generating ? 'Generating...' : 'Generate Report'}
              </Button>
            </div>
          </div>
        </div>
      </Toolbar>

      <div className="flex flex-wrap gap-2">
        {activeFilters.map((item) => (
          <span key={item} className={TOOLBAR_META_PILL_CLASS}>
            {item}
          </span>
        ))}
      </div>
      {/* Month Chips */}
      {availableMonths.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Available Reports:</span>
          {availableMonths.map((m) => {
            const monthStr =
              typeof m.report_month === 'string'
                ? m.report_month.slice(0, 7)
                : new Date(m.report_month).toISOString().slice(0, 7);
            return (
              <Button
                key={monthStr}
                size="sm"
                variant={monthStr === month ? 'default' : 'secondary'}
                onClick={() => setMonth(monthStr)}
                className="h-7 rounded-sm px-3 text-xs"
              >
                {formatMonthLabel(m.report_month)} ({m.store_count})
              </Button>
            );
          })}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard
          title="Violating Stores"
          value={totalStores}
          icon={<Store className="size-5" />}
          status={totalStores > 0 ? 'error' : 'success'}
          subtext={`${selectedBranchLabel} • ${formatMonthLabel(month + '-01')} • Window: ${selectedWindowLabel}${normalizedSearch ? ` • Search: ${normalizedSearch}` : ''}`}
        />
        <StatCard
          title="Total Violation Days"
          value={totalViolationDays}
          icon={<Calendar className="size-5" />}
          status={totalViolationDays > 0 ? 'warning' : 'success'}
          subtext="Accumulated across all stores"
        />
        <StatCard
          title="Report Period"
          value={formatMonthLabel(month + '-01')}
          icon={<Calendar className="size-5" />}
          status="info"
          subtext={
            branch || normalizedSearch
              ? [
                  branch ? `Filtered: ${selectedBranchLabel}` : null,
                  normalizedSearch ? `Search: ${normalizedSearch}` : null,
                ]
                  .filter(Boolean)
                  .join(' • ')
              : 'All monitored branches'
          }
        />
      </div>

      {/* Ranking Table */}
      <Card className="p-0 overflow-hidden">
        <CardContent className="p-0">
          {!loading && ranking.length > 0 && (
            <div className="flex flex-col gap-1 border-b border-border bg-muted/20 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
              <span className="font-medium text-foreground">
                {selectedBranchLabel} • {formatMonthLabel(month + '-01')}
              </span>
              <span className="text-muted-foreground">Top {ranking.length} violating stores</span>
            </div>
          )}
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : ranking.length === 0 ? (
            <EmptyState
              title="No report data"
              description={
                normalizedSearch
                  ? `No violating stores match the search "${normalizedSearch}" for ${formatMonthLabel(month + '-01')}.`
                  : `No report data available for ${formatMonthLabel(month + '-01')}. Click "Generate Report" to create one.`
              }
              icon={<Save className="size-8" />}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Violation Days</TableHead>
                  <TableHead>Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranking.map((item) => {
                  const isExpanded = expandedRow === item.store_code;
                  const dates = Array.isArray(item.violation_dates) ? item.violation_dates : [];
                  const timestamps = Array.isArray(item.violation_timestamps)
                    ? item.violation_timestamps
                    : [];
                  const detailItems = timestamps.length > 0 ? timestamps : dates;
                  const detailLabel = timestamps.length > 0 ? 'times' : 'dates';
                  return (
                    <React.Fragment key={item.store_code}>
                      <TableRow className={item.rank <= 3 ? 'bg-destructive/5' : ''}>
                        <TableCell>
                          <span className="flex items-center gap-1.5">
                            {item.rank <= 3 ? (
                              <Trophy className={cn('size-4', medalClasses[item.rank - 1])} />
                            ) : (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm bg-secondary text-xs font-bold text-secondary-foreground">
                                {item.rank}
                              </span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-mono text-xs text-foreground">
                              {item.store_code}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {item.store_name || '—'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                            {item.branch_name || item.branch_id}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1.5">
                            <span
                              className={`text-sm font-bold ${
                                item.violation_count >= 20
                                  ? 'text-destructive'
                                  : item.violation_count >= 10
                                    ? 'text-status-warning'
                                    : 'text-foreground'
                              }`}
                            >
                              {item.violation_count}
                            </span>
                            <span className="text-xs text-muted-foreground">day(s)</span>
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedRow(isExpanded ? null : item.store_code)}
                          >
                            {isExpanded ? (
                              <ChevronUp className="size-4" />
                            ) : (
                              <ChevronDown className="size-4" />
                            )}
                            {detailItems.length} {detailLabel}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {isExpanded && detailItems.length > 0 && (
                        <TableRow>
                          <TableCell />
                          <TableCell colSpan={4}>
                            <div className="flex flex-wrap gap-1.5 py-1">
                              {detailItems.map((timestampStr) => (
                                <span
                                  key={timestampStr}
                                  className="inline-flex items-center rounded-sm border border-border/60 bg-background px-2.5 py-1 text-xs text-foreground"
                                >
                                  {formatReportTimelineItem(timestampStr)}
                                </span>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {!loading && ranking.length > 0 && (
            <div className="border-t border-border bg-card px-cell-x py-cell-y flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
              <span className="text-muted-foreground">
                Showing <span className="font-medium text-foreground">{ranking.length}</span> of{' '}
                <span className="font-medium text-foreground">{totalStores}</span> violating
                store(s)
              </span>
              <span className="text-xs text-muted-foreground">
                {ranking[0]?.generated_at
                  ? `Generated: ${formatGeneratedAt(ranking[0].generated_at)}`
                  : ''}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
