import * as THREE from 'three';
import EntityPhysical from './EntityPhysical.js';
import PSMove from '../enums/PSMove.js';

export default class Controller extends EntityPhysical {

	static TRIGGER_ROTATION_BASE = Math.PI / 6;
	static TRIGGER_ROTATION_FACTOR = -Math.PI / 8;

	static BUTTON_COLORS_PRESSED = {
		[PSMove.Btn_CROSS]: 0x0000ff,
		[PSMove.Btn_SQUARE]: 0xff00ff,
		[PSMove.Btn_TRIANGLE]: 0x00ff00,
		[PSMove.Btn_CIRCLE]: 0xff0000,
	}
	static BUTTON_COLOR_PRESSED = 0x888888;
	static BUTTON_COLOR_RELEASED = 0x444444;

	static setters = {
		/**
		 * Sets the LED bulb color, updating the mesh
		 * @param {Number} value
		 */
		colorValue: (entity, value) => {
			entity.bulb.material.color.setHex(value);
			return value;
		},
		buttons: (entity, value) => {
			const changed = entity.buttons ^ value;
			for(const btnValue of Object.values(PSMove)) {
				if(~changed & btnValue) { continue; }
				const pressed = changed & value;
				entity.buttonRefs[btnValue]?.material.color.setHex(
					pressed 
					? this.BUTTON_COLORS_PRESSED[btnValue] ?? this.BUTTON_COLOR_PRESSED 
					: this.BUTTON_COLOR_RELEASED
				);
			}
			return value;
		},
		trigger: (entity, value) => {
			// entity.triggerRef.rotation.x = this.TRIGGER_ROTATION_BASE + value * this.TRIGGER_ROTATION_FACTOR;
			entity.triggerPivotRef.rotation.x = this.TRIGGER_ROTATION_BASE + value * this.TRIGGER_ROTATION_FACTOR;
			// console.log(entity.triggerPivotRef.rotation.x)
			return value;
		},
	}

	/**
	 * Represents a PlayStation Move controller
	 * @param {Number} id - ID (array index) of the controller
	 */
	constructor(id, scene) {
		super(id, scene);

		/**
		 * Scales the controller's physical position from PSMS to better match reality
		 * @type {Number}
		 */
		this.physicalScale = 1.0;
		
		/**
		 * ID of the player the controller is assigned to
		 * @type {string | null}
		 */
		this.playerId = null;

		this.colorValue = 0xffffff;

		// Button states
		this.buttons = 0;
		this.changed = 0;
		this.timePressed = {};
		this.trigger = 0;

		/**
		 * Map for holding references to meshes representing the controller's buttons
		 * @type {Object<number, THREE.Mesh>}
		 */
		// this.buttonRefs = null;

		// TODO: tracking data history for throwing
		this.positionHistory = [];
		this.quaternionHistory = [];

		// Upon holding the select button for at least one second, a hard reset request is sent
		this.hardResetProcessed = false;
	}

