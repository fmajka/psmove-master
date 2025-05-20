// import * as THREE from 'https://cdn.jsdelivr.net/npm/three@latest/build/three.module.js';
import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import PSMove from './enums/PSMove.js';
import Controller from './Controller.js';
import Sync from './enums/Sync.js';
import Player from './Player.js';

// Scene and camera init
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.setZ(3);
// camera.position.z = 5;
// camera.lookAt(0,0,0);

// Rendering
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
document.body.appendChild(renderer.domElement);

// Example cube
// const geometry = new THREE.BoxGeometry(1, 1, 1);
// const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
// const cube = new THREE.Mesh(geometry, material);
// scene.add(cube);

// Example torus
let torus = null;
{
  const geometry = new THREE.TorusGeometry(5, 2, 3, 5);
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
  });
  torus = new THREE.Mesh(geometry, material);
  torus.position.y = 15;
  scene.add(torus);
}
// Light
const pointLight = new THREE.PointLight(0x00ff00, 5);
pointLight.position.set(7, 7, 7);
const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
// Sun test
const sun = new THREE.PointLight(0xffffaa, 10, 0, 0);
sun.position.set(100, 20, 0);
scene.add(pointLight, ambientLight, sun);
//Stars
function addStar() {
  const geometry = new THREE.SphereGeometry(0.25);
  const material = new THREE.MeshStandardMaterial({ color: (0.5 + 0.5 * Math.random()) * 0xffffff });
  // const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const star = new THREE.Mesh(geometry, material);

  const [x, y, z] = Array(3).fill().map(
    () => THREE.MathUtils.randFloatSpread(100)
  );
  star.position.set(x, y, z);
  scene.add(star);
}
for(let i = 0; i < 200; i++)
  addStar();

// Skybox
const txtLoader = new THREE.TextureLoader();
const skyboxMaterials = [];
["px", "nx", "py", "ny", "pz", "nz"].forEach(name => {
  const texture = txtLoader.load(`/textures/sky_18_cubemap/${name}.png`);
  const material = new THREE.MeshBasicMaterial({ map: texture });
  material.side = THREE.BackSide;
  skyboxMaterials.push(material);
});
const skyboxGeometry = new THREE.BoxGeometry(1000, 1000, 1000);
const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterials);
scene.add(skybox);

// Ground
const groundGeometry = new THREE.PlaneGeometry(
  64, 64, 64, 64
);
const groundTexture = txtLoader.load("/textures/grass_01_1k/grass_01_color_1k.png");
groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
groundTexture.repeat.set(16, 16);
const dispMap = txtLoader.load("/heightmap.png");
dispMap.wrapS = dispMap.wrapT = THREE.RepeatWrapping;
// dispMap.repeat.set(128, 128);
const groundMaterial = new THREE.MeshStandardMaterial({
  // color: 0xffffff,
  // wireframe: true,
  map: groundTexture,
  
  displacementMap: dispMap,
  displacementScale: 16,
});
const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
scene.add(groundMesh);
groundMesh.rotation.x = -Math.PI / 2;
groundMesh.position.y = -15;

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
// Temp state
const controller = new Controller(0, scene);
const player = new Player(null, null);

// Animation loop
let prevTime = performance.now();
function animate() {
  let time = performance.now();
  const dt = (time - prevTime) / 1000; // Time in seconds
  prevTime = time;
  
  // cube.rotation.x += Math.PI * dt;
  // cube.rotation.y += Math.PI * dt;
  torus.rotation.x += 0.01;
  torus.rotation.y += 0.005;
  torus.rotation.z += 0.01;

  controls.update();

  const ppos = player?.position ?? {};
  const cpos = controller.position;
  drawDebugText(
    ["Player", ppos.x, ppos.y, ppos.z],
    ["Move", cpos.x, cpos.y, cpos.z],
    {"CalibMode": player?.calibrationMode}
  );
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
debugCanvas.width = 192;
debugCanvas.height = 96;
const ctx = debugCanvas.getContext('2d');

const debugTexture = new THREE.CanvasTexture(debugCanvas);
const debugMaterial = new THREE.SpriteMaterial({ map: debugTexture, depthTest: false, transparent: true });
const debugSprite = new THREE.Sprite(debugMaterial);
debugSprite.scale.set(0.5, 0.25, 1);

// debugSprite.position.set(-0.4, 0.55, -1); // relative to camera
debugSprite.position.set(0, 0.2, -1); // relative to camera
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

const playerCamera = renderer.xr.isPresenting ? renderer.xr.getCamera(camera) : camera;
console.log(JSON.stringify({
  type: "sync_camera",
  quaternion: playerCamera.quaternion,
}));
console.log(JSON.stringify(new THREE.Quaternion(...[0,0,0,1])))
console.log(JSON.stringify(new THREE.Vector3(...[1,2,3])))

let cameraSyncInterval = null;
socket.onopen = () => {
  console.log("Connected to server");
  // socket.send('Hello from client!');
  cameraSyncInterval = setInterval(() => {
    const playerCamera = renderer.xr.isPresenting ? renderer.xr.getCamera(camera) : camera;
    const syncData = {
      type: "sync_camera",
      quaternion: playerCamera.quaternion
    }
    socket.send(JSON.stringify(syncData));
  }, 1000 / 30);
};

socket.onclose = () => {
  console.log("Connection closed");
  clearInterval(cameraSyncInterval);
}

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Received:", data);

  // TODO: some kind of initialization for proper multiplayer support
  if(data.type === "init") {
    player = new Player(data.playerId)
  }

  if(data.type === "sync") {
    const sync = data.sync;

    const controllerData = data.sync[Sync.CONTROLLER][0];
    console.log("controllerData", controllerData);
    controller.position.set(
      controllerData.position.x,
      controllerData.position.y,
      controllerData.position.z,
    );
    controller.quaternion.set(...controllerData.quaternion);
    controller.updateTransform();
    // data.sync[Sync.CONTROLLER]["0"].forEach()
  }

  // TODO: useless, remove
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

// Callback when entering VR
renderer.xr.addEventListener('sessionstart', () => {
    console.log('Entered VR');

    // Update matrix world to ensure values are current
    camera.updateMatrixWorld(true);

    // const position = new THREE.Vector3();
    // const quaternion = new THREE.Quaternion();

    // camera.getWorldPosition(position);
    // camera.getWorldQuaternion(quaternion);

    // Send to backend
    const data = {
      type: "enter_vr",
    };
    socket.send(JSON.stringify(data));
});