import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  IGNORE_FILENAME,
  findNearestIgnorePath,
  isPyramidSortIgnored,
  listWorkspaceFiles,
} from '../src/core/fileWalker';

const tempDirs: string[] = [];

function makeDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function write(dir: string, rel: string, body = 'export const x = 1;\n') {
  const full = path.join(dir, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, body, 'utf-8');
  return full;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('findNearestIgnorePath', () => {
  it('uses the nearest ignore file', () => {
    const root = makeDir('ps-ig-near-');
    const child = path.join(root, 'apps', 'web');
    fs.mkdirSync(child, { recursive: true });
    write(root, IGNORE_FILENAME, 'a.ts\n');
    write(child, IGNORE_FILENAME, 'b.ts\n');

    expect(findNearestIgnorePath(child)).toBe(path.join(child, IGNORE_FILENAME));
  });

  it('walks to a parent ignore when the child has none', () => {
    const root = makeDir('ps-ig-parent-');
    const child = path.join(root, 'src');
    fs.mkdirSync(child, { recursive: true });
    write(root, IGNORE_FILENAME, 'skip.ts\n');

    expect(findNearestIgnorePath(child)).toBe(path.join(root, IGNORE_FILENAME));
  });

  it('returns null when no ignore exists', () => {
    expect(findNearestIgnorePath(makeDir('ps-ig-none-'))).toBeNull();
  });
});

describe('isPyramidSortIgnored', () => {
  it('matches gitignore patterns relative to the ignore file', () => {
    const root = makeDir('ps-ig-match-');
    write(root, IGNORE_FILENAME, '*.generated.ts\nfixtures/\n');
    const gen = write(root, 'src/foo.generated.ts');
    const keep = write(root, 'src/foo.ts');
    const fixture = write(root, 'fixtures/a.ts');

    expect(isPyramidSortIgnored(gen)).toBe(true);
    expect(isPyramidSortIgnored(keep)).toBe(false);
    expect(isPyramidSortIgnored(fixture)).toBe(true);
    expect(isPyramidSortIgnored(path.join(root, 'fixtures'))).toBe(true);
  });

  it('lets a nested ignore replace the parent', () => {
    const root = makeDir('ps-ig-nested-');
    const child = path.join(root, 'pkg');
    write(root, IGNORE_FILENAME, '*.ts\n');
    write(child, IGNORE_FILENAME, 'skip.ts\n');
    const kept = write(root, 'pkg/keep.ts');
    const skipped = write(root, 'pkg/skip.ts');
    const parentSkipped = write(root, 'other.ts');

    expect(isPyramidSortIgnored(kept)).toBe(false);
    expect(isPyramidSortIgnored(skipped)).toBe(true);
    expect(isPyramidSortIgnored(parentSkipped)).toBe(true);
  });
});

describe('listWorkspaceFiles', () => {
  it('skips ignored files and directories', () => {
    const root = makeDir('ps-ig-list-');
    write(root, IGNORE_FILENAME, 'skip.ts\nvendor/\n');
    write(root, 'keep.ts');
    write(root, 'skip.ts');
    write(root, 'vendor/hidden.ts');

    expect(listWorkspaceFiles(root, ['.ts'])).toEqual([path.join(root, 'keep.ts')]);
  });

  it('still honors root .gitignore', () => {
    const root = makeDir('ps-ig-git-');
    write(root, '.gitignore', 'gitignored.ts\n');
    write(root, IGNORE_FILENAME, 'psignored.ts\n');
    write(root, 'keep.ts');
    write(root, 'gitignored.ts');
    write(root, 'psignored.ts');

    expect(listWorkspaceFiles(root, ['.ts'])).toEqual([path.join(root, 'keep.ts')]);
  });
});
