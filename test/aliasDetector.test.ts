import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect } from 'vitest';
import {
  collectAliasPatternsFromFileUpward,
  isLocalImport,
} from '../src/core/aliasDetector';

describe('isLocalImport', () => {
  const patterns = ['@/', '~/'];

  it('classifies relative imports as local', () => {
    expect(isLocalImport('./foo', patterns)).toBe(true);
    expect(isLocalImport('../bar', patterns)).toBe(true);
    expect(isLocalImport('./components/Button', patterns)).toBe(true);
  });

  it('classifies alias imports as local', () => {
    expect(isLocalImport('@/utils/helper', patterns)).toBe(true);
    expect(isLocalImport('~/lib/auth', patterns)).toBe(true);
  });

  it('classifies bare specifiers as external', () => {
    expect(isLocalImport('react', patterns)).toBe(false);
    expect(isLocalImport('lodash', patterns)).toBe(false);
    expect(isLocalImport('zod', patterns)).toBe(false);
  });

  it('classifies scoped npm packages as external', () => {
    expect(isLocalImport('@tanstack/react-query', patterns)).toBe(false);
    expect(isLocalImport('@hookform/resolvers/zod', patterns)).toBe(false);
    expect(isLocalImport('@types/node', patterns)).toBe(false);
  });

  it('distinguishes @/ alias from @scope/ package', () => {
    expect(isLocalImport('@/components/Button', patterns)).toBe(true);
    expect(isLocalImport('@radix-ui/react-dialog', patterns)).toBe(false);
  });
});

describe('collectAliasPatternsFromFileUpward', () => {
  it('picks up paths from a nested tsconfig between file and workspace root', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pyramid-sort-alias-'));
    try {
      const apiRoot = path.join(root, 'apps', 'api');
      const srcDir = path.join(apiRoot, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(apiRoot, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            paths: { '@api/*': ['./src/*'] },
          },
        })
      );
      const file = path.join(srcDir, 'app.ts');
      const patterns = collectAliasPatternsFromFileUpward(file, root);
      expect(patterns.some((p) => p === '@api/' || p.startsWith('@api'))).toBe(true);
      expect(isLocalImport('@api/env', patterns)).toBe(true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
