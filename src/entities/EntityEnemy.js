import Entity from "./Entity.js";
import * as THREE from 'three';

export default class EntityEnemy extends Entity {
	constructor(id, scene) {
		super(id);

		this.life = 1.0;

		if(scene) {
			this.initModel(scene);
		}
	}

	initModel(scene) {
		console.log("Where is the fairy?")
		const txt = `fairy${1 + Math.floor(Math.random() * 4)}`;
		const enemyMaterial = new THREE.SpriteMaterial({ map: scene.textures[txt] });
		const sprite = new THREE.Sprite(enemyMaterial);
		this.modelRef = sprite;
		// sprite.scale.set(1, 1, 1);
		scene.add(sprite);
	}
}