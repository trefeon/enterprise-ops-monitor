import { statSync } from 'node:fs';
import { expect, test, type APIRequestContext } from '@playwright/test';
import { API_URL, loginViaApi } from './helpers';

async function expectWorkbookPayload(
  request: APIRequestContext,
  token: string,
  path: string,
) {
  const response = await request.get(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.ok).toBe(true);
  expect(body.data.fileName).toMatch(/\.xlsx$/);
  expect(body.data.contentType).toContain('spreadsheetml.sheet');
  expect(body.data.contentType).not.toContain('text/csv');
  expect(body.data.contentBase64.length).toBeGreaterThan(100);
}

test('store export downloads an XLSX workbook', async ({ page, request }, testInfo) => {
  const { token } = await loginViaApi(request);
  await expectWorkbookPayload(request, token, '/api/stores/export');

  await page.goto('/stores');
  await expect(page.getByRole('heading', { name: /Store Directory/i })).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Export Excel/i }).click(),
  ]);

  expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
  const target = testInfo.outputPath(download.suggestedFilename());
  await download.saveAs(target);
  expect(statSync(target).size).toBeGreaterThan(100);
});

test('employee export downloads an XLSX workbook', async ({ page, request }, testInfo) => {
  const { token } = await loginViaApi(request);
  await expectWorkbookPayload(request, token, '/api/employees/export');

  await page.goto('/identity');
  await expect(page.getByRole('heading', { name: /Employee Directory/i })).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Export Excel/i }).click(),
  ]);

  expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
  const target = testInfo.outputPath(download.suggestedFilename());
  await download.saveAs(target);
  expect(statSync(target).size).toBeGreaterThan(100);
});
