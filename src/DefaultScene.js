import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/Addons.js';

export default class DefaultScene extends THREE.Scene {
	constructor(renderer) {
		super();

		this.renderer = renderer;

		this.fbxLoader = new FBXLoader();
		
		this.textureLoader = new THREE.TextureLoader();
		// Object for storing texture references
		this.textures = {};

		// Display axes helper in front of the player
		this.axesHelper = null;

		// Just a torus
		this.torus = null;

		this.sun = null;

		/** @type {THREE.Mesh} */
		this.groundMesh = null;

		// Time for day/night cycle
		this.time = 0;

		// Texture map for easy creation
		const textureMap = {
			admixon: "/admixon_face.jpg",
		}
		// Fairy textures
		for(let i = 1; i <= 4; i++) {
			textureMap[`fairy${i}`] = `/fairy${i}.png`;
		}

		this.initTextures(textureMap);
		this.initGraphics();
	}

	initTextures(textureMap) {
		for(const [name, path] of Object.entries(textureMap)) {
			this.textures[name] = this.textureLoader.load(
				path, 
				() => console.log(`Texture "${name}" from "${path}" loaded successfully`),
  			undefined,
  			(err) => console.warn(`Error loading texture from "${path}":`, err)
			);
		}
	}

	initGraphics() {
		let geometry, material, texture;

		// Axes helper
		this.axesHelper = new THREE.AxesHelper(5);
		// TODO: always move in front of players camera
		this.axesHelper.position.set(0, 15, -1);
		this.add(this.axesHelper);

		// Example torus
		geometry = new THREE.TorusGeometry(2.5, 1, 3, 5);
		material = new THREE.MeshStandardMaterial({
			color: 0xffffff,
		});
		this.torus = new THREE.Mesh(geometry, material);
		this.torus.position.y = 22;
		this.add(this.torus);

		// Light
		// const pointLight = new THREE.PointLight(0x00ff00, 5);
		// pointLight.position.set(7, 7, 7);
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
		this.sun = new THREE.PointLight(0xffffaa, 10, 0, 0.1);
		this.sun.position.set(100, 100, 100);
		this.add(this.sun);
		this.add(ambientLight);

		// Stars
		const createStar = () => {
			const geometry = new THREE.SphereGeometry(0.25);
			const material = new THREE.MeshStandardMaterial({ color: (0.5 + 0.5 * Math.random()) * 0xffffff });
			const star = new THREE.Mesh(geometry, material);
			const [x, y, z] = Array(3).fill().map(
				() => THREE.MathUtils.randFloatSpread(100)
			);
			star.position.set(x, y, z);
			return star;
		}
		for(let i = 0; i < 200; i++) {
			// this.add(createStar());
		}
		
		// Skybox
		const skyboxMaterials = ["px", "nx", "py", "ny", "pz", "nz"].map((name) => {
			texture = this.textureLoader.load(`/textures/sky_18_cubemap/${name}.png`);
			return new THREE.MeshBasicMaterial({ 
				map: texture,
				side: THREE.BackSide
			});
		});
		const skyboxGeometry = new THREE.BoxGeometry(1000, 1000, 1000);
		this.skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterials);
		this.add(this.skybox);
		
		// Ground
		const groundGeometry = new THREE.PlaneGeometry(64, 64, 128, 128);
		const groundTexture = this.textureLoader.load("/textures/grass_01_1k/grass_01_color_1k.png");
		groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
		groundTexture.repeat.set(16, 16);
		const dispMap = this.textureLoader.load("/heightmap.png");
		dispMap.wrapS = dispMap.wrapT = THREE.RepeatWrapping;
		// Initialize vertex colors to white
		// const vertexCount = geometry.attributes.position.count;
		const vertexCount = groundGeometry.getAttribute("position").count;
		const colors = new Float32Array(vertexCount * 3);
		colors.fill(1); // RGB all white
		groundGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
		console.log("Geometry", groundGeometry)
		// Ground Material
		const groundMaterial = new THREE.MeshStandardMaterial({
			vertexColors: true,
			side: THREE.DoubleSide,
			map: groundTexture,
			displacementMap: dispMap,
			displacementScale: 16,
		});
		const groundMesh = this.groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
		// groundMesh.rotation.z = Math.PI;
		groundMesh.rotation.x = -Math.PI / 2;
		groundMesh.position.y = 0;
		// groundMesh.position.y = -15;
		this.add(groundMesh);
	}

	update(dt) {
		this.time += dt;

		this.torus.rotation.x += 0.6 * dt;
		this.torus.rotation.y += 0.3 * dt;
		this.torus.rotation.z += 0.6 * dt;

		this.skybox.rotation.y += 0.003 * dt;
	}
}
