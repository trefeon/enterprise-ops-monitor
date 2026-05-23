import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { test } from '@playwright/test';
import { AUTH_FILE, loginViaApi } from './helpers';

test('authenticate demo user', async ({ page, request }) => {
  const { token, user } = await loginViaApi(request);

  await page.goto('/login');
  await page.evaluate(
    ({ authToken, authUser }) => {
      localStorage.setItem('token', authToken);
      localStorage.setItem('user', JSON.stringify(authUser));
    },
    { authToken: token, authUser: user },
  );

  mkdirSync(dirname(AUTH_FILE), { recursive: true });
  await page.context().storageState({ path: AUTH_FILE });
});
