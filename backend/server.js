
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import pg from 'pg';
import cors from 'cors'; // Import cors
import menuItemsRoutes from './routes/menuItems.js'; // Import router function
import tablesRoutes from './routes/tables.js'; // Import router function
import ordersRoutes from './routes/orders.js'; // Import router function
import orderItemsRoutes from './routes/orderItems.js'; // Import router function
import statisticsRoutes from './routes/statistics.js'; // Import router function

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

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.emit('welcome', 'Welcome to the restaurant order system!');

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

app.use('/api/menu_items', menuItemsRoutes(io, pool));
app.use('/api/tables', tablesRoutes(io, pool));
app.use('/api/orders', ordersRoutes(io, pool));
app.use('/api/order_items', orderItemsRoutes(io, pool));
app.use('/api/statistics', statisticsRoutes(io, pool));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});