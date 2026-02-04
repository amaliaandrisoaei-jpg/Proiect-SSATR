import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useOrder } from '../context/OrderContext';
import Menu from './Menu';
import OrderCart from './OrderCart';
import CustomerOrderStatus from './CustomerOrderStatus';

const TableCustomerView: React.FC = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const { setTableId, order } = useOrder();

  useEffect(() => {
    if (tableId && parseInt(tableId, 10) !== order.tableId) {
      setTableId(parseInt(tableId, 10));
      console.log(`Table ID set to: ${tableId}`);
    } else if (!tableId && order.tableId) {
      // If tableId is removed from URL, clear context
      setTableId(null);
    }
  }, [tableId, setTableId, order.tableId]);

  return (
    <div className="flex flex-col p-4 w-full"> {/* Changed to flex-col for better stacking */}
      <div className="w-full p-4">
        <Menu />
      </div>
      <div className="w-full p-4">
        <OrderCart fromTableCustomerView={true} /> {/* Pass a prop to OrderCart */}
      </div>
      <div className="w-full p-4">
        <CustomerOrderStatus />
      </div>
    </div>
  );
};

export default TableCustomerView;