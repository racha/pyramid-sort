import * as fs from 'fs';
import * as path from 'path';

import ignore from 'ignore';

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

/**
 * Lists files under `root` whose extension is in `extensions`, skipping
 * default build/vendor dirs and honoring the workspace-root `.gitignore`.
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
      const relPosix = rel.split(path.sep).join('/');

      if (ent.isDirectory()) {
        if (DEFAULT_SKIP_DIRS.has(name)) continue;
        if (ig.ignores(relPosix) || ig.ignores(`${relPosix}/`)) continue;
        walk(full);
        continue;
      }

      if (!ent.isFile()) continue;
      if (ig.ignores(relPosix)) continue;

      const ext = normalizeExt(path.extname(name));
      if (!extSet.has(ext)) continue;

      out.push(full);
    }
  }

  walk(root);
  return out.sort((a, b) => a.localeCompare(b));
}
