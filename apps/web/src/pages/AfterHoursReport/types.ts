export interface BranchOption {
  id: string;
  label: string;
}

export interface LimitOption {
  value: string;
  label: string;
}

export interface AfterHoursRankingItem {
  store_code: string;
  store_name?: string;
  branch_id?: string;
  branch_name?: string;
  rank: number;
  violation_count: number;
  violation_dates?: string[];
  violation_timestamps?: string[];
  generated_at?: string;
}

export interface AfterHoursSummary {
  totalStores: number;
  totalViolationDays: number;
  reportWindowStart?: string;
}

export interface AvailableMonth {
  report_month: string;
  store_count?: number;
}

export const BRANCH_OPTIONS: BranchOption[] = [
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

export const LIMIT_OPTIONS: LimitOption[] = [
  { value: '10', label: 'Top 10' },
  { value: '20', label: 'Top 20' },
  { value: '50', label: 'Top 50' },
  { value: '100', label: 'All' },
];

export const MONTHLY_REPORT_WHATSAPP_TARGETS_SAMPLE = '120000000000099,000000000000';
export const DEFAULT_WINDOW_START = '23:15';

export const TOOLBAR_FIELD_CLASS = 'w-full';
export const TOOLBAR_BUTTON_CLASS = 'w-full justify-center sm:w-auto';
export const TOOLBAR_ICON_BUTTON_CLASS = '!w-10 shrink-0 !px-0';
export const TOOLBAR_PRIMARY_BUTTON_CLASS = '!h-11 w-full justify-center !rounded-md sm:w-auto';
export const TOOLBAR_META_PILL_CLASS =
  'rounded-sm border border-border bg-background/80 px-3 py-1 text-xs text-muted-foreground';
