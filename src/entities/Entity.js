import * as THREE from 'three';

export default class Entity {

	static setters = {
		position: (entity, value) => {
			const {x, y, z} = value; 
			entity.modelRef?.position.set(x, y, z);
			return new THREE.Vector3(x, y ,z);
		},
		quaternion: (entity, value) => {
			const quat = new THREE.Quaternion(...value);
			entity.modelRef.quaternion.copy(quat);
			return quat;
		},
		/**
		 * Removes entity model from the scene if DEAD
		 * @param {Entity} entity 
		 * @param {Number} value 
		 */
		life: (entity, value) => {
			if(!entity.modelRef) { return value }
			entity.modelRef.material.opacity = value;
			if(value <= 0 && entity.scene) {
				entity.scene.remove(entity.modelRef);
			}
			return value;
		}
	}

	constructor(id, scene) {
		this.id = id;

		/**
		 * The entity's in-game position
		 * @type {THREE.Vector3}
		 */
		this.position = new THREE.Vector3();

		/**
		 * The entity's in-game rotation (used for head rotation)
		 * @type {THREE.Quaternion}
		 */
		this.quaternion = new THREE.Quaternion();

		/** Reference to the mesh */
		this.modelRef = null;

		/**
		 * Reference to the scene 
		 * @type {THREE.Scene}
		 * */
		this.scene = scene;
	}

	/**
	 * Traverse up the prototype chain, looking for a setter for the given property key
	 */
	getSyncSetter(key) {
    let current = this.constructor;
    while(current !== Function.prototype) {
			if(current.setters[key]) { return current.setters[key] }
      current = Object.getPrototypeOf(current);
    }
    return null;
  }

	/**
	 * Used when syncing client data with server data
	 * 
	 * Sets the object key to the given value, but may also cause side effects when a matching function is defined within the 'setters' object
	 * @param {string} key
	 * @param {any} value
	 */
	syncProp(key, value) {
		if(typeof value === "undefined") { return; }
		this[key] = this.getSyncSetter(key)?.(this, value) ?? value;
	}

}