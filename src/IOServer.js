import { WebSocket, WebSocketServer } from "ws";
import GameServer from "./GameServer.js";
import * as THREE from 'three';
import Player from "./entities/EntityPlayer.js";

export default class IOServer {
	static wss = null;
	static nextId = 0;

	static clients = new Set();

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
			this.clients.add(ws);
			// Used for initialization...?
			// TODO: do I even need to do this?
			GameServer.state.getEntity(addr, Player);

			ws.on('close', () => {
				console.log(`Client ${clientId} disconnected`, addr);
				this.clients.delete(ws);
			});

			ws.on("message", (msg) => {
				try {
					const data = JSON.parse(msg.toString());
					if(data.type === "sync_player") {
						const {x, y, z} = data.position;
						GameServer.setPlayerPosition(addr, new THREE.Vector3(x, y, z));
						GameServer.setPlayerRotation(addr, new THREE.Quaternion(...data.quaternion));
					}
					else if(data.type === "enter_vr") {
						const player = GameServer.state.getEntity(addr, Player);
						// TODO: proper Player prop
						player.vr = true;
						// const {x, y, z} = data.position;
						// player.position.set(x, y, z);
						console.log(addr, "is now VR on position", player.position);
						// TODO: only emit id to the target? Probably no...?
						this.emit({type: "init", playerId: addr})
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
		const entities = GameServer.state.entities;
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
}