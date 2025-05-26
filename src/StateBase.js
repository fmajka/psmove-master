import Entity from "./entities/Entity.js";

export default class StateBase {
	constructor() {
		/**
		 * Maps socket's IP address to their Player object
		 * @type {Map<string | Number, Entity>} - all entities that participate in the game
		 */
		this.entities = new Map();
	}

	getEntity(id, type = Entity, ...args) {
		if(!this.entities.has(id)) {
			// Convert type to class if passed as a string
			if(typeof type === "string") { type = EntityTypes[type]; }
			// TODO: throw an error or something?
			if(!type || typeof type !== "function") { 
				console.log(`state.getEntity: type is ${type}, typeof ${typeof type}`);
				return null;
			}
			this.entities.set(id, new type(id, ...args));
		}
		return this.entities.get(id);
	}
}