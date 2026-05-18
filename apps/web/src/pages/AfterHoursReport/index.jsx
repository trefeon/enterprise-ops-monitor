import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { apiGet, apiPost, apiPut } from '../../lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatCard } from '@/components/shared/StatCard'
import { EmptyState } from '@/components/shared/EmptyState'
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
import FeatureStoryBanner from '../../components/FeatureStoryBanner';
import { SearchBar } from '@/components/shared/SearchBar';
import { getFeatureStory } from '../../data/stories';
import {
  Loader2,
  Clock,
  Search,
  Save,
  ChevronLeft,
  ChevronRight,
  Calendar,
  RotateCw,
  RefreshCw,
  Download,
  Trophy,
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

const TOOLBAR_FIELD_CLASS = '!h-11 !rounded-xl !border-border/70 !bg-background shadow-sm';
const TOOLBAR_BUTTON_CLASS =
  '!h-11 w-full justify-center !rounded-xl border border-border/70 bg-background text-foreground shadow-sm hover:bg-muted sm:w-auto';
const TOOLBAR_ICON_BUTTON_CLASS =
  '!h-11 !w-11 shrink-0 !rounded-xl border border-border/70 bg-background !px-0 text-foreground shadow-sm hover:bg-muted';
const TOOLBAR_PRIMARY_BUTTON_CLASS = '!h-11 w-full justify-center !rounded-xl shadow-sm sm:w-auto';
const TOOLBAR_PANEL_CLASS = 'rounded-2xl border border-border/60 bg-background/75 p-4 shadow-sm';
const TOOLBAR_LABEL_CLASS = 'text-xs font-semibold uppercase tracking-widest text-muted-foreground';
const TOOLBAR_META_PILL_CLASS =
  'rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs text-muted-foreground';

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
  const { push } = useToast();
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
      push({ variant: 'error', title: 'Error', message: 'Failed to load monthly report' });
    } finally {
      if (requestId === reportRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [month, branch, search, limit, push]);

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
        push({
          variant: 'success',
          title: 'Saved',
          message: normalizedTargets
            ? 'Monthly report WhatsApp target updated'
            : 'Monthly report WhatsApp target cleared',
        });
      } else {
        push({
          variant: 'error',
          title: 'Save Failed',
          message: res.error?.message || 'Failed to save monthly report target',
        });
      }
    } catch {
      push({ variant: 'error', title: 'Error', message: 'Failed to save monthly report target' });
    } finally {
      setSavingMonthlyReportSettings(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await apiPost('/afterhours/report/generate', {
        month,
        windowStart,
      });
      if (res.ok) {
        push({
          variant: 'success',
          title: 'Report Generated',
          message: `Generated report for ${formatMonthLabel(res.data.reportMonth)} (${formatWindowLabel(res.data.reportWindowStart || windowStart)}): ${res.data.totalStores} store(s), ${res.data.totalViolationDays} violation day(s)`,
        });
        loadReport();
        loadMonths();
      } else {
        push({
          variant: 'error',
          title: 'Generation Failed',
          message: res.error?.message || 'Failed to generate report',
        });
      }
    } catch {
      push({ variant: 'error', title: 'Error', message: 'Failed to generate report' });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadReport = async () => {
    if (isDemoUser) {
      push({
        variant: 'warning',
        title: 'Demo Account',
        message: 'This action is not available in the demo account.',
      });
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

      push({
        variant: 'success',
        title: 'Download Ready',
        message: `Monthly report exported for ${formatMonthLabel(month + '-01')}`,
      });
      loadReport();
      loadMonths();
    } catch (error) {
      push({
        variant: 'error',
        title: 'Download Failed',
        message: error?.message || 'Failed to download report',
      });
    } finally {
      setDownloading(false);
    }
  };

  const totalStores = summary?.totalStores || 0;
  const totalViolationDays = summary?.totalViolationDays || 0;
  const selectedBranchLabel = BRANCH_OPTIONS.find((b) => b.id === branch)?.label || 'All Branches';
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
  const medalClasses = [
    'text-yellow-500', // gold
    'text-gray-400', // silver
    'text-amber-700', // bronze
  ];

  return (
    <>
      <div className="space-y-5">
        <FeatureStoryBanner story={getFeatureStory('after-hours-report')} />

        <Card className="py-3 overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-background via-background to-muted/20 shadow-sm">
          <CardContent>
            <div className="grid gap-5 border-b border-border/60 px-5 py-5 lg:grid-cols-2 lg:px-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  <span className="material-symbols-outlined text-sm text-status-info">
                    assessment
                  </span>
                  After-Hours Monthly Report
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                    Clean, searchable monthly reports ready for sharing
                  </h2>
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                    Select a month, filter by branch or store name, generate Excel for Excel/WPS,
                    and automatically send it to WhatsApp on the 1st of every month at 09:00 WIB.
                    This report follows the production after-hours check configuration, including
                    00:00 logs which are correctly attributed to the previous business day.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1">
                    Search + filters
                  </span>
                  <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1">
                    XLSX export
                  </span>
                  <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1">
                    Final check window
                  </span>
                  <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1">
                    WhatsApp auto-send 09:00 WIB
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/90 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      WhatsApp Broadcast Target
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Enter chat or group IDs for automatic monthly report delivery.
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                      monthlyReportBroadcastEnabled
                        ? 'bg-status-success/10 text-status-success'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {monthlyReportBroadcastEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="relative w-full">
                    <div className="pointer-events-none absolute left-3 inset-y-0 flex items-center text-muted-foreground">
                      <Save className="size-4" />
                    </div>
                    <Input
                      type="text"
                      value={monthlyReportWhatsappTargets}
                      onChange={(e) => setMonthlyReportWhatsappTargets(e.target.value)}
                      placeholder={MONTHLY_REPORT_WHATSAPP_TARGETS_SAMPLE}
                      disabled={loadingMonthlyReportSettings}
                      className="!pl-11 !h-11 !rounded-xl !bg-background shadow-sm"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      Separate multiple targets with commas. Example:{' '}
                      <code className="text-foreground">
                        {MONTHLY_REPORT_WHATSAPP_TARGETS_SAMPLE}
                      </code>
                    </p>
                    <Button
                      size="sm"
                      onClick={handleSaveMonthlyReportSettings}
                      disabled={loadingMonthlyReportSettings}
                    >
                      {savingMonthlyReportSettings && <Loader2 className="animate-spin mr-2" />}
                      <span className="material-symbols-outlined mr-2">save</span>
                      Save Target
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-5 py-5 lg:px-6">
              <div className="rounded-3xl border border-border/60 bg-muted/20 p-4 sm:p-5">
                <div className="grid gap-4 xl:grid-cols-12">
                  <div className={`${TOOLBAR_PANEL_CLASS} xl:col-span-5`}>
                    <div className="space-y-2">
                      <p className={TOOLBAR_LABEL_CLASS}>Search Store</p>
                      <SearchBar
                        value={search}
                        onValueChange={(val) => {
                          setSearch(val);
                          setExpandedRow(null);
                        }}
                        placeholder="Search violating store code or name..."
                        className={TOOLBAR_FIELD_CLASS}
                      />
                      <p className="text-xs leading-5 text-muted-foreground">
                        Search by store code or store name that violated the window.
                      </p>
                    </div>
                  </div>

                  <div className={`${TOOLBAR_PANEL_CLASS} xl:col-span-4`}>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <p className={TOOLBAR_LABEL_CLASS}>Report Period</p>
                        <p className="text-sm font-semibold text-foreground">
                          {formatMonthLabel(month + '-01')}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="md"
                          className={TOOLBAR_ICON_BUTTON_CLASS}
                          onClick={() => setMonth((prev) => shiftMonth(prev, -1))}
                          aria-label="Previous month"
                        >
                          <span className="material-symbols-outlined">chevron_left</span>
                        </Button>

                        <Select
                          value={month}
                          onValueChange={(val) => {
                            const e = {
                              target: {
                                value: val,
                              },
                            };

                            return setMonth(e.target.value);
                          }}
                        >
                          <SelectTrigger>
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
                          size="md"
                          className={TOOLBAR_ICON_BUTTON_CLASS}
                          onClick={() => setMonth((prev) => shiftMonth(prev, 1))}
                          disabled={month >= currentMonth}
                          aria-label="Next month"
                        >
                          <span className="material-symbols-outlined">chevron_right</span>
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="md"
                          className={`${TOOLBAR_BUTTON_CLASS} sm:w-36`}
                          onClick={() => setMonth(currentMonth)}
                        >
                          <span className="material-symbols-outlined mr-2">today</span>
                          This Month
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <p className={TOOLBAR_LABEL_CLASS}>Violation Window</p>
                        <div className="relative w-full">
                          <div className="pointer-events-none absolute left-3 inset-y-0 flex items-center text-muted-foreground">
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
                        <p className="text-xs leading-5 text-muted-foreground">
                          Default reports start recording violations from 23:15 WIB. Change this
                          value only for custom reports before Generate / Download.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`${TOOLBAR_PANEL_CLASS} grid gap-4 sm:grid-cols-2 xl:col-span-3 xl:grid-cols-1`}
                  >
                    <div className="space-y-2">
                      <p className={TOOLBAR_LABEL_CLASS}>Branch</p>
                      <Select
                        value={branch}
                        onValueChange={(val) => {
                          const e = {
                            target: {
                              value: val,
                            },
                          };

                          return setBranch(e.target.value);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Branch: All" />
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

                    <div className="space-y-2">
                      <p className={TOOLBAR_LABEL_CLASS}>Ranking Limit</p>
                      <Select
                        value={limit}
                        onValueChange={(val) => {
                          const e = {
                            target: {
                              value: val,
                            },
                          };

                          return setLimit(e.target.value);
                        }}
                      >
                        <SelectTrigger>
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
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-4 border-t border-border/60 pt-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex flex-wrap gap-2">
                    {activeFilters.map((item) => (
                      <span key={item} className={TOOLBAR_META_PILL_CLASS}>
                        {item}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                    <Button
                      variant="ghost"
                      size="md"
                      className={`${TOOLBAR_BUTTON_CLASS} sm:w-32`}
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
                      <RefreshCw className="mr-2 size-4" />
                      Reset
                    </Button>

                    {hasExportableReport && (
                      <Button
                        variant="secondary"
                        size="md"
                        className={`${TOOLBAR_BUTTON_CLASS} sm:w-40`}
                        onClick={handleDownloadReport}
                        disabled={loading || generating || downloading}
                      >
                        {downloading ? (
                          <Loader2 className="animate-spin mr-2 size-4" />
                        ) : (
                          <Download className="mr-2 size-4" />
                        )}
                        {downloading ? 'Downloading...' : 'Download Excel'}
                      </Button>
                    )}

                    <Button
                      onClick={handleGenerate}
                      size="md"
                      className={`${TOOLBAR_PRIMARY_BUTTON_CLASS} sm:w-44`}
                      disabled={loading || generating || downloading}
                    >
                      {generating ? (
                        <Loader2 className="animate-spin mr-2 size-4" />
                      ) : (
                        <FileText className="mr-2 size-4" />
                      )}
                      {generating ? 'Generating...' : 'Generate Report'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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
                  className="h-7 rounded-full px-3 text-xs"
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
            icon="store"
            status={totalStores > 0 ? 'error' : 'success'}
            subtext={`${selectedBranchLabel} • ${formatMonthLabel(month + '-01')} • Window: ${selectedWindowLabel}${normalizedSearch ? ` • Search: ${normalizedSearch}` : ''}`}
            className={
              totalStores > 0
                ? 'border-destructive/30 bg-destructive/5'
                : 'border-status-success/30 bg-status-success/5'
            }
          />
          <StatCard
            title="Total Violation Days"
            value={totalViolationDays}
            icon={<Calendar className="size-5" />}
            status={totalViolationDays > 0 ? 'warning' : 'success'}
            subtext="Accumulated across all stores"
            className={
              totalViolationDays > 0
                ? 'border-status-warning/30 bg-status-warning/5'
                : 'border-status-success/30 bg-status-success/5'
            }
          />
          <StatCard
            title="Report Period"
            value={formatMonthLabel(month + '-01')}
            icon="date_range"
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
            className="border-status-info/30 bg-status-info/5"
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
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
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
                              icon={isExpanded ? 'expand_less' : 'expand_more'}
                              onClick={() => setExpandedRow(isExpanded ? null : item.store_code)}
                            >
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
                                    className="inline-flex items-center rounded-full border border-border/60 bg-background px-2.5 py-1 text-xs text-foreground shadow-sm"
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
    </>
  );
}
