import Controller from "./Controller.js";
import GameState from "./GameState.js";
import Player from "./Player.js";
import * as THREE from 'three';

export default class GameServer {
	static state = new GameState();

	/**
	 * Returns the controller object with given id, creating one if it doesn't exits
	 * @param {number} id
	 * @returns {Controller}
	 */
	static getController(id) {
		if(!this.state.controllers.has(id)) {
			this.state.controllers.set(id, new Controller(id));
		}
		return this.state.controllers.get(id);
	}

	static initPlayer(id) {
		if(!this.state.players.has(id)) {
			this.state.players.set(id, new Player(id));
		}
	}

	/**
	 * Syncs the player's local rotation
	 * @param {string} id
	 * @param {THREE.Quaternion} quaternion
	 */
	static setPlayerRotation(id, quaternion) {
		const player = this.state.players.get(id);
		if(!player) { return; }
		player.quaternionLocal = quaternion; 
	}
}