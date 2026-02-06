import { describe, expect, it } from 'vitest';
import { createBuildJson } from '../src/metadata/buildJson.js';

describe('build.json generation', () => {
  it('creates required metadata', () => {
    const j = createBuildJson({
      name: 'My Mod',
      sourcePath: '/tmp/mod',
      detection: { engine: 'Psych', confidence: 0.9, indicators: [], suggestedProfile: 'psych-html5' },
      porterVersion: '1.2.3',
      timestamp: '2026-01-01T00:00:00.000Z',
      buildId: 'abc123'
    });
    expect(j.id).toBe('fnf-my-mod');
    expect(j.engine).toBe('psych');
    expect(j.entrypoint).toBe('index.html');
    expect(j.entrypointUrlSuffix).toBe('?v=abc123');
    expect(j.contract?.selfContained).toBe(true);
    expect(j.contract?.validatedAt).toBe('2026-01-01T00:00:00.000Z');
  });
});
