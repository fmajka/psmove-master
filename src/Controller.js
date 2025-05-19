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
		 * The controller's position in 3D space
		 * @type {THREE.Vector3}
		 */
		this.position = THREE.Vector3();

		/**
		 * Scales the controller's physical position from PSMS to better match reality
		 * @type {Number}
		 */
		this.scale = 1.0;

		/**
		 * The controller's rotation in 3D space
		 * @type {THREE.Quaternion}
		 */
		this.quaternion = THREE.Quaternion();
		
		if(!scene) { return; }
		// Client-side only(?)
		this.pivot = null;
		this.offset = null;
		initModel();
		scene.add(this.offset);
	}

	initModel() {
		const stick = new THREE.Mesh(
			new THREE.BoxGeometry(4, 4, 14),
			new THREE.MeshBasicMaterial({ color: 0x0044ff })
		);
		stick.position.z = 9;
		const bulb = new THREE.Mesh(
			new THREE.SphereGeometry(2.5),
			new THREE.MeshBasicMaterial({ color: 0xff00ff })
		);
		// Pivot for rotation
		this.pivot = new THREE.Object3D();
		this.pivot.add(stick);
		this.pivot.add(bulb);
		// Offset for translation
		this.offset = new THREE.Object3D();
		this.offset.add(pivot);
	}
}