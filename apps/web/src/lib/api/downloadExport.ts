import { getWibToday } from '@/lib/date.js';

const WORKBOOK_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export interface WorkbookExportPayload {
  fileName?: string;
  contentType?: string;
  contentBase64?: string;
}

function base64ToBlob(base64: string, contentType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: contentType });
}

export function normalizeWorkbookFileName(fileName: unknown, fallbackBaseName: string): string {
  const fallbackName = `${fallbackBaseName}_${getWibToday()}.xlsx`;
  const rawName = String(fileName || '').trim() || fallbackName;

  if (rawName.toLowerCase().endsWith('.xlsx')) return rawName;
  if (rawName.toLowerCase().endsWith('.xls')) return `${rawName.slice(0, -4)}.xlsx`;
  return `${rawName}.xlsx`;
}

export function downloadWorkbookExport(
  payload: WorkbookExportPayload,
  fallbackBaseName: string
): string {
  const contentType = payload.contentType || WORKBOOK_MIME;

  if (!String(contentType).includes('spreadsheetml.sheet')) {
    throw new Error('Export returned a non-XLSX payload.');
  }

  if (!payload.contentBase64) {
    throw new Error('Export content unavailable.');
  }

  const blob = base64ToBlob(payload.contentBase64, contentType);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  const fileName = normalizeWorkbookFileName(payload.fileName, fallbackBaseName);

  link.href = url;
  link.download = fileName;
  link.click();
  window.URL.revokeObjectURL(url);

  return fileName;
}
