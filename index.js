import express from 'express';
import https from 'https';
import { WebSocketServer } from 'ws';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import EventEmitter from 'events';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  // const server = createServer(app);
  const server = https.createServer({
    cert: fs.readFileSync('ssl/cert.pem'),
    key: fs.readFileSync('ssl/key.pem')
  }, app);
  
  app.get('/', (req, res) => {
    res.send("<h1>Test</h1>");
  });

  const wss = new WebSocketServer({ server });

  // Create Vite in middleware mode (for dev)
  const vite = await createViteServer({
    server: { middlewareMode: true }
  });

  app.use(vite.middlewares); // Use Vite as middleware

  // Serve static files from 'dist' in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
  }

  // API route (example)
  app.get('/api/data', (req, res) => {
    res.json({ message: 'Hello from the backend!' });
  });

  // WebSocket Connection (Real-Time Updates)
  const clients = new Set();
  const wsEmit = (data) => {
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }

  wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');
    clients.add(ws);

    // Send a message every 2 seconds
    const interval = setInterval(() => {
      ws.send(JSON.stringify({ time: new Date().toISOString(), msg: "Test?!" }));
    }, 2000);

    // Generic data sending
    ws.on('send', (data) => {
      ws.send(JSON.stringify(data));
    })

    ws.on('close', () => {
      console.log('Client disconnected');
      clients.delete(ws);
      clearInterval(interval);
    });
  });

  // Reading data from stdin
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });
  
  rl.on('line', (line) => {
    const [msg, x, y, z, buttons, trigger, rw, rx, ry, rz] = line.split(" ");
    if(msg === "update") {
      const calibrate = buttons & 524288;
      //console.log(`Update received: rot=(${rw}, ${rx}, ${ry}, ${rz})`);
      wsEmit({type: "update", x, y, z, rw, rx, ry, rz, calibrate})
    }
    else {
      console.log(`Received a different kind of message: ${msg}`);
    }
  });
  
  rl.on('close', () => {
    console.log('Stream closed.');
  });

  // Starting the server
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}

startServer();
