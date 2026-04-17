import { ResolvedDirection, SortDirection } from './types';

function compareLength(a: number, b: number, direction: ResolvedDirection): number {
  const diff = a - b;
  return direction === 'ascending' ? diff : -diff;
}

function medianLengths(lengths: number[]): number {
  if (lengths.length === 0) return 0;
  const sorted = [...lengths].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Pick ascending vs descending from opener length vs median trimmed length of body lines.
 */
export function resolveAutoDirection(openerLine: string, innerLines: string[]): ResolvedDirection {
  const nonEmpty = innerLines.map((l) => l.trim()).filter((t) => t.length > 0);
  const lengths = nonEmpty.map((t) => t.length);
  const medianLen = medianLengths(lengths);
  const openerLen = openerLine.trim().length;
  if (openerLen < medianLen) return 'ascending';
  return 'descending';
}

/** Resolve `auto` to a concrete direction; pass through ascending/descending. */
export function resolveDirection(
  mode: SortDirection,
  openerLine: string,
  innerLines: string[]
): ResolvedDirection {
  if (mode !== 'auto') return mode;
  return resolveAutoDirection(openerLine, innerLines);
}

/**
 * Sort lines by trimmed length. When groupByEmptyRows is true, split at blank lines,
 * sort each group independently, preserve blank-line runs between groups.
 */
export function sortLinesWithGrouping(
  lines: string[],
  direction: ResolvedDirection,
  groupByEmptyRows: boolean
): string[] {
  if (lines.length === 0) return lines;

  if (!groupByEmptyRows) {
    return [...lines].sort((a, b) =>
      compareLength(a.trim().length, b.trim().length, direction)
    );
  }

  type Part =
    | { kind: 'group'; lines: string[] }
    | { kind: 'blanks'; count: number };

  const parts: Part[] = [];
  let i = 0;
  while (i < lines.length) {
    if (lines[i].trim() === '') {
      let count = 0;
      while (i < lines.length && lines[i].trim() === '') {
        count++;
        i++;
      }
      parts.push({ kind: 'blanks', count });
    } else {
      const g: string[] = [];
      while (i < lines.length && lines[i].trim() !== '') {
        g.push(lines[i]);
        i++;
      }
      parts.push({ kind: 'group', lines: g });
    }
  }

  const out: string[] = [];
  for (const p of parts) {
    if (p.kind === 'blanks') {
      for (let k = 0; k < p.count; k++) out.push('');
    } else {
      const sorted = [...p.lines].sort((a, b) =>
        compareLength(a.trim().length, b.trim().length, direction)
      );
      out.push(...sorted);
    }
  }
  return out;
}

type StringKind = '"' | "'" | '`' | null;

interface ScanState {
  depth: number;
  inStr: StringKind;
  inBlockComment: boolean;
}

/**
 * Scan one line, carrying bracket depth, string state, and block-comment
 * state in from the previous line. Line comments (`//`) terminate at EOL and
 * are not counted for brackets or quotes. Block comments (`/* ... *\/`) may
 * span multiple lines and are likewise skipped for brackets/quotes.
 */
function scanLine(line: string, start: ScanState): ScanState {
  let depth = start.depth;
  let inStr: StringKind = start.inStr;
  let inBlock = start.inBlockComment;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    const next = i + 1 < line.length ? line[i + 1] : '';
    const prev = i > 0 ? line[i - 1] : '';

    if (inBlock) {
      if (c === '*' && next === '/') {
        inBlock = false;
        i++;
      }
      continue;
    }

    if (inStr) {
      if (c === inStr && prev !== '\\') inStr = null;
      continue;
    }

    if (c === '/' && next === '/') break;
    if (c === '/' && next === '*') {
      inBlock = true;
      i++;
      continue;
    }

    if (c === '"' || c === "'" || c === '`') {
      inStr = c as StringKind;
      continue;
    }

    if (c === '{' || c === '[' || c === '(') depth++;
    else if (c === '}' || c === ']' || c === ')') depth--;
  }

  return { depth, inStr, inBlockComment: inBlock };
}

const EMPTY_SCAN: ScanState = { depth: 0, inStr: null, inBlockComment: false };

