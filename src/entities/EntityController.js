import * as THREE from 'three';
import EntityPhysical from './EntityPhysical.js';

export default class Controller extends EntityPhysical {

	static setters = {
		/**
		 * Sets the LED bulb color, updating the mesh
		 * @param {Number} value
		 */
		colorValue: (entity, value) => {
			entity.bulb.material.color.setHex(value);
			return value;
		},
	}

	/**
	 * Represents a PlayStation Move controller
	 * @param {Number} id - ID (array index) of the controller
	 */
	constructor(id, scene) {
		super(id, scene);

		/**
		 * Scales the controller's physical position from PSMS to better match reality
		 * @type {Number}
		 */
		this.physicalScale = 1.0;
		
		/**
		 * ID of the player the controller is assigned to
		 * @type {string | null}
		 */
		this.playerId = null;

		this.colorValue = 0xffffff;

		// Button states
		this.buttons = 0;
		this.changed = 0;
		this.timePressed = {};
		this.trigger = 0;

		// TODO: tracking data history for throwing
		this.positionHistory = [];

		// Upon holding the select button for at least one second, a hard reset request is sent
		this.hardResetProcessed = false;
	}

	initMesh() {
		const stick = new THREE.Mesh(
			new THREE.BoxGeometry(0.04, 0.04, 0.14),
			new THREE.MeshStandardMaterial({ color: 0x222222 })
		);
		stick.position.z = 0.09;
		const trigger = new THREE.Mesh(
			new THREE.BoxGeometry(0.02, 0.02, 0.03),
			new THREE.MeshStandardMaterial({ color: 0x444444 })
		);
		trigger.position.y = -0.02;
		trigger.position.z = 0.05;
		trigger.rotateX(Math.PI / 6);
		/**
		 * Reference to bulb mesh used for changing LED colors etc.
		 * @type {THREE.Mesh}
		 */
		this.bulb = new THREE.Mesh(
			new THREE.SphereGeometry(0.025),
			new THREE.MeshStandardMaterial({ color: 0xdddddd })
		);
		// Pivot for rotation
		this.pivotRef = new THREE.Object3D();
		this.pivotRef.add(stick);
		this.pivotRef.add(trigger);
		this.pivotRef.add(this.bulb);
		// Offset for translation
		this.translateRef = this.meshRef = new THREE.Object3D();
		this.translateRef.add(this.pivotRef);
		this.scene.add(this.translateRef);
	}

	/**
	 * Additionally multiplies the physical position by the scale
	 * @override
	 */
	updatePosition(playerPosition) {
		this.position.copy(this.physicalPosition).multiplyScalar(this.physicalScale).add(this.offsetPosition);
		if(playerPosition) {
			this.position.add(playerPosition);
		}
	}
}