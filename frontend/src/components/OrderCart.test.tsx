import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import OrderCart from './OrderCart';
import { OrderProvider, useOrder } from '../context/OrderContext';

interface SeedItem { id: number; name: string; price: number; }

/** Seeds the cart (and optionally a table) once on mount. */
function Seed({ items, tableId }: { items: SeedItem[]; tableId?: number | null }) {
  const { addItem, setTableId } = useOrder();
  useEffect(() => {
    items.forEach((i) => addItem(i));
    if (tableId !== undefined) setTableId(tableId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function renderCart({ items = [], tableId, fromTable = true }: { items?: SeedItem[]; tableId?: number | null; fromTable?: boolean } = {}) {
  return render(
    <OrderProvider>
      <Seed items={items} tableId={tableId} />
      <OrderCart fromTableCustomerView={fromTable} />
    </OrderProvider>
  );
}

const pizza = { id: 1, name: 'Pizza', price: 12.5 };
const cola = { id: 2, name: 'Cola', price: 3 };

describe('OrderCart', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('shows an empty message when the cart is empty', async () => {
    renderCart({ items: [] });
    expect(await screen.findByText('Your cart is empty.')).toBeInTheDocument();
  });

  it('lists items and the total', async () => {
    renderCart({ items: [pizza, cola], tableId: 1 });

    expect(await screen.findByText('Pizza')).toBeInTheDocument();
    expect(screen.getByText('Cola')).toBeInTheDocument();
    expect(screen.getByText('$15.50')).toBeInTheDocument(); // total
  });

  it('increments and decrements item quantity via the +/- buttons', async () => {
    renderCart({ items: [pizza], tableId: 1 });
    await screen.findByText('Pizza');

    fireEvent.click(screen.getByRole('button', { name: '+' }));
    await waitFor(() => expect(screen.getByText('$25.00')).toBeInTheDocument()); // 2 x 12.50

    fireEvent.click(screen.getByRole('button', { name: '-' }));
    await waitFor(() => expect(screen.getByText('$12.50')).toBeInTheDocument()); // back to 1
  });

  it('removes an item with the × button', async () => {
    renderCart({ items: [pizza, cola], tableId: 1 });
    await screen.findByText('Pizza');

    // The × button sits in the Pizza row (first remove button).
    fireEvent.click(screen.getAllByRole('button', { name: '×' })[0]);

    await waitFor(() => expect(screen.queryByText('Pizza')).not.toBeInTheDocument());
    expect(screen.getByText('Cola')).toBeInTheDocument();
  });

  it('places an order: POSTs the right payload, clears the cart and confirms', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({ id: 99 }) });
    vi.stubGlobal('fetch', fetchMock);

    renderCart({ items: [pizza, cola], tableId: 7 });
    await screen.findByText('Pizza');

    fireEvent.click(screen.getByRole('button', { name: /place order/i }));

    await waitFor(() => expect(screen.getByText('Order placed successfully!')).toBeInTheDocument());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({
      table_id: 7,
      items: [
        { menu_item_id: 1, quantity: 1 },
        { menu_item_id: 2, quantity: 1 },
      ],
    });
  });

  it('shows the server error message when placing the order fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: 'Kitchen closed' }) }));

    renderCart({ items: [pizza], tableId: 7 });
    await screen.findByText('Pizza');

    fireEvent.click(screen.getByRole('button', { name: /place order/i }));

    expect(await screen.findByText('Kitchen closed')).toBeInTheDocument();
    // Cart is preserved on failure.
    expect(screen.getByText('Pizza')).toBeInTheDocument();
  });

  it('clears the cart with the Clear Order button', async () => {
    renderCart({ items: [pizza], tableId: 7 });
    await screen.findByText('Pizza');

    fireEvent.click(screen.getByRole('button', { name: /clear order/i }));

    await waitFor(() => expect(screen.getByText('Your cart is empty.')).toBeInTheDocument());
  });
});
