import fs from 'node:fs';
import path from 'node:path';
import { DetectionIndicator, DetectionResult, EngineType } from '../types/index.js';
import { listFiles } from '../utils/fs.js';

const add = (indicators: DetectionIndicator[], engine: EngineType, reason: string, confidenceDelta: number) => {
  indicators.push({ engine, reason, confidenceDelta });
};

export const detectEngine = (inputPath: string): DetectionResult => {
  const indicators: DetectionIndicator[] = [];
  const files = listFiles(inputPath, 3000).map((f) => path.relative(inputPath, f).replace(/\\/g, '/').toLowerCase());

  const hasFile = (needle: string) => files.some((f) => f.includes(needle));
  const readIfExists = (relative: string) => {
    const full = path.join(inputPath, relative);
    return fs.existsSync(full) ? fs.readFileSync(full, 'utf-8').toLowerCase() : '';
  };

  if (hasFile('mods/') || hasFile('source/psych')) add(indicators, 'Psych', 'Psych-specific folder structure', 0.35);
  if (files.some((f) => /psychengine|psych/.test(f))) add(indicators, 'Psych', 'Psych keyword in file names', 0.2);
  if (readIfExists('source/playstate.hx').includes('hxcodec')) add(indicators, 'Psych', 'hxCodec detected in PlayState', 0.2);

  if (hasFile('kade') || readIfExists('project.xml').includes('kadeengine')) add(indicators, 'Kade', 'Kade signature found', 0.5);
  if (readIfExists('source/playstate.hx').includes('kade engine')) add(indicators, 'Kade', 'Kade engine marker in source', 0.3);

  if (hasFile('assets/preload') && !hasFile('mods/')) add(indicators, 'Vanilla', 'Vanilla preload assets pattern', 0.45);
  if (readIfExists('project.xml').includes('friday night funkin')) add(indicators, 'Vanilla', 'Original FNF project marker', 0.25);

  const scoreMap: Record<EngineType, number> = { Psych: 0, Kade: 0, Vanilla: 0, Unknown: 0 };
  for (const i of indicators) scoreMap[i.engine] += i.confidenceDelta;

  const [engine, score] = (Object.entries(scoreMap) as Array<[EngineType, number]>).sort((a, b) => b[1] - a[1])[0];
  if (score < 0.35) {
    return { engine: 'Unknown', confidence: score, indicators, suggestedProfile: 'manual-select' };
  }
  return {
    engine,
    confidence: Math.min(0.99, score),
    indicators,
    suggestedProfile: `${engine.toLowerCase()}-html5`
  };
};
