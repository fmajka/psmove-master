import * as THREE from 'three';
import StateBase from "./StateBase.js";

export default class GameServer {
	static state = new StateBase();

	/**
	 * Syncs the player's local rotation
	 * @param {string} id
	 * @param {THREE.Quaternion} quaternion
	 */
	static setPlayerRotation(id, quaternion) {
		const player = this.state.entities.get(id);
		if(!player) { return; }
		player.physicalQuaternion = quaternion;
		player.updateQuaternion();
	}

	static setPlayerPosition(id, vector) {
		const player = this.state.entities.get(id);
		if(!player) { return; }
		player.position = vector;
	}

	// TODO: it's only temporary
	static getFirstVRPlayer() {
		// TODO: a set of connected player ids
		for(const player of this.state.entities.values()) {
			if(player.vr) { return player; }
		}
		return null;
	}
}