import * as THREE from 'three';
import IOServer from './IOServer.js';
import EngineBase from './EngineBase.js';
import Controller from './entities/EntityController.js';
import Player from './entities/EntityPlayer.js';
import EntityProjectile from './entities/EntityProjectile.js';
import EntityParticle from './entities/EntityParticle.js';
import EntityEnemy from './entities/EntityEnemy.js';
import Entity from './entities/Entity.js';

export default class EngineServer extends EngineBase {
	/**
	 * Stores all existing controller references
	 * @type {Set<Controller}
	 */
	static controllerCache = new Set();

	static nextId = 8;

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

	static controllerShootProjectile(controller) {
		/** @type {EntityProjectile} */
		const projectile = this.getEntity(this.nextId++, EntityProjectile);
		projectile.position.copy(controller.position)
		projectile.quaternion.copy(controller.quaternion);
		projectile.direction = new THREE.Vector3(0, 0, -1)
			.applyQuaternion(controller.quaternion)
			.normalize();
		projectile.colorValue = controller.colorValue;

		IOServer.addSync(projectile.id, "colorValue")
		console.log("Controller", controller.id, "shoot!");
	}

	static spawnParticles(position, colorValue) {
		const {x, y, z} = position;
		console.log(`Spawning particles at (${x}, ${y}, ${z})`);
		const count = 10 + Math.floor(Math.random() * 5);
		for (let i = 0; i < count; i++) {
			// const geo = new THREE.SphereGeometry(0.05, 4, 4);
			// const mat = new THREE.MeshStandardMaterial({ color: 0xffff00, transparent: true });
			// const p = new THREE.Mesh(geo, mat);
			const particle = this.getEntity(this.nextId++, EntityParticle);
			particle.position.copy(position);
			particle.direction.set( 
				(Math.random() - 0.5) * 2,
				(Math.random() - 0.5) * 2,
				(Math.random() - 0.5) * 2
			).normalize();
			if(colorValue) {
				particle.colorValue = colorValue;
				IOServer.addSync(particle.id, "colorValue")
			}
			
			// scene.add(p);
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
			if(!entity.life || entity.life <= 0) { continue; }
			// Projectile update
			if(entity instanceof EntityProjectile) {
				entity.life -= dt;
				entity.position.add(entity.direction.clone().multiplyScalar(entity.speed * dt));
				IOServer.addSync(id, "position", "life");
				// entity.position.add(p.velocity.clone().multiplyScalar(delta));

				// Collision with enemies
				for(const [enemyId, enemy] of this.entities.entries()) {
					if(!(enemy instanceof EntityEnemy) || enemy.life <= 0) { continue; }
					if (entity.position.distanceTo(enemy.position) < 0.75) {
						// TODO: kill the bastard
						enemy.life = 0;
						IOServer.addSync(enemyId, "life");
						// scene.remove(e);
						// scene.remove(p.mesh);
						this.spawnParticles(enemy.position);
						// enemies.splice(j, 1);
						// projectiles.splice(i, 1);
						break;
					}
				}
			}

			else if(entity instanceof EntityParticle) {
        entity.position.add(entity.direction.clone().multiplyScalar(entity.speed * dt));
        entity.life -= dt;
				IOServer.addSync(id, "position", "life");
        // p.mesh.material.opacity = p.life;
        if (entity.life <= 0) {
					// TODO: kill ze bastard
          // scene.remove(p.mesh);
          // particles.splice(i, 1);
        }
			}
		}
	}
}