/** Strip line and block comments so we can inspect the last real token. */
function stripComments(line: string): string {
  return line.replace(/\/\/.*$/, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Does this line look like the start of a new property / declaration / type
 * member? Used to disambiguate a trailing `,` (property terminator) from a `,`
 * that continues a multi-item CSS value like `transition:` / `box-shadow:`.
 */
function isStartOfNewChild(line: string): boolean {
  const t = line.trim();
  if (!t) return false;

  if (t.startsWith('//') || t.startsWith('/*')) return true;

  if (/^[)\]}]/.test(t)) return true;

  if (t.startsWith('@') || t.startsWith('--') || t.startsWith('$') || t.startsWith('...')) return true;

  if (/^["'`]/.test(t)) {
    const quote = t[0];
    let idx = 1;
    while (idx < t.length && !(t[idx] === quote && t[idx - 1] !== '\\')) idx++;
    const afterQuote = t.slice(idx + 1).trimStart();
    return afterQuote.startsWith(':');
  }

  if (/^(readonly|public|private|protected|static|get|set|async|declare|abstract|override)\s/.test(t)) return true;

  if (/^[A-Za-z_][\w-]*\s*\??\s*:/.test(t)) return true;

  if (/^[A-Za-z_][\w]*\s*(?:<[^>]*>)?\s*[=,]/.test(t)) return true;

  if (/^[A-Za-z_$][\w$]*\s*\(/.test(t) && /\)\s*[:{]/.test(t)) return true;

  if (t.startsWith('[')) return true;

  if (t.endsWith('{')) return true;

  return false;
}

/**
 * Is the chunk that ends at `line` complete, given its final scan state and
 * the following line (needed to resolve the `,` ambiguity)?
 */
function isChunkComplete(
  line: string,
  state: ScanState,
  nextLine: string | undefined
): boolean {
  if (state.depth !== 0) return false;
  if (state.inStr !== null) return false;
  if (state.inBlockComment) return false;

  const stripped = stripComments(line).trimEnd();
  if (!stripped) return false;

  const last = stripped[stripped.length - 1];

  if (last === ';') return true;

  if (last === ',' || last === '}' || last === ']' || last === ')') {
    if (nextLine === undefined) return true;
    return isStartOfNewChild(nextLine);
  }

  return false;
}

/**
 * Split `lines` into atomic child chunks. A chunk may span multiple lines when
 * the value is a multi-line function call / array / object literal, a template
 * literal, a CSS multi-line value (e.g. `grid-template-areas`, `box-shadow`
 * lists), a multi-line union type, a `+`/`|`-continued expression, or an
 * unclosed block comment.
 */
export function splitDepthZeroChildren(lines: string[]): string[][] {
  if (lines.length === 0) return [];
  const children: string[][] = [];
  let i = 0;

  while (i < lines.length) {
    const chunk: string[] = [lines[i]];
    let state = scanLine(lines[i], EMPTY_SCAN);

    while (i + 1 < lines.length) {
      if (isChunkComplete(lines[i], state, lines[i + 1])) break;
      i++;
      state = scanLine(lines[i], state);
      chunk.push(lines[i]);
    }

    i++;
    children.push(chunk);
  }

  return children;
}

function childSortKey(chunk: string[]): number {
  return chunk[0].trim().length;
}

/**
 * Sort object/type-like inner lines: group by empty rows, then sort depth-0 children by first-line length.
 */
export function sortBlockChildren(
  innerLines: string[],
  direction: ResolvedDirection,
  groupByEmptyRows: boolean
): string[] {
  if (innerLines.length === 0) return innerLines;

  if (!groupByEmptyRows) {
    const children = splitDepthZeroChildren(innerLines);
    const sorted = [...children].sort((a, b) =>
      compareLength(childSortKey(a), childSortKey(b), direction)
    );
    return sorted.flat();
  }

  type Part =
    | { kind: 'group'; lines: string[] }
    | { kind: 'blanks'; count: number };

  const parts: Part[] = [];
  let i = 0;
  while (i < innerLines.length) {
    if (innerLines[i].trim() === '') {
      let count = 0;
      while (i < innerLines.length && innerLines[i].trim() === '') {
        count++;
        i++;
      }
      parts.push({ kind: 'blanks', count });
    } else {
      const g: string[] = [];
      while (i < innerLines.length && innerLines[i].trim() !== '') {
        g.push(innerLines[i]);
        i++;
      }
      parts.push({ kind: 'group', lines: g });
    }
  }

  const out: string[] = [];
  for (const p of parts) {
    if (p.kind === 'blanks') {
      for (let k = 0; k < p.count; k++) out.push('');
    } else {
      const children = splitDepthZeroChildren(p.lines);
      const sorted = [...children].sort((a, b) =>
        compareLength(childSortKey(a), childSortKey(b), direction)
      );
      out.push(...sorted.flat());
    }
  }
  return out;
}
