import fs from 'node:fs';
import type { Publisher } from '@fnf-porter/core';

export const epicroboPublisher: Publisher = {
  name: 'epicrobo',
  async publish(ctx) {
    const endpoint = (ctx.options?.endpoint || '').replace(/\/$/, '');
    if (!endpoint) throw new Error('epicrobo publisher requires endpoint');
    const token = ctx.options?.token;
    const headers: Record<string, string> = token ? { authorization: `Bearer ${token}` } : {};

    const upload = new FormData();
    upload.append('file', new Blob([fs.readFileSync(ctx.buildZipPath)]), `${ctx.buildJson.id}-web.zip`);
    const up = await fetch(`${endpoint}/api/admin/upload`, { method: 'POST', headers, body: upload as any });
    if (!up.ok) throw new Error(`upload failed ${up.status}`);

    const meta = await fetch(`${endpoint}/api/admin/games`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify(ctx.buildJson)
    });
    if (!meta.ok) throw new Error(`metadata failed ${meta.status}`);

    return { ok: true, target: 'epicrobo', message: 'Published to epicrobo', location: endpoint };
  }
};
