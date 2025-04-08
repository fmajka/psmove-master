// import * as THREE from 'https://cdn.jsdelivr.net/npm/three@latest/build/three.module.js';
import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;
camera.lookAt(0,0,0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

function animate(dt) {
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;

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

// The controller object
const controller = {
  object: null,
  offset: new THREE.Vector3(),
  init: () => {
    const stick = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 3),
      new THREE.MeshBasicMaterial({ color: 0x0044ff })
    );
    stick.position.z = 2;
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.625),
      new THREE.MeshBasicMaterial({ color: 0xff00ff })
    );
    // Rotate helper
    const pivot = new THREE.Object3D();
    // Offset helper
    const offset = new THREE.Object3D();
    pivot.add(stick);
    pivot.add(bulb);
    offset.add(pivot);
    scene.add(offset);
    controller.object = offset;
  }
}

controller.init();

// ===Websockets===

// Connect to WebSocket server
const socket = new WebSocket('wss://192.168.0.198:3000');

socket.onopen = () => {
  console.log('Connected to server');
  // socket.send('Hello from client!');
};

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);

  switch(data.type) {
    case "update":
      console.log("Updating position!");
      const x = Number(data.x);
      const y = -Number(data.y);
      const z = -Number(data.z);
      const rw = Number(data.rw);
      const rx = Number(data.rx);
      const ry = Number(data.ry);
      const rz = Number(data.rz);

      // Calibrate as well
      if(data.calibrate) {
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
      const quat = new THREE.Quaternion(rx, ry, rz, rw);
      controller.object.position.copy(pos);
      controller.object.children[0].quaternion.copy(quat);

      break;
  }
};