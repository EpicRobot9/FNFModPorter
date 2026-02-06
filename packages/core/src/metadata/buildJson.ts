import fs from 'node:fs';
import path from 'node:path';
import { BuildJson, BuildOverrides, DetectionResult } from '../types/index.js';
import { sanitizeName } from '../utils/fs.js';

const toEngine = (e: string): BuildJson['engine'] => (e === 'Psych' ? 'psych' : e === 'Kade' ? 'kade' : e === 'Vanilla' ? 'vanilla' : 'unknown');

export const createBuildJson = (args: {
  name: string;
  sourcePath: string;
  detection: DetectionResult;
  porterVersion: string;
  timestamp: string;
  buildId: string;
  overrides?: BuildOverrides;
}): BuildJson => {
  const pkgVersion = args.overrides?.version || '0.0.0';
  const defaultTitle = args.name;
  const id = sanitizeName(args.overrides?.id || args.name);
  const title = args.overrides?.title || defaultTitle;
  const sourceType = args.overrides?.sourceType || 'file';
  const sourceValue = args.overrides?.sourceValue || args.sourcePath;

  return {
    id: id.startsWith('fnf-') ? id : `fnf-${id}`,
    title,
    engine: toEngine(args.detection.engine),
    version: pkgVersion,
    porterVersion: args.porterVersion,
    createdAt: args.timestamp,
    updatedAt: args.timestamp,
    entrypoint: 'index.html',
    license: args.overrides?.license || 'unknown',
    credits: args.overrides?.credits || [],
    source: { type: sourceType, value: sourceValue },
    recommended: {
      sandbox: 'allow-scripts allow-same-origin allow-pointer-lock',
      allow: 'fullscreen; gamepad'
    },
    buildId: args.buildId,
    entrypointUrlSuffix: `?v=${args.buildId}`,
    contract: {
      selfContained: true,
      allowsExternal: false,
      allowsRuntimeDownload: false,
      validatedAt: args.timestamp
    }
  };
};

export const writeBuildJson = (outDir: string, metadata: BuildJson): string => {
  const file = path.join(outDir, 'build.json');
  fs.writeFileSync(file, JSON.stringify(metadata, null, 2));
  return file;
};
