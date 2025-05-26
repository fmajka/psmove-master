import * as THREE from 'three';
import DefaultScene from "./DefaultScene.js";
import StateClient from "./StateClient.js";
import { VRButton } from 'three/addons/webxr/VRButton.js';
import UIWindow from './UIWindow.js';
import IOClient from './IOClient.js';
import { OrbitControls } from "three/examples/jsm/Addons.js";
import EntityTypes from './enums/EntityTypes.js';

export default class Engine {
	static camera = null;
	static controls = null;
	static scene = null;
	static renderer = null;

	/**
	 * @type {StateClient} state
	 */
	static state = null;

	static debugWindow = null;

	static prevTime = null;

	static isXRInit = false;

	static setLocalPlayer(player) {
		this.state.localPlayer = player;
		player.cameraRig.add(this.camera);
	}

	static initXR() {
		this.isXRInit = true;
		console.log('Entered VR');
		// Send info to backend
		IOClient.send({ type: "enter_vr" });
	}

	static getXRCamera() {
		return this.renderer.xr.getCamera(this.camera);
	}

	// Syncs with server data
	static sync(data) {
		// Loop through entity data
		for(const [id, entityProps] of Object.entries(data)) {
			// Create entity if it doesn't exist (using special _t prop)
			if(!this.state.entities.has(id)) {
				const type = EntityTypes[entityProps._t];
				this.state.entities.set(id, new type(id, this.scene));
				console.log(this.state.entities)
			}
			delete entityProps._t;
			// Sync props
			const entity = this.state.entities.get(id);
			for(const [key, value] of Object.entries(entityProps)) {
				entity.syncProp(key, value);
			}
		} 
	}

	static init() {
		this.state = new StateClient();
		this.scene = new DefaultScene();
		// Default perspective camera
		this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 1000);
		this.camera.position.setZ(2);
		this.scene.add(this.camera);

		// Rendering
		this.renderer = new THREE.WebGLRenderer();
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		document.body.appendChild(this.renderer.domElement);

		// XR
		this.renderer.xr.enabled = true;
		document.body.appendChild(VRButton.createButton(this.renderer));

		// Default non-VR mode controls
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);

		// Window for printing debug info
		this.debugWindow = new UIWindow(
			288, 
			96, 
			new THREE.Vector3(0, 0, -1), 
			new THREE.Vector3(0.75, 0.25, 1)
		);
		this.debugWindow.attachTo(this.camera);

		// Update canvas size and camera aspect ratio on window resize
		window.addEventListener("resize", () => {
			this.renderer.setSize(window.innerWidth, window.innerHeight);
			this.camera.aspect = window.innerWidth / window.innerHeight;
			this.camera.updateProjectionMatrix();
		});

		// Connect to WebSocket server
		IOClient.connect(`wss://${window.location.hostname}:3000`);

		// Reset time and start the main loop
		this.prevTime = performance.now();
		this.renderer.setAnimationLoop(() => this.update());
	}

	static update() {
		if(this.renderer.xr.isPresenting && !this.isXRInit) {
			this.initXR();
		}

		const time = performance.now();
		const dt = (time - this.prevTime) / 1000; // Time in seconds
		this.prevTime = time;

		this.state.updateXR(this.getXRCamera());
		this.scene.update(dt);
		this.controls.update();
		this.debugWindow.setDebugText(...this.getDebugText());
  	this.debugWindow.drawDebugText();
		this.renderer.render(this.scene, this.camera);
	}

	// TODO: maybe it should be moved somewhere else
	static getDebugText() {
		const controller = this.state.localController ?? this.state.entities.get("0");
		const player = this.state.localPlayer;
		const yawFromQuat = (quat) => new THREE.Euler().setFromQuaternion(quat, "YXZ").y;
		return [
			controller && ["MovePos", controller.x, controller.y, controller.z],
			controller && ["MoveQuat", ...controller.quaternion],
			controller && player && {
				Scale: controller.physicalScale.toFixed(2),
				Calib: player.calibrationMode,
				Btn: controller.buttons,
			},
			player && { playerPos: player.position.toArray().map(v=>v.toFixed(2)) },
			{ debug: window._debug },
			{
				xrYaw: yawFromQuat(this.getXRCamera().quaternion).toFixed(2) ?? "X", 
				yawOffset: player ? player.yawOffset : "X", 
				// xrQuat: this.state.xrQuaternion.toArray().map(v => v.toFixed(2))
			},
		];
	}

}