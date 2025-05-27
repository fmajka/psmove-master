import * as THREE from 'three';
import StateBase from "./StateBase.js";
import IOServer from './IOServer.js';

export default class GameServer {
	static state = new StateBase();

	// Stores all existing controller ids
	static controllerCache = new Set();

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
		// TODO: does it really do anything?
		// player.position.copy(vector).add(player.offsetPosition);
	}

	static refreshControllerList() {
		const list = [...this.controllerCache].map((controller) => ({
			id: controller.id,
			colorId: controller.colorId,
			playerId: controller.playerId,
		}));
		console.log("emit list", list)
		IOServer.emit({type: "controller_list", list});
	}

	static setPlayerController(playerId, controllerId) {
		// TODO: a "get without creating" function
		console.log(playerId, controllerId)
		const controller = this.state.entities.get(controllerId);
		const ownerId = controller?.playerId;
		console.log(ownerId, IOServer.clients.has(ownerId))
		if(controller && !(ownerId && IOServer.clients.has(ownerId))) {
			console.log("controller", controller.id, "assigned to", playerId);
			controller.playerId = playerId;
		}
		// Send updated controller list to clients
		this.refreshControllerList();
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