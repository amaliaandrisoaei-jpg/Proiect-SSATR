import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

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
  status: string; // e.g., 'pending', 'preparing', 'ready', 'served'
  total_amount: number;
  created_at: string;
  updated_at: string;
  items: OrderItem[]; // items is always present after fetch
}

const KitchenView: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch orders
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/orders`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: Order[] = await response.json();
      // Filter for active orders (not served or completed)
      setOrders(data.filter(order => order.status !== 'served' && order.status !== 'completed' && order.status !== 'cancelled'));
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred while fetching orders');
      }
    } finally {
      setLoading(false);
    }
  };

  // Effect to fetch orders on mount
  useEffect(() => {
    fetchOrders();

    // Set up Socket.IO connection
    const newSocket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000');


    newSocket.on('connect', () => console.log('KitchenView Socket.IO connected'));
    newSocket.on('disconnect', () => console.log('KitchenView Socket.IO disconnected'));

    newSocket.on('newOrder', (newOrder: Order) => {
      console.log('KitchenView: New order received via Socket.IO', newOrder);
      setOrders(prevOrders => [newOrder, ...prevOrders].filter(order => order.status !== 'served' && order.status !== 'completed' && order.status !== 'cancelled'));
    });

    newSocket.on('orderStatusUpdate', (updatedOrder: Order) => {
      console.log('KitchenView: Order status update received via Socket.IO', updatedOrder);
      setOrders(prevOrders => prevOrders.map(order =>
        order.id === updatedOrder.id ? updatedOrder : order
      ).filter(order => order.status !== 'served' && order.status !== 'completed' && order.status !== 'cancelled'));
    });

    return () => {
      newSocket.disconnect();
    };
  }, []); // Empty dependency array means this runs once on mount

  const handleUpdateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update order status');
      }

      // No need to manually update state here, Socket.IO will push the update
      console.log(`Order ${orderId} status updated to ${newStatus}`);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred while updating status');
      }
    }
  };

  if (loading) {
    return <div className="text-center text-lg">Loading kitchen view...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500 text-lg">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold text-center mb-8">Kitchen Display</h1>
      {orders.length === 0 ? (
        <p className="text-center text-gray-600">No active orders at the moment.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map(order => (
            <div key={order.id} className="bg-white rounded-lg shadow-lg p-6 flex flex-col justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">Order #{order.id} - Table {order.table_id}</h2>
                <p className="text-gray-700 mb-1">Status: <span className="font-semibold">{order.status}</span></p>
                <p className="text-gray-700 mb-1">Total: ${order.total_amount.toFixed(2)}</p>
                <p className="text-sm text-gray-500">Placed: {new Date(order.created_at).toLocaleString()}</p>
                {/* Orders items would go here later */}
                <h3 className="text-lg font-semibold mt-4">Items:</h3>
                {order.items && order.items.length > 0 ? (
                  <ul>
                    {order.items.map((item, index) => (
                      <li key={index} className="text-gray-600 text-sm">- {item.quantity}x {item.menu_item_name} (${item.price.toFixed(2)})</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No items in this order.</p>
                )}
              </div>
              <div className="mt-4">
                <select
                  className="block w-full bg-gray-200 border border-gray-200 text-gray-700 py-2 px-3 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                  value={order.status}
                  onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="preparing">Preparing</option>
                  <option value="ready">Ready</option>
                  <option value="served">Served</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default KitchenView;