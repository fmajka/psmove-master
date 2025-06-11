import * as THREE from 'three';
import IOServer from './IOServer.js';
import EngineBase from './EngineBase.js';
import Controller from './entities/EntityController.js';
import Player from './entities/EntityPlayer.js';
import EntityProjectile from './entities/EntityProjectile.js';
import EntityParticle from './entities/EntityParticle.js';
import EntityEnemy from './entities/EntityEnemy.js';
import PSMove from './enums/PSMove.js';

export default class EngineServer extends EngineBase {
	/**
	 * Stores all existing controller references
	 * @type {Set<Controller>}
	 */
	static controllerCache = new Set();

	/**
	 * The next free entity ID
	 * @type {number}
	 */
	static nextId = PSMove.MAX_CONTROLLER_COUNT;

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
		IOServer.addSync(controller.id, "playerId");
		console.log("EngineServer.setPlayerController: assigned player", playerId, "to controller", controllerId);
		// Send updated controller list to clients
		this.refreshControllerList();
	}

	static getPlayerController(player) {
		for(const controller of this.controllerCache) {
			if(controller.playerId === player.id) { return controller; }
		}
		return null;
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

	static controllerShootProjectile(controller) {
		/** @type {EntityProjectile} */
		const projectile = this.getEntity(this.nextId++, EntityProjectile);
		projectile.position.copy(controller.position)
		projectile.quaternion.copy(controller.quaternion);
		projectile.direction = new THREE.Vector3(0, 0, -1)
			.applyQuaternion(controller.quaternion)
			.normalize();
		projectile.colorValue = controller.colorValue;

		// this.spawnParticles(controller.position, controller.colorValue, 0.01, 0.5);

		IOServer.addSync(projectile.id, "colorValue")
		console.log("Controller", controller.id, "shoot!");
	}

	static spawnParticles(position, colorValue, radius, speed) {
		const {x, y, z} = position;
		console.log(`Spawning particles at (${x}, ${y}, ${z})`);

		const count = 10 + Math.floor(Math.random() * 5);
		for (let i = 0; i < count; i++) {
			const particle = this.getEntity(this.nextId++, EntityParticle);
			particle.position.copy(position);
			particle.direction.set( 
				(Math.random() - 0.5) * 2,
				(Math.random() - 0.5) * 2,
				(Math.random() - 0.5) * 2
			).normalize();
			// Custom size
			particle.radius = radius ?? 0.02;
			particle.speed = speed ?? 1.0;
			// Tint particles if argument provided
			if(colorValue) {
				particle.colorValue = colorValue;
				IOServer.addSync(particle.id, "colorValue")
			}
			IOServer.addSync(particle.id, "radius")
		}
	}

	static spawnEnemy() {
		const enemy = this.getEntity(this.nextId++, EntityEnemy);
		enemy.position.set(
			24 * (Math.random() - 0.5),
			15 + Math.random() * 4,
			24 * (Math.random() - 0.5),
		);
		const {x, y, z} = enemy.position;
		IOServer.addSync(enemy.id, "position");
		console.log("Enemy spawned at", x, y, z);
	}

	// TODO: make it more... acceptable?
	static update(dt) {
		for(const [id, entity] of this.entities.entries()) {
			// Remove dead
			if(entity.life <= 0) {
				this.entities.delete(id);
				continue; 
			}

			if(entity instanceof EntityProjectile) {
				entity.life -= dt;
				entity.position.add(entity.direction.clone().multiplyScalar(entity.speed * dt));
				
				// Explode when expired or hit the ground
				if(entity.life <= 0 || this.getWorldHeight(entity.position.x, entity.position.z) > entity.position.y - 0.05) {
					entity.life = 0;
					this.spawnParticles(entity.position, entity.colorValue);
				}

				IOServer.addSync(id, "position", "life");

				// Collision with enemies
				for(const [enemyId, enemy] of this.entities.entries()) {
					if(!(enemy instanceof EntityEnemy) || enemy.life <= 0) { continue; }
					if(entity.position.distanceTo(enemy.position) < 0.55) {
						entity.life = enemy.life = 0;
						IOServer.addSync(id, "life");
						IOServer.addSync(enemyId, "life");
						this.spawnParticles(entity.position, entity.colorValue);
						break;
					}
				}
			}

			else if(entity instanceof EntityParticle) {
				entity.life -= dt;
        entity.position.add(entity.direction.clone().multiplyScalar(entity.speed * dt));
				IOServer.addSync(id, "position", "life");
			}
		}
	}
}