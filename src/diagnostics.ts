import { sortAllAttributes } from './core/attributeSorter';
import { sortCssProperties } from './core/cssSorter';
import { sortImports } from './core/importSorter';
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

export function checkImports(
  source: string,
  options: ImportSorterOptions
): DiagnosticFinding | null {
  const sorted = sortImports(source, options);
  if (sorted === source) return null;
  const range = findFirstDiffLineRange(source, sorted);
  if (!range) return null;
  const message = options.groupExternalLocal
    ? 'Imports are not in Pyramid Sort order (by length, with external/local groups)'
    : 'Imports are not sorted by length';
  return {
    startLine: range.start,
    endLine: range.end,
    message,
    code: 'pyramidSort.imports',
  };
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
