import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Toolbar } from '@/components/shared/Toolbar';
import { SearchBar } from '@/components/shared/SearchBar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCw,
  Calendar,
  Download,
  Loader2,
  FileText,
} from 'lucide-react';
import {
  BRANCH_OPTIONS,
  LIMIT_OPTIONS,
  TOOLBAR_FIELD_CLASS,
  TOOLBAR_BUTTON_CLASS,
  TOOLBAR_ICON_BUTTON_CLASS,
  TOOLBAR_PRIMARY_BUTTON_CLASS,
} from '../types';

interface ReportToolbarProps {
  search: string;
  branch: string;
  limit: string;
  month: string;
  monthOptions: string[];
  windowStart: string;
  canGoNextMonth: boolean;
  isBusy: boolean;
  downloading: boolean;
  generating: boolean;
  hasExportableReport: boolean;
  formatMonthLabel: (m: string) => string;
  onSearchChange: (val: string) => void;
  onBranchChange: (val: string | null) => void;
  onLimitChange: (val: string | null) => void;
  onMonthChange: (val: string | null) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onWindowStartChange: (val: string) => void;
  onResetFilters: () => void;
  onThisMonth: () => void;
  onDownload: () => void;
  onGenerate: () => void;
}

export function ReportToolbar({
  search,
  branch,
  limit,
  month,
  monthOptions,
  windowStart,
  canGoNextMonth,
  isBusy,
  downloading,
  generating,
  hasExportableReport,
  formatMonthLabel,
  onSearchChange,
  onBranchChange,
  onLimitChange,
  onMonthChange,
  onPrevMonth,
  onNextMonth,
  onWindowStartChange,
  onResetFilters,
  onThisMonth,
  onDownload,
  onGenerate,
}: ReportToolbarProps) {
  return (
    <Toolbar>
      <div className="flex w-full flex-col gap-3">
        <div className="grid gap-2 lg:grid-cols-3">
          <SearchBar
            value={search}
            onValueChange={onSearchChange}
            placeholder="Search violating store code or name..."
            className="w-full"
          />
          <Select
            value={branch ? String(branch) : ''}
            onValueChange={onBranchChange}
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
            onValueChange={onLimitChange}
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
                onClick={onPrevMonth}
                aria-label="Previous month"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Select value={month} onValueChange={onMonthChange}>
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
                onClick={onNextMonth}
                disabled={!canGoNextMonth}
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
                onChange={(e) => onWindowStartChange(e.target.value)}
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
              onClick={onResetFilters}
            >
              <RefreshCw className="size-4" />
              Reset
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className={TOOLBAR_BUTTON_CLASS}
              onClick={onThisMonth}
            >
              <Calendar className="size-4" />
              This Month
            </Button>
            {hasExportableReport && (
              <Button
                variant="secondary"
                size="sm"
                className={TOOLBAR_BUTTON_CLASS}
                onClick={onDownload}
                disabled={isBusy}
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
              onClick={onGenerate}
              size="sm"
              className={TOOLBAR_PRIMARY_BUTTON_CLASS}
              disabled={isBusy}
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
  );
}
