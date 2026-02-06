import fs from 'node:fs';
import path from 'node:path';

export const sanitizeName = (value: string): string =>
  value
    .replace(/\.[^/.]+$/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '') || 'mod';

export const ensureDir = (dir: string): void => {
  fs.mkdirSync(dir, { recursive: true });
};

export const listFiles = (root: string, maxFiles = 5000): string[] => {
  const files: string[] = [];
  const stack = [root];
  while (stack.length && files.length < maxFiles) {
    const current = stack.pop()!;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else files.push(full);
    }
  }
  return files;
};
