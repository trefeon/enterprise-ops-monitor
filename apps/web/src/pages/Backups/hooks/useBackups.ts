import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { BackupFile, BackupFileRow, BackupsPagination, BackupSummary } from '../types';
import type { ApiResponse } from '@/types';

interface DownloadResponse {
  contentBase64: string;
  contentType: string;
  fileName: string;
}

interface BackupRunResponse {
  fileName: string;
}

interface ApiClient {
  get: (url: string, opts?: Record<string, unknown>) => Promise<ApiResponse>;
  post: (url: string, body?: unknown, opts?: Record<string, unknown>) => Promise<ApiResponse>;
  delete: (url: string, opts?: Record<string, unknown>) => Promise<ApiResponse>;
}

interface UseBackupsReturn {
  summary: BackupSummary | null;
  files: BackupFileRow[];
  loadingSummary: boolean;
  loadingFiles: boolean;
  error: string | null;
  pagination: BackupsPagination;
  manualLoading: boolean;
  deleteTarget: BackupFile | null;
  deleteConfirm: string;
  restoreTarget: BackupFile | null;
  restoreConfirm: string;
  setDeleteTarget: (v: BackupFile | null) => void;
  setDeleteConfirm: (v: string) => void;
  setRestoreTarget: (v: BackupFile | null) => void;
  setRestoreConfirm: (v: string) => void;
  setPagination: (
    v: BackupsPagination | ((prev: BackupsPagination) => BackupsPagination),
  ) => void;
  refreshAll: () => Promise<void>;
  handleRefresh: () => void;
  runManualBackup: () => Promise<void>;
  handleDelete: () => Promise<void>;
  handleRestore: () => Promise<void>;
  handleDownload: (row: BackupFileRow) => Promise<void>;
  isLoading: boolean;
  hasNoData: boolean;
  isDemoUser: boolean;
}

const getBackupTypeLabel = (value: string): string => {
  const key = String(value || '').toLowerCase();
  return key === 'manual' ? 'Manual Backup' : 'Automated';
};

