import { test, expect } from '@playwright/test';

test('the manager dashboard loads and renders live statistics', async ({ page }) => {
  await page.goto('/manager');

  await expect(page.getByRole('heading', { name: /Manager Dashboard/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tables' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Orders' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Total Revenue' })).toBeVisible();

  // A monetary revenue figure is rendered (e.g. "$0.00" / "$18.00").
  await expect(page.getByText(/^\$\d+\.\d{2}$/).first()).toBeVisible();
});
