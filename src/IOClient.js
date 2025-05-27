import Engine from "./EngineClient.js";
import Player from "./entities/EntityPlayer.js";
import Alpine from "alpinejs";

export default class IOClient {
	static ipAddr = null;
	static socket = null;
	static cameraSyncInterval = null;
	static reconnectInterval = null;

	static send(data) {
		this.socket.send(JSON.stringify(data));
	}

	static connect(ipAddr) {
		// TODO: dirty
		window._io = this;
		window.Alpine = Alpine;
		Alpine.start();
		Alpine.store("controllers", [
			{id: 0, colorId: 0, playerId: "::whatever"},
			{id: 1, colorId: 4, playerId: null},
		])
		// Skip if already connected
		if(this.socket) { return; }
		const socket = this.socket = new WebSocket(this.ipAddr = ipAddr);
		// Upon connecting 
		socket.onopen = () => {
			console.log("Connected to server");
			Engine.isXRInit = false;
			// Stop reconnect interval if started
			if(this.reconnectInterval) {
				clearInterval(this.reconnectInterval);
				this.reconnectInterval = null;
			}
			// Start sending camera position and orientation data
			this.cameraSyncInterval = setInterval(() => {
				const syncData = {
					type: "sync_player",
					position: Engine.state.xrPosition,
					quaternion: Engine.state.xrQuaternion.toArray(),
				}
				socket.send(JSON.stringify(syncData));
			}, 1000 / 30);
		};

		// Clear interval when disconnected
		socket.onclose = () => {
			console.log("Connection closed");
			// Stop sending data
			clearInterval(this.cameraSyncInterval);
			this.cameraSyncInterval = null;
			// Attempt to reconnect
			this.socket = null;
			this.reconnectInterval = setInterval(() => {
				this.connect(this.ipAddr);
			}, 2500);
		};

		socket.onmessage = (event) => {
			const data = JSON.parse(event.data);

			// TODO: some kind of initialization for proper multiplayer support
			if(data.type === "init") {
				// TODO: shouldn't have to pass scene here
				const player = Engine.state.getEntity(data.playerId, Player, Engine.scene);
				Engine.setLocalPlayer(player);
				console.log("init", data)
			}

			if(data.type === "sync") {
				Engine.sync(data.sync);
			}

			if(data.type === "controller_list") {
				Alpine.store("controllers", data.list);
				console.log(data.list)
			}
		};
	}

}