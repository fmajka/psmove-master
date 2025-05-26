import * as THREE from 'three';
import StateBase from './StateBase.js';

export default class StateClient extends StateBase {
	constructor() {
		super();
		// Cache accurate position and rotation extracted during render
		this.xrPosition = new THREE.Vector3();
		this.xrQuaternion = new THREE.Quaternion();

		// Easy references for the clients's player and controller objects
		this.localPlayer = null;
		this.localController = null;
	}

	updateXR(xrCamera) {
		xrCamera.getWorldPosition(this.xrPosition);
  	this.xrQuaternion.copy(xrCamera.quaternion);
	}

}