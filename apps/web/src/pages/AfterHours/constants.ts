// ---------------------------------------------------------------------------
// AfterHours — constants
// ---------------------------------------------------------------------------
import type { BranchOption, ScheduleTimes, StageTemplates } from './types';

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

export const NOTIFICATION_BRANCH_OPTIONS = BRANCH_OPTIONS.filter(
  (branch) => branch.id,
);

export const DEFAULT_TELEGRAM_STAGE_TEMPLATES: StageTemplates = [
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

export const DEFAULT_WHATSAPP_STAGE_TEMPLATES: StageTemplates = [
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

export const TELEGRAM_STAGE_TEMPLATE_KEYS = [
  'telegram_template_stage_1',
  'telegram_template_stage_2',
  'telegram_template_stage_3',
  'telegram_template_stage_4',
];

export const WHATSAPP_STAGE_TEMPLATE_KEYS = [
  'whatsapp_template_stage_1',
  'whatsapp_template_stage_2',
  'whatsapp_template_stage_3',
  'whatsapp_template_stage_4',
];

export const TELEGRAM_CHAT_IDS_SAMPLE_BRANCH =
  '{"2":"-1002100000002","3":"-1002100000003","6":"-1002100000006"}';
export const TELEGRAM_CHAT_IDS_SAMPLE_ALL = '{"_all":"-1002100000999"}';
export const TELEGRAM_CHAT_ID_SAMPLE_VALUE = '-1002100000002';
export const TELEGRAM_CHAT_ID_SAMPLE_FALLBACK = '-1002100000999';
export const WHATSAPP_TARGETS_SAMPLE_GROUP_BRANCH =
  '{"2":"120000000000002","3":"120000000000003","6":"120000000000006"}';
export const WHATSAPP_TARGETS_SAMPLE_PERSONAL_BRANCH =
  '{"2":"6200000000002","3":"6200000000003","6":"6200000000006"}';
export const WHATSAPP_TARGET_SAMPLE_GROUP_VALUE = '120000000000002';
export const WHATSAPP_TARGET_SAMPLE_FALLBACK = '120000000000099';
export const WHATSAPP_API_KEY_SAMPLE = 'demo-api-key';
export const WHATSAPP_API_SECRET_SAMPLE = 'demo-api-secret';
export const EMPTY_WARNING_SCHEDULE_TIMES: ScheduleTimes = ['', '', '', ''];

export const NOTIFICATION_FIELD_CLASS =
  '!h-10 border-border/80 bg-background/70 focus:border-primary/50';
export const NOTIFICATION_TEXTAREA_CLASS =
  'min-h-56 w-full rounded-md border border-border/80 bg-background/70 px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/60 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20';

export const PAGE_SIZE = 50;
