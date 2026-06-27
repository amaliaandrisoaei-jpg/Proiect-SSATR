import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';

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

import ManagerDashboard from './ManagerDashboard';

const STATS = {
  totalTables: 4,
  occupiedTables: 1,
  availableTables: 3,
  pendingOrders: 2,
  preparingOrders: 1,
  readyOrders: 0,
  totalRevenue: 50,
};

describe('ManagerDashboard (real-time)', () => {
  beforeEach(() => {
    for (const k of Object.keys(socket.handlers)) delete socket.handlers[k];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => STATS }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('renders the fetched statistics', async () => {
    render(<ManagerDashboard />);

    expect(await screen.findByText('$50.00')).toBeInTheDocument();
    expect(screen.getByText('Occupied: 1')).toBeInTheDocument();
    expect(screen.getByText('Available: 3')).toBeInTheDocument();
    // Active orders summary = pending + preparing + ready = 3.
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('updates live when a statisticsUpdate event arrives', async () => {
    render(<ManagerDashboard />);
    await screen.findByText('$50.00');

    act(() => socket.serverEmit('statisticsUpdate', { ...STATS, totalRevenue: 123.45, pendingOrders: 5 }));

    expect(await screen.findByText('$123.45')).toBeInTheDocument();
    expect(screen.getByText('Pending: 5')).toBeInTheDocument();
  });

  it('shows an error when the statistics request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }));
    render(<ManagerDashboard />);
    expect(await screen.findByText(/Error:/)).toBeInTheDocument();
  });
});
