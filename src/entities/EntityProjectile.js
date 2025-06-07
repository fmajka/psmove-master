import Entity from "./Entity.js";
import * as THREE from 'three';

export default class EntityProjectile extends Entity {

	constructor(id, scene) {
		super(id, scene);
		this.direction = new THREE.Vector3();
		this.speed = 20;
		this.life = 2.0;
	}

	initMesh() {
		const geometry = new THREE.SphereGeometry(0.05, 8, 8);
		const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
		const sphere = new THREE.Mesh(geometry, material);
		this.meshRef = sphere;
		this.scene.add(sphere);
	}
}