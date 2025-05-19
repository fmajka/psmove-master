// import * as THREE from 'https://cdn.jsdelivr.net/npm/three@latest/build/three.module.js';
import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import PSMove from './enums/PSMove.js';
import Controller from './Controller.js';

// Scene and camera init
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;
camera.lookAt(0,0,0);

// Rendering
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
document.body.appendChild(renderer.domElement);

// Example cube
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// Animation loop
let prevTime = performance.now();
function animate() {
  let time = performance.now();
  const dt = (time - prevTime) / 1000; // Time in seconds
  prevTime = time;
  
  cube.rotation.x += Math.PI * dt;
  cube.rotation.y += Math.PI * dt;

  drawDebugText({x: 0, y: 1.45345, z: 2}, [1,2,3], "test");
  renderer.render(scene, camera);
}

// Update canvas size and camera aspect ratio on window resize
window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
})

//XR
renderer.xr.enabled = true;
document.body.appendChild(VRButton.createButton(renderer));

// Debug
const debugCanvas = document.createElement('canvas');
debugCanvas.width = 384;
debugCanvas.height = 192;
const ctx = debugCanvas.getContext('2d');

const debugTexture = new THREE.CanvasTexture(debugCanvas);
const debugMaterial = new THREE.SpriteMaterial({ map: debugTexture, depthTest: false, transparent: true });
const debugSprite = new THREE.Sprite(debugMaterial);
debugSprite.scale.set(1, 0.5, 1);

// debugSprite.position.set(-0.4, 0.55, -1); // relative to camera
debugSprite.position.set(0.1, 0.1, -1); // relative to camera
camera.add(debugSprite); // attaches to camera
scene.add(camera);

function drawDebugText(...args) {
  ctx.clearRect(0, 0, debugCanvas.width, debugCanvas.height);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, debugCanvas.width, debugCanvas.height);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '8px monospace';
  args.forEach((arg, i) => {
    let text = "";
    if(Array.isArray(arg)) {
      arg.forEach((value) => {
        if(typeof value === "number") { value = value.toFixed(2); }
        text += `${value}, `;
      })
    } 
    else if(typeof arg === "object") {
      for(let [key, value] of Object.entries(arg)) {
        if(typeof value === "number") { value = value.toFixed(2); }
        text += `${key}: ${value}, `;
      }
    }
    else {
      text = arg;
    }
    const x = 10, y = 15 + 15 * i;
    ctx.fillText(text, x, y);
  });
  debugTexture.needsUpdate = true;
}

// The controller object
const controller = new Controller(scene);
// const controller = {
//   object: null,
//   offset: new THREE.Vector3(),
//   init: () => {
//     const stick = new THREE.Mesh(
//       // new THREE.BoxGeometry(1, 1, 3),
//       new THREE.BoxGeometry(4, 4, 14),
//       new THREE.MeshBasicMaterial({ color: 0x0044ff })
//     );
//     stick.position.z = 9;
//     const bulb = new THREE.Mesh(
//       // new THREE.SphereGeometry(0.625),
//       new THREE.SphereGeometry(2.5),
//       new THREE.MeshBasicMaterial({ color: 0xff00ff })
//     );
//     // Rotate helper
//     const pivot = new THREE.Object3D();
//     // Offset helper
//     const offset = new THREE.Object3D();
//     pivot.add(stick);
//     pivot.add(bulb);
//     offset.add(pivot);
//     scene.add(offset);
//     controller.object = offset;
//   }
// }

// controller.init();

// ===Websockets===

// Connect to WebSocket server
const socket = new WebSocket(`wss://${window.location.hostname}:3000`);

socket.onopen = () => {
  console.log('Connected to server');
  // socket.send('Hello from client!');
};

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);

  if(data.type === "move_update") {
    console.log("Updating position!");
    const scale = 1;
    const x = scale * Number(data.x);
    const y = scale * Number(data.y);
    const z = scale * Number(data.z);
    const qw = Number(data.qw);
    const qx = Number(data.qx);
    const qy = Number(data.qy);
    const qz = Number(data.qz);
    const buttons = Number(data.buttons);
    const trigger = Number(data.trigger);

    if(buttons) { console.log(buttons, PSMove.Btn_MOVE) }
    // Calibrate as well
    if(buttons & PSMove.Btn_MOVE) {
      console.log("Calibrating!");
      const offsetDistance = 3.0;
      const playerCamera = renderer.xr.isPresenting ? renderer.xr.getCamera(camera) : camera;

      const position = new THREE.Vector3(), direction = new THREE.Vector3();
      playerCamera.getWorldPosition(position);
      playerCamera.getWorldDirection(direction);
      const offsetPos = position.clone().add(direction.multiplyScalar(offsetDistance));
      const controllerPos = controller.object.position.clone();
      controller.offset.add(offsetPos.sub(controllerPos));
    }

    // Update the controller's position
    const pos = new THREE.Vector3(x, y, z);
    pos.add(controller.offset);
    const quat = new THREE.Quaternion(qx, qy, qz, qw);
    controller.object.position.copy(pos);
    controller.object.children[0].quaternion.copy(quat);
  }
};