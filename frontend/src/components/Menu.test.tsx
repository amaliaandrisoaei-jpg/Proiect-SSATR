import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import Menu from './Menu';
import { OrderProvider, useOrder } from '../context/OrderContext';

const MENU = [
  { id: 1, name: 'Margherita', description: 'Tomato & mozzarella', price: 12.5, category: 'Main Course', image_url: null, is_available: true },
  { id: 2, name: 'Tiramisu', description: 'Coffee dessert', price: 8.5, category: 'Dessert', image_url: null, is_available: false },
];

function CartProbe() {
  const { order } = useOrder();
  return <div data-testid="cart">{`${order.items.length}|${order.total}`}</div>;
}

function renderMenu(children?: ReactNode) {
  return render(
    <OrderProvider>
      <Menu />
      <CartProbe />
      {children}
    </OrderProvider>
  );
}

function mockFetchOnce(value: unknown, ok = true, status = 200) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok, status, json: async () => value }));
}

describe('Menu', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('renders fetched items with formatted prices', async () => {
    mockFetchOnce(MENU);
    renderMenu();

    expect(await screen.findByText('Margherita')).toBeInTheDocument();
    expect(screen.getByText('$12.50')).toBeInTheDocument();
    expect(screen.getByText('Tiramisu')).toBeInTheDocument();
  });

  it('shows "Add to Cart" for available items and "Unavailable" otherwise', async () => {
    mockFetchOnce(MENU);
    renderMenu();

    await screen.findByText('Margherita');
    // Only the available item (Margherita) gets a button; Tiramisu is unavailable.
    expect(screen.getAllByRole('button', { name: /add to cart/i })).toHaveLength(1);
    expect(screen.getByText('Unavailable')).toBeInTheDocument();
  });

  it('adds an available item to the cart and increments on repeat clicks', async () => {
    mockFetchOnce(MENU);
    renderMenu();

    await screen.findByText('Margherita');
    const addButton = screen.getByRole('button', { name: /add to cart/i });

    fireEvent.click(addButton);
    await waitFor(() => expect(screen.getByTestId('cart')).toHaveTextContent('1|12.5'));

    fireEvent.click(addButton);
    await waitFor(() => expect(screen.getByTestId('cart')).toHaveTextContent('1|25'));
  });

  it('renders an error message when the fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }));
    renderMenu();

    expect(await screen.findByText(/Error:/)).toBeInTheDocument();
  });
});
