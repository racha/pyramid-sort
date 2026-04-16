import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { describe, it, expect } from 'vitest';

import { DEFAULT_PRINT_WIDTH, resolvePrintWidth } from '../src/core/printWidth';

describe('resolvePrintWidth', () => {
  it('uses override when > 0', () => {
    expect(
      resolvePrintWidth({
        override: 100,
        searchFromDir: os.tmpdir(),
      })
    ).toBe(100);
  });

  it('reads .prettierrc.json when override is 0', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-pw-'));
    fs.writeFileSync(
      path.join(dir, '.prettierrc.json'),
      JSON.stringify({ printWidth: 72, semi: true }),
      'utf-8'
    );
    const nested = path.join(dir, 'src', 'app');
    fs.mkdirSync(nested, { recursive: true });

    expect(
      resolvePrintWidth({
        override: 0,
        searchFromDir: nested,
        workspaceRoot: dir,
      })
    ).toBe(72);
  });

  it('falls back to DEFAULT_PRINT_WIDTH when nothing matches', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-pw-empty-'));
    expect(
      resolvePrintWidth({
        override: 0,
        searchFromDir: dir,
        workspaceRoot: dir,
      })
    ).toBe(DEFAULT_PRINT_WIDTH);
  });

  it('uses vscodePrettierPrintWidth after disk walk finds nothing', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-pw-vsc-'));
    expect(
      resolvePrintWidth({
        override: 0,
        searchFromDir: dir,
        workspaceRoot: dir,
        vscodePrettierPrintWidth: 99,
      })
    ).toBe(99);
  });

  it('uses editorRuler when disk and vscode prettier unset', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-pw-ruler-'));
    expect(
      resolvePrintWidth({
        override: 0,
        searchFromDir: dir,
        workspaceRoot: dir,
        editorRuler: 88,
      })
    ).toBe(88);
  });
});
