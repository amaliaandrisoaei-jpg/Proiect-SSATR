import React, { useEffect, useState } from 'react';
import { useOrder } from '../context/OrderContext'; // Import useOrder

interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string | null;
  is_available: boolean;
}

const Menu: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { addItem } = useOrder(); // Use the order context

  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/menu_items`);
        if (response.status === 304) {
          console.log('Menu items not modified.');
          setLoading(false);
          return;
        }
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: MenuItem[] = await response.json();
        setMenuItems(data);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMenuItems();
  }, []);

  if (loading) {
    return <div className="text-center text-lg">Loading menu...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500 text-lg">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-4xl font-bold text-center mb-8">Our Menu</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {menuItems.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
            {item.image_url && (
              <img
                src={item.image_url}
                alt={item.name}
                className="w-full h-48 object-cover"
              />
            )}
            <div className="p-4">
              <h3 className="text-xl font-semibold text-gray-800">{item.name}</h3>
              <p className="text-gray-600 mt-2">{item.description}</p>
              <div className="flex justify-between items-center mt-4">
                <span className="text-lg font-bold text-green-600">${item.price.toFixed(2)}</span>
                {item.is_available ? (
                  <button
                    className="ml-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    onClick={() => addItem({ id: item.id, name: item.name, price: item.price })}
                  >
                    Add to Cart
                  </button>
                ) : (
                  <span className="text-sm text-red-500">Unavailable</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Menu;