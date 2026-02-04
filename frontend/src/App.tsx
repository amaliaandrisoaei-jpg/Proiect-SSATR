import { useEffect } from 'react';
import { io } from 'socket.io-client';
import './App.css';

function App() {
  useEffect(() => {
    // Replace with your backend URL
    const socket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000');

    socket.on('connect', () => {
      console.log('Connected to backend');
    });

    socket.on('welcome', (message: string) => {
      console.log('Received welcome:', message);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from backend');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <>
      <h1 className="text-3xl font-bold underline">
        Restaurant Order System - Frontend
      </h1>
      <p>Attempting to connect to Socket.IO backend...</p>
    </>
  );
}

export default App;
