import { resolveDirection, sortLinesWithGrouping } from './groupSort';
import { AttributeSorterOptions, ParsedAttribute, TagWithAttributes } from './types';

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
        const state = trackAttributeState(firstAttrText);
        attributes.push({
          text: firstAttrText.trim(),
          sortLength: firstAttrText.trim().length,
        });
      }
    }

    i++;

    while (i < lines.length) {
      const attrLine = lines[i];
      const attrTrimmed = attrLine.trim();

      if (attrTrimmed === '>' || attrTrimmed === '/>') {
        tagClose = attrTrimmed;
        endLine = i;
        i++;
        break;
      }

      if (attrTrimmed.endsWith('>') || attrTrimmed.endsWith('/>')) {
        const closeMatch = attrTrimmed.match(/(\/?>)\s*$/);
        if (closeMatch) {
          const attrPart = attrTrimmed.slice(0, attrTrimmed.length - closeMatch[1].length).trim();
          if (attrPart.length > 0) {
            if (!attrIndent) attrIndent = attrLine.match(/^(\s*)/)?.[1] || '';
            attributes.push({
              text: attrPart,
              sortLength: attrPart.length,
            });
          }
          tagClose = closeMatch[1];
          endLine = i;
          i++;
          break;
        }
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

      const cleanAttr = fullAttr.replace(/(\/?>)\s*$/, '').trim();
      const trailingClose = fullAttr.match(/(\/?>)\s*$/);
      
      if (cleanAttr.length > 0) {
        attributes.push({
          text: cleanAttr,
          sortLength: cleanAttr.length,
        });
      }

      if (trailingClose && (trailingClose[1] === '>' || trailingClose[1] === '/>')) {
        tagClose = trailingClose[1];
        endLine = attrEndLine;
        i = attrEndLine + 1;
        break;
      }

      i = attrEndLine + 1;
      endLine = attrEndLine;
    }

    if (tagClose && attributes.length > 1) {
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

function trackAttributeState(text: string): BracketState {
  let state = createBracketState();
  for (let i = 0; i < text.length; i++) {
    state = advanceChar(state, text[i], i > 0 ? text[i - 1] : '');
  }
  return state;
}

/**
 * Collect all attribute lines from a tag, normalizing inline attributes onto
 * their own lines. This prevents data loss when attributes share a line with
 * the opening tag name or closing bracket.
 */
function collectAttributeLines(
  lines: string[],
  tag: TagWithAttributes
): string[] {
  const tagOpenRe = /^(\s*)<[A-Za-z_][A-Za-z0-9_.]*\s+(.+)$/;
  const result: string[] = [];

  const firstLine = lines[tag.startLine];
  const inlineMatch = firstLine.match(tagOpenRe);
  if (inlineMatch) {
    const inlineAttr = inlineMatch[2].trim();
    if (inlineAttr !== '>' && inlineAttr !== '/>') {
      result.push(tag.attrIndent + inlineAttr);
    }
  }

  for (let li = tag.startLine + 1; li < tag.endLine; li++) {
    result.push(lines[li]);
  }

  if (tag.endLine > tag.startLine) {
    const lastTrimmed = lines[tag.endLine].trim();
    if (lastTrimmed !== '>' && lastTrimmed !== '/>') {
      const attrPart = lastTrimmed.replace(/(\/?>)\s*$/, '').trim();
      if (attrPart.length > 0) {
        result.push(tag.attrIndent + attrPart);
      }
    }
  }

  return result;
}

/**
 * Sort all multi-line JSX/HTML tag attributes in the source by length.
 */
export function sortAllAttributes(source: string, options: AttributeSorterOptions): string {
  const lines = source.split('\n');
  const tags = findMultilineTagOpenings(lines);

  if (tags.length === 0) return source;

  for (let t = tags.length - 1; t >= 0; t--) {
    const tag = tags[t];
    const mid = collectAttributeLines(lines, tag);
    const openerLine = `${tag.tagIndent}${tag.tagOpen}`;
    const dir = resolveDirection(options.direction, openerLine, mid);
    const sortedMid = sortLinesWithGrouping(
      mid,
      dir,
      options.groupByEmptyRows
    );

    const newLines: string[] = [];
    newLines.push(`${tag.tagIndent}${tag.tagOpen}`);
    newLines.push(...sortedMid);
    newLines.push(`${tag.tagIndent}${tag.tagClose}`);

    lines.splice(tag.startLine, tag.endLine - tag.startLine + 1, ...newLines);
  }

  return lines.join('\n');
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
