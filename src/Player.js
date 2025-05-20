import * as THREE from 'three';

export default class Player {
	/**
	 * @param {string} id Identifier of the player should be their websocket IP address
	 */
	constructor(id, camera) {
		this.id = id;
		// Player's server side position
		this.position = new THREE.Vector3();
		// Client camera object's raw quaternion
		this.quaternionLocal = new THREE.Quaternion();
		// Offset used for adjusting camera drift
		this.yawOffset = 0.0;
		// Controller assigned to the player
		// this.controller = null;

		/**
		 * When enabled overrides button functionality for the purpose of calibration
		 * @type {Boolean}
		 */
		this.calibrationMode = false;

		if(!camera) { return; }

		this.cameraRig = new THREE.Group();
		this.cameraRig.add(camera);
	}
}