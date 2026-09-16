import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  RC_FILENAME,
  findNearestRcPath,
  loadNearestRcRaw,
  mergeAliasPatterns,
  mergePyramidSortConfig,
  resolvePyramidSortConfig,
} from '../src/core/configLoader';
import { DEFAULT_CONFIG } from '../src/core/types';

const tempDirs: string[] = [];

function makeDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function writeRc(dir: string, body: unknown) {
  fs.writeFileSync(path.join(dir, RC_FILENAME), JSON.stringify(body), 'utf-8');
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('findNearestRcPath / loadNearestRcRaw', () => {
  it('uses the nearest rc file', () => {
    const root = makeDir('ps-rc-near-');
    const child = path.join(root, 'apps', 'web');
    fs.mkdirSync(child, { recursive: true });
    writeRc(root, { sortTypesOnSave: true });
    writeRc(child, { sortCssOnSave: true });

    expect(findNearestRcPath(child)).toBe(path.join(child, RC_FILENAME));
    expect(loadNearestRcRaw(child)).toEqual({ sortCssOnSave: true });
  });

  it('walks to a parent rc when the child has none', () => {
    const root = makeDir('ps-rc-parent-');
    const child = path.join(root, 'src');
    fs.mkdirSync(child, { recursive: true });
    writeRc(root, { showDiagnostics: false });

    expect(findNearestRcPath(child)).toBe(path.join(root, RC_FILENAME));
    expect(loadNearestRcRaw(child)).toEqual({ showDiagnostics: false });
  });

  it('skips an invalid child rc and uses the parent', () => {
    const root = makeDir('ps-rc-invalid-');
    const child = path.join(root, 'pkg');
    fs.mkdirSync(child, { recursive: true });
    writeRc(root, { sortObjectsOnSave: true });
    fs.writeFileSync(path.join(child, RC_FILENAME), '{ not json', 'utf-8');

    expect(findNearestRcPath(child)).toBe(path.join(root, RC_FILENAME));
    expect(resolvePyramidSortConfig(child).sortObjectsOnSave).toBe(true);
  });

  it('returns null when no rc exists', () => {
    const dir = makeDir('ps-rc-none-');
    expect(findNearestRcPath(dir)).toBeNull();
    expect(loadNearestRcRaw(dir)).toBeNull();
  });
});

describe('mergePyramidSortConfig', () => {
  it('returns defaults with no layers', () => {
    expect(mergePyramidSortConfig()).toEqual(DEFAULT_CONFIG);
  });

  it('keeps other attribute keys when overlaying one attribute field', () => {
    const merged = mergePyramidSortConfig({
      attributes: { skipGroupsWithSpread: true },
    });
    expect(merged.attributes.skipGroupsWithSpread).toBe(true);
    expect(merged.attributes.direction).toBe(DEFAULT_CONFIG.attributes.direction);
    expect(merged.attributes.groupByEmptyRows).toBe(DEFAULT_CONFIG.attributes.groupByEmptyRows);
  });

  it('lets later layers win, including vscode under rc', () => {
    const vscodeLayer = {
      attributes: { skipGroupsWithSpread: false, direction: 'descending' as const },
      sortTypesOnSave: true,
    };
    const rc = { attributes: { skipGroupsWithSpread: true } };
    const merged = mergePyramidSortConfig(DEFAULT_CONFIG, vscodeLayer, rc);
    expect(merged.attributes.skipGroupsWithSpread).toBe(true);
    expect(merged.attributes.direction).toBe('descending');
    expect(merged.sortTypesOnSave).toBe(true);
  });

  it('replaces extensions when present', () => {
    const merged = mergePyramidSortConfig({ extensions: ['.vue'] });
    expect(merged.extensions).toEqual(['.vue']);
  });
});

describe('resolvePyramidSortConfig', () => {
  it('returns defaults when no file exists', () => {
    const dir = makeDir('ps-rc-defaults-');
    expect(resolvePyramidSortConfig(dir)).toEqual(DEFAULT_CONFIG);
  });

  it('overlays the nearest rc on the vscode layer', () => {
    const root = makeDir('ps-rc-resolve-');
    writeRc(root, { attributes: { skipGroupsWithSpread: true } });
    const resolved = resolvePyramidSortConfig(root, {
      attributes: { skipGroupsWithSpread: false, direction: 'descending' },
    });
    expect(resolved.attributes.skipGroupsWithSpread).toBe(true);
    expect(resolved.attributes.direction).toBe('descending');
  });

  it('applies a full rc file over defaults', () => {
    const root = makeDir('ps-rc-full-');
    writeRc(root, {
      imports: {
        direction: 'descending',
        consolidateMultilineImports: false,
        maxLineWidth: 120,
        localAliasPatterns: ['@app/'],
        groupByEmptyRows: false,
        groupExternalLocal: false,
      },
      attributes: {
        direction: 'auto',
        groupByEmptyRows: false,
        skipGroupsWithSpread: true,
      },
      types: { direction: 'descending', groupByEmptyRows: false },
      objects: {
        direction: 'auto',
        groupByEmptyRows: false,
        sortNestedObjects: true,
      },
      css: { direction: 'descending', groupByEmptyRows: false },
      forceSort: { direction: 'descending', groupByEmptyRows: false },
      extensions: ['.vue', '.tsx'],
      showDiagnostics: false,
      diagnostics: {
        imports: false,
        attributes: false,
        types: true,
        objects: true,
        css: true,
      },
      sortImportsOnSave: false,
      sortAttributesOnSave: false,
      sortTypesOnSave: true,
      sortObjectsOnSave: true,
      sortCssOnSave: true,
    });

    expect(resolvePyramidSortConfig(root)).toEqual({
      imports: {
        direction: 'descending',
        consolidateMultilineImports: false,
        maxLineWidth: 120,
        localAliasPatterns: ['@app/'],
        groupByEmptyRows: false,
        groupExternalLocal: false,
      },
      attributes: {
        direction: 'auto',
        groupByEmptyRows: false,
        skipGroupsWithSpread: true,
      },
      types: { direction: 'descending', groupByEmptyRows: false },
      objects: {
        direction: 'auto',
        groupByEmptyRows: false,
        sortNestedObjects: true,
      },
      css: { direction: 'descending', groupByEmptyRows: false },
      forceSort: { direction: 'descending', groupByEmptyRows: false },
      extensions: ['.vue', '.tsx'],
      showDiagnostics: false,
      diagnostics: {
        imports: false,
        attributes: false,
        types: true,
        objects: true,
        css: true,
      },
      sortImportsOnSave: false,
      sortAttributesOnSave: false,
      sortTypesOnSave: true,
      sortObjectsOnSave: true,
      sortCssOnSave: true,
    });
  });
});

describe('mergeAliasPatterns', () => {
  it('dedupes detected aliases and rc aliases', () => {
    expect(mergeAliasPatterns(['@/', '~/'], ['@/', '@app/'])).toEqual(['@/', '~/', '@app/']);
  });
});
