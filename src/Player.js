import * as THREE from 'three';
import { xor } from 'three/tsl';

export default class Player {
	/**
	 * Player context for the sync setters
	 * @type {Player}
	 */
	static syncPlayer = null;

	static setters = {
		/**
		 * Sets the yaw offset to the given value, updating the cameraRig's quaternion
		 * @param {Number} value
		 */
		yawOffset: (value) => {
			this.syncPlayer.cameraRig.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), value);
			// window._debug = `${this.syncPlayer.cameraRig.quaternion.toArray().map(v=>v.toFixed(2)).toString()}, yaw: ${value.toFixed(2)}`;
			return value;
		},

		position: (value) => {
			const {x, y, z} = value; 
			return new THREE.Vector3(x, y ,z)
		}
	}

	/**
	 * @param {string} id Identifier of the player should be their websocket IP address
	 */
	constructor(id, camera) {
		this.id = id;
		
		// Player's server side position
		this.position = new THREE.Vector3();

		/**
		 * Offset used for adjusting controller/player camera drift
		 * @type {Number}
		 */
		this.yawOffset = 0;

		/**
		 * The controller's physical orientation captured by PSMS
		 * @type {THREE.Quaternion}
		 */
		this.physicalQuaternion = new THREE.Quaternion();

		/**
		 * The camera's in-game orientation
		 * quaternion = physicalQuaternion with its yaw offset by yawOffset
		 * @type {THREE.Quaternion}
		 */
		this.quaternion = new THREE.Quaternion();

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
	}

	/**
	 * Used when syncing client data with server data
	 * 
	 * Sets the object key to the given value, but may also cause side effects when a matching function is defined within the 'setters' object
	 * @param {Number} value
	 */
	syncProp(key, value) {
		if(typeof value === "undefined") { return; }
		Player.syncPlayer = this;
		this[key] = Player.setters[key]?.(value) ?? value;
	}

	updateCameraRig(scene, arrayCamera) {
		this.cameraRig.add(arrayCamera);
		scene.add(cameraRig);
	}

	updateQuaternion() {
		const offsetQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yawOffset);
		this.quaternion.copy(this.physicalQuaternion).premultiply(offsetQuaternion);
	}
}