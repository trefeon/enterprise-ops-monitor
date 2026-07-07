export function getDefaultMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

export function toMonthString(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function shiftMonth(monthValue: string | number, delta: number): string {
  const match = String(monthValue || '').match(/^(\d{4})-(\d{2})$/);
  if (!match) return getDefaultMonth();
  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return getDefaultMonth();
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
  return toMonthString(shifted);
}

export function buildRecentMonthList(anchorMonth: string, total = 12): string[] {
  const list: string[] = [];
  for (let idx = 0; idx < total; idx += 1) {
    list.push(shiftMonth(anchorMonth, -idx));
  }
  return list;
}

export function formatMonthLabel(reportMonth: string): string {
  if (!reportMonth) return '—';
  try {
    const d = new Date(reportMonth + 'T00:00:00+07:00');
    return d.toLocaleDateString('en-US', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: 'long',
    });
  } catch {
    return reportMonth;
  }
}

export function formatWibDateTime(value: string): string {
  if (!value) return '—';

  const raw = String(value).trim();
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date);
    const map: Record<string, string> = {};
    for (const part of parts) {
      map[part.type] = part.value;
    }

    const hour = map.hour === '24' ? '00' : map.hour;
    return `${map.day} ${map.month} ${map.year} ${hour}:${map.minute} WIB`;
  } catch {
    return raw;
  }
}

export function formatGeneratedAt(isoStr: string): string {
  return formatWibDateTime(isoStr);
}

export function formatWibDateOnly(value: string): string {
  if (!value) return '—';

  const raw = String(value).trim();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T00:00:00+07:00`)
    : new Date(raw);

  if (Number.isNaN(date.getTime())) return raw;

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).formatToParts(date);
    const map: Record<string, string> = {};
    for (const part of parts) {
      map[part.type] = part.value;
    }

    return `${map.day} ${map.month} ${map.year}`;
  } catch {
    return raw;
  }
}

export function formatReportTimelineItem(value: string): string {
  const raw = String(value || '').trim();
  if (!raw) return '—';

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return formatWibDateOnly(raw);
  }

  return formatWibDateTime(raw);
}

export function formatWindowLabel(value: string): string {
  if (!value) return '—';
  const normalized = String(value).trim().slice(0, 5);
  return /^\d{2}:\d{2}$/.test(normalized) ? `${normalized} WIB` : String(value);
}

export function base64ToBlob(base64: string, contentType: string): Blob {
  const binary = atob(String(base64 || ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: contentType });
}

export function normalizeReportExportFileName(
  fileName: string,
  contentType: string,
  month: string
): string {
  const fallbackName = `afterhours_report_${month}.xlsx`;
  const rawName = String(fileName || '').trim() || fallbackName;

  if (!String(contentType || '').includes('spreadsheetml.sheet')) {
    return rawName;
  }

  if (rawName.toLowerCase().endsWith('.xlsx')) {
    return rawName;
  }

  if (rawName.toLowerCase().endsWith('.xls')) {
    return `${rawName.slice(0, -4)}.xlsx`;
  }

  return `${rawName}.xlsx`;
}

export function normalizeMonthlyReportWhatsappTargets(value: string): string {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .join(',');
}
