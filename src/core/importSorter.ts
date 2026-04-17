import { isLocalImport } from './aliasDetector';
import { resolveDirection } from './groupSort';
import { ImportSorterOptions, ParsedImport, ResolvedDirection } from './types';

const SINGLE_LINE_IMPORT_RE =
  /^(import\s+type\s+|import\s+)((?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*\{[^}]*\})?)\s+from\s+['"]([^'"]+)['"];?\s*(?:\/\/.*)?$/;

const SIDE_EFFECT_IMPORT_RE = /^import\s+['"]([^'"]+)['"];?\s*$/;

const MULTILINE_IMPORT_START_RE = /^(import\s+type\s+|import\s+)\{?\s*$/;

const IMPORT_START_RE = /^import\s/;

const NON_IMPORT_LINE_RE =
  /^\s*(?:const|let|var|function|class|return|if|else|for|while|switch|try|catch|throw)\b/;

/**
 * Parse all import statements from a block of source lines.
 * Returns structured ParsedImport objects.
 */
export function parseImports(lines: string[]): ParsedImport[] {
  const imports: ParsedImport[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!IMPORT_START_RE.test(trimmed)) {
      i++;
      continue;
    }

    const sideEffectMatch = trimmed.match(SIDE_EFFECT_IMPORT_RE);
    if (sideEffectMatch) {
      imports.push({
        originalText: line,
        source: sideEffectMatch[1],
        namedSpecifiers: [],
        defaultImport: null,
        isTypeImport: false,
        isSideEffect: true,
        startLine: i,
        endLine: i,
      });
      i++;
      continue;
    }

    const singleMatch = trimmed.match(SINGLE_LINE_IMPORT_RE);
    if (singleMatch) {
      const isType = singleMatch[1].includes('type');
      const bindingsPart = singleMatch[2];
      const source = singleMatch[3];
      const { defaultImport, namedSpecifiers } = parseBindings(bindingsPart);

      imports.push({
        originalText: line,
        source,
        namedSpecifiers,
        defaultImport,
        isTypeImport: isType,
        isSideEffect: false,
        startLine: i,
        endLine: i,
      });
      i++;
      continue;
    }

    if (IMPORT_START_RE.test(trimmed)) {
      const startLine = i;
      const collectedLines = [line];
      i++;
      let foundFrom = false;

      while (i < lines.length) {
        if (NON_IMPORT_LINE_RE.test(lines[i])) break;
        collectedLines.push(lines[i]);
        if (lines[i].includes('from ') || lines[i].trim().startsWith('} from')) {
          foundFrom = true;
          break;
        }
        i++;
      }
      i++;

      if (!foundFrom) continue;

      const fullText = collectedLines.join('\n');
      const joined = collectedLines.map((l) => l.trim()).join(' ');

      const isType = /^import\s+type\s/.test(joined);
      const sourceMatch = joined.match(/from\s+['"]([^'"]+)['"];?\s*(?:\/\/.*)?$/);
      const source = sourceMatch ? sourceMatch[1] : '';

      const bindingsMatch = joined.match(/^import\s+(?:type\s+)?(.+?)\s+from\s+/);
      const bindingsPart = bindingsMatch ? bindingsMatch[1] : '';
      const { defaultImport, namedSpecifiers } = parseBindings(bindingsPart);

      imports.push({
        originalText: fullText,
        source,
        namedSpecifiers,
        defaultImport,
        isTypeImport: isType,
        isSideEffect: false,
        startLine,
        endLine: startLine + collectedLines.length - 1,
      });
    }
  }

  return imports;
}

function parseBindings(bindingsPart: string): {
  defaultImport: string | null;
  namedSpecifiers: string[];
} {
  const cleaned = bindingsPart.trim();

  const namedMatch = cleaned.match(/\{([^}]*)\}/);
  const namedSpecifiers = namedMatch
    ? namedMatch[1]
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    : [];

  const withoutNamed = cleaned.replace(/\{[^}]*\}/, '').replace(/,\s*$/, '').trim();
  const defaultImport = withoutNamed.length > 0 && !withoutNamed.startsWith('*') ? withoutNamed : null;

  if (!defaultImport && withoutNamed.startsWith('*')) {
    return { defaultImport: withoutNamed, namedSpecifiers };
  }

  return { defaultImport, namedSpecifiers };
}

/**
 * Pack a parsed **multi-line** import into one or more single-line import statements
 * so each line fits within `maxLineWidth`. Not used for imports that are already a
 * single line in source (those are left unchanged).
 */
function consolidateImport(imp: ParsedImport, maxLineWidth: number): string[] {
  if (imp.isSideEffect) return [imp.originalText.trim()];

  const results: string[] = [];
  const typePrefix = imp.isTypeImport ? 'type ' : '';
  const fromSuffix = ` from '${imp.source}';`;

  if (imp.defaultImport && imp.namedSpecifiers.length > 0) {
    results.push(`import ${typePrefix}${imp.defaultImport}${fromSuffix}`);
  } else if (imp.defaultImport) {
    results.push(`import ${typePrefix}${imp.defaultImport}${fromSuffix}`);
    return results;
  }

  if (imp.namedSpecifiers.length === 0 && !imp.defaultImport) {
    return [imp.originalText.trim()];
  }

  const specifiers = imp.namedSpecifiers;
  if (specifiers.length === 0) return results;

  const linePrefix = `import ${typePrefix}{ `;
  const lineSuffix = ` }${fromSuffix}`;
  const overhead = linePrefix.length + lineSuffix.length;

  let currentSpecs: string[] = [];
  let currentLength = overhead;

  for (const spec of specifiers) {
    const addition = currentSpecs.length === 0 ? spec.length : spec.length + 2;

    if (currentLength + addition > maxLineWidth && currentSpecs.length > 0) {
      results.push(`${linePrefix}${currentSpecs.join(', ')}${lineSuffix}`);
      currentSpecs = [spec];
      currentLength = overhead + spec.length;
    } else {
      currentSpecs.push(spec);
      currentLength += addition;
    }
  }

  if (currentSpecs.length > 0) {
    results.push(`${linePrefix}${currentSpecs.join(', ')}${lineSuffix}`);
  }

  return results;
}

