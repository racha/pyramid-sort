import * as fs from 'fs';
import * as path from 'path';

import { DEFAULT_CONFIG, PyramidSortConfig } from './types';

export const RC_FILENAME = 'pyramidsortrc.json';
export const RC_FILENAME_LEGACY = '.pyramidsortrc.json';

const RC_NAMES = [RC_FILENAME, RC_FILENAME_LEGACY] as const;

const NESTED_KEYS = [
  'imports',
  'attributes',
  'types',
  'objects',
  'css',
  'forceSort',
  'diagnostics',
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function tryReadRcObject(configPath: string): Record<string, unknown> | null {
  try {
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return isPlainObject(raw) ? raw : null;
  } catch {
    return null;
  }
}

function readableRcIn(dir: string): string | null {
  for (const name of RC_NAMES) {
    const configPath = path.join(dir, name);
    if (fs.existsSync(configPath) && tryReadRcObject(configPath)) return configPath;
  }
  return null;
}

/** Walk startDir upward. First readable JSON object wins. Parse error: skip, keep walking. */
export function findNearestRcPath(startDir: string): string | null {
  let dir = path.resolve(startDir);
  while (true) {
    const found = readableRcIn(dir);
    if (found) return found;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/** Raw JSON object or null if none found. */
export function loadNearestRcRaw(startDir: string): Record<string, unknown> | null {
  const rcPath = findNearestRcPath(startDir);
  return rcPath ? tryReadRcObject(rcPath) : null;
}

function cloneDefaultConfig(): PyramidSortConfig {
  return {
    imports: { ...DEFAULT_CONFIG.imports },
    attributes: { ...DEFAULT_CONFIG.attributes },
    types: { ...DEFAULT_CONFIG.types },
    objects: { ...DEFAULT_CONFIG.objects },
    css: { ...DEFAULT_CONFIG.css },
    forceSort: { ...DEFAULT_CONFIG.forceSort },
    extensions: [...DEFAULT_CONFIG.extensions],
    showDiagnostics: DEFAULT_CONFIG.showDiagnostics,
    diagnostics: { ...DEFAULT_CONFIG.diagnostics },
    sortImportsOnSave: DEFAULT_CONFIG.sortImportsOnSave,
    sortAttributesOnSave: DEFAULT_CONFIG.sortAttributesOnSave,
    sortTypesOnSave: DEFAULT_CONFIG.sortTypesOnSave,
    sortObjectsOnSave: DEFAULT_CONFIG.sortObjectsOnSave,
    sortCssOnSave: DEFAULT_CONFIG.sortCssOnSave,
  };
}

/**
 * Merge layers. Later layers win for present keys only.
 * Nested objects shallow-merge per group. Top-level scalars/arrays replace when present.
 */
export function mergePyramidSortConfig(
  ...layers: Array<Partial<PyramidSortConfig> | Record<string, unknown> | null | undefined>
): PyramidSortConfig {
  const result = cloneDefaultConfig();

  for (const layer of layers) {
    if (!isPlainObject(layer)) continue;

    for (const key of NESTED_KEYS) {
      const next = layer[key];
      if (isPlainObject(next)) {
        result[key] = { ...result[key], ...next } as never;
      }
    }

    if (Array.isArray(layer.extensions)) {
      result.extensions = [...layer.extensions];
    }
    if (typeof layer.showDiagnostics === 'boolean') {
      result.showDiagnostics = layer.showDiagnostics;
    }
    if (typeof layer.sortImportsOnSave === 'boolean') {
      result.sortImportsOnSave = layer.sortImportsOnSave;
    }
    if (typeof layer.sortAttributesOnSave === 'boolean') {
      result.sortAttributesOnSave = layer.sortAttributesOnSave;
    }
    if (typeof layer.sortTypesOnSave === 'boolean') {
      result.sortTypesOnSave = layer.sortTypesOnSave;
    }
    if (typeof layer.sortObjectsOnSave === 'boolean') {
      result.sortObjectsOnSave = layer.sortObjectsOnSave;
    }
    if (typeof layer.sortCssOnSave === 'boolean') {
      result.sortCssOnSave = layer.sortCssOnSave;
    }
  }

  return result;
}

export function resolvePyramidSortConfig(
  startDir: string,
  vscodeLayer?: Partial<PyramidSortConfig>
): PyramidSortConfig {
  return mergePyramidSortConfig(DEFAULT_CONFIG, vscodeLayer, loadNearestRcRaw(startDir));
}

/** Stable full-settings JSON for `pyramidsortrc.json`. */
export function pyramidSortConfigToRcJson(config: PyramidSortConfig): string {
  return `${JSON.stringify(
    {
      imports: { ...config.imports },
      attributes: { ...config.attributes },
      types: { ...config.types },
      objects: { ...config.objects },
      css: { ...config.css },
      forceSort: { ...config.forceSort },
      extensions: [...config.extensions],
      showDiagnostics: config.showDiagnostics,
      diagnostics: { ...config.diagnostics },
      sortImportsOnSave: config.sortImportsOnSave,
      sortAttributesOnSave: config.sortAttributesOnSave,
      sortTypesOnSave: config.sortTypesOnSave,
      sortObjectsOnSave: config.sortObjectsOnSave,
      sortCssOnSave: config.sortCssOnSave,
    },
    null,
    2
  )}\n`;
}

export function mergeAliasPatterns(...lists: Array<string[] | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const list of lists) {
    if (!list) continue;
    for (const pattern of list) {
      if (seen.has(pattern)) continue;
      seen.add(pattern);
      out.push(pattern);
    }
  }
  return out;
}
