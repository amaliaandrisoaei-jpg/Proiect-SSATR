import { test, expect } from '@playwright/test';

const API_URL = process.env.E2E_API_URL || 'http://127.0.0.1:3001';

test('a customer can browse the seeded menu from their table page', async ({ page, request }) => {
  const createRes = await request.post(`${API_URL}/api/tables`, {
    data: { qr_code: `e2e-menu-${Date.now()}`, status: 'available' },
  });
  const tableId = (await createRes.json()).id as number;

  await page.goto(`/customer/table/${tableId}`);

  await expect(page.getByRole('heading', { name: /Our Menu/i })).toBeVisible();
  // Seeded items (see backend/seed.js).
  await expect(page.getByText('Margherita Pizza')).toBeVisible();
  await expect(page.getByText('$12.50')).toBeVisible();
  // Items expose an Add-to-Cart action.
  await expect(page.getByRole('button', { name: /add to cart/i }).first()).toBeVisible();
});
