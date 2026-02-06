import Database from 'better-sqlite3';
import { BuildRecord, BuildSettings } from '../types/index.js';
import { ensureDir } from '../utils/fs.js';
import path from 'node:path';

const DEFAULT_SETTINGS: BuildSettings = {
  outputDir: './outputs',
  workspaceDir: './workspace',
  maxConcurrency: 2,
  autoInstallMissingToolchain: false,
  aggressivePatches: false,
  envOverrides: {},
  allowRuntimeDownloads: false,
  allowExternal: false
};

export class LibraryStore {
  private db: Database.Database;

  constructor(dbPath = './fnf-porter.db') {
    ensureDir(path.dirname(path.resolve(dbPath)));
    this.db = new Database(dbPath);
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS builds (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sourcePath TEXT NOT NULL,
        outputPath TEXT NOT NULL,
        zipPath TEXT NOT NULL DEFAULT '',
        logPath TEXT NOT NULL,
        engine TEXT NOT NULL,
        status TEXT NOT NULL,
        lastBuildTime TEXT NOT NULL,
        updatedAt TEXT NOT NULL DEFAULT '',
        buildId TEXT NOT NULL DEFAULT '',
        buildJson TEXT NOT NULL DEFAULT '',
        errorSummary TEXT
      );
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    const cols = this.db.prepare("PRAGMA table_info(builds)").all() as Array<{ name: string }>;
    const names = new Set(cols.map((c) => c.name));
    const add = (n: string, sql: string) => { if (!names.has(n)) this.db.exec(`ALTER TABLE builds ADD COLUMN ${sql}`); };
    add('zipPath', "zipPath TEXT NOT NULL DEFAULT ''");
    add('updatedAt', "updatedAt TEXT NOT NULL DEFAULT ''");
    add('buildId', "buildId TEXT NOT NULL DEFAULT ''");
    add('buildJson', "buildJson TEXT NOT NULL DEFAULT ''");
  }

  upsertBuild(record: BuildRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO builds(id, name, sourcePath, outputPath, zipPath, logPath, engine, status, lastBuildTime, updatedAt, buildId, buildJson, errorSummary)
      VALUES(@id,@name,@sourcePath,@outputPath,@zipPath,@logPath,@engine,@status,@lastBuildTime,@updatedAt,@buildId,@buildJson,@errorSummary)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name,
        sourcePath=excluded.sourcePath,
        outputPath=excluded.outputPath,
        zipPath=excluded.zipPath,
        logPath=excluded.logPath,
        engine=excluded.engine,
        status=excluded.status,
        lastBuildTime=excluded.lastBuildTime,
        updatedAt=excluded.updatedAt,
        buildId=excluded.buildId,
        buildJson=excluded.buildJson,
        errorSummary=excluded.errorSummary
    `);
    stmt.run(record);
  }

  listBuilds(): BuildRecord[] {
    return this.db.prepare('SELECT * FROM builds ORDER BY lastBuildTime DESC').all() as BuildRecord[];
  }

  deleteBuild(id: string): void {
    this.db.prepare('DELETE FROM builds WHERE id = ?').run(id);
  }

  getBuild(id: string): BuildRecord | undefined {
    return this.db.prepare('SELECT * FROM builds WHERE id = ?').get(id) as BuildRecord | undefined;
  }

  getSettings(): BuildSettings {
    const rows = this.db.prepare('SELECT key, value FROM settings').all() as Array<{ key: keyof BuildSettings; value: string }>;
    if (!rows.length) return DEFAULT_SETTINGS;
    const merged: any = { ...DEFAULT_SETTINGS };
    for (const row of rows) merged[row.key] = JSON.parse(row.value);
    return merged;
  }

  setSettings(settings: BuildSettings): void {
    const stmt = this.db.prepare('INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
    const transaction = this.db.transaction(() => {
      for (const [key, value] of Object.entries(settings)) stmt.run(key, JSON.stringify(value));
    });
    transaction();
  }
}
