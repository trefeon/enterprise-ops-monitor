import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { downloadWorkbookExport, normalizeWorkbookFileName } from './downloadExport';

describe('downloadWorkbookExport', () => {
  const createObjectURL = vi.fn(() => 'blob:workbook');
  const revokeObjectURL = vi.fn();
  const click = vi.fn();

  beforeEach(() => {
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    click.mockClear();
    vi.spyOn(window.URL, 'createObjectURL').mockImplementation(createObjectURL);
    vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(revokeObjectURL);
    vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click,
    } as unknown as HTMLAnchorElement);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('downloads xlsx workbook payloads', () => {
    const fileName = downloadWorkbookExport(
      {
        fileName: 'employees.xlsx',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        contentBase64: window.btoa('demo-workbook'),
      },
      'employee_directory'
    );

    expect(fileName).toBe('employees.xlsx');
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:workbook');
  });

  it('rejects non-workbook payloads', () => {
    expect(() =>
      downloadWorkbookExport(
        {
          fileName: 'employees.csv',
          contentType: 'text/csv',
          contentBase64: window.btoa('id,name'),
        },
        'employee_directory'
      )
    ).toThrow(/non-XLSX/);
  });
});

describe('normalizeWorkbookFileName', () => {
  it('normalizes Excel extensions', () => {
    expect(normalizeWorkbookFileName('stores.xls', 'stores_export')).toBe('stores.xlsx');
    expect(normalizeWorkbookFileName('stores', 'stores_export')).toBe('stores.xlsx');
  });
});
