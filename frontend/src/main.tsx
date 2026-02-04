import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { OrderProvider } from './context/OrderContext.tsx'; // Import OrderProvider
import { BrowserRouter } from 'react-router-dom'; // Import BrowserRouter

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter> {/* Wrap App with BrowserRouter */}
      <OrderProvider> {/* Wrap App with OrderProvider */}
        <App />
      </OrderProvider>
    </BrowserRouter>
  </StrictMode>,
)
