import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { socket } = vi.hoisted(() => {
  const handlers: Record<string, Array<(p: unknown) => void>> = {};
  return {
    socket: {
      handlers,
      on: (e: string, cb: (p: unknown) => void) => { (handlers[e] ||= []).push(cb); },
      off: () => {},
      emit: () => {},
      disconnect: () => {},
      serverEmit: (e: string, p: unknown) => { (handlers[e] || []).forEach((cb) => cb(p)); },
    },
  };
});
vi.mock('socket.io-client', () => ({ io: () => socket }));

import Tables from './Tables';

const TABLES = [
  { id: 1, qr_code: 'qr-1', status: 'available' },
  { id: 2, qr_code: 'qr-2', status: 'occupied' },
];

function renderTables() {
  return render(
    <MemoryRouter>
      <Tables />
    </MemoryRouter>
  );
}

describe('Tables (real-time)', () => {
  beforeEach(() => {
    for (const k of Object.keys(socket.handlers)) delete socket.handlers[k];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => TABLES }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('renders tables with their availability', async () => {
    renderTables();

    expect(await screen.findByText('Table 1')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText('Occupied')).toBeInTheDocument();
    // Available table -> actionable QR button; occupied -> disabled.
    expect(screen.getByRole('button', { name: /show qr code/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /table occupied/i })).toBeDisabled();
  });

  it('reflects a tableStatusUpdate event live (available -> occupied)', async () => {
    renderTables();
    await screen.findByText('Table 1');

    act(() => socket.serverEmit('tableStatusUpdate', { id: 1, qr_code: 'qr-1', status: 'occupied' }));

    // Table 1's button flips to the disabled "Table Occupied" state.
    const occupiedButtons = await screen.findAllByRole('button', { name: /table occupied/i });
    expect(occupiedButtons).toHaveLength(2);
  });
});
