import { Modal } from '@/components/shared/Modal';
import { DataTable } from '@/components/shared/DataTable';
import { branchStoresColumns } from '../columns';
import type { EODArea, EODStore, PaginationMeta } from '../types';

interface EODBranchModalProps {
  branch: EODArea | null;
  stores: EODStore[];
  loading: boolean;
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  onClose: () => void;
}

export function EODBranchModal({
  branch,
  stores,
  loading,
  pagination,
  onPageChange,
  onClose,
}: EODBranchModalProps) {
  return (
    <Modal
      open={Boolean(branch)}
      onClose={onClose}
      title={branch?.areaName || 'Branch Detail'}
      maxWidth="max-w-4xl"
    >
      {branch && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {branch.storesTotal || 0} stores &bull; {branch.done || 0} done &bull;{' '}
            {branch.pending || 0} pending &bull;
            <span className={(branch.failed || 0) > 0 ? ' text-status-error font-semibold' : ''}>
              {' '}
              {branch.failed || 0} failed
            </span>
          </p>
          <DataTable
            columns={branchStoresColumns}
            data={stores}
            loading={loading}
            keyExtractor={(row: EODStore) => row.storeCode}
            pagination={pagination}
            onPageChange={onPageChange}
            emptyState={
              <div className="text-center text-muted-foreground py-8">
                No stores found for this branch.
              </div>
            }
            noCard
          />
        </div>
      )}
    </Modal>
  );
}
