import * as THREE from 'three';
import Player from './EntityPlayer.js';
import EntityPhysical from './EntityPhysical.js';

export default class Controller extends EntityPhysical {

	static setters = {
		position: (entity, value) => {
			const {x, y, z} = value;
			entity.localOffset.position.set(x, y, z);
			return new THREE.Vector3(x, y ,z);
		},
		quaternion: (entity, value) => { 
			entity.localPivot.quaternion.set(...value);
			new THREE.Quaternion(...value);
		},
	}

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

	/**
	 * Additionally multiplies the physical position by the scale
	 * @override
	 */
	updatePosition() {
		this.position.copy(this.physicalPosition).multiplyScalar(this.physicalScale).add(this.offsetPosition);
	}
}