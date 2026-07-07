// ---------------------------------------------------------------------------
// AfterHours — type definitions
// ---------------------------------------------------------------------------

export interface Violation {
  id: string | number;
  store_code: string;
  store_name?: string;
  branch_id: string | number;
  branch_name?: string;
  last_sync_at?: string;
  detected_at?: string;
  notified?: boolean;
}

export interface BranchSummary {
  branch_id: string | number;
  branch_name?: string;
  violation_count: number;
  latest_sync?: string;
}

export interface AfterHoursSummary {
  totalViolations: number;
  byBranch: BranchSummary[];
}

export interface PaginationInfo {
  total: number;
  totalPages: number;
}

export interface BranchOption {
  id: string;
  label: string;
}

export interface AvailableDate {
  check_date: string;
  violation_count: number;
}

export type NotificationTargetMap = Record<string, string>;

export interface NotificationTargetState {
  mapping: NotificationTargetMap;
  draft: string;
  error: string;
}

export type ScheduleTimes = [string, string, string, string];
export type StageTemplates = [string, string, string, string];

export interface AfterHoursSettings {
  notify_enabled?: string | boolean;
  telegram_bot_token?: string;
  telegram_chat_ids?: string;
  whatsapp_api_url?: string;
  whatsapp_api_key?: string;
  whatsapp_api_secret?: string;
  whatsapp_targets?: string;
  warning_schedule_times?: string;
  first_warning_time?: string;
  final_warning_time?: string;
  telegram_template_initial?: string;
  telegram_template_final?: string;
  whatsapp_template_initial?: string;
  whatsapp_template_final?: string;
  monthly_report_whatsapp_targets?: string;
  [key: string]: unknown;
}

export type NotificationChannel = 'telegram' | 'whatsapp';

export type NotificationEditorMode = 'branch' | 'advanced';

export type ActiveTab = 'monitor' | 'report';
