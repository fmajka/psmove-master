import * as THREE from 'three';
import StateBase from './StateBase.js';
import Player from './entities/EntityPlayer.js';
import Controller from './entities/EntityController.js';

export default class StateClient extends StateBase {
	constructor() {
		super();
		// Cache accurate position and rotation extracted during render
		this.xrPosition = new THREE.Vector3();
		this.xrQuaternion = new THREE.Quaternion();

		/**
		 * @type {Player}
		 */
		this.localPlayer = null;

		/**
		 * @type {Controller}
		 */
		this.localController = null;
	}

	updateXR(xrCamera) {
		xrCamera.getWorldPosition(this.xrPosition);
  	this.xrQuaternion.copy(xrCamera.quaternion);
	}

}