import { Request, Response } from 'express';

type SseClient = {
  id: string;
  res: Response;
};

// docId -> clients
const clientsByDoc = new Map<string, Map<string, SseClient>>();

function getClientId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function addAnnotationSseClient(docId: string, req: Request, res: Response) {
  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  // If behind a proxy (nginx), this helps disable response buffering.
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const clientId = getClientId();
  if (!clientsByDoc.has(docId)) clientsByDoc.set(docId, new Map());
  clientsByDoc.get(docId)!.set(clientId, { id: clientId, res });

  // Initial "connected" ping so the client can confirm subscription.
  res.write(`event: connected\ndata: ${JSON.stringify({ docId })}\n\n`);

  req.on('close', () => {
    const map = clientsByDoc.get(docId);
    map?.delete(clientId);
    if (map && map.size === 0) clientsByDoc.delete(docId);
  });
}

export function broadcastAnnotationEvent(
  docId: string,
  event: 'comment_created' | 'comment_updated' | 'comment_deleted',
  data: unknown
) {
  const map = clientsByDoc.get(docId);
  if (!map) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of map.values()) {
    client.res.write(payload);
  }
}

