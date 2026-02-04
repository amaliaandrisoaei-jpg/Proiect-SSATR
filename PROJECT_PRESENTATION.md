# Project Presentation Document

## Project Title
Restaurant Order Management System with Live Status

## Project Overview

This project develops a comprehensive Restaurant Order Management System designed to streamline the ordering process, provide real-time order tracking for customers, and offer efficient kitchen and manager interfaces. The system focuses on solution modeling, architectural design, technology integration, and concept demonstration.

**Key Features Implemented:**
*   **Table Management:** Unique QR codes for tables allow customers to access a digital menu specific to their table. Table status (occupied/available) is dynamically updated.
*   **Customer Interface:** Customers can browse a digital menu, add items to a cart, place orders associated with their table, and view real-time order status updates.
*   **Order Management:** Robust backend API for creating, retrieving, and updating orders and individual order items.
*   **Kitchen Interface:** Kitchen staff can view a real-time list of active orders and update their status (e.g., pending, preparing, ready) with immediate feedback to customers.
*   **Manager Dashboard:** Provides live statistics on active tables, pending/preparing orders, and total revenue.
*   **Real-time Communication:** Utilizes Socket.IO for instant updates across all interfaces (new orders, order status changes, table status changes, and manager statistics).

## Technology Stack

*   **Frontend:**
    *   **React:** For building dynamic and interactive user interfaces (Customer, Kitchen, Manager).
    *   **TypeScript:** For type safety and improved code quality.
    *   **Tailwind CSS:** For rapid, utility-first styling and responsive design.
    *   **Vite:** As the build tool for a fast development experience.
    *   **React Router DOM:** For client-side routing, including table-specific URLs for QR codes.
    *   **Shadcn/ui:** For accessible and customizable UI components (e.g., Dialog for QR codes).
    *   **qrcode.react:** For generating QR code images on the frontend.
*   **Backend:**
    *   **Node.js with Express.js:** For the server-side logic, RESTful API endpoints, and handling requests efficiently.
    *   **Socket.IO:** To enable real-time, bidirectional communication between the frontend and backend.
    *   **pg (PostgreSQL client):** For interacting with the database.
    *   **node-pg-migrate:** For managing database schema migrations.
    *   **Nodemon:** For automatic server restarts during development (hot reload).
*   **Database:**
    *   **PostgreSQL:** A robust relational database for storing all application data (menus, orders, tables, etc.).
*   **Infrastructure:**
    *   **Docker & Docker Compose:** For containerization of all services (frontend, backend, database), enabling a consistent and isolated development environment with hot-reloading capabilities.

## System Architecture

The system follows a client-server architecture, orchestrated by Docker Compose.

*   **Frontend (React/Vite):**
    *   Comprises three main views: Customer Interface, Kitchen Interface, and Manager Dashboard.
    *   Interacts with the backend via RESTful API calls for initial data fetching and state manipulation.
    *   Utilizes Socket.IO for real-time updates pushed from the backend.
    *   Uses React Router for navigation and handling table-specific customer views (simulating QR code scans).
*   **Backend (Node.js/Express):**
    *   Acts as the central hub, exposing RESTful API endpoints for CRUD operations on entities like menu items, tables, orders, and order items.
    *   Manages WebSocket connections via Socket.IO, emitting events for new orders, order status changes, table status changes, and real-time statistics updates.
    *   Connects to the PostgreSQL database for data persistence.
    *   Includes a dedicated router structure to organize API endpoints and integrate Socket.IO and DB pool.
*   **Database (PostgreSQL):**
    *   Stores all application data, including `tables`, `menu_items`, `orders`, `order_items`.
    *   Schema managed through `node-pg-migrate`.
*   **Real-time Communication (Socket.IO):**
    *   Provides instant, bidirectional communication between the backend and all connected frontend clients, ensuring all interfaces reflect the latest state without manual refreshes.

**Data Flow:**
1.  **Customer Scans QR Code:** (Simulated by navigating to `/customer/table/:tableId`). Frontend (`TableCustomerView`) extracts `tableId`.
2.  **Customer Browses Menu/Places Order:** Frontend (`Menu`, `OrderCart`) fetches menu items via `GET /api/menu_items`. When an order is placed, `POST /api/orders` is sent to the backend.
3.  **Backend Processes Order:**
    *   Creates `order` and `order_items` in a transaction.
    *   Updates `table` status to 'occupied'.
    *   Emits Socket.IO events: `newOrder`, `tableStatusUpdate`, `statisticsUpdate`.
4.  **Kitchen Receives Order:** Frontend (`KitchenView`) receives `newOrder` event, displays the new order.
5.  **Kitchen Updates Order Status:** `PUT /api/orders/:id/status` is sent to the backend.
6.  **Backend Updates Order/Table Status:**
    *   Updates `order` status.
    *   If status is 'served', 'completed', or 'cancelled', updates `table` status to 'available'.
    *   Emits Socket.IO events: `orderStatusUpdate`, `tableStatusUpdate`, `statisticsUpdate`.
7.  **Customer Sees Update:** Frontend (`CustomerOrderStatus`) receives `orderStatusUpdate` event, displays new status.
8.  **Manager Sees Update:** Frontend (`ManagerDashboard`) receives `statisticsUpdate` event, updates live statistics.

**Simulations / Simplifications:**
*   QR code scanning is simulated by direct URL navigation.
*   User authentication/authorization is not implemented.
*   Complex kitchen routing logic (e.g., different stations) is simplified.
*   Reporting for revenue is a simple sum of completed orders.

## Screenshots

