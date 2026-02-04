import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react'; // Import QRCodeSVG

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'; // Import shadcn/ui dialog components

interface Table {
  id: number;
  qr_code: string;
  status: string; // e.g., 'available', 'occupied'
}

const Tables: React.FC = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [isQrDialogOpen, setIsQrDialogOpen] = useState<boolean>(false);

  const fetchTables = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tables`);
      if (response.status === 304) {
        console.log('Tables data not modified.');
        return;
      }
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: Table[] = await response.json();
      setTables(data);
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

  useEffect(() => {
    fetchTables();

    const newSocket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000');


    newSocket.on('connect', () => console.log('Tables Socket.IO connected'));
    newSocket.on('disconnect', () => console.log('Tables Socket.IO disconnected'));

    newSocket.on('tableStatusUpdate', (updatedTable: Table) => {
      console.log('Tables: Table status update received via Socket.IO', updatedTable);
      setTables(prevTables =>
        prevTables.map(table => (table.id === updatedTable.id ? updatedTable : table))
      );
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  if (loading) {
    return <div className="text-center text-lg">Loading tables...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500 text-lg">Error: {error}</div>;
  }

  const generateQrCodeUrl = (tableId: number) => {
    return `${window.location.origin}/customer/table/${tableId}`;
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-4xl font-bold text-center mb-8">Restaurant Tables</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tables.map((table) => (
          <div key={table.id} className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800">Table {table.id}</h3>
            <p className="text-gray-600 mt-2">QR Code: {table.qr_code}</p>
            <div className="mt-4">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                table.status === 'available' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
              }`}>
                {table.status.charAt(0).toUpperCase() + table.status.slice(1)}
              </span>
            </div>
            <Dialog open={isQrDialogOpen && selectedTableId === table.id} onOpenChange={setIsQrDialogOpen}>
              <DialogTrigger asChild>
                <button
                  className="mt-4 inline-block bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  onClick={() => {
                    setSelectedTableId(table.id);
                    setIsQrDialogOpen(true);
                  }}
                >
                  Show QR Code
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>QR Code for Table {selectedTableId}</DialogTitle>
                </DialogHeader>
                <div className="flex justify-center p-4">
                  {selectedTableId && (
                    <QRCodeSVG
                      value={generateQrCodeUrl(selectedTableId)}
                      size={256}
                      level="H"
                      includeMargin={true}
                    />
                  )}
                </div>
                <p className="text-center text-sm text-gray-600 mt-2">
                  Scan this code to access the customer ordering interface for Table {selectedTableId}.
                </p>
                <Link
                    to={selectedTableId ? `/customer/table/${selectedTableId}` : '#'}
                    className="mt-4 block text-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded"
                    onClick={() => setIsQrDialogOpen(false)}
                >
                    Go to Customer Table View
                </Link>
              </DialogContent>
            </Dialog>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Tables;
