import { isLocalImport } from './core/aliasDetector';
import { sortAllAttributes } from './core/attributeSorter';
import { sortCssProperties } from './core/cssSorter';
import { findImportBlockRange, parseImports, sortImports } from './core/importSorter';
import { sortObjectProperties } from './core/objectSorter';
import { sortTypeProperties } from './core/typeSorter';
import {
  AttributeSorterOptions,
  CssSorterOptions,
  ImportSorterOptions,
  ObjectSorterOptions,
  TypeSorterOptions,
} from './core/types';

export interface DiagnosticFinding {
  startLine: number;
  endLine: number;
  message: string;
  code: string;
}

/**
 * Validate import order LOGICALLY instead of running the sorter and comparing
 * text. This avoids false positives from:
 *   - tie-breaking differences (two imports with equal length)
 *   - blank-line normalization the sorter would do for free
 *   - multi-line import reflow that doesn't affect the actual order
 *
 * Produces a message that names the exact offending line and the expected
 * ordering, so the user can see what's wrong instead of a generic blurb.
 */
export function checkImports(
  source: string,
  options: ImportSorterOptions
): DiagnosticFinding | null {
  const lines = source.split('\n');
  const range = findImportBlockRange(lines);
  if (!range) return null;

  const importLines = lines.slice(range.start, range.end + 1);
  const parsed = parseImports(importLines);
  if (parsed.length < 2) return null;

  interface Item {
    absLine: number;
    sortLen: number;
    isLocal: boolean;
    snippet: string;
  }

  const items: Item[] = parsed.map((imp) => {
    const firstLine = imp.originalText.split('\n')[0].trim();
    return {
      absLine: range.start + imp.startLine,
      sortLen: firstLine.length,
      isLocal: isLocalImport(imp.source, options.localAliasPatterns),
      snippet: firstLine.length > 70 ? firstLine.slice(0, 67) + '...' : firstLine,
    };
  });

  if (options.groupExternalLocal) {
    let sawLocal = false;
    for (const it of items) {
      if (it.isLocal) sawLocal = true;
      else if (sawLocal) {
        return {
          startLine: it.absLine,
          endLine: it.absLine,
          message:
            `Import on line ${it.absLine + 1} is an external (npm) package but appears after local imports. ` +
            `Pyramid Sort: all external imports first, then local imports.\n\n  ${it.snippet}`,
          code: 'pyramidSort.imports',
        };
      }
    }
  }

  type Group = Item[];
  const groups: Group[] = [];

  if (options.groupByEmptyRows) {
    const blankAt = new Set<number>();
    for (let i = range.start; i <= range.end; i++) {
      if (lines[i].trim() === '') blankAt.add(i);
    }
    let cur: Group = [];
    let prevAbsLine = -1;
    for (const it of items) {
      if (prevAbsLine !== -1) {
        let gap = false;
        for (let j = prevAbsLine + 1; j < it.absLine; j++) {
          if (blankAt.has(j)) {
            gap = true;
            break;
          }
        }
        if (gap) {
          if (cur.length) groups.push(cur);
          cur = [];
        }
      }
      cur.push(it);
      prevAbsLine = it.absLine;
    }
    if (cur.length) groups.push(cur);
  } else {
    groups.push(items);
  }

  if (options.groupExternalLocal) {
    const split: Group[] = [];
    for (const g of groups) {
      const ext = g.filter((i) => !i.isLocal);
      const loc = g.filter((i) => i.isLocal);
      if (ext.length) split.push(ext);
      if (loc.length) split.push(loc);
    }
    groups.length = 0;
    groups.push(...split);
  }

  const requestedDir = options.direction;

  for (const group of groups) {
    if (group.length < 2) continue;

    let canAsc = true;
    let canDesc = true;
    for (let i = 1; i < group.length; i++) {
      const prev = group[i - 1].sortLen;
      const cur = group[i].sortLen;
      if (cur < prev) canAsc = false;
      if (cur > prev) canDesc = false;
    }

    let valid = false;
    if (requestedDir === 'ascending') valid = canAsc;
    else if (requestedDir === 'descending') valid = canDesc;
    else valid = canAsc || canDesc;

    if (valid) continue;

    for (let i = 1; i < group.length; i++) {
      const prev = group[i - 1];
      const cur = group[i];

      const violatesAsc = cur.sortLen < prev.sortLen;
      const violatesDesc = cur.sortLen > prev.sortLen;

      if (requestedDir === 'ascending' && violatesAsc) {
        return {
          startLine: cur.absLine,
          endLine: cur.absLine,
          message:
            `Line ${cur.absLine + 1} (${cur.sortLen} chars) should come before line ${prev.absLine + 1} (${prev.sortLen} chars). ` +
            `Pyramid Sort: shorter imports first (ascending).\n` +
            `  L${prev.absLine + 1}: ${prev.snippet}\n  L${cur.absLine + 1}: ${cur.snippet}`,
          code: 'pyramidSort.imports',
        };
      }
      if (requestedDir === 'descending' && violatesDesc) {
        return {
          startLine: cur.absLine,
          endLine: cur.absLine,
          message:
            `Line ${cur.absLine + 1} (${cur.sortLen} chars) should come before line ${prev.absLine + 1} (${prev.sortLen} chars). ` +
            `Pyramid Sort: longer imports first (descending).\n` +
            `  L${prev.absLine + 1}: ${prev.snippet}\n  L${cur.absLine + 1}: ${cur.snippet}`,
          code: 'pyramidSort.imports',
        };
      }
      if (requestedDir === 'auto' && (violatesAsc || violatesDesc) && !canAsc && !canDesc) {
        return {
          startLine: cur.absLine,
          endLine: cur.absLine,
          message:
            `Line ${cur.absLine + 1} breaks the pyramid: this group is neither ascending nor descending by line length. ` +
            `Pyramid Sort (auto): each group must be monotone.\n` +
            `  L${prev.absLine + 1} (${prev.sortLen}): ${prev.snippet}\n  L${cur.absLine + 1} (${cur.sortLen}): ${cur.snippet}`,
          code: 'pyramidSort.imports',
        };
      }
    }
  }

  return null;
}

