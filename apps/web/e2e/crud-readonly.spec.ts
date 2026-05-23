import { expect, test } from '@playwright/test';
import { API_URL, expectDemoReadOnly, loginViaApi } from './helpers';

test('demo user does not see store or employee edit controls', async ({ page }) => {
  await page.goto('/stores');
  await expect(page.getByRole('heading', { name: /Store Directory/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Add Store/i })).toHaveCount(0);

  await page.goto('/identity');
  await expect(page.getByRole('heading', { name: /Employee Directory/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Add Employee/i })).toHaveCount(0);
});

test('demo store writes are blocked and not persisted', async ({ request }) => {
  const { token } = await loginViaApi(request);
  const headers = { Authorization: `Bearer ${token}` };
  const storeCode = 'E2E_STORE_READONLY';

  await expectDemoReadOnly(
    request.post(`${API_URL}/api/stores`, {
      headers,
      data: {
        storeCode,
        storeName: 'E2E Read Only Store',
        branchId: '1',
        region: 'E2E',
        isActive: true,
      },
    }),
  );

  await expectDemoReadOnly(
    request.put(`${API_URL}/api/stores/${storeCode}`, {
      headers,
      data: { storeName: 'E2E Updated Store', branchId: '1' },
    }),
  );

  await expectDemoReadOnly(
    request.delete(`${API_URL}/api/stores/${storeCode}`, { headers }),
  );

  const listResponse = await request.get(`${API_URL}/api/stores?q=${storeCode}`, { headers });
  expect(listResponse.status()).toBe(200);
  const listBody = await listResponse.json();
  const rows = Array.isArray(listBody.data) ? listBody.data : [];
  expect(rows.some((row: { storeCode?: string }) => row.storeCode === storeCode)).toBe(false);
});

test('demo employee writes are blocked and not persisted', async ({ request }) => {
  const { token } = await loginViaApi(request);
  const headers = { Authorization: `Bearer ${token}` };
  const nik = 'E2E_EMPLOYEE_READONLY';

  await expectDemoReadOnly(
    request.post(`${API_URL}/api/employees`, {
      headers,
      data: {
        nik,
        fullName: 'E2E Read Only Employee',
        role: 'Cashier',
        branchId: '1',
        storeCode: '1001',
        status: 'ACTIVE',
      },
    }),
  );

  await expectDemoReadOnly(
    request.put(`${API_URL}/api/employees/${nik}`, {
      headers,
      data: {
        fullName: 'E2E Updated Employee',
        role: 'Supervisor',
        branchId: '1',
        status: 'ACTIVE',
      },
    }),
  );

  await expectDemoReadOnly(
    request.delete(`${API_URL}/api/employees/${nik}`, { headers }),
  );

  const listResponse = await request.get(`${API_URL}/api/employees?q=${nik}`, { headers });
  expect(listResponse.status()).toBe(200);
  const listBody = await listResponse.json();
  const rows = Array.isArray(listBody.data) ? listBody.data : [];
  expect(rows.some((row: { nik?: string }) => row.nik === nik)).toBe(false);
});
