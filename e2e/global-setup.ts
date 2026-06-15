import type { FullConfig } from '@playwright/test';

const API_URL = process.env.E2E_API_URL || 'http://127.0.0.1:3001';
const BASE_URL = process.env.E2E_BASE_URL || 'http://127.0.0.1:5174';

async function waitForOk(url: string, label: string, timeoutMs = 180_000) {
  const start = Date.now();
  let lastErr: unknown;
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        // eslint-disable-next-line no-console
        console.log(`[e2e] ${label} ready: ${url}`);
        return;
      }
      lastErr = new Error(`status ${res.status}`);
    } catch (err) {
      lastErr = err;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error(`[e2e] Timed out waiting for ${label} (${url}): ${String(lastErr)}`);
}

/**
 * Belt-and-suspenders readiness gate: even when the stack is started with
 * `--wait`, confirm the API and the frontend actually respond before tests run.
 */
export default async function globalSetup(_config: FullConfig) {
  await waitForOk(`${API_URL}/api/menu_items`, 'backend API');
  await waitForOk(BASE_URL, 'frontend');
}
