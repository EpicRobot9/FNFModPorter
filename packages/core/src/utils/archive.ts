import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import AdmZip from 'adm-zip';
import { ensureDir, listFiles } from './fs.js';

export const zipDirectory = (sourceDir: string, zipPath: string): void => {
  ensureDir(path.dirname(zipPath));
  const zip = new AdmZip();
  for (const file of listFiles(sourceDir, 50000)) {
    const rel = path.relative(sourceDir, file);
    zip.addLocalFile(file, path.dirname(rel), path.basename(rel));
  }
  zip.writeZip(zipPath);
};

export const sha256File = (filePath: string): string => {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
};

export const extractZipTo = (zipPath: string, dest: string): void => {
  ensureDir(dest);
  new AdmZip(zipPath).extractAllTo(dest, true);
};
