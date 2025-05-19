import Controller from "./Controller.js";

export default class GameServer {
	// It's just an array of IDs
	static controllers = [];
	// Maps socket's IP address to a player
	static players = new Map();
	// Maps game entity IDs
	static entities = new Map();

	static packets = [];

	/**
 * Returns the controller object with given id, creating it if doesn't exits
 * @param {number} id
 * @returns {Controller}
 */
	static getController(id) {
		if(!this.controllers[id]) {
			this.controllers[id] = new Controller();
		}
		return this.controllers[id];
	}
}