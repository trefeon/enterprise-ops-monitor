import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/shared/DatePicker';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { formatTime, formatDateTime } from '../../../lib/date';
import type { HistoryRecord, HistorySummary, HistoryView } from '../types';

interface HistoryDialogProps {
  historyStore: { storeCode: string; storeName: string } | null;
  historyMode: string;
  historyDate: string;
  historyRecords: HistoryRecord[];
  historyLoading: boolean;
  historySummary: HistorySummary | null;
  historyEmptyLabel: string;
  historyViews: HistoryView[];
  onClose: () => void;
  onModeChange: (mode: string) => void;
  onDateChange: (date: string) => void;
}

export function StoreSyncHistoryDialog({
  historyStore,
  historyMode,
  historyDate,
  historyRecords,
  historyLoading,
  historySummary,
  historyEmptyLabel,
  historyViews,
  onClose,
  onModeChange,
  onDateChange,
}: HistoryDialogProps) {
  return (
    <Dialog open={Boolean(historyStore)} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sync History</DialogTitle>
        </DialogHeader>
        {historyStore && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {historyStore.storeCode} - {historyStore.storeName}
            </p>
            <div className="modal-scroll-70 overflow-y-auto overscroll-contain">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Select value={historyMode} onValueChange={(val) => onModeChange(val === null ? '' : val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Last 30 minutes" />
                    </SelectTrigger>
                    <SelectContent>
                      {historyViews.map((view) => (
                        <SelectItem key={view.value} value={view.value}>
                          {view.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <DatePicker
                    value={historyDate}
                    onValueChange={onDateChange}
                    disabled={historyMode === 'recent'}
                    className="w-44"
                  />
                </div>
                {historySummary && (
                  <div className="text-xs text-muted-foreground">
                    Intervals: {historySummary.totalBuckets} | On-time:{' '}
                    {historySummary.syncedBuckets} | Warning: {historySummary.staleBuckets} | Late:{' '}
                    {historySummary.problemBuckets || 0}
                  </div>
                )}
              </div>

              {historyLoading ? (
                <div className="text-center text-muted-foreground py-8">Loading history...</div>
              ) : historyRecords.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">{historyEmptyLabel}</div>
              ) : (
                <div className="space-y-2">
                  {historyRecords.map((record) => {
                    const recordKey = record.id || record.bucketStart || record.polledAt || '';
                    const bucketLabel =
                      record.bucketStart && record.bucketEnd
                        ? `${formatTime(record.bucketStart)} - ${formatTime(record.bucketEnd)}`
                        : null;
                    const isProblem = Boolean(record.isProblem);
                    const isStale = !isProblem && Boolean(record.isStale);
                    const statusLabel = isProblem ? 'Late' : isStale ? 'Warning' : 'On-time';
                    const statusVariant = isProblem
                      ? 'destructive'
                      : isStale
                        ? 'warning'
                        : 'success' as const;
                    const StatusIcon = isProblem
                      ? RefreshCw
                      : isStale
                        ? AlertTriangle
                        : CheckCircle;
                    const statusClass = isProblem
                      ? 'border-status-error/30 bg-status-error/5'
                      : isStale
                        ? 'border-status-warning/30 bg-status-warning/5'
                        : 'border-border bg-muted/30';
                    return (
                      <div
                        key={recordKey}
                        className={`flex items-center justify-between p-3 rounded-lg border ${statusClass}`}
                      >
                        <div className="flex items-center gap-3">
                          <StatusIcon
                            className={`size-4 ${
                              isProblem
                                ? 'text-status-error'
                                : isStale
                                  ? 'text-status-warning'
                                  : 'text-status-success'
                            }`}
                          />
                          <div>
                            <div className="text-sm text-foreground">
                              {bucketLabel ? `Interval ${bucketLabel}` : 'Latest snapshot'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Last sync:{' '}
                              {record.lastSyncAt ? formatTime(record.lastSyncAt) : 'Unknown'}
                              {record.polledAt
                                ? ` • Polled ${formatDateTime(record.polledAt)}`
                                : ''}
                            </div>
                          </div>
                        </div>
                        <StatusBadge variant={statusVariant} size="sm">
                          {statusLabel}
                        </StatusBadge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
