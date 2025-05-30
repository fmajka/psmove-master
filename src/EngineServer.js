import * as THREE from 'three';
import IOServer from './IOServer.js';
import EngineBase from './EngineBase.js';
import Controller from './entities/EntityController.js';
import Player from './entities/EntityPlayer.js';

export default class EngineServer extends EngineBase {
	/**
	 * Stores all existing controller references
	 * @type {Set<Controller}
	 */
	static controllerCache = new Set();

	/**
	 * Syncs the player's local rotation
	 * @param {string} id
	 * @param {THREE.Quaternion} quaternion
	 */
	static setPlayerRotation(id, quaternion) {
		const player = this.entities.get(id);
		if(!player) { return; }
		player.physicalQuaternion = quaternion;
		player.updateQuaternion();
	}

	static setPlayerPosition(id, vector) {
		/** @type {Player} */
		const player = this.entities.get(id);
		if(!player) { return; }
		// TODO: does it really do anything?
		player.physicalPosition.set(0, vector.y, 0);
		player.updatePosition();
		// player.position.copy(vector).add(player.offsetPosition);
	}

	static refreshControllerList(clientId = null) {
		const list = [...this.controllerCache].map((controller) => ({
			id: controller.id,
			colorValue: controller.colorValue,
			playerId: controller.playerId,
		}));
		console.log("emit list", list)
		IOServer.emit({type: "controller_list", list}, clientId);
	}

	/**
	 * Assigns player to the controller (by ID)
	 * @param {string} playerId 
	 * @param {number} controllerId 
	 * @returns 
	 */
	static setPlayerController(playerId, controllerId) {
		if(!controllerId && controllerId !== 0) {
			console.error("EngineServer.setPlayerController: controllerId is", controllerId);
			return;
		}
		const controller = this.getEntity(controllerId);
		if(!controller) {
			console.error("EngineServer.setPlayerController: controller with id", controllerId, "doesn't exist");
			return;
		}
		const ownerId = controller.playerId;
		// TODO: abstraction for clients.has
		if(ownerId && IOServer.clients.has(ownerId)) {
			console.warn("EngineServer.setPlayerController: controller", controllerId, "already owned by", ownerId);
		}
		// Assign player to controller
		controller.playerId = playerId;
		console.log("EngineServer.setPlayerController: assigned player", playerId, "to controller", controllerId);
		// Send updated controller list to clients
		this.refreshControllerList();
	}

	/**
	 * 
	 * @param {Controller} controller 
	 * @returns {Player}
	 */
	static getControllerAssignedPlayer(controller) {
		if(!controller.playerId) { return null; }
		return this.getEntity(controller.playerId);
	}

	// TODO: it's only temporary
	static getFirstVRPlayer() {
		// TODO: a set of connected player ids
		for(const player of this.entities.values()) {
			if(player.vr) { return player; }
		}
		return null;
	}
}