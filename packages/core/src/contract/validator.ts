import fs from 'node:fs';
import path from 'node:path';
import { ContractValidationOptions } from '../types/index.js';
import { listFiles } from '../utils/fs.js';

const isExternal = (ref: string) => /^(https?:\/\/|file:\/\/)/i.test(ref);
const isAbsolute = (ref: string) => /^(\/|[a-z]:[\\/]|~\/|\/Users\/|\/home\/)/i.test(ref);

const extractRefs = (content: string): string[] => {
  const refs = new Set<string>();
  const re = /(src|href)=['"]([^'"]+)['"]/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) refs.add(m[2]);
  return [...refs];
};

export interface ContractValidationResult {
  errors: string[];
  filesChecked: number;
}

export const validateHostingContract = (bundleDir: string, options: ContractValidationOptions = {}): ContractValidationResult => {
  const allowExternal = !!options.allowExternal;
  const allowRuntimeDownloads = !!options.allowRuntimeDownloads;
  const errors: string[] = [];
  const indexPath = path.join(bundleDir, 'index.html');
  const buildJsonPath = path.join(bundleDir, 'build.json');

  if (!fs.existsSync(indexPath)) errors.push('Missing required file: index.html');
  if (!fs.existsSync(buildJsonPath)) errors.push('Missing required file: build.json');
  if (errors.length) return { errors, filesChecked: 0 };

  const knownFiles = new Set(listFiles(bundleDir, 50000).map((f) => path.relative(bundleDir, f).replace(/\\/g, '/')));
  const seen = new Set<string>();
  const toVisit = ['index.html'];

  while (toVisit.length) {
    const rel = toVisit.shift()!;
    if (seen.has(rel) || !knownFiles.has(rel)) continue;
    seen.add(rel);
    const abs = path.join(bundleDir, rel);
    const content = fs.readFileSync(abs, 'utf-8');
    const refs = extractRefs(content);

    for (const refRaw of refs) {
      const ref = refRaw.split('#')[0].split('?')[0].trim();
      if (!ref) continue;

      if (isExternal(refRaw)) {
        if (!allowExternal) errors.push(`${rel} references ${refRaw} (External URL blocked: ${refRaw})`);
        continue;
      }
      if (isAbsolute(refRaw)) {
        errors.push(`${rel} references ${refRaw} (absolute path)`);
        continue;
      }

      const normalized = path.posix.normalize(path.posix.join(path.posix.dirname(rel), ref));
      if (normalized.startsWith('..')) {
        errors.push(`${rel} references ${refRaw} (escapes bundle root)`);
        continue;
      }
      if (!knownFiles.has(normalized)) {
        errors.push(`Missing referenced file: ${normalized}`);
        continue;
      }

      if (/\.(js|css|html)$/i.test(normalized)) toVisit.push(normalized);
    }

    if (!allowRuntimeDownloads && /(fetch\(|XMLHttpRequest|import\()/i.test(content)) {
      errors.push(`${rel} appears to perform runtime downloads (blocked by contract)`);
    }
  }

  return { errors, filesChecked: seen.size };
};
