import express from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { FnfPorter } from '../index.js';

export const createPorterServer = (porter: FnfPorter, opts: { host: string; port: number }) => {
  const app = express();
  const upload = multer({ dest: path.resolve('./workspace/uploads'), limits: { fileSize: 1024 * 1024 * 1024 } });
  const jobs = new Map<string, any>();

  app.use((req, res, next) => {
    const token = process.env.PORTER_TOKEN;
    if (!token) return next();
    if (req.headers.authorization === `Bearer ${token}`) return next();
    return res.status(401).json({ error: 'Unauthorized' });
  });

  app.post('/port', upload.single('input'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'missing multipart file field input' });
    const jobId = crypto.randomUUID();
    jobs.set(jobId, { status: 'queued', logs: [] });
    porter.onLog((e) => { const job = jobs.get(jobId); if (job) job.logs.push(`[${e.level}] ${e.message}`); });
    const body: any = req.body || {};
    porter.port({
      inputs: [req.file.path],
      dryRun: body.dryRun === 'true',
      overrides: body.id ? { id: body.id, title: body.title, version: body.version, license: body.license } : undefined,
      contract: { allowExternal: body.allowExternal === 'true', allowRuntimeDownloads: body.allowRuntimeDownloads === 'true' }
    }).then((results) => jobs.set(jobId, { status: results[0].record.status, result: results[0], logs: jobs.get(jobId)?.logs || [] }))
      .catch((err) => jobs.set(jobId, { status: 'failed', error: String(err), logs: jobs.get(jobId)?.logs || [] }));
    return res.json({ jobId });
  });

  app.get('/job/:id', (req, res) => {
    const job = jobs.get(req.params.id);
    if (!job) return res.status(404).json({ error: 'not found' });
    return res.json({ status: job.status, logs: (job.logs || []).slice(-100), error: job.error });
  });

  app.get('/job/:id/result', (req, res) => {
    const job = jobs.get(req.params.id);
    if (!job?.result?.record?.zipPath) return res.status(404).json({ error: 'result unavailable' });
    res.download(job.result.record.zipPath);
  });

  return app.listen(opts.port, opts.host, () => {
    // eslint-disable-next-line no-console
    console.log(`fnf-porter serve listening on http://${opts.host}:${opts.port}`);
  });
};