function sortByLength(lines: string[], direction: ResolvedDirection): string[] {
  const sorted = [...lines].sort((a, b) => {
    const diff = a.trim().length - b.trim().length;
    return direction === 'ascending' ? diff : -diff;
  });
  return sorted;
}

/**
 * Sort a contiguous block of import lines (no blank lines inside).
 * Returns the sorted lines array (external group, optional blank, local group).
 * @param openerBeforeImportBlock Line immediately above the import block (for `auto` direction).
 */
export function sortImportLinesContiguous(
  importLines: string[],
  options: ImportSorterOptions,
  openerBeforeImportBlock = ''
): string[] {
  const parsed = parseImports(importLines);
  if (parsed.length === 0) return importLines;

  let allImportLines: { line: string; source: string }[] = [];

  for (const imp of parsed) {
    const isMultiline = imp.originalText.includes('\n');
    // Only consolidate imports that are already multi-line in source. Single-line imports are
    // left as-is (even if long): we never split or reflow a one-line import to fit print width.
    if (options.consolidateMultilineImports && isMultiline) {
      const consolidated = consolidateImport(imp, options.maxLineWidth);
      for (const line of consolidated) {
        allImportLines.push({ line, source: imp.source });
      }
    } else {
      allImportLines.push({ line: imp.originalText.trim(), source: imp.source });
    }
  }

  const external: string[] = [];
  const local: string[] = [];

  for (const entry of allImportLines) {
    if (isLocalImport(entry.source, options.localAliasPatterns)) {
      local.push(entry.line);
    } else {
      external.push(entry.line);
    }
  }

  const flatLines = [...external, ...local];
  const dir = resolveDirection(options.direction, openerBeforeImportBlock, flatLines);

  if (!options.groupExternalLocal) {
    return sortByLength(flatLines, dir);
  }

  const sortedExternal = sortByLength(external, dir);
  const sortedLocal = sortByLength(local, dir);

  const result: string[] = [];
  if (sortedExternal.length > 0) result.push(...sortedExternal);
  if (sortedExternal.length > 0 && sortedLocal.length > 0) result.push('');
  if (sortedLocal.length > 0) result.push(...sortedLocal);
  return result;
}

type ImportBlockPart =
  | { kind: 'group'; lines: string[] }
  | { kind: 'blanks'; count: number };

function splitImportBlockParts(lines: string[]): ImportBlockPart[] {
  const parts: ImportBlockPart[] = [];
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
  return parts;
}

function flattenImportParts(
  parts: ImportBlockPart[],
  options: ImportSorterOptions,
  openerBeforeImportBlock: string
): string[] {
  const out: string[] = [];
  for (const p of parts) {
    if (p.kind === 'blanks') {
      for (let k = 0; k < p.count; k++) out.push('');
    } else {
      out.push(...sortImportLinesContiguous(p.lines, options, openerBeforeImportBlock));
    }
  }
  return out;
}

/**
 * Find the import block region in the given lines. Returns the start/end
 * line indices (inclusive) covering all import statements at the top of the
 * region, allowing blank lines and comments between them.
 */
export function findImportBlockRange(lines: string[]): { start: number; end: number } | null {
  let start = -1;
  let end = -1;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (trimmed === '' || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      if (start === -1) continue;
      continue;
    }

    if (IMPORT_START_RE.test(trimmed)) {
      if (start === -1) start = i;

      if (trimmed.includes(' from ') || SIDE_EFFECT_IMPORT_RE.test(trimmed)) {
        end = i;
      } else {
        let j = i + 1;
        while (j < lines.length) {
          if (NON_IMPORT_LINE_RE.test(lines[j])) break;
          if (lines[j].includes('from ') || lines[j].trim().startsWith('} from')) {
            end = j;
            break;
          }
          j++;
        }
        i = j;
      }
    } else {
      if (start !== -1) break;
      if (trimmed.startsWith("'use ") || trimmed.startsWith('"use ')) continue;
      break;
    }
  }

  if (start === -1 || end === -1) return null;
  return { start, end };
}

/**
 * Sort imports in the given source text.
 * Returns the full text with imports sorted.
 */
export function sortImports(source: string, options: ImportSorterOptions): string {
  const lines = source.split('\n');
  const range = findImportBlockRange(lines);
  if (!range) return source;

  const importLines = lines.slice(range.start, range.end + 1);
  const parsed = parseImports(importLines);
  if (parsed.length === 0) return source;

  const openerBefore =
    range.start > 0 ? lines[range.start - 1] : '';

  let result: string[];
  if (options.groupByEmptyRows) {
    const parts = splitImportBlockParts(importLines);
    result = flattenImportParts(parts, options, openerBefore);
  } else {
    const nonEmpty = importLines.filter((l) => l.trim() !== '');
    result = sortImportLinesContiguous(nonEmpty, options, openerBefore);
  }

  const before = lines.slice(0, range.start);
  const after = lines.slice(range.end + 1);

  return [...before, ...result, ...after].join('\n');
}
