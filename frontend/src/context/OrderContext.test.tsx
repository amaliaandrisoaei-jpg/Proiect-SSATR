import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { OrderProvider, useOrder } from './OrderContext';

const wrapper = ({ children }: { children: ReactNode }) => <OrderProvider>{children}</OrderProvider>;

const pizza = { id: 1, name: 'Pizza', price: 12.5 };
const cola = { id: 2, name: 'Cola', price: 3 };

function setup() {
  return renderHook(() => useOrder(), { wrapper });
}

describe('OrderContext', () => {
  it('starts empty', () => {
    const { result } = setup();
    expect(result.current.order).toEqual({ tableId: null, items: [], total: 0 });
  });

  it('addItem adds a new line item with quantity 1 and updates the total', () => {
    const { result } = setup();

    act(() => result.current.addItem(pizza));

    expect(result.current.order.items).toEqual([{ ...pizza, quantity: 1 }]);
    expect(result.current.order.total).toBe(12.5);
  });

  it('addItem on an existing item increments its quantity (no duplicate line)', () => {
    const { result } = setup();

    act(() => result.current.addItem(pizza));
    act(() => result.current.addItem(pizza));

    expect(result.current.order.items).toHaveLength(1);
    expect(result.current.order.items[0].quantity).toBe(2);
    expect(result.current.order.total).toBe(25);
  });

  it('sums the total across multiple distinct items', () => {
    const { result } = setup();

    act(() => result.current.addItem(pizza)); // 12.50
    act(() => result.current.addItem(cola)); // + 3.00
    act(() => result.current.addItem(cola)); // + 3.00

    expect(result.current.order.items).toHaveLength(2);
    expect(result.current.order.total).toBe(18.5);
    expect(result.current.calculateTotal()).toBe(18.5);
  });

  it('updateItemQuantity changes quantity and recomputes the total', () => {
    const { result } = setup();
    act(() => result.current.addItem(pizza));

    act(() => result.current.updateItemQuantity(pizza.id, 3));

    expect(result.current.order.items[0].quantity).toBe(3);
    expect(result.current.order.total).toBe(37.5);
  });

  it('updateItemQuantity to 0 (or below) removes the item', () => {
    const { result } = setup();
    act(() => result.current.addItem(pizza));
    act(() => result.current.addItem(cola));

    act(() => result.current.updateItemQuantity(pizza.id, 0));

    expect(result.current.order.items.map((i) => i.id)).toEqual([cola.id]);
    expect(result.current.order.total).toBe(3);
  });

  it('removeItem removes a line and updates the total', () => {
    const { result } = setup();
    act(() => result.current.addItem(pizza));
    act(() => result.current.addItem(cola));

    act(() => result.current.removeItem(pizza.id));

    expect(result.current.order.items.map((i) => i.id)).toEqual([cola.id]);
    expect(result.current.order.total).toBe(3);
  });

  it('setTableId sets and clears the table', () => {
    const { result } = setup();

    act(() => result.current.setTableId(7));
    expect(result.current.order.tableId).toBe(7);

    act(() => result.current.setTableId(null));
    expect(result.current.order.tableId).toBeNull();
  });

  it('clearOrder resets everything', () => {
    const { result } = setup();
    act(() => result.current.setTableId(3));
    act(() => result.current.addItem(pizza));

    act(() => result.current.clearOrder());

    expect(result.current.order).toEqual({ tableId: null, items: [], total: 0 });
  });

  it('useOrder throws when used outside an OrderProvider', () => {
    // Suppress the expected React error boundary log noise.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useOrder())).toThrow('useOrder must be used within an OrderProvider');
    spy.mockRestore();
  });
});