export function useBackups(api: ApiClient, isDemoUser: boolean): UseBackupsReturn {
  const [summary, setSummary] = useState<BackupSummary | null>(null);
  const [files, setFiles] = useState<BackupFile[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<BackupsPagination>({
    page: 1,
    pageSize: 25,
    total: 0,
  });
  const [manualLoading, setManualLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BackupFile | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [restoreTarget, setRestoreTarget] = useState<BackupFile | null>(null);
  const [restoreConfirm, setRestoreConfirm] = useState('');

  const refreshSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const res = await api.get('/backups/summary');
      if (!res.ok) throw new Error(res.error?.message || 'Failed to load summary');
      setSummary(res.data as BackupSummary);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load backup summary';
      setError(message);
    } finally {
      setLoadingSummary(false);
    }
  }, [api]);

  const refreshFiles = useCallback(async () => {
    setLoadingFiles(true);
    try {
      const res = await api.get('/backups/files', {
        params: { page: pagination.page, pageSize: pagination.pageSize },
      });
      if (!res.ok) throw new Error(res.error?.message || 'Failed to load files');
      setFiles((res.data || []) as BackupFile[]);
      if (res.meta?.pagination) setPagination(res.meta.pagination);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load backup files';
      setError(message);
    } finally {
      setLoadingFiles(false);
    }
  }, [api, pagination.page, pagination.pageSize]);

  const refreshAll = useCallback(async () => {
    setError(null);
    await Promise.all([refreshSummary(), refreshFiles()]);
  }, [refreshSummary, refreshFiles]);

  const handleRefresh = useCallback(() => {
    if (isDemoUser) {
      toast.warning('Demo Account', {
        description: 'This action is not available in the demo account.',
      });
      return;
    }
    refreshAll();
  }, [isDemoUser, refreshAll]);

  useEffect(() => {
    refreshAll();
    // We intentionally only run on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runManualBackup = async () => {
    if (isDemoUser) {
      toast.warning('Demo Account', {
        description: 'This action is not available in the demo account.',
      });
      return;
    }
    setManualLoading(true);
    try {
      const res = await api.post('/backups/run', { type: 'manual' });
      if (!res.ok) throw new Error(res.error?.message || 'Failed to run backup');
      const data = res.data as BackupRunResponse;
      toast.success('Backup queued', {
        description: `${data.fileName} created.`,
      });
      refreshAll();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Backup failed';
      toast.error('Backup failed', { description: message });
    } finally {
      setManualLoading(false);
    }
  };

  const handleDelete = useCallback(async () => {
    if (isDemoUser) {
      toast.warning('Demo Account', {
        description: 'This action is not available in the demo account.',
      });
      return;
    }
    if (!deleteTarget) return;
    try {
      const res = await api.delete(
        `/backups/files/${encodeURIComponent(deleteTarget.fileName)}`,
        { data: { confirm: deleteConfirm } },
      );
      if (!res.ok) throw new Error(res.error?.message || 'Delete failed');
      toast.success('Backup deleted', { description: deleteTarget.fileName });
      setDeleteTarget(null);
      setDeleteConfirm('');
      refreshAll();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      toast.error('Delete failed', { description: message });
    }
  }, [api, deleteConfirm, deleteTarget, isDemoUser, refreshAll]);

  const handleRestore = useCallback(async () => {
    if (isDemoUser) {
      toast.warning('Demo Account', {
        description: 'This action is not available in the demo account.',
      });
      return;
    }
    if (!restoreTarget) return;
    try {
      const res = await api.post('/backups/restore', {
        fileName: restoreTarget.fileName,
        confirmText: restoreConfirm,
      });
      if (!res.ok) throw new Error(res.error?.message || 'Restore failed');
      toast.warning('Restore queued', { description: restoreTarget.fileName });
      setRestoreTarget(null);
      setRestoreConfirm('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Restore failed';
      toast.error('Restore failed', { description: message });
    }
  }, [api, isDemoUser, restoreConfirm, restoreTarget]);

  const handleDownload = useCallback(
    async (row: BackupFileRow) => {
      if (isDemoUser) {
        toast.warning('Demo Account', {
          description: 'This action is not available in the demo account.',
        });
        return;
      }
      try {
        const res = await api.get(
          `/backups/files/${encodeURIComponent(row.fileName)}/download`,
        );
        if (!res.ok) throw new Error(res.error?.message || 'Download failed');
        const downloadData = res.data as DownloadResponse;
        const { contentBase64, contentType, fileName } = downloadData;
        if (!contentBase64) throw new Error('Backup content unavailable');

        const binary = atob(contentBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], {
          type: contentType || 'application/octet-stream',
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName || row.fileName;
        a.click();
        window.URL.revokeObjectURL(url);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Download failed';
        toast.error('Download failed', { description: message });
      }
    },
    [api, isDemoUser],
  );

  const filesWithMeta = useMemo(
    () =>
      files.map((file) => ({
        ...file,
        typeLabel: getBackupTypeLabel(file.type),
        typeIcon: null,
      })),
    [files],
  );

  const isLoading = loadingSummary || loadingFiles;
  const hasNoData = !summary && files.length === 0;

  return {
    summary,
    files: filesWithMeta as BackupFileRow[],
    loadingSummary,
    loadingFiles,
    error,
    pagination,
    manualLoading,
    deleteTarget,
    deleteConfirm,
    restoreTarget,
    restoreConfirm,
    setDeleteTarget,
    setDeleteConfirm,
    setRestoreTarget,
    setRestoreConfirm,
    setPagination,
    refreshAll,
    handleRefresh,
    runManualBackup,
    handleDelete,
    handleRestore,
    handleDownload,
    isLoading,
    hasNoData,
    isDemoUser,
  };
}
