import Entity from "./Entity.js";
import * as THREE from 'three';

export default class EntityEnemy extends Entity {
	constructor(id, scene) {
		super(id, scene);
	}

	initMesh() {
		const txt = `fairy${1 + Math.floor(Math.random() * 4)}`;
		const enemyMaterial = new THREE.SpriteMaterial({ map: this.scene.textures[txt] });
		const sprite = new THREE.Sprite(enemyMaterial);
		this.meshRef = sprite;
		// sprite.scale.set(1, 1, 1);
		this.scene.add(sprite);
	}
}