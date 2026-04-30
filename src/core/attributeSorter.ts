import { resolveDirection } from './groupSort';
import { AttributeSorterOptions, ParsedAttribute, ResolvedDirection, TagWithAttributes } from './types';

/**
 * Determine if a character is inside a string/template literal or bracket context.
 * Uses a simple state machine to track nesting.
 */
interface BracketState {
  depth: number;
  stringChar: string | null;
  templateDepth: number;
}

function createBracketState(): BracketState {
  return { depth: 0, stringChar: null, templateDepth: 0 };
}

function advanceChar(state: BracketState, ch: string, prevCh: string): BracketState {
  const s = { ...state };

  if (s.stringChar) {
    if (ch === s.stringChar && prevCh !== '\\') {
      s.stringChar = null;
    }
    return s;
  }

  if (ch === '`') {
    s.stringChar = '`';
    return s;
  }
  if (ch === '"' || ch === "'") {
    s.stringChar = ch;
    return s;
  }
  if (ch === '{' || ch === '(') s.depth++;
  if (ch === '}' || ch === ')') s.depth--;

  return s;
}

function isBalanced(state: BracketState): boolean {
  return state.depth === 0 && state.stringChar === null;
}

function splitAtTagClose(text: string): { attrPart: string; closePart: string } | null {
  let bracketState = createBracketState();
  for (let i = 0; i < text.length; i++) {
    bracketState = advanceChar(bracketState, text[i], i > 0 ? text[i - 1] : '');
    if (isBalanced(bracketState)) {
      if (text.startsWith('/>', i)) {
        return { attrPart: text.slice(0, i), closePart: text.slice(i) };
      }
      if (text[i] === '>') {
        return { attrPart: text.slice(0, i), closePart: text.slice(i) };
      }
    }
  }
  return null;
}

/**
 * Find all multi-line JSX/HTML opening tags in the source.

 * Only processes tags where attributes are already on separate lines.
 */
export function findMultilineTagOpenings(lines: string[]): TagWithAttributes[] {
  const results: TagWithAttributes[] = [];
  const tagStartRe = /^(\s*)<([A-Za-z_][A-Za-z0-9_.]*|[a-z][a-z0-9-]*)\s*$/;
  const tagStartWithAttrsRe = /^(\s*)<([A-Za-z_][A-Za-z0-9_.]*|[a-z][a-z0-9-]*)\s+(.+)$/;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('</') || trimmed.startsWith('{/*')) {
      i++;
      continue;
    }

    let tagIndent = '';
    let tagName = '';
    let firstAttrText: string | null = null;
    let matchedTagStart = false;

    const pureMatch = line.match(tagStartRe);
    if (pureMatch) {
      tagIndent = pureMatch[1];
      tagName = pureMatch[2];
      matchedTagStart = true;
    } else {
      const withAttrsMatch = line.match(tagStartWithAttrsRe);
      if (withAttrsMatch) {
        tagIndent = withAttrsMatch[1];
        tagName = withAttrsMatch[2];
        firstAttrText = withAttrsMatch[3];

        const isClosedOnSameLine =
          firstAttrText.endsWith('>') || firstAttrText.endsWith('/>');
        const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
        const nextIsAttrOrClose =
          nextLine === '>' ||
          nextLine === '/>' ||
          (!nextLine.startsWith('<') && nextLine.length > 0);

        if (!isClosedOnSameLine && nextIsAttrOrClose) {
          matchedTagStart = true;
        }
      }
    }

    if (!matchedTagStart) {
      i++;
      continue;
    }

    const tagOpen = `<${tagName}`;
    const startLine = i;
    const attributes: ParsedAttribute[] = [];
    let attrIndent = '';
    let tagClose = '';
    let endLine = i;

    if (firstAttrText) {
      const trimmedAttr = firstAttrText.trim();
      if (trimmedAttr !== '>' && trimmedAttr !== '/>') {
        attrIndent = tagIndent + '  ';
        attributes.push({
          text: trimmedAttr,
          sortLength: trimmedAttr.length,
          originalLines: [attrIndent + trimmedAttr],
        });
      }
    }

    i++;

    while (i < lines.length) {
      const attrLine = lines[i];
      const attrTrimmed = attrLine.trim();

      if (attrTrimmed === '') {
        attributes.push({
          text: '',
          sortLength: 0,
          originalLines: [''],
          isBlankSeparator: true,
        });
        i++;
        continue;
      }

      if (!attrIndent) {
        attrIndent = attrLine.match(/^(\s*)/)?.[1] || '';
      }

      let bracketState = createBracketState();
      let fullAttr = attrTrimmed;
      let attrEndLine = i;

      for (let ci = 0; ci < attrTrimmed.length; ci++) {
        bracketState = advanceChar(bracketState, attrTrimmed[ci], ci > 0 ? attrTrimmed[ci - 1] : '');
      }

      while (!isBalanced(bracketState) && attrEndLine + 1 < lines.length) {
        attrEndLine++;
        const continuation = lines[attrEndLine].trim();
        fullAttr += ' ' + continuation;
        for (let ci = 0; ci < continuation.length; ci++) {
          bracketState = advanceChar(
            bracketState,
            continuation[ci],
            ci > 0 ? continuation[ci - 1] : fullAttr[fullAttr.length - continuation.length - 1] || ''
          );
        }
      }

      const split = splitAtTagClose(fullAttr);
      let cleanAttr = fullAttr.trim();
      let trailingClose = null;

      if (split) {
        cleanAttr = split.attrPart.trim();
        trailingClose = [split.closePart];
      }

      if (cleanAttr.length > 0) {
        const rawSourceLines = lines.slice(i, attrEndLine + 1);
        if (split) {
          const lastRawLine = rawSourceLines[rawSourceLines.length - 1];
          // Determine where the close part starts in the original line by matching the rest of the string backward
          // But a simpler approach is to strip the closePart from the end of the last line
          const stripped = lastRawLine.slice(0, lastRawLine.length - split.closePart.length).trimEnd();
          if (stripped.length > 0) {
            rawSourceLines[rawSourceLines.length - 1] = stripped;
          } else {
            rawSourceLines.pop();
          }
        }
        attributes.push({
          text: cleanAttr,
          sortLength: cleanAttr.length,
          originalLines: rawSourceLines,
        });

        // If this attribute spans multiple lines, check for nested tags
        if (rawSourceLines.length > 1) {
          const nestedTags = findMultilineTagOpenings(rawSourceLines);
          for (const nested of nestedTags) {
            nested.startLine += i;
            nested.endLine += i;
            results.push(nested);
          }
        }
      }

      if (trailingClose) {
        tagClose = trailingClose[0];
        endLine = attrEndLine;
        i = attrEndLine + 1;
        break;
      }

      i = attrEndLine + 1;
      endLine = attrEndLine;
    }

    const realAttrCount = attributes.filter((a) => !a.isBlankSeparator).length;
    if (tagClose && realAttrCount > 1) {
      results.push({
        startLine,
        endLine,
        tagOpen,
        tagClose,
        tagIndent,
        attrIndent,
        attributes,
      });
    }
  }

  return results;
}

