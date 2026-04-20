import * as fs from 'fs';
import * as path from 'path';

const DEFAULT_ALIAS_PATTERNS = ['@/', '~/'];

const TSCONFIG_NAMES = ['tsconfig.json', 'jsconfig.json'] as const;
const VITE_CONFIG_NAMES = [
  'vite.config.ts',
  'vite.config.js',
  'vite.config.mts',
  'vite.config.mjs',
] as const;

/**
 * Extract alias prefixes from tsconfig/jsconfig `compilerOptions.paths`.
 * e.g. `{ "@/*": ["./src/*"] }` yields `["@/"]`.
 */
function extractPathAliases(configPath: string): string[] {
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const stripped = raw
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/,\s*([}\]])/g, '$1');
    const json = JSON.parse(stripped);
    const paths: Record<string, string[]> | undefined = json?.compilerOptions?.paths;
    if (!paths) return [];

    return Object.keys(paths)
      .map((key) => key.replace(/\*$/, ''))
      .filter((prefix) => prefix.length > 0);
  } catch {
    return [];
  }
}

/**
 * Attempt to extract aliases from vite.config.ts / vite.config.js by reading
 * the raw file and looking for `resolve: { alias: { ... } }` patterns.
 * This is intentionally shallow — no eval or AST — to stay lightweight.
 */
function extractViteAliases(configPath: string): string[] {
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const aliasBlockMatch = raw.match(/alias\s*:\s*\{([^}]+)\}/);
    if (!aliasBlockMatch) return [];

    const block = aliasBlockMatch[1];
    const keyPattern = /['"]?(@[^'":\s]+|~[^'":\s]+|#[^'":\s]+)['"]?\s*:/g;
    const aliases: string[] = [];
    let m: RegExpExecArray | null;

    while ((m = keyPattern.exec(block)) !== null) {
      let prefix = m[1];
      if (!prefix.endsWith('/')) prefix += '/';
      aliases.push(prefix);
    }
    return aliases;
  } catch {
    return [];
  }
}

/**
 * Detect local alias patterns by scanning project config files.
 * Falls back to `['@/', '~/']` if nothing is found.
 */
export function detectAliasPatterns(workspaceRoot: string): string[] {
  const detected: string[] = [];

  for (const name of TSCONFIG_NAMES) {
    const configPath = path.join(workspaceRoot, name);
    if (fs.existsSync(configPath)) {
      detected.push(...extractPathAliases(configPath));
    }
  }

  for (const name of VITE_CONFIG_NAMES) {
    const configPath = path.join(workspaceRoot, name);
    if (fs.existsSync(configPath)) {
      detected.push(...extractViteAliases(configPath));
    }
  }

  return [...new Set([...DEFAULT_ALIAS_PATTERNS, ...detected])];
}

function normalizeAliasPrefix(p: string): string {
  if (p.length === 0) return p;
  return p.endsWith('/') ? p : `${p}/`;
}

/**
 * Merge alias patterns from tsconfig/jsconfig/vite in `dir` and every parent
 * directory up to and including `stopDir` (both resolved). Matches monorepos
 * where `apps/api/tsconfig.json` defines paths while the workspace root does not.
 */
export function collectAliasPatternsFromFileUpward(
  filePath: string,
  stopDir: string
): string[] {
  const merged = new Set<string>();
  for (const d of DEFAULT_ALIAS_PATTERNS) merged.add(normalizeAliasPrefix(d));

  let dir = path.dirname(path.resolve(filePath));
  const stop = path.resolve(stopDir);

  while (true) {
    for (const name of TSCONFIG_NAMES) {
      const configPath = path.join(dir, name);
      if (fs.existsSync(configPath)) {
        for (const a of extractPathAliases(configPath)) {
          merged.add(normalizeAliasPrefix(a));
        }
      }
    }
    for (const name of VITE_CONFIG_NAMES) {
      const configPath = path.join(dir, name);
      if (fs.existsSync(configPath)) {
        for (const a of extractViteAliases(configPath)) {
          merged.add(normalizeAliasPrefix(a));
        }
      }
    }

    if (dir === stop) break;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return [...merged];
}

/**
 * CLI / headless: walk from the file up to the filesystem root.
 */
export function collectAliasPatternsFromFileToFsRoot(filePath: string): string[] {
  const merged = new Set<string>();
  for (const d of DEFAULT_ALIAS_PATTERNS) merged.add(normalizeAliasPrefix(d));

  let dir = path.dirname(path.resolve(filePath));

  while (true) {
    for (const name of TSCONFIG_NAMES) {
      const configPath = path.join(dir, name);
      if (fs.existsSync(configPath)) {
        for (const a of extractPathAliases(configPath)) {
          merged.add(normalizeAliasPrefix(a));
        }
      }
    }
    for (const name of VITE_CONFIG_NAMES) {
      const configPath = path.join(dir, name);
      if (fs.existsSync(configPath)) {
        for (const a of extractViteAliases(configPath)) {
          merged.add(normalizeAliasPrefix(a));
        }
      }
    }

    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return [...merged];
}

/**
 * Determine whether an import source is local (project file) vs external (npm).
 * Local: starts with `.`, `..`, or matches a detected alias prefix.
 * External: everything else (bare specifiers, scoped packages like @tanstack/...).
 */
export function isLocalImport(source: string, aliasPatterns: string[]): boolean {
  if (source.startsWith('.')) return true;
  return aliasPatterns.some((pattern) => source.startsWith(pattern));
}
