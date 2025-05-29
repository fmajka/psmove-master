import * as THREE from 'three';
import Entity from "./Entity.js";

export default class EntityPhysical extends Entity {

	static setters = {
		position: (entity, value) => {
			const {x, y, z} = value;
			entity.translateRef?.position.set(x, y, z);
			return new THREE.Vector3(x, y ,z);
		},
		quaternion: (entity, value) => { 
			entity.pivotRef?.quaternion.set(...value);
			return new THREE.Quaternion(...value);
		},
	}

	constructor(id) {
		super(id);

		/**
		 * The physical object's position captured by internal/external sensors
		 * @type {THREE.Vector3}
		 */
		this.physicalPosition = new THREE.Vector3();

		/**
		 * The entity's virtual position offset
		 * @type {THREE.Vector3}
		 */
		this.offsetPosition = new THREE.Vector3();

		/**
		 * The physical object's orientation captured by IMUs
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

		// Client-side
		/** @type {THREE.Object3D} */
		this.pivotRef = null;
		/** @type {THREE.Object3D} */
		this.translateRef = null;
	}

	/**
	 * Calculates actual in-game position
	 */
	updatePosition() {
		this.position.copy(this.physicalPosition).add(this.offsetPosition);
	}

	/**
	 * Calculates actual in-game orientation
	 */
	updateQuaternion() {
		const offsetQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yawOffset);
		this.quaternion.copy(this.physicalQuaternion).premultiply(offsetQuaternion);
	}

}