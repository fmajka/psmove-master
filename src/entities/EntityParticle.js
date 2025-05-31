import Entity from "./Entity.js";
import * as THREE from 'three';

export default class EntityParticle extends Entity {

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
		this.speed = 1.0;
		this.life = 1.0;

		if(scene) {
			this.initModel(scene);
		}
	}

	initModel(scene) {
		const size = 0.02 + Math.random() * 0.02;
		const geo = new THREE.SphereGeometry(size , 4, 4);
		const mat = new THREE.MeshStandardMaterial({ color: 0xffff00, transparent: true });
		const p = new THREE.Mesh(geo, mat);
		this.modelRef = p;
		scene.add(p)
	}
}