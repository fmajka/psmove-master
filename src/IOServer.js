import Sync from "./enums/Sync.js";

export default class IOServer {
	static wss = null;
	static nextId = 0;

	static clients = new Map();

	/**
 	 * @type {Array<Map<string, Set<string>>>}
 	 */
	static syncCache = Object.values(Sync).map(() => new Map());

	static init(wss) {
		wss.on('connection', (ws, req) => {
			ws.id = IOServer.nextId++;
			console.log(`Client ${ws.id} connected`, req.socket.remoteAddress);
			IOServer.clients.add(ws);

			ws.on('close', () => {
				console.log(`Client ${ws.id} disconnected`, req.socket.remoteAddress);
				IOServer.clients.delete(ws);
			});
		});
		// Store wss
		IOServer.wss = wss;
	}

	// Emit stringified JSON data object to a target (or all clients if not provided)
	static emit(data, target = null) {
		const clients = target ? [target] : IO.clients;
		clients.forEach((client) => {
			if(client.readyState === WebSocket.OPEN) {
				client.send(JSON.stringify(data));
			}
		});
	}

	// Mark property keys that will be synchronised on next emit
	static addSync(syncType, id, ...keys) {
		const set = IOServer.syncCache[syncType].get(id);
		keys.forEach((key) => set.add(key));
	}

	static emitSync() {
		// Convert the data structure so that it can be sent via websockets as JSON
		const sync = IOServer.syncCache.map((idMap) => 
			Object.fromEntries(
				[...idMap.entries()].map(([id, set]) => [id, Array.from(set)])
			)
		);
		// Send data to each connected client
		IOServer.emit({type: "sync", sync});
		// Clear sync cache
		IOServer.syncCache.forEach((map) => map.clear());
	}
}