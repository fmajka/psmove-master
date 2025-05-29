import { WebSocket, WebSocketServer } from "ws";
import EngineServer from "./EngineServer.js";
import * as THREE from 'three';
import Player from "./entities/EntityPlayer.js";

export default class IOServer {
	static wss = null;
	static nextId = 0;

	static clients = new Map();

	/**
	 * Maps entity id to a set of property keys that were changed last tick
 	 * @type {Map<string, Set<string>>}
 	 */
	static syncCache = new Map();

	/**
 	 * @param {WebSocketServer} wss
 	 */
	static init(wss) {
		wss.on('connection', (ws, req) => {
			const clientId = this.nextId++;
			const addr = req.socket.remoteAddress;

			console.log(`Client ${clientId} connected`, addr);
			this.clients.set(addr, ws);
			// Used for initialization...?
			EngineServer.refreshControllerList();
			// TODO: do I even need to do this?
			// EngineServer.getEntity(addr, Player);

			ws.on('close', () => {
				console.log(`Client ${clientId} disconnected`, addr);
				this.clients.delete(addr);
			});

			ws.on("message", (msg) => {
				try {
					const data = JSON.parse(msg.toString());

					if(data.type === "sync_player") {
						if(!EngineServer.getEntity(addr)) { return; }
						const {x, y, z} = data.position;
						// TODO: is this stupid?
						EngineServer.setPlayerPosition(addr, new THREE.Vector3(x, y, z));
						EngineServer.setPlayerRotation(addr, new THREE.Quaternion(...data.quaternion));
						IOServer.addSync(addr, "position", "quaternion");
					}

					else if(data.type === "enter_vr") {
						const player = EngineServer.getEntity(addr, Player);
						// TODO: proper Player prop
						player.vr = true;
						// const {x, y, z} = data.position;
						// player.position.set(x, y, z);
						console.log(addr, "is now VR on position", player.position);
						// TODO: only emit id to the target? Probably no...?
						this.emit({type: "init", playerId: addr}, ws)
					}

					else if(data.type === "controller_select") {
						console.log(data)
						EngineServer.setPlayerController(addr, data?.id)
					}

				} catch(err) {
					console.log("IOServer onmessage error:", err.message);
				}
			})
		});
		// Store wss
		this.wss = wss;
	}

	// Emit stringified JSON data object to a target (or all clients if not provided)
	static emit(data, target = null) {
		const clients = target ? [target] : this.clients;
		clients.forEach((client) => {
			if(client.readyState === WebSocket.OPEN) {
				client.send(JSON.stringify(data));
			}
		});
	}

	// Mark property keys of the entity with given id that will be synchronised on next emit
	static addSync(id, ...keys) {
		if(!this.syncCache.has(id)) {
			this.syncCache.set(id, new Set());
		}
		const set = this.syncCache.get(id);
		keys.forEach((key) => set.add(key));
	}

	// Emits a generic sync message to all clients, should be called after every game tick
	static emitSync() {
		// Convert the data structure so that it can be sent via websockets as JSON
		const entities = EngineServer.entities;
		const sync = Object.fromEntries(
			[...this.syncCache.entries()].map(([id, set]) => [id, Object.fromEntries([
				["_t", entities.get(id).constructor.name], // Additionally passes entity's class name
				...([...set.keys()].map((key) => [key, entities.get(id)[key]]))
			])])
		);
		// console.log(sync)
		// Send data to each connected client
		this.emit({type: "sync", sync});
		// Clear sync cache
		this.syncCache.clear();
	}

	static getActiveClientIDs() {
		return this.clients.keys();
	}
}