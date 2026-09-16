import * as fs from 'fs';
import * as path from 'path';

import ignore from 'ignore';

export const IGNORE_FILENAME = '.pyramidsortignore';

const DEFAULT_SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  'coverage',
  '.next',
  '.turbo',
]);

function normalizeExt(e: string): string {
  const n = e.startsWith('.') ? e : `.${e}`;
  return n.toLowerCase();
}

function toPosix(rel: string): string {
  return rel.split(path.sep).join('/');
}

function loadIgnoreFile(filePath: string) {
  try {
    return ignore().add(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

/** Walk `startDir` toward the filesystem root; first `.pyramidsortignore` wins. */
export function findNearestIgnorePath(startDir: string): string | null {
  let dir = path.resolve(startDir);
  while (true) {
    const candidate = path.join(dir, IGNORE_FILENAME);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * True when `absPath` is matched by the nearest `.pyramidsortignore`
 * (gitignore syntax; patterns are relative to that file's directory).
 */
export function isPyramidSortIgnored(absPath: string): boolean {
  const resolved = path.resolve(absPath);
  const startDir = fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()
    ? resolved
    : path.dirname(resolved);
  const ignorePath = findNearestIgnorePath(startDir);
  if (!ignorePath) return false;

  const ig = loadIgnoreFile(ignorePath);
  if (!ig) return false;

  const rel = path.relative(path.dirname(ignorePath), resolved);
  if (!rel || rel.startsWith('..')) return false;
  const relPosix = toPosix(rel);
  return ig.ignores(relPosix) || ig.ignores(`${relPosix}/`);
}

/**
 * Lists files under `root` whose extension is in `extensions`, skipping
 * default build/vendor dirs, the workspace-root `.gitignore`, and the
 * nearest `.pyramidsortignore`.
 */
export function listWorkspaceFiles(root: string, extensions: string[]): string[] {
  const extSet = new Set(extensions.map(normalizeExt));
  const ig = ignore();
  const gitignorePath = path.join(root, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    try {
      ig.add(fs.readFileSync(gitignorePath, 'utf8'));
    } catch {
      /* empty */
    }
  }

  const out: string[] = [];

  function walk(dir: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const ent of entries) {
      const name = ent.name;
      if (name === '.' || name === '..') continue;
      const full = path.join(dir, name);
      const rel = path.relative(root, full);
      const relPosix = toPosix(rel);

      if (ent.isDirectory()) {
        if (DEFAULT_SKIP_DIRS.has(name)) continue;
        if (ig.ignores(relPosix) || ig.ignores(`${relPosix}/`)) continue;
        if (isPyramidSortIgnored(full)) continue;
        walk(full);
        continue;
      }

      if (!ent.isFile()) continue;
      if (ig.ignores(relPosix)) continue;
      if (isPyramidSortIgnored(full)) continue;

      const ext = normalizeExt(path.extname(name));
      if (!extSet.has(ext)) continue;

      out.push(full);
    }
  }

  walk(root);
  return out.sort((a, b) => a.localeCompare(b));
}
