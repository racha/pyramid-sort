import { findMatchingBrace } from './blockUtils';
import { resolveDirection, sortBlockChildren } from './groupSort';
import { CssSorterOptions } from './types';

const RULE_OPEN = /\{[\s]*$/;

function lineStartOffset(lines: string[], line: number): number {
  let o = 0;
  for (let l = 0; l < line; l++) o += lines[l].length + 1;
  return o;
}

/**
 * Sort CSS/SCSS declarations inside rule blocks by line length.
 */
export function sortCssProperties(source: string, options: CssSorterOptions): string {
  const lines = source.split('\n');
  const fullText = source;
  const ranges: { openPos: number; closePos: number; openerLine: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!RULE_OPEN.test(line)) continue;
    if (/^\s*@keyframes\b/i.test(line)) continue;

    const col = line.lastIndexOf('{');
    if (col === -1) continue;

    const openPos = lineStartOffset(lines, i) + col;
    const closePos = findMatchingBrace(fullText, openPos);
    if (closePos === -1) continue;

    ranges.push({ openPos, closePos, openerLine: line });
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

export function sortCssPropertiesInRange(
  source: string,
  startLine: number,
  endLine: number,
  options: CssSorterOptions
): string {
  const lines = source.split('\n');
  const before = lines.slice(0, startLine).join('\n');
  const region = lines.slice(startLine, endLine + 1).join('\n');
  const after = lines.slice(endLine + 1).join('\n');
  const sorted = sortCssProperties(region, options);
  return [before, sorted, after].filter((s) => s.length > 0).join('\n');
}
