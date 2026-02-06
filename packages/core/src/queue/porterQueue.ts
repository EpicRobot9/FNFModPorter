import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import AdmZip from 'adm-zip';
import PQueue from 'p-queue';
import { BuildLogger } from '../logging/logger.js';
import { LibraryStore } from '../storage/libraryStore.js';
import { BuildRecord, BuildSettings, PortResult, QueueTask, Publisher } from '../types/index.js';
import { sanitizeName, ensureDir } from '../utils/fs.js';
import { detectEngine } from '../detection/detector.js';
import { buildCommandsForEngine } from '../build/profiles.js';
import { applyHtml5Patches } from '../build/patcher.js';
import { createBuildJson, writeBuildJson } from '../metadata/buildJson.js';
import { validateHostingContract } from '../contract/validator.js';
import { sha256File, zipDirectory } from '../utils/archive.js';
import { publishBuild } from '../publish/publishers.js';
import corePkg from '../../package.json' with { type: 'json' };

const copyDir = (src: string, dest: string): void => {
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
};

const unpackInput = (inputPath: string, workspaceDir: string): string => {
  const stat = fs.statSync(inputPath);
  const name = sanitizeName(path.basename(inputPath));
  const dest = path.join(workspaceDir, `${name}-${Date.now()}`);
  ensureDir(dest);
  if (stat.isDirectory()) {
    copyDir(inputPath, dest);
    return dest;
  }
  if (inputPath.toLowerCase().endsWith('.zip')) {
    new AdmZip(inputPath).extractAllTo(dest, true);
    return dest;
  }
  throw new Error(`Unsupported input type: ${inputPath}`);
};

const normalizeBundleLayout = (workspace: string, outputPath: string): void => {
  const candidates = ['export/html5/bin', 'bin/html5/bin', 'bin', 'build/html5', ''];
  for (const c of candidates) {
    const dir = path.join(workspace, c);
    if (fs.existsSync(path.join(dir, 'index.html'))) {
      copyDir(dir, outputPath);
      return;
    }
  }
  if (fs.existsSync(path.join(workspace, 'index.html'))) copyDir(workspace, outputPath);
};

export class PorterQueue {
  private queue: PQueue;

  constructor(
    private settings: BuildSettings,
    private store: LibraryStore,
    private logger: BuildLogger,
    private plugins: Publisher[] = []
  ) {
    this.queue = new PQueue({ concurrency: settings.maxConcurrency });
  }

  updateSettings(settings: BuildSettings): void {
    this.settings = settings;
    this.queue.concurrency = settings.maxConcurrency;
  }

  enqueue(task: QueueTask): Promise<PortResult> {
    return this.queue.add(() => this.process(task)) as Promise<PortResult>;
  }

