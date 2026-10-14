import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { type AddressInfo } from 'node:net';

import { type LanguageModel } from 'ai';

import { tutorTurnRequestSchema } from '../../src/features/conversation/lib/tutorContract';
import { encodeEvent } from '../../src/features/conversation/lib/turnStream';
import { streamTurn } from './tutor';

/** Learner turns are a few sentences; anything bigger is not a turn. */
const MAX_BODY_BYTES = 32 * 1024;

export type TutorServer = { url: string; close(): Promise<void>; server: Server };

export function createHandler(model: LanguageModel) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method === 'GET' && req.url === '/health') {
      return json(res, 200, { ok: true });
    }
    if (req.method !== 'POST' || req.url !== '/v1/turn') {
      return json(res, 404, { error: 'not_found' });
    }

    let body: unknown;
    try {
      body = JSON.parse(await readBody(req));
    } catch (error) {
      const tooLarge = error instanceof Error && error.message === 'too_large';
      return json(res, tooLarge ? 413 : 400, { error: tooLarge ? 'too_large' : 'invalid_json' });
    }
    const parsed = tutorTurnRequestSchema.safeParse(body);
    if (!parsed.success) {
      return json(res, 400, { error: 'invalid_request', issues: parsed.error.issues.length });
    }

    // Stop paying for tokens the moment the learner leaves the screen.
    const abort = new AbortController();
    res.on('close', () => abort.abort());

    res.writeHead(200, {
      'content-type': 'application/x-ndjson; charset=utf-8',
      'cache-control': 'no-store',
      'x-accel-buffering': 'no',
    });
    for await (const event of streamTurn(parsed.data, model, abort.signal)) {
      if (res.destroyed) break;
      res.write(encodeEvent(event));
    }
    res.end();
  };
}

export async function startTutorServer(options: {
  port: number;
  model: LanguageModel;
}): Promise<TutorServer> {
  const handler = createHandler(options.model);
  const server = createServer((req, res) => {
    handler(req, res).catch(() => {
      if (!res.headersSent) json(res, 500, { error: 'internal' });
      else res.end();
    });
  });
  await new Promise<void>((resolve) => server.listen(options.port, resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    server,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    // An oversized body is drained rather than the socket destroyed, so the
    // client still receives the 413 instead of a reset connection.
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size <= MAX_BODY_BYTES) chunks.push(chunk);
    });
    req.on('end', () =>
      size > MAX_BODY_BYTES
        ? reject(new Error('too_large'))
        : resolve(Buffer.concat(chunks).toString('utf8')),
    );
    req.on('error', reject);
  });
}

function json(res: ServerResponse, status: number, payload: unknown) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(payload));
}
