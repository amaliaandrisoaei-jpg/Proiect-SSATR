import http from 'http';
import { Server } from 'socket.io';
import pg from 'pg';
import { createApp } from './app.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const app = createApp(pool, io);
server.on('request', app);

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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
