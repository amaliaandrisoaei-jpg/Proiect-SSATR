import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import pg from 'pg';
import cors from 'cors'; 

// Import Models
import MenuItemModel from './models/MenuItemModel.js';
import TableModel from './models/TableModel.js';
import OrderModel from './models/OrderModel.js';
import OrderItemModel from './models/OrderItemModel.js';
import StatisticsModel from './models/StatisticsModel.js';

// Import Services
import MenuItemService from './services/MenuItemService.js';
import TableService from './services/TableService.js';
import OrderService from './services/OrderService.js';
import OrderItemService from './services/OrderItemService.js';
import StatisticsService from './services/StatisticsService.js';

// Import Routes
import menuItemsRoutes from './routes/menuItems.js'; 
import tablesRoutes from './routes/tables.js'; 
import ordersRoutes from './routes/orders.js'; 
import orderItemsRoutes from './routes/orderItems.js'; 
import statisticsRoutes from './routes/statistics.js'; 

const { Pool } = pg;

const app = express();
app.use(cors({
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
}));
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring client', err.stack);
  }
  client.query('SELECT NOW()', (err, result) => {
    release();
    if (err) {
      return console.error('Error executing query', err.stack);
    }
    console.log('Connected to PostgreSQL:', result.rows[0].now);
  });
});

// Initialize Models
const menuItemModel = new MenuItemModel(pool);
const tableModel = new TableModel(pool);
const orderModel = new OrderModel(pool);
const orderItemModel = new OrderItemModel(pool);
const statisticsModel = new StatisticsModel(pool);

// Initialize Services
const menuItemService = new MenuItemService(menuItemModel);
const tableService = new TableService(tableModel, io);
const statisticsService = new StatisticsService(statisticsModel, io);
const orderService = new OrderService(orderModel, orderItemModel, tableModel, menuItemModel, statisticsService, io, pool);
const orderItemService = new OrderItemService(orderItemModel);

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.emit('welcome', 'Welcome to the restaurant order system!');

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

// Use Routes
app.use('/api/menu_items', menuItemsRoutes(menuItemService));
app.use('/api/tables', tablesRoutes(tableService));
app.use('/api/orders', ordersRoutes(orderService));
app.use('/api/order_items', orderItemsRoutes(orderItemService));
app.use('/api/statistics', statisticsRoutes(statisticsService));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
