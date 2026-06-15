import pg from 'pg';
import { createServer } from './createServer.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Express + Socket.IO are wired in createServer() so production and the websocket
// tests share identical wiring (see createServer.js / DEF-005).
const { server, io } = createServer(pool, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
