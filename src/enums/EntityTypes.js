import Entity from "../entities/Entity.js"
import Player from "../entities/EntityPlayer.js"
import Controller from "../entities/EntityController.js"
import EntityParticle from "../entities/EntityParticle.js"
import EntityProjectile from "../entities/EntityProjectile.js"
import EntityEnemy from "../entities/EntityEnemy.js"

const EntityTypes = {
	[Entity.name]: Entity,
	[Player.name]: Player,
	[Controller.name]: Controller,
	[EntityEnemy.name]: EntityEnemy,
	[EntityParticle.name]: EntityParticle,
	[EntityProjectile.name]: EntityProjectile,
}

export default EntityTypes;