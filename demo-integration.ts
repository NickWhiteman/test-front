import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import { HttpChannel } from './src/channels/http';
import { WebSocketChannel } from './src/channels/websocket';
import { ConnectionService } from './src/services/connectionService';

async function startHttpServer(port: number) {
  const server = http.createServer((req, res) => {
    if (!req.url) return res.end();

    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    if (req.method === 'POST' && req.url === '/api/data') {
      let body = '';
      req.on('data', (chunk) => (body += chunk.toString()));
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ received: JSON.parse(body || '{}') }));
      });
      return;
    }

    res.writeHead(404);
    res.end();
  });

  await new Promise<void>((resolve) => server.listen(port, resolve));
  return server;
}

async function startWsServer(port: number) {
  const wss = new WebSocketServer({ port });

  wss.on('connection', (ws) => {
    console.log('[ws-server] client connected');

    ws.on('message', (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        console.log('[ws-server] got message', parsed);
        // echo back
        ws.send(JSON.stringify({ echo: parsed }));
      } catch (err) {
        ws.send(JSON.stringify({ error: 'invalid json' }));
      }
    });

    ws.send(JSON.stringify({ welcome: 'hello client' }));
  });

  // wait for server to be ready
  await new Promise<void>((resolve) => wss.on('listening', () => resolve()));
  return wss;
}

async function run() {
  const httpPort = 3005;
  const wsPort = 3006;

  const httpServer = await startHttpServer(httpPort);
  console.log(`[demo] HTTP server listening http://localhost:${httpPort}`);

  const wsServer = await startWsServer(wsPort);
  console.log(`[demo] WebSocket server listening ws://localhost:${wsPort}`);

  const httpChannel = new HttpChannel({
    id: 'http-real',
    priority: 100,
    healthCheckInterval: 10000,
    timeout: 2000,
    retryAttempts: 2,
    retryDelay: 500,
    baseURL: `http://localhost:${httpPort}`,
    endpoints: { health: '/health', main: '/api/data' },
  } as any);

  const wsChannel = new WebSocketChannel({
    id: 'ws-real',
    priority: 50,
    healthCheckInterval: 10000,
    timeout: 2000,
    retryAttempts: 2,
    retryDelay: 500,
    url: `ws://localhost:${wsPort}`,
    reconnectInterval: 1000,
  } as any);

  const svc = new ConnectionService();

  try {
    // initialize channels individually to inspect behavior
    console.log('[demo] initializing http channel');
    await httpChannel.initialize();
    console.log('[demo] httpChannel status', httpChannel.status);

    console.log('[demo] initializing ws channel');
    await wsChannel.initialize();
    console.log('[demo] wsChannel status', wsChannel.status);

    // Test HttpChannel send
    const httpRes = await httpChannel.send({ ping: 'from-demo' });
    console.log('[demo] http send response', httpRes);

    // Test healthCheck
    const hc = await httpChannel.healthCheck();
    console.log('[demo] http healthCheck', hc);

    // Test WebSocket send/receive
    // subscribe to messages via onMessage
    wsChannel.onMessage((data) => {
      console.log('[demo] wsChannel received message', data);
    });

    const wsSendRes = await wsChannel.send({ cmd: 'hello-ws' });
    console.log('[demo] ws send result', wsSendRes);

    // Also try putting channels into ConnectionService and use send
    await svc.initialize([httpChannel, wsChannel]);
    console.log('[demo] ConnectionService current channel', svc.getCurrentChannelId());

    const svcRes = await svc.send({ from: 'service', x: 1 });
    console.log('[demo] ConnectionService send result', svcRes);

    // let some messages flow
    await new Promise((r) => setTimeout(r, 500));

    // cleanup
    await svc.shutdown();
  } catch (err) {
    console.error('[demo] error', err);
  } finally {
    try {
      httpServer.close();
      // close ws server
      (wsServer as any).close();
    } catch (err) {
      // ignore
    }
    console.log('[demo] servers closed');
  }
}

run().catch((e) => console.error(e));
