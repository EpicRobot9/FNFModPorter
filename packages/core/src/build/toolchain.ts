import { spawnSync } from 'node:child_process';
import { ToolchainCheck } from '../types/index.js';

const check = (command: string, args: string[]): ToolchainCheck => {
  const result = spawnSync(command, args, { encoding: 'utf-8' });
  const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
  return { command: `${command} ${args.join(' ')}`.trim(), ok: result.status === 0, output };
};

export const checkToolchain = (): ToolchainCheck[] => [
  check('haxe', ['--version']),
  check('lime', ['--version']),
  check('openfl', ['--version']),
  check('haxelib', ['list'])
];
