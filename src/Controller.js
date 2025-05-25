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
		this.timePressed = {};
		this.trigger = 0;

		// Upon holding the select button for at least one second, a hard reset request is sent
		this.hardResetProcessed = false;

		/**
		 * The controller's physical position captured by PSMS
		 * @type {THREE.Vector3}
		 */
		this.physicalPosition = new THREE.Vector3();

		/**
		 * Scales the controller's physical position from PSMS to better match reality
		 * @type {Number}
		 */
		this.physicalScale = 1.0;

		/**
		 * The controller's virtual position offset
		 * @type {THREE.Vector3}
		 */
		this.offsetPosition = new THREE.Vector3();

		/**
		 * The controller's in-game position
		 * position = physicalPosition * scale + virtualPos
		 * @type {THREE.Vector3}
		 */
		this.position = new THREE.Vector3();

		/**
		 * The controller's physical orientation captured by PSMS
		 * @type {THREE.Quaternion}
		 */
		this.physicalQuaternion = new THREE.Quaternion();

		/**
		 * Quaternion offset for adjusting drift
		 * @type {THREE.Quaternion}
		 */
		this.offsetQuaternion = new THREE.Quaternion();

		/**
		 * Offset used for adjusting controller/player camera drift
		 * @type {Number}
		 */
		this.yawOffset = 0.0;

		/**
		 * The controller's in-game orientation
		 * quaternion = physicalQuaternion with yaw offset by yawOffset
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
			new THREE.MeshBasicMaterial({ color: 0x222222 })
		);
		stick.position.z = 0.09;
		const trigger = new THREE.Mesh(
			new THREE.BoxGeometry(0.02, 0.02, 0.03),
			new THREE.MeshBasicMaterial({ color: 0x444444 })
		);
		trigger.position.y = -0.02;
		trigger.position.z = 0.05;
		trigger.rotateX(Math.PI / 6);
		const bulb = new THREE.Mesh(
			new THREE.SphereGeometry(0.025),
			new THREE.MeshBasicMaterial({ color: 0xff44ff })
		);
		// Pivot for rotation
		this.localPivot = new THREE.Object3D();
		this.localPivot.add(stick);
		this.localPivot.add(trigger);
		this.localPivot.add(bulb);
		// Offset for translation
		this.localOffset = new THREE.Object3D();
		this.localOffset.add(this.localPivot);
	}

	// Updates actual in-game position
	updatePosition() {
		this.position = this.physicalPosition.clone().multiplyScalar(this.physicalScale).add(this.offsetPosition);
	}

	// Updates actual in-game orientation
	updateQuaternion() {
		// const yawQuaternion = new THREE.Quaternion();
		// yawQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yawOffset);
		// this.quaternion = yawQuaternion.multiply(this.physicalQuaternion);
		this.quaternion.multiplyQuaternions(this.offsetQuaternion, this.physicalQuaternion);
	}

	updateTransform() {
		this.localOffset.position.copy(this.position);
		this.localPivot.quaternion.copy(this.quaternion);
	}
}