import Entity from "./Entity.js";
import * as THREE from 'three';

export default class EntityParticle extends Entity {

	static setters = {
		radius: (entity, value) => {
			// Randomness
			entity.radius = value = (0.75 + Math.random() * 0.5) * value;
			entity.initMesh();
			return value;
		}
	}

	constructor(id, scene) {
		super(id, scene);
		this.direction = new THREE.Vector3();
		this.speed = null;
		this.radius = null;
	}

	initMesh() {
		if(!this.radius || this.meshRef) { return; }
		const geometry = new THREE.SphereGeometry(this.radius , 4, 4);
		const material = new THREE.MeshStandardMaterial({ color: this.colorValue ?? 0xffffff, transparent: true });
		const particle = new THREE.Mesh(geometry, material);
		this.meshRef = particle;
		this.scene.add(particle)
	}
}