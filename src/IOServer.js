import { WebSocket, WebSocketServer } from "ws";
import Sync from "./enums/Sync.js";
import GameServer from "./GameServer.js";
import * as THREE from 'three';

export default class IOServer {
	static wss = null;
	static nextId = 0;

	static clients = new Set();

	/**
 	 * @type {Array<Map<string, Set<string>>>}
 	 */
	static syncCache = Object.values(Sync).map(() => new Map());

	/**
 	 * @param {WebSocketServer} wss
 	 */
	static init(wss) {
		wss.on('connection', (ws, req) => {
			const clientId = IOServer.nextId++;
			const addr = req.socket.remoteAddress;

			console.log(`Client ${clientId} connected`, addr);
			IOServer.clients.add(ws);
			GameServer.initPlayer(addr);

			ws.on('close', () => {
				console.log(`Client ${clientId} disconnected`, addr);
				IOServer.clients.delete(ws);
			});

			ws.on("message", (msg) => {
				try {
					const data = JSON.parse(msg.toString());
					if(data.type === "sync_camera") {
						console.log(addr, data.quaternion);
						// GameServer.setPlayerRotation(addr, new THREE.Quaternion(...data.quaternion));
					}
				} catch(err) {
					console.log("IOServer onmessage error:", err.message);
				}
			})
		});
		// Store wss
		IOServer.wss = wss;
	}

	// Emit stringified JSON data object to a target (or all clients if not provided)
	static emit(data, target = null) {
		const clients = target ? [target] : IOServer.clients;
		clients.forEach((client) => {
			if(client.readyState === WebSocket.OPEN) {
				client.send(JSON.stringify(data));
			}
		});
	}

	// Mark property keys that will be synchronised on next emit
	static addSync(syncType, id, ...keys) {
		const map = IOServer.syncCache[syncType];
		if(!map.has(id)) {
			map.set(id, new Set());
		}
		const set = map.get(id);
		keys.forEach((key) => set.add(key));
	}

	// Emits a generic sync message to all clients, should be called after every game tick
	static emitSync() {
		// Convert the data structure so that it can be sent via websockets as JSON
		// const sync = IOServer.syncCache.map((idMap) => 
		// 	Object.fromEntries(
		// 		[...idMap.entries()].map(([id, set]) => [id, Array.from(set)])
		// 	)
		// );
		const state = GameServer.state;
		const sourceMaps = state.sourceMaps;
		// console.log(IOServer.syncCache)
		const sync = IOServer.syncCache.map((idMap, syncIndex) => 
			Object.fromEntries(
				[...idMap.entries()].map(([id, set]) => [id, Object.fromEntries(
					[...set.keys()].map((key) => [key, sourceMaps[syncIndex].get(id)[key]])
				)])
			)
		);
		// Send data to each connected client
		IOServer.emit({type: "sync", sync});
		// Clear sync cache
		IOServer.syncCache.forEach((map) => map.clear());
	}
}