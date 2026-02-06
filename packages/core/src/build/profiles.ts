import { EngineType } from '../types/index.js';

export const buildCommandsForEngine = (engine: EngineType, outputPath: string): string[] => {
  const target = `-Doutput=${outputPath}`;
  switch (engine) {
    case 'Psych':
      return [`lime test html5 ${target}`];
    case 'Kade':
      return [`lime test html5 ${target} -DKADE_HTML5`];
    case 'Vanilla':
      return [`lime test html5 ${target} -DLEGACY_FNF`];
    default:
      return [`echo Unknown engine profile. Use manual profile selection.`];
  }
};
