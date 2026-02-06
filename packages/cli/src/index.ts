#!/usr/bin/env node
import { Command } from 'commander';
import { FnfPorter, CreditEntry } from '@fnf-porter/core';
import { epicroboPublisher } from '@fnf-porter/publisher-epicrobo';

const porter = new FnfPorter();
porter.registerPublisher(epicroboPublisher);
const program = new Command();

const parseCredits = (credits?: string): CreditEntry[] => {
  if (!credits) return [];
  return credits.split(';').filter(Boolean).map((chunk) => {
    const [name, role, url] = chunk.split('|');
    return { name: name || 'Unknown', role, url };
  });
};

program.name('fnf-porter').description('FNF HTML5 Auto-Porter CLI');

program.command('detect').argument('<input>').action((input) => console.log(JSON.stringify(porter.detect(input), null, 2)));

program
  .command('port')
  .argument('<inputs...>')
  .option('--dry-run', 'Do not execute build commands')
  .option('--id <id>')
  .option('--title <title>')
  .option('--version <version>')
  .option('--license <license>')
  .option('--source-type <sourceType>')
  .option('--source-value <sourceValue>')
  .option('--credits <credits>', 'name|role|url;name|role|url')
  .option('--publish', 'Publish after build')
  .option('--target <target>')
  .option('--dest <dest>')
  .option('--endpoint <endpoint>')
  .option('--token <token>')
  .option('--note <note>')
  .option('--allow-external', 'Allow external URLs in bundle references')
  .option('--allow-runtime-downloads', 'Allow runtime fetch/download behavior')
  .action(async (inputs, options) => {
    porter.onLog((e) => console.log(`[${e.level}] ${e.message}`));
    const res = await porter.port({
      inputs,
      dryRun: !!options.dryRun,
      overrides: {
        id: options.id,
        title: options.title,
        version: options.version,
        license: options.license,
        sourceType: options.sourceType,
        sourceValue: options.sourceValue,
        credits: parseCredits(options.credits)
      },
      contract: { allowExternal: !!options.allowExternal, allowRuntimeDownloads: !!options.allowRuntimeDownloads },
      publish: options.publish
        ? { target: options.target || 'local', dest: options.dest, endpoint: options.endpoint, token: options.token, note: options.note }
        : undefined
    });
    console.log(JSON.stringify(res, null, 2));
  });

program.command('list').action(() => console.table(porter.list().map((b) => ({ ...b, token: undefined }))));

program.command('open').argument('<modId>').action((modId) => {
  const mod = porter.list().find((m) => m.id === modId);
  if (!mod) throw new Error('mod not found');
  console.log(mod.outputPath);
});

program
  .command('publish')
  .requiredOption('--target <target>')
  .requiredOption('--id <id>')
  .option('--dest <dest>')
  .option('--endpoint <endpoint>')
  .option('--token <token>')
  .option('--note <note>')
  .option('--allow-external', 'Allow external URLs in bundle references')
  .option('--allow-runtime-downloads', 'Allow runtime fetch/download behavior')
  .action(async (options) => {
    const result = await porter.publishById(options.id, options.target, {
      dest: options.dest,
      endpoint: options.endpoint,
      token: options.token,
      note: options.note
    });
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command('serve')
  .option('--port <port>', 'port', '8787')
  .option('--host <host>', 'host', '0.0.0.0')
  .action((options) => { porter.serve(options.host, Number(options.port)); });

program.parse();
