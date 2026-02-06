import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { describe, expect, it } from 'vitest';
import { validateHostingContract } from '../src/contract/validator.js';

const mk = () => fs.mkdtempSync(path.join(os.tmpdir(), 'fnf-contract-'));

const writeValidBase = (dir: string) => {
  fs.mkdirSync(path.join(dir, 'data'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'songs'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'js'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'data', 'sprite.png'), 'x');
  fs.writeFileSync(path.join(dir, 'songs', 'week1.ogg'), 'x');
  fs.writeFileSync(path.join(dir, 'js', 'app.js'), "console.log('ok')");
  fs.writeFileSync(path.join(dir, 'index.html'), '<link href="./data/sprite.png"/><script src="./js/app.js"></script>');
  fs.writeFileSync(path.join(dir, 'build.json'), '{}');
};

describe('hosting contract validator', () => {
  it('passes valid bundle with non-assets layout', () => {
    const dir = mk();
    writeValidBase(dir);
    expect(validateHostingContract(dir).errors).toEqual([]);
  });

  it('fails on missing referenced file', () => {
    const dir = mk();
    writeValidBase(dir);
    fs.writeFileSync(path.join(dir, 'index.html'), '<script src="./js/missing.js"></script>');
    expect(validateHostingContract(dir).errors.join(' ')).toContain('Missing referenced file: js/missing.js');
  });

  it('fails on absolute windows path', () => {
    const dir = mk();
    writeValidBase(dir);
    fs.writeFileSync(path.join(dir, 'index.html'), '<script src="C:\\mods\\x.js"></script>');
    expect(validateHostingContract(dir).errors.join(' ')).toContain('(absolute path)');
  });

  it('fails on leading slash path', () => {
    const dir = mk();
    writeValidBase(dir);
    fs.writeFileSync(path.join(dir, 'index.html'), '<script src="/js/app.js"></script>');
    expect(validateHostingContract(dir).errors.join(' ')).toContain('(absolute path)');
  });

  it('blocks external url by default', () => {
    const dir = mk();
    writeValidBase(dir);
    fs.writeFileSync(path.join(dir, 'index.html'), '<script src="https://cdn.example.com/a.js"></script>');
    expect(validateHostingContract(dir).errors.join(' ')).toContain('External URL blocked');
  });

  it('allows external with override', () => {
    const dir = mk();
    writeValidBase(dir);
    fs.writeFileSync(path.join(dir, 'index.html'), '<script src="https://cdn.example.com/a.js"></script>');
    expect(validateHostingContract(dir, { allowExternal: true }).errors).toEqual([]);
  });
});
