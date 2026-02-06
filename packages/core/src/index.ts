import crypto from 'node:crypto';
import path from 'node:path';
import { BuildLogger } from './logging/logger.js';
import { LibraryStore } from './storage/libraryStore.js';
import { checkToolchain } from './build/toolchain.js';
import { PorterQueue } from './queue/porterQueue.js';
import { detectEngine } from './detection/detector.js';
import { BuildSettings, PortRequest, PortResult, Publisher } from './types/index.js';
import { publishBuild } from './publish/publishers.js';
import { createPorterServer } from './server/service.js';

export * from './types/index.js';
export * from './contract/validator.js';
export * from './metadata/buildJson.js';

export class FnfPorter {
  private logger = new BuildLogger();
  private store: LibraryStore;
  private queue: PorterQueue;
  private publishers: Publisher[] = [];

  constructor(dbPath?: string) {
    this.store = new LibraryStore(dbPath);
    this.queue = new PorterQueue(this.store.getSettings(), this.store, this.logger, this.publishers);
  }

  registerPublisher(publisher: Publisher): void {
    this.publishers.push(publisher);
  }

  onLog(listener: (event: any) => void): void {
    this.logger.on('log', listener);
  }

  getSettings(): BuildSettings {
    return this.store.getSettings();
  }

  setSettings(settings: BuildSettings): void {
    this.store.setSettings(settings);
    this.queue.updateSettings(settings);
  }

  toolchain() {
    return checkToolchain();
  }

  detect(inputPath: string) {
    return detectEngine(path.resolve(inputPath));
  }

  list() {
    return this.store.listBuilds();
  }

  getBuild(id: string) {
    return this.store.getBuild(id);
  }

  deleteBuild(id: string) {
    this.store.deleteBuild(id);
  }

  async publishById(id: string, target: string, options?: Record<string, string | undefined>) {
    const build = this.store.getBuild(id);
    if (!build) throw new Error('Build not found');
    const buildJson = JSON.parse(build.buildJson || '{}');
    return publishBuild({ buildZipPath: build.zipPath, buildJson, target, options }, this.publishers);
  }

  serve(host = '0.0.0.0', port = 8787) {
    return createPorterServer(this, { host, port });
  }

  async port(request: PortRequest): Promise<PortResult[]> {
    const tasks = request.inputs.map((inputPath) => ({
      id: crypto.randomUUID(),
      inputPath: path.resolve(inputPath),
      displayName: path.basename(inputPath),
      dryRun: !!request.dryRun,
      forcedProfile: request.selectedProfile,
      overrides: request.overrides,
      publish: request.publish,
      contract: request.contract
    }));
    return Promise.all(tasks.map((task) => this.queue.enqueue(task)));
  }
}
