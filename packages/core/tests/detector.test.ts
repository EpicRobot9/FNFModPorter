import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { detectEngine } from '../src/detection/detector.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => path.resolve(__dirname, 'fixtures', name);

describe('engine detection', () => {
  it('detects psych', () => expect(detectEngine(fixture('psych')).engine).toBe('Psych'));
  it('detects kade', () => expect(detectEngine(fixture('kade')).engine).toBe('Kade'));
  it('detects vanilla', () => expect(detectEngine(fixture('vanilla')).engine).toBe('Vanilla'));
  it('marks unknown', () => expect(detectEngine(fixture('unknown')).engine).toBe('Unknown'));
});
