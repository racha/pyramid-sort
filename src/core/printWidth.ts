import * as fs from 'fs';
import * as path from 'path';

/** Used when no override and no config is found. */
export const DEFAULT_PRINT_WIDTH = 80;

export interface ResolvePrintWidthInput {
  /**
   * Explicit override (e.g. `pyramidSort.imports.maxLineWidth` or `.pyramidsortrc.json`).
   * Values **greater than 0** use this width. **0** means “use auto-detection”.
   */
  override?: number;
  /** Directory to start walking upward looking for Prettier / package.json (usually the file’s folder). */
  searchFromDir: string;
  /** Stop walking at this directory (e.g. workspace root). */
  workspaceRoot?: string;
  /** VS Code only: `prettier.printWidth` when set &gt; 0. */
  vscodePrettierPrintWidth?: number;
  /** VS Code only: first `editor.rulers` value when &gt; 0. */
  editorRuler?: number;
}

const PRETTIER_RC_NAMES = [
  '.prettierrc',
  '.prettierrc.json',
  '.prettierrc.yaml',
  '.prettierrc.yml',
  'prettier.config.json',
  '.prettierrc.toml',
];

function tryParsePrintWidthFromText(text: string): number | undefined {
  try {
    const j = JSON.parse(text) as unknown;
    if (typeof j === 'object' && j !== null && 'printWidth' in j) {
      const pw = (j as { printWidth?: unknown }).printWidth;
      if (typeof pw === 'number' && pw > 0) return Math.floor(pw);
    }
  } catch {
    // not JSON — try regex (works for YAML-ish too)
  }
  const m = /["']?printWidth["']?\s*[:=]\s*(\d+)/.exec(text);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n > 0) return n;
  }
  return undefined;
}

function readPrintWidthFromFile(filePath: string): number | undefined {
  if (!fs.existsSync(filePath)) return undefined;
  try {
    const text = fs.readFileSync(filePath, 'utf-8');
    return tryParsePrintWidthFromText(text);
  } catch {
    return undefined;
  }
}

function readPackageJsonPrettier(dir: string): number | undefined {
  const p = path.join(dir, 'package.json');
  if (!fs.existsSync(p)) return undefined;
  try {
    const pkg = JSON.parse(fs.readFileSync(p, 'utf-8')) as {
      prettier?: { printWidth?: number };
    };
    const pw = pkg.prettier?.printWidth;
    if (typeof pw === 'number' && pw > 0) return Math.floor(pw);
  } catch {
    return undefined;
  }
  return undefined;
}

/**
 * Resolve effective print width for import consolidation.
 *
 * Order when `override` is 0 or unset: **Prettier config on disk** (walk up from
 * `searchFromDir`), then **VS Code `prettier.printWidth`** (if provided), then
 * **`editor.rulers[0]`** (if provided), then {@link DEFAULT_PRINT_WIDTH}.
 */
export function resolvePrintWidth(input: ResolvePrintWidthInput): number {
  const o = input.override;
  if (o !== undefined && o > 0) {
    return Math.floor(o);
  }

  let dir = path.resolve(input.searchFromDir);
  const stop = input.workspaceRoot ? path.resolve(input.workspaceRoot) : path.parse(dir).root;

  while (true) {
    for (const name of PRETTIER_RC_NAMES) {
      const w = readPrintWidthFromFile(path.join(dir, name));
      if (w !== undefined) return w;
    }
    const fromPkg = readPackageJsonPrettier(dir);
    if (fromPkg !== undefined) return fromPkg;

    const parent = path.dirname(dir);
    if (dir === stop || parent === dir) break;
    dir = parent;
  }

  const vscodePw = input.vscodePrettierPrintWidth;
  if (vscodePw !== undefined && vscodePw > 0) {
    return Math.floor(vscodePw);
  }

  const ruler = input.editorRuler;
  if (ruler !== undefined && ruler > 0) {
    return Math.floor(ruler);
  }

  return DEFAULT_PRINT_WIDTH;
}
