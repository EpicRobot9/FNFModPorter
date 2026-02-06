import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { describe, expect, it } from 'vitest';
import { publishBuild } from '../src/publish/publishers.js';

describe('publisher interface', () => {
  it('publishes to mock http endpoint', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fnf-pub-'));
    const zip = path.join(tmp, 'a.zip');
    fs.writeFileSync(zip, 'x');
    const calls: string[] = [];
    const server = http.createServer((req, res) => { calls.push(req.url || ''); res.statusCode = 200; res.end('ok'); });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const addr = server.address();
    const endpoint = `http://127.0.0.1:${typeof addr === 'string' ? 0 : addr?.port}`;
    const r = await publishBuild({
      buildZipPath: zip,
      buildJson: {
        id: 'fnf-a', title: 'A', engine: 'psych', version: '0.0.0', porterVersion: '0.1.0', createdAt: '', updatedAt: '',
        entrypoint: 'index.html', license: 'unknown', credits: [], source: { type: 'file', value: '.' },
        recommended: { sandbox: '', allow: '' }, buildId: 'b', entrypointUrlSuffix: '?v=b'
      },
      target: 'http',
      options: { endpoint }
    });
    server.close();
    expect(r.ok).toBe(true);
    expect(calls.length).toBe(1);
  });
});
