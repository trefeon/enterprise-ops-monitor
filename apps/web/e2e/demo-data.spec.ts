import { expect, test } from '@playwright/test';
import {
  assertDashboardResponsive,
  assertDashboardSections,
  assertNoFrameworkOverlay,
  assertNoHorizontalOverflow,
  collectPageIssues,
  expectVisibleBodyText,
  getApiData,
} from './helpers';

type Row = Record<string, unknown>;

function expectRows<T extends Row>(data: unknown, label: string): T[] {
  expect(Array.isArray(data), `${label} should be an array`).toBe(true);
  const rows = data as T[];
  expect(rows.length, `${label} should have demo rows`).toBeGreaterThan(0);
  return rows;
}

function stringField(row: Row, key: string, label: string) {
  const value = row[key];
  expect(value, `${label}.${key}`).toBeTruthy();
  return String(value);
}

async function visitHealthy(page: Parameters<typeof collectPageIssues>[0], path: string) {
  const issues = collectPageIssues(page);
  await page.goto(path);
  await expect(page.locator('body')).not.toContainText(/Failed to load|Internal Server Error/i);
  await assertNoFrameworkOverlay(page);
  await assertNoHorizontalOverflow(page);
  issues.assertClean();
}

test.describe('public demo sections contain visible data', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('login page renders usable demo form', async ({ page }) => {
    await visitHealthy(page, '/login');
    await expect(page.locator('input[name="username"], input[type="text"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  for (const path of ['/live', '/live.html']) {
    test(`${path} renders live sync demo data`, async ({ page, request }) => {
      const sync = await getApiData<{
        kpi: { total: number };
        branches: Array<{ name: string }>;
      }>(request, '/api/sync/live');
      expect(sync.kpi.total, 'live sync total').toBeGreaterThan(0);
      expect(sync.branches.length, 'live sync branches').toBeGreaterThan(0);

      await visitHealthy(page, path);
      await expectVisibleBodyText(page, sync.branches[0].name, `${path} branch`);
      await expect(page.locator('body')).toContainText(/Live Latency Monitor|Operational Radar/i);
    });
  }
});

test.describe('authenticated demo sections contain visible data', () => {
  test('dashboard renders populated sections', async ({ page, request }) => {
    const summary = await getApiData<{ storesTotal: number }>(request, '/api/dashboard/summary');
    expect(summary.storesTotal, 'dashboard store total').toBeGreaterThan(0);

    await visitHealthy(page, '/');
    await assertDashboardSections(page);
    await expectVisibleBodyText(page, summary.storesTotal, 'dashboard store total');
  });

  test('EOD monitor renders generated store rows', async ({ page, request }) => {
    const rows = expectRows(await getApiData<Row[]>(request, '/api/eod/stores?pageSize=1'), 'EOD rows');
    await visitHealthy(page, '/eod');
    await expectVisibleBodyText(page, stringField(rows[0], 'storeCode', 'EOD row'), 'EOD store code');
  });

  test('store directory renders generated stores', async ({ page, request }) => {
    const rows = expectRows(await getApiData<Row[]>(request, '/api/stores?pageSize=1'), 'store rows');
    await visitHealthy(page, '/stores');
    await expectVisibleBodyText(page, stringField(rows[0], 'storeCode', 'store row'), 'store code');
  });

  test('sync monitor renders generated store status rows', async ({ page, request }) => {
    const rows = expectRows(await getApiData<Row[]>(request, '/api/sync/stores?pageSize=1'), 'sync rows');
    await visitHealthy(page, '/sync');
    await expectVisibleBodyText(page, stringField(rows[0], 'storeCode', 'sync row'), 'sync store code');
  });

  test('employee directory renders generated employees', async ({ page, request }) => {
    const rows = expectRows(
      await getApiData<Row[]>(request, '/api/employees?status=ACTIVE&pageSize=1'),
      'employee rows',
    );
    await visitHealthy(page, '/identity');
    await expectVisibleBodyText(page, stringField(rows[0], 'nik', 'employee row'), 'employee NIK');
  });

  test('backup management renders generated backup files', async ({ page, request }) => {
    const rows = expectRows(await getApiData<Row[]>(request, '/api/backups/files?pageSize=1'), 'backup rows');
    await visitHealthy(page, '/backups');
    await expectVisibleBodyText(page, stringField(rows[0], 'fileName', 'backup row'), 'backup file');
  });

  test('system health renders services and logs', async ({ page, request }) => {
    const services = expectRows(
      await getApiData<Row[]>(request, '/api/system/services'),
      'system services',
    );
    const logs = expectRows(await getApiData<Row[]>(request, '/api/system/logs?pageSize=1'), 'system logs');

    await visitHealthy(page, '/system');
    await expectVisibleBodyText(page, stringField(services[0], 'name', 'system service'), 'system service');
    await expectVisibleBodyText(page, stringField(logs[0], 'component', 'system log'), 'system log');
  });

  test('admin users and roles render demo RBAC data', async ({ page, request }) => {
    const usersData = await getApiData<{ users: Row[] }>(request, '/api/users?pageSize=10');
    const rolesData = await getApiData<{ roles: Row[] }>(request, '/api/roles');
    const users = expectRows(usersData.users, 'user rows');
    const roles = expectRows(rolesData.roles, 'role rows');
    const opsUser = users.find((user) => user.username === 'opsmanager') || users[0];

    await visitHealthy(page, '/admin/users');
    await expectVisibleBodyText(page, stringField(opsUser, 'username', 'user row'), 'user username');

    await visitHealthy(page, '/admin/roles');
    await expectVisibleBodyText(page, stringField(roles[0], 'label', 'role row'), 'role label');
  });

  test('after-hours monitor and report render demo data', async ({ page, request }) => {
    const summary = await getApiData<{
      byBranch: Array<{ branch_name: string }>;
      totalViolations: number;
    }>(request, '/api/afterhours/summary');
    expect(summary.totalViolations, 'after-hours total violations').toBeGreaterThan(0);
    expect(summary.byBranch.length, 'after-hours branch rows').toBeGreaterThan(0);

    await visitHealthy(page, '/admin/afterhours');
    await expectVisibleBodyText(page, summary.byBranch[0].branch_name, 'after-hours branch');
    await expect(page.locator('body')).toContainText(/Violations by Branch/i);

    await page.getByRole('button', { name: /Monthly Report/i }).click();
    await expect(page.locator('body')).toContainText(/Available Reports|Violating Stores/i);
  });

  test('agent updater and office agents render demo machines', async ({ page, request }) => {
    const agents = expectRows(
      await getApiData<Row[]>(request, '/api/agent/monitoring'),
      'agent monitoring rows',
    );
    const hostname = stringField(agents[0], 'hostname', 'agent row');

    await visitHealthy(page, '/agent-updater');
    await expectVisibleBodyText(page, hostname, 'agent updater hostname');

    await visitHealthy(page, '/office-agents');
    await expectVisibleBodyText(page, 'OFC-LT-001', 'office agent hostname');
  });

  test('about and profile render demo context', async ({ page }) => {
    await visitHealthy(page, '/about');
    await expect(page.locator('body')).toContainText(/Operations Hub|Feature Catalog|Portfolio/i);

    await visitHealthy(page, '/profile');
    await expect(page.locator('body')).toContainText(/demo|Demo/i);
  });
});

test.describe('dashboard responsive layout', () => {
  const viewports = [
    { width: 320, height: 844, columns: 1 },
    { width: 390, height: 844, columns: 1 },
    { width: 768, height: 900, columns: 2 },
    { width: 1024, height: 900, columns: 4 },
    { width: 1440, height: 900, columns: 4 },
  ];

  for (const viewport of viewports) {
    test(`dashboard KPI cards fit at ${viewport.width}px`, async ({ page }) => {
      const issues = collectPageIssues(page);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await assertDashboardResponsive(page, viewport.columns);
      issues.assertClean();
    });
  }
});
