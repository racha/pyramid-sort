import { findMatchingBrace } from './blockUtils';
import { resolveDirection, sortBlockChildren } from './groupSort';
import { ObjectSorterOptions } from './types';

const ASSIGN_OBJ_RE = /^\s*(?:export\s+)?(?:const|let|var)\s+[\w$]+\s*=\s*\{/;
const RETURN_OBJ_RE = /^\s*return\s*\{/;
/** `foo({` — object literal as first argument */
const FUNC_CALL_OBJ_RE = /\w+\(\s*\{/;
/** `key: {` nested property */
const PROP_OBJ_RE = /^\s*[\w$]+\s*:\s*\{/;

function lineStartOffset(lines: string[], line: number): number {
  let o = 0;
  for (let l = 0; l < line; l++) o += lines[l].length + 1;
  return o;
}

export interface ObjectRange {
  openPos: number;
  closePos: number;
  openerLine: string;
}

function findObjectRanges(text: string, nested: boolean): ObjectRange[] {
  const lines = text.split('\n');
  const ranges: ObjectRange[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let col = -1;

    if (ASSIGN_OBJ_RE.test(line) || RETURN_OBJ_RE.test(line)) {
      col = line.indexOf('{');
    } else if (nested && FUNC_CALL_OBJ_RE.test(line)) {
      col = line.indexOf('{');
    } else if (nested && PROP_OBJ_RE.test(line)) {
      col = line.lastIndexOf('{');
    }

    if (col === -1) continue;

    const openPos = lineStartOffset(lines, i) + col;
    const closePos = findMatchingBrace(text, openPos);
    if (closePos === -1) continue;

    ranges.push({ openPos, closePos, openerLine: line });
  }

  if (!nested) {
    return ranges.filter(
      (r) =>
        !ranges.some((o) => o !== r && r.openPos > o.openPos && r.closePos < o.closePos)
    );
  }

  return ranges;
}

/**
 * Sort properties in object literals (assignment, return, and optionally call args / nested `key: { }`).
 */
export function sortObjectProperties(source: string, options: ObjectSorterOptions): string {
  let result = source;
  const maxIter = 2000;
  let iter = 0;

  while (iter++ < maxIter) {
    const ranges = findObjectRanges(result, options.sortNestedObjects);
    if (ranges.length === 0) break;

    const sortedBySpan = [...ranges].sort(
      (a, b) => a.closePos - a.openPos - (b.closePos - b.openPos)
    );

    let changed = false;
    for (const r of sortedBySpan) {
      const { openPos, closePos, openerLine } = r;
      const inner = result.slice(openPos + 1, closePos);
      const innerLines = inner.split('\n');
      const dir = resolveDirection(options.direction, openerLine, innerLines);
      const sortedInner = sortBlockChildren(innerLines, dir, options.groupByEmptyRows).join('\n');
      if (sortedInner !== inner) {
        result = result.slice(0, openPos + 1) + sortedInner + result.slice(closePos);
        changed = true;
        break;
      }
    }

    if (!changed) break;
  }

  return result;
}

export function sortObjectPropertiesInRange(
  source: string,
  startLine: number,
  endLine: number,
  options: ObjectSorterOptions
): string {
  const lines = source.split('\n');
  const before = lines.slice(0, startLine).join('\n');
  const region = lines.slice(startLine, endLine + 1).join('\n');
  const after = lines.slice(endLine + 1).join('\n');
  const sorted = sortObjectProperties(region, options);
  return [before, sorted, after].filter((s) => s.length > 0).join('\n');
}
