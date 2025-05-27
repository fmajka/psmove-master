import * as THREE from 'three';

export default class Entity {

	static setters = {
		position: (_, value) => {
			const {x, y, z} = value; 
			return new THREE.Vector3(x, y ,z);
		},
		quaternion: (_, value) => new THREE.Quaternion(...value),
	}

	constructor(id) {
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