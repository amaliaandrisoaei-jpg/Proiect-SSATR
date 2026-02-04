# Restaurant Order Management System with Live Status

## Project Objective

Develop a restaurant ordering system with real-time order tracking and kitchen management. This project serves as a semester project, focusing on solution modeling, architecture design, technology integration, and concept demonstration, rather than building a production-ready application.

## Core Requirements

### Table Management
*   Each table has a unique QR code containing a table ID.
*   Customers scan the QR code to access a digital menu.
*   Multiple customers per table can place orders simultaneously.

### Customer Interface
*   Browse the menu and place orders.
*   Real-time order status updates (ordered → preparing → ready → served).
*   View order history and total bill.

### Kitchen Interface
*   Receive new orders in real-time.
*   Update order status as items are prepared.
*   View current queue and preparation times.

### Manager Dashboard
*   Live statistics: active tables, pending orders, revenue.
*   Average preparation times.
*   Real-time restaurant occupancy.

## Tech Stack

*   **Frontend (Customer, Kitchen, Manager Interfaces):**
    *   **React:** For building dynamic and interactive user interfaces.
    *   **Tailwind CSS:** For rapid, utility-first styling and responsive design.

*   **Backend (API & Business Logic):**
    *   **Node.js with Express.js:** For the server-side logic, API endpoints, and handling requests efficiently.

*   **Real-time Communication:**
    *   **Socket.IO:** To enable real-time, bidirectional communication between the frontend and backend for live updates.

*   **Database:**
    *   **PostgreSQL:** A robust relational database for storing all application data (menus, orders, tables, etc.).

## High-Level Architecture

The system will follow a client-server architecture:

*   **Frontend (React):** Three distinct UIs (Customer, Kitchen, Manager) will be developed using React and styled with Tailwind CSS. These UIs will interact with the backend primarily through API calls and Socket.IO for real-time updates.
*   **Backend (Node.js/Express):** This will be the central hub, exposing RESTful API endpoints for actions like placing orders, fetching menu items, and updating user data. It will also manage WebSocket connections via Socket.IO to push real-time updates to connected clients (e.g., new orders to the kitchen, status changes to customers, live stats to managers).
*   **Database (PostgreSQL):** The backend will connect to a PostgreSQL database to persist all application data.

## Initial Setup Instructions (Summary)

1.  **Create Project Root:** `mkdir restaurant-order-system && cd restaurant-order-system`
2.  **Backend Setup:**
    *   `mkdir backend && cd backend`
    *   `npm init -y`
    *   `npm install express pg socket.io dotenv cors nodemon`
    *   Create `server.js` (as provided in previous instructions).
    *   Create `.env` file with PostgreSQL credentials and port.
    *   Add `dev` script to `package.json` for `nodemon`.
3.  **Frontend Setup:**
    *   `cd ..` (back to project root)
    *   `npm create vite@latest frontend -- --template react`
    *   `cd frontend && npm install`
    *   `npm install socket.io-client`
    *   `npm install -D tailwindcss postcss autoprefixer && npx tailwindcss init -p`
    *   Configure `tailwind.config.js` and `src/index.css` (as provided).
    *   Update `src/App.jsx` for basic Socket.IO testing.
4.  **PostgreSQL Setup:**
    *   Ensure PostgreSQL is installed and running.
    *   Create a database named `restaurantdb`.
    *   (Optional) Create a dedicated database user.
    *   Update `backend/.env` with your PostgreSQL credentials.

## Guidance for Beginners

*   **Start Small:** Focus on one feature at a time. For instance, first get basic menu display working, then order placement, then real-time status.
*   **Version Control:** Initialize a Git repository (`git init` in the `restaurant-order-system` root, then `git add . && git commit -m "Initial project setup"`) and commit your changes frequently.
*   **Understand Each Part:** Don't just copy-paste. Try to understand *why* each line of code or configuration is there.
*   **Ask Questions:** As you encounter issues or have questions about how to implement specific features or concepts, feel free to ask. I'm here to guide you through the development process.
*   **Documentation:** Refer to the official documentation for React, Node.js, Express, Socket.IO, PostgreSQL, and Tailwind CSS.
*   **Error Messages:** Learn to read and understand error messages. They are your best friends in debugging!

Let me know when you've followed these initial setup steps and are ready to move on to the next phase of development!