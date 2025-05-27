import * as THREE from 'three';
import EntityPhysical from './EntityPhysical.js';

export default class Player extends EntityPhysical {

	static setters = {
		/**
		 * Sets the yaw offset to the given value, updating the cameraRig's quaternion
		 * @param {Number} value
		 */
		yawOffset: (entity, value) => {
			entity.cameraRig.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), value);
			// window._debug = `${this.syncPlayer.cameraRig.quaternion.toArray().map(v=>v.toFixed(2)).toString()}, yaw: ${value.toFixed(2)}`;
			return value;
		},
		offsetPosition: (entity, value) => {
			const {x, y, z} = value;
			entity.cameraRig.position.set(x, y, z);
			return new THREE.Vector3(x, y ,z);
		},
	}

	/**
	 * @param {string} id - Identifier of the player should be their websocket IP address
	 */
	constructor(id, scene) {
		super(id);

		// Controller assigned to the player
		// this.controller = null;

		/**
		 * When enabled overrides button functionality for the purpose of calibration
		 * @type {Boolean}
		 */
		this.calibrationMode = false;

		/**
		 * Wraps the camera in order to apply custom yaw rotation
		 * @type {THREE.Group}
		 */
		this.cameraRig = new THREE.Group();

		// Server-side
		this.isMoving = false;

		// Client-side only
		if(scene) {
			this.initModel(scene);
			scene.add(this.cameraRig);
			scene.add(this.translateRef);
		}
	}

	initModel(scene) {
		const character = this.translateRef = new THREE.Object3D();
		// Torso
		const torsoHeight = 1.25;
		const geometry = new THREE.CylinderGeometry( 0.15, 0.5, torsoHeight, 16 ); 
		const material = new THREE.MeshStandardMaterial( {color: 0xbbbbbb} ); 
		const cylinder = new THREE.Mesh( geometry, material ); 
		cylinder.position.y = torsoHeight / 2;
		character.add(cylinder);
		// Head
		const headMaterialPlain = new THREE.MeshStandardMaterial({ color: 0xdddddd });
		const headMaterialDark = new THREE.MeshStandardMaterial({ color: 0xbbbbbb });
    const headMaterialTexture = new THREE.MeshStandardMaterial({ map: scene.textures.admixon });
		const headMaterials = [
			headMaterialPlain, // right
			headMaterialPlain, // left
			headMaterialDark, // top
			headMaterialPlain, // bottom
			headMaterialDark,  // back
			headMaterialTexture, // front
		];
		const headSize = 0.5;
		const headGeometry = new THREE.BoxGeometry(headSize, headSize, headSize);
		const headMesh = new THREE.Mesh(headGeometry, headMaterials);
		headMesh.position.y = headSize / 2;
		const headPivot = this.pivotRef = new THREE.Object3D();
		headPivot.position.y =  0.9 * torsoHeight;
		headPivot.add(headMesh);
		character.add(headPivot);
		return character;
	}

}