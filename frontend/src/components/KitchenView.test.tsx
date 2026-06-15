import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// Controllable fake socket, hoisted so the vi.mock factory can close over it.
const { socket } = vi.hoisted(() => {
  const handlers: Record<string, Array<(p: unknown) => void>> = {};
  return {
    socket: {
      handlers,
      on: (event: string, cb: (p: unknown) => void) => {
        (handlers[event] ||= []).push(cb);
      },
      off: () => {},
      emit: () => {},
      disconnect: () => {},
      serverEmit: (event: string, payload: unknown) => {
        (handlers[event] || []).forEach((cb) => cb(payload));
      },
    },
  };
});

vi.mock('socket.io-client', () => ({ io: () => socket }));

import KitchenView from './KitchenView';

const orderFixture = (overrides = {}) => ({
  id: 42,
  table_id: 3,
  status: 'pending',
  total_amount: 25.0,
  created_at: '2026-01-01T10:00:00.000Z',
  updated_at: '2026-01-01T10:00:00.000Z',
  items: [{ menu_item_id: 1, quantity: 2, price: 12.5, menu_item_name: 'Pizza', menu_item_description: 'd' }],
  ...overrides,
});

describe('KitchenView (real-time)', () => {
  beforeEach(() => {
    for (const k of Object.keys(socket.handlers)) delete socket.handlers[k];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('shows "No active orders" once loaded with an empty backend', async () => {
    render(<KitchenView />);
    expect(await screen.findByText(/No active orders/i)).toBeInTheDocument();
  });

  it('renders a new order pushed live over the socket (newOrder)', async () => {
    render(<KitchenView />);
    await screen.findByText(/No active orders/i);

    act(() => socket.serverEmit('newOrder', orderFixture()));

    expect(await screen.findByText('Order #42 - Table 3')).toBeInTheDocument();
    expect(screen.getByText(/2x Pizza/)).toBeInTheDocument();
    expect(screen.getByText('Total: $25.00')).toBeInTheDocument();
  });

  it('removes an order from the board when it reaches a terminal status', async () => {
    render(<KitchenView />);
    await screen.findByText(/No active orders/i);

    act(() => socket.serverEmit('newOrder', orderFixture()));
    await screen.findByText('Order #42 - Table 3');

    act(() => socket.serverEmit('orderStatusUpdate', orderFixture({ status: 'served' })));

    await waitFor(() => expect(screen.queryByText('Order #42 - Table 3')).not.toBeInTheDocument());
    expect(screen.getByText(/No active orders/i)).toBeInTheDocument();
  });

  it('advancing the status dropdown PUTs the new status to the API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] });
    vi.stubGlobal('fetch', fetchMock);

    render(<KitchenView />);
    await screen.findByText(/No active orders/i);
    act(() => socket.serverEmit('newOrder', orderFixture()));
    await screen.findByText('Order #42 - Table 3');

    fetchMock.mockClear();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'preparing' } });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/api/orders/42/status');
    expect(options.method).toBe('PUT');
    expect(JSON.parse(options.body)).toEqual({ status: 'preparing' });
  });
});
