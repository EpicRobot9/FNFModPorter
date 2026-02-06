import fs from 'node:fs';
import path from 'node:path';
import { BuildLogger } from '../logging/logger.js';
import { listFiles } from '../utils/fs.js';

export const applyHtml5Patches = (modId: string, workspacePath: string, logger: BuildLogger, aggressive = false): void => {
  const files = listFiles(workspacePath, 5000).filter((f) => f.endsWith('.hx'));
  let patchedCount = 0;

  for (const file of files) {
    let content = fs.readFileSync(file, 'utf-8');
    const original = content;

    if (content.includes('hxcodec') || content.includes('HxCodec') || content.includes('VideoSprite')) {
      content = content.replace(/(new\s+VideoSprite\([^\n]+\))/g, 'null /* HTML5 hxCodec fallback */');
      content = content.replace(/hxcodec/gi, '/* hxCodec-disabled-html5 */');
      logger.log(modId, 'warn', `Patched hxCodec usage in ${path.relative(workspacePath, file)}`);
    }

    if (/shader|runtimeShader/i.test(content)) {
      logger.log(modId, 'warn', `Potential unsupported shader in ${path.relative(workspacePath, file)} (left as warning).`);
      if (aggressive) {
        content = content.replace(/new\s+RuntimeShader\([^\)]*\)/g, 'null /* aggressive html5 shader disable */');
      }
    }

    content = content.replace(/"[A-Z]:\\[^\"]+"/g, '"assets/"');

    if (content !== original) {
      patchedCount += 1;
      fs.writeFileSync(file, content, 'utf-8');
    }
  }

  logger.log(modId, 'info', `Patch report: modified ${patchedCount} files, aggressive=${aggressive}`);
};