  private runCommand(modId: string, cwd: string, commandLine: string): Promise<void> {
    const [command, ...args] = commandLine.split(' ');
    this.logger.log(modId, 'info', `$ ${commandLine}`);
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, { cwd, env: { ...process.env, ...this.settings.envOverrides } });
      proc.stdout.on('data', (chunk) => this.logger.log(modId, 'info', chunk.toString().trim()));
      proc.stderr.on('data', (chunk) => this.logger.log(modId, 'warn', chunk.toString().trim()));
      proc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${commandLine} exited ${code}`))));
    });
  }

  private async process(task: QueueTask): Promise<PortResult> {
    const modId = task.id || crypto.randomUUID();
    const name = sanitizeName(task.displayName);
    const outputRoot = path.resolve(this.settings.outputDir, name);
    const outputPath = path.join(outputRoot, 'latest');
    const logPath = path.join(outputRoot, 'build.log');
    ensureDir(outputPath);
    this.logger.attach(modId, logPath);

    const sourceWorkspace = unpackInput(task.inputPath, this.settings.workspaceDir);
    const detection = detectEngine(sourceWorkspace);
    const engine = task.forcedProfile ?? detection.engine;
    const timestamp = new Date().toISOString();
    const record: BuildRecord = {
      id: modId,
      name,
      sourcePath: task.inputPath,
      outputPath,
      zipPath: '',
      logPath,
      engine,
      status: 'running',
      lastBuildTime: timestamp,
      updatedAt: timestamp,
      buildId: '',
      buildJson: '',
      errorSummary: ''
    };
    this.store.upsertBuild(record);

    try {
      this.logger.log(modId, 'info', `Detected ${detection.engine} (${(detection.confidence * 100).toFixed(1)}%)`);
      applyHtml5Patches(modId, sourceWorkspace, this.logger, this.settings.aggressivePatches);
      const commands = buildCommandsForEngine(engine, outputPath);
      if (!task.dryRun) {
        for (const cmd of commands) await this.runCommand(modId, sourceWorkspace, cmd);
      } else {
        this.logger.log(modId, 'info', 'Dry-run mode enabled. Build commands were not executed.');
        if (!fs.existsSync(path.join(outputPath, 'index.html'))) {
          fs.writeFileSync(path.join(outputPath, 'index.html'), '<!doctype html><html><body>dry-run</body></html>');
        }
      }

      normalizeBundleLayout(sourceWorkspace, outputPath);
      ensureDir(path.join(outputPath, 'assets'));

      const tempZip = path.join(outputRoot, `${name}-tmp.zip`);
      zipDirectory(outputPath, tempZip);
      const buildId = sha256File(tempZip).slice(0, 16);
      const buildJson = createBuildJson({
        name: task.displayName,
        sourcePath: task.inputPath,
        detection,
        porterVersion: corePkg.version,
        timestamp,
        buildId,
        overrides: task.overrides
      });

      const contractOptions = {
        allowExternal: task.contract?.allowExternal ?? this.settings.allowExternal ?? false,
        allowRuntimeDownloads: task.contract?.allowRuntimeDownloads ?? this.settings.allowRuntimeDownloads ?? false
      };
      writeBuildJson(outputPath, buildJson);
      const validation = validateHostingContract(outputPath, contractOptions);
      buildJson.contract = {
        selfContained: !contractOptions.allowExternal && !contractOptions.allowRuntimeDownloads,
        allowsExternal: !!contractOptions.allowExternal,
        allowsRuntimeDownload: !!contractOptions.allowRuntimeDownloads,
        validatedAt: new Date().toISOString()
      };
      writeBuildJson(outputPath, buildJson);
      if (validation.errors.length) throw new Error(`Hosting contract failed:\n- ${validation.errors.join('\n- ')}`);

      const versionedOut = path.join(outputRoot, buildId);
      ensureDir(versionedOut);
      const zipPath = path.join(versionedOut, `${buildJson.id}-web.zip`);
      const buildJsonPath = path.join(versionedOut, 'build.json');
      zipDirectory(outputPath, zipPath);
      fs.copyFileSync(path.join(outputPath, 'build.json'), buildJsonPath);
      if (fs.existsSync(path.join(outputPath, 'thumb.png'))) fs.copyFileSync(path.join(outputPath, 'thumb.png'), path.join(versionedOut, 'thumb.png'));

      if (task.publish) {
        const safeOpts = { ...task.publish } as any;
        if (safeOpts.token) safeOpts.token = '***';
        this.logger.log(modId, 'info', `Publishing target=${task.publish.target} options=${JSON.stringify(safeOpts)}`);
        await publishBuild({
          buildZipPath: zipPath,
          buildJson,
          target: task.publish.target,
          options: {
            dest: task.publish.dest,
            endpoint: task.publish.endpoint,
            token: task.publish.token,
            note: task.publish.note
          }
        }, this.plugins);
      }

      const successRecord = {
        ...record,
        status: 'success' as const,
        lastBuildTime: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        buildId,
        buildJson: JSON.stringify(buildJson),
        zipPath,
        outputPath: versionedOut
      };
      this.store.upsertBuild(successRecord);
      return { record: successRecord, detection, plannedCommands: commands };
    } catch (error) {
      const failed = {
        ...record,
        status: 'failed' as const,
        errorSummary: error instanceof Error ? error.message : String(error),
        lastBuildTime: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.logger.log(modId, 'error', failed.errorSummary || 'Build failed.');
      this.store.upsertBuild(failed);
      return { record: failed, detection, plannedCommands: buildCommandsForEngine(engine, outputPath) };
    } finally {
      this.logger.close(modId);
    }
  }
}
