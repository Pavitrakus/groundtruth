import 'dotenv/config';
import http from 'node:http';

const port = Number(process.env.PORT ?? 3101);
const apiKey = process.env.REACTOR_API_KEY;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method !== 'POST' || url.pathname !== '/api/token') {
    sendJson(res, 404, { error: 'Not found' });
    return;
  }

  if (!apiKey) {
    sendJson(res, 500, { error: 'REACTOR_API_KEY is missing. Add it to .env.' });
    return;
  }

  try {
    const response = await fetch('https://api.reactor.inc/tokens', {
      method: 'POST',
      headers: { 'Reactor-API-Key': apiKey },
    });
    const body = await response.text();

    res.writeHead(response.status, {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': response.headers.get('content-type') ?? 'application/json',
    });
    res.end(body);
  } catch (error) {
    sendJson(res, 502, {
      error: 'Unable to reach Reactor token endpoint.',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
});

server.listen(port, () => {
  console.log(`GroundTruth token server running on http://localhost:${port}`);
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Reactor-API-Key');
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  });
  res.end(JSON.stringify(body));
}
