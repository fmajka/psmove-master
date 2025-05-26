import Entity from "../entities/Entity.js"
import Player from "../entities/EntityPlayer.js"
import Controller from "../entities/EntityController.js"

const EntityTypes = {
	[Entity.name]: Entity,
	[Player.name]: Player,
	[Controller.name]: Controller,
}

export default EntityTypes;