	initMesh() {
		const stick = new THREE.Mesh(
			new THREE.BoxGeometry(0.04, 0.04, 0.14),
			new THREE.MeshStandardMaterial({ color: 0x222222 })
		);
		stick.position.z = 0.09;
		// Trigger button ref
		const triggerPivotRef = this.triggerPivotRef = new THREE.Object3D();
		triggerPivotRef.position.y = -0.01;
		// triggerPivotRef.position.y = -0.2;
		triggerPivotRef.position.z = 0.04;
		// triggerPivotRef.position.z = -0.15;
		// triggerPivotRef.rotation.x = Controller.TRIGGER_ROTATION_BASE;
		const triggerRef = this.triggerRef = new THREE.Mesh(
			new THREE.BoxGeometry(0.02, 0.02, 0.03),
			// new THREE.BoxGeometry(0.015, 0.02, 0.03),
			new THREE.MeshStandardMaterial({ color: 0x444444 })
		);
		triggerRef.position.z = 0.015;
		triggerPivotRef.add(triggerRef);
		// References for controller buttons
		const btnSize = 0.01;
		const faceButtonSize = new THREE.Vector3(btnSize, btnSize, btnSize);
		const moveButtonSize = new THREE.Vector3(btnSize * 1.6, btnSize, btnSize * 3);
		const sideButtonSize = new THREE.Vector3(btnSize, btnSize, btnSize * 1.5);
		const createButton = (size, offsetX, offsetY, offsetZ) => {
			const buttonMesh = new THREE.Mesh(
				new THREE.BoxGeometry(size.x, size.y, size.z),
				new THREE.MeshStandardMaterial({ color: Controller.BUTTON_COLOR_RELEASED })
			);
			buttonMesh.position.set(offsetX, offsetY, offsetZ + 0.06);
			return buttonMesh;
		}
		const attachSticker = (button, txtName) => {
			const stickerMaterial = new THREE.MeshBasicMaterial({
				map: this.scene.textures[txtName],
				transparent: true,
				depthWrite: false, // So it doesn't occlude the box face
			});
			const stickerGeometry = new THREE.PlaneGeometry(btnSize, btnSize); // Slightly smaller than the box face
			const sticker = new THREE.Mesh(stickerGeometry, stickerMaterial);
			// Position the sticker on one side (e.g., +Z face)
			sticker.position.y = btnSize * 0.51; // Slightly in front of the box face
			sticker.rotateX(-Math.PI / 2);
			button.add(sticker);
		}
		const btnOff = 0.02 - btnSize / 4;
		this.buttonRefs = {
			[PSMove.Btn_CROSS]: createButton(faceButtonSize, -btnOff, btnOff, btnOff / 2),
			[PSMove.Btn_SQUARE]: createButton(faceButtonSize, -btnOff, btnOff, -btnOff / 2),
			[PSMove.Btn_TRIANGLE]: createButton(faceButtonSize, btnOff, btnOff, -btnOff / 2),
			[PSMove.Btn_CIRCLE]: createButton(faceButtonSize, btnOff, btnOff, btnOff / 2),
			[PSMove.Btn_MOVE]: createButton(moveButtonSize, 0, btnOff, 0),
			[PSMove.Btn_SELECT]: createButton(sideButtonSize, btnOff, -btnOff / 4, -btnOff / 2),
			[PSMove.Btn_START]: createButton(sideButtonSize, -btnOff, -btnOff / 4, -btnOff / 2),
			[PSMove.Btn_PS]: createButton(faceButtonSize, 0, btnOff, btnSize * 3.5),
			[PSMove.Btn_T]: triggerRef,
		}
		attachSticker(this.buttonRefs[PSMove.Btn_CROSS], "psCross");
		attachSticker(this.buttonRefs[PSMove.Btn_SQUARE], "psSquare");
		attachSticker(this.buttonRefs[PSMove.Btn_TRIANGLE], "psTriangle");
		attachSticker(this.buttonRefs[PSMove.Btn_CIRCLE], "psCircle");

		/**
		 * Reference to bulb mesh used for changing LED colors etc.
		 * @type {THREE.Mesh}
		 */
		this.bulb = new THREE.Mesh(
			new THREE.SphereGeometry(0.025),
			new THREE.MeshStandardMaterial({ color: 0xdddddd })
		);
		// Pivot for rotation
		this.pivotRef = new THREE.Object3D();
		this.pivotRef.add(stick);
		Object.values(this.buttonRefs).forEach((btn) => (btn !== triggerRef) && this.pivotRef.add(btn));
		this.pivotRef.add(triggerPivotRef);
		// this.pivotRef.add(triggerRef);
		this.pivotRef.add(this.bulb);
		// Offset for translation
		this.translateRef = this.meshRef = new THREE.Object3D();
		this.translateRef.add(this.pivotRef);
		this.scene.add(this.translateRef);
	}

	/**
	 * Additionally multiplies the physical position by the scale
	 * @override
	 */
	updatePosition(playerPosition) {
		this.position.copy(this.physicalPosition).multiplyScalar(this.physicalScale).add(this.offsetPosition);
		if(playerPosition) {
			this.position.add(playerPosition);
		}
	}
}