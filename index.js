import express from 'express';
import https from 'https';
import { WebSocketServer } from 'ws';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

import GameServer from './src/GameServer.js';
import IOServer from './src/IOServer.js';
import PSMove from './src/enums/PSMove.js';
import Controller from './src/Controller.js';
import Sync from './src/enums/Sync.js';

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
  IOServer.init(wss);

  // Create Vite in middleware mode (for dev)
  const vite = await createViteServer({
    server: { middlewareMode: true }
  });

  app.use(vite.middlewares); // Use Vite as middleware

  // Serve static files from 'dist' in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
  }

  // WebSocket Connection (Real-Time Updates)
  // const clients = new Set();
  // const wsEmit = (data) => {
  //   clients.forEach((client) => {
  //     if (client.readyState === WebSocket.OPEN) {
  //       client.send(JSON.stringify(data));
  //     }
  //   });
  // }

  // let clientId = 0;
  // wss.on('connection', (ws, req) => {
  //   ws.id = ++clientId;
  //   console.log(`Client ${ws.id} connected`, req.socket.remoteAddress);
  //   clients.add(ws);

  //   ws.on('close', () => {
  //     console.log(`Client ${ws.id} disconnected`, req.socket.remoteAddress);
  //     clients.delete(ws);
  //   });
  // });

  // Reading data from stdin
  const rl = readline.createInterface({
    input: process.stdin,
    // output: process.stdout,
    // terminal: false
  });

  /**
  * @param {Controller} controller
  */
  const processButtons = (controller) => {
    const player = controller.player;
    if(!player) { return; }
    const justPressed = (btn) => controller.buttons & controller.changed & btn;
    const calibToggle = controller.changed & PSMove.Btn_START;
    player.calibrationMode = calibToggle & controller.buttons;
    // Process calibration inputs
    const trigger = controller.buttons & PSMove.Btn_T;
    if(player.calibrationMode) {
      let scaleMod = justPressed(PSMove.Btn_SQUARE) ? 1 : justPressed(PSMove.Btn_CROSS) ? -1 : 0;
      if(trigger) { scaleMod *= 5; }
      controller.scale += scaleMod;
      IOServer.addSync(Sync.CONTROLLER, controller.id, "scale");
    }
  }
  
  // Process line of PSMOVE data
  rl.on('line', (line) => {
    // TODO: multiple controller data in one line, separated by ';'?
    const data = line.split(" ");
    const type = data[0];
    if(type === "move_update") {
      console.log(line);
      // Convert data array to object with named properties
      const msg = {};
      ["type", "id", "x", "y", "z", "qw", "qx", "qy", "qz", "buttons", "trigger"]
        .forEach((key, i) => msg[key] = (key === "type") ? data[i] : Number(data[i]));
      // Update server-side controller
      const controller = GameServer.getController(msg.id);
      const changed = controller.buttons ^ msg.buttons;
      controller.position.set(msg.x, msg.y, msg.z);
      controller.quaternion.set(msg.qx, msg.qy, msg.xz, msg.qw);
      controller.buttons = msg.buttons;
      controller.changed = changed;
      processButtons(controller);
      // Emit info to clients
      IOServer.emit(msg);
    }
    else {
      console.log(`Received a different type of message: ${type}`, line);
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
