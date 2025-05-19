import * as THREE from 'three';

export default class Player {
	/**
	 * 
	 * @param {string} id Identifier of the player should be their websocket IP address
	 */
	constructor(id) {
		this.id = id;
		this.position = new THREE.Vector3();
		// TODO: wrap camera in a parent that will adjust yaw drift
		this.cameraWrapper = null;
		// Offset used for adjusting camera drift
		this.yawOffset = 0.0;
		// Controller assigned to the player
		// this.controller = null;

		/**
		 * When enabled overrides button functionality for the purpose of calibration
		 * @type {Boolean}
		 */
		this.calibrationMode = false;
	}

	getRotation() {

	}
}