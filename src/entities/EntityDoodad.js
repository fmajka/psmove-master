import Entity from "./Entity.js";

export default class EntityDoodad extends Entity {

	static setters = {
		modelPath: (entity, value) => {
			// TODO: setting in twice but whatever
			entity.modelPath = value;
			entity.initMesh()
			return value;
		},
	}

	constructor(id, scene) {
		super(id, scene);
		/**
		 * Path to the model representing the entity
		 * @type {string}
		 */
		this.modelPath = null;

		/**
		 * Scale of the model
		 * @type {string}
		 */
		this.modelScale = 0.01; 

		/**
		 * Prevents loading the model multiple times while syncing
		 * @type {string}
		 */
		this.modelIsLoading = false;
	}

	initMesh() {
		if(!this.modelPath || this.modelIsLoading || this.meshRef) { return; }

		this.modelIsLoading = true;
		this.scene.fbxLoader.load(this.modelPath, (object) => {
			object.scale.multiplyScalar(this.modelScale); // adjust scale if needed

			object.traverse((child) => {
				if (child.isMesh) {
					child.castShadow = true;
					child.receiveShadow = true;

					// Optional: manually apply texture if not loaded
					// const texture = new THREE.TextureLoader().load('/models/texture_diffuse.jpg');
					// child.material.map = texture;
					// child.material.needsUpdate = true;
				}
			});
			this.modelIsLoading = false;
			this.meshRef = object;
			this.meshRef.position.copy(this.position);
			this.scene.add(object);
		});
	}
}