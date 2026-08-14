// ---------------------------------------------------------------------------
// AfterHours — MonitorTab (main content for the Daily Monitor tab)
// ---------------------------------------------------------------------------
import React from 'react';
import {
  Loader2,
  RefreshCw,
  Clock,
  CheckCircle2,
  Monitor,
  Store,
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
  FileText,
  Globe,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatCard } from '@/components/ui/cards';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DatePicker } from '@/components/shared/DatePicker';
import { SearchBar } from '@/components/shared/SearchBar';
import { Toolbar } from '@/components/shared/Toolbar';
import { DataTable } from '@/components/ui/data-table';
import { Card, CardContent } from '@/components/ui/card';
import { NotificationTargetEditor } from './NotificationTargetEditor';
import type {
  AfterHoursState,
  AfterHoursDerived,
  AfterHoursActions,
} from '../hooks/useAfterHours';
import {
  BRANCH_OPTIONS,
  NOTIFICATION_BRANCH_OPTIONS,
  DEFAULT_TELEGRAM_STAGE_TEMPLATES,
  DEFAULT_WHATSAPP_STAGE_TEMPLATES,
  TELEGRAM_CHAT_ID_SAMPLE_VALUE,
  TELEGRAM_CHAT_ID_SAMPLE_FALLBACK,
  WHATSAPP_TARGET_SAMPLE_GROUP_VALUE,
  WHATSAPP_TARGET_SAMPLE_FALLBACK,
  WHATSAPP_API_KEY_SAMPLE,
  WHATSAPP_API_SECRET_SAMPLE,
} from '../constants';
import { formatDate, formatWibTime } from '../utils';

interface MonitorTabProps {
  state: AfterHoursState;
  derived: AfterHoursDerived;
  actions: AfterHoursActions;
}

