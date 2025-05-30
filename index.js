import express from 'express';
import https from 'https';
import { WebSocketServer } from 'ws';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import sharp from 'sharp';
import * as THREE from 'three';

import EngineServer from './src/EngineServer.js';
import IOServer from './src/IOServer.js';
import PSMove from './src/enums/PSMove.js';
import Controller from './src/entities/EntityController.js';
import Player from './src/entities/EntityPlayer.js';

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
    // console.log("yawFromQuat", quat.toArray().map(v => v.toFixed(2)), result);
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
      IOServer.addSync(player.id, "quaternion", "yawOffset");
    }
    // Reset position
    else if(dotUp >= verticalThreshold) {
      console.log(`Reset position, up: ${dotUp.toFixed(2)}`);
      const faceDistance = -0.15;
      const targetYaw = yawFromQuat(player.quaternion);
      const faceOffset = new THREE.Vector3(Math.sin(targetYaw) * faceDistance, 0, Math.cos(targetYaw) * faceDistance);
      // Add to controller offset to place the controller in front of the player's face
      const targetPos = player.position.clone().add(faceOffset);
      const movePos = controller.physicalPosition.clone().multiplyScalar(controller.physicalScale).add(player.position);
      controller.offsetPosition.copy(targetPos.sub(movePos));
      controller.updatePosition(player.position);
      // Sync with clients
      IOServer.addSync(controller.id, "position");
    }
    else {
      console.log(`Not within any threshold; up: ${dotUp.toFixed(2)}`);
    }
  }

  /**
  * @param {Controller} controller
  */
  const processButtons = (controller) => {
    // const player = EngineServer.getFirstVRPlayer();
    const player = EngineServer.getEntity(controller.playerId);
    // if(doPrint) console.log("Controller", controller.id, "matches player", player?.id, controller.playerId);
    if(!player) { return; }
    IOServer.addSync(player.id, "position");
    const justPressed = (btn) => controller.buttons & controller.changed & btn;
    const justReleased = (btn) => ~controller.buttons & controller.changed & btn;
    if(justPressed(PSMove.Btn_START)) {
      player.calibrationMode = !player.calibrationMode;
      IOServer.addSync(player.id, "calibrationMode");
      console.log("calibrationMode changed to", player.calibrationMode);
    }
    const trigger = controller.buttons & PSMove.Btn_T;
    // Process calibration inputs
    if(player.calibrationMode) {
      // Adjust position scaling
      let scaleMod = justPressed(PSMove.Btn_SQUARE) ? 0.01 : justPressed(PSMove.Btn_CROSS) ? -0.01 : 0;
      if(trigger) { scaleMod *= 5; }
      if(scaleMod !== 0) {
        controller.physicalScale += scaleMod;
        IOServer.addSync(controller.id, "physicalScale");
      }
    }
    // Calibrate position and rotation
    if(justPressed(PSMove.Btn_SELECT)) {
      resetYaw(player, controller, false);
      console.log("Soft reset!")
    }
    if(controller.timePressed[PSMove.Btn_SELECT] > 1.0 && !controller.hardResetProcessed) {
      resetYaw(player, controller, true);
      controller.hardResetProcessed = true;
      console.log("Hard reset!")
    }
    if(justReleased(PSMove.Btn_SELECT)) {
      controller.hardResetProcessed = false;
      console.log("hardResetProcessed set to", controller.hardResetProcessed)
    }
    // Normal inputs
    player.isMoving = controller.buttons & PSMove.Btn_MOVE;
  }

  // WORLD
  const PLANE_SIZE = 64;
  const DISPLACEMENT_SCALE = 16;

  // Convert world to UV coordinates
  const worldToUV = (x, z) => {
    const u = (x + PLANE_SIZE / 2) / PLANE_SIZE;
    const v = (z + PLANE_SIZE / 2) / PLANE_SIZE; // flip Y
    // const v = 1 - (z + PLANE_SIZE / 2) / PLANE_SIZE; // flip Y
    return { u, v };
  }

  // Load and parse heightmap
  async function loadHeightMap(filePath) {
    const { data, info } = await sharp(filePath)
      // .resize(SEGMENTS_X, SEGMENTS_Y)
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const heightAt = (x, z) => {
      const { u, v } = worldToUV(x, z);
      const i = Math.floor(u * (info.width - 1));
      const j = Math.floor(v * (info.height - 1));

      // TODO: interpolate
      const heightNorm = data[j * info.width + i] / 255;
      return (heightNorm || 0.5) * DISPLACEMENT_SCALE;
    };

    const blerp = (x1, y1, x2, y2, x, y) => {
      let a = (((x2 - x) * (y2 - y)) / ((x2 - x1) * (y2 - y1))) * heightAt(x1, y1)
      let b = (((x - x1) * (y2 - y)) / ((x2 - x1) * (y2 - y1))) * heightAt(x2, y1)
      let c = (((x2 - x) * (y - y1)) / ((x2 - x1) * (y2 - y1))) * heightAt(x1, y2)
      let d = (((x - x1) * (y - y1)) / ((x2 - x1) * (y2 - y1))) * heightAt(x2, y2)
      return a + b + c + d;
    }

    return (x, z) => {
      const fx = Math.floor(x), fz = Math.floor(z)
      return blerp(fx, fz, fx+1 ,fz+1, x, z)
    }
  }

  const getWorldHeight = await loadHeightMap("./public/heightmap.png");

  // Game tick, 30 per second
  const tickrate = 1 / 50;
  setInterval(() => {
    // TODO: proper delta time xd
    const dt = tickrate;
    // Player movement
    for(const controller of EngineServer.controllerCache.values()) {
      /**
       * @type {Player} - player who the controller belongs to
       */
      const player = EngineServer.getEntity(controller.playerId);
      if(!player) { continue; }
      // Player movement
      if(player.isMoving) {
        const yaw = yawFromQuat(player.quaternion);
        // TODO: Why does he have to move backwards?
        const moveDelta = -3 * dt; 
        const x = player.offsetPosition.x + Math.sin(yaw) * moveDelta;
        const z = player.offsetPosition.z + Math.cos(yaw) * moveDelta;
        const y = getWorldHeight(x, z);
        player.offsetPosition.set(x, y, z);
        player.updatePosition();
        console.log(player.position)
        IOServer.addSync(player.id, "position", "offsetPosition");
        controller.updatePosition(player.position);
        IOServer.addSync(controller.id, "position");
      }
    }

    // for(const clientId of IOServer.getActiveClientIDs()) {
    //   const player = EngineServer.getEntity(clientId);
    //   if(!player) { continue; }
      
    // }

    // Movement tick
    // const height = getWorldHeight(x, z);
    // console.log(`Height at (${x}, ${z}) is approximately ${height.toFixed(2)}`);
    // x += (Math.random() - 0.5) * 2;
    // z += (Math.random() - 0.5) * 2;
    // Sync data with clients
    IOServer.emitSync();
  }, 1000 * tickrate);
  
  // Process line of PSMOVE data
  rl.on('line', (line) => {
    const time = performance.now() / 1000;

    // TODO: multiple controller data in one line, separated by ';'?
    const data = line.split(" ");
    const type = data[0];
    if(type === "move_update") {
      if(doPrint) { console.log(line); }
      // console.log(line);
      // Convert data array to object with named properties
      const msg = {};
      ["type", "id", "x", "y", "z", "qw", "qx", "qy", "qz", "buttons", "trigger", "colorValue"]
        .forEach((key, i) => msg[key] = (key === "type") ? data[i] : Number(data[i]));
      // Update server-side controller
      const controller = EngineServer.getEntity(msg.id, Controller);
      // TODO: timestamp server-side controller property
      const dt = controller.timestamp ? time - controller.timestamp : 0.0;
      controller.timestamp = time;
      // TODO: better controller access
      if(!EngineServer.controllerCache.has(controller)) {
        EngineServer.controllerCache.add(controller);
      }
      const changed = controller.buttons ^ msg.buttons;
      const player = EngineServer.getControllerAssignedPlayer(controller);
      controller.physicalPosition.set(msg.x / 100, msg.y / 100, msg.z / 100);
      controller.updatePosition(player?.position);
      controller.physicalQuaternion.set(msg.qx, msg.qy, msg.qz, msg.qw);
      controller.updateQuaternion();
      controller.buttons = msg.buttons;
      controller.changed = changed;
      // TODO: proper color handling
      controller.colorValue = msg.colorValue;
      // if(doPrint) { console.log(controller.color) }
      // Track time pressed
      const btnTime = controller.timePressed;
      for(const buttonValue of Object.values(PSMove)) {
        btnTime[buttonValue] = (controller.buttons & buttonValue) ? (btnTime[buttonValue] ?? 0) + dt : 0;
      }
      IOServer.addSync(controller.id, "position", "quaternion", "buttons", "changed", "colorValue");
      processButtons(controller);
      // Print once a second debug
      if(doPrint) { doPrint = false; setTimeout(() => doPrint = true, 1000); }
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