/**
 * Split the parsed attribute list into contiguous groups divided by blank separators.
 * When `groupByEmptyRows` is false, blanks are discarded and everything sorts as a
 * single group.
 */
function splitAttributesIntoGroups(
  attributes: ParsedAttribute[],
  groupByEmptyRows: boolean
): ParsedAttribute[][] {
  if (!groupByEmptyRows) {
    return [attributes.filter((a) => !a.isBlankSeparator)];
  }

  const groups: ParsedAttribute[][] = [[]];
  for (const a of attributes) {
    if (a.isBlankSeparator) {
      if (groups[groups.length - 1].length > 0) groups.push([]);
    } else {
      groups[groups.length - 1].push(a);
    }
  }
  return groups.filter((g) => g.length > 0);
}

function sortAttributeGroup(
  group: ParsedAttribute[],
  direction: ResolvedDirection
): ParsedAttribute[] {
  return [...group].sort((a, b) => {
    const diff = a.sortLength - b.sortLength;
    return direction === 'ascending' ? diff : -diff;
  });
}

/**
 * Sort all multi-line JSX/HTML tag attributes in the source by length,
 * preserving multi-line attribute values (e.g. arrow-function bodies) as
 * atomic units.
 */
export function sortAllAttributes(source: string, options: AttributeSorterOptions): string {
  let currentSource = source;
  let changed = true;
  let iterations = 0;

  while (changed && iterations < 50) {
    changed = false;
    iterations++;

    const lines = currentSource.split('\n');
    const tags = findMultilineTagOpenings(lines);

    if (tags.length === 0) break;

    // Process from innermost to outermost
    for (let t = 0; t < tags.length; t++) {
      const tag = tags[t];
      const openerLine = `${tag.tagIndent}${tag.tagOpen}`;
      const firstLineTexts = tag.attributes
        .filter((a) => !a.isBlankSeparator)
        .map((a) => a.originalLines[0] ?? a.text);
      const dir = resolveDirection(options.direction, openerLine, firstLineTexts);

      const groups = splitAttributesIntoGroups(tag.attributes, options.groupByEmptyRows);
      const sortedGroups = groups.map((g) => sortAttributeGroup(g, dir));

      const newLines: string[] = [];
      newLines.push(openerLine);
      for (let gi = 0; gi < sortedGroups.length; gi++) {
        if (gi > 0) newLines.push('');
        for (const attr of sortedGroups[gi]) {
          newLines.push(...attr.originalLines);
        }
      }
      newLines.push(`${tag.tagIndent}${tag.tagClose}`);

      const oldLinesText = lines.slice(tag.startLine, tag.endLine + 1).join('\n');
      const newLinesText = newLines.join('\n');

      if (oldLinesText !== newLinesText) {
        lines.splice(tag.startLine, tag.endLine - tag.startLine + 1, ...newLines);
        currentSource = lines.join('\n');
        changed = true;
        break; // break the loop and re-parse the source
      }
    }
  }

  return currentSource;
}

/**
 * Sort attributes within a selected range of text.
 */
export function sortAttributesInRange(
  source: string,
  startLine: number,
  endLine: number,
  options: AttributeSorterOptions
): string {
  const lines = source.split('\n');
  const regionLines = lines.slice(startLine, endLine + 1);
  const regionSource = regionLines.join('\n');
  const sorted = sortAllAttributes(regionSource, options);
  const sortedLines = sorted.split('\n');

  lines.splice(startLine, endLine - startLine + 1, ...sortedLines);
  return lines.join('\n');
}
