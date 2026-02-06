#!/usr/bin/env node
import { spawn } from 'node:child_process';
import process from 'node:process';

if (process.env.CODESPACES || process.env.CI || process.platform === 'linux' && !process.env.DISPLAY) {
  console.log('Headless environment detected. UI launch skipped.');
  process.exit(0);
}

const child = spawn('npx', ['electron', 'packages/ui/dist-electron/main.js'], { stdio: 'inherit', shell: true });
child.on('exit', (code) => process.exit(code ?? 0));