export default function MonitorTab({
  state,
  derived,
  actions,
}: MonitorTabProps) {
  const {
    violations,
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
  } = state;
  const {
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
  } = derived;
  const {
    setSearch,
    setBranch,
    setDate,
    setPage,
    setShowSettings,
    setNotificationEditorMode,
    loadData,
    loadDates,
    updateSetting,
    updateNotificationBranchTarget,
    updateNotificationDraft,
    updateScheduleTime,
    updateTemplateByStage,
    handleSaveSettings,
    handleDiscardSettings,
    handleRunCheck,
  } = actions;

  return (
    <>
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard
          title="PCs Still Online"
          value={totalViolations}
          icon={<Monitor className="size-5" aria-hidden="true" />}
          status={totalViolations > 0 ? 'error' : 'success'}
          subtext={formatDate(date)}
        />
        <StatCard
          title="Branches Affected"
          value={branchCount}
          icon={<Store className="size-5" aria-hidden="true" />}
          status={branchCount > 0 ? 'warning' : 'success'}
          subtext={
            branch
              ? `Filtered: ${selectedBranchLabel}`
              : 'All monitored branches'
          }
        />
        <StatCard
          title="Latest Last Sync"
          value={latestSyncTime}
          icon={<Clock className="size-5" aria-hidden="true" />}
          status="info"
        />
      </div>

      {/* Notification Settings Card */}
      <Card
        className="overflow-hidden p-0 overscroll-contain"
      >
        <div className="flex flex-col gap-3 border-b border-border bg-card px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`rounded-lg border p-3 ${
                notifyEnabled
                  ? 'border-status-success/20 bg-status-success/10 text-status-success'
                  : 'border-border bg-muted text-muted-foreground'
              }`}
            >
              <NotificationsActive className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="flex items-center gap-2 text-sm font-medium tracking-wide text-foreground">
                Automation & Notification Settings
                <StatusBadge
                  variant={notifyEnabled ? 'success' : 'neutral'}
                  size="sm"
                  live={notifyEnabled}
                >
                  {notifyEnabled ? 'Enabled' : 'Disabled'}
                </StatusBadge>
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Configure Telegram and WhatsApp alerts for after-hours
                violations.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2.5 rounded-md border border-border bg-secondary px-3 py-1.5">
              <span className="text-3xs font-medium uppercase tracking-wider text-muted-foreground">
                Status
              </span>
              <Button
                type="button"
                role="switch"
                aria-checked={notifyEnabled}
                aria-label="Toggle setting"
                onClick={() =>
                  updateSetting(
                    'notify_enabled',
                    notifyEnabled ? 'false' : 'true',
                  )
                }
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center rounded-full p-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 ${
                  notifyEnabled ? 'bg-status-success' : 'bg-muted-foreground/30'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-foreground ring-0 transition-transform duration-300 ease-in-out ${
                    notifyEnabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </Button>
              <span
                className={`text-xs font-medium uppercase tracking-wider transition-colors ${
                  notifyEnabled
                    ? 'text-status-success'
                    : 'text-muted-foreground'
                }`}
              >
                {notifyEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings((prev) => !prev)}
              className={
                showSettings
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : ''
              }
            >
              {showSettings ? (
                <>
                  <ChevronUp
                    className="mr-2 size-4 transition-transform duration-300"
                    aria-hidden="true"
                  />
                  Hide
                </>
              ) : (
                <>
                  <ChevronDown
                    className="mr-2 size-4 transition-transform duration-300"
                    aria-hidden="true"
                  />
                  Configure
                </>
              )}
            </Button>
          </div>
        </div>

        {showSettings && (
          <>
            {/* Mode toggle */}
            <div className="flex flex-col gap-3 border-b border-border bg-secondary/30 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-xs text-muted-foreground">
                Branch form adalah mode default. Advanced JSON dipakai kalau mau
                custom penuh atau bulk edit mapping.
              </p>
              <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-background p-1">
                <Button
                  variant={
                    notificationEditorMode === 'branch' ? 'secondary' : 'ghost'
                  }
                  size="sm"
                  onClick={() => setNotificationEditorMode('branch')}
                  className={`h-8 rounded-sm px-3 text-xs font-medium transition-colors ${
                    notificationEditorMode === 'branch'
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <LayoutDashboard
                    className="mr-1.5 size-3.5"
                    aria-hidden="true"
                  />
                  Per Branch Form
                </Button>
                <Button
                  variant={
                    notificationEditorMode === 'advanced' ? 'secondary' : 'ghost'
                  }
                  size="sm"
                  onClick={() => setNotificationEditorMode('advanced')}
                  className={`h-8 rounded-sm px-3 text-xs font-medium transition-colors ${
                    notificationEditorMode === 'advanced'
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Code className="mr-1.5 size-3.5" aria-hidden="true" />
                  Advanced JSON
                </Button>
              </div>
            </div>

            {/* Telegram + WhatsApp columns */}
            <div className="grid grid-cols-1 gap-6 px-5 py-5 lg:grid-cols-2">
              <div className="space-y-4">
                <h4 className="mb-4 flex items-center gap-2.5 border-b border-border/40 pb-3 text-sm font-medium tracking-wider uppercase text-foreground">
                  <span className="rounded-md border border-status-info/20 bg-status-info/10 p-1.5 text-status-info">
                    <Send className="size-4" aria-hidden="true" />
                  </span>
                  Telegram Configuration
                </h4>

                <div>
                  <label
                    htmlFor="afterhours-bot-token"
                    className="mb-1.5 block text-xs font-medium text-muted-foreground"
                  >
                    Bot Token
                  </label>
                  <div className="relative w-full">
                    <Key
                      className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
                      aria-hidden="true"
                    />
                    <Input
                      id="afterhours-bot-token"
                      type="password"
                      value={settings.telegram_bot_token || ''}
                      onChange={(e) =>
                        updateSetting('telegram_bot_token', e.target.value)
                      }
                      placeholder="demo-telegram-bot-token"
                      className="pl-10"
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Isi token bot Telegram dari BotFather. Contoh dummy:{' '}
                    <code className="text-foreground">
                      demo-telegram-bot-token
                    </code>
                  </p>
                </div>

                <div>
                  <NotificationTargetEditor
                    icon={Users as LucideIcon}
                    description="Map each branch to a Telegram chat or group. Branch data is only sent to the target keyed by that branch ID, with _all as fallback."
                    mode={notificationEditorMode}
                    branchOptions={NOTIFICATION_BRANCH_OPTIONS}
                    targetMap={telegramTargetMap}
                    targetDraft={telegramTargetsDraft}
                    targetError={telegramTargetsError}
                    onBranchTargetChange={(branchId, value) =>
                      updateNotificationBranchTarget(
                        'telegram',
                        branchId,
                        value,
                      )
                    }
                    onDraftChange={(value) =>
                      updateNotificationDraft('telegram', value)
                    }
                    fallbackPlaceholder={TELEGRAM_CHAT_ID_SAMPLE_FALLBACK}
                    branchPlaceholder={TELEGRAM_CHAT_ID_SAMPLE_VALUE}
                    advancedPlaceholder='{"2":"-1002100000002","3":"-1002100000003","_all":"-1002100000999"}'
                    sampleHint="Example: branch 2 to group A, branch 3 to group B. If a branch is blank, _all will be used."
                  />
                </div>

                {normalizedScheduleTimes.map((timeValue, idx) => {
                  const stageLabel =
                    idx === normalizedScheduleTimes.length - 1
                      ? 'Strict'
                      : 'Early';
                  return (
                    <div key={`telegram-template-stage-${idx}`}>
                      <label className="mb-1.5 block text-xs font-medium tracking-wider text-muted-foreground uppercase">
                        {`Telegram Stage ${idx + 1} Template (${stageLabel} - ${timeValue})`}
                      </label>
                      <Textarea
                        value={
                          telegramStageTemplates[idx] ||
                          DEFAULT_TELEGRAM_STAGE_TEMPLATES[idx]
                        }
                        onChange={(e) =>
                          updateTemplateByStage(
                            'telegram',
                            idx,
                            e.target.value,
                          )
                        }
                        rows={4}
                        className="w-full resize-none rounded-md border border-border bg-background/70 px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground/50 transition-all focus-visible:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                      />
                    </div>
                  );
                })}

                <p className="mt-1.5 inline-block rounded-sm bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
                  Variables: <code className="text-foreground">{'{branch}'}</code>,{' '}
                  <code className="text-foreground">{'{date}'}</code>,{' '}
                  <code className="text-foreground">{'{count}'}</code>,{' '}
                  <code className="text-foreground">{'{stores}'}</code>,{' '}
                  <code className="text-foreground">{'{stage}'}</code>,{' '}
                  <code className="text-foreground">{'{totalStages}'}</code>
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="mb-4 flex items-center gap-2.5 border-b border-border/40 pb-3 text-sm font-medium tracking-wider uppercase text-foreground">
                  <span className="rounded-md border border-status-success/20 bg-status-success/10 p-1.5 text-status-success">
                    <MessageSquare className="size-4" aria-hidden="true" />
                  </span>
                  WhatsApp Gateway (API)
                </h4>

                <div>
                  <label
                    htmlFor="afterhours-api-url"
                    className="mb-1.5 block text-xs font-medium text-muted-foreground"
                  >
                    API URL
                  </label>
                  <div className="relative w-full">
                    <Link
                      className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
                      aria-hidden="true"
                    />
                    <Input
                      id="afterhours-api-url"
                      type="text"
                      value={settings.whatsapp_api_url || ''}
                      onChange={(e) =>
                        updateSetting('whatsapp_api_url', e.target.value)
                      }
                      placeholder="https://notifications.example.com/"
                      className="pl-10"
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Untuk Webhook Gateway cukup isi host. Sistem akan otomatis
                    pakai endpoint API yang sesuai.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="afterhours-api-key"
                    className="mb-1.5 block text-xs font-medium text-muted-foreground"
                  >
                    API Key
                  </label>
                  <div className="relative w-full">
                    <Lock
                      className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
                      aria-hidden="true"
                    />
                    <Input
                      id="afterhours-api-key"
                      type="password"
                      value={settings.whatsapp_api_key || ''}
                      onChange={(e) =>
                        updateSetting('whatsapp_api_key', e.target.value)
                      }
                      placeholder={WHATSAPP_API_KEY_SAMPLE}
                      className="pl-10"
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Isi token API key saja (tanpa digabung secret). Contoh dummy
                    API key:{' '}
                    <code className="text-foreground">
                      {WHATSAPP_API_KEY_SAMPLE}
                    </code>
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="afterhours-secret-key"
                    className="mb-1.5 block text-xs font-medium text-muted-foreground"
                  >
                    Secret Key
                  </label>
                  <div className="relative w-full">
                    <Key
                      className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
                      aria-hidden="true"
                    />
                    <Input
                      id="afterhours-secret-key"
                      type="password"
                      value={settings.whatsapp_api_secret || ''}
                      onChange={(e) =>
                        updateSetting('whatsapp_api_secret', e.target.value)
                      }
                      placeholder={WHATSAPP_API_SECRET_SAMPLE}
                      className="pl-10"
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Isi secret key terpisah. Sistem akan menggabungkan otomatis
                    saat request ke Webhook Gateway.
                  </p>
                </div>

                <div>
                  <NotificationTargetEditor
                    icon={Phone as LucideIcon}
                    description="Map each branch to a WhatsApp target. The target can be a group ID or a personal number, and only the matching branch payload will be sent there."
                    mode={notificationEditorMode}
                    branchOptions={NOTIFICATION_BRANCH_OPTIONS}
                    targetMap={whatsappTargetMap}
                    targetDraft={whatsappTargetsDraft}
                    targetError={whatsappTargetsError}
                    onBranchTargetChange={(branchId, value) =>
                      updateNotificationBranchTarget(
                        'whatsapp',
                        branchId,
                        value,
                      )
                    }
                    onDraftChange={(value) =>
                      updateNotificationDraft('whatsapp', value)
                    }
                    fallbackPlaceholder={WHATSAPP_TARGET_SAMPLE_FALLBACK}
                    branchPlaceholder={WHATSAPP_TARGET_SAMPLE_GROUP_VALUE}
                    advancedPlaceholder='{"2":"120000000000002","3":"120000000000003","_all":"120000000000099"}'
                    sampleHint="Use a group ID for groups or a personal number for one-to-one delivery. Blank rows fall back to _all."
                  />
                </div>

                {normalizedScheduleTimes.map((timeValue, idx) => {
                  const stageLabel =
                    idx === normalizedScheduleTimes.length - 1
                      ? 'Strict'
                      : 'Early';
                  return (
                    <div key={`whatsapp-template-stage-${idx}`}>
                      <label className="mb-1.5 block text-xs font-medium tracking-wider text-muted-foreground uppercase">
                        {`WhatsApp Stage ${idx + 1} Template (${stageLabel} - ${timeValue})`}
                      </label>
                      <Textarea
                        value={
                          whatsappStageTemplates[idx] ||
                          DEFAULT_WHATSAPP_STAGE_TEMPLATES[idx]
                        }
                        onChange={(e) =>
                          updateTemplateByStage(
                            'whatsapp',
                            idx,
                            e.target.value,
                          )
                        }
                        rows={4}
                        className="w-full resize-none rounded-md border border-border bg-background/70 px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground/50 transition-all focus-visible:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                      />
                    </div>
                  );
                })}

                <p className="mt-1.5 inline-block rounded-sm bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
                  Variables: <code className="text-foreground">{'{branch}'}</code>,{' '}
                  <code className="text-foreground">{'{date}'}</code>,{' '}
                  <code className="text-foreground">{'{count}'}</code>,{' '}
                  <code className="text-foreground">{'{stores}'}</code>,{' '}
                  <code className="text-foreground">{'{stage}'}</code>,{' '}
                  <code className="text-foreground">{'{totalStages}'}</code>
                </p>
              </div>
            </div>

            {/* Schedule + Save / Discard */}
            <div className="flex flex-col gap-6 border-t border-border bg-secondary/20 px-5 py-5 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4 w-full">
                <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {normalizedScheduleTimes.map((timeValue, idx) => (
                    <div key={`schedule-stage-${idx}`} className="w-full">
                      <label className="mb-2 flex items-center gap-1.5 text-xs font-medium tracking-wider text-muted-foreground uppercase">
                        <Clock
                          className="size-3.5 text-primary"
                          aria-hidden="true"
                        />
                        {`Schedule ${idx + 1} (WIB)`}
                      </label>
                      <div className="relative">
                        <div
                          className="pointer-events-none absolute left-3.5 inset-y-0 flex items-center text-muted-foreground/60"
                          aria-hidden="true"
                        >
                          <Clock className="size-4" />
                        </div>
                        <Input
                          type="time"
                          value={timeValue}
                          onChange={(e) =>
                            updateScheduleTime(idx, e.target.value)
                          }
                          className="!h-10 !pl-11 border-border/80 bg-background/70 text-xs focus:border-primary/50"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 mt-4 md:mt-0">
                <Button
                  variant="ghost"
                  onClick={handleDiscardSettings}
                  className="h-10 px-5 text-xs font-medium"
                >
                  Discard
                </Button>
                <Button
                  onClick={handleSaveSettings}
                  className="h-10 px-5 text-xs font-medium"
                >
                  {savingSettings ? (
                    <Loader2
                      className="animate-spin mr-2 size-4"
                      aria-hidden="true"
                    />
                  ) : (
                    <FileText className="mr-2 size-4" aria-hidden="true" />
                  )}
                  {savingSettings ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Toolbar */}
      <Toolbar
        left={
          <>
            <SearchBar
              value={search}
              onValueChange={(val) => {
                setSearch(val ?? '');
                setPage(1);
              }}
              placeholder="Search by store code or name..."
              className="w-full md:max-w-sm"
            />
            <Select
              value={branch ? String(branch) : ''}
              onValueChange={(val) => {
                setBranch(val ?? '');
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full md:w-56">
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
            <DatePicker
              value={date}
              onValueChange={(val) => {
                setDate(val ?? '');
                setPage(1);
              }}
              className="w-full shrink-0 md:w-auto"
            />
          </>
        }
        right={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('');
              setBranch('');
              setPage(1);
            }}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Reset
          </Button>
        }
      />

      {/* Recent Checks */}
      {availableDates.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Recent Checks:
          </span>
          {availableDates.slice(0, 7).map((d) => (
            <Button
              key={d.check_date}
              onClick={() => {
                setDate(d.check_date);
                setPage(1);
              }}
              size="sm"
              variant={d.check_date === date ? 'default' : 'secondary'}
              className={`h-7 rounded-sm px-3 text-xs ${
                d.check_date === date
                  ? ''
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {d.check_date} ({d.violation_count})
            </Button>
          ))}
        </div>
      )}

      {/* Violations by Branch */}
      {branchSummaries.length > 0 && (
        <Card className="py-3">
          <CardContent>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-medium text-foreground">
                Violations by Branch
              </h3>
              <span className="text-xs text-muted-foreground">
                {branchCount} branch(es) affected on {formatDate(date)}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => {
                  setBranch('');
                  setPage(1);
                }}
                size="sm"
                variant={!branch ? 'default' : 'secondary'}
                className={`h-7 rounded-sm px-3 text-xs font-medium ${
                  !branch
                    ? ''
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                All Branches ({totalViolations})
              </Button>
              {branchSummaries.map((b) => {
                const branchId = String(b.branch_id);
                return (
                  <Button
                    key={b.branch_id}
                    type="button"
                    onClick={() => {
                      setBranch(branch === branchId ? '' : branchId);
                      setPage(1);
                    }}
                    size="sm"
                    variant={branch === branchId ? 'default' : 'secondary'}
                    className={`h-7 rounded-sm px-3 text-xs font-medium ${
                      branch === branchId
                        ? ''
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {b.branch_name || `Branch ${b.branch_id}`} (
                    {b.violation_count})
                  </Button>
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
              <Loader2
                className="h-6 w-6 animate-spin text-primary"
                aria-hidden="true"
              />
            </div>
          ) : violations.length === 0 ? (
            <EmptyState
              title="No violations found"
              description={`No after-hours violations detected for ${formatDate(date)}.`}
              icon={
                <CheckCircle2
                  className="size-8 text-status-success/40"
                  aria-hidden="true"
                />
              }
            />
          ) : (
            <>
              <DataTable
                columns={[
                  {
                    header: 'Status',
                    render: (v: any) => (
                      <StatusBadge
                        variant={v.notified ? 'success' : 'warning'}
                        size="sm"
                        live={!v.notified}
                      >
                        {v.notified ? 'NOTIFIED' : 'PENDING'}
                      </StatusBadge>
                    ),
                  },
                  {
                    header: 'PC Identification',
                    render: (v: any) => (
                      <div className="flex flex-col">
                        <span className="text-xs text-foreground tabular-nums">
                          {v.store_code}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {v.store_name || '—'}
                        </span>
                      </div>
                    ),
                  },
                  {
                    header: 'Branch',
                    render: (v: any) => (
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                        {v.branch_name || v.branch_id}
                      </span>
                    ),
                  },
                  {
                    header: 'Last Active (WIB)',
                    className: 'text-xs tabular-nums',
                    render: (v: any) => (
                      <span
                        className={
                          v.last_sync_at
                            ? 'text-status-warning'
                            : 'text-muted-foreground'
                        }
                      >
                        {formatWibTime(v.last_sync_at)}
                      </span>
                    ),
                  },
                  {
                    header: 'Detected At',
                    className: 'text-xs text-muted-foreground tabular-nums',
                    render: (v: any) => formatWibTime(v.detected_at),
                  },
                ]}
                data={violations}
                keyExtractor={(v: any) => v.id}
                noCard
              />

              {pagination && totalPages > 1 && (
                <div className="flex flex-col gap-3 border-t border-border bg-card px-cell-x py-cell-y text-xs sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-muted-foreground">
                    Showing{' '}
                    <span className="font-medium text-foreground">
                      {rangeStart}
                    </span>{' '}
                    to{' '}
                    <span className="font-medium text-foreground">
                      {rangeEnd}
                    </span>{' '}
                    of{' '}
                    <span className="font-medium text-foreground">
                      {totalItems}
                    </span>{' '}
                    results
                  </span>
                  <div className="flex w-full gap-2 sm:w-auto">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() =>
                        setPage((p: number) => Math.max(1, p - 1))
                      }
                      className="flex-1 sm:flex-none"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p: number) => p + 1)}
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
    </>
  );
}
