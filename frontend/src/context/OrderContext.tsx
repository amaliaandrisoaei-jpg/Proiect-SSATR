import React, { createContext, useContext, useState, type ReactNode } from 'react';

// Define the shape of a MenuItem in the cart
export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

// Define the shape of the OrderState
export interface OrderState {
  tableId: number | null;
  items: CartItem[];
  total: number;
}

// Define the shape of the OrderContextType
export interface OrderContextType {
  order: OrderState;
  setTableId: (id: number | null) => void;
  addItem: (menuItem: { id: number; name: string; price: number }) => void;
  removeItem: (itemId: number) => void;
  updateItemQuantity: (itemId: number, quantity: number) => void;
  clearOrder: () => void;
  calculateTotal: () => number;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [order, setOrder] = useState<OrderState>({
    tableId: null,
    items: [],
    total: 0,
  });

  const calculateTotal = (): number => {
    return order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const setTableId = (id: number | null) => {
    setOrder((prevOrder) => ({ ...prevOrder, tableId: id }));
  };

  const addItem = (menuItem: { id: number; name: string; price: number }) => {
    setOrder((prevOrder) => {
      const existingItem = prevOrder.items.find((item) => item.id === menuItem.id);
      let updatedItems: CartItem[];

      if (existingItem) {
        updatedItems = prevOrder.items.map((item) =>
          item.id === menuItem.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        updatedItems = [...prevOrder.items, { ...menuItem, quantity: 1 }];
      }
      return { ...prevOrder, items: updatedItems, total: calculateTotal() };
    });
  };

  const removeItem = (itemId: number) => {
    setOrder((prevOrder) => {
      const updatedItems = prevOrder.items.filter((item) => item.id !== itemId);
      return { ...prevOrder, items: updatedItems, total: calculateTotal() };
    });
  };

  const updateItemQuantity = (itemId: number, quantity: number) => {
    setOrder((prevOrder) => {
      const updatedItems = prevOrder.items
        .map((item) => (item.id === itemId ? { ...item, quantity } : item))
        .filter((item) => item.quantity > 0); // Remove if quantity drops to 0 or less
      return { ...prevOrder, items: updatedItems, total: calculateTotal() };
    });
  };

  const clearOrder = () => {
    setOrder({ tableId: null, items: [], total: 0 });
  };

  // Recalculate total whenever items or quantities change
  React.useEffect(() => {
    setOrder(prevOrder => ({ ...prevOrder, total: calculateTotal() }));
  }, [order.items]);


  const value = {
    order,
    setTableId,
    addItem,
    removeItem,
    updateItemQuantity,
    clearOrder,
    calculateTotal,
  };

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
};

export const useOrder = () => {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
};
