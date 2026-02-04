import React, { useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useOrder } from '../context/OrderContext'; // Import useOrder

interface OrderItem {
  menu_item_id: number;
  quantity: number;
  price: number;
  notes?: string;
  menu_item_name: string; // Add name
  menu_item_description: string; // Add description
}

interface Order {
  id: number;
  table_id: number;
  status: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
  items: OrderItem[]; // Assuming items are always present now
}

const CustomerOrderStatus: React.FC = () => {
  const { order: orderContext } = useOrder(); // Get order context to access tableId
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const [loadingOrder, setLoadingOrder] = useState<boolean>(false);
  const [errorOrder, setErrorOrder] = useState<string | null>(null);

  const currentOrderRef = useRef(currentOrder);
  useEffect(() => {
    currentOrderRef.current = currentOrder;
  }, [currentOrder]);

  // Function to fetch active order for the current table
  const fetchActiveOrderForTable = useCallback(async (tableId: number) => {
    setLoadingOrder(true);
    setErrorOrder(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/orders`); // Fetch all orders
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: Order[] = await response.json();
      // Find the most recent active order for this table
      const activeOrder = data
        .filter(o => o.table_id === tableId && o.status !== 'served' && o.status !== 'completed' && o.status !== 'cancelled')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] || null;
      setCurrentOrder(activeOrder);
    } catch (err) {
      if (err instanceof Error) {
        setErrorOrder(err.message);
      } else {
        setErrorOrder('An unknown error occurred while fetching order');
      }
    } finally {
      setLoadingOrder(false);
    }
  }, []); // No dependencies for this useCallback, it will fetch based on passed tableId


  useEffect(() => {
    if (orderContext.tableId) {
      fetchActiveOrderForTable(orderContext.tableId);
    } else {
      setCurrentOrder(null); // Clear order if no table selected
    }

    // Establish Socket.IO connection
    const newSocket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000');

    newSocket.on('connect', () => {
      console.log('Socket.IO connected from CustomerOrderStatus');
      setSocketConnected(true);
    });

    newSocket.on('newOrder', (order: Order) => {
      console.log('New order received:', order);
      // Update only if this new order is for the current table
      if (orderContext.tableId && order.table_id === orderContext.tableId) {
        setCurrentOrder(order);
      }
    });

    newSocket.on('orderStatusUpdate', (updatedOrder: Order) => {
      console.log('Order status updated:', updatedOrder);
      // Update only if the updated order is the current order displayed
      if (currentOrderRef.current && currentOrderRef.current.id === updatedOrder.id) {
        setCurrentOrder(updatedOrder);
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Socket.IO disconnected from CustomerOrderStatus');
      setSocketConnected(false);
    });


    // Cleanup on component unmount
    return () => {
      newSocket.disconnect();
    };
  }, [orderContext.tableId, fetchActiveOrderForTable]); // Depend only on tableId and memoized fetcher

  if (loadingOrder) {
    return <div className="text-center text-lg">Loading order status...</div>;
  }

  if (errorOrder) {
    return <div className="text-center text-red-500 text-lg">Error: {errorOrder}</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Current Order Status</h2>
      <p className="text-sm text-gray-600 mb-2">Socket.IO Status: {socketConnected ? 'Connected' : 'Disconnected'}</p>
      {orderContext.tableId === null && (
        <p className="text-gray-600">Please select a table to view order status.</p>
      )}
      {orderContext.tableId !== null && currentOrder ? (
        <div>
          <p>Order ID: <span className="font-semibold">{currentOrder.id}</span></p>
          <p>Table ID: <span className="font-semibold">{currentOrder.table_id}</span></p>
          <p>Status: <span className="font-semibold text-blue-600">{currentOrder.status}</span></p>
          <p>Total: <span className="font-semibold">${currentOrder.total_amount.toFixed(2)}</span></p>
          {currentOrder.items && currentOrder.items.length > 0 && (
              <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-2">Items:</h3>
                  <ul>
                      {currentOrder.items.map((item, index) => (
                          <li key={index} className="text-gray-600 text-sm">
                              {item.quantity}x {item.menu_item_name} (${item.price.toFixed(2)})
                          </li>
                      ))}
                  </ul>
              </div>
          )}
          <p className="text-sm text-gray-500 mt-2">Last updated: {new Date(currentOrder.updated_at).toLocaleString()}</p>
        </div>
      ) : (
        orderContext.tableId !== null && !loadingOrder && !errorOrder && (
            <p className="text-gray-600">No active order for this table.</p>
        )
      )}
    </div>
  );
};

export default CustomerOrderStatus;