import * as fs from 'fs';
import * as path from 'path';

const DEFAULT_ALIAS_PATTERNS = ['@/', '~/'];

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

  const tsConfigs = ['tsconfig.json', 'jsconfig.json'];
  for (const name of tsConfigs) {
    const configPath = path.join(workspaceRoot, name);
    if (fs.existsSync(configPath)) {
      detected.push(...extractPathAliases(configPath));
    }
  }

  const viteConfigs = ['vite.config.ts', 'vite.config.js', 'vite.config.mts', 'vite.config.mjs'];
  for (const name of viteConfigs) {
    const configPath = path.join(workspaceRoot, name);
    if (fs.existsSync(configPath)) {
      detected.push(...extractViteAliases(configPath));
    }
  }

  if (detected.length === 0) return DEFAULT_ALIAS_PATTERNS;

  return [...new Set(detected)];
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
