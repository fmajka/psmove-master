import express from 'express';
import https from 'https';
import { WebSocketServer } from 'ws';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import * as THREE from 'three';

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
    const player = GameServer.getFirstVRPlayer();
    if(!player) { return; }
    const justPressed = (btn) => controller.buttons & controller.changed & btn;
    const calibToggle = controller.changed & controller.buttons & PSMove.Btn_START;
    if(calibToggle) {
      player.calibrationMode = !player.calibrationMode;
      IOServer.addSync(Sync.PLAYER, player.id, "calibrationMode");
      console.log("calibMode changed to", player.calibrationMode);
    }
    const trigger = controller.buttons & PSMove.Btn_T;
    // Process calibration inputs
    if(player.calibrationMode) {
      // Adjust position scaling
      let scaleMod = justPressed(PSMove.Btn_SQUARE) ? 0.01 : justPressed(PSMove.Btn_CROSS) ? -0.01 : 0;
      if(trigger) { scaleMod *= 5; }
      controller.scale += scaleMod;
      IOServer.addSync(Sync.CONTROLLER, controller.id, "scale");
      // Adjust player position relatively to controller's position
      if(justPressed(PSMove.Btn_MOVE)) {
        // Offset between player's and controller's position (towards controller yaw)
        const faceDistance = 0.12; 
        const yawFromQuat = (quat) => new THREE.Euler().setFromQuaternion(quat, "YXZ").y;
        // Get controller's yaw rotation
        const controllerYaw = yawFromQuat(controller.quaternion);
        // Calculate offset vector in XZ plane
        const faceOffset = new THREE.Vector3(
          Math.sin(controllerYaw) * faceDistance,
          0,
          Math.cos(controllerYaw) * faceDistance
        );
        // Adjust camera yaw
        const cameraYaw = yawFromQuat(player.quaternionLocal);
        player.yawOffset = controllerYaw - cameraYaw;
        IOServer.addSync(Sync.PLAYER, player.id, "yawOffset");
        // Add to controller offset to place the controller in front of the player's face
        const targetPos = player.position.clone().add(faceOffset);
        // const targetPos = player.position.clone();
        const movePos = controller.physicalPos.clone().multiplyScalar(controller.scale);
        controller.offset.copy(targetPos.sub(movePos));
        controller.updatePosition();
        console.log("Pos", controller.position, "Offset", controller.offset);
        IOServer.addSync(Sync.CONTROLLER, controller.id, "position");
      }
    }
  }
  
  // Process line of PSMOVE data
  let doPrint = true;
  rl.on('line', (line) => {
    // TODO: multiple controller data in one line, separated by ';'?
    const data = line.split(" ");
    const type = data[0];
    if(type === "move_update") {
      if(doPrint) {
        doPrint = false;
        console.log(line);
        setTimeout(() => doPrint = true, 1000);
      }
      // Convert data array to object with named properties
      const msg = {};
      ["type", "id", "x", "y", "z", "qw", "qx", "qy", "qz", "buttons", "trigger"]
        .forEach((key, i) => msg[key] = (key === "type") ? data[i] : Number(data[i]));
      // Update server-side controller
      const controller = GameServer.getController(msg.id);
      const changed = controller.buttons ^ msg.buttons;
      controller.physicalPos.set(msg.x / 100, msg.y / 100, msg.z / 100);
      controller.updatePosition();
      controller.quaternion.set(msg.qx, msg.qy, msg.qz, msg.qw);
      controller.buttons = msg.buttons;
      controller.changed = changed;
      IOServer.addSync(Sync.CONTROLLER, controller.id, "position", "quaternion", "buttons", "changed");
      processButtons(controller);
      // Emit info to clients
      IOServer.emitSync();
      // IOServer.emit(msg);
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
