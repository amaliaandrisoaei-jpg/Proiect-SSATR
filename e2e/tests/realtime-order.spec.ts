import { test, expect } from '@playwright/test';

const API_URL = process.env.E2E_API_URL || 'http://127.0.0.1:3001';

/**
 * The showcase scenario: a full real-time order lifecycle flowing over Socket.IO
 * across TWO independent browser contexts (a customer and the kitchen), through
 * the real Dockerised stack.
 */
test('real-time order lifecycle: customer orders → kitchen sees it live → status flows back & frees the table', async ({
  browser,
  request,
}) => {
  // A fresh, guaranteed-available table (keeps the test idempotent across runs).
  const createRes = await request.post(`${API_URL}/api/tables`, {
    data: { qr_code: `e2e-${Date.now()}`, status: 'available' },
  });
  expect(createRes.ok()).toBeTruthy();
  const tableId = (await createRes.json()).id as number;

  // 1. Kitchen opens FIRST and starts listening.
  const kitchenCtx = await browser.newContext();
  const kitchen = await kitchenCtx.newPage();
  await kitchen.goto('/kitchen');
  await expect(kitchen.getByRole('heading', { name: /Kitchen Display/i })).toBeVisible();

  // 2. Customer opens their table page (via the QR URL) and places an order.
  const customerCtx = await browser.newContext();
  const customer = await customerCtx.newPage();
  await customer.goto(`/customer/table/${tableId}`);

  const addButtons = customer.getByRole('button', { name: /add to cart/i });
  await expect(addButtons.first()).toBeVisible();
  await addButtons.first().click();

  await customer.getByRole('button', { name: /place order/i }).click();
  await expect(customer.getByText(/Order placed successfully/i)).toBeVisible();

  // 3. The kitchen receives the new order LIVE (no reload).
  const orderHeading = kitchen.getByRole('heading', { name: new RegExp(`Order #\\d+ - Table ${tableId}$`) });
  await expect(orderHeading).toBeVisible();
  const kitchenCard = kitchen.locator('.bg-white').filter({ has: orderHeading });

  // 4. The customer's status panel shows the live order. Anchor on "Status:" so
  //    we don't also match the "Socket.IO Status:" line.
  const customerStatus = customer.getByText(/^Status:/);
  await expect(customerStatus).toBeVisible();
  await expect(customerStatus).toContainText(/pending|preparing/i);

  // 5. Kitchen advances the order → reflected back to the customer in real time.
  await kitchenCard.getByRole('combobox').selectOption('preparing');
  await expect(customerStatus).toContainText('preparing');

  // 6. Kitchen marks it served → leaves the board, customer sees 'served', table freed.
  await kitchenCard.getByRole('combobox').selectOption('served');
  await expect(kitchenCard).toHaveCount(0);
  await expect(customerStatus).toContainText('served');

  await expect.poll(async () => {
    const res = await request.get(`${API_URL}/api/tables/${tableId}`);
    return (await res.json()).status;
  }).toBe('available');

  await customerCtx.close();
  await kitchenCtx.close();
});
