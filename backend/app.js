import express from 'express';
import cors from 'cors'; 
import { Server } from 'socket.io';
import http from 'http';

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

export function createApp(pool, io = null) {
  const app = express();
  app.use(cors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  }));
  app.use(express.json());

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

  // Use Routes
  app.use('/api/menu_items', menuItemsRoutes(menuItemService));
  app.use('/api/tables', tablesRoutes(tableService));
  app.use('/api/orders', ordersRoutes(orderService));
  app.use('/api/order_items', orderItemsRoutes(orderItemService));
  app.use('/api/statistics', statisticsRoutes(statisticsService));

  return app;
}
