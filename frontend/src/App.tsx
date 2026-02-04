import React from 'react';
import { Routes, Route, Link } from 'react-router-dom'; // Import router components
import Tables from './components/Tables';
import KitchenView from './components/KitchenView';
import ManagerDashboard from './components/ManagerDashboard';
import TableCustomerView from './components/TableCustomerView'; // Import TableCustomerView
import './App.css';

// Component for the main customer page, primarily for finding tables
const MainCustomerPage: React.FC = () => (
  <div className="flex flex-col p-4 w-full">
    <Tables />
  </div>
);

function App() {
  return (
    <div className="App flex flex-col p-4">
      <header className="mb-4 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Restaurant System</h1>
        <nav className="space-x-2">
          <Link to="/customer" className="py-2 px-4 rounded bg-blue-500 text-white hover:bg-blue-600">
            Customer View
          </Link>
          <Link to="/kitchen" className="py-2 px-4 rounded bg-green-500 text-white hover:bg-green-600">
            Kitchen View
          </Link>
          <Link to="/manager" className="py-2 px-4 rounded bg-yellow-500 text-white hover:bg-yellow-600">
            Manager View
          </Link>
        </nav>
      </header>

      <Routes>
        <Route path="/customer" element={<MainCustomerPage />} />
        <Route path="/customer/table/:tableId" element={<TableCustomerView />} />
        <Route path="/kitchen" element={<KitchenView />} />
        <Route path="/manager" element={<ManagerDashboard />} />
        {/* Default route */}
        <Route path="/" element={<MainCustomerPage />} />
      </Routes>
    </div>
  );
}

export default App;