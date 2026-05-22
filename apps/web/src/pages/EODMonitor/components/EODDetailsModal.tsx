import { formatDateTime, formatTime } from '@/lib/date';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Modal } from '@/components/shared/Modal';
import { getStatusConfig, formatSourceLabel } from '../columns';
import type { EODStoreDetail } from '../types';

interface EODDetailsModalProps {
  detail: EODStoreDetail | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

export function EODDetailsModal({ detail, loading, error, onClose }: EODDetailsModalProps) {
  if (!detail) return null;

  const store = detail.store;
  const eod = detail.eod;

  return (
    <Modal
      open={!!detail}
      onClose={onClose}
      title={`Store ${store.storeCode}`}
      maxWidth="max-w-2xl"
    >
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading details...</div>
      ) : error ? (
        <div className="text-sm text-status-error">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-section text-sm">
          {/* Store Information */}
          <div className="space-y-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Store Information
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="text-foreground">{store.storeName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Branch</span>
              <span className="text-foreground">{store.areaName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Regional Head</span>
              <span className="text-foreground">{store.region || '-'}</span>
            </div>
          </div>

          {/* EOD Detail */}
          <div className="space-y-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              EOD Detail
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge variant={getStatusConfig(eod.status).variant}>
                {getStatusConfig(eod.status).label}
              </StatusBadge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last EOD</span>
              <span className="text-foreground">{formatDateTime(eod.lastEodAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Sync</span>
              <span className="text-foreground">{formatTime(eod.lastSyncAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Source</span>
              <span className="text-foreground">{formatSourceLabel(eod.source)}</span>
            </div>
            {eod.errorMessage && (
              <div className="text-xs text-status-error">{eod.errorMessage}</div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
