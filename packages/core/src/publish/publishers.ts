import fs from 'node:fs';
import path from 'node:path';
import { Publisher, PublisherContext, PublishResult } from '../types/index.js';
import { ensureDir } from '../utils/fs.js';
import { extractZipTo } from '../utils/archive.js';

class LocalPublisher implements Publisher {
  name = 'local';
  async publish(ctx: PublisherContext): Promise<PublishResult> {
    const destRoot = ctx.options?.dest || './site/games';
    const out = path.resolve(destRoot, ctx.buildJson.id);
    ensureDir(out);
    extractZipTo(ctx.buildZipPath, out);
    return { ok: true, target: 'local', message: 'Published locally', location: out };
  }
}

class HttpPublisher implements Publisher {
  name = 'http';
  async publish(ctx: PublisherContext): Promise<PublishResult> {
    const endpoint = ctx.options?.endpoint;
    if (!endpoint) throw new Error('Missing --endpoint for http publisher');
    const token = ctx.options?.token;
    const form = new FormData();
    form.append('file', new Blob([fs.readFileSync(ctx.buildZipPath)]), `${ctx.buildJson.id}-web.zip`);
    form.append('metadata', JSON.stringify(ctx.buildJson));
    const headers: Record<string, string> = {};
    if (token) headers.authorization = `Bearer ${token}`;
    const res = await fetch(endpoint, { method: 'POST', headers, body: form as any });
    if (!res.ok) throw new Error(`HTTP publish failed: ${res.status}`);
    return { ok: true, target: 'http', message: 'Uploaded', location: endpoint };
  }
}

const builtin: Record<string, Publisher> = {
  local: new LocalPublisher(),
  http: new HttpPublisher()
};

export const publishBuild = async (ctx: PublisherContext, extraPublishers: Publisher[] = []): Promise<PublishResult> => {
  const registry = new Map<string, Publisher>(Object.entries(builtin));
  for (const p of extraPublishers) registry.set(p.name, p);
  const target = registry.get(ctx.target);
  if (!target) throw new Error(`Unknown publisher target: ${ctx.target}`);
  return target.publish(ctx);
};
