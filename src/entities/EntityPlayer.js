import * as THREE from 'three';
import EntityPhysical from './EntityPhysical.js';

export default class Player extends EntityPhysical {

	static setters = {
		/**
		 * Sets the yaw offset to the given value, updating the cameraRig's quaternion
		 * @param {Number} value
		 */
		yawOffset: (entity, value) => {
			entity.cameraRig.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), value);
			// window._debug = `${this.syncPlayer.cameraRig.quaternion.toArray().map(v=>v.toFixed(2)).toString()}, yaw: ${value.toFixed(2)}`;
			return value;
		},
	}

	/**
	 * @param {string} id - Identifier of the player should be their websocket IP address
	 */
	constructor(id, scene) {
		super(id);

		// Controller assigned to the player
		// this.controller = null;

		/**
		 * When enabled overrides button functionality for the purpose of calibration
		 * @type {Boolean}
		 */
		this.calibrationMode = false;

		/**
		 * Wraps the camera in order to apply custom yaw rotation
		 * @type {THREE.Group}
		 */
		this.cameraRig = new THREE.Group();

		// Client-side only
		if(scene) {
			scene.add(this.cameraRig);
			console.log("scene", scene)
		}
	}

}