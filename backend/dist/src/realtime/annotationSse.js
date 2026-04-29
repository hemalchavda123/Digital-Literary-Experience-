"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastAnnotationEvent = exports.addAnnotationSseClient = void 0;
// docId -> clients
const clientsByDoc = new Map();
function getClientId() {
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
function addAnnotationSseClient(docId, req, res) {
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    // If behind a proxy (nginx), this helps disable response buffering.
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
    const clientId = getClientId();
    if (!clientsByDoc.has(docId))
        clientsByDoc.set(docId, new Map());
    clientsByDoc.get(docId).set(clientId, { id: clientId, res });
    // Initial "connected" ping so the client can confirm subscription.
    res.write(`event: connected\ndata: ${JSON.stringify({ docId })}\n\n`);
    req.on('close', () => {
        const map = clientsByDoc.get(docId);
        map?.delete(clientId);
        if (map && map.size === 0)
            clientsByDoc.delete(docId);
    });
}
exports.addAnnotationSseClient = addAnnotationSseClient;
function broadcastAnnotationEvent(docId, event, data) {
    const map = clientsByDoc.get(docId);
    if (!map)
        return;
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of map.values()) {
        client.res.write(payload);
    }
}
exports.broadcastAnnotationEvent = broadcastAnnotationEvent;
