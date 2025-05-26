import * as THREE from 'three';

export default class UIWindow {

	// 288, 96
	constructor(width, height, position, scale) {
		this.canvas = document.createElement('canvas');
		this.canvas.width = width;
		this.canvas.height = height;
		this.ctx = this.canvas.getContext('2d');

		// Init canvas sprite
		this.texture = new THREE.CanvasTexture(this.canvas);
		const material = new THREE.SpriteMaterial({ map: this.texture, depthTest: false, transparent: true });
		this.sprite = new THREE.Sprite(material);
		this.sprite.position.copy(position);
		this.sprite.scale.copy(scale);

		// Lines of text to be printed
		this.text = [];
	}

	attachTo(object) {
		object.add(this.sprite);
	}

	setDebugText(...args) {
		this.text = [];
		// Fill the text line array
		args.forEach((arg) => {
			let text = "";
			if(Array.isArray(arg)) {
				arg.forEach((value) => {
					if(typeof value === "number") { value = value.toFixed(2); }
					text += `${value}, `;
				})
			} 
			else if(arg && typeof arg === "object") {
				for(let [key, value] of Object.entries(arg)) {
					if(typeof value === "number") { value = value.toFixed(2); }
					text += `${key}: ${value}, `;
				}
			}
			else {
				text = arg;
			}
			this.text.push(text);
		});
	}

	drawDebugText() {
		// Clear and prepare
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
		this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
		this.ctx.fillStyle = '#FFFFFF';
		this.ctx.font = '8px monospace';
		// Print text onto the sprite
		this.text.forEach((text, i) => {
			const x = 10, y = 15 + 15 * i;
			this.ctx.fillText(text, x, y);
		});
		this.texture.needsUpdate = true;
	}

}