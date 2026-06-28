/**
 * Shared helpers for test scripts that boot an HTTP server.
 *
 * Patterns:
 *   - Lazy boot: the server is only started when `startTestServer()`
 *     is called, so test scripts can import the helpers without
 *     triggering module-level side effects (e.g. DB lookups in app.ts).
 *   - Stable port: `port: 0` tells the OS to assign a free port.
 *   - Synchronous close: `server.close()` is synchronous and the
 *     returned URL is valid until the server is closed.
 *
 * Usage:
 *   import { startTestServer, makeJsonRequest, stopTestServer } from './_helpers/http-server.js';
 *
 *   let server: http.Server | null = null;
 *   let serverUrl = '';
 *
 *   test.before(async () => {
 *     ({ server, serverUrl } = await startTestServer());
 *   });
 *
 *   test.after(() => {
 *     stopTestServer(server);
 *     server = null;
 *   });
 *
 *   async function makePost(path: string, body: unknown, extraHeaders = {}) {
 *     return makeJsonRequest(serverUrl!, 'POST', path, body, extraHeaders);
 *   }
 */
import http from 'node:http';

export type TestServer = {
  server: http.Server;
  serverUrl: string;
};

/**
 * Boot the Hono app via `@hono/node-server` and return the server
 * instance + the base URL. Throws if the server cannot bind.
 */
export async function startTestServer(): Promise<TestServer> {
  const { serve } = await import('@hono/node-server');
  const { app } = await import('../../src/app.js');

  const bound = serve({ fetch: app.fetch, port: 0 }) as http.Server & {
    address: () => { port: number } | null;
  };
  const addr = bound.address();
  if (!addr || typeof addr === 'string') throw new Error('Could not bind server');
  const serverUrl = `http://localhost:${addr.port}`;
  return { server: bound, serverUrl };
}

/**
 * Synchronously close a test server. Idempotent (no-op if already null).
 */
export function stopTestServer(server: http.Server | null): void {
  if (server) {
    server.close();
  }
}

/**
 * Make an HTTP request with a JSON body and return parsed JSON.
 * Returns the raw body string if JSON.parse fails.
 */
export async function makeJsonRequest(
  baseUrl: string,
  method: string,
  path: string,
  body: unknown,
  extraHeaders: Record<string, string> = {},
): Promise<{ statusCode: number; headers: Record<string, string | string[]>; body: unknown }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: { 'Content-Type': 'application/json', ...extraHeaders },
    };
    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk: Buffer) => (raw += chunk.toString()));
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode ?? 0,
            headers: res.headers as Record<string, string | string[]>,
            body: JSON.parse(raw),
          });
        } catch {
          reject(new Error(`Non-JSON response: ${raw.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}