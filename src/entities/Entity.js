import * as THREE from 'three';
import DefaultScene from '../DefaultScene.js';

export default class Entity {

	/**
	 * @callback Setter
	 * @param {Entity} entity - The entity instance.
	 * @param {*} value - The value to handle.
	 * @returns {*}
	 *
	 * @type {Object<string, Setter>}
	 */
	static setters = {
		position: (entity, value) => {
			const {x, y, z} = value; 
			entity.meshRef?.position.set(x, y, z);
			return new THREE.Vector3(x, y ,z);
		},
		quaternion: (entity, value) => {
			const quat = new THREE.Quaternion(...value);
			entity.meshRef?.quaternion.copy(quat);
			return quat;
		},
		/**
		 * Change mesh color
		 * @param {Number} value
		 */
		colorValue: (entity, value) => {
			entity.meshRef?.material.color.setHex(value);
			return value;
		},
		/**
		 * Removes entity model from the scene if DEAD
		 * @param {Number} value 
		 */
		life: (entity, value) => {
			if(!entity.meshRef) { return value }
			entity.meshRef.material.opacity = value;
			if(value <= 0 && entity.scene) {
				entity.scene.remove(entity.meshRef);
			}
			return value;
		}
	}

	constructor(id, scene) {
		this.id = id;

		/**
		 * Reference to the scene 
		 * @type {DefaultScene}
		 * */
		this.scene = scene || null;

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

		this.life = 1.0;

		/** Reference to the mesh */
		this.meshRef = null;

		if(scene) {
			this.initMesh();
		}
	}

	/**
	 * Initializes the entity's client-side model
	 * @abstract
	 */
	initMesh() {
		console.warn(`${this.constructor.name}: initMesh() is abstract!`);
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