*(To include screenshots, you will need to replace the placeholder image paths below with your actual image files. For better control over size and positioning in Markdown, it's often best to use HTML `<img>` tags directly. Adjust `width` and `height` attributes as needed. `style="display: block; margin: 0 auto;"` will center the image.)*

---

### Main Customer Page (Tables View)

<img src="image.png" alt="Main Customer Page (Tables View)" width="600px" style="display: block; margin: 0 auto;">

---

### QR Code Dialog for a Table

<img src="image-1.png" alt="QR Code Dialog for a Table" width="400px" style="display: block; margin: 0 auto;">

---

### Table-Specific Customer Ordering Interface

<img src="image-2.png" alt="Table-Specific Customer Ordering Interface" width="600px" style="display: block; margin: 0 auto;">

---

### Kitchen Display

<img src="image-3.png" alt="Kitchen Display" width="700px" style="display: block; margin: 0 auto;">

---

### Manager Dashboard

<img src="image-4.png" alt="Manager Dashboard" width="700px" style="display: block; margin: 0 auto;">

---

## Database Schema

*(Please refer to `backend/migrations/[timestamp]_create-initial-tables.js` for the full schema.)*

**Tables:**
*   `id` (SERIAL PRIMARY KEY)
*   `qr_code` (TEXT, UNIQUE, NOT NULL): Unique identifier for the QR code.
*   `status` (TEXT, NOT NULL, DEFAULT 'available'): 'available', 'occupied'.
*   `created_at`, `updated_at`

**Menu Items:**
*   `id` (SERIAL PRIMARY KEY)
*   `name` (TEXT, NOT NULL)
*   `description` (TEXT)
*   `price` (DECIMAL, NOT NULL)
*   `category` (TEXT, NOT NULL)
*   `image_url` (TEXT)
*   `is_available` (BOOLEAN, NOT NULL, DEFAULT TRUE)
*   `created_at`, `updated_at`

**Orders:**
*   `id` (SERIAL PRIMARY KEY)
*   `table_id` (INTEGER, NOT NULL, REFERENCES `tables` ON DELETE CASCADE)
*   `status` (TEXT, NOT NULL, DEFAULT 'pending'): 'pending', 'preparing', 'ready', 'served', 'completed', 'cancelled'.
*   `total_amount` (DECIMAL, NOT NULL, DEFAULT 0)
*   `created_at`, `updated_at`

**Order Items:**
*   `id` (SERIAL PRIMARY KEY)
*   `order_id` (INTEGER, NOT NULL, REFERENCES `orders` ON DELETE CASCADE)
*   `menu_item_id` (INTEGER, NOT NULL, REFERENCES `menu_items` ON DELETE CASCADE)
*   `quantity` (INTEGER, NOT NULL, DEFAULT 1)
*   `price` (DECIMAL, NOT NULL): Price of the item at the time of order.
*   `notes` (TEXT)
*   `created_at`, `updated_at`

## Running the Application

### Prerequisites

*   **Docker Desktop:** Ensure Docker Desktop is installed and running (for Windows/macOS).
*   **Node.js & npm:** While primarily Dockerized, you will need Node.js (v18+) and npm installed on your host machine to run initial `npm install` for `shadcn/ui` or other local tooling, and to execute migration/seed scripts outside of Docker if needed.

### Setup Instructions

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/amaliaandrisoaei-jpg/Proiect-SSATR
    cd restaurant-order-system
    ```
2.  **Backend Initial Setup:**
    *   Navigate to the backend directory: `cd backend`
    *   Install dependencies: `npm install`
    *   Ensure `backend/.env` is correctly configured with `DATABASE_URL` for local migration/seed scripts:
        ```
        DATABASE_URL=postgres://user:password@localhost:5432/restaurantdb
        PORT=3000
        ```
    *   (Optional) If `nodemon.json` or other config files are not present or differ, ensure they align with the project's hot-reload setup.
3.  **Frontend Initial Setup:**
    *   Navigate to the frontend directory: `cd frontend`
    *   Install dependencies: `npm install`
    *   (Optional) If `vite.config.ts` or `tsconfig.json` are not present or differ, ensure they align with the project's hot-reload and alias setup.
4.  **Start Infrastructure (Docker Compose):**
    *   From the project root (`restaurant-order-system` directory), build and start all services:
        ```bash
        docker compose up --build
        ```
    *   *Note: On first run or after significant changes, `--build` is essential. If issues arise, consider `docker compose build --no-cache`.*
5.  **Run Database Migrations:**
    *   Navigate to the backend directory: `cd backend`
    *   Run migrations to create tables: `npm run migrate:up`
6.  **Seed Database (Optional, for demo data):**
    *   From the backend directory: `cd backend`
    *   Populate with sample data: `npm run seed`

### Accessing the Application

*   **Frontend:** Open your web browser to `http://localhost:5173`.
*   **Backend API:** The backend API is available at `http://localhost:3000`.

## Future Improvements

*   **Full CRUD for Tables & Menu Items (Manager Interface):** Allow managers to add, edit, and remove tables and menu items directly from a dedicated interface.
*   **Notifications:** Implement desktop or in-app notifications for kitchen and manager for urgent events.
*   **Reporting:** More detailed revenue reports, popular items, peak hours.
*   **QR Code Management:** Backend endpoints to generate and manage QR codes, perhaps even printable templates.
*   **Table Occupancy Logic:** More sophisticated logic for changing table status (e.g., automatically freeing up a table after a certain period of 'served' status).
*   **Image Uploads:** Allow uploading images for menu items.
