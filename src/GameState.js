import Player from "./Player.js";

export default class GameState {
	constructor() {
		/**
		 * Maps socket's IP address to their Player object
		 * @type {Map<string, Player} players
		 */
		this.players = new Map();

		// It's just like an array of IDs
		this.controllers = new Map();

		// Maps game entity IDs
		this.entities = new Map();

		// Game state organised in an array of easier (de)serialization
		this.sourceMaps = [this.players, this.controllers, this.entities];
	}
}