import { findMatchingBrace } from './blockUtils';
import { resolveDirection, sortBlockChildren } from './groupSort';
import { TypeSorterOptions } from './types';

const DECL_RE = /^\s*(?:export\s+)?(?:type|interface|enum)\b/;

function lineStartOffset(lines: string[], line: number): number {
  let o = 0;
  for (let l = 0; l < line; l++) o += lines[l].length + 1;
  return o;
}

/**
 * Sort properties inside type/interface/enum blocks by line length.
 */
export function sortTypeProperties(source: string, options: TypeSorterOptions): string {
  const lines = source.split('\n');
  const fullText = source;
  const ranges: { openPos: number; closePos: number; openerLine: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (!DECL_RE.test(lines[i])) continue;

    let braceLine = i;
    let col = lines[i].indexOf('{');
    if (col === -1) {
      for (let j = i + 1; j < lines.length && j < i + 8; j++) {
        const c = lines[j].indexOf('{');
        if (c !== -1) {
          braceLine = j;
          col = c;
          break;
        }
      }
    }
    if (col === -1) continue;

    const openPos = lineStartOffset(lines, braceLine) + col;
    const closePos = findMatchingBrace(fullText, openPos);
    if (closePos === -1) continue;

    ranges.push({ openPos, closePos, openerLine: lines[braceLine] });
    i = fullText.slice(0, closePos).split('\n').length - 1;
  }

  const filtered = ranges.filter(
    (r) =>
      !ranges.some((o) => o !== r && r.openPos > o.openPos && r.closePos < o.closePos)
  );

  let result = fullText;
  for (let r = filtered.length - 1; r >= 0; r--) {
    const { openPos, closePos, openerLine } = filtered[r];
    const inner = result.slice(openPos + 1, closePos);
    const innerLines = inner.split('\n');
    const dir = resolveDirection(options.direction, openerLine, innerLines);
    const sortedInner = sortBlockChildren(
      innerLines,
      dir,
      options.groupByEmptyRows
    ).join('\n');
    result = result.slice(0, openPos + 1) + sortedInner + result.slice(closePos);
  }

  return result;
}

export function sortTypePropertiesInRange(
  source: string,
  startLine: number,
  endLine: number,
  options: TypeSorterOptions
): string {
  const lines = source.split('\n');
  const before = lines.slice(0, startLine).join('\n');
  const region = lines.slice(startLine, endLine + 1).join('\n');
  const after = lines.slice(endLine + 1).join('\n');
  const sorted = sortTypeProperties(region, options);
  return [before, sorted, after].filter((s) => s.length > 0).join('\n');
}
