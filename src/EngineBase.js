import * as THREE from 'three';

export default class EngineBase {
		/**
		 * Maps socket's IP address to their Player object
		 * @type {Map<string | Number, Entity>} - all interactible entities within the game
		 */
		static entities = new Map();

	/**
	 * Returns the entity with given ID if exists, null if doesn't exist.
	 * Creates and returns a new entity if it didn't exist and type was provided
	 * @param {string | number} id - unique entity ID (string for player entities)
	 * @param {string | Entity} type - Entity (sub)class or subclass name from which it will be created if doesn't exist
	 * @param  {THREE.Scene} sceneRef - reference to the client-side scene
	 * @returns {Entity} 
	 */
	// TODO: sceneRef should not be necessary, it should be globally accessible by the client
	static getEntity(id, type, sceneRef) {
		if(!this.entities.has(id)) {
			// If entity doesn't exist and no type was provided, return null
			if(!type) { return null; } 
			// Convert type to class if passed as a string
			if(typeof type === "string") { type = EntityTypes[type]; }
			// Bad type argument provided
			if(typeof type !== "function") { 
				console.warn(`EngineBase.getEntity: type is ${type}, typeof ${typeof type}`);
				return null;
			}
			this.entities.set(id, new type(id, sceneRef));
		}
		return this.entities.get(id);
	}
}