import Entity from "./Entity.js";
import * as THREE from 'three';

export default class EntityProjectile extends Entity {

	static setters = {
		/**
		 * Match led color
		 * @param {Number} value
		 */
		colorValue: (entity, value) => {
			entity.modelRef.material.color.setHex(value);
			return value;
		},
	}

	constructor(id, scene) {
		super(id);
		this.direction = new THREE.Vector3();
		this.speed = 10;
		this.life = 5.0;

		if(scene) {
			this.initModel(scene);
		}
	}

	initModel(scene) {
		const geometry = new THREE.SphereGeometry(0.05, 8, 8);
		const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
		const sphere = new THREE.Mesh(geometry, material);
		this.modelRef = sphere;
		scene.add(sphere);
	}
}