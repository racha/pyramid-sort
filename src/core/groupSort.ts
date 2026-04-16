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

/** Brace depth after scanning one line, starting from `startDepth`. String-aware. */
function scanLineBraceDepth(line: string, startDepth: number): number {
  let depth = startDepth;
  let inStr: '"' | "'" | '`' | null = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    const prev = i > 0 ? line[i - 1] : '';
    if (inStr) {
      if (c === inStr && prev !== '\\') inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inStr = c as '"' | "'" | '`';
      continue;
    }
    if (c === '{' || c === '[' || c === '(') depth++;
    else if (c === '}' || c === ']' || c === ')') depth--;
  }
  return depth;
}

/**
 * Split `lines` into depth-0 children: each child is one line or a multi-line span until braces balance.
 * Used for object literal bodies with nested `{ }`.
 */
export function splitDepthZeroChildren(lines: string[]): string[][] {
  if (lines.length === 0) return [];
  const children: string[][] = [];
  let i = 0;
  while (i < lines.length) {
    let depth = scanLineBraceDepth(lines[i], 0);
    if (depth === 0) {
      children.push([lines[i]]);
      i++;
      continue;
    }
    const chunk: string[] = [lines[i]];
    i++;
    while (i < lines.length && depth > 0) {
      depth = scanLineBraceDepth(lines[i], depth);
      chunk.push(lines[i]);
      i++;
    }
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
