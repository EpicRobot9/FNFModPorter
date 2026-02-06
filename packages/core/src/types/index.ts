export type EngineType = 'Psych' | 'Kade' | 'Vanilla' | 'Unknown';

export interface DetectionIndicator {
  engine: EngineType;
  reason: string;
  confidenceDelta: number;
}

export interface DetectionResult {
  engine: EngineType;
  confidence: number;
  indicators: DetectionIndicator[];
  suggestedProfile: string;
}

export type BuildStatus = 'queued' | 'running' | 'success' | 'failed';

export interface ToolchainCheck {
  command: string;
  ok: boolean;
  output: string;
}

export interface CreditEntry { name: string; role?: string; url?: string }
export interface BuildSource { type: 'file' | 'repo' | 'url'; value: string }

export interface BuildJson {
  id: string;
  title: string;
  engine: 'psych' | 'kade' | 'vanilla' | 'unknown';
  version: string;
  porterVersion: string;
  createdAt: string;
  updatedAt: string;
  entrypoint: 'index.html';
  license: string;
  credits: CreditEntry[];
  source: BuildSource;
  recommended: {
    sandbox: string;
    allow: string;
  };
  buildId: string;
  entrypointUrlSuffix: string;
  contract?: {
    selfContained: boolean;
    allowsExternal: boolean;
    allowsRuntimeDownload: boolean;
    validatedAt: string;
  };
}

export interface ContractValidationOptions {
  allowExternal?: boolean;
  allowRuntimeDownloads?: boolean;
}

export interface BuildOverrides {
  id?: string;
  title?: string;
  version?: string;
  license?: string;
  sourceType?: BuildSource['type'];
  sourceValue?: string;
  credits?: CreditEntry[];
}

export interface BuildSettings {
  outputDir: string;
  workspaceDir: string;
  maxConcurrency: number;
  autoInstallMissingToolchain: boolean;
  aggressivePatches: boolean;
  envOverrides: Record<string, string>;
  allowRuntimeDownloads?: boolean;
  allowExternal?: boolean;
}

export interface BuildRecord {
  id: string;
  name: string;
  sourcePath: string;
  outputPath: string;
  zipPath: string;
  logPath: string;
  engine: EngineType;
  status: BuildStatus;
  lastBuildTime: string;
  updatedAt: string;
  buildId: string;
  buildJson: string;
  errorSummary?: string;
}

export interface PortRequest {
  inputs: string[];
  dryRun?: boolean;
  selectedProfile?: EngineType;
  overrides?: BuildOverrides;
  publish?: PublishRequest;
  contract?: ContractValidationOptions;
}

export interface QueueTask {
  id: string;
  inputPath: string;
  displayName: string;
  dryRun: boolean;
  forcedProfile?: EngineType;
  overrides?: BuildOverrides;
  publish?: PublishRequest;
  contract?: ContractValidationOptions;
}

export interface PortResult {
  record: BuildRecord;
  detection: DetectionResult;
  plannedCommands: string[];
}

export interface LogEvent {
  modId: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
}

export interface PublishRequest {
  target: string;
  id?: string;
  note?: string;
  dest?: string;
  endpoint?: string;
  token?: string;
}

export interface PublishResult {
  ok: boolean;
  target: string;
  message: string;
  location?: string;
}

export interface PublisherContext {
  buildZipPath: string;
  buildJson: BuildJson;
  target: string;
  options?: Record<string, string | undefined>;
}

export interface Publisher {
  name: string;
  publish(ctx: PublisherContext): Promise<PublishResult>;
}
