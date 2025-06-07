import Entity from "./Entity.js";
import * as THREE from 'three';

export default class EntityParticle extends Entity {

	constructor(id, scene) {
		super(id, scene);
		this.direction = new THREE.Vector3();
		this.speed = 1.0;
	}

	initMesh() {
		const size = 0.02 + Math.random() * 0.02;
		const geometry = new THREE.SphereGeometry(size , 4, 4);
		const material = new THREE.MeshStandardMaterial({ color: 0xffff00, transparent: true });
		const particle = new THREE.Mesh(geometry, material);
		this.meshRef = particle;
		this.scene.add(particle)
	}
}