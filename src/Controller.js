import * as THREE from 'three';
import Player from './Player.js';

export default class Controller {
	constructor(id, scene) {
		/**
		 * ID (array index) of the controller
		 * @type {Number}
		 */
		this.id = id;
		
		/**
		 * Player to which the controller belongs
		 * @type {Player}
		 */
		this.player = null;

		// Button states
		this.buttons = 0;
		this.changed = 0;
		this.trigger = 0;

		/**
		 * The controller's physical position captured by PSMS
		 * @type {THREE.Vector3}
		 */
		this.physicalPos = new THREE.Vector3();

		/**
		 * Scales the controller's physical position from PSMS to better match reality
		 * @type {Number}
		 */
		this.scale = 1.0;

		/**
		 * The controller's virtual position offset
		 * @type {THREE.Vector3}
		 */
		this.offset = new THREE.Vector3();

		/**
		 * The controller's in-game position
		 * position = physicalPos * scale + virtualPos
		 * @type {THREE.Vector3}
		 */
		this.position = new THREE.Vector3();

		/**
		 * The controller's rotation in 3D space
		 * @type {THREE.Quaternion}
		 */
		this.quaternion = new THREE.Quaternion();
		
		if(!scene) { return; }
		// Client-side only(?)
		this.localPivot = null;
		this.localOffset = null;
		this.initModel();
		scene.add(this.localOffset);
	}

	initModel() {
		const stick = new THREE.Mesh(
			new THREE.BoxGeometry(0.04, 0.04, 0.14),
			new THREE.MeshBasicMaterial({ color: 0x0044ff })
		);
		stick.position.z = 0.09;
		const bulb = new THREE.Mesh(
			new THREE.SphereGeometry(0.025),
			new THREE.MeshBasicMaterial({ color: 0xff00ff })
		);
		// Pivot for rotation
		this.localPivot = new THREE.Object3D();
		this.localPivot.add(stick);
		this.localPivot.add(bulb);
		// Offset for translation
		this.localOffset = new THREE.Object3D();
		this.localOffset.add(this.localPivot);
	}

	// Returns actual in-game position
	updatePosition() {
		this.position = this.physicalPos.clone().multiplyScalar(this.scale).add(this.localOffset);
		return this.position;
	}

	updateTransform() {
		this.localOffset.position.copy(this.position);
		this.localPivot.quaternion.copy(this.quaternion);
	}
}