export function checkAttributes(
  source: string,
  options: AttributeSorterOptions
): DiagnosticFinding[] {
  const sorted = sortAllAttributes(source, options);
  if (sorted === source) return [];
  const range = findFirstDiffLineRange(source, sorted);
  if (!range) return [];
  return [
    {
      startLine: range.start,
      endLine: range.end,
      message: 'JSX/HTML attributes are not sorted by length',
      code: 'pyramidSort.attributes',
    },
  ];
}

export function checkTypes(
  source: string,
  options: TypeSorterOptions
): DiagnosticFinding[] {
  const sorted = sortTypeProperties(source, options);
  if (sorted === source) return [];
  return diffRangesToFindings(source, sorted, 'Type/interface properties are not sorted by length', 'pyramidSort.types');
}

export function checkObjects(
  source: string,
  options: ObjectSorterOptions
): DiagnosticFinding[] {
  const sorted = sortObjectProperties(source, options);
  if (sorted === source) return [];
  return diffRangesToFindings(source, sorted, 'Object properties are not sorted by length', 'pyramidSort.objects');
}

export function checkCss(
  source: string,
  options: CssSorterOptions
): DiagnosticFinding[] {
  const sorted = sortCssProperties(source, options);
  if (sorted === source) return [];
  return diffRangesToFindings(source, sorted, 'CSS properties are not sorted by length', 'pyramidSort.css');
}

function findFirstDiffLineRange(a: string, b: string): { start: number; end: number } | null {
  const la = a.split('\n');
  const lb = b.split('\n');
  for (let i = 0; i < Math.max(la.length, lb.length); i++) {
    if (la[i] !== lb[i]) {
      return { start: i, end: i };
    }
  }
  return null;
}

function diffRangesToFindings(
  source: string,
  sorted: string,
  message: string,
  code: string
): DiagnosticFinding[] {
  const la = source.split('\n');
  const lb = sorted.split('\n');
  const findings: DiagnosticFinding[] = [];
  let i = 0;
  while (i < Math.max(la.length, lb.length)) {
    if (la[i] === lb[i]) {
      i++;
      continue;
    }
    const start = i;
    while (i < Math.max(la.length, lb.length) && la[i] !== lb[i]) {
      i++;
    }
    findings.push({
      startLine: start,
      endLine: Math.max(start, i - 1),
      message,
      code,
    });
  }
  if (findings.length === 0) {
    const r = findFirstDiffLineRange(source, sorted);
    if (r) findings.push({ startLine: r.start, endLine: r.end, message, code });
  }
  return findings;
}
