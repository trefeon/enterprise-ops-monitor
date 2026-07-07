// ---------------------------------------------------------------------------
// AfterHours — NotificationTargetEditor
// ---------------------------------------------------------------------------
import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Globe } from 'lucide-react';
import type { NotificationEditorMode, BranchOption, NotificationTargetMap } from '../types';
import type { LucideIcon } from 'lucide-react';
import { NOTIFICATION_TEXTAREA_CLASS } from '../constants';
import { NotificationTargetRow } from './NotificationTargetRow';
import { getBranchNotificationValue } from '../utils';

interface NotificationTargetEditorProps {
  icon: LucideIcon;
  description: string;
  mode: NotificationEditorMode;
  branchOptions: BranchOption[];
  targetMap: NotificationTargetMap;
  targetDraft: string;
  targetError: string;
  onBranchTargetChange: (branchId: string, value: string) => void;
  onDraftChange: (value: string) => void;
  fallbackPlaceholder: string;
  branchPlaceholder: string;
  advancedPlaceholder: string;
  sampleHint: string;
}

export function NotificationTargetEditor({
  // eslint-disable-next-line no-unused-vars
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
}: NotificationTargetEditorProps) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{description}</p>

      {mode === 'branch' ? (
        <div className="space-y-3 rounded-lg border border-border bg-background/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Branch form menyimpan mapping sebagai JSON di belakang layar. Target yang
              kosong akan memakai fallback{' '}
              <span className="font-medium text-foreground">All Branches</span>.
            </p>
            <span className="rounded-sm bg-muted px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Branch ID → Target
            </span>
          </div>

          <NotificationTargetRow
            label="All Branches fallback"
            helperText="Used when a branch does not have an explicit target."
            value={getBranchNotificationValue(targetMap, '_all')}
            onChange={(value) => onBranchTargetChange('_all', value)}
            placeholder={fallbackPlaceholder}
            icon={<Globe className="size-5" aria-hidden="true" />}
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
                icon={<Icon className="size-4" aria-hidden="true" />}
              />
            );
          })}

          <p className="text-xs text-muted-foreground">
            {sampleHint} Keep branch-specific values in the matching row; the backend will
            send only that branch&apos;s data to the configured target.
          </p>
        </div>
      ) : (
        <div className="space-y-3 rounded-lg border border-border bg-background/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Advanced JSON mode. Use branch IDs as keys and{' '}
              <span className="font-medium text-foreground">_all</span> as fallback. Existing
              custom keys are preserved.
            </p>
            <span className="rounded-sm bg-muted px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Raw JSON
            </span>
          </div>

          <Textarea
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
