import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

interface Statistics {
  totalTables: number;
  occupiedTables: number;
  availableTables: number;
  pendingOrders: number;
  preparingOrders: number;
  readyOrders: number;
  totalRevenue: number;
}

const ManagerDashboard: React.FC = () => {
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatistics = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/statistics/summary`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: Statistics = await response.json();
      setStats(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred while fetching statistics');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatistics();

    // Set up Socket.IO connection
    const newSocket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000');


    newSocket.on('connect', () => console.log('ManagerDashboard Socket.IO connected'));
    newSocket.on('disconnect', () => console.log('ManagerDashboard Socket.IO disconnected'));

    newSocket.on('statisticsUpdate', (updatedStats: Statistics) => {
      console.log('ManagerDashboard: Statistics update received via Socket.IO', updatedStats);
      setStats(updatedStats);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  if (loading) {
    return <div className="text-center text-lg">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500 text-lg">Error: {error}</div>;
  }

  if (!stats) {
    return <div className="text-center text-lg">No statistics available.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold text-center mb-8">Manager Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">Tables</h2>
          <p className="text-3xl font-bold text-blue-600">{stats.totalTables}</p>
          <p>Occupied: {stats.occupiedTables}</p>
          <p>Available: {stats.availableTables}</p>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">Orders</h2>
          <p className="text-3xl font-bold text-yellow-600">{stats.pendingOrders + stats.preparingOrders + stats.readyOrders}</p>
          <p>Pending: {stats.pendingOrders}</p>
          <p>Preparing: {stats.preparingOrders}</p>
          <p>Ready: {stats.readyOrders}</p>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">Total Revenue</h2>
          <p className="text-3xl font-bold text-green-600">${stats.totalRevenue.toFixed(2)}</p>
          <p className="text-sm text-gray-500">(All time)</p>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;