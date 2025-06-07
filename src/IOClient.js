import Engine from "./EngineClient.js";
import Player from "./entities/EntityPlayer.js";
import Alpine from "alpinejs";

export default class IOClient {
	static ipAddr = null;
	/**
	 * @type {WebSocket} socket
	 */
	static socket = null;
	
	static cameraSyncInterval = null;
	static reconnectInterval = null;

	static send(data) {
		if(!this.socket?.readyState === WebSocket.OPEN) {
			console.warn("IOClient.send(): not connected!");
			return; 
		}
		this.socket.send(JSON.stringify(data));
	}

	static connect(ipAddr) {
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
					position: Engine.xrPosition,
					quaternion: Engine.xrQuaternion.toArray(),
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
				// TODO: shouldn't have to pass scene here(?)
				const player = Engine.getEntity(data.playerId, Player, Engine.scene);
				Engine.setLocalPlayer(player);
				// TODO: it shouldn't look like that
				const controllers = Alpine.store("controllers");
				
				for(const controller of controllers) {
					if(controller.playerId === player.id) {
						Engine.localControllerId = controller.id
						break;
					}
				}
				console.log("init", data)
			}

			else if(data.type === "sync") {
				Engine.sync(data.sync);
			}

			else if(data.type === "controller_list") {
				Alpine.store("controllers", data.list);
				console.log("controller_list", data.list)
			}
		};
	}

}