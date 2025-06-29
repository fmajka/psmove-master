import * as THREE from 'three';
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { VRButton } from 'three/addons/webxr/VRButton.js';
import EntityTypes from './enums/EntityTypes.js';
import Alpine from 'alpinejs';
import EngineBase from "./EngineBase.js";
import DefaultScene from "./DefaultScene.js";
import UIWindow from './UIWindow.js';
import IOClient from './IOClient.js';
import EntityProjectile from './entities/EntityProjectile.js';

export default class EngineClient extends EngineBase {
	/** @type {THREE.Camera} */
	static camera = null;

	/** @type {OrbitControls} */
	static controls = null;

	/** @type {DefaultScene} */
	static scene = null;

	/** @type {THREE.WebGLRenderer} */
	static renderer = null;

	/**
	 * @type {UIWindow} - displays debug information to the local player
	 */
	static debugWindow = null;

	/**
	 * @type {number} - time of the last render tick
	 */
	static prevTime = null;

	/**
	 * @type {boolean} - tracks wheather VR enter request was sent to the server
	 */
	static isXRInit = false;

	/**
	 * @type {THREE.Vector3} - untransformed position of the XR camera cached during last render
	 */
	static xrPosition = new THREE.Vector3();

	/**
	 * @type {THREE.Vector3} - untransformed orientation of the XR camera cached during last render
	 */
	static xrQuaternion = new THREE.Quaternion();

	/**
	 * @type {Player} - this client's player object reference
	 */
	static localPlayer = null;

	/**
	 * @type {Controller} - this client's controller object reference
	 */
	static localController = null;

	/**
	 * Sets the client's player object reference to the given player
	 * @param {Player} player 
	 */
	static setLocalPlayer(player) {
		const prev = this.localPlayer;
		if(prev) { prev.translateRef.visible = true; }
		this.localPlayer = player;
		player.translateRef.visible = false;
		player.cameraRig.add(this.camera);
		console.log(player)
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

	/**
	 * 
	 * @param {THREE.Mesh} groundMesh 
	 * @param {number} x 
	 * @param {number} z 
	 * @param {number} hex 
	 */
	static colorVertexAtWorldXZ(groundMesh, x, z, hex) {
		const color = new THREE.Color().setHex(hex);
		const width = 64;
		const height = 64;
		const segmentsX = 128;
		const segmentsZ = 128;

		const vertexCountX = segmentsX + 1; // 129

		// Convert world (x, z) to local plane space
		const localPos = groundMesh.worldToLocal(new THREE.Vector3(x, 0, z));

		// Map to [0, width] and [0, height] then to grid index
		const u = (localPos.x + width / 2) / width;
		const v = (-localPos.y + height / 2) / height;

		// Clamp to [0, 1]
		const clampedU = THREE.MathUtils.clamp(u, 0, 1);
		const clampedV = THREE.MathUtils.clamp(v, 0, 1);

		// Get nearest vertex grid coordinates
		const ix = Math.round(clampedU * segmentsX);
		const iz = Math.round(clampedV * segmentsZ);

		const index = iz * vertexCountX + ix;

		// Apply color
		const colorAttr = groundMesh.geometry.getAttribute("color");
		// console.log(groundMesh.geometry, colorAttr)
		colorAttr.setXYZ(index, color.r, color.g, color.b);
		colorAttr.needsUpdate = true;
	}

	// Syncs with server data
	static sync(data) {
		// Loop through entity data
		for(const [id, entityProps] of Object.entries(data)) {
			// Create entity if it doesn't exist (using special _t prop)
			let entity = this.getEntity(id);
			if(!entity) {
				const type = EntityTypes[entityProps._t];
				entity = this.getEntity(id, type, this.scene);
				// console.log(this.entities)
			}
			delete entityProps._t;
			// Sync props
			for(const [key, value] of Object.entries(entityProps)) {
				entity.syncProp(key, value);
			}
			// Remove dead entity
			if(entityProps.life <= 0.0) {
				// Spray vertex
				if(entity instanceof EntityProjectile) {
					const {x, z} = entity.position;
					this.colorVertexAtWorldXZ(this.scene.groundMesh, x, z, entity.colorValue);
				}
				this.entities.delete(id);
				// console.log("Removed entity", entity.constructor.name, "with id", id, this.entities);
			}
		} 
	}

	static init() {
		// Rendering
		this.renderer = new THREE.WebGLRenderer();
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		document.body.appendChild(this.renderer.domElement);

		this.scene = new DefaultScene(this.renderer);
		// Default perspective camera
		this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 1000);
		this.camera.position.set(0, 15, 2);
		this.scene.add(this.camera);

		// XR
		this.renderer.xr.enabled = true;
		document.body.appendChild(VRButton.createButton(this.renderer));

		// Default non-VR mode controls
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.target.set(0, 15, 0)

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

		// Alpine init
		document.addEventListener('alpine:init', () => {
			console.log("Alpine init!");
			// TODO: temp, remove
			Alpine.store("controllers", [
				{id: 0, colorValue: 0xff00ff, playerId: "::whatever"},
				{id: 1, colorValue: 0x00ff00, playerId: null},
			]);
			Alpine.store("initXR", this.initXR);
			Alpine.store("io", IOClient);
		})
		Alpine.start();

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

		// Cache XR state
		const xrCamera = this.getXRCamera();
		xrCamera.getWorldPosition(this.xrPosition);
  	this.xrQuaternion.copy(xrCamera.quaternion);

		// View update
		this.scene.update(dt);
		this.controls.update();
		this.debugWindow.sprite.visible = this.localPlayer?.calibrationMode;
		this.debugWindow.setDebugText(...this.getDebugText());
  	this.debugWindow.drawDebugText();
		this.renderer.render(this.scene, this.camera);
	}

	// TODO: maybe it should be moved somewhere else
	static getDebugText() {
		const controller = this.localController ?? this.entities.get("0");
		// const controller = this.localController ?? null;
		const player = this.localPlayer;
		const yawFromQuat = (quat) => new THREE.Euler().setFromQuaternion(quat, "YXZ").y;
		const {x, y, z} = controller?.position || {};
		return [
			controller && ["MovePos", x, y, z],
			// controller && ["MoveQuat", ...controller.quaternion],
			controller && ["MoveYaw", yawFromQuat(controller.quaternion) * 180 / Math.PI],
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
				// xrQuat: this.xrQuaternion.toArray().map(v => v.toFixed(2))
			},
		];
	}

}