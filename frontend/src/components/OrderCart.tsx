import React, { useState, useEffect } from 'react';
import { useOrder } from '../context/OrderContext';

interface OrderCartProps {
  fromTableCustomerView?: boolean;
}

const OrderCart: React.FC<OrderCartProps> = ({ fromTableCustomerView = false }) => {
  const { order, removeItem, updateItemQuantity, clearOrder, setTableId } = useOrder();
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderPlacedSuccessfully, setOrderPlacedSuccessfully] = useState(false);

  useEffect(() => {
    // Reset success message if items are added back to cart
    if (order.items.length > 0 && orderPlacedSuccessfully) {
      setOrderPlacedSuccessfully(false);
    }
  }, [order.items.length, orderPlacedSuccessfully]);

  const handlePlaceOrder = async () => {
    setOrderError(null);
    setIsPlacingOrder(true);
    try {
      if (!order.tableId) {
        throw new Error('Please select a table.');
      }
      if (order.items.length === 0) {
        throw new Error('Your cart is empty.');
      }

      const orderData = {
        table_id: order.tableId,
        items: order.items.map(item => ({
          menu_item_id: item.id,
          quantity: item.quantity,
        })),
      };

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to place order');
      }

      const newOrder = await response.json();
      console.log('Order placed successfully:', newOrder);
      clearOrder();
      setOrderPlacedSuccessfully(true); // Set success flag
      // alert('Order placed successfully!'); // Removed alert, using UI message
    } catch (err) {
      if (err instanceof Error) {
        setOrderError(err.message);
      } else {
        setOrderError('An unknown error occurred while placing order.');
      }
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (order.items.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Order</h2>
        {orderPlacedSuccessfully ? (
          <p className="text-green-600 font-semibold mb-4">Order placed successfully!</p>
        ) : (
          <p className="text-gray-600">Your cart is empty.</p>
        )}
        {!fromTableCustomerView && ( // Conditionally render table select
          <div className="mt-4">
            <label htmlFor="tableSelect" className="block text-gray-700 text-sm font-bold mb-2">
              Select Table:
            </label>
            <input
              type="number"
              id="tableSelect"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Enter Table ID"
              value={order.tableId || ''}
              onChange={(e) => setTableId(e.target.value ? parseInt(e.target.value, 10) : null)}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Order</h2>
      {!fromTableCustomerView && ( // Conditionally render table select
        <div className="mt-4 mb-6">
          <label htmlFor="tableSelect" className="block text-gray-700 text-sm font-bold mb-2">
            Select Table:
          </label>
          <input
            type="number"
            id="tableSelect"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Enter Table ID"
            value={order.tableId || ''}
            onChange={(e) => setTableId(e.target.value ? parseInt(e.target.value, 10) : null)}
          />
        </div>
      )}
      <div className="space-y-4">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between items-center border-b pb-2">
            <div>
              <p className="font-semibold text-gray-800">{item.name}</p>
              <p className="text-sm text-gray-600">${item.price.toFixed(2)} x {item.quantity}</p>
            </div>
            <div className="flex items-center">
              <button
                className="bg-gray-200 text-gray-700 px-2 py-1 rounded-l"
                onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
              >
                -
              </button>
              <span className="bg-gray-100 text-gray-800 px-3 py-1">{item.quantity}</span>
              <button
                className="bg-gray-200 text-gray-700 px-2 py-1 rounded-r"
                onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
              >
                +
              </button>
              <button
                className="ml-4 text-red-500 hover:text-red-700"
                onClick={() => removeItem(item.id)}
              >
                &times;
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex justify-between items-center text-xl font-bold text-gray-800">
        <span>Total:</span>
        <span>${order.total.toFixed(2)}</span>
      </div>
      {orderError && <p className="text-red-500 text-center mt-4">{orderError}</p>}
      <button
        className="mt-6 w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={handlePlaceOrder}
        disabled={isPlacingOrder || order.items.length === 0 || !order.tableId}
      >
        {isPlacingOrder ? 'Placing Order...' : 'Place Order'}
      </button>
      <button
        className="mt-3 w-full bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        onClick={clearOrder}
        disabled={isPlacingOrder}
      >
        Clear Order
      </button>
    </div>
  );
};

export default OrderCart;