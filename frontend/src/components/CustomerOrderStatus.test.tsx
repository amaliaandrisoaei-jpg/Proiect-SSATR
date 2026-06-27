import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useEffect } from 'react';
import CustomerOrderStatus from './CustomerOrderStatus';
import { OrderProvider, useOrder } from '../context/OrderContext';

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

function SetTable({ id }: { id: number }) {
  const { setTableId } = useOrder();
  useEffect(() => {
    setTableId(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

const activeOrder = (overrides = {}) => ({
  id: 7,
  table_id: 3,
  status: 'preparing',
  total_amount: 18,
  created_at: '2026-01-01T10:00:00.000Z',
  updated_at: '2026-01-01T10:05:00.000Z',
  items: [{ menu_item_id: 1, quantity: 1, price: 18, menu_item_name: 'Salmon', menu_item_description: 'd' }],
  ...overrides,
});

describe('CustomerOrderStatus (real-time)', () => {
  beforeEach(() => {
    for (const k of Object.keys(socket.handlers)) delete socket.handlers[k];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [activeOrder()] }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('shows the active order fetched for the current table', async () => {
    render(
      <OrderProvider>
        <SetTable id={3} />
        <CustomerOrderStatus />
      </OrderProvider>
    );

    expect(await screen.findByText('Salmon', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('preparing')).toBeInTheDocument();
  });

  it('updates the status live on a matching orderStatusUpdate event', async () => {
    render(
      <OrderProvider>
        <SetTable id={3} />
        <CustomerOrderStatus />
      </OrderProvider>
    );
    await screen.findByText('preparing');

    act(() => socket.serverEmit('orderStatusUpdate', activeOrder({ status: 'ready' })));

    expect(await screen.findByText('ready')).toBeInTheDocument();
  });
});
