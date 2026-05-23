import { test } from '@playwright/test';
import {
  assertRouteHealthy,
  authenticatedRoutes,
  publicRoutes,
  redirectRoutes,
} from './helpers';

test.describe('public routes', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const route of publicRoutes) {
    test(`${route.name} renders without runtime errors`, async ({ page }) => {
      await assertRouteHealthy(page, route);
    });
  }
});

test.describe('authenticated routes', () => {
  for (const route of authenticatedRoutes) {
    test(`${route.name} renders without runtime errors`, async ({ page }) => {
      await assertRouteHealthy(page, route);
    });
  }

  for (const route of redirectRoutes) {
    test(`${route.name} resolves safely`, async ({ page }) => {
      await assertRouteHealthy(page, route);
    });
  }

  test('Logout route renders confirmation without immediate failure', async ({ page }) => {
    await assertRouteHealthy(page, {
      path: '/logout',
      name: 'Logout',
      expectedText: /Confirm logout|Logout/i,
    });
  });
});
