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
import { traaPass } from 'three/examples/jsm/tsl/display/TRAAPassNode.js';

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

  // Print only once in a while
  let doPrint = true;

  const yawFromQuat = (quat) => { 
    const result = new THREE.Euler().setFromQuaternion(quat, "YXZ").y
    console.log("yawFromQuat", quat.toArray().map(v => v.toFixed(2)), result);
    return result;
  };

  /**
  * @param {Player} player
  * @param {Controller} controller
  * @param {Boolean} hardReset - Sets camera yaw to controller yaw when false, resets yaw of both to 0 when true
  */
  const resetYaw = (player, controller, hardReset = false) => { 
    const vectorForward = new THREE.Vector3(0, 0, -1);
    const vectorUp = new THREE.Vector3(0, 1, 0);
    const controllerForward = vectorForward.clone().applyQuaternion(controller.physicalQuaternion);
    const dotUp = controllerForward.dot(vectorUp);
    const verticalThreshold = 0.75, horizontalRange = 0.25;

    // Reset yaw
    if(Math.abs(dotUp) <= horizontalRange) {
      const targetYaw = 0; //hardReset ? 0 : yawFromQuat(controller.quaternion);
      console.log(`Reset yaw, up: ${dotUp.toFixed(2)}`);
      const playerYaw = yawFromQuat(player.physicalQuaternion);
      player.yawOffset = targetYaw - playerYaw;
      player.updateQuaternion();
      console.log(`${player.yawOffset} = ${targetYaw} - ${playerYaw}`, player.quaternion.toArray().map(v => v.toFixed(2)));
      IOServer.addSync(Sync.PLAYER, player.id, "yawOffset");
    }
    // Reset position
    else if(dotUp >= verticalThreshold) {
      console.log(`Reset position, up: ${dotUp.toFixed(2)}`);
      const faceDistance = -0.15;
      const targetYaw = yawFromQuat(player.quaternion);
      const faceOffset = new THREE.Vector3(Math.sin(targetYaw) * faceDistance, 0, Math.cos(targetYaw) * faceDistance);
      // Add to controller offset to place the controller in front of the player's face
      const targetPos = player.position.clone().add(faceOffset);
      const movePos = controller.physicalPosition.clone().multiplyScalar(controller.physicalScale);
      controller.offsetPosition.copy(targetPos.sub(movePos));
      controller.updatePosition();
      // Sync with clients
      IOServer.addSync(Sync.CONTROLLER, controller.id, "position");
    }
    else {
      console.log(`Not within any threshold; up: ${dotUp.toFixed(2)}`);
    }
    return;
    // const defaultQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
    const defaultQuaternion = new THREE.Quaternion();
    // Offset between player's and controller's position (towards player facing along XZ plane)
    const faceDistance = -0.3; 
    // const yawFromQuat = (quat) => new THREE.Euler().setFromQuaternion(quat, "XYZ").x;

    // const targetYaw = hardReset ? 0 : yawFromQuat(controller.quaternion);
    console.log("targetYaw", targetYaw)
    const faceOffset = new THREE.Vector3(
      Math.sin(targetYaw) * faceDistance,
      0,
      Math.cos(targetYaw) * faceDistance
    );

    new THREE.Quaternion().invert()

    const playerYaw = yawFromQuat(player.physicalQuaternion);
    player.yawOffset = targetYaw - playerYaw;
    IOServer.addSync(Sync.PLAYER, player.id, "yawOffset");
    // TODO: send player yawOffset to client, use cameraRig
    if(hardReset) {
      const controllerYaw = yawFromQuat(controller.physicalQuaternion);
      // diff * phys = target  --->  diff = target * inverse(phys)
      const physicalInverted = controller.physicalQuaternion.clone().invert()
      const offsetQuaternion = new THREE.Quaternion().multiplyQuaternions(defaultQuaternion, physicalInverted);
      controller.offsetQuaternion = offsetQuaternion;
      controller.yawOffset = targetYaw - controllerYaw;
      controller.updateQuaternion();
      IOServer.addSync(Sync.CONTROLLER, controller.id, "quaternion");
    }
    
    // Add to controller offset to place the controller in front of the player's face
    const targetPos = player.position.clone().add(faceOffset);
    const movePos = controller.physicalPosition.clone().multiplyScalar(controller.physicalScale);
    controller.offsetPosition.copy(targetPos.sub(movePos));
    controller.updatePosition();
    // Sync with clients
    IOServer.addSync(Sync.CONTROLLER, controller.id, "position");
  }

  /**
  * @param {Controller} controller
  */
  const processButtons = (controller) => {
    const player = GameServer.getFirstVRPlayer();

    // if(doPrint)
    //   console.log("getFirstVRPlayer", !!player)
    if(!player) { return; }
    IOServer.addSync(Sync.PLAYER, player.id, "position");
    const justPressed = (btn) => controller.buttons & controller.changed & btn;
    const justReleased = (btn) => ~controller.buttons & controller.changed & btn;
    const calibToggle = controller.changed & controller.buttons & PSMove.Btn_START;
    if(calibToggle) {
      player.calibrationMode = !player.calibrationMode;
      IOServer.addSync(Sync.PLAYER, player.id, "calibrationMode");
      console.log("calibMode changed to", player.calibrationMode);
    }
    if(justPressed(PSMove.Btn_MOVE)) {
      player.yawOffset += Math.PI / 2;
      console.log("quat", player.physicalQuaternion.toArray().map(v => v.toFixed(2)), "yaw", yawFromQuat(player.physicalQuaternion).toFixed(2));
      IOServer.addSync(Sync.PLAYER, player.id, "yawOffset");
    }
    const trigger = controller.buttons & PSMove.Btn_T;
    // Process calibration inputs
    if(player.calibrationMode) {
      // Adjust position scaling
      let scaleMod = justPressed(PSMove.Btn_SQUARE) ? 0.01 : justPressed(PSMove.Btn_CROSS) ? -0.01 : 0;
      if(trigger) { scaleMod *= 5; }
      if(scaleMod !== 0) {
        controller.physicalScale += scaleMod;
        IOServer.addSync(Sync.CONTROLLER, controller.id, "physicalScale");
      }
      // console.log(controller.timePressed[PSMove.Btn_SELECT])
      if(controller.timePressed[PSMove.Btn_SELECT] > 1.0 && !controller.hardResetProcessed) {
        resetYaw(player, controller, true);
        controller.hardResetProcessed = true;
        console.log("Hard reset!")
      }
      if(justReleased(PSMove.Btn_SELECT)) {
        controller.hardResetProcessed = false;
         console.log("hardResetProcessed set to", controller.hardResetProcessed)
      }
      // Adjust controller's position relatively to owning player's position
      if(justPressed(PSMove.Btn_SELECT)) {
        resetYaw(player, controller, false);
        console.log("Soft reset!")
        return;
        // Offset between player's and controller's position (towards player facing along XZ plane)
        const faceDistance = -0.18; 
        const yawFromQuat = (quat) => new THREE.Euler().setFromQuaternion(quat, "YXZ").y;
        // Get player's yaw rotation
        const playerYaw = yawFromQuat(player.quaternion);
        // Calculate offset vector in XZ plane
        const faceOffset = new THREE.Vector3(
          Math.sin(playerYaw) * faceDistance,
          0,
          Math.cos(playerYaw) * faceDistance
        );
        // Adjust controller yaw
        const controllerYaw = yawFromQuat(controller.quaternion);
        controller.yawOffset = playerYaw - controllerYaw;
        console.log("PlayerYaw", playerYaw, "ControllerYaw", controllerYaw, "Offset", controller.yawOffset)
        controller.updateQuaternion();
        // Add to controller offset to place the controller in front of the player's face
        const targetPos = player.position.clone().add(faceOffset);
        const movePos = controller.physicalPosition.clone().multiplyScalar(controller.physicalScale);
        controller.offsetPosition.copy(targetPos.sub(movePos));
        controller.updatePosition();
        // Sync with clients
        IOServer.addSync(Sync.CONTROLLER, controller.id, "position", "quaternion");
      }
    }
  }
  
  // Process line of PSMOVE data
  let prevTime = null;
  rl.on('line', (line) => {
    const time = performance.now() / 1000;
    const dt = prevTime ? time - prevTime : 0.0;
    prevTime = time;

    // TODO: multiple controller data in one line, separated by ';'?
    const data = line.split(" ");
    const type = data[0];
    if(type === "move_update") {
      // if(doPrint) { console.log(line); }
      // Convert data array to object with named properties
      const msg = {};
      ["type", "id", "x", "y", "z", "qw", "qx", "qy", "qz", "buttons", "trigger"]
        .forEach((key, i) => msg[key] = (key === "type") ? data[i] : Number(data[i]));
      // Update server-side controller
      const controller = GameServer.getController(msg.id);
      const changed = controller.buttons ^ msg.buttons;
      controller.physicalPosition.set(msg.x / 100, msg.y / 100, msg.z / 100);
      controller.updatePosition();
      controller.physicalQuaternion.set(msg.qx, msg.qy, msg.qz, msg.qw);
      controller.updateQuaternion();
      controller.buttons = msg.buttons;
      // console.log(msg.buttons)
      controller.changed = changed;
      const btnTime = controller.timePressed;
      for(const buttonValue of Object.values(PSMove)) {
        btnTime[buttonValue] = (controller.buttons & buttonValue) ? (btnTime[buttonValue] ?? 0) + dt : 0;
      }
      IOServer.addSync(Sync.CONTROLLER, controller.id, "position", "quaternion", "buttons", "changed");
      processButtons(controller);
      // Emit info to clients
      IOServer.emitSync();
      // IOServer.emit(msg);
      if(doPrint) {
        doPrint = false;
        setTimeout(() => doPrint = true, 1000);
      }
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
