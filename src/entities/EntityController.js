import * as THREE from 'three';
import Player from './EntityPlayer.js';
import EntityPhysical from './EntityPhysical.js';

export default class Controller extends EntityPhysical {

	/**
	 * Represents a PlayStation Move controller
	 * @param {Number} id - ID (array index) of the controller
	 */
	constructor(id, scene) {
		super(id);

		/**
		 * Scales the controller's physical position from PSMS to better match reality
		 * @type {Number}
		 */
		this.physicalScale = 1.0;
		
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
		
		// Client-side only(?)
		if(!scene) { return; }

		this.initModel();
		scene.add(this.translateRef);
	}

	initModel() {
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
		const bulb = new THREE.Mesh(
			new THREE.SphereGeometry(0.025),
			new THREE.MeshStandardMaterial({ color: 0xff44ff })
		);
		// Pivot for rotation
		this.pivotRef = new THREE.Object3D();
		this.pivotRef.add(stick);
		this.pivotRef.add(trigger);
		this.pivotRef.add(bulb);
		// Offset for translation
		this.translateRef = new THREE.Object3D();
		this.translateRef.add(this.pivotRef);
	}

	/**
	 * Additionally multiplies the physical position by the scale
	 * @override
	 */
	updatePosition(offsetArg) {
		this.position.copy(this.physicalPosition).multiplyScalar(this.physicalScale).add(this.offsetPosition)
		if(offsetArg) {
			this.position.add(offsetArg);
		}
